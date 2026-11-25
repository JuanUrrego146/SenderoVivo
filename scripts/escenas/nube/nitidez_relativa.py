"""Que tan borrosa esta la escena A LO LARGO del trazado, comparada con las fotos reales tomadas en cada sitio.

La nitidez del dibujo sola (varianza del laplaciano) depende de lo que haya delante: un trecho de sombra y musgo da
menos que uno de paja al sol aunque los dos esten igual de bien reconstruidos. Aqui cada foto de una toma se compara
con el dibujo de la escena hecho desde su misma pose y a su mismo tamano: el cociente nitidez del dibujo / nitidez de
la foto (1 = tan nitido como la foto) no depende del motivo. La foto se ubica sobre el trazado por la proyeccion de
su camara, y sale el perfil por trechos de BIN m.
uso: nitidez_relativa.py <conjunto_alfa> <escena.ply> <track.json> <toma> <salida.json> [cada=3] [ancho=640] [bin=4]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

DS, PLY, TRACK, TOMA, OUT = sys.argv[1:6]
CADA = int(sys.argv[6]) if len(sys.argv) > 6 else 3
ANCHO = int(sys.argv[7]) if len(sys.argv) > 7 else 640
BIN = float(sys.argv[8]) if len(sys.argv) > 8 else 4.0
cams = {}
for l in open(os.path.join(DS, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and p[1] == "PINHOLE":
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]))
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.strip().split(" ", 9)
    if len(p) == 10 and p[9].startswith(TOMA):
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        vistas.append((p[9], colmapbin.qvec2rot(q), t, int(p[8])))
vistas.sort(key=lambda v: v[0]); vistas = vistas[::CADA]
w = np.array([[q["x"], q["y"], q["z"]] for q in json.load(open(TRACK, encoding="utf-8"))["sceneWaypoints"]], np.float64)
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ds = np.arange(0, L[-1] + 1e-6, 0.1); den = np.c_[[np.interp(ds, L, w[:, k]) for k in range(3)]].T


def foto_y_mascara(n, w_, h_):
    base = os.path.splitext(n)[0]
    for f in (os.path.join(DS, "images", n), os.path.join(DS, "images", base + ".png"), os.path.join(DS, "images", base + ".jpg")):
        if os.path.exists(f):
            im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
            if im is None:
                continue
            m = im[..., 3] if im.ndim == 3 and im.shape[2] == 4 else None
            if m is None:
                mp = os.path.join(DS, "masks", n + ".png")
                m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else np.full(im.shape[:2], 255, np.uint8)
            return (cv2.resize(im[..., :3], (w_, h_), interpolation=cv2.INTER_AREA),
                    cv2.resize(m, (w_, h_), interpolation=cv2.INTER_NEAREST) > 0)
    return None, None


g = splat.leer(PLY)
o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1)
g = {k: v[ok] for k, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12)
G = render.a_gpu(g)
lap = lambda x: cv2.Laplacian(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), cv2.CV_64F)
res = []
for n, R, t, c in vistas:
    W, H, fx, fy, cx, cy = cams[c]; s = ANCHO / W; h = int(round(H * s))
    foto, val = foto_y_mascara(n, ANCHO, h)
    if foto is None or val.mean() < 0.3:
        continue
    img, alfa, _ = render.render(G, R, t, fx * s, fy * s, cx * s, cy * s, ANCHO, h, fondo=(0.5, 0.5, 0.5))
    dib = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8)
    centro = -R.T @ t
    d = float(ds[np.argmin(((den - centro) ** 2).sum(1))])
    lf, ld = lap(foto)[val].var(), lap(dib)[val].var()
    res.append((d, ld / max(lf, 1e-6), lf, ld))
res.sort()
a = np.array(res)
json.dump({"toma": TOMA, "d": a[:, 0].round(2).tolist(), "cociente": a[:, 1].round(4).tolist(), "foto": a[:, 2].round(1).tolist(),
           "dibujo": a[:, 3].round(1).tolist()}, open(OUT, "w"))
print("%s: %d fotos de %s; cociente nitidez del dibujo / de la foto: mediana %.2f (p10 %.2f, p90 %.2f)"
      % (os.path.basename(PLY), len(a), TOMA, np.median(a[:, 1]), *np.percentile(a[:, 1], [10, 90])))
fila = []
for b in np.arange(0, L[-1], BIN):
    m = (a[:, 0] >= b) & (a[:, 0] < b + BIN)
    if m.sum() >= 2:
        fila.append("%g:%.2f(%d)" % (b, np.median(a[m, 1]), np.median(a[m, 2])))
print("por trechos de %g m, distancia:cociente(nitidez de la foto): %s" % (BIN, " ".join(fila)))
