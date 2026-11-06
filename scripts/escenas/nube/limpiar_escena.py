"""Limpia una escena horneada para recorrerla por su trazado.
1) Pasillo: quita las gaussianas que caen dentro del volumen que puede ocupar la cabeza del visitante, es decir a
   menos de (corredor + margen) en planta del trazado y entre 0,9 y 1,9 m sobre el suelo (el trazado va 0,6 m sobre el
   suelo y los ojos 0,85 m sobre el trazado). Al centro se le descuenta el eje mayor (hasta 0,5 m) para que una
   gaussiana grande que invade el pasillo también salga. Vistas desde dentro, esas gaussianas son las astillas gigantes.
2) Flotantes alargados: quita las gaussianas con eje mayor / eje mediano > RAZON, eje mayor > LARGO m y opacidad < OPMAX.
uso: limpiar_escena.py <entrada.ply> <track.json> <corredor_m> <salida.ply> [margen=0.25] [razon=8] [largo=0.15] [opmax=0.6]
     (razon=0 desactiva el filtro 2; margen<0 desactiva el 1)"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

ENT, TRACK, CORR, SAL = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
MARGEN = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
RAZON = float(sys.argv[6]) if len(sys.argv) > 6 else 8.0
LARGO = float(sys.argv[7]) if len(sys.argv) > 7 else 0.15
OPMAX = float(sys.argv[8]) if len(sys.argv) > 8 else 0.6
# alturas del volumen de la cabeza sobre el trazado (el trazado va 0,6 m sobre el suelo)
BAJA = float(sys.argv[9]) if len(sys.argv) > 9 else 0.30
ALTA = float(sys.argv[10]) if len(sys.argv) > 10 else 1.30

g = splat.leer(ENT)
n0 = len(g["xyz"])
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.05), L, w[:, k]) for k in range(3)]].T
TT = cKDTree(den[:, [0, 2]])
es = np.sort(np.exp(g["escala"]), axis=1)[:, ::-1]
op = splat.sigmoide(g["opacidad"].ravel())
quitar = np.zeros(n0, bool)

if MARGEN >= 0:
    # el trazado puede volver sobre si mismo: se miran los 8 puntos mas cercanos en planta y vale cualquiera
    dist, idx = TT.query(g["xyz"][:, [0, 2]], k=8)
    alcance = np.minimum(es[:, 0], 0.5)
    sobre = g["xyz"][:, 1][:, None] - den[idx, 1]             # altura sobre el trazado
    dentro = ((dist - alcance[:, None]) < CORR + MARGEN) & (sobre + alcance[:, None] > BAJA) & (sobre - alcance[:, None] < ALTA)
    pasillo = dentro.any(axis=1)
    quitar |= pasillo
    print("pasillo: %d gaussianas dentro del volumen de la cabeza (%.2f %%)" % (pasillo.sum(), 100 * pasillo.mean()))
if RAZON > 0:
    flot = (es[:, 0] / np.maximum(es[:, 1], 1e-7) > RAZON) & (es[:, 0] > LARGO) & (op < OPMAX)
    quitar |= flot
    print("flotantes alargados: %d (%.2f %%)" % (flot.sum(), 100 * flot.mean()))
h = {k: v[~quitar] for k, v in g.items()}
splat.escribir(SAL, h)
print("quedan %d de %d (se quitaron %d, %.2f %%)" % (len(h["xyz"]), n0, quitar.sum(), 100 * quitar.mean()))
