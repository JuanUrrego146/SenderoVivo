"""Exposicion relativa de cada foto (por canal) a partir de las correspondencias verificadas de COLMAP, para igualar
las tomas antes de entrenar. El video del celular ajusta la exposicion y el balance solo: entre tomas de un mismo tramo
hay diferencias de hasta 2,7 veces, y Brush, que no modela la exposicion por foto, promedia colores distintos y deja
niebla y borron.
Metodo: cada par de fotos con geometria verificada (tabla two_view_geometries) comparte puntos de la misma superficie.
Se muestrea el color de cada foto en sus puntos (foto decodificada a 1/4 o 1/2, suavizada 3x3, en espacio lineal con
gamma 2,2; se descartan muestras casi negras o quemadas) y por par y canal se toma la MEDIANA del cociente
log(color_i) - log(color_j) = log(e_i) - log(e_j). Con todos los pares se resuelve por minimos cuadrados ponderados
(peso raiz del numero de muestras, tres vueltas con perdida de Huber de 0,1) la exposicion e de cada foto; la media
geometrica de las fotos de video queda en 1. Las vistas 360 entran como nodos (unen la ida con la vuelta) pero no fijan
la escala. Dentro de cada toma la serie se suaviza (mediana de 5 y gaussiana de 1,5 cuadros): la exposicion del video
cambia de forma continua. Corregir = dividir la foto, en lineal, por su e.
Copia para el Tramo 2 (t2_ganancias.py) con tres cambios: lee las fotos YA reducidas del conjunto base (ds/base/images,
1920 o 1280 de ancho, en SSD) en lugar de los cuadros 4K del disco mecanico, escalando las coordenadas de los rasgos
por (ancho de la foto leida / ancho de la camara en la base); no mete las vistas 360 (en este tramo la ida y la vuelta
ya estan unidas por pares directos de piso y dosel); y decodifica con 6 hilos.
uso: t2_ganancias.py <db> <images_del_conjunto_base> <salida.json> <lista.txt>"""
import sys, os, re, json, sqlite3, numpy as np, cv2
from collections import defaultdict
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import lsqr
from scipy.sparse.csgraph import connected_components
from scipy.ndimage import median_filter, gaussian_filter1d

DB, IMS, OUT = sys.argv[1:4]
LISTA = set(l.strip() for l in open(sys.argv[4]) if l.strip()) if len(sys.argv) > 4 else None
con = sqlite3.connect("file:" + DB + "?mode=ro", uri=True)
nombre = {i: n for i, n in con.execute("select image_id, name from images")}
if LISTA is not None:
    nombre = {i: n for i, n in nombre.items() if n in LISTA}
nombre = {i: n for i, n in nombre.items() if os.path.exists(os.path.join(IMS, n))}
ancho_cam = {i: w for i, w in con.execute("select i.image_id, c.width from images i join cameras c on c.camera_id = i.camera_id")}
ids = sorted(nombre)
pos = {i: k for k, i in enumerate(ids)}
es360 = np.array([nombre[i].startswith("i360/") for i in ids])
print("fotos: %d (%d de video, %d vistas 360)" % (len(ids), (~es360).sum(), es360.sum()), flush=True)

from concurrent.futures import ThreadPoolExecutor
kps = {}
for i in ids:
    r = con.execute("select rows, cols, data from keypoints where image_id=?", (i,)).fetchone()
    kps[i] = None if (r is None or r[0] == 0) else np.frombuffer(r[2], np.float32).reshape(r[0], r[1])[:, :2].copy()


def color_de(i):
    xy = kps[i]
    if xy is None:
        return i, np.zeros((0, 3), np.float32)
    im = cv2.imread(os.path.join(IMS, nombre[i]), cv2.IMREAD_REDUCED_COLOR_2)
    esc = im.shape[1] / float(ancho_cam[i])
    im = cv2.blur(im, (3, 3))
    x = np.clip((xy[:, 0] * esc).astype(int), 0, im.shape[1] - 1); y = np.clip((xy[:, 1] * esc).astype(int), 0, im.shape[0] - 1)
    c = im[y, x].astype(np.float32)
    lin = (c / 255.0) ** 2.2
    lin[(c.min(1) < 12) | (c.max(1) > 243)] = np.nan
    return i, lin


