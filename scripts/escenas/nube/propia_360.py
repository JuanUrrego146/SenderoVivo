"""Vistas rectilineas de las panoramicas 360 que caen en la Cumbre, listas para sumarlas a la alineacion propia.
Toma las vistas ya generadas por scripts/captura360/vistas.py (2400 px, 90 grados, f 1200, una lente cada una, sin
costura) de la subida con sol (p0285 a p0309) y del arranque de la bajada (l0001 a l0012), y les arma mascara:
- la del operador que ya traen (gorra y manos, por elevacion del rayo);
- la carpa azul que habia ese dia en el claro y no esta en los videos: lo azul saturado (tono 100-130, saturacion > 120)
  en manchas grandes, mas su caja extendida hacia abajo 1,6 veces su ancho para tapar patas, mesa y lo que habia
  debajo.
Salida en <propia>/images/i360/<vista>_<pano>.jpg con su mascara en masks/, y lista_360.txt.
uso: propia_360.py <propia>"""
import sys, os, numpy as np, cv2

OUT = sys.argv[1]
fuentes = [("E:/Sendero/vistas-sol", ["p%04d" % i for i in range(285, 310)]),
           ("E:/Sendero/vistas-llovizna", ["l%04d" % i for i in range(1, 13)])]
vistas = ["a0", "a1", "a2", "a3", "b0", "b1", "b2", "b3"]
os.makedirs(os.path.join(OUT, "images", "i360"), exist_ok=True)
os.makedirs(os.path.join(OUT, "masks", "i360"), exist_ok=True)
lista, conCarpa = [], 0
for raiz, panos in fuentes:
    for p in panos:
        for v in vistas:
            src = os.path.join(raiz, "images", v, p + ".jpg")
            if not os.path.exists(src):
                continue
            n = "i360/%s_%s.jpg" % (v, p)
            dst = os.path.join(OUT, "images", n)
            if not os.path.exists(dst):
                os.link(src, dst)
            im = cv2.imread(src)
            H, W = im.shape[:2]
            mp = os.path.join(raiz, "masks", v, p + ".jpg.png")
            m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else np.full((H, W), 255, np.uint8)
            hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
            azul = ((hsv[..., 0] > 100) & (hsv[..., 0] < 130) & (hsv[..., 1] > 120) & (hsv[..., 2] > 60)).astype(np.uint8)
            azul = cv2.morphologyEx(azul, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
            k, lab, st, _ = cv2.connectedComponentsWithStats(azul)
            for j in range(1, k):
                x, y, w, h, a = st[j]
                if a < 0.002 * H * W:
                    continue
                x0, x1 = max(0, x - w // 8), min(W, x + w + w // 8)
                y0, y1 = max(0, y - h // 4), min(H, y + h + int(1.6 * w))
                m[y0:y1, x0:x1] = 0
                conCarpa += 1
            cv2.imwrite(os.path.join(OUT, "masks", n + ".png"), m)
            lista.append(n)
open(os.path.join(OUT, "lista_360.txt"), "w").write("\n".join(lista) + "\n")
print("vistas 360: %d, manchas de carpa tapadas: %d" % (len(lista), conCarpa))
