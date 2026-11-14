"""Fondo sencillo de dos tonos para un tramo sin panoramicas ubicadas: cielo arriba y tono de suelo abajo.

uso: fondo_tramo.py <escena.ply> <track.json> <cielo_media.json> <salida.jpg> [horizonte_grados=4]

En los tramos entrenados con un solo sentido quedan huecos (piso quemado por el sol que el entrenamiento tomo por
cielo, zonas fuera de lo grabado). Con un fondo de color de cielo esos huecos se ven como parches claros en el piso.
Este fondo (equirectangular sin voltear, para domoUrl) pone el color medio del cielo de las fotos por encima del
horizonte y, por debajo, el color mediano del piso de la propia escena (gaussianas opacas a menos de 1,5 m del trazado
en planta y entre 0,3 y 1,2 m por debajo de el), con una transicion suave de unos 8 grados.
"""
import sys, os, json, numpy as np, cv2
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat
PLY, TRACK, CIELO, OUT = sys.argv[1:5]
HOR = float(sys.argv[5]) if len(sys.argv) > 5 else 4.0
g = splat.leer(PLY)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK, encoding="utf-8"))["sceneWaypoints"]])
d, j = cKDTree(w[:, [0, 2]]).query(g["xyz"][:, [0, 2]]); alt = g["xyz"][:, 1] - w[j, 1]
op = 1 / (1 + np.exp(-g["opacidad"].ravel()))
m = (d < 1.5) & (alt > -1.2) & (alt < -0.3) & (op > 0.3)
rgb = (0.5 + 0.28209479 * g["dc"][m]).clip(0, 1) * 255
suelo = np.maximum(np.median(rgb, 0)[::-1] * 0.8, 38.0) if m.sum() > 500 else np.array([70.0, 82.0, 78.0])      # nunca casi negro
cielo = np.array(json.load(open(CIELO))["media_bgr"], np.float32)
H, W = 1024, 2048
lat = (0.5 - (np.arange(H) + 0.5) / H) * 180
t = np.clip((HOR + 4 - lat) / 8.0, 0, 1)[:, None, None]
t = t * t * (3 - 2 * t)
img = np.repeat(cielo[None, None, :] * (1 - t) + suelo[None, None, :] * t, W, axis=1)
cv2.imwrite(OUT, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("piso: %d gaussianas, color BGR %s (oscurecido 20 %%); cielo BGR %s; escrito %s" % (m.sum(), suelo.round(0), cielo.round(0), OUT))
