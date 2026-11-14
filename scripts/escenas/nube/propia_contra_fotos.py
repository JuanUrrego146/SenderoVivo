"""Compara uno o varios splats contra las fotos que Brush NO uso para entrenar (una de cada CADA, igual que
--eval-split-every), desde la pose exacta de cada foto y a ANCHO px de ancho.
Por foto y por splat, en los pixeles validos de la mascara del conjunto (255 = se entrena):
- nitidez: varianza del laplaciano del dibujo entre la de la foto (1 = tan nitido como la foto a esa resolucion). Si
  da cerca de 1 a la resolucion de entrenamiento, el limite es la resolucion; si da mucho menos, es la capacidad del
  modelo (gaussianas, pasos) o la coherencia de las poses;
- PSNR tras ajustar cada canal con una recta;
- cielo sucio: alfa media del dibujo donde la mascara tapa (cielo y lejania) en la mitad superior. Con cielo transparente
  debe acercarse a 0; con mascara queda lo que el entrenamiento dejo flotando ahi.
Lee el conjunto en texto (sparse/0/cameras.txt e images.txt, PINHOLE). La hoja pone foto y dibujos con fondo magenta.
uso: propia_contra_fotos.py <conjunto> <ancho> <cada> <max_fotos> <salida.jpg> nombre=ply ..."""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

DS, ANCHO, CADA, MAXF, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
cands = [a.split("=", 1) for a in sys.argv[6:]]
FONDO = tuple(float(x) for x in os.environ["FONDO_RGB"].split(",")) if os.environ.get("FONDO_RGB") else None
cams = {}
for l in open(os.path.join(DS, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and p[1] == "PINHOLE":
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]))
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.strip().split(" ", 9)
    if len(p) == 10:
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        vistas.append((p[9], colmapbin.qvec2rot(q), t, int(p[8])))
ev = vistas[::CADA]
ev = [ev[int(k)] for k in np.linspace(0, len(ev) - 1, min(MAXF, len(ev)))]


def limpio(g):
    o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1) & np.isfinite(g["xyz"]).all(1)
    g = {k: v[ok] for k, v in g.items()}; g["opacidad"] = np.clip(g["opacidad"], -12, 12); return g


def foto_de(n):
    for ext in ("", ".jpg", ".png"):
        base = os.path.splitext(n)[0] if ext else n
        f = os.path.join(DS, "images", base + ext)
        if os.path.exists(f):
            im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
            return im[..., :3], (im[..., 3] if im.shape[2] == 4 else None)
    return None, None


filas = {n: [] for n, _, _, _ in ev}
datos = {}
for n, R, t, c in ev:
    W, H, fx, fy, cx, cy = cams[c]; s = ANCHO / W; w, h = ANCHO, int(round(H * s))
    im, alfa_foto = foto_de(n)
    mp = os.path.join(DS, "masks", n + ".png")
    mk = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else alfa_foto
    if mk is None:
        mk = np.full(im.shape[:2], 255, np.uint8)
    foto = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    mk = cv2.resize(mk, (w, h), interpolation=cv2.INTER_NEAREST)
    datos[n] = (R, t, fx * s, fy * s, cx * s, cy * s, w, h, foto, mk)
    filas[n].append(foto)
metr = {n: [] for n, _ in cands}
lap = lambda x: cv2.Laplacian(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), cv2.CV_64F)
for nombre, ply in cands:
    G = render.a_gpu(limpio(splat.leer(ply)))
    for n in filas:
        R, t, fx, fy, cx, cy, w, h, foto, mk = datos[n]
        img, alfa, _ = render.render(G, R, t, fx, fy, cx, cy, w, h, fondo=FONDO or (1, 0, 1))
        dib = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8)
        val = mk > 0
        # con FONDO_RGB el PSNR cuenta TODOS los pixeles validos, con ese color donde la escena es traslucida (lo que
        # veria el visitante); sin el, solo los pixeles donde la escena es opaca, y los huecos no penalizan
        m = val if FONDO else val & (alfa > 0.95)
        a = dib[m].astype(np.float64); b = foto[m].astype(np.float64); aj = np.empty_like(a)
        for k in range(3):
            A = np.c_[a[:, k], np.ones(len(a))]; aj[:, k] = A @ np.linalg.lstsq(A, b[:, k], rcond=None)[0]
        psnr = 10 * np.log10(255 ** 2 / np.mean((aj - b) ** 2))
        nit = lap(dib)[val].var() / lap(foto)[val].var()
        arriba = np.zeros_like(val); arriba[: h // 2] = True
        sucio = float(alfa[(~val) & arriba].mean()) if ((~val) & arriba).sum() > 500 else np.nan
        transp = float((alfa[val] < 0.9).mean())
        metr[nombre].append((psnr, nit, sucio, transp))
        cv2.putText(dib, "%s %.1f dB nit %.2f" % (nombre, psnr, nit), (6, 22), 0, 0.6, (0, 255, 255), 2)
        filas[n].append(dib)
    del G
for n in metr:
    a = np.array(metr[n])
    print("%-10s PSNR %.2f dB | nitidez %.2f (mediana %.2f) | cielo sucio %.3f | pixeles validos con alfa < 0,9: %.1f %% | %d fotos a %d px"
          % (n, a[:, 0].mean(), a[:, 1].mean(), np.median(a[:, 1]), np.nanmean(a[:, 2]), 100 * a[:, 3].mean(), len(a), ANCHO))
nom = list(filas)
cv2.imwrite(OUT, np.vstack([np.hstack(filas[f]) for f in nom[:8]]), [cv2.IMWRITE_JPEG_QUALITY, 88])
print("hoja:", OUT)
