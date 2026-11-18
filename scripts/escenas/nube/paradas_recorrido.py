"""Paradas del recorrido: los puntos del trazado donde la escena se ve mejor, para la navegacion por puntos de la app.

La app mueve al visitante por el trazado y lo deja quieto solo en las paradas (TourEngine, campo `stops` del trazado).
Entre una parada y otra la camara pasa en movimiento, que disimula lo borroso; donde se queda quieta es donde se mira
con calma, asi que las paradas se eligen midiendo.
Metodo: cada PASO m del trazado se dibuja la escena en primera persona (ojos a OJOS m sobre el trazado, campo vertical
de 58 grados y 16:9 como la app, mirando por el camino con 5 grados de picado; con ambos=1 tambien hacia atras) y se
mide la nitidez (varianza del laplaciano) y la parte traslucida de la vista (alfa menor a 0,9). La calidad de cada
punto es el logaritmo de la nitidez menos una multa por lo traslucido, pasada a puntaje robusto (mediana y rango
intercuartil del propio tramo). Las paradas son el subconjunto que maximiza la suma de ese puntaje con separaciones
entre SEPMIN y SEPMAX m, e incluye siempre el inicio y el final del trazado (programacion dinamica).
uso: paradas_recorrido.py <track.json> <escena.ply> <salida.json> [paso=0.5] [sepmin=2.2] [sepmax=4.2] [ojos=0.85] [ambos=0]
     [fondo360=<equirectangular sin voltear>] [hoja=<archivo.jpg> para ver las paradas elegidas]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

TRACK, PLY, OUT = sys.argv[1:4]
opc = dict(a.split("=", 1) for a in sys.argv[4:])
PASO = float(opc.get("paso", 0.5)); SEPMIN = float(opc.get("sepmin", 2.2)); SEPMAX = float(opc.get("sepmax", 4.2))
AMBOS = opc.get("ambos", "0") == "1"
W, H = 640, 360
f = 0.5 * H / np.tan(np.radians(58.0 / 2))
tr = json.load(open(TRACK, encoding="utf-8"))
OJOS = float(opc.get("ojos", tr.get("eyeHeight", 0.85)))          # la altura de ojos del propio trazado
w = np.array([[p["x"], p["y"], p["z"]] for p in tr["sceneWaypoints"]], np.float64)
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
ds = np.r_[np.arange(0, L[-1] - 1e-6, PASO), L[-1]]
pos = np.c_[[np.interp(ds, L, w[:, k]) for k in range(3)]].T


def direccion(d):
    """direccion horizontal del camino en d, promediada en una ventana de 1,5 m para no saltar en los vertices"""
    a = np.array([np.interp(max(d - 0.75, 0), L, w[:, k]) for k in range(3)])
    b = np.array([np.interp(min(d + 0.75, L[-1]), L, w[:, k]) for k in range(3)])
    v = b - a; v[1] = 0
    return v / max(np.linalg.norm(v), 1e-9)


def pose(c, fw, picado=5.0):
    der = np.cross(fw, [0, 1.0, 0]); der /= np.linalg.norm(der)
    fw = np.cos(np.radians(picado)) * fw - np.sin(np.radians(picado)) * np.array([0, 1.0, 0])
    Rw = np.stack([der, np.cross(fw, der), fw])
    return Rw, -Rw @ c


FONDO_IM = cv2.imread(opc["fondo360"]) if opc.get("fondo360") else None
if FONDO_IM is not None and FONDO_IM.shape[1] > 4096:
    FONDO_IM = cv2.resize(FONDO_IM, (4096, 2048), interpolation=cv2.INTER_AREA)


def fondo_de(Rw):
    xs, ys = np.meshgrid((np.arange(W) + 0.5 - W / 2) / f, (np.arange(H) + 0.5 - H / 2) / f)
    d = np.stack([xs, ys, np.ones_like(xs)], -1) @ Rw
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    u = (0.5 + np.arctan2(d[..., 0], d[..., 2]) / (2 * np.pi)) * FONDO_IM.shape[1] - 0.5
    v = (0.5 - np.arcsin(np.clip(d[..., 1], -1, 1)) / np.pi) * FONDO_IM.shape[0] - 0.5
    return cv2.remap(FONDO_IM, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)[..., ::-1].astype(np.float32) / 255


g = splat.leer(PLY)
o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1)
g = {k: v[ok] for k, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12)
G = render.a_gpu(g)


def vista(c, fw):
    Rw, t = pose(c, fw)
    img, alfa, _ = render.render(G, Rw, t, f, f, W / 2, H / 2, W, H, fondo=(0.5, 0.5, 0.5))
    if FONDO_IM is not None:
        img, alfa, _ = render.render(G, Rw, t, f, f, W / 2, H / 2, W, H, fondo=(0, 0, 0))
        img = np.clip(img + (1 - alfa[..., None]) * fondo_de(Rw), 0, 1)
    im = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8)
    nit = cv2.Laplacian(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    return im, nit, float((np.asarray(alfa) < 0.9).mean())


nit, tras, ims = [], [], []
for d, p in zip(ds, pos):
    fw = direccion(d); c = p + [0, OJOS, 0]
    im, n1, t1 = vista(c, fw)
    if AMBOS:
        _, n2, t2 = vista(c, -fw); n1 = np.sqrt(n1 * n2); t1 = 0.5 * (t1 + t2)
    nit.append(n1); tras.append(t1); ims.append(im)
nit, tras = np.array(nit), np.array(tras)
q = np.log(np.maximum(nit, 1.0)) - 2.0 * tras
med = np.median(q); iqr = max(np.subtract(*np.percentile(q, [75, 25])), 1e-6)
z = np.clip((q - med) / iqr, -3, 3)
# programacion dinamica: mejor suma de puntajes llegando a cada muestra, con separaciones permitidas
n = len(ds); mejor = np.full(n, -np.inf); ant = np.full(n, -1); mejor[0] = z[0]
for i in range(1, n):
    js = np.where((ds[i] - ds[:i] >= SEPMIN - 1e-9) & (ds[i] - ds[:i] <= SEPMAX + 1e-9) & np.isfinite(mejor[:i]))[0]
    if len(js):
        j = js[np.argmax(mejor[js])]; mejor[i] = mejor[j] + z[i]; ant[i] = j
if not np.isfinite(mejor[-1]):          # tramo mas corto que SEPMIN: solo los extremos
    sel = [0, n - 1]
else:
    sel = []; i = n - 1
    while i >= 0:
        sel.append(i); i = ant[i]
    sel = sel[::-1]
paradas = [round(float(ds[i]), 2) for i in sel]
sep = np.diff(paradas)
json.dump({"paradas": paradas, "paso": PASO, "distancia": [round(float(x), 2) for x in ds], "nitidez": [round(float(x)) for x in nit],
           "traslucido": [round(float(x), 4) for x in tras]}, open(OUT, "w"), indent=0)
print("trazado de %.1f m; %d muestras cada %.2f m; nitidez mediana %.0f (p10 %.0f, p90 %.0f); traslucido medio %.1f %%"
      % (L[-1], n, PASO, np.median(nit), *np.percentile(nit, [10, 90]), 100 * tras.mean()))
print("paradas %d (separacion %.1f a %.1f m, media %.1f); nitidez mediana en las paradas %.0f contra %.0f del resto; la peor parada %.0f"
      % (len(paradas), sep.min() if len(sep) else 0, sep.max() if len(sep) else 0, sep.mean() if len(sep) else 0, np.median(nit[sel]),
         np.median(np.delete(nit, sel)) if n > len(sel) else 0, nit[sel].min()))
print("paradas:", " ".join("%.1f" % x for x in paradas))
if opc.get("hoja"):
    k = [sel[int(a)] for a in np.linspace(0, len(sel) - 1, min(12, len(sel)))]
    cel = []
    for i in k:
        im = ims[i].copy(); cv2.putText(im, "d %.1f nitidez %.0f" % (ds[i], nit[i]), (8, 22), 0, 0.6, (0, 255, 255), 2); cel.append(im)
    while len(cel) % 3: cel.append(np.zeros_like(cel[0]))
    cv2.imwrite(opc["hoja"], np.vstack([np.hstack(cel[a:a + 3]) for a in range(0, len(cel), 3)]), [cv2.IMWRITE_JPEG_QUALITY, 84])
