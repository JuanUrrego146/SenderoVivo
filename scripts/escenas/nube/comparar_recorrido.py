"""Compara varias escenas (ya en el marco de la escena) en primera persona sobre el trazado, como las ve el visitante:
ojos a OJOS m sobre el punto del trazado, mirando a lo largo del camino (SENTIDO 1 hacia adelante, -1 hacia atras) con
un picado de PICADO grados y campo de vision vertical de 45 grados (16:9, el de escritorio de la app).
Una fila por punto, una columna por escena, con nitidez (varianza del laplaciano) en cada cuadro.
uso: comparar_recorrido.py <track.json> <n_puntos> <sentido> <picado> <salida.jpg> nombre=ply ... [desde=0 hasta=1]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

TRACK, N, SENTIDO, PICADO, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
args = [a.split("=", 1) for a in sys.argv[6:]]
opc = {k: float(v) for k, v in args if k in ("desde", "hasta", "ojos")}
escenas = [(k, v) for k, v in args if k not in opc]
OJOS = opc.get("ojos", 0.85)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
W, H = 640, 360
f = 0.5 * H / np.tan(np.radians(22.5))
idx = np.linspace(opc.get("desde", 0) * (len(w) - 4), opc.get("hasta", 1) * (len(w) - 4), N).astype(int)
poses = []
for i in idx:
    c = w[i] + [0, OJOS, 0]
    j = min(i + 3, len(w) - 1) if SENTIDO > 0 else max(i - 3, 0)
    fw = w[j] - w[i]; fw[1] = 0; fw /= np.linalg.norm(fw)
    der = np.cross(fw, [0, 1, 0]); der /= np.linalg.norm(der)
    fw = np.cos(np.radians(PICADO)) * fw - np.sin(np.radians(PICADO)) * np.array([0, 1.0, 0])
    abajo = np.cross(fw, der)
    Rw = np.stack([der, abajo, fw])
    poses.append((i, Rw, -Rw @ c))
cols = []
for nombre, ply in escenas:
    g = splat.leer(ply)
    o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1)
    g = {k: v[ok] for k, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12)
    G = render.a_gpu(g)
    col = []
    for i, Rw, t in poses:
        img, _, _ = render.render(G, Rw, t, f, f, W / 2, H / 2, W, H, fondo=(1, 0, 1))
        im = (img[..., ::-1] * 255).astype(np.uint8).copy()
        nit = cv2.Laplacian(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        cv2.putText(im, "%s  punto %d  nitidez %.0f" % (nombre, i, nit), (8, 22), 0, 0.6, (0, 255, 255), 2)
        col.append(im)
    cols.append(col)
    del G
    print(nombre, "listo", flush=True)
cv2.imwrite(OUT, np.vstack([np.hstack([c[k] for c in cols]) for k in range(len(poses))]), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("hoja:", OUT)
