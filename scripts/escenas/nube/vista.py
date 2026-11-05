"""Dibuja una vista suelta desde el trazado: distancia d, giro respecto al avance (grados, positivo a la derecha),
picado (grados, negativo = arriba), lateral (m) y alto de ojos.
uso: vista.py <splat.ply> <track.json> <d> <giro> <picado> <salida.png> [ojos=0.85] [lateral=0] [ancho=960] [fondo=magenta|cielo]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

PLY, TRACK = sys.argv[1], sys.argv[2]
D, GIRO, PICADO, OUT = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
OJOS = float(sys.argv[7]) if len(sys.argv) > 7 else 0.85
LAT = float(sys.argv[8]) if len(sys.argv) > 8 else 0.0
W = int(sys.argv[9]) if len(sys.argv) > 9 else 960
FONDO = (1, 0, 1) if (len(sys.argv) <= 10 or sys.argv[10] == "magenta") else (0.82, 0.86, 0.87)
H = W * 2 // 3; f = 0.5 * W / np.tan(np.radians(35))
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
pos = lambda d: np.array([np.interp(d, L, w[:, k]) for k in range(3)])
fw = pos(min(D + 0.3, L[-1])) - pos(max(D - 0.3, 0)); fw[1] = 0; fw /= np.linalg.norm(fw)
lado = np.array([-fw[2], 0, fw[0]])            # derecha del avance (convención de TourEngine)
c = pos(D) + lado * LAT + [0, OJOS, 0]
a = np.radians(GIRO); d = np.cos(a) * fw + np.sin(a) * lado
p = np.radians(PICADO); dd = np.cos(p) * d - np.sin(p) * np.array([0, 1.0, 0])
der = np.cross(dd, [0, 1, 0]); der /= np.linalg.norm(der); abajo = np.cross(dd, der)
Rw = np.stack([der, abajo, dd])
G = render.a_gpu(splat.leer(PLY))
img, alfa, prof = render.render(G, Rw, -Rw @ c, f, f, W / 2, H / 2, W, H, fondo=FONDO)
cv2.imwrite(OUT, (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8))
np.save(OUT + ".prof.npy", prof); np.save(OUT + ".alfa.npy", alfa)
print("listo", OUT, "camara", c.round(2), "direccion", dd.round(2))
