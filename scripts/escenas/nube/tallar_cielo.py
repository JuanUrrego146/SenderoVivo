"""Talla una escena de gaussianas con el cielo de las fotos de entrenamiento. Un pixel de cielo certifica que a lo
largo de TODO su rayo no hay nada: cualquier gaussiana cuyo centro caiga sobre pixeles de cielo en varias fotos es una
mota o un velo flotando (las manchas negras junto a las copas, los halos de las barandas contra el paisaje), no una
superficie. Para cada vista con cielo transparente (PNG con alfa del conjunto de Brush) se proyectan los centros; cada
gaussiana suma un voto de «cielo» si cae en cielo (el cielo se encoge BORDE px a 480 de ancho para no castigar los
bordes de hojas y ramas) y uno de «vista» si cae dentro de la foto. Se borran las que juntan VOTOS o mas de cielo y
ademas caen en cielo en FRAC o mas de las fotos donde aparecen.
Lee el conjunto en texto (sparse/0/cameras.txt e images.txt, PINHOLE); usa hasta MAXV vistas repartidas. Solo CPU.
uso: tallar_cielo.py <conjunto> <entrada.ply> <salida.ply> [votos=3] [frac=0.25] [borde=2] [maxv=400]"""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, colmapbin

DS, IN, OUT = sys.argv[1:4]
VOTOS = int(sys.argv[4]) if len(sys.argv) > 4 else 3
FRAC = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
BORDE = int(sys.argv[6]) if len(sys.argv) > 6 else 2
MAXV = int(sys.argv[7]) if len(sys.argv) > 7 else 400
ANCHO = 480

cams = {}
for l in open(os.path.join(DS, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and p[1] == "PINHOLE":
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]))
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.strip().split(" ", 9)
    if len(p) == 10 and not l.startswith("#"):
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        vistas.append((p[9], colmapbin.qvec2rot(q), t, int(p[8])))


def cielo_de(n):
    """Mapa booleano de cielo a ANCHO px (ya encogido), o None si la vista no trae alfa."""
    base = os.path.splitext(n)[0]
    for f in (os.path.join(DS, "images", n), os.path.join(DS, "images", base + ".png")):
        if os.path.exists(f):
            im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
            if im is None or im.ndim != 3 or im.shape[2] != 4:
                return None
            a = im[..., 3]
            h = int(round(ANCHO * a.shape[0] / a.shape[1]))
            c = (cv2.resize(a, (ANCHO, h), interpolation=cv2.INTER_AREA) < 3).astype(np.uint8)
            if BORDE > 0:
                c = cv2.erode(c, np.ones((2 * BORDE + 1, 2 * BORDE + 1), np.uint8))
            return c
    return None


g = splat.leer(IN)
X = g["xyz"].astype(np.float32)
N = len(X)
v_cielo = np.zeros(N, np.uint16); v_vista = np.zeros(N, np.uint16)
con_alfa = []
for v in vistas:
    con_alfa.append(v)
sel = [con_alfa[int(k)] for k in np.linspace(0, len(con_alfa) - 1, min(MAXV, len(con_alfa)))]
usadas = 0
for n, R, t, c in sel:
    m = cielo_de(n)
    if m is None or not m.any():
        continue
    usadas += 1
    W, H, fx, fy, cx, cy = cams[c]
    s = ANCHO / W
    h = m.shape[0]
    P = X @ R.T.astype(np.float32) + t.astype(np.float32)
    z = P[:, 2]
    ok = z > 0.2
    u = np.full(N, -1.0, np.float32); w = np.full(N, -1.0, np.float32)
    u[ok] = P[ok, 0] / z[ok] * (fx * s) + cx * s
    w[ok] = P[ok, 1] / z[ok] * (fy * s) + cy * s
    den = ok & (u >= 0) & (u < ANCHO) & (w >= 0) & (w < h)
    idx = np.where(den)[0]
    v_vista[idx] += 1
    en = m[w[idx].astype(np.int32), u[idx].astype(np.int32)] > 0
    v_cielo[idx[en]] += 1
frac = v_cielo / np.maximum(v_vista, 1)
fuera = (v_cielo >= VOTOS) & (frac >= FRAC)
d = {k: a[~fuera] for k, a in g.items()}
splat.escribir(OUT, d)
op = 1 / (1 + np.exp(-g["opacidad"].ravel()))
print("vistas con cielo usadas: %d de %d; gaussianas talladas: %d de %d (%.2f %%); opacidad media de las talladas %.2f; quedan %d -> %s"
      % (usadas, len(sel), fuera.sum(), N, 100.0 * fuera.mean(), float(op[fuera].mean()) if fuera.any() else 0.0, (~fuera).sum(), OUT))
