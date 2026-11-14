"""Ganancia fotometrica por foto a partir de los puntos comunes del modelo de COLMAP (el iPhone ajusta la exposicion
cuadro a cuadro y entre tomas hay hasta un 20 % de diferencia; Brush no tiene compensacion de apariencia, asi que esas
diferencias se vuelven neblina y manchas).
Cada punto 3D se ve en varias fotos: su color (media de 5x5 px alrededor del rasgo, en la foto ya reducida del
conjunto) deberia ser el mismo salvo la ganancia de cada foto. Se resuelve, por canal y en logaritmos,
log(color) = g_foto + a_punto por minimos cuadrados ralos con pesos de Huber (3 vueltas; descarta brillos y sombras que
cambian de una pasada a otra), con la media de g en cero. Se descartan observaciones casi negras o quemadas.
Escribe ganancias.json {nombre: [gb, gg, gr]} (factor que multiplica la foto, orden BGR de OpenCV) y, con APLICAR=1,
reescribe las fotos del conjunto multiplicadas (acotando la ganancia a [0,6, 1,6]).
uso: t1_ganancias.py <sparse_con_tracks> <conjunto_brush> <salida.json>   (variable APLICAR=1 para reescribir)"""
import sys, os, json, struct, numpy as np, cv2
from concurrent.futures import ProcessPoolExecutor
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import lsqr
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin


def leer_obs(path):
    """nombre -> (xy (n,2) float32, id de punto (n,) int64) solo de los rasgos con punto 3D"""
    out = {}
    with open(path, "rb") as f:
        datos = f.read()
    n, = struct.unpack_from("<Q", datos, 0); o = 8
    dt = np.dtype([("x", "<f8"), ("y", "<f8"), ("id", "<i8")])
    for _ in range(n):
        o += 4 + 32 + 24
        o += 4
        e = datos.index(b"\x00", o); nombre = datos[o:e].decode(); o = e + 1
        np2, = struct.unpack_from("<Q", datos, o); o += 8
        p2 = np.frombuffer(datos, dt, np2, o); o += 24 * np2
        m = p2["id"] >= 0
        out[nombre] = (np.c_[p2["x"][m], p2["y"][m]].astype(np.float32), p2["id"][m].astype(np.int64))
    return out


def muestrear(a):
    nombre, ruta, xy, escala = a
    im = cv2.imread(ruta)
    if im is None:
        return nombre, None
    b = cv2.blur(im, (5, 5))
    h, w = b.shape[:2]
    u = np.clip(np.round(xy[:, 0] * escala).astype(int), 0, w - 1); v = np.clip(np.round(xy[:, 1] * escala).astype(int), 0, h - 1)
    return nombre, b[v, u].astype(np.float32)


def aplicar(a):
    ruta, g = a
    im = cv2.imread(ruta).astype(np.float32) * np.asarray(g, np.float32)
    cv2.imwrite(ruta, np.clip(im, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 95])
    return ruta


if __name__ == "__main__":
    SP, DS, OUT = sys.argv[1:4]
    cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
    ims = {v["name"]: v for v in colmapbin.leer_imagenes(os.path.join(SP, "images.bin")).values()}
    obs = leer_obs(os.path.join(SP, "images.bin"))
    nombres = [n for n in sorted(obs) if not n.startswith("i360/") and os.path.exists(os.path.join(DS, "images", n)) and len(obs[n][1]) > 50]
    from PIL import Image
    tareas = []; ancho_ds = {}
    for n in nombres:
        c = ims[n]["cam"]
        if c not in ancho_ds:
            ancho_ds[c] = Image.open(os.path.join(DS, "images", n)).size[0]
        tareas.append((n, os.path.join(DS, "images", n), obs[n][0], ancho_ds[c] / cams[c][1]))
    col = {}
    with ProcessPoolExecutor(4) as ex:
        for k, (n, c) in enumerate(ex.map(muestrear, tareas, chunksize=8)):
            if c is not None:
                col[n] = c
            if k % 300 == 0:
                print("colores %d/%d" % (k + 1, len(tareas)), flush=True)
    nombres = [n for n in nombres if n in col]
    idx_im = {n: i for i, n in enumerate(nombres)}
    I = np.concatenate([np.full(len(obs[n][1]), idx_im[n]) for n in nombres])
    Pid = np.concatenate([obs[n][1] for n in nombres])
    Cc = np.concatenate([col[n] for n in nombres])
    ok = (Cc.min(1) > 12) & (Cc.max(1) < 245)
    I, Pid, Cc = I[ok], Pid[ok], Cc[ok]
    up, Pj = np.unique(Pid, return_inverse=True)
    cuenta = np.bincount(Pj)
    ok = cuenta[Pj] >= 2
    I, Pj, Cc = I[ok], Pj[ok], Cc[ok]
    up, Pj = np.unique(Pj, return_inverse=True)
    nI, nP = len(nombres), len(up)
    print("fotos %d, puntos %d, observaciones %d" % (nI, nP, len(I)))
    G = np.zeros((nI, 3))
    for c in range(3):
        y = np.log(Cc[:, c])
        wgt = np.ones(len(y))
        for vuelta in range(3):
            filas = np.arange(len(y))
            A = coo_matrix((np.r_[wgt, wgt], (np.r_[filas, filas], np.r_[I, nI + Pj])), shape=(len(y), nI + nP)).tocsr()
            x = lsqr(A, wgt * y, damp=1e-4, atol=1e-8, btol=1e-8, iter_lim=400)[0]
            r = y - x[I] - x[nI + Pj]
            s = 1.4826 * np.median(np.abs(r)) + 1e-6
            wgt = np.minimum(1.0, 1.5 * s / np.maximum(np.abs(r), 1e-9))
        g = x[:nI] - x[:nI].mean()
        G[:, c] = g
        print("canal %d: dispersion del residuo %.3f; ganancias de %.3f a %.3f (p5 %.3f, p95 %.3f)"
              % (c, s, np.exp(-g).min(), np.exp(-g).max(), np.percentile(np.exp(-g), 5), np.percentile(np.exp(-g), 95)))
    # la foto se multiplica por exp(-g): asi todas quedan con la ganancia media
    gan = {n: [float(x) for x in np.clip(np.exp(-G[i]), 0.6, 1.6)] for i, n in enumerate(nombres)}
    json.dump(gan, open(OUT, "w"))
    from collections import defaultdict
    por = defaultdict(list)
    for n, g in gan.items():
        por[n.split("/")[0]].append(np.mean(g))
    for t in sorted(por):
        print("  %-30s fotos %4d  ganancia media %.3f (de %.3f a %.3f)" % (t, len(por[t]), np.mean(por[t]), np.min(por[t]), np.max(por[t])))
    if os.environ.get("APLICAR") == "1":
        marca = os.path.join(DS, "ganancias_aplicadas.txt")
        if os.path.exists(marca):
            raise SystemExit("las ganancias ya estaban aplicadas en este conjunto")
        with ProcessPoolExecutor(4) as ex:
            for k, _ in enumerate(ex.map(aplicar, [(os.path.join(DS, "images", n), g) for n, g in gan.items()], chunksize=8)):
                pass
        open(marca, "w").write("ganancias de %s aplicadas a %d fotos\n" % (OUT, len(gan)))
        print("ganancias aplicadas a %d fotos" % len(gan))
