# -*- coding: utf-8 -*-
"""
Ajusta la costura entre las dos lentes midiendo, no a ojo.

En la franja donde las dos lentes ven lo mismo (de 84 a 96 grados de su eje, alrededor del costado
de la camara) se proyecta cada lente por separado y se compara el gradiente de las dos imagenes. Se
buscan los centros de las dos lentes (cx, cy) y un giro pequeno de la lente b (guinada, cabeceo,
alabeo) que hacen minima esa diferencia en varias fotos a la vez, con Nelder-Mead. Se arranca en
los centros que la propia camara guarda en el .insp (registro 0x101, escalados de 11904 a 11968 px)
y sin giro. Solo se usa la franja entre -30 y +60 grados de elevacion: abajo pueden entrar los
brazos del operador, que estan a centimetros y nunca coinciden entre lentes.

La paralaje entre lentes (unos 3 cm) hace que lo muy cercano nunca case; por eso se mide en varias
fotos y la diferencia que queda no llega a cero.

uso: python calibrar_costura.py <foto.insp> [<foto.insp> ...]  -> escribe costura.json junto al script
"""
import json
import os
import sys

import cv2
import numpy as np
from scipy.optimize import minimize

import coser

RED = 2
ESC = 1.0 / RED
PASO = 0.08                      # grados por pixel de la franja
lon = np.radians(np.concatenate([np.arange(80, 100, PASO), np.arange(-100, -80, PASO)]))
lat = np.radians(np.arange(60, -30, -PASO))
LON, LAT = np.meshgrid(lon, lat)
RAYOS = np.stack([np.cos(LAT) * np.sin(LON), -np.sin(LAT), np.cos(LAT) * np.cos(LON)], -1).astype(np.float64)

# Centros que trae la camara (lente a, lente b) en px de 11904 de ancho, llevados a 11968.
K = 11968 / 11904
CENTRO_CAMARA = {"a": [2976.62 * K, 2989.01 * K], "b": [8937.93 * K - 5984, 3002.70 * K]}


def cargar(ruta):
    im = cv2.imread(ruta, cv2.IMREAD_REDUCED_GRAYSCALE_2).astype(np.float32)
    lado = im.shape[0]
    return im[:, :lado], im[:, lado:2 * lado]


def grad(x):
    gx = cv2.Sobel(x, cv2.CV_32F, 1, 0)
    gy = cv2.Sobel(x, cv2.CV_32F, 0, 1)
    return np.hypot(gx, gy)


def parametros(v):
    return {"centros": {"a": [CENTRO_CAMARA["a"][0] + v[0], CENTRO_CAMARA["a"][1] + v[1]],
                        "b": [CENTRO_CAMARA["b"][0] + v[2], CENTRO_CAMARA["b"][1] + v[3]]},
            "b": [float(v[4]), float(v[5]), float(v[6])]}


def costo(v, fotos):
    p = parametros(v)
    R_ab = np.diag([-1.0, 1.0, -1.0]) @ coser.rot(*p["b"])
    ma = coser.proyectar(RAYOS, "a", ESC, p["centros"]["a"])
    mb = coser.proyectar(RAYOS @ R_ab.T, "b", ESC, p["centros"]["b"])
    total = 0.0
    for A, B in fotos:
        a = cv2.remap(A, ma[0], ma[1], cv2.INTER_LINEAR)
        b = cv2.remap(B, mb[0], mb[1], cv2.INTER_LINEAR)
        ok = ma[3] & mb[3]
        b = b * (np.median(a[ok]) + 1) / (np.median(b[ok]) + 1)
        total += float(np.mean(np.abs(grad(a) - grad(b))[ok]))
    return total / len(fotos)


def main():
    fotos = [cargar(r) for r in sys.argv[1:]]
    v0 = np.zeros(7)
    c_ini = costo(v0, fotos)
    c_colmap = costo(np.array([2992 - CENTRO_CAMARA["a"][0], 2992 - CENTRO_CAMARA["a"][1],
                               2992 - CENTRO_CAMARA["b"][0], 2992 - CENTRO_CAMARA["b"][1], 0, 0, 0]), fotos)
    paso = np.array([8, 8, 8, 8, 0.4, 0.4, 0.4])
    simplex = np.vstack([v0] + [v0 + np.eye(7)[i] * paso[i] for i in range(7)])
    r = minimize(costo, v0, args=(fotos,), method="Nelder-Mead",
                 options={"initial_simplex": simplex, "maxfev": 900, "xatol": 0.2, "fatol": 0.01})
    p = parametros(r.x)
    p["imu"] = coser.IMU_A_LENTE.tolist()
    p["medida"] = {"centros_colmap": round(c_colmap, 3), "centros_camara": round(c_ini, 3),
                   "ajustada": round(float(r.fun), 3), "fotos": [os.path.basename(x) for x in sys.argv[1:]]}
    json.dump(p, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "costura.json"), "w"), indent=1)
    print(json.dumps(p, indent=1))


if __name__ == "__main__":
    main()
