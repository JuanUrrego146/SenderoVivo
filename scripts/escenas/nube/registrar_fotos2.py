"""Registra fotos de video en el marco exacto de un splat, foto contra foto.
Una semilla por zona se registra contra el dibujo del splat (lento). Desde ahi, cada foto nueva se empareja (SIFT, foto
contra foto, que son nitidas) con hasta 4 fotos ya registradas cercanas; los puntos de esas fotos se suben a 3D con la
profundidad del splat dibujado desde su pose, y la pose de la foto nueva sale de PnP (RANSAC + ajuste fino). Asi todas
quedan en el marco del splat sin el desacuerdo de 1 a 2 m que tienen entre si las pasadas en COLMAP.
uso: registrar_fotos2.py <splat.ply> <dataset_colmap> <prefijo> <paso> <salida.json>"""
import sys, os, json, time, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

PLY, DS, PREF, PASO, OUT = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
AW, DW = 1280, 480          # ancho para emparejar y ancho del mapa de profundidad
cams = colmapbin.leer_camaras(os.path.join(DS, "sparse/0/cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(DS, "sparse/0/images.bin"))
todas = sorted([v for v in ims.values() if v["name"].startswith(PREF)], key=lambda v: v["name"])
tomas = {}
for v in todas:
    tomas.setdefault(v["name"].split("/")[0], []).append(v)
sel = [v for lista in tomas.values() for v in lista[::PASO]]
N = len(sel)
nombre = [v["name"] for v in sel]
toma_de = [v["name"].split("/")[0] for v in sel]
centro = np.array([v["centro"] for v in sel])
mira = np.array([v["R"][2] for v in sel])          # eje optico en el mundo (fila 3 de R)
G = render.a_gpu(splat.leer(PLY))
print("fotos %d en %d tomas" % (N, len(tomas)), flush=True)


def K_de(v, ancho):
    mod, W, H, p = cams[v["cam"]]
    s = ancho / W
    return np.array([[p[0] * s, 0, p[2] * s], [0, p[1] * s, p[3] * s], [0, 0, 1.0]]), ancho, int(round(H * s))


sift = cv2.SIFT_create(nfeatures=5000, contrastThreshold=0.015)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
t0 = time.time()


def gris(v, ancho):
    K, W, H = K_de(v, ancho)
    g = cv2.imread(os.path.join(DS, "images", v["name"]), cv2.IMREAD_GRAYSCALE)
    return clahe.apply(cv2.resize(g, (W, H), interpolation=cv2.INTER_AREA))


KP, DE = [], []
for i, v in enumerate(sel):
    k, d = sift.detectAndCompute(gris(v, AW), None)
    KP.append(np.array([p.pt for p in k], np.float32))
    DE.append(np.clip(d, 0, 255).astype(np.uint8))
    if i % 100 == 0:
        print("rasgos %d/%d (%.0f s)" % (i, N, time.time() - t0), flush=True)
print("rasgos listos en %.0f s" % (time.time() - t0), flush=True)


def emparejar(i, j):
    a = torch.as_tensor(DE[i], device="cuda", dtype=torch.float32)
    b = torch.as_tensor(DE[j], device="cuda", dtype=torch.float32)
    d = torch.cdist(a, b)
    v2, ix = d.topk(2, dim=1, largest=False)
    ok = v2[:, 0] < 0.8 * v2[:, 1]
    inv = d.argmin(0)                               # mutuo: el mejor de b tambien debe elegir a este
    ia = torch.arange(len(a), device="cuda")
    ok &= inv[ix[:, 0]] == ia
    return ia[ok].cpu().numpy(), ix[ok, 0].cpu().numpy()


pose = {}      # indice -> (R, t)
prof = {}      # indice -> mapa de profundidad a DW de ancho (nan donde no hay superficie opaca)


def dibujar(i):
    R, t = pose[i]
    K, W, H = K_de(sel[i], DW)
    _, alfa, pr = render.render(G, R, t, K[0, 0], K[1, 1], K[0, 2], K[1, 2], W, H)
    pr = pr.astype(np.float32)
    pr[alfa < 0.95] = np.nan
    prof[i] = pr


def levantar(j, pts):
    """puntos (en px de AW) de la foto registrada j -> 3D del mundo, o nan si la profundidad no es fiable"""
    pr = prof[j]
    s = DW / AW
    H, W = pr.shape
    ui = np.clip(np.round(pts[:, 0] * s).astype(int), 1, W - 2)
    vi = np.clip(np.round(pts[:, 1] * s).astype(int), 1, H - 2)
    vec = np.stack([pr[vi + dy, ui + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)], 1)
    z = pr[vi, ui]
    with np.errstate(invalid="ignore"):
        malo = np.isnan(vec).any(1) | (np.nanmax(vec, 1) / np.maximum(np.nanmin(vec, 1), 1e-3) > 1.04) | (z > 60)
    K, _, _ = K_de(sel[j], AW)
    Xc = np.c_[(pts[:, 0] - K[0, 2]) / K[0, 0], (pts[:, 1] - K[1, 2]) / K[1, 1], np.ones(len(pts))] * z[:, None]
    R, t = pose[j]
    Xw = (Xc - t) @ R
    Xw[malo] = np.nan
    return Xw


def resolver(i, vecinos, umbral=2.0):
    X, x = [], []
    for j in vecinos:
        ia, ib = emparejar(i, j)
        if len(ia) < 15:
            continue
        Xw = levantar(j, KP[j][ib])
        ok = ~np.isnan(Xw).any(1)
        X.append(Xw[ok])
        x.append(KP[i][ia][ok])
    if not X:
        return None
    X = np.concatenate(X).astype(np.float64)
    x = np.concatenate(x).astype(np.float64)
    if len(X) < 30:
        return None
    K, W, H = K_de(sel[i], AW)
    ok, rv, tv, inl = cv2.solvePnPRansac(X, x, K, None, iterationsCount=4000, reprojectionError=umbral,
                                         confidence=0.9999, flags=cv2.SOLVEPNP_SQPNP)
    if not ok or inl is None or len(inl) < 40:
        return None
    inl = inl.ravel()
    rv, tv = cv2.solvePnPRefineLM(X[inl], x[inl], K, None, rv, tv)
    pr_, _ = cv2.projectPoints(X[inl], rv, tv, K, None)
    e = float(np.sqrt(((pr_.reshape(-1, 2) - x[inl]) ** 2).sum(1).mean()))
    return cv2.Rodrigues(rv)[0], tv.ravel(), len(inl), e, len(X)


res = json.load(open(OUT)) if os.path.exists(OUT) else {}
for i, n in enumerate(nombre):
    if n in res:
        pose[i] = (np.array(res[n]["R"]), np.array(res[n]["t"]))
for i in list(pose):
    dibujar(i)
print("ya registradas %d" % len(pose), flush=True)


def guardar():
    json.dump(res, open(OUT, "w"), indent=0)


def anotar(i, r, como):
    R, t, n_, e, nb = r
    pose[i] = (R, t)
    dibujar(i)
    c_new = -R.T @ t
    res[nombre[i]] = dict(R=np.asarray(R).tolist(), t=np.asarray(t).tolist(), inliers=int(n_), rmse=float(e),
                          emparejados=int(nb), ancho=AW, salto_m=float(np.linalg.norm(c_new - centro[i])), como=como)
    print("%s [%s]: %d de %d, rmse %.2f px, a %.2f m de COLMAP (%.0f s)" % (
        nombre[i], como, n_, nb, e, np.linalg.norm(c_new - centro[i]), time.time() - t0), flush=True)
    if len(res) % 20 == 0:
        guardar()


sift_r = cv2.SIFT_create(nfeatures=8000, contrastThreshold=0.015)


def semilla_en(i):
    """registro lento de una foto contra el dibujo del splat, desde la pose de COLMAP (dos vueltas)"""
    v = sel[i]
    K, W, H = K_de(v, 960)
    fg = gris(v, 960)
    k1, d1 = sift_r.detectAndCompute(fg, None)
    R0, t0_ = v["R"], v["t"]
    mejor = None
    for vuelta in range(3):
        img, alfa, pr = render.render(G, R0, t0_, K[0, 0], K[1, 1], K[0, 2], K[1, 2], W, H, fondo=(0.5, 0.5, 0.5))
        rg = clahe.apply(cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY))
        k2, d2 = sift_r.detectAndCompute(rg, None)
        if d1 is None or d2 is None:
            return None
        m = cv2.BFMatcher().knnMatch(d2, d1, k=2)
        bu = [a for a, b in (q for q in m if len(q) == 2) if a.distance < 0.85 * b.distance]
        if len(bu) < 30:
            return mejor
        p2 = np.array([k2[a.queryIdx].pt for a in bu])
        p1 = np.array([k1[a.trainIdx].pt for a in bu])
        ui = np.clip(p2[:, 0].astype(int), 0, W - 1)
        vi = np.clip(p2[:, 1].astype(int), 0, H - 1)
        z = pr[vi, ui]
        ok = (alfa[vi, ui] > 0.95) & (z < 60)
        if ok.sum() < 30:
            return mejor
        Xc = np.c_[(p2[ok, 0] - K[0, 2]) / K[0, 0], (p2[ok, 1] - K[1, 2]) / K[1, 1], np.ones(ok.sum())] * z[ok, None]
        Xw = (Xc - t0_) @ R0
        okp, rv, tv, inl = cv2.solvePnPRansac(Xw, p1[ok], K, None, iterationsCount=5000,
                                              reprojectionError=4.0 if vuelta == 0 else 2.5,
                                              confidence=0.999, flags=cv2.SOLVEPNP_SQPNP)
        if not okp or inl is None or len(inl) < 25:
            return mejor
        inl = inl.ravel()
        rv, tv = cv2.solvePnPRefineLM(Xw[inl], p1[ok][inl], K, None, rv, tv)
        R0, t0_ = cv2.Rodrigues(rv)[0], tv.ravel()
        if mejor is None or len(inl) >= mejor[2]:
            mejor = (R0, t0_, len(inl), -1.0, len(bu))
    return mejor


def semilla(toma):
    idx = [i for i in range(N) if toma_de[i] == toma]
    orden = idx[len(idx) // 2::max(1, len(idx) // 8)] + idx[:len(idx) // 2][::-max(1, len(idx) // 8)]
    mejor, cual = None, None
    for i in orden[:8]:
        r = semilla_en(i)
        print("  semilla %s: %s" % (nombre[i], "nada" if r is None else "%d inliers" % r[2]), flush=True)
        if r is not None and (mejor is None or r[2] > mejor[2]):
            mejor, cual = r, i
        if mejor is not None and mejor[2] >= 80:
            break
    if mejor is None or mejor[2] < 40:
        return False
    anotar(cual, mejor, "semilla")
    return True


intentos = np.zeros(N, int)
sin_semilla = set()
while True:
    hechos = np.array(sorted(pose), int)
    if len(hechos) == 0:
        t_ = toma_de[0]
        if not semilla(t_):
            print("no hay semilla en %s" % t_, flush=True)
            break
        continue
    pend = [i for i in range(N) if i not in pose and intentos[i] < 3]
    if not pend:
        break
    dmin = [np.linalg.norm(centro[hechos] - centro[i], axis=1) for i in pend]
    orden = np.argsort([d.min() for d in dmin])
    avance = 0
    for o in orden[:40]:
        i = pend[o]
        d = dmin[o]
        ang = mira[hechos] @ mira[i]
        cand = sorted((d[k], hechos[k]) for k in range(len(hechos)) if d[k] < 6 and ang[k] > 0.5)
        cand = [j for _, j in cand[:4]]
        if not cand:
            continue
        intentos[i] += 1
        r = resolver(i, cand)
        if r is not None:
            anotar(i, r, "foto")
            avance += 1
    if avance == 0:
        sin = [t for t in tomas if t not in sin_semilla and not any(toma_de[i] == t for i in pose)]
        if not sin:
            break
        if not semilla(sin[0]):
            print("sin semilla en %s" % sin[0], flush=True)
            sin_semilla.add(sin[0])
guardar()
print("FIN: registradas %d de %d en %.0f min" % (len(res), N, (time.time() - t0) / 60), flush=True)
