"""Dibuja varios splats desde las poses registradas de algunas fotos y los pone al lado de la foto real.
Mide por foto, en los pixeles que el splat cubre y que no estan tapados por la mascara: PSNR (tras ajustar cada canal
con una recta) y nitidez (varianza del laplaciano del dibujo entre la de la foto; 1 = tan nitido como la foto).
uso: comparar_poses.py <poses.json> <dataset_colmap> <n_fotos|lista.txt> <ancho> <salida.jpg> <nombre>=<splat.ply> ...
     (si existe <dataset_brush>/masks se usa con la variable MASCARAS=<dir>)"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

POSES, DS, CUANTAS, ANCHO, OUT = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
cands = [a.split("=", 1) for a in sys.argv[6:]]
MASC = os.environ.get("MASCARAS")
poses = json.load(open(POSES))
cams = colmapbin.leer_camaras(os.path.join(DS, "sparse/0/cameras.bin"))
ims = {v["name"]: v for v in colmapbin.leer_imagenes(os.path.join(DS, "sparse/0/images.bin")).values()}
if os.path.exists(CUANTAS):
    fotos = [l.strip() for l in open(CUANTAS) if l.strip()]
else:
    nombres = sorted(poses)
    fotos = nombres[::max(1, len(nombres) // int(CUANTAS))][:int(CUANTAS)]


def limpio(g):
    o = g["opacidad"].ravel()
    bien = ~np.isnan(o) & ~np.isnan(g["escala"]).any(1)
    g = {k: v[bien] for k, v in g.items()}
    g["opacidad"] = np.clip(g["opacidad"], -12, 12)
    return g


filas = {f: [] for f in fotos}
metr = {n: [] for n, _ in cands}
for f in fotos:
    v = ims[f]; mod, W, H, p = cams[v["cam"]]; s = ANCHO / W
    w, h = ANCHO, int(round(H * s))
    foto = cv2.resize(cv2.imread(os.path.join(DS, "images", f)), (w, h), interpolation=cv2.INTER_AREA)
    filas[f].append(foto)
for n, ply in cands:
    G = render.a_gpu(limpio(splat.leer(ply)))
    for f in fotos:
        v = ims[f]; mod, W, H, p = cams[v["cam"]]; s = ANCHO / W
        w, h = ANCHO, int(round(H * s))
        img, alfa, _ = render.render(G, np.array(poses[f]["R"]), np.array(poses[f]["t"]), p[0] * s, p[1] * s, p[2] * s,
                                     p[3] * s, w, h, fondo=(1, 0, 1))
        im = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8)
        foto = filas[f][0]
        m = alfa > 0.95
        if MASC and os.path.exists(os.path.join(MASC, f + ".png")):
            mk = cv2.resize(cv2.imread(os.path.join(MASC, f + ".png"), cv2.IMREAD_GRAYSCALE), (w, h),
                            interpolation=cv2.INTER_NEAREST)
            m &= mk > 0
        a = im[m].astype(np.float64); b = foto[m].astype(np.float64)
        aj = np.empty_like(a)
        for c in range(3):
            A = np.c_[a[:, c], np.ones(len(a))]
            aj[:, c] = A @ np.linalg.lstsq(A, b[:, c], rcond=None)[0]
        psnr = 10 * np.log10(255 ** 2 / np.mean((aj - b) ** 2))
        lap = lambda x: cv2.Laplacian(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), cv2.CV_64F)[m].var()
        nit = lap(im) / lap(foto)
        metr[n].append((psnr, nit))
        cv2.putText(im, "%s %.1f dB nit %.2f" % (n, psnr, nit), (6, 22), 0, 0.6, (255, 255, 255), 2)
        filas[f].append(im)
    del G
for n in metr:
    a = np.array(metr[n])
    print("%-12s PSNR medio %.2f dB  nitidez media %.2f  (%d fotos)" % (n, a[:, 0].mean(), a[:, 1].mean(), len(a)))
cv2.imwrite(OUT, np.vstack([np.hstack(filas[f]) for f in fotos[:6]]))
