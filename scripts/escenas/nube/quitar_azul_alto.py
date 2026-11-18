"""Quita de una escena las manchas azul oscuro que quedan pegadas a las copas contra el cielo.

Brush entrena con el cielo transparente y un peso bajo para la transparencia (--match-alpha-weight 0,1): sobre un
pixel de cielo le da casi igual pintar algo oscuro que no pintar nada, y junto a las copas deja gaussianas oscuras y
azuladas (toman el tono del cielo de las fotos). El tallado por cielo quita las que caen sobre todo en el cielo de
las fotos; las que quedan a medias entre copa y cielo sobreviven y, vistas desde abajo, son manchones azules.
Regla (todas las condiciones a la vez): la gaussiana esta a mas de ELEV grados sobre el horizonte vista desde el punto
mas cercano de la linea de los ojos del trazado, es azulada (el azul supera al rojo en DR y al verde en DG) y es
oscura (luminancia menor a LUM). El follaje es verde o pardo y no cumple lo del azul; la carpa azul del claro queda
por debajo de ELEV y ademas es clara. Si se da <pesos.npz> (de tallar_cielo_360.py) tambien salen las oscuras que
ponen FRAC o mas de lo que pintan sobre el cielo de las vistas 360.
uso: quitar_azul_alto.py <entrada.ply> <track.json> <salida.ply> [elev=18] [lum=0.38] [dr=0.03] [dg=0.015] [pesos.npz] [frac=0.3]"""
import sys, json, numpy as np
sys.path.insert(0, __import__("os").path.dirname(__file__))
import splat
from scipy.spatial import cKDTree

IN, TRACK, OUT = sys.argv[1:4]
num = lambda i, d: float(sys.argv[i]) if len(sys.argv) > i else d
ELEV, LUM, DR, DG = num(4, 18.0), num(5, 0.38), num(6, 0.03), num(7, 0.015)
PESOS = sys.argv[8] if len(sys.argv) > 8 and sys.argv[8] not in ("", "-") else None
FRAC = num(9, 0.3)
g = splat.leer(IN)
t = json.load(open(TRACK, encoding="utf-8"))
w = np.array([[q["x"], q["y"], q["z"]] for q in t["sceneWaypoints"]]); L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ojos = np.c_[[np.interp(np.arange(0, L[-1], 0.25), L, w[:, k]) for k in range(3)]].T + [0, t.get("eyeHeight", 0.85), 0]
_, j = cKDTree(ojos).query(g["xyz"], workers=4)
dv = g["xyz"] - ojos[j]
elev = np.degrees(np.arctan2(dv[:, 1], np.maximum(np.hypot(dv[:, 0], dv[:, 2]), 1e-6)))
rgb = (0.5 + 0.28209479 * g["dc"]).clip(0, 1); lum = rgb @ np.array([0.299, 0.587, 0.114])
azul = (rgb[:, 2] > rgb[:, 0] + DR) & (rgb[:, 2] > rgb[:, 1] + DG)
fuera = (elev >= ELEV) & azul & (lum < LUM)
n1 = int(fuera.sum())
if PESOS:
    p = np.load(PESOS); frac = p["wm"] / np.maximum(p["wt"], 1e-6)
    extra = (p["wt"] > 0.5) & (frac >= FRAC) & (lum < 0.35) & (elev >= 10) & ~fuera
    fuera |= extra
# Motas sueltas en lo alto: lo que queda aislado sobre ELEV + 4 grados (menos de AISN vecinas a AISR unidades, contando
# solo lo que no se quito) no es copa, que es densa, sino una gaussiana que flota contra el cielo. Variables AISR, AISN.
import os
AISR = float(os.environ.get("AISR", 0)); AISN = int(os.environ.get("AISN", 10))
n2 = 0
if AISR > 0:
    viva = ~fuera
    arbol = cKDTree(g["xyz"][viva])
    cand = np.where(viva & (elev >= ELEV + 4))[0]
    cuenta = arbol.query_ball_point(g["xyz"][cand], AISR, return_length=True, workers=4) - 1
    sola = cand[cuenta < AISN]
    fuera[sola] = True; n2 = len(sola)
splat.escribir(OUT, {k: a[~fuera] for k, a in g.items()})
alto = elev >= ELEV
print("motas aisladas en lo alto (menos de %d vecinas a %.2f): %d" % (AISN, AISR, n2))
print("gaussianas %d; a mas de %.0f grados %d; azul oscuro en lo alto %d (%.1f %% de lo alto); oscuras sobre el cielo de las 360 %d; quedan %d -> %s"
      % (len(lum), ELEV, alto.sum(), n1, 100.0 * n1 / max(alto.sum(), 1), int(fuera.sum()) - n1 - n2, int((~fuera).sum()), OUT))
