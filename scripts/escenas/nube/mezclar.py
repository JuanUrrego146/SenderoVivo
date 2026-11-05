"""Mezcla dos escenas encajadas de la misma zona: la cercana (Polycam, más nítida de cerca) hasta un radio
del camino y la lejana (Luma, mejor de lejos) desde ahí, con una franja de transición donde cada
gaussiana sale de una u otra al azar en proporción a la distancia (sin corte de golpe).
Antes iguala el color de la cercana a la lejana: media y dispersión por canal de las gaussianas opacas
a menos de 6 m del camino, que es la misma zona en las dos (tambien escala los armónicos de orden 1-3).
uso: mezclar.py <cercana.ply> <lejana.ply> <track.json> <radio_m> <franja_m> <salida.ply>"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

CER, LEJ, TRACK, RADIO, FRANJA, OUT = sys.argv[1:7]
RADIO, FRANJA = float(RADIO), float(FRANJA)
C0 = 0.28209479177387814
ce = splat.leer(CER); le = splat.leer(LEJ)
w = np.array([[p['x'], p['y'], p['z']] for p in json.load(open(TRACK))['sceneWaypoints']])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
TT = cKDTree(den[:, [0, 2]])
dce = TT.query(ce['xyz'][:, [0, 2]])[0]; dle = TT.query(le['xyz'][:, [0, 2]])[0]

# color: iguala la cercana a la lejana en la zona comun
def stats(g, d):
    m = (splat.sigmoide(g['opacidad'].ravel()) > 0.5) & (d < 6)
    rgb = 0.5 + C0 * g['dc'][m]
    return rgb.mean(0), rgb.std(0)
mc, sc = stats(ce, dce); ml, sl = stats(le, dle)
k = sl / sc
print('color cercana media %s disp %s -> lejana media %s disp %s' % (mc.round(3), sc.round(3), ml.round(3), sl.round(3)))
rgb = 0.5 + C0 * ce['dc']
ce['dc'] = (((rgb - mc) * k + ml) - 0.5) / C0
nr = ce['rest'].shape[1] // 3
ce['rest'] = (ce['rest'].reshape(-1, 3, nr) * k[None, :, None]).reshape(-1, 3 * nr)

# armónicos: misma cantidad de coeficientes en las dos
nmax = max(ce['rest'].shape[1], le['rest'].shape[1])
for g in (ce, le):
    if g['rest'].shape[1] < nmax:
        n0 = g['rest'].shape[1] // 3; n1 = nmax // 3
        r = np.zeros((len(g['rest']), 3, n1), np.float32); r[:, :, :n0] = g['rest'].reshape(-1, 3, n0)
        g['rest'] = r.reshape(-1, nmax)

# reparto por distancia al camino, con franja de transición
rng = np.random.default_rng(7)
def p_cercana(d):
    return np.clip((RADIO + FRANJA / 2 - d) / FRANJA, 0, 1)
quedan_ce = rng.random(len(dce)) < p_cercana(dce)
quedan_le = rng.random(len(dle)) >= p_cercana(dle)
h = {key: np.concatenate([ce[key][quedan_ce], le[key][quedan_le]]).astype(np.float32) for key in ce}
print('cercana %d de %d | lejana %d de %d | total %d' % (quedan_ce.sum(), len(dce), quedan_le.sum(), len(dle), len(h['xyz'])))
splat.escribir(OUT, h)
print('escrito', OUT)
