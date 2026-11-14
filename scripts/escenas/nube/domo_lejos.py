"""Fondo lejano fotografico de una zona: cielo y paisaje lejano reales de las panoramicas 360, sin lo cercano.

uso: domo_lejos.py <sparse_con_360> <images> <masks> <pano_valle> <salida_base> [ancho=8192] [lejos_m=90]
                   [ref_bgr=216,209,197] [ventana=lon0,lon1,lat0,lat1]

Las gaussianas reconstruyen bien lo cercano y mal lo lejano (poco paralaje: borroso y con agujas). Lo lejano casi no
cambia al caminar unos metros, asi que se puede mostrar con una foto envolvente puesta en el infinito.
- CIELO: se junta el de TODAS las panoramicas registradas en el modelo (cada una lo ve por huecos distintos del
  dosel y el cielo es el mismo desde todas). En cada panoramica es cielo lo claro, sin color y liso que ademas no
  tiene puntos fiables de COLMAP (3 o mas vistas, error < 2 px) a menos de <lejos_m> en su celda de 0,5 grados ni en
  las vecinas. Cada panoramica se lleva antes al color de referencia (el cielo medio de las fotos de celular; el
  crudo de la Insta360 sale lila). Las ramas y los arcos finos del protector de la lente se cierran antes.
- PAISAJE LEJANO: solo dentro de la <ventana> (grados; lon0 > lon1 cruza +-180), tomado de <pano_valle> (la que
  esta en el mirador) a toda resolucion: lo que no es cielo y no tiene puntos a menos de <lejos_m>.
- Lo demas (arboles, piso, baranda: lo muestran las gaussianas y en la foto quedaria quieto en el infinito) se
  rellena por continuidad del cielo (empujar y tirar, longitud cerrada) y bajo el horizonte se funde a un tono de
  suelo. Las uniones se difuminan unos 2 grados.
Escribe <base>.jpg (equirectangular SIN voltear: columna u = 0,5 + atan2(x, z)/2pi, fila v = 0,5 - asin(y)/pi),
<base>_mini.jpg (fondo y clases) y <base>_centro.txt.
"""
import sys, os, collections, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, IMS, MKS, PVALLE, BASE = sys.argv[1:6]
W = int(sys.argv[6]) if len(sys.argv) > 6 else 8192
LEJOS = float(sys.argv[7]) if len(sys.argv) > 7 else 90.0
REF = np.array([float(x) for x in sys.argv[8].split(",")], np.float32) if len(sys.argv) > 8 else np.array([216.0, 209.0, 197.0], np.float32)
VENT = [float(x) for x in sys.argv[9].split(",")] if len(sys.argv) > 9 and sys.argv[9] not in ("", "no") else None
H = W // 2
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
xyz, rgb, err, nv = colmapbin.leer_puntos(os.path.join(SP, "points3D.bin"))
PTS = xyz[(err < 2.0) & (np.array([len(t) for t in nv]) >= 3)]
panos = collections.defaultdict(list)
for v in ims.values():
    if v["name"].startswith("i360/"):
        panos[v["name"][5:-4].split("_")[1]].append(v)


def rejilla(w):
    h = w // 2
    lon = ((np.arange(w) + 0.5) / w - 0.5) * 2 * np.pi; lat = (0.5 - (np.arange(h) + 0.5) / h) * np.pi
    LON, LAT = np.meshgrid(lon.astype(np.float32), lat.astype(np.float32))
    return LON, LAT, np.stack([np.cos(LAT) * np.sin(LON), np.sin(LAT), np.cos(LAT) * np.cos(LON)], -1)


