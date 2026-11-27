# -*- coding: utf-8 -*-
"""Vista de banda (de +25 a -35 grados, giro completo) de paradas, con regla de rumbo cada 30 grados,
para ubicar a ojo los puntos de interes sobre la foto. rumbo = (x / ancho) * 360 - 180, que es el yaw
del visor; elevacion = 90 - (y / alto) * 180, que es el pitch.
uso: python banda.py salida.jpg pNNN [pNNN ...]"""
import sys
import cv2
import numpy as np

filas = []
for n in sys.argv[2:]:
    im = cv2.imread("E:/SenderoV2/base/%s.jpg" % n)
    im = cv2.resize(im, (2048, 1024), interpolation=cv2.INTER_AREA)
    b = im[int(1024 * 65 / 180):int(1024 * 125 / 180)].copy()
    for yaw in range(-180, 181, 30):
        x = int((yaw + 180) / 360 * 2048)
        cv2.line(b, (x, 0), (x, 12), (0, 0, 255), 2)
        cv2.putText(b, str(yaw), (min(x + 2, 2000), 26), 0, 0.5, (0, 0, 255), 1)
    y0 = int(1024 * 90 / 180) - int(1024 * 65 / 180)
    cv2.line(b, (0, y0), (2047, y0), (0, 255, 255), 1)
    cv2.putText(b, n, (6, 50), 0, 0.9, (0, 0, 255), 2)
    filas.append(b)
cv2.imwrite(sys.argv[1], np.vstack(filas), [cv2.IMWRITE_JPEG_QUALITY, 88])
