"""Nitidez de las FOTOS reales de una toma a lo largo del trazado (sin dibujar nada, solo CPU), junto al perfil de
nitidez del dibujo que dejo paradas_recorrido.py. Sirve para separar «la escena esta borrosa» de «ahi hay poco que
ver» (sombra, musgo): si en un trecho baja la nitidez del dibujo pero tambien la de la foto, el motivo es el sitio.
El cociente dibujo/foto se da relativo a la mediana del tramo (1 = como el resto del tramo).
uso: nitidez_fotos.py <conjunto_alfa> <track.json> <toma> <paradas.json> [cada=2] [ancho=640] [bin=4]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin
DS, TRACK, TOMA, PAR = sys.argv[1:5]
CADA = int(sys.argv[5]) if len(sys.argv) > 5 else 2
ANCHO = int(sys.argv[6]) if len(sys.argv) > 6 else 640
BIN = float(sys.argv[7]) if len(sys.argv) > 7 else 4.0
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.strip().split(" ", 9)
    if len(p) == 10 and p[9].startswith(TOMA):
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        R = colmapbin.qvec2rot(q); vistas.append((p[9], -R.T @ t))
vistas.sort(key=lambda v: v[0]); vistas = vistas[::CADA]
w = np.array([[q["x"], q["y"], q["z"]] for q in json.load(open(TRACK, encoding="utf-8"))["sceneWaypoints"]], np.float64)
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ds = np.arange(0, L[-1] + 1e-6, 0.1); den = np.c_[[np.interp(ds, L, w[:, k]) for k in range(3)]].T
res = []
for n, c in vistas:
    base = os.path.splitext(n)[0]; im = None
    for f in (os.path.join(DS, "images", n), os.path.join(DS, "images", base + ".png"), os.path.join(DS, "images", base + ".jpg")):
        if os.path.exists(f):
            im = cv2.imread(f, cv2.IMREAD_UNCHANGED); break
    if im is None:
        continue
    h = round(im.shape[0] * ANCHO / im.shape[1])
    ch = cv2.resize(im[..., :3], (ANCHO, h), interpolation=cv2.INTER_AREA)
    # recorte central con el campo de la app (58 grados en vertical de 68 de la foto) llevado a 640x360
    k = np.tan(np.radians(29)) / np.tan(np.radians(34.3)); hh, ww = int(h * k), int(ANCHO * k)
    rec = cv2.resize(ch[(h - hh) // 2:(h + hh) // 2, (ANCHO - ww) // 2:(ANCHO + ww) // 2], (640, 360), interpolation=cv2.INTER_AREA)
    lf = cv2.Laplacian(cv2.cvtColor(rec, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    brillo = float(cv2.cvtColor(rec, cv2.COLOR_BGR2GRAY).mean())
    dmin = ((den - c) ** 2).sum(1); j = int(np.argmin(dmin))
    if dmin[j] < 4.0:
        res.append((float(ds[j]), lf, brillo))
a = np.array(sorted(res))
p = json.load(open(PAR)); dd = np.array(p["distancia"]); nn = np.array(p["nitidez"], float)
coc = np.array([np.median(nn[np.abs(dd - d) <= 1.0]) for d in a[:, 0]]) / a[:, 1]
med = np.median(coc)
print("%s: %d fotos; nitidez de la foto mediana %.0f; cociente dibujo/foto mediano %.2f" % (TOMA, len(a), np.median(a[:, 1]), med))
fila = []
for b in np.arange(0, L[-1], BIN):
    m = (a[:, 0] >= b) & (a[:, 0] < b + BIN)
    if m.sum() >= 2:
        fila.append("%g: foto %d dibujo %d relativo %.2f brillo %d" % (b, np.median(a[m, 1]), np.median(nn[(dd >= b) & (dd < b + BIN)]), np.median(coc[m]) / med, np.median(a[m, 2])))
print("\n".join(fila))
json.dump({"d": a[:, 0].round(2).tolist(), "foto": a[:, 1].round(1).tolist(), "relativo": (coc / med).round(3).tolist()}, open(os.path.splitext(PAR)[0] + "_fotos.json", "w"))
