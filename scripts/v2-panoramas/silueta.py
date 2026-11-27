# -*- coding: utf-8 -*-
"""
Silueta de quien lleva la camara, en el panorama ya nivelado, para ajustar el parche del suelo.

YOLO11x-seg (clase persona) sobre cada ojo de pez a 1/4. La mascara de cada lente se lleva al
equirectangular de 1024 x 512 con los mismos mapas que usa el cosido (coser.mapas: nivelacion,
centros y giro de la costura), tomando en cada pixel la lente que pesa mas en la mezcla. Se guarda
solo lo que toca el borde de abajo de su circulo (va pegado a la camara); otras personas no cuentan.

Salida: E:/SenderoV2/silueta/pNNN.png (blanco = operador). Reanudable.
uso: <venv con ultralytics>/python silueta.py <repo> <modelo.pt>
"""
import csv
import os
import sys

import cv2
import numpy as np

import coser

ORIGEN = "E:/Escaneo con Insta360"
SAL = "E:/SenderoV2/silueta"
ANCHO = 1024
RED = 4


def main():
    from ultralytics import YOLO
    repo, modelo = sys.argv[1], sys.argv[2]
    os.makedirs(SAL, exist_ok=True)
    yolo = YOLO(modelo)
    costura = coser.cargar_costura()
    filas = [f for f in csv.DictReader(open(os.path.join(repo, "v2/inventario/eleccion.csv"), encoding="utf-8"))
             if f["estado"] == "elegida"]
    for k, f in enumerate(filas):
        n = "p%03d" % int(f["orden"])
        dst = os.path.join(SAL, n + ".png")
        if os.path.exists(dst):
            continue
        ruta = os.path.join(ORIGEN, f["archivo"])
        im = cv2.imread(ruta, cv2.IMREAD_REDUCED_COLOR_4)
        L = im.shape[0]
        R = coser.RADIO_UTIL / RED
        masc = []
        for j in range(2):
            ojo = np.ascontiguousarray(im[:, j * L:(j + 1) * L])
            m = np.zeros((L, L), np.uint8)
            r = yolo.predict(ojo, imgsz=1280, conf=0.20, classes=[0], device=0, verbose=False)[0]
            if r.masks is not None:
                for mm in r.masks.data.cpu().numpy():
                    mm = cv2.resize(mm, (L, L), interpolation=cv2.INTER_LINEAR) > 0.5
                    ys = np.nonzero(mm)[0]
                    if len(ys) and ys.max() > L / 2 + 0.85 * R:
                        m[mm] = 255
            masc.append(m)
        g = coser.gravedad(ruta)
        (ax, ay, at, ad), (bx, by, bt, bd) = coser.mapas(ANCHO, g, costura, L / coser.LADO)
        wa, wb = coser.pesos(at, ad), coser.pesos(bt, bd)
        ea = cv2.remap(masc[0], ax, ay, cv2.INTER_NEAREST)
        eb = cv2.remap(masc[1], bx, by, cv2.INTER_NEAREST)
        eq = np.where(wa >= wb, ea, eb)
        cv2.imwrite(dst, eq)
        print(k + 1, len(filas), n, int((eq > 0).sum()), flush=True)
    print("SILUETA_LISTA", flush=True)


if __name__ == "__main__":
    main()
