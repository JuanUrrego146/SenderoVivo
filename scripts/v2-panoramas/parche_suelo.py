# -*- coding: utf-8 -*-
"""
Paso 2 del cosido: tapa a quien lleva la camara con un disco de papel en el suelo y deja los
panoramas listos para la web.

El disco es el medallon del estilo D (v2/parche/parche.png) puesto sobre la esfera como un casquete:
en el visor se ve como un circulo de papel en el piso. No va centrado en el nadir: la persona va
siempre detras y abajo de la camara, asi que se busca, foto por foto, el casquete MAS PEQUENO que
cubra su silueta (E:/SenderoV2/silueta, de silueta.py, engrosada 3 grados) y todo lo que este a menos
de 28 grados del nadir (el palo y las manos). Se prueba el centro del casquete en una rejilla de
elevaciones (de -90 a -50 cada 2,5 grados) y rumbos (cada 7,5), y se queda el de menor radio, mas 2
grados de margen. Asi, hacia adelante el disco llega poco mas alla del palo y no tapa el camino.
Si al revisar un panorama queda algo de la persona, de su sombra o del palo, se agrega un margen en
v2/inventario/ajustes_parche.csv (orden, grados) y se vuelve a correr solo esa foto.

Antes del disco, cada panorama pasa por color.py (balance de blancos, velo, contraste local, luces
y enfoque). El dibujo se pone con su parte de arriba hacia adelante en el camino (rumbo 0).

Salidas: v2/panoramas/escritorio/pNNN.webp (6144, calidad 70), v2/panoramas/celular/pNNN.webp
(3072, calidad 70), E:/SenderoV2/revisar/pNNN.jpg (2048) y v2/inventario/parche.csv con el casquete
de cada foto.

uso: python parche_suelo.py <repo> [pNNN ...]   (sin lista: todas; con lista: solo esas, rehaciendo)
"""
import csv
import math
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

import color

BASE = "E:/SenderoV2/base"
SILUETA = "E:/SenderoV2/silueta"
REVISAR = "E:/SenderoV2/revisar"
K_DISCO = 0.92          # radio del disco de papel dentro del dibujo (fraccion de media imagen)
NADIR = 28.0            # grados alrededor del nadir que siempre se tapan (palo y manos)
ENGROSE = 3.0           # grados de engrose de la silueta
MARGEN = 2.0


def vec(lon, lat):
    cl = np.cos(lat)
    return np.stack([cl * np.sin(lon), -np.sin(lat), cl * np.cos(lon)], -1)


