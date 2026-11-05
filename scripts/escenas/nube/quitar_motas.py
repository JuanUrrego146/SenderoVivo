"""Quita las motas lejanas: gaussianas sueltas en el campo lejano (entre CERCA y 900 m del centro del trazado, sin
tocar la cúpula de cielo de Luma, que está más allá), con eje mayor < TAM_MAX m y menos de MIN_VECINOS vecinas
opacas dentro de un radio que crece con la distancia (r = max(0,5 m, FRAC * distancia)). Una mota a 180 m vista
contra el cielo es un punto oscuro suelto; el paisaje real (ciudad, montañas, bosque) es denso y no se toca.
uso: quitar_motas.py <entrada.ply> <track.json> <salida.ply> [cerca=40] [frac=0.03] [min_vecinos=4] [tam_max=1.0]"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

ENT, TRACK, SAL = sys.argv[1:4]
CERCA = float(sys.argv[4]) if len(sys.argv) > 4 else 40.0
FRAC = float(sys.argv[5]) if len(sys.argv) > 5 else 0.03
MINV = int(sys.argv[6]) if len(sys.argv) > 6 else 4
TAM = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
g = splat.leer(ENT)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
c = w.mean(0)
d = np.linalg.norm(g["xyz"] - c, axis=1)
op = splat.sigmoide(g["opacidad"].ravel())
tam = np.exp(g["escala"]).max(1)
lejos = (d > CERCA) & (d < 900)
opacas = np.where(op > 0.3)[0]
T = cKDTree(g["xyz"][opacas])
cand = np.where(lejos & (tam < TAM))[0]
radios = np.maximum(0.5, FRAC * d[cand])
vec = np.array([len(x) for x in T.query_ball_point(g["xyz"][cand], radios, workers=-1)])
quitar = np.zeros(len(d), bool)
quitar[cand[vec < MINV]] = True
print("campo lejano: %d gaussianas; candidatas pequeñas: %d; motas sueltas quitadas: %d (%.2f %% de la escena)" % (
    lejos.sum(), len(cand), quitar.sum(), 100 * quitar.mean()))
splat.escribir(SAL, {k: v[~quitar] for k, v in g.items()})
print("escrito", SAL)
