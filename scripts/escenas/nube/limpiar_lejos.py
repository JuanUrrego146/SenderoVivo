"""Quita de lo lejano de una escena las agujas y las manchas gigantes.

uso: limpiar_lejos.py <entrada.ply> <track.json> <salida.ply> [radio=20] [razon=8] [largo=0.5] [grande=6]

Lejos del trazado las fotos casi no dan paralaje y el entrenamiento deja gaussianas estiradas a lo largo de los rayos
(agujas) y manchas enormes. De cerca no se notan; en el fondo se ven como rayones. A mas de RADIO m del trazado (en
planta) se quitan las gaussianas con eje mayor / eje mediano > RAZON y eje mayor > LARGO m, y las de eje mayor >
GRANDE m. No toca lo que esta a menos de RADIO m.
"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

IN, TRACK, OUT = sys.argv[1:4]
RADIO = float(sys.argv[4]) if len(sys.argv) > 4 else 20.0
RAZON = float(sys.argv[5]) if len(sys.argv) > 5 else 8.0
LARGO = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
GRANDE = float(sys.argv[7]) if len(sys.argv) > 7 else 6.0
g = splat.leer(IN)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK, encoding="utf-8"))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
d = cKDTree(den[:, [0, 2]]).query(g["xyz"][:, [0, 2]])[0]
e = np.sort(np.exp(np.clip(g["escala"], -20, 8)), 1)
lejos = d > RADIO
aguja = lejos & (e[:, 2] / np.maximum(e[:, 1], 1e-6) > RAZON) & (e[:, 2] > LARGO)
gigante = lejos & ~aguja & (e[:, 2] > GRANDE)
fuera = aguja | gigante
splat.escribir(OUT, {k: v[~fuera] for k, v in g.items()})
print("lejos (a mas de %.0f m del trazado): %d gaussianas; agujas quitadas %d, gigantes quitadas %d; quedan %d de %d -> %s"
      % (RADIO, lejos.sum(), aguja.sum(), gigante.sum(), (~fuera).sum(), len(d), OUT))
