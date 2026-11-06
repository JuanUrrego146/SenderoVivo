"""Conjunto de entrenamiento para Brush a partir de la alineacion propia (COLMAP con priores, marco de la escena).
- images/: fotos sin distorsion (SIMPLE_RADIAL a PINHOLE con la misma focal) y las 4K reducidas a ANCHO4K de ancho;
- masks/<nombre>.png (0 = no entrenar): personas, borde invalido de la correccion, cielo (alfa < 0,5 en la escena de
  referencia) y lo lejano (profundidad > LEJOS m). El cielo y lo lejano los sigue poniendo Luma al mezclar, asi Brush
  no inventa niebla ni agujas para imitarlos;
- sparse/0/{cameras,images,points3D}.txt: camaras PINHOLE, poses de la alineacion y los puntos de COLMAP a menos de
  LEJOS m del camino (en planta) con error < 2 px, que Brush usa de arranque.
uso: propia_dataset.py <sparse> <images> <masks> <ref.ply> <track.json> <salida> [ancho4k=1920] [lejos=40]"""
import sys, os, json, numpy as np, cv2
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin
from scipy.spatial.transform import Rotation

SP, IMS, MKS, REF, TRACK, OUT = sys.argv[1:7]
ANCHO4K = int(sys.argv[7]) if len(sys.argv) > 7 else 1920
LEJOS = float(sys.argv[8]) if len(sys.argv) > 8 else 40.0
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
for d in ("sparse/0", "images", "masks"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

# camaras: mapas de correccion a resolucion completa y camara de salida
mapas, salida = {}, {}
with open(os.path.join(OUT, "sparse/0/cameras.txt"), "w") as f:
    for c, (mod, W, H, p) in cams.items():
        if mod == 2:
            fo, cx, cy, k = p
        elif mod == 0:
            fo, cx, cy = p; k = 0.0
        else:
            raise SystemExit("modelo de camara %d no previsto" % mod)
        K = np.array([[fo, 0, cx], [0, fo, cy], [0, 0, 1]])
        mx, my = cv2.initUndistortRectifyMap(K, np.array([k, 0, 0, 0]), None, K, (W, H), cv2.CV_32FC1)
        s = ANCHO4K / W if W > 2000 else 1.0
        w2, h2 = round(W * s), round(H * s)
        mapas[c] = (mx, my, (w2, h2))
        salida[c] = (fo * s, cx * s, cy * s, w2, h2)
        f.write("%d PINHOLE %d %d %.6f %.6f %.6f %.6f\n" % (c, w2, h2, fo * s, fo * s, cx * s, cy * s))
        print("camara %d: %dx%d f %.1f k %.4f (ancho de campo %.1f grados) -> %dx%d"
              % (c, W, H, fo, k, 2 * np.degrees(np.arctan(W / 2 / fo)), w2, h2))

with open(os.path.join(OUT, "sparse/0/images.txt"), "w") as f:
    for i, v in sorted(ims.items()):
        x, y, z, w_ = Rotation.from_matrix(v["R"]).as_quat()
        f.write("%d %.9f %.9f %.9f %.9f %.9f %.9f %.9f %d %s\n\n" % (i, w_, x, y, z, *v["t"], v["cam"], v["name"]))

w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
TT = cKDTree(den[:, [0, 2]])
xyz, rgb, err, vis = colmapbin.leer_puntos(os.path.join(SP, "points3D.bin"))
ok = (TT.query(xyz[:, [0, 2]])[0] < LEJOS) & (err < 2.0) & (np.array([len(t) for t in vis]) >= 3)
with open(os.path.join(OUT, "sparse/0/points3D.txt"), "w") as f:
    for j in np.where(ok)[0]:
        f.write("%d %.6f %.6f %.6f %d %d %d %.4f\n" % (j + 1, *xyz[j], *rgb[j], err[j]))
print("puntos de arranque: %d de %d" % (ok.sum(), len(ok)))

G = render.a_gpu(splat.leer(REF))
tapado = []
for n_, (i, v) in enumerate(sorted(ims.items())):
    mx, my, (w2, h2) = mapas[v["cam"]]
    fo, cx, cy, _, _ = salida[v["cam"]]
    im = cv2.remap(cv2.imread(os.path.join(IMS, v["name"])), mx, my, cv2.INTER_LINEAR)
    valido = cv2.remap(np.full(mx.shape, 255, np.uint8), mx, my, cv2.INTER_NEAREST, borderValue=0)
    mp = os.path.join(MKS, v["name"] + ".png")
    per = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else None
    if per is not None:
        valido = np.minimum(valido, cv2.remap(per, mx, my, cv2.INTER_NEAREST, borderValue=0))
    dst = os.path.join(OUT, "images", v["name"]); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if (w2, h2) != im.shape[1::-1]:
        im = cv2.resize(im, (w2, h2), interpolation=cv2.INTER_AREA)
        valido = cv2.resize(valido, (w2, h2), interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(dst, im, [cv2.IMWRITE_JPEG_QUALITY, 95])
    s = 480 / w2; wr, hr = 480, round(h2 * s)
    _, alfa, prof = render.render(G, v["R"], v["t"], fo * s, fo * s, cx * s, cy * s, wr, hr)
    # La referencia tiene huecos en el piso cercano y en las copas: solo se tapa como cielo lo que en la foto parece
    # cielo (claro y poco saturado, o azul) y ademas la referencia no cubre o ve lejos; lo opaco a mas de LEJOS+20 m
    # en la referencia se tapa por lejano (valle y montanas, que pone Luma).
    hsv = cv2.cvtColor(cv2.resize(im, (wr, hr), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2HSV)
    h_, s_, v_ = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    cielo_foto = ((v_ > 150) & (s_ < 70)) | ((h_ > 90) & (h_ < 130) & (v_ > 120) & (s_ < 170))
    # solo puede ser cielo lo que mira por encima del horizonte (+Y arriba): la hojarasca seca es clara y poco
    # saturada y la referencia tiene huecos en el piso cercano, asi que sin esto se tapaba el piso
    uu, vv = np.meshgrid((np.arange(wr) + 0.5 - cx * s) / (fo * s), (np.arange(hr) + 0.5 - cy * s) / (fo * s))
    dw = np.stack([uu, vv, np.ones_like(uu)], -1) @ v["R"]
    arriba = dw[..., 1] / np.linalg.norm(dw, axis=-1) > np.sin(np.radians(-2))
    cielo = cielo_foto & arriba & ((alfa < 0.5) | (prof > LEJOS))
    cielo = cv2.dilate(cielo.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    lejos = (alfa > 0.9) & (prof > LEJOS + 20)
    quitar = (cielo | lejos).astype(np.uint8)
    m = np.minimum(valido, cv2.resize(np.where(quitar > 0, 0, 255).astype(np.uint8), (w2, h2),
                                      interpolation=cv2.INTER_NEAREST))
    md = os.path.join(OUT, "masks", v["name"] + ".png"); os.makedirs(os.path.dirname(md), exist_ok=True)
    cv2.imwrite(md, m)
    tapado.append((m == 0).mean())
    if n_ % 100 == 0:
        print("%d/%d fotos, tapado medio %.1f %%" % (n_ + 1, len(ims), 100 * np.mean(tapado)), flush=True)
print("listo: %d fotos, tapado medio %.1f %% (personas, cielo y lejos)" % (len(ims), 100 * np.mean(tapado)))
