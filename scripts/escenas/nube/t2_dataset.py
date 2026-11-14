"""Conjunto base del Tramo 2 para Brush (la alineacion ya esta en el marco de la escena: metros, +Y arriba).
Deja en <salida> un conjunto completo (images/, masks/, sparse/0 en texto) con los cuadros de video del modelo, listo
para propia_aplicar_ganancias.py (exposicion por foto) y propia_ds_alfa.py (cielo transparente); los trozos del trazado
los arma despues propia_trozos.py.
- fotos sin distorsion (SIMPLE_RADIAL a PINHOLE con la misma focal), las 4K reducidas a ANCHO de ancho, SIN tocar la
  exposicion;
- mascaras (0 = no entrenar): personas (YOLO, ya calculadas), borde invalido de la correccion y cielo. El cielo va a
  quedar TRANSPARENTE en el entrenamiento y aqui no hay escena de referencia (no hay Luma del Tramo 2), asi que marcar
  de mas borraria superficies reales. Por color no alcanza: el sendero sube, y el piso asoleado cuesta arriba o el
  follaje quemado quedan por encima del horizonte y son claros y sin color, igual que el cielo. Cielo es lo que cumple
  las cuatro cosas: (1) mira a mas de 5 grados sobre el horizonte; (2) es claro y sin color (V > 165 y S < 65) o azul
  (tono 95-125, V > 110, S > 25), en manchas de al menos 40 px a 480 de ancho; (3) en su celda de 8 px (y en las vecinas) NO
  se proyecta ningun punto fiable de COLMAP a menos de 80 m (CIELO_MINV vistas o mas, error menor a CIELO_MAXE px;
  por defecto 4 y 2,0): si se proyecta alguno, ahi hay una superficie y no es cielo; (4) la
  mancha es lisa (el 70 % o mas con desviacion de brillo menor a CIELO_LISO, 6 por defecto, en ventana de 5 px): el
  follaje lavado por un contraluz tiene color de cielo y no tiene puntos, pero conserva textura. Lo lejano NO se tapa.
  Con CIELO_CRECER=1 (zonas de cielo abierto, como la Cumbre) el cielo verificado asi se extiende a todo lo conectado
  a el que tenga color de cielo, este a mas de 3 grados sobre el horizonte, sea liso y no tenga puntos en su celda:
  sin eso las cuatro pruebas dejan sin marcar una franja junto a las copas y el horizonte, y ese cielo se entrenaria.
- se dejan fuera los cuadros movidos (nitidez de _tiempos.csv menor a 0,5 de la mediana de sus 15 vecinos) y los que
  liste el archivo de la variable EXCLUIR (uno por linea);
- sparse/0: camaras PINHOLE, poses y los puntos de COLMAP con error < 2 px y 3 o mas vistas.
Con SOLO_MASCARAS=1 no reescribe las fotos (las lee del propio conjunto, todavia sin igualar): rehace mascaras y sparse
con otra alineacion. Guarda el color medio del cielo de las fotos en <salida>/cielo_media.json.
uso: t2_dataset.py <sparse> <images> <masks> <salida> [ancho4k=1920] [frames_con_tiempos=E:/SenderoCelular2/frames]"""
import sys, os, csv, json, numpy as np, cv2
from concurrent.futures import ThreadPoolExecutor
from scipy.spatial.transform import Rotation
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, IMS, MKS, OUT = sys.argv[1:5]
ANCHO4K = int(sys.argv[5]) if len(sys.argv) > 5 else 1920
FRAMES = sys.argv[6] if len(sys.argv) > 6 else "E:/SenderoCelular2/frames"
SOLO = os.environ.get("SOLO_MASCARAS") == "1"
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = {i: v for i, v in colmapbin.leer_imagenes(os.path.join(SP, "images.bin")).items() if not v["name"].startswith("i360/")}

fuera = set()
for t in sorted({v["name"].split("/")[0] for v in ims.values()}):
    f = os.path.join(FRAMES, t, "_tiempos.csv")
    if not os.path.exists(f):
        continue
    r = list(csv.DictReader(open(f)))
    nit = np.array([float(x["nitidez"]) for x in r])
    med = np.array([np.median(nit[max(0, i - 7):i + 8]) for i in range(len(nit))])
    fuera.update(t + "/" + x["cuadro"] for x, a, b in zip(r, nit, med) if a < 0.5 * b)
