"""Parte un conjunto de Brush en trozos a lo largo del trazado, con solape, para entrenar cada trozo con su propio tope
de gaussianas (la nitidez esta limitada por la cantidad de gaussianas, no por la resolucion de las fotos).
Cada vista va al trozo (o trozos) cuyo rango de avance contiene la proyeccion de su camara sobre el trazado, ampliado
SOLAPE metros a cada lado. Los puntos de arranque de cada trozo son los que caen en su rango ampliado otros 5 m.
Las imagenes y mascaras se enlazan (no se copian). Escribe <prefijo>_<k>/ y <prefijo>_trozos.json con los cortes.
uso: propia_trozos.py <conjunto> <track.json> <n_trozos> <solape_m> <prefijo>"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

DS, TRACK, N, SOLAPE, PREF = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ds = np.arange(0, L[-1], 0.1)
den = np.c_[[np.interp(ds, L, w[:, k]) for k in range(3)]].T
arbol = cKDTree(den[:, [0, 2]])
cortes = np.linspace(0, L[-1], N + 1)
lineas = [l.strip() for l in open(os.path.join(DS, "sparse/0/images.txt")) if l.strip()]
vistas = []
for l in lineas:
    p = l.split(" ", 9)
    R = colmapbin.qvec2rot(np.array([float(x) for x in p[1:5]])); t = np.array([float(x) for x in p[5:8]])
    C = -R.T @ t
    vistas.append((l, p[9], ds[arbol.query(C[[0, 2]])[1]]))
pts = [l for l in open(os.path.join(DS, "sparse/0/points3D.txt")) if l.strip() and not l.startswith("#")]
pxyz = np.array([[float(x) for x in l.split()[1:4]] for l in pts]) if pts else np.zeros((0, 3))
pd = ds[arbol.query(pxyz[:, [0, 2]])[1]] if len(pts) else np.zeros(0)


def enlazar(a, b):
    os.makedirs(os.path.dirname(b), exist_ok=True)
    if not os.path.exists(b):
        os.link(a, b)


for k in range(N):
    lo = cortes[k] - SOLAPE if k > 0 else -1e9
    hi = cortes[k + 1] + SOLAPE if k < N - 1 else 1e9
    out = "%s_%d" % (PREF, k)
    os.makedirs(os.path.join(out, "sparse/0"), exist_ok=True)
    sel = [(l, n) for l, n, d in vistas if lo <= d <= hi]
    with open(os.path.join(out, "sparse/0/images.txt"), "w") as f:
        for l, n in sel:
            f.write(l + "\n\n")
            enlazar(os.path.join(DS, "images", n), os.path.join(out, "images", n))
            for cand in (n + ".png", os.path.splitext(n)[0] + ".jpg.png"):
                mp = os.path.join(DS, "masks", cand)
                if os.path.exists(mp):
                    enlazar(mp, os.path.join(out, "masks", cand)); break
    open(os.path.join(out, "sparse/0/cameras.txt"), "w").write(open(os.path.join(DS, "sparse/0/cameras.txt")).read())
    psel = (pd >= lo - 5) & (pd <= hi + 5)
    with open(os.path.join(out, "sparse/0/points3D.txt"), "w") as f:
        for j in np.where(psel)[0]:
            f.write(pts[j])
    print("trozo %d: avance %.1f a %.1f m (vistas de %.1f a %.1f), %d vistas, %d puntos"
          % (k, cortes[k], cortes[k + 1], max(lo, 0), min(hi, L[-1]), len(sel), psel.sum()))
json.dump({"cortes": cortes.tolist(), "solape": SOLAPE, "largo": float(L[-1])}, open(PREF + "_trozos.json", "w"))
