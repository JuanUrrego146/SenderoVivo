# -*- coding: utf-8 -*-
"""Hojas para revisar a ojo los panoramas ya parchados (E:/SenderoV2/revisar).

Cada panorama se muestra de +30 grados de elevacion hacia abajo y girado 180 grados: lo de atras,
donde iba quien llevaba la camara, queda al centro; el frente queda partido en los dos bordes, con una
marca roja. Se buscan restos de la persona, de su sombra o del palo alrededor del disco del suelo.
18 panoramas por hoja, en E:/SenderoV2/hojas.

uso: python revisar_hojas.py [pNNN ...]   (sin lista: todos)
"""
import glob
import os
import sys

import cv2
import numpy as np

ns = sorted(glob.glob("E:/SenderoV2/revisar/p*.jpg"))
if len(sys.argv) > 1:
    ns = [n for n in ns if os.path.basename(n)[:-4] in set(sys.argv[1:])]
os.makedirs("E:/SenderoV2/hojas", exist_ok=True)
for k in range(0, len(ns), 18):
    tiles = []
    for f in ns[k:k + 18]:
        im = cv2.imread(f)
        H, W = im.shape[:2]
        im = np.roll(im, W // 2, axis=1)[int(H * 60 / 180):]
        im = cv2.resize(im, (640, 240), interpolation=cv2.INTER_AREA)
        for x in (0, 639):
            cv2.line(im, (x, 0), (x, 30), (0, 0, 255), 4)
        cv2.putText(im, os.path.basename(f)[:-4], (8, 24), 0, 0.8, (0, 0, 255), 2)
        tiles.append(im)
    while len(tiles) % 3:
        tiles.append(np.zeros_like(tiles[0]))
    hoja = np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)])
    cv2.imwrite("E:/SenderoV2/hojas/h_%s.jpg" % os.path.basename(ns[k])[:-4], hoja, [cv2.IMWRITE_JPEG_QUALITY, 88])
print(len(ns))