colores = {}
with ThreadPoolExecutor(6) as ex:
    for k, (i, lin) in enumerate(ex.map(color_de, ids)):
        colores[i] = lin
        if k % 500 == 0:
            print("  colores %d/%d" % (k, len(ids)), flush=True)

M = 2147483647
fi, fj, rr, ww = [], [], [], []
for pair, rows, data in con.execute("select pair_id, rows, data from two_view_geometries where rows >= 20"):
    a, b = divmod(pair, M)
    if a not in pos or b not in pos:
        continue
    m = np.frombuffer(data, np.uint32).reshape(-1, 2)
    ca, cb = colores[a], colores[b]
    if len(ca) == 0 or len(cb) == 0:
        continue
    va, vb = ca[m[:, 0]], cb[m[:, 1]]
    ok = np.isfinite(va).all(1) & np.isfinite(vb).all(1)
    if ok.sum() < 15:
        continue
    fi.append(pos[a]); fj.append(pos[b])
    rr.append(np.median(np.log(va[ok]) - np.log(vb[ok]), axis=0)); ww.append(np.sqrt(min(ok.sum(), 400)))
fi, fj, rr, ww = np.array(fi), np.array(fj), np.array(rr), np.array(ww)
N, E = len(ids), len(fi)
print("pares con muestras: %d" % E, flush=True)
ncomp, comp = connected_components(coo_matrix((np.ones(E), (fi, fj)), shape=(N, N)), directed=False)
mayor = np.bincount(comp).argmax()
sueltas = (comp != mayor)
print("componentes: %d; fotos fuera de la principal: %d" % (ncomp, sueltas.sum()))
x = np.zeros((N, 3))
filas = np.r_[np.arange(E), np.arange(E)]; cols = np.r_[fi, fj]
for c in range(3):
    w = ww.copy()
    for vuelta in range(3):
        A = coo_matrix((np.r_[w, -w], (filas, cols)), shape=(E, N)).tocsr()
        sol = lsqr(A, w * rr[:, c], damp=1e-3, atol=1e-8, btol=1e-8, iter_lim=4000)[0]
        res = np.abs(sol[fi] - sol[fj] - rr[:, c])
        w = ww * np.where(res < 0.1, 1.0, 0.1 / np.maximum(res, 1e-9))
    x[:, c] = sol
    print("  canal %d: residuo mediano %.3f, p90 %.3f" % (c, np.median(res), np.percentile(res, 90)), flush=True)
x[sueltas] = np.nan
x -= np.nanmean(x[~es360 & ~sueltas], axis=0)
# suavizado dentro de cada toma
por_toma = defaultdict(list)
for k, i in enumerate(ids):
    n = nombre[i]
    if not n.startswith("i360/"):
        por_toma[n.split("/")[0]].append((int(re.search(r"_(\d+)\.jpg$", n).group(1)), k))
for t, l in por_toma.items():
    l.sort(); kk = np.array([k for _, k in l])
    v = x[kk]
    ok = np.isfinite(v[:, 0])
    if ok.sum() >= 5:
        v[~ok] = np.interp(np.where(~ok)[0], np.where(ok)[0], v[ok][:, 0])[:, None] if False else v[~ok]
        for c in range(3):
            s = v[:, c].copy(); bueno = np.isfinite(s)
            s[~bueno] = np.interp(np.where(~bueno)[0], np.where(bueno)[0], s[bueno])
            s = gaussian_filter1d(median_filter(s, 5, mode="nearest"), 1.5, mode="nearest")
            v[:, c] = s
        x[kk] = v
x[~np.isfinite(x)] = 0.0
e = np.exp(x)
json.dump({nombre[i]: [round(float(v), 4) for v in e[k]] for k, i in enumerate(ids)}, open(OUT, "w"))
print("%-34s %6s %6s %6s   (exposicion relativa B G R; ganancia vieja equivalente = 1/e)" % ("toma", "B", "G", "R"))
for t in sorted(por_toma):
    kk = [k for _, k in por_toma[t]]
    m = np.median(e[kk], axis=0); lo = e[kk].min(0); hi = e[kk].max(0)
    print("%-34s %6.2f %6.2f %6.2f   1/e %.2f   dentro de la toma: %.2f a %.2f" % (t, *m, 1 / m[1], lo[1], hi[1]))
print("escrito", OUT)
