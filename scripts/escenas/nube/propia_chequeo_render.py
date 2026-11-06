"""Comprueba unas poses nuevas dibujando una escena de referencia (Polycam, coherente en ida y vuelta) desde ellas y
midiendo contra la foto: corrimiento por flujo optico (Farneback, mediana del modulo en px a ANCHO de ancho, en pixeles
con escena opaca y a menos de 25 m) y PSNR tras ajustar cada canal con una recta. Si la ida y la vuelta calzan con la
misma escena, calzan entre si. Guarda una hoja con foto, dibujo y mezcla por fila.
uso: propia_chequeo_render.py <sparse> <images> <ref.ply> <por_toma> <ancho> <hoja.jpg>"""
import sys, os, numpy as np, cv2
from collections import defaultdict
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

SP, IMS, REF, NT, ANCHO, HOJA = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
por = defaultdict(list)
for i, v in ims.items():
    por[v["name"].split("/")[0]].append(i)
G = render.a_gpu(splat.leer(REF))
filas, res = [], defaultdict(list)
for t in sorted(por):
    ids = sorted(por[t], key=lambda i: ims[i]["name"])
    for i in [ids[int(k)] for k in np.linspace(len(ids) * 0.15, len(ids) * 0.85, NT)]:
        v = ims[i]; mod, W, H, p = cams[v["cam"]]
        s = ANCHO / W; w, h = ANCHO, round(H * s)
        foto = cv2.resize(cv2.imread(os.path.join(IMS, v["name"])), (w, h), interpolation=cv2.INTER_AREA)
        img, alfa, prof = render.render(G, v["R"], v["t"], p[0] * s, p[0] * s, p[1] * s, p[2] * s, w, h)
        dib = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8)
        m = (alfa > 0.95) & (prof < 25)
        a = dib[m].astype(float); b = foto[m].astype(float); aj = np.empty_like(a)
        for c in range(3):
            A = np.c_[a[:, c], np.ones(len(a))]; aj[:, c] = A @ np.linalg.lstsq(A, b[:, c], rcond=None)[0]
        psnr = 10 * np.log10(255 ** 2 / np.mean((aj - b) ** 2))
        g1 = cv2.cvtColor(foto, cv2.COLOR_BGR2GRAY); g2 = cv2.cvtColor(dib, cv2.COLOR_BGR2GRAY)
        fl = cv2.calcOpticalFlowFarneback(g1, g2, None, 0.5, 4, 25, 3, 7, 1.5, 0)
        mag = np.linalg.norm(fl, axis=2)[m]
        res[t].append((np.median(mag), psnr))
        if len(filas) < 12 and ids.index(i) == ids.index(i):
            mez = cv2.addWeighted(foto, 0.5, dib, 0.5, 0)
            fila = np.hstack([foto, dib, mez])
            cv2.putText(fila, "%s %.1f px %.1f dB" % (t[2:], np.median(mag), psnr), (8, 24), 0, 0.7, (0, 255, 255), 2)
            filas.append(fila)
print("%-28s %10s %8s" % ("toma", "corrim px", "PSNR"))
todo = []
for t in sorted(res):
    r = np.array(res[t]); todo += list(r[:, 0])
    print("%-28s %10.2f %8.2f" % (t, np.median(r[:, 0]), np.median(r[:, 1])))
print("mediana general del corrimiento: %.2f px a %d de ancho" % (np.median(todo), ANCHO))
cv2.imwrite(HOJA, np.vstack(filas[::max(1, len(filas) // 6)][:6]))
