# -*- coding: utf-8 -*-
"""
Donde aparece el operador (quien lleva la camara) en cada foto 360, y la gravedad para nivelar.

- Gravedad: el EXIF solo la trae en 3 de las 1.055 fotos. Cada .insp lleva al final un bloque de
  Insta360 con registros; el 0x300 es la serie del acelerometro y el giroscopio (unas 2.000 muestras
  de 20 bytes: tiempo uint64 y seis uint16 con cero en 32768, acelerometro primero, 1 g ~ 1.024).
  La media de la serie (unos 2 s alrededor de la toma) da la vertical; el balanceo al caminar se
  promedia. Se guarda en el marco del sensor (ax, ay, az) y la inclinacion respecto a la vertical.
- Personas: YOLO11 con segmentacion (clase persona) sobre cada ojo de pez a 1/4. Cada pixel de cada
  silueta se lleva a un rayo con la calibracion de la lente (scripts/captura360/vistas.py), se gira
  a la lente a, se nivela con la gravedad y se convierte a elevacion (grados sobre el horizonte) y
  rumbo (0 = hacia adelante, el eje de la lente b; 180 = atras, donde va el operador).
  El operador es la silueta mas grande que llega al borde de abajo del circulo de la lente a (va
  pegado a la camara). Las demas son otras personas.
- Por foto: elevacion maxima del operador (lo mas alto de su cabeza), rumbo minimo y maximo,
  porcentaje de la esfera que tapa, y cuantas otras personas hay y su elevacion maxima.

uso: <venv con ultralytics>/python operador.py "E:/Escaneo con Insta360" E:/SenderoV2/inv <modelo.pt>
"""
import csv
import math
import os
import struct
import sys

import cv2
import numpy as np

CAL = {
    "a": (1577.3, 1571.0, 2992.0, 2992.0, 0.0923, -0.0518, 0.0237, -0.0050),
    "b": (1570.4, 1563.2, 2992.0, 2992.0, 0.0750, -0.0278, 0.0123, -0.0032),
}
RED = 4
L = 5984 // RED
R_UTIL = 2820 / RED
# Del sensor al marco de la lente a (x derecha, y abajo, z al frente de la lente a). El eje x del
# sensor apunta hacia abajo con la camara derecha (lee -1 g); los otros dos se fijan comparando con
# las 3 fotos que traen gravedad en el EXIF y se comprueban al coser.
IMU_A_LENTE = np.array([[0, 0, -1], [1, 0, 0], [0, -1, 0]], np.float64)


def imu(ruta):
    with open(ruta, "rb") as fh:
        fh.seek(-40, 2)
        tlen, _ = struct.unpack("<II", fh.read(8))
        fh.seek(-tlen, 2)
        b = fh.read(tlen)
    e, recs = len(b) - 72, {}
    while e > 6:
        rid, ln = struct.unpack("<HI", b[e - 6:e])
        if ln > e - 6:
            break
        recs[rid] = b[e - 6 - ln:e - 6]
        e -= 6 + ln
    d = recs.get(0x300)
    if not d:
        return None
    n = len(d) // 20
    a = np.frombuffer(d[:n * 20], dtype=np.dtype([("t", "<u8"), ("v", "<u2", 6)]))
    v = a["v"].astype(np.float64) - 32768
    return v[:, :3].mean(0)


def rayos_lente(lente):
    """Rayo (marco de la lente) de cada pixel del ojo de pez a 1/RED."""
    fx, fy, cx, cy, k1, k2, k3, k4 = CAL[lente]
    th = np.linspace(0, math.radians(110), 4000)
    t2 = th * th
    td = th * (1 + t2 * (k1 + t2 * (k2 + t2 * (k3 + t2 * k4))))
    yy, xx = np.mgrid[0:L, 0:L].astype(np.float64)
    u = (xx + 0.5) * RED
    v = (yy + 0.5) * RED
    mx, my = (u - cx) / fx, (v - cy) / fy
    r = np.hypot(mx, my)
    theta = np.interp(r, td, th)
    s = np.divide(np.sin(theta), r, out=np.zeros_like(r), where=r > 1e-9)
    ray = np.stack([mx * s, my * s, np.cos(theta)], -1)
    if lente == "b":
        ray = ray * np.array([-1.0, 1.0, -1.0])     # al marco de la lente a
    dentro = np.hypot(xx - L / 2, yy - L / 2) < R_UTIL
    return ray, dentro


