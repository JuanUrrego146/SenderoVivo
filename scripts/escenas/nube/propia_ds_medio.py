"""Conjunto de Brush para entrenar SOLO el campo medio y lejano de una zona (lo que queda a mas de RADIO m del trazado).

uso: propia_ds_medio.py <conjunto_alfa> <cercana.ply> <track.json> <salida> [radio=13] [ancho_mascara=480]

En el modelo unico casi todas las gaussianas se van a lo cercano (3,75 M de 4,02 M a menos de 15 m en la Cumbre) y
los arboles de mas alla quedan con muy pocas: borrosos y con agujas. Aqui se arma un conjunto en el que lo cercano no
cuenta, para que un segundo entrenamiento gaste todo su tope en lo de mas alla (la idea de fondo y primer plano por
separado). De cada vista del conjunto con cielo transparente:
- la foto pasa a JPG sin alfa;
- la mascara (0 = no entrenar) tapa lo que ya tapaba (personas, quemado), el cielo (lo transparente) y LO CERCANO: los
  pixeles donde cae alguna gaussiana opaca de <cercana.ply> que este a menos de RADIO m del trazado en planta. La
  proyeccion se hace a ANCHO px, se engrosa 1 px y se cierran huecos de 7 px (las gaussianas se proyectan como puntos).
  Brush 0.3 no deja que una vista sea a la vez transparente y enmascarada, asi que el cielo va tapado y no transparente;
  lo que el entrenamiento deje flotando ahi se quita despues con tallar_cielo.py y tallar_cielo_gpu.py;
- sparse/0: mismas camaras y poses (nombres en .jpg) y solo los puntos de arranque a mas de RADIO - 1 m del trazado.
No usa GPU.
"""
import sys, os, json, numpy as np, cv2
from concurrent.futures import ThreadPoolExecutor
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat, colmapbin

SRC, CER, TRACK, OUT = sys.argv[1:5]
RADIO = float(sys.argv[5]) if len(sys.argv) > 5 else 13.0
AN = int(sys.argv[6]) if len(sys.argv) > 6 else 480
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK, encoding="utf-8"))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
T = cKDTree(den[:, [0, 2]])
g = splat.leer(CER)
op = 1 / (1 + np.exp(-g["opacidad"].ravel()))
m = (op > 0.08) & (T.query(g["xyz"][:, [0, 2]])[0] < RADIO)
X = g["xyz"][m].astype(np.float32); del g
print("gaussianas cercanas (opacas, a menos de %.0f m del trazado): %d" % (RADIO, len(X)), flush=True)
cams = {}
for l in open(os.path.join(SRC, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and p[1] == "PINHOLE":
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]))
vistas, lineas = [], []
for l in open(os.path.join(SRC, "sparse/0/images.txt")):
    p = l.rstrip("\n").split(" ", 9)
    if len(p) == 10 and not l.startswith("#"):
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        vistas.append((p[9], colmapbin.qvec2rot(q).astype(np.float32), t.astype(np.float32), int(p[8])))
        lineas.append(" ".join(p[:9]) + " " + os.path.splitext(p[9])[0] + ".jpg\n\n")
os.makedirs(os.path.join(OUT, "sparse/0"), exist_ok=True)
open(os.path.join(OUT, "sparse/0/images.txt"), "w").writelines(lineas)
open(os.path.join(OUT, "sparse/0/cameras.txt"), "w").write(open(os.path.join(SRC, "sparse/0/cameras.txt")).read())
np_tot = np_que = 0
with open(os.path.join(OUT, "sparse/0/points3D.txt"), "w") as f:
    for l in open(os.path.join(SRC, "sparse/0/points3D.txt")):
        p = l.split()
        if l.startswith("#") or len(p) < 4:
            f.write(l); continue
        np_tot += 1
        if T.query([float(p[1]), float(p[3])])[0] > RADIO - 1:
            f.write(l); np_que += 1
print("puntos de arranque: %d de %d (a mas de %.0f m del trazado)" % (np_que, np_tot, RADIO - 1), flush=True)


def una(v):
    n, R, t, c = v
    W, H, fx, fy, cx, cy = cams[c]
    base = os.path.splitext(n)[0]
    im = cv2.imread(os.path.join(SRC, "images", n), cv2.IMREAD_UNCHANGED)
    if im is None:
        return None
    if im.ndim == 3 and im.shape[2] == 4:
        mk = np.where(im[..., 3] > 0, 255, 0).astype(np.uint8); im = im[..., :3]
    else:
        mk = cv2.imread(os.path.join(SRC, "masks", n + ".png"), cv2.IMREAD_GRAYSCALE)
        if mk is None:
            mk = np.full(im.shape[:2], 255, np.uint8)
    cielo = (mk == 0).mean()
    s = AN / W; h = int(round(H * s))
    P = X @ R.T + t; z = P[:, 2]; ok = z > 0.15
    u = (P[ok, 0] / z[ok] * (fx * s) + cx * s).astype(np.int32); vv = (P[ok, 1] / z[ok] * (fy * s) + cy * s).astype(np.int32)
    d = (u >= 0) & (u < AN) & (vv >= 0) & (vv < h)
    cer = np.zeros((h, AN), np.uint8); cer[vv[d], u[d]] = 1
    cer = cv2.morphologyEx(cv2.dilate(cer, np.ones((3, 3), np.uint8)), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    cerg = cv2.resize(cer, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
    mk[cerg] = 0
    os.makedirs(os.path.dirname(os.path.join(OUT, "images", base)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.join(OUT, "masks", base)), exist_ok=True)
    cv2.imwrite(os.path.join(OUT, "images", base + ".jpg"), im, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(os.path.join(OUT, "masks", base + ".jpg.png"), mk)
    return cielo, cerg.mean(), (mk > 0).mean()


with ThreadPoolExecutor(3) as ex:
    res = [r for r in ex.map(una, vistas) if r is not None]
res = np.array(res)
print("vistas %d: tapado por cielo y mascaras %.1f %%, por cercano %.1f %%, queda para entrenar %.1f %% de los pixeles (vistas con menos del 3 %% util: %d)"
      % (len(res), 100 * res[:, 0].mean(), 100 * res[:, 1].mean(), 100 * res[:, 2].mean(), int((res[:, 2] < 0.03).sum())))
