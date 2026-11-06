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

ENT, TRACK, SAL = sys.argv[1], sys.argv[2], sys.argv[4]
# corredor: un radio fijo en metros, o "perfil" para usar corridorLeft / corridorRight del track (un valor por punto)
PERFIL = sys.argv[3] == "perfil"
CORR = 0.0 if PERFIL else float(sys.argv[3])
MARGEN = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
RAZON = float(sys.argv[6]) if len(sys.argv) > 6 else 8.0
LARGO = float(sys.argv[7]) if len(sys.argv) > 7 else 0.15
OPMAX = float(sys.argv[8]) if len(sys.argv) > 8 else 0.6
# alturas del volumen de la cabeza sobre el trazado (el trazado va 0,6 m sobre el suelo)
BAJA = float(sys.argv[9]) if len(sys.argv) > 9 else 0.30
ALTA = float(sys.argv[10]) if len(sys.argv) > 10 else 1.30

g = splat.leer(ENT)
n0 = len(g["xyz"])
cfg = json.load(open(TRACK, encoding="utf-8"))
w = np.array([[p["x"], p["y"], p["z"]] for p in cfg["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
dsd = np.arange(0, L[-1], 0.05)
den = np.c_[[np.interp(dsd, L, w[:, k]) for k in range(3)]].T
# tangente horizontal y perpendicular derecha (convención de TourEngine) en cada punto denso
tan = np.gradient(den, axis=0); tan[:, 1] = 0; tan /= np.linalg.norm(tan, axis=1, keepdims=True)
nder = np.c_[-tan[:, 2], np.zeros(len(tan)), tan[:, 0]]
if PERFIL:
    izq_d = np.interp(dsd, L, np.array(cfg["corridorLeft"], float))
    der_d = np.interp(dsd, L, np.array(cfg["corridorRight"], float))
else:
    izq_d = der_d = np.full(len(dsd), CORR)
TT = cKDTree(den[:, [0, 2]])
es = np.sort(np.exp(g["escala"]), axis=1)[:, ::-1]
op = splat.sigmoide(g["opacidad"].ravel())
quitar = np.zeros(n0, bool)

if MARGEN >= 0:
    # el trazado puede volver sobre si mismo: se miran los 8 puntos mas cercanos en planta y vale cualquiera
    dist, idx = TT.query(g["xyz"][:, [0, 2]], k=8)
    alcance = np.minimum(es[:, 0], 0.5)
    sobre = g["xyz"][:, 1][:, None] - den[idx, 1]             # altura sobre el trazado
    # desplazamiento lateral con signo respecto a cada punto cercano: positivo a la derecha
    rel = g["xyz"][:, None, :] - den[idx]
    lat = (rel * nder[idx]).sum(-1)
    tope = np.where(lat >= 0, der_d[idx], izq_d[idx]) + MARGEN
    dentro = ((np.abs(lat) - alcance[:, None]) < tope) & ((dist - alcance[:, None]) < tope) & \
             (sobre + alcance[:, None] > BAJA) & (sobre - alcance[:, None] < ALTA)
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
