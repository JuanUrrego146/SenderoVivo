"""Quita las burbujas de cielo de Polycam: gaussianas de color cielo (luminancia > LUM, no verdes: el verde no supera
a la media de rojo y azul por más de 0,05, y el azul no queda por debajo del rojo) que están a más de ALTO m por encima
del trazado más cercano en planta. Polycam reconstruye mal el cielo y lo deja como burbujas claras y azuladas encima
del camino; las copas de los árboles (verdes u oscuras) no cumplen el color y se quedan.
uso: quitar_burbujas.py <entrada.ply> <track.json> <salida.ply> [alto=5] [lum=0.55]"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

ENT, TRACK, SAL = sys.argv[1:4]
ALTO = float(sys.argv[4]) if len(sys.argv) > 4 else 5.0
LUM = float(sys.argv[5]) if len(sys.argv) > 5 else 0.55
C0 = 0.28209479177387814
g = splat.leer(ENT)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
_, idx = cKDTree(den[:, [0, 2]]).query(g["xyz"][:, [0, 2]])
sobre = g["xyz"][:, 1] - den[idx, 1]
rgb = np.clip(0.5 + C0 * g["dc"], 0, 1)
lum = rgb.mean(1)
color_cielo = (lum > LUM) & (rgb[:, 1] - (rgb[:, 0] + rgb[:, 2]) / 2 < 0.05) & (rgb[:, 2] >= rgb[:, 0] - 0.02)
# las nubes casi blancas pueden tener un leve tinte cálido; ninguna copa de árbol es tan clara
color_cielo |= lum > 0.75
quitar = color_cielo & (sobre > ALTO)
print("burbujas de cielo quitadas: %d (%.2f %%)" % (quitar.sum(), 100 * quitar.mean()))
splat.escribir(SAL, {k: v[~quitar] for k, v in g.items()})
