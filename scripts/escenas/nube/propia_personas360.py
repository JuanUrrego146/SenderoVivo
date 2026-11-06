"""Tapa personas en las vistas 360 de la Cumbre con YOLO (segmentacion, clase 0), engrosadas un 2 % del ancho, sobre la
mascara que ya tienen (operador por elevacion y carpa). uso: propia_personas360.py <propia> <modelo.pt> [cpu|0]"""
import sys, os, numpy as np, cv2
from ultralytics import YOLO

OUT, MOD = sys.argv[1], sys.argv[2]
DEV = sys.argv[3] if len(sys.argv) > 3 else "cpu"
yolo = YOLO(MOD)
lista = [l.strip() for l in open(os.path.join(OUT, "lista_360.txt")) if l.strip()]
con = 0
for n in lista:
    im = cv2.imread(os.path.join(OUT, "images", n))
    H, W = im.shape[:2]
    r = yolo.predict(im, imgsz=1280, conf=0.25, classes=[0], device=DEV, verbose=False)[0]
    if r.masks is None:
        continue
    per = np.zeros((H, W), np.uint8)
    for m in r.masks.data.cpu().numpy():
        per |= (cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR) > 0.5).astype(np.uint8)
    k = int(W * 0.02) | 1
    per = cv2.dilate(per, np.ones((k, k), np.uint8))
    mp = os.path.join(OUT, "masks", n + ".png")
    mk = cv2.imread(mp, cv2.IMREAD_GRAYSCALE)
    mk[per > 0] = 0
    cv2.imwrite(mp, mk)
    con += 1
print("vistas 360 con personas tapadas: %d de %d" % (con, len(lista)))
