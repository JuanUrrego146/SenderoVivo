"""Marco propio (metros, +Y arriba) para un modelo de COLMAP de un tramo, sin anclas contra otra escena.

uso: t1_marco_propio.py <sparse> <toma_de_referencia> <curva_referencia.json> <salida_dir>

Las anclas contra Luma del Tramo 1 (anclas.json) son coherentes entre si pero traen una escala cuatro veces mayor que
la real (darian una toma de 354 m recorrida a 2,2 m/s), asi que no sirven. Aqui el marco sale del propio modelo:
- arriba: la direccion mas perpendicular a los ejes X de todas las camaras (el celular se lleva derecho);
- escala: el largo suavizado de la toma de referencia se iguala al de la curva de referencia (la trayectoria completa
  del video de Luma, que sigue la misma captura); se informa la altura de las camaras sobre el piso que resulta, como
  control independiente (debe dar alturas de una persona llevando el celular);
- orientacion y origen: el recorrido corre hacia -X y su punto inicial cae en el inicio de la curva de referencia, de
  modo que la escena queda cerca del marco de la de Luma (no encima: sirve para orientar, no para mezclar).
Escribe sim3.txt (s qw qx qy qz tx ty tz, para colmap model_transformer) y transformacion.json.
"""
import sys, os, json, numpy as np
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, TOMA, CURVA, OUT = sys.argv[1:5]
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
xyz, rgb, err, vis = colmapbin.leer_puntos(os.path.join(SP, "points3D.bin"))
X = np.array([v["R"][0] for v in ims.values()]); Yd = np.array([v["R"][1] for v in ims.values()])
up = np.linalg.eigh(X.T @ X)[1][:, 0]
if (Yd @ up).mean() > 0:
    up = -up
cc = sorted((v for v in ims.values() if v["name"].startswith(TOMA + "/")), key=lambda v: v["name"])
C = np.array([v["centro"] for v in cc])


def suave(P, n=9):
    k = np.ones(n) / n; Q = np.c_[[np.convolve(np.pad(P[:, i], n // 2, mode="edge"), k, mode="valid") for i in range(3)]].T
    return Q


Cs = suave(C)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(CURVA, encoding="utf-8"))["sceneWaypoints"]])
Lref = np.linalg.norm(np.diff(w, axis=0), axis=1).sum(); Lmod = np.linalg.norm(np.diff(Cs, axis=0), axis=1).sum()
s = Lref / Lmod
# el sentido de la toma debe ser el de la curva (de abajo hacia arriba)
if (Cs[-1] - Cs[0]) @ up < 0:
    Cs = Cs[::-1]
h = (Cs[-1] - Cs[0]); h = h - (h @ up) * up; h /= np.linalg.norm(h)
ex = -h; ey = up; ez = np.cross(ex, ey); R = np.array([ex, ey, ez])
t = w[0] - s * R @ Cs[0]
T = lambda P: s * P @ R.T + t
# controles
Pt = T(xyz); Ct = T(np.array([v["centro"] for v in ims.values()])); arbol = cKDTree(Pt[:, [0, 2]])
alt = {}
for v, c in zip(ims.values(), Ct):
    j = arbol.query_ball_point(c[[0, 2]], 0.6)
    if len(j) > 30:
        dh = Pt[j, 1] - c[1]; dh = dh[dh < 0]
        if len(dh) > 15:
            alt.setdefault(v["name"].split("/")[0], []).append(-np.percentile(dh, 15))
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.05), L, w[:, k]) for k in range(3)]].T
d = cKDTree(den).query(T(Cs))[0]
os.makedirs(OUT, exist_ok=True)
x, y, z, qw = Rotation.from_matrix(R).as_quat()
open(os.path.join(OUT, "sim3.txt"), "w").write("%.15g %.17g %.17g %.17g %.17g %.15g %.15g %.15g\n" % (s, qw, x, y, z, t[0], t[1], t[2]))
json.dump({"s": float(s), "R": R.tolist(), "t": t.tolist(), "metodo": "marco propio: vertical por los ejes X de las camaras y largo igualado a la curva de referencia"},
          open(os.path.join(OUT, "transformacion.json"), "w"), indent=1)
Pf = T(Cs)
print("escala %.3f m por unidad (largo de %s: %.2f u suavizado = %.1f m de la curva de referencia); sube %.1f m (la curva %.1f m)"
      % (s, TOMA, Lmod, Lref, Pf[-1, 1] - Pf[0, 1], w[-1, 1] - w[0, 1]))
print("altura de las camaras sobre el piso por toma: " + "; ".join("%s %.2f m" % (k.replace("t1_", ""), np.median(a)) for k, a in sorted(alt.items())))
print("distancia de la toma de referencia a la curva tras el marco: mediana %.2f m, p90 %.2f m, maxima %.2f m; final de la toma en %s (la curva termina en %s)"
      % (np.median(d), np.percentile(d, 90), d.max(), Pf[-1].round(1), w[-1].round(1)))