def casquete(sil, extra):
    H, W = sil.shape
    k = int(round(ENGROSE / 360 * W)) * 2 + 1
    m = cv2.dilate((sil > 0).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    lat = np.radians(90 - (np.arange(H) + 0.5) / H * 180)
    lon = np.radians((np.arange(W) + 0.5) / W * 360 - 180)
    LON, LAT = np.meshgrid(lon, lat)
    req = (m > 0) | (LAT < np.radians(-90 + NADIR))
    pts = vec(LON[req], LAT[req])
    if len(pts) > 30000:
        pts = pts[np.random.default_rng(0).choice(len(pts), 30000, replace=False)]
    mejor = None
    for el in np.arange(-90, -49.9, 2.5):
        for az in (np.arange(0, 360, 7.5) if el > -90 else [0.0]):
            c = vec(np.radians(az), np.radians(el))
            rho = math.degrees(math.acos(max(-1.0, min(1.0, float((pts @ c).min())))))
            if mejor is None or rho < mejor[0]:
                mejor = (rho, el, az)
    rho, el, az = mejor
    return rho + MARGEN + extra, el, az


def pintar(im, parche, rho, el, az):
    H, W = im.shape[:2]
    c = vec(math.radians(az), math.radians(el))
    tope = el + rho / K_DISCO + 1                     # lo mas alto que alcanza el dibujo (con su sombra)
    fila0 = max(0, int((90 - min(tope, 89)) / 180 * H))
    lat = np.radians(90 - (np.arange(fila0, H, dtype=np.float32) + 0.5) / H * 180)
    lon = np.radians((np.arange(W, dtype=np.float32) + 0.5) / W * 360 - 180)
    LON, LAT = np.meshgrid(lon, lat)
    d = vec(LON, LAT).astype(np.float32)
    f = np.array([0, 0, 1.0])
    e1 = f - (f @ c) * c
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(c, e1)
    dc = d @ c.astype(np.float32)
    phi = np.degrees(np.arccos(np.clip(dc, -1, 1)))
    v = d - dc[..., None] * c.astype(np.float32)
    nv = np.linalg.norm(v, axis=-1) + 1e-9
    rr = phi / rho * K_DISCO
    P = parche.shape[0]
    x = ((0.5 + 0.5 * rr * (v @ e2.astype(np.float32)) / nv) * P).astype(np.float32)
    y = ((0.5 - 0.5 * rr * (v @ e1.astype(np.float32)) / nv) * P).astype(np.float32)
    rgba = cv2.remap(parche, x, y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a = rgba[..., 3:4].astype(np.float32) / 255
    zona = im[fila0:].astype(np.float32)
    im[fila0:] = (zona * (1 - a) + rgba[..., :3].astype(np.float32) * a).astype(np.uint8)
    # borde hacia adelante: elevacion del casquete en el rumbo 0
    dl = vec(np.zeros(1800), np.radians(np.linspace(-90, 0, 1800)))
    dentro = np.degrees(np.arccos(np.clip(dl @ c, -1, 1))) <= rho
    adelante = float(np.linspace(-90, 0, 1800)[dentro].max())
    dl = vec(np.full(1800, math.pi), np.radians(np.linspace(-90, 0, 1800)))
    dentro = np.degrees(np.arccos(np.clip(dl @ c, -1, 1))) <= rho
    atras = float(np.linspace(-90, 0, 1800)[dentro].max())
    return im, adelante, atras


def trabajo(t):
    repo, n, extra = t
    sil = cv2.imread(os.path.join(SILUETA, n + ".png"), cv2.IMREAD_GRAYSCALE)
    rho, el, az = casquete(sil, extra)
    parche = cv2.imread(os.path.join(repo, "v2/parche/parche.png"), cv2.IMREAD_UNCHANGED)
    im = color.corregir(cv2.imread(os.path.join(BASE, n + ".jpg")))
    im, adelante, atras = pintar(im, parche, rho, el, az)
    cv2.imwrite(os.path.join(repo, "v2/panoramas/escritorio", n + ".webp"), im, [cv2.IMWRITE_WEBP_QUALITY, 70])
    cv2.imwrite(os.path.join(repo, "v2/panoramas/celular", n + ".webp"),
                cv2.resize(im, (3072, 1536), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 70])
    cv2.imwrite(os.path.join(REVISAR, n + ".jpg"), cv2.resize(im, (2048, 1024), interpolation=cv2.INTER_AREA),
                [cv2.IMWRITE_JPEG_QUALITY, 85])
    return dict(orden=int(n[1:]), radio=round(rho, 1), centro_elev=el, centro_rumbo=az, extra=extra,
                borde_adelante=round(adelante, 1), borde_atras=round(atras, 1))


def main():
    repo = sys.argv[1]
    solo = set(sys.argv[2:])
    for d in ("v2/panoramas/escritorio", "v2/panoramas/celular"):
        os.makedirs(os.path.join(repo, d), exist_ok=True)
    os.makedirs(REVISAR, exist_ok=True)
    filas = [f for f in csv.DictReader(open(os.path.join(repo, "v2/inventario/eleccion.csv"), encoding="utf-8"))
             if f["estado"] == "elegida"]
    extra = {}
    ra = os.path.join(repo, "v2/inventario/ajustes_parche.csv")
    if os.path.exists(ra):
        extra = {int(r["orden"]): float(r["grados"]) for r in csv.DictReader(open(ra, encoding="utf-8"))}
    nombres = ["p%03d" % int(f["orden"]) for f in filas]
    if solo:
        nombres = [n for n in nombres if n in solo]
    rp = os.path.join(repo, "v2/inventario/parche.csv")
    previo = {}
    if os.path.exists(rp):
        previo = {int(r["orden"]): r for r in csv.DictReader(open(rp, encoding="utf-8"))}
    tareas = [(repo, n, extra.get(int(n[1:]), 0.0)) for n in nombres]
    with ProcessPoolExecutor(3) as ex:
        for i, r in enumerate(ex.map(trabajo, tareas)):
            previo[r["orden"]] = r
            print(i + 1, len(tareas), "p%03d" % r["orden"], r, flush=True)
    campos = ["orden", "radio", "centro_elev", "centro_rumbo", "extra", "borde_adelante", "borde_atras"]
    with open(rp, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, campos)
        w.writeheader()
        for k in sorted(previo):
            w.writerow({c: previo[k][c] for c in campos})
    print("PARCHE_LISTO", flush=True)


if __name__ == "__main__":
    main()
