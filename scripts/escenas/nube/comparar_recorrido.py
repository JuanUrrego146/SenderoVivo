"""Compara varias escenas (ya en el marco de la escena) en primera persona sobre el trazado, como las ve el visitante:
ojos a OJOS m sobre el punto del trazado, mirando a lo largo del camino (SENTIDO 1 hacia adelante, -1 hacia atras) con
un picado de PICADO grados y campo de vision vertical de 45 grados (16:9, el de escritorio de la app).
Una fila por punto, una columna por escena, con nitidez (varianza del laplaciano) en cada cuadro.
Con fondo360=<equirectangular.jpg> (el de domo_lejos.py, sin voltear) lo que las escenas dejan transparente muestra
ese fondo en vez de magenta, como en la app.
uso: comparar_recorrido.py <track.json> <n_puntos> <sentido> <picado> <salida.jpg> nombre=ply ... [desde=0 hasta=1 ojos=0.85 giro=0] [fondo360=jpg]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

TRACK, N, SENTIDO, PICADO, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
args = [a.split("=", 1) for a in sys.argv[6:]]
opc = {k: float(v) for k, v in args if k in ("desde", "hasta", "ojos", "giro", "fov")}
FONDO = next((v for k, v in args if k == "fondo360"), None)      # equirectangular sin voltear (domo_lejos.py) detras de las escenas
escenas = [(k, v) for k, v in args if k not in opc and k != "fondo360"]
OJOS = opc.get("ojos", 0.85)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
W, H = 640, 360
f = 0.5 * H / np.tan(np.radians(opc.get("fov", 45.0) / 2))      # fov=58 es el campo vertical de la app en horizontal
idx = np.linspace(opc.get("desde", 0) * (len(w) - 4), opc.get("hasta", 1) * (len(w) - 4), N).astype(int)
poses = []
for i in idx:
    c = w[i] + [0, OJOS, 0]
    j = min(i + 3, len(w) - 1) if SENTIDO > 0 else max(i - 3, 0)
    fw = w[j] - w[i]; fw[1] = 0; fw /= np.linalg.norm(fw)
    der = np.cross(fw, [0, 1, 0]); der /= np.linalg.norm(der)
    if opc.get("giro"):                        # giro=90 mira a la derecha del camino, giro=-90 a la izquierda
        gr = np.radians(opc["giro"])
        fw, der = np.cos(gr) * fw + np.sin(gr) * der, np.cos(gr) * der - np.sin(gr) * fw
    fw = np.cos(np.radians(PICADO)) * fw - np.sin(np.radians(PICADO)) * np.array([0, 1.0, 0])
    abajo = np.cross(fw, der)
    Rw = np.stack([der, abajo, fw])
    poses.append((i, Rw, -Rw @ c))
cols = []
FONDO_IM = cv2.imread(FONDO) if FONDO else None
if FONDO_IM is not None and FONDO_IM.shape[1] > 4096:
    FONDO_IM = cv2.resize(FONDO_IM, (4096, 2048), interpolation=cv2.INTER_AREA)


def fondo_de(Rw):
    """color del fondo 360 para cada pixel de la vista (Rw: mundo -> camara)"""
    xs, ys = np.meshgrid((np.arange(W) + 0.5 - W / 2) / f, (np.arange(H) + 0.5 - H / 2) / f)
    d = np.stack([xs, ys, np.ones_like(xs)], -1) @ Rw            # direccion en el mundo
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    u = (0.5 + np.arctan2(d[..., 0], d[..., 2]) / (2 * np.pi)) * FONDO_IM.shape[1] - 0.5
    v = (0.5 - np.arcsin(np.clip(d[..., 1], -1, 1)) / np.pi) * FONDO_IM.shape[0] - 0.5
    return cv2.remap(FONDO_IM, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)[..., ::-1].astype(np.float32) / 255


for nombre, ply in escenas:
    g = splat.leer(ply)
    o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1)
    g = {k: v[ok] for k, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12)
    G = render.a_gpu(g)
    col = []; nits = []; sinc = []
    for i, Rw, t in poses:
        if FONDO_IM is None:
            img, alfa, _ = render.render(G, Rw, t, f, f, W / 2, H / 2, W, H, fondo=(1, 0, 1))
        else:
            img, alfa, _ = render.render(G, Rw, t, f, f, W / 2, H / 2, W, H, fondo=(0, 0, 0))
            img = np.clip(img + (1 - alfa[..., None]) * fondo_de(Rw), 0, 1)
        # traslucido en la mitad de abajo de la vista (el piso y lo cercano): pixeles con alfa menor a 0,9
        sinc.append(100 * float((np.asarray(alfa)[H // 2:] < 0.9).mean()))
        im = (img[..., ::-1] * 255).astype(np.uint8).copy()
        nit = cv2.Laplacian(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        cv2.putText(im, "%s  punto %d  nitidez %.0f" % (nombre, i, nit), (8, 22), 0, 0.6, (0, 255, 255), 2)
        col.append(im); nits.append(nit)
    cols.append(col)
    del G
    print(nombre, "listo; nitidez por punto:", " ".join("%.0f" % x for x in nits), "| mediana %.0f" % np.median(nits), flush=True)
    print(nombre, "mitad de abajo con alfa < 0,9 (%):", " ".join("%.1f" % x for x in sinc), "| media %.1f" % np.mean(sinc), flush=True)
cv2.imwrite(OUT, np.vstack([np.hstack([c[k] for c in cols]) for k in range(len(poses))]), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("hoja:", OUT)
