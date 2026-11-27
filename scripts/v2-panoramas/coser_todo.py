# -*- coding: utf-8 -*-
"""
Paso 1 del cosido: las fotos elegidas (v2/inventario/eleccion.csv) a equirectangular 6144 x 3072
nivelada (coser.py, con costura.json), SIN parche. Salidas fuera del repositorio:
E:/SenderoV2/base/pNNN.jpg (calidad 93; el parche del suelo y los formatos web salen de aqui con
parche_suelo.py) y E:/SenderoV2/gris/pNNN.jpg (2048 en gris). NNN es el orden de la foto en la sesion.

Reanudable: salta las fotos que ya tienen sus salidas.
uso: python coser_todo.py <repo> [procesos=3]
"""
import csv
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2

import coser

ORIGEN = "E:/Escaneo con Insta360"
BASE = "E:/SenderoV2/base"
GRIS = "E:/SenderoV2/gris"
ANCHO = 6144


def trabajo(t):
    repo, orden, archivo = t
    n = "p%03d" % orden
    sal = [os.path.join(BASE, n + ".jpg"), os.path.join(GRIS, n + ".jpg")]
    if all(os.path.exists(s) for s in sal):
        return n, "ya"
    im = coser.coser(os.path.join(ORIGEN, archivo), ANCHO)
    cv2.imwrite(sal[1], cv2.cvtColor(cv2.resize(im, (2048, 1024), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY),
                [cv2.IMWRITE_JPEG_QUALITY, 92])
    cv2.imwrite(sal[0] + ".tmp.jpg", im, [cv2.IMWRITE_JPEG_QUALITY, 93])
    os.replace(sal[0] + ".tmp.jpg", sal[0])
    return n, "ok"


def main():
    repo = sys.argv[1]
    procesos = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    os.makedirs(BASE, exist_ok=True)
    os.makedirs(GRIS, exist_ok=True)
    filas = [f for f in csv.DictReader(open(os.path.join(repo, "v2/inventario/eleccion.csv"), encoding="utf-8"))
             if f["estado"] == "elegida"]
    tareas = [(repo, int(f["orden"]), f["archivo"]) for f in filas]
    with ProcessPoolExecutor(procesos) as ex:
        for i, (n, info) in enumerate(ex.map(trabajo, tareas)):
            print(i + 1, len(tareas), n, info, flush=True)
    print("COSIDO_LISTO", flush=True)


if __name__ == "__main__":
    main()