def componer(vistas, d):
    h, w = d.shape[:2]
    acc = np.zeros((h, w, 3), np.float32); pes = np.zeros((h, w), np.float32)
    for vw in vistas:
        mod, cw, ch, p = cams[vw["cam"]]
        fx, fy, cx, cy = (p[0], p[1], p[2], p[3]) if mod == 1 else (p[0], p[0], p[1], p[2])
        f = os.path.join(IMS, vw["name"])
        if not os.path.exists(f):
            continue
        im = cv2.imread(f).astype(np.float32)
        mk = cv2.imread(os.path.join(MKS, vw["name"] + ".png"), cv2.IMREAD_GRAYSCALE)
        c = d @ vw["R"].T.astype(np.float32); z = c[..., 2]; ok = z > 0.05
        x = np.where(ok, fx * c[..., 0] / np.maximum(z, 1e-3) + cx, -1).astype(np.float32)
        y = np.where(ok, fy * c[..., 1] / np.maximum(z, 1e-3) + cy, -1).astype(np.float32)
        col = cv2.remap(im, x, y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        m = cv2.remap(mk if mk is not None else np.full((ch, cw), 255, np.uint8), x, y, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        dentro = ok & (x >= 0) & (x < cw - 1) & (y >= 0) & (y < ch - 1) & (m > 0)
        wgt = np.where(dentro, (z / np.linalg.norm(c, axis=-1)) ** 4, 0).astype(np.float32)
        acc += col * wgt[..., None]; pes += wgt
    vis = pes > 1e-4
    acc[vis] /= pes[vis, None]
    return acc, vis


def cerca_desde(centro, w):
    """mapa booleano (h, w): hay puntos fiables a menos de LEJOS en esa direccion (celdas de 0,5 grados, engrosadas)"""
    P = PTS - centro; r = np.linalg.norm(P, axis=1); m = (r > 0.5) & (r < LEJOS); P = P[m]; r = r[m]
    GW, GH = 720, 360
    gu = ((0.5 + np.arctan2(P[:, 0], P[:, 2]) / (2 * np.pi)) * GW).astype(int) % GW
    gv = np.clip(((0.5 - np.arcsin(np.clip(P[:, 1] / r, -1, 1)) / np.pi) * GH).astype(int), 0, GH - 1)
    cnt = np.zeros((GH, GW), np.int32); np.add.at(cnt, (gv, gu), 1)
    c = (cnt >= 2).astype(np.uint8); c = np.hstack([c[:, -8:], c, c[:, :8]])
    c = cv2.dilate(cv2.morphologyEx(c, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)), np.ones((5, 5), np.uint8))[:, 8:-8]
    return cv2.resize(c, (w, w // 2), interpolation=cv2.INTER_NEAREST) > 0


def cielo_de(img, vis, cerca, LAT, minlat=-2.0):
    """cielo: cierra ramas y arcos finos, y marca lo claro, sin color y liso que no tiene nada cerca"""
    h, w = vis.shape
    k = max(5, int(w / 4096 * 13)) | 1
    u8 = np.clip(img, 0, 255).astype(np.uint8)
    cer = cv2.morphologyEx(u8, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    hsv = cv2.cvtColor(cer, cv2.COLOR_BGR2HSV); g = cv2.cvtColor(cer, cv2.COLOR_BGR2GRAY).astype(np.float32)
    kb = max(5, int(w / 1024 * 5)) | 1
    desv = np.sqrt(np.maximum(cv2.blur(g * g, (kb, kb)) - cv2.blur(g, (kb, kb)) ** 2, 0))
    c = vis & ~cerca & (hsv[..., 2] > 150) & (hsv[..., 1] < 70) & (desv < 9) & (LAT > np.radians(minlat))
    c = cv2.morphologyEx(c.astype(np.uint8), cv2.MORPH_OPEN, np.ones((max(3, k // 2) | 1,) * 2, np.uint8)) > 0
    return cer.astype(np.float32), c


def relleno(img, ok):
    """empujar y tirar: cada hueco toma el promedio de lo conocido a la escala mas fina que lo alcance"""
    niveles = [(img * ok[..., None], ok.astype(np.float32))]
    while niveles[-1][0].shape[1] > 4:
        a, wg = niveles[-1]
        niveles.append((cv2.resize(a, (a.shape[1] // 2, max(1, a.shape[0] // 2)), interpolation=cv2.INTER_AREA),
                        cv2.resize(wg, (a.shape[1] // 2, max(1, a.shape[0] // 2)), interpolation=cv2.INTER_AREA)))
    res = niveles[-1][0] / np.maximum(niveles[-1][1][..., None], 1e-6)
    for a, wg in niveles[-2::-1]:
        sub = cv2.resize(res, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LINEAR)
        k = np.clip(wg * 4, 0, 1)[..., None]
        res = a / np.maximum(wg[..., None], 1e-6) * k + sub * (1 - k)
    return res


# 1) cielo de todas las panoramicas, a 2048
WS = 2048; LONs, LATs, ds = rejilla(WS)
suma = np.zeros((WS // 2, WS, 3), np.float32); cuenta = np.zeros((WS // 2, WS), np.float32); usadas = 0
for nombre in sorted(panos):
    vistas = panos[nombre]
    if len(vistas) < 6:
        continue
    centro = np.mean([v["centro"] for v in vistas], 0)
    img, vis = componer(vistas, ds)
    cer, c = cielo_de(img, vis, cerca_desde(centro, WS), LATs)
    if c.sum() < 2000:
        continue
    cer *= REF / np.maximum(cer[c].mean(0), 1)
    suma += cer * c[..., None]; cuenta += c; usadas += 1
    print("%s: cielo %.1f %% de la esfera" % (nombre, 100 * c.mean()), flush=True)
cielo_ok = cuenta >= min(2, usadas)          # al menos dos panoramicas de acuerdo: lo que ve una sola suele ser un hueco del dosel mal clasificado
cielo_img = np.zeros_like(suma); cielo_img[cielo_ok] = suma[cielo_ok] / cuenta[cielo_ok, None]
print("cielo real reunido de %d panoramicas: %.1f %% de la esfera (%.1f %% del hemisferio de arriba)"
      % (usadas, 100 * cielo_ok.mean(), 100 * cielo_ok[: WS // 4].mean()), flush=True)
pad = WS // 8; ext = lambda a: np.hstack([a[:, -pad:], a, a[:, :pad]])
lleno = relleno(ext(cielo_img), ext(cielo_ok))[:, pad:-pad]
suave = cv2.GaussianBlur(lleno, (0, 0), 4)
peso = np.clip(cv2.GaussianBlur(cielo_ok.astype(np.float32), (0, 0), 6) * 1.6 - 0.3, 0, 1)[..., None] * cielo_ok[..., None]
cielo_fin = cielo_img * peso + suave * (1 - peso)
# el cielo nublado es casi neutro: se conserva su claridad y se le pone el tono de la referencia (quita los parches
# lila que deja la Insta360 en lo mas claro); una mediana de 5 px borra motas sueltas
lab = cv2.cvtColor(np.clip(cielo_fin, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB)
ref_lab = cv2.cvtColor(REF.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB)[0, 0]
lab[..., 0] = cv2.medianBlur(lab[..., 0], 5); lab[..., 1] = ref_lab[1]; lab[..., 2] = ref_lab[2]
cielo_fin = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR).astype(np.float32)

# 2) ventana del paisaje lejano, a toda resolucion, desde la panoramica del mirador
LON, LAT, d = rejilla(W)
centro = np.mean([v["centro"] for v in panos[PVALLE]], 0)
fondo = cv2.resize(cielo_fin, (W, H), interpolation=cv2.INTER_CUBIC)
suelo = np.array([70.0, 82.0, 78.0], np.float32)
t = np.clip((np.radians(-1) - LAT) / np.radians(10), 0, 1)[..., None]
fondo = fondo * (1 - t) + suelo * t
clases = np.where(cv2.resize(cielo_ok.astype(np.uint8), (W, H), interpolation=cv2.INTER_NEAREST) > 0, 255, 0).astype(np.uint8)
if VENT is not None:
    img, vis = componer(panos[PVALLE], d)
    cerca = cerca_desde(centro, W)
    cer, c = cielo_de(img, vis, cerca, LAT, minlat=-12.0)
    gan = REF / np.maximum(cer[c & (LAT > 0)].mean(0), 1) if (c & (LAT > 0)).sum() > 1000 else np.ones(3, np.float32)
    lo, la = np.degrees(LON), np.degrees(LAT)
    en = ((lo >= VENT[0]) & (lo <= VENT[1])) if VENT[0] <= VENT[1] else ((lo >= VENT[0]) | (lo <= VENT[1]))
    en &= (la >= VENT[2]) & (la <= VENT[3])
    lejos = vis & ~cerca & ~c & en
    lejos = cv2.morphologyEx(lejos.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0
    usar = (lejos | (c & en))
    # lo cercano que tapa parte de la ventana (una copa, un letrero) se rellena con el paisaje de alrededor, para
    # que el valle siga por detras; despues toda la ventana cuenta, con el borde difuminado unos 2,5 grados
    ys, xs = np.where(en); y0, y1 = ys.min(), ys.max() + 1
    cols = np.where(en.any(0))[0]
    if VENT[0] > VENT[1]:
        giro = W // 2; img = np.roll(img, giro, axis=1); en_r = np.roll(en, giro, axis=1); us_r = np.roll(usar, giro, axis=1)
    else:
        giro = 0; en_r = en; us_r = usar
    cols = np.where(en_r.any(0))[0]; x0, x1 = cols.min(), cols.max() + 1
    rec = np.clip(img[y0:y1, x0:x1] * gan, 0, 255).astype(np.uint8)
    hue = (en_r[y0:y1, x0:x1] & ~us_r[y0:y1, x0:x1]).astype(np.uint8) * 255
    # relleno por filas: el paisaje lejano va en franjas horizontales (cielo, cerros, ciudad), asi que cada tramo
    # tapado de una fila se llena mezclando el color de sus dos extremos conocidos; despues se suaviza un poco
    esc = 1024.0 / rec.shape[1]
    peq = cv2.resize(rec, None, fx=esc, fy=esc, interpolation=cv2.INTER_AREA).astype(np.float32)
    hp = cv2.resize(cv2.dilate(hue, np.ones((9, 9), np.uint8)), (peq.shape[1], peq.shape[0]), interpolation=cv2.INTER_NEAREST) > 0
    xs_ = np.arange(peq.shape[1])
    for yy in range(peq.shape[0]):
        ok_ = ~hp[yy]
        if ok_.any() and not ok_.all():
            for ch in range(3):
                peq[yy, :, ch] = np.interp(xs_, xs_[ok_], peq[yy, ok_, ch])
    sv = cv2.GaussianBlur(peq, (0, 0), 2.5); peq[hp] = sv[hp]
    gra = cv2.resize(np.clip(peq, 0, 255).astype(np.uint8), (rec.shape[1], rec.shape[0]), interpolation=cv2.INTER_CUBIC)
    mh = cv2.GaussianBlur((cv2.dilate(hue, np.ones((9, 9), np.uint8)) > 0).astype(np.float32), (0, 0), 4)[..., None]
    img = img * gan
    img[y0:y1, x0:x1] = rec.astype(np.float32) * (1 - mh) + gra.astype(np.float32) * mh
    if giro:
        img = np.roll(img, -giro, axis=1)
    a = np.clip(cv2.GaussianBlur(en.astype(np.float32), (0, 0), W / 360.0 * 2.5) * 1.6 - 0.3, 0, 1)[..., None]
    fondo = img * a + fondo * (1 - a)
    clases[lejos] = 128
    print("ventana %s desde %s: paisaje lejano %.2f %% de la esfera; ganancia de color %s" % (VENT, PVALLE, 100 * lejos.mean(), gan.round(3)), flush=True)
cv2.imwrite(BASE + ".jpg", np.clip(fondo, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
r = lambda im: np.roll(im, im.shape[1] // 2, axis=1) if VENT is not None and VENT[0] > VENT[1] else im
mini = cv2.resize(r(np.clip(fondo, 0, 255).astype(np.uint8)), (1400, 700), interpolation=cv2.INTER_AREA)
cmini = cv2.cvtColor(cv2.resize(r(clases), (1400, 700), interpolation=cv2.INTER_NEAREST), cv2.COLOR_GRAY2BGR)
cv2.imwrite(BASE + "_mini.jpg", np.vstack([mini[: 460], cmini[: 460]]), [cv2.IMWRITE_JPEG_QUALITY, 84])
open(BASE + "_centro.txt", "w").write("%.4f %.4f %.4f\n" % tuple(centro))
m = np.clip(fondo, 0, 255)[: H // 3].reshape(-1, 3).mean(0)
print("cielo final (tercio de arriba) B %.0f G %.0f R %.0f; centro %s; escrito %s.jpg (%dx%d)" % (m[0], m[1], m[2], centro.round(2), BASE, W, H))
