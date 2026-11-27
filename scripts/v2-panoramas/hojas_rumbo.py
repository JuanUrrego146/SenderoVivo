# -*- coding: utf-8 -*-
"""Hojas compactas para anotar a ojo hacia donde sigue el camino en cada parada y buscar letreros:
banda de +15 a -30 grados, giro completo a 1024 px, regla de rumbo cada 30 grados (el yaw del visor).
10 paradas por hoja en E:/SenderoV2/hojas_rumbo."""
import csv, os, cv2, numpy as np
filas = [f for f in csv.DictReader(open("../../v2/inventario/eleccion.csv", encoding="utf-8")) if f["estado"] == "elegida"]
ns = ["p%03d" % int(f["orden"]) for f in filas]
os.makedirs("E:/SenderoV2/hojas_rumbo", exist_ok=True)
for k in range(0, len(ns), 10):
    b = []
    for n in ns[k:k + 10]:
        im = cv2.resize(cv2.imread("E:/SenderoV2/base/%s.jpg" % n), (1024, 512), interpolation=cv2.INTER_AREA)
        x = im[int(512 * 75 / 180):int(512 * 120 / 180)].copy()
        for yaw in range(-180, 181, 30):
            px = int((yaw + 180) / 360 * 1024)
            cv2.line(x, (px, 0), (px, 8), (0, 0, 255), 2)
            cv2.putText(x, str(yaw), (min(px + 1, 990), 18), 0, 0.38, (0, 0, 255), 1)
        cv2.putText(x, n, (4, 40), 0, 0.6, (0, 255, 255), 2)
        b.append(x)
    cv2.imwrite("E:/SenderoV2/hojas_rumbo/r_%s.jpg" % ns[k], np.vstack(b), [cv2.IMWRITE_JPEG_QUALITY, 85])
print(len(ns))