nmov = sum(v["name"] in fuera for v in ims.values())
if os.environ.get("EXCLUIR") and os.path.exists(os.environ["EXCLUIR"]):
    fuera.update(l.strip() for l in open(os.environ["EXCLUIR"]) if l.strip())
antes = len(ims)
ims = {i: v for i, v in ims.items() if v["name"] not in fuera}
print("cuadros del modelo %d; fuera %d (movidos %d, el resto por EXCLUIR); quedan %d" % (antes, antes - len(ims), nmov, len(ims)))

mapas, salida = {}, {}
for c, (mod, W, H, p) in cams.items():
    if mod == 2: fo, cx, cy, k = p
    elif mod == 0: fo, cx, cy = p; k = 0.0
    elif mod == 1: fo, cx, cy = 0.5 * (p[0] + p[1]), p[2], p[3]; k = 0.0
    else: raise SystemExit("modelo de camara %d no previsto" % mod)
    K = np.array([[fo, 0, cx], [0, fo, cy], [0, 0, 1]])
    mx, my = cv2.initUndistortRectifyMap(K, np.array([k, 0, 0, 0]), None, K, (W, H), cv2.CV_32FC1)
    s = ANCHO4K / W if W > 2000 else 1.0
    w2, h2 = round(W * s), round(H * s)
    mapas[c] = (mx, my, (w2, h2)); salida[c] = (fo * s, cx * s, cy * s, w2, h2)
    print("camara %d: %dx%d f %.1f k %.4f (ancho de campo %.1f grados) -> %dx%d"
          % (c, W, H, fo, k, 2 * np.degrees(np.arctan(W / 2 / fo)), w2, h2))

xyz, rgb, err, vis = colmapbin.leer_puntos(os.path.join(SP, "points3D.bin"))
nv = np.array([len(t) for t in vis])
MINV = int(os.environ.get('CIELO_MINV', 4)); MAXE = float(os.environ.get('CIELO_MAXE', 2.0))
PUNTOS = xyz[(err < MAXE) & (nv >= MINV)]
print('prueba de cielo: cuentan como superficie %d de %d puntos (vistas >= %d, error < %.1f px)' % (((err < MAXE) & (nv >= MINV)).sum(), len(nv), MINV, MAXE))
CEL = 8
LISO = float(os.environ.get('CIELO_LISO', 6.0))
CRECER = os.environ.get('CIELO_CRECER') == '1'


