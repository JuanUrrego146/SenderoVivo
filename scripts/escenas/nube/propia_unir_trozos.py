"""Une los splats entrenados por trozos (propia_trozos.py) en una sola escena. Cada gaussiana se proyecta en planta
sobre el trazado; se queda si su avance cae en el rango de su trozo. En cada corte hay una franja de FRANJA metros donde
la gaussiana sale de uno u otro trozo al azar en proporcion a la distancia al corte (sin costura de golpe), con una
semilla fija. Sanea opacidades y escalas no finitas (Brush exporta algunas).
uso: propia_unir_trozos.py <track.json> <trozos.json> <franja_m> <salida.ply> <trozo0.ply> <trozo1.ply> ..."""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

TRACK, TJ, FRANJA, OUT = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
PLYS = sys.argv[5:]
cortes = json.load(open(TJ))["cortes"]
assert len(PLYS) == len(cortes) - 1, "un PLY por trozo"
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ds = np.arange(0, L[-1], 0.1)
den = np.c_[[np.interp(ds, L, w[:, k]) for k in range(3)]].T
arbol = cKDTree(den[:, [0, 2]])
rng = np.random.default_rng(7)
partes = []
for k, ply in enumerate(PLYS):
    g = splat.leer(ply)
    ok = np.isfinite(g["opacidad"].ravel()) & np.isfinite(g["escala"]).all(1) & np.isfinite(g["xyz"]).all(1)
    g = {a: v[ok] for a, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12)
    d = ds[arbol.query(g["xyz"][:, [0, 2]])[1]]
    p = np.ones(len(d))
    if k > 0:                                   # corte inferior: entra al subir
        p *= np.clip((d - (cortes[k] - FRANJA / 2)) / FRANJA, 0, 1)
    if k < len(PLYS) - 1:                       # corte superior: sale al subir
        p *= np.clip(((cortes[k + 1] + FRANJA / 2) - d) / FRANJA, 0, 1)
    sel = rng.random(len(d)) < p
    partes.append({a: v[sel] for a, v in g.items()})
    print("trozo %d: quedan %d de %d gaussianas" % (k, sel.sum(), len(sel)))
h = {a: np.concatenate([q[a] for q in partes]) for a in partes[0]}
splat.escribir(OUT, h)
print("unido: %d gaussianas en %s" % (len(h["xyz"]), OUT))
