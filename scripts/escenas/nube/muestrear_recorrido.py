"""Recorte de una escena para celular (N gaussianas) pensado para un recorrido a pie.
El recorte anterior (scripts/escenas/muestrear.js) puntua cada gaussiana por alfa x area y se queda con las N mayores:
eso conserva lo grande y descarta primero lo pequeno, que cerca del camino es justo el detalle fino que el visitante ve.
Aqui el puntaje es lo que la gaussiana llega a ocupar en pantalla desde el punto del recorrido que le queda mas cerca:
  puntaje = alfa x (eje mayor x eje medio) / max(d, DMIN)^2
con d la distancia 3D a la linea de los ojos (trazado + OJOS m). Una hoja de 1 cm a 2 m pesa lo mismo que una mancha de
10 cm a 20 m. Se conservan las N de mayor puntaje; no se mueve ni se cambia ninguna gaussiana.
uso: muestrear_recorrido.py <entrada.ply> <track.json> <salida.ply> <N> [ojos=0.85] [dmin=0.75]"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

PLY, TRACK, OUT, N = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
OJOS = float(sys.argv[5]) if len(sys.argv) > 5 else 0.85
DMIN = float(sys.argv[6]) if len(sys.argv) > 6 else 0.75
g = splat.leer(PLY)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.05), L, w[:, k]) for k in range(3)]].T + [0, OJOS, 0]
d = cKDTree(den).query(g["xyz"])[0]
es = np.sort(np.exp(np.clip(g["escala"], -20, 10)), axis=1)[:, ::-1]
alfa = splat.sigmoide(np.clip(g["opacidad"].ravel(), -12, 12))
puntaje = alfa * es[:, 0] * es[:, 1] / np.maximum(d, DMIN) ** 2
if len(puntaje) <= N:
    sel = np.ones(len(puntaje), bool)
else:
    umbral = np.partition(puntaje, len(puntaje) - N)[len(puntaje) - N]
    sel = puntaje >= umbral
splat.escribir(OUT, {k: v[sel] for k, v in g.items()})
print("quedan %d de %d gaussianas" % (sel.sum(), len(sel)))
for a, b in [(0, 3), (3, 8), (8, 20), (20, 1e9)]:
    m = (d >= a) & (d < b)
    print("  %4g a %4g m: %7d de %7d (%.0f %%)" % (a, min(b, 9999), (sel & m).sum(), m.sum(), 100 * (sel & m).sum() / max(m.sum(), 1)))