def angulos(ray, g_imu):
    abajo = IMU_A_LENTE @ g_imu
    abajo = -abajo / np.linalg.norm(abajo)
    elev = -np.degrees(np.arcsin(np.clip(ray @ abajo, -1, 1)))
    frente = np.array([0.0, 0.0, -1.0])
    z = frente - abajo * (frente @ abajo)
    z /= np.linalg.norm(z)
    x = np.cross(abajo, z)
    rumbo = np.degrees(np.arctan2(ray @ x, ray @ z))
    return elev, rumbo


def main():
    from ultralytics import YOLO
    origen, inv, modelo = sys.argv[1], sys.argv[2], sys.argv[3]
    filas = list(csv.DictReader(open(os.path.join(inv, "inventario.csv"), encoding="utf-8")))
    yolo = YOLO(modelo)
    RAY = {k: rayos_lente(k) for k in "ab"}
    sal = os.path.join(inv, "operador.csv")
    hechos = set()
    if os.path.exists(sal):
        hechos = {r["archivo"] for r in csv.DictReader(open(sal, encoding="utf-8"))}
    campos = ["archivo", "ax", "ay", "az", "inclinacion", "op_elev_max", "op_rumbo_min", "op_rumbo_max",
              "op_esfera_pct", "otras_personas", "otras_elev_max"]
    nuevo = not os.path.exists(sal)
    fh = open(sal, "a", newline="", encoding="utf-8")
    w = csv.DictWriter(fh, campos)
    if nuevo:
        w.writeheader()
    os.makedirs(os.path.join(inv, "mapas_operador"), exist_ok=True)
    for i, f in enumerate(filas):
        if f["archivo"] in hechos:
            continue
        ruta = os.path.join(origen, f["archivo"])
        g = imu(ruta)
        if g is None:
            g = np.array([-1024.0, 0, 0])
        abajo = -(IMU_A_LENTE @ g)
        incl = math.degrees(math.acos(abajo[1] / np.linalg.norm(abajo)))
        im = cv2.imread(ruta, cv2.IMREAD_REDUCED_COLOR_4)
        siluetas = []                      # (lente, mascara, toca_borde_abajo)
        for k, lente in enumerate("ab"):
            ojo = np.ascontiguousarray(im[:, k * L:(k + 1) * L])
            r = yolo.predict(ojo, imgsz=1280, conf=0.25, classes=[0], device=0, verbose=False)[0]
            if r.masks is None:
                continue
            for m in r.masks.data.cpu().numpy():
                m = cv2.resize(m, (L, L), interpolation=cv2.INTER_LINEAR) > 0.5
                m &= RAY[lente][1]
                if m.sum() < 50:
                    continue
                ys = np.nonzero(m)[0]
                siluetas.append((lente, m, ys.max() > L / 2 + 0.85 * R_UTIL))
        op = [s for s in siluetas if s[2]]
        otras = [s for s in siluetas if not s[2]]
        fila = dict(archivo=f["archivo"], ax=round(g[0], 1), ay=round(g[1], 1), az=round(g[2], 1),
                    inclinacion=round(incl, 2), op_elev_max="", op_rumbo_min="", op_rumbo_max="",
                    op_esfera_pct=0, otras_personas=len(otras), otras_elev_max="")
        if op:
            el, ru, area = [], [], 0.0
            for lente, m, _ in op:
                e, rr = angulos(RAY[lente][0][m], g)
                el.append(e)
                ru.append(rr)
                area += m.sum()
            el, ru = np.concatenate(el), np.concatenate(ru)
            # rumbo sin cortar en +-180: se mide alrededor de 180 (atras)
            ru180 = np.mod(ru, 360)
            fila.update(op_elev_max=round(float(np.percentile(el, 99.5)), 1),
                        op_rumbo_min=round(float(np.percentile(ru180, 0.5)), 1),
                        op_rumbo_max=round(float(np.percentile(ru180, 99.5)), 1),
                        op_esfera_pct=round(100.0 * area / (2 * math.pi * R_UTIL ** 2 * 1.13), 2))
        if otras:
            fila["otras_elev_max"] = round(max(float(angulos(RAY[l][0][m], g)[0].max()) for l, m, _ in otras), 1)
        w.writerow(fila)
        fh.flush()
        if i % 25 == 0:
            vis = cv2.resize(im, (1496, 748))
            for lente, m, es_op in siluetas:
                k = "ab".index(lente)
                mm = cv2.resize(m.astype(np.uint8), (748, 748)) > 0
                sub = vis[:, k * 748:(k + 1) * 748]
                sub[mm] = (0, 0, 255) if es_op else (255, 0, 0)
            cv2.imwrite(os.path.join(inv, "mapas_operador", "%s_%03d.jpg" % (f["sesion"], int(f["orden"]))), vis)
            print(i, f["archivo"], fila["op_elev_max"], flush=True)
    fh.close()
    print("listo")


if __name__ == "__main__":
    main()
