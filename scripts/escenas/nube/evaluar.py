"""Dibuja cada splat desde la pose exacta de fotos reales y lo mide contra la foto.
uso: evaluar.py <ref.npz> <dir_imagenes> <ancho> <lista_fotos.txt> <salida_dir> <nombre>=<splat.ply>[@<alineacion.json>] ...
Metricas por foto, solo en los pixeles que TODOS los splats cubren (alfa > 0,95):
  psnr: tras ajustar cada canal del render a la foto con una recta (quita diferencias de exposicion),
  ssim: en gris, ventana gaussiana de 11 px,
  nitidez: varianza del laplaciano del render dividida por la de la foto (1 = tan nitido como la foto)."""
import sys, os, json, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

REF, IMDIR, ANCHO, LISTA, OUT = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
cands = []
for arg in sys.argv[6:]:
    nom, resto = arg.split("=", 1)
    ply, _, al = resto.partition("@")
    cands.append((nom, ply, al))
os.makedirs(OUT, exist_ok=True)
ref = np.load(REF)
pos = {n: k for k, n in enumerate(ref["nombres"])}
camtab = {int(r[0]): r for r in ref["camtab"]}
fotos = [l.strip() for l in open(LISTA) if l.strip()]


def ssim(a, b):
    a = a.astype(np.float64); b = b.astype(np.float64)
    f = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    ma, mb = f(a), f(b); va, vb, cab = f(a * a) - ma * ma, f(b * b) - mb * mb, f(a * b) - ma * mb
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return ((2 * ma * mb + c1) * (2 * cab + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))


renders = {}
for nom, ply, al in cands:
    g = splat.leer(ply)
    if al:
        A = json.load(open(al)); g = splat.transformar(g, A["s"], np.array(A["R"]), np.array(A["t"]))
    G = render.a_gpu(g)
    for f in fotos:
        k = pos[f]; cam = camtab[int(ref["cam"][k])]
        w, h, fx, fy, cx, cy = cam[2], cam[3], cam[4], cam[5], cam[6], cam[7]
        e = ANCHO / w; W, H = ANCHO, int(round(h * e))
        img, alfa, _ = render.render(G, ref["R"][k], ref["t"][k], fx * e, fy * e, cx * e, cy * e, W, H)
        renders[(nom, f)] = ((img[..., ::-1] * 255).astype(np.uint8), alfa)
        cv2.imwrite(os.path.join(OUT, "%s__%s.jpg" % (os.path.basename(f)[:-4], nom)), renders[(nom, f)][0], [cv2.IMWRITE_JPEG_QUALITY, 92])
    del G; torch.cuda.empty_cache()
    print("listo", nom, flush=True)

filas = []
for f in fotos:
    foto = cv2.imread(os.path.join(IMDIR, f))
    W = ANCHO; H = renders[(cands[0][0], f)][0].shape[0]
    foto = cv2.resize(foto, (W, H), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, "%s__foto.jpg" % os.path.basename(f)[:-4]), foto)
    m = np.ones((H, W), bool)
    for nom, _, _ in cands: m &= renders[(nom, f)][1] > 0.95
    m = cv2.erode(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    lap_f = cv2.Laplacian(cv2.cvtColor(foto, cv2.COLOR_BGR2GRAY), cv2.CV_64F)[m].var()
    for nom, _, _ in cands:
        r = renders[(nom, f)][0].astype(np.float64)
        aj = np.empty_like(r)
        for c in range(3):
            A = np.stack([r[..., c][m], np.ones(m.sum())], 1)
            coef = np.linalg.lstsq(A, foto[..., c][m].astype(np.float64), rcond=None)[0]
            aj[..., c] = r[..., c] * coef[0] + coef[1]
        aj = aj.clip(0, 255)
        mse = ((aj - foto)[m] ** 2).mean()
        gr = lambda x: cv2.cvtColor(x.astype(np.uint8), cv2.COLOR_BGR2GRAY)
        fila = dict(foto=f, metodo=nom, cobertura=float(m.mean()), psnr=float(10 * np.log10(255 ** 2 / mse)),
                    ssim=float(ssim(gr(aj), gr(foto))[m].mean()),
                    nitidez=float(cv2.Laplacian(gr(renders[(nom, f)][0]), cv2.CV_64F)[m].var() / lap_f),
                    cubre_propio=float((renders[(nom, f)][1] > 0.95).mean()))
        filas.append(fila)
        print("%-45s %-16s cob %.2f psnr %.2f ssim %.3f nitidez %.2f propio %.2f" % (
            f[-40:], nom, fila["cobertura"], fila["psnr"], fila["ssim"], fila["nitidez"], fila["cubre_propio"]), flush=True)
json.dump(filas, open(os.path.join(OUT, "metricas.json"), "w"), indent=1)
print("\nPROMEDIOS")
for nom, _, _ in cands:
    F = [x for x in filas if x["metodo"] == nom]
    print("%-16s psnr %.2f ssim %.3f nitidez %.2f cubre_propio %.2f" % (
        nom, np.mean([x["psnr"] for x in F]), np.mean([x["ssim"] for x in F]),
        np.mean([x["nitidez"] for x in F]), np.mean([x["cubre_propio"] for x in F])))
