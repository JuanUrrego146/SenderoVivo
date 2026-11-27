# -*- coding: utf-8 -*-
"""
Cose una foto .insp de la Insta360 X3 (dos ojos de pez lado a lado) a equirectangular 2:1, nivelada.

- Proyeccion: el modelo OPENCV_FISHEYE que COLMAP refino sobre esta misma tanda
  (scripts/captura360/vistas.py, CALIBRACION). Se calcula a mano porque la lente ve mas alla de
  90 grados del eje y cv2.fisheye confunde esos rayos.
- La lente b mira hacia atras: giro de 180 grados sobre el eje vertical de la a, mas una pequena
  correccion (guinada, cabeceo, alabeo) que se ajusta midiendo la costura (ver calibrar_costura.py)
  y se guarda en costura.json.
- Nivelacion: el EXIF trae en MakerNote la lectura del acelerometro. Se gira cada foto para que esa
  vertical quede vertical, asi el horizonte sale recto y las flechas del visor van sobre el piso.
- Mezcla: en la franja donde las dos lentes ven (de 84 a 96 grados de su eje), peso lineal. Antes se
  igualan las ganancias por canal de las dos lentes con la mediana de la franja.
- Rumbo: la longitud 0 del panorama es el eje de la lente b (la que mira hacia adelante, la a ve al
  operador), proyectado al plano horizontal.

uso como modulo: coser(ruta_insp, ancho, costura) -> imagen BGR uint8 (ancho x ancho/2)
"""
import json
import math
import os
import re

import cv2
import numpy as np
from PIL import Image

CALIBRACION = {
    "a": (1577.3, 1571.0, 2992.0, 2992.0, 0.0923, -0.0518, 0.0237, -0.0050),
    "b": (1570.4, 1563.2, 2992.0, 2992.0, 0.0750, -0.0278, 0.0123, -0.0032),
}
LADO = 5984
RADIO_UTIL = 2820
TH_MEZCLA = (84.0, 96.0)

# Del acelerometro (marco del IMU) al marco de la lente a (x derecha, y abajo, z al frente).
# Se fijo probando las combinaciones sobre fotos inclinadas (ver calibrar_costura.py --imu).
IMU_A_LENTE = np.array([[0, 0, -1], [1, 0, 0], [0, -1, 0]], np.float64)


def rot(yaw, pitch, roll):
    """Rotacion en grados: guinada sobre y, cabeceo sobre x, alabeo sobre z (marco de camara)."""
    a, b, c = map(math.radians, (yaw, pitch, roll))
    ry = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
    rx = np.array([[1, 0, 0], [0, math.cos(b), -math.sin(b)], [0, math.sin(b), math.cos(b)]])
    rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    return ry @ rx @ rz


def cargar_costura(ruta=None):
    ruta = ruta or os.path.join(os.path.dirname(__file__), "costura.json")
    if os.path.exists(ruta):
        return json.load(open(ruta, encoding="utf-8"))
    return {"b": [0.0, 0.0, 0.0], "imu": IMU_A_LENTE.tolist()}


def gravedad(ruta):
    """Lectura media del acelerometro (marco del sensor) desde el registro 0x300 del bloque final
    del .insp. El EXIF solo trae la gravedad en 3 de las 1.055 fotos; esta serie da lo mismo."""
    from operador import imu
    return imu(ruta)


def nivelar(g_imu, imu):
    """Matriz mundo->lente a. Mundo: x derecha, y abajo (gravedad), z al frente = eje de la lente b
    proyectado al horizontal."""
    abajo = np.asarray(imu) @ g_imu
    # el acelerometro marca +1 g hacia ARRIBA en reposo; abajo es el opuesto
    abajo = -abajo / np.linalg.norm(abajo)
    frente_b = np.array([0.0, 0.0, -1.0])            # eje de la lente b en el marco de la a
    z = frente_b - abajo * float(frente_b @ abajo)
    z /= np.linalg.norm(z)
    x = np.cross(abajo, z)
    # columnas: ejes del mundo expresados en el marco de la lente a
    return np.stack([x, abajo, z], axis=1)


def rayos_equirect(ancho):
    alto = ancho // 2
    lon = (np.arange(ancho, dtype=np.float32) + 0.5) / ancho * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(alto, dtype=np.float32) + 0.5) / alto * np.pi
    lon, lat = np.meshgrid(lon, lat)
    cl = np.cos(lat)
    return np.stack([cl * np.sin(lon), -np.sin(lat), cl * np.cos(lon)], axis=-1)


def proyectar(rayos, lente, escala=1.0):
    """Rayos en el marco de la lente -> (mx, my, theta en grados)."""
    fx, fy, cx, cy, k1, k2, k3, k4 = CALIBRACION[lente]
    x, y, z = rayos[..., 0], rayos[..., 1], rayos[..., 2]
    rho = np.hypot(x, y)
    theta = np.arctan2(rho, z)
    t2 = theta * theta
    td = theta * (1 + t2 * (k1 + t2 * (k2 + t2 * (k3 + t2 * k4))))
    s = np.divide(td, rho, out=np.zeros_like(rho), where=rho > 1e-9)
    mx = ((fx * s * x + cx) * escala).astype(np.float32)
    my = ((fy * s * y + cy) * escala).astype(np.float32)
    dentro = np.hypot(mx - cx * escala, my - cy * escala) < RADIO_UTIL * escala
    return mx, my, np.degrees(theta), dentro


def mapas(ancho, g_imu, costura, escala=1.0):
    R_wa = nivelar(g_imu, costura["imu"])            # mundo -> lente a
    rayos = rayos_equirect(ancho) @ R_wa.T            # en el marco de la a
    R_ab = np.diag([-1.0, 1.0, -1.0]) @ rot(*costura["b"])
    rb = rayos @ R_ab.T                               # en el marco de la b (R_ab: a -> b)
    a = proyectar(rayos, "a", escala)
    b = proyectar(rb, "b", escala)
    return a, b


def pesos(theta, dentro):
    t0, t1 = TH_MEZCLA
    w = np.clip((t1 - theta) / (t1 - t0), 0, 1).astype(np.float32)
    return w * dentro


def coser(ruta, ancho, costura=None, reduccion=1, devolver_lentes=False):
    costura = costura or cargar_costura()
    flag = {1: cv2.IMREAD_COLOR, 2: cv2.IMREAD_REDUCED_COLOR_2, 4: cv2.IMREAD_REDUCED_COLOR_4,
            8: cv2.IMREAD_REDUCED_COLOR_8}[reduccion]
    im = cv2.imread(ruta, flag)
    lado = im.shape[0]
    escala = lado / LADO
    ojos = {"a": im[:, :lado], "b": im[:, lado:2 * lado]}
    g = gravedad(ruta)
    (ax, ay, at, ad), (bx, by, bt, bd) = mapas(ancho, g, costura, escala)
    A = cv2.remap(ojos["a"], ax, ay, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    B = cv2.remap(ojos["b"], bx, by, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    wa, wb = pesos(at, ad), pesos(bt, bd)
    franja = (wa > 0.05) & (wb > 0.05)
    if franja.sum() > 1000:
        ga = np.median(A[franja], axis=0) + 1
        gb = np.median(B[franja], axis=0) + 1
        medio = np.sqrt(ga * gb)
        A *= medio / ga
        B *= medio / gb
    if devolver_lentes:
        return A, B, wa, wb
    w = wa + wb
    w[w < 1e-6] = 1
    out = (A * wa[..., None] + B * wb[..., None]) / w[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)
