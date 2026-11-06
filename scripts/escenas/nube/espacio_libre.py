"""Mide el espacio libre a cada lado del trazado a la altura de la cabeza del visitante y lo escribe en el track como
corridorLeft / corridorRight (un valor por punto del trazado, en metros). Con eso el visor no deja meter la cabeza
en los arbustos que invaden el camino, en vez de borrarlos.
Para cada distancia (cada 0,25 m) y cada lado prueba desplazamientos de 0 a TOPE m cada 0,05 m: la cabeza es un
cilindro de radio 0,25 m desde 0,5 m por debajo de los ojos hasta 0,3 m por encima; está chocando si dentro hay
MIN o más gaussianas opacas (alfa > 0,4) de alguna de las escenas. El libre de ese lado es el último desplazamiento
sin choque menos 0,10 m, nunca menos de PISO. El valor de cada punto del trazado es el mínimo de su tramo (desde la
mitad hacia el punto anterior hasta la mitad hacia el siguiente), para ser conservador.
uso: espacio_libre.py <track.json> <salida_track.json> <ojos> <tope> <escena1.ply> [escena2.ply ...]"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

TRACK, OUT, OJOS, TOPE = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
PLYS = sys.argv[5:]
MIN, PISO, RADIO = 4, 0.2, 0.25
cfg = json.load(open(TRACK, encoding="utf-8"))
w = np.array([[p["x"], p["y"], p["z"]] for p in cfg["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
arboles = []
for ply in PLYS:
    g = splat.leer(ply)
    X = g["xyz"][splat.sigmoide(g["opacidad"].ravel()) > 0.4]
    arboles.append((cKDTree(X[:, [0, 2]]), X[:, 1]))
pos = lambda d: np.array([np.interp(d, L, w[:, k]) for k in range(3)])


def choca(p):
    ojo = p[1] + OJOS
    for T, Y in arboles:
        idx = T.query_ball_point([p[0], p[2]], RADIO)
        if idx and np.count_nonzero((Y[idx] > ojo - 0.5) & (Y[idx] < ojo + 0.3)) >= MIN:
            return True
    return False


ds = np.arange(0, L[-1] + 1e-6, 0.25)
izq, der = [], []
for d in ds:
    p = pos(d)
    a, b = pos(max(d - 0.3, 0)), pos(min(d + 0.3, L[-1]))
    t = b - a; t[1] = 0; t /= np.linalg.norm(t)
    n = np.array([-t[2], 0, t[0]])            # derecha del avance (convención de TourEngine)
    libres = []
    for signo in (-1, 1):
        ultimo = -1.0
        for s in np.arange(0, TOPE + 1e-6, 0.05):
            if choca(p + signo * s * n):
                break
            ultimo = s
        libres.append(max(PISO, ultimo - 0.10) if ultimo >= 0 else PISO)
    izq.append(libres[0]); der.append(libres[1])
izq, der = np.array(izq), np.array(der)
cl, cr = [], []
for i in range(len(w)):
    a = (L[i - 1] + L[i]) / 2 if i > 0 else 0
    b = (L[i] + L[i + 1]) / 2 if i < len(w) - 1 else L[-1]
    m = (ds >= a - 1e-6) & (ds <= b + 1e-6)
    cl.append(round(float(izq[m].min()), 2)); cr.append(round(float(der[m].min()), 2))
cfg["corridorLeft"], cfg["corridorRight"] = cl, cr
json.dump(cfg, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("izquierda: min %.2f mediana %.2f max %.2f | derecha: min %.2f mediana %.2f max %.2f" % (
    min(cl), np.median(cl), max(cl), min(cr), np.median(cr), max(cr)))
print("puntos con menos de 0,5 m libres: izquierda %d, derecha %d de %d" % (sum(x < 0.5 for x in cl), sum(x < 0.5 for x in cr), len(cl)))
