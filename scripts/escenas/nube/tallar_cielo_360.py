"""Talla una escena con el cielo que ven las vistas de las panoramicas 360 registradas en el modelo de COLMAP.

Por que: el tallado con las fotos de celular (tallar_cielo_gpu.py) solo certifica cielo dentro del cuadro del celular,
que mira hacia adelante y llega a unos 35 grados sobre el horizonte. Mas arriba nada vigilo el entrenamiento y quedan
manchas oscuras, azules y moradas, con forma de agujas, que el visitante ve al mirar hacia arriba (y en un celular en
vertical sin mirar hacia arriba, porque su campo vertical es mucho mayor). Las panoramicas si miran hacia arriba.

Metodo: por cada vista 360 registrada (nombre que empieza por PREF) se marca el cielo de la foto (claro, sin color y
liso, en rayos a mas de ELEV grados sobre el horizonte, fuera de la mascara de personas, y en manchas de al menos
0,2 % de la vista), se dibuja la escena desde ahi y se suma, por gaussiana, el peso que pone sobre pixeles de cielo y
el peso total. Se borra la que pone en el cielo FRAC o mas de lo que pinta: un pixel de cielo certifica que en su rayo
no hay nada. El cielo se encoge BORDE px para no castigar el borde de hojas y ramas.
uso: tallar_cielo_360.py <sparse_con_360> <images> <masks> <entrada.ply> <salida.ply> [frac=0.5] [ancho=600] [elev=12] [borde=2] [pref=i360/]
     (variables de entorno: HOJA=<archivo.jpg> deja una hoja con 6 vistas, foto y cielo marcado; PESOS=<archivo.npz>
      guarda por gaussiana el peso sobre cielo y el total, para probar umbrales sin volver a dibujar; FRACOSC y
      LUMOSC bajan el umbral para las gaussianas oscuras)"""
import sys, os, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

SP, IMS, MKS, IN, OUT = sys.argv[1:6]
FRAC = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
ANCHO = int(sys.argv[7]) if len(sys.argv) > 7 else 600
ELEV = float(sys.argv[8]) if len(sys.argv) > 8 else 12.0
BORDE = int(sys.argv[9]) if len(sys.argv) > 9 else 2
PREF = sys.argv[10] if len(sys.argv) > 10 else "i360/"
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = [v for v in colmapbin.leer_imagenes(os.path.join(SP, "images.bin")).values() if v["name"].startswith(PREF)]
ims.sort(key=lambda v: v["name"])


def intrinsecos(c):
    mod, W, H, p = cams[c]
    if mod == 1: fx, fy, cx, cy = p[:4]
    elif mod in (0, 2): fx = fy = p[0]; cx, cy = p[1], p[2]
    else: raise SystemExit("modelo de camara %d no previsto" % mod)
    return W, H, fx, fy, cx, cy


def cielo_de(v, w, h, fx, fy, cx, cy):
    im = cv2.imread(os.path.join(IMS, v["name"]))
    if im is None:
        return None, None
    ch = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(ch, cv2.COLOR_BGR2HSV); g = cv2.cvtColor(ch, cv2.COLOR_BGR2GRAY).astype(np.float32)
    desv = np.sqrt(np.maximum(cv2.blur(g * g, (5, 5)) - cv2.blur(g, (5, 5)) ** 2, 0))
    uu, vv = np.meshgrid((np.arange(w) + 0.5 - cx) / fx, (np.arange(h) + 0.5 - cy) / fy)
    d = np.stack([uu, vv, np.ones_like(uu)], -1) @ v["R"]          # rayo en el mundo (+Y arriba)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    c = (hsv[..., 2] > 150) & (hsv[..., 1] < 70) & (desv < 9) & (d[..., 1] > np.sin(np.radians(ELEV)))
    mp = os.path.join(MKS, v["name"] + ".png")
    if os.path.exists(mp):
        m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE)
        if m is not None:
            c &= cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST) > 0
    c = c.astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(c, connectivity=8)
    chicas = np.where(st[:, cv2.CC_STAT_AREA] < 0.002 * w * h)[0]
    c[np.isin(lab, chicas[chicas > 0])] = 0
    if BORDE > 0:
        c = cv2.erode(c, np.ones((2 * BORDE + 1, 2 * BORDE + 1), np.uint8))
    return ch, c