def una(v):
    n = v["name"]
    dst = os.path.join(OUT, "images", n); md = os.path.join(OUT, "masks", n + ".png")
    mx, my, (w2, h2) = mapas[v["cam"]]; fo, cx, cy, _, _ = salida[v["cam"]]
    if SOLO:
        im = cv2.imread(dst)
        if im is None:
            return None
    else:
        im = cv2.remap(cv2.imread(os.path.join(IMS, n)), mx, my, cv2.INTER_LINEAR)
        if (w2, h2) != im.shape[1::-1]:
            im = cv2.resize(im, (w2, h2), interpolation=cv2.INTER_AREA)
    valido = cv2.remap(np.full(mx.shape, 255, np.uint8), mx, my, cv2.INTER_NEAREST, borderValue=0)
    mp = os.path.join(MKS, n + ".png")
    per = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else None
    if per is not None and per.shape == valido.shape:
        valido = np.minimum(valido, cv2.remap(per, mx, my, cv2.INTER_NEAREST, borderValue=0))
    if (w2, h2) != valido.shape[1::-1]:
        valido = cv2.resize(valido, (w2, h2), interpolation=cv2.INTER_NEAREST)
    s = 480 / w2; wr, hr = 480, round(h2 * s)
    chica = cv2.resize(im, (wr, hr), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(chica, cv2.COLOR_BGR2HSV)
    h_, s_, v_ = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    cielo_foto = ((v_ > 165) & (s_ < 65)) | ((h_ > 95) & (h_ < 125) & (v_ > 110) & (s_ > 25))
    uu, vv = np.meshgrid((np.arange(wr) + 0.5 - cx * s) / (fo * s), (np.arange(hr) + 0.5 - cy * s) / (fo * s))
    dw = np.stack([uu, vv, np.ones_like(uu)], -1) @ v["R"]
    dw /= np.linalg.norm(dw, axis=-1, keepdims=True)
    cielo = (cielo_foto & (dw[..., 1] > np.sin(np.radians(5)))).astype(np.uint8)
    if cielo.any():
        nc, lab, st, _ = cv2.connectedComponentsWithStats(cielo, connectivity=8)
        cielo[np.isin(lab, np.where(st[:, cv2.CC_STAT_AREA] < 40)[0])] = 0
    if cielo.any():
        # prueba geometrica por celdas de 8 px: una celda solo puede ser cielo si ningun punto fiable de COLMAP (a menos
        # de 80 m y delante de la camara) se proyecta en ella ni en sus vecinas. Antes se median metros a lo largo del
        # rayo (radio minimo 0,35 m) y unos pocos puntos a 1 m de la camara tapaban un cono de 20 grados de cielo.
        gh, gw = -(-hr // CEL), -(-wr // CEL)
        pc = (PUNTOS - v["centro"]) @ v["R"].T
        z = pc[:, 2]
        ok = (z > 0.3) & (z < 80)
        uq = pc[ok, 0] / z[ok] * (fo * s) + cx * s; vq = pc[ok, 1] / z[ok] * (fo * s) + cy * s
        den = (uq >= 0) & (uq < wr) & (vq >= 0) & (vq < hr)
        ocup = np.zeros((gh, gw), np.uint8)
        ocup[(vq[den] // CEL).astype(int), (uq[den] // CEL).astype(int)] = 1
        ocup0 = ocup.copy()
        ocup = cv2.dilate(ocup, np.ones((3, 3), np.uint8))
        cielo &= cv2.resize((ocup == 0).astype(np.uint8), (gw * CEL, gh * CEL), interpolation=cv2.INTER_NEAREST)[:hr, :wr]
        if cielo.any():
            # cada mancha que queda debe ser LISA: el cielo y las nubes casi no tienen textura a 480 de ancho y el
            # follaje si, aun lavado por un contraluz (ahi no hay puntos de COLMAP y el color engana). Liso = desviacion
            # del brillo en ventana de 5 px menor a LISO; la mancha se acepta si al menos el 70 % de ella es lisa.
            g = v_.astype(np.float32)
            desv = np.sqrt(np.maximum(cv2.blur(g * g, (5, 5)) - cv2.blur(g, (5, 5)) ** 2, 0))
            nc, lab, st, _ = cv2.connectedComponentsWithStats(cielo, connectivity=8)
            lisa = np.bincount(lab.ravel(), weights=(desv.ravel() < LISO), minlength=nc) / np.maximum(st[:, cv2.CC_STAT_AREA], 1)
            malas = np.where((st[:, cv2.CC_STAT_AREA] < 40) | (lisa < 0.7))[0]
            cielo[np.isin(lab, malas[malas > 0])] = 0
            if CRECER and cielo.any():
                # crecer desde el cielo ya verificado: se suma todo lo conectado a el que tenga color de cielo, este
                # a mas de 3 grados sobre el horizonte, sea liso pixel a pixel y caiga en una celda sin puntos (aqui
                # sin contar las celdas vecinas). Despues entra hasta una celda dentro de las celdas con puntos, pixel
                # a pixel y solo donde hay color de cielo liso (el follaje a contraluz es oscuro y no entra), y rellena
                # los huecos encerrados de menos de 400 px que tienen color de cielo (celdas donde cayo un punto suelto
                # de COLMAP). Asi el cielo abierto queda completo hasta el borde de las copas y no se entrena a medias.
                libre0 = cv2.resize((ocup0 == 0).astype(np.uint8), (gw * CEL, gh * CEL), interpolation=cv2.INTER_NEAREST)[:hr, :wr] > 0
                alto = dw[..., 1] > np.sin(np.radians(3))
                cand = (cielo_foto & alto & (desv < LISO) & libre0) | (cielo > 0)
                nc2, lab2 = cv2.connectedComponents(cand.astype(np.uint8), connectivity=8)
                toca = np.unique(lab2[cielo > 0])
                cielo2 = np.isin(lab2, toca[toca > 0]).astype(np.uint8)
                cand_b = (cielo_foto & alto & (desv < LISO)).astype(np.uint8)
                for _ in range(2):
                    cielo2 = cielo2 | (cv2.dilate(cielo2, np.ones((9, 9), np.uint8)) & cand_b)
                nc3, lab3, st3, _ = cv2.connectedComponentsWithStats((cielo2 == 0).astype(np.uint8), connectivity=4)
                color = np.bincount(lab3.ravel(), weights=(cielo_foto & alto).ravel().astype(np.float64), minlength=nc3) / np.maximum(st3[:, cv2.CC_STAT_AREA], 1)
                relleno = np.where((st3[:, cv2.CC_STAT_AREA] < 400) & (color > 0.8))[0]
                cielo2[np.isin(lab3, relleno[relleno > 0])] = 1
                cielo = cielo2.astype(np.uint8)
    m = np.minimum(valido, cv2.resize(np.where(cielo > 0, 0, 255).astype(np.uint8), (w2, h2), interpolation=cv2.INTER_NEAREST))
    os.makedirs(os.path.dirname(dst), exist_ok=True); os.makedirs(os.path.dirname(md), exist_ok=True)
    if not SOLO:
        cv2.imwrite(dst, im, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(md, m)
    sc = chica[cielo > 0]
    return float((m == 0).mean()), float((cielo > 0).mean()), (sc.sum(0) if len(sc) else np.zeros(3)), len(sc)


orden = [v for _, v in sorted(ims.items())]
hechas, tap, cie, suma, cuenta, validas = 0, [], [], np.zeros(3), 0, []
with ThreadPoolExecutor(5) as ex:
    for v, r in zip(orden, ex.map(una, orden)):
        hechas += 1
        if r is not None:
            validas.append(v); tap.append(r[0]); cie.append(r[1]); suma += r[2]; cuenta += r[3]
        if hechas % 300 == 0:
            print("%d de %d fotos, tapado medio %.1f %%, cielo medio %.1f %%" % (hechas, len(orden), 100 * np.mean(tap), 100 * np.mean(cie)), flush=True)
os.makedirs(os.path.join(OUT, "sparse/0"), exist_ok=True)
with open(os.path.join(OUT, "sparse/0/cameras.txt"), "w") as f:
    for c in sorted({v["cam"] for v in validas}):
        fo, cx, cy, w2, h2 = salida[c]
        f.write("%d PINHOLE %d %d %.6f %.6f %.6f %.6f\n" % (c, w2, h2, fo, fo, cx, cy))
with open(os.path.join(OUT, "sparse/0/images.txt"), "w") as f:
    for i, v in enumerate(validas, 1):
        x, y, z, w_ = Rotation.from_matrix(v["R"]).as_quat()
        f.write("%d %.9f %.9f %.9f %.9f %.9f %.9f %.9f %d %s\n\n" % (i, w_, x, y, z, *v["t"], v["cam"], v["name"]))
ok = (err < 2.0) & (nv >= 3)
with open(os.path.join(OUT, "sparse/0/points3D.txt"), "w") as f:
    for j in np.where(ok)[0]:
        f.write("%d %.6f %.6f %.6f %d %d %d %.4f\n" % (j + 1, *xyz[j], *rgb[j], err[j]))
media = (suma / max(cuenta, 1)).tolist()
json.dump({"media_bgr": media, "pixeles": int(cuenta)}, open(os.path.join(OUT, "cielo_media.json"), "w"))
print("listo: %d fotos, tapado medio %.1f %% (personas, borde y cielo), cielo medio %.1f %%, color medio del cielo BGR %.0f,%.0f,%.0f; puntos %d de %d"
      % (len(validas), 100 * np.mean(tap), 100 * np.mean(cie), *media, ok.sum(), len(ok)), flush=True)