g = splat.leer(IN); N = len(g["xyz"])
o = g["opacidad"].ravel(); ok = np.isfinite(o) & np.isfinite(g["escala"]).all(1)
gg = {k: v.copy() for k, v in g.items()}; gg["opacidad"] = np.clip(gg["opacidad"], -12, 12)
G = render.a_gpu(gg)
acum = dict(w_m=torch.zeros(N, device="cuda"), w_t=torch.zeros(N, device="cuda"), mascara=None)
usadas, frac_cielo, hoja = 0, [], []
for v in ims:
    W, H, fx, fy, cx, cy = intrinsecos(v["cam"]); s = ANCHO / W; h = int(round(H * s))
    foto, c = cielo_de(v, ANCHO, h, fx * s, fy * s, cx * s, cy * s)
    if c is None or c.mean() < 0.01:
        continue
    usadas += 1; frac_cielo.append(c.mean())
    acum["mascara"] = torch.as_tensor(c > 0, device="cuda")
    render.render(G, v["R"], v["t"], fx * s, fy * s, cx * s, cy * s, ANCHO, h, acum=acum)
    if os.environ.get("HOJA") and len(hoja) < 6 and c.mean() > 0.15:
        marca = foto.copy(); marca[c > 0] = (0.4 * marca[c > 0] + 0.6 * np.array([255, 0, 255])).astype(np.uint8)
        hoja.append(np.hstack([cv2.resize(foto, (300, 300)), cv2.resize(marca, (300, 300))]))
wm, wt = acum["w_m"].cpu().numpy(), acum["w_t"].cpu().numpy()
frac = wm / np.maximum(wt, 1e-6)
lum0 = (0.5 + 0.28209479 * g["dc"]).clip(0, 1) @ np.array([0.299, 0.587, 0.114])
# Una gaussiana OSCURA sobre el cielo claro se nota mucho mas que una clara, y quitarla cuesta poco: para las de
# luminancia menor a LUMOSC basta con que pongan FRACOSC de lo que pintan sobre el cielo (variables de entorno).
FRACOSC = float(os.environ.get("FRACOSC", FRAC)); LUMOSC = float(os.environ.get("LUMOSC", 0.35))
fuera = (wt > 0.5) & ((frac >= FRAC) | ((frac >= FRACOSC) & (lum0 < LUMOSC)))
if os.environ.get("PESOS"):
    np.savez_compressed(os.environ["PESOS"], wm=wm.astype(np.float32), wt=wt.astype(np.float32))
splat.escribir(OUT, {k: a[~fuera] for k, a in g.items()})
op = 1 / (1 + np.exp(-np.clip(g["opacidad"].ravel(), -12, 12))); esc = np.exp(np.clip(g["escala"], -20, 8)).max(1)
lum = (0.5 + 0.28209479 * g["dc"]).clip(0, 1) @ np.array([0.299, 0.587, 0.114])
print("vistas 360 con cielo usadas: %d de %d (cielo medio %.0f %% de la vista); gaussianas que pintan sobre todo cielo (%.0f %% o mas): %d de %d (%.2f %%); de ellas oscuras %d, de mas de 1 unidad %d; opacidad media %.2f; altura mediana %.1f; quedan %d -> %s"
      % (usadas, len(ims), 100 * np.mean(frac_cielo) if frac_cielo else 0, 100 * FRAC, fuera.sum(), N, 100.0 * fuera.mean(), int((fuera & (lum < 0.15)).sum()),
         int((fuera & (esc > 1)).sum()), float(op[fuera].mean()) if fuera.any() else 0.0, float(np.median(g["xyz"][fuera, 1])) if fuera.any() else 0.0, int((~fuera).sum()), OUT))
if os.environ.get("HOJA") and hoja:
    cv2.imwrite(os.environ["HOJA"], np.vstack(hoja), [cv2.IMWRITE_JPEG_QUALITY, 85])
