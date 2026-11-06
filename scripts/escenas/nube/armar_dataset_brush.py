"""Arma un dataset COLMAP (texto) para afinar un splat con Brush a partir de fotos registradas contra el splat.
- cameras.txt / images.txt con las poses de registrar_fotos.py (marco del splat) y los intrinsecos de COLMAP;
- images/ con enlaces duros a las fotos originales (4K en las tomas .MOV, 720p en las .MP4);
- masks/ (0 = no entrenar): lo lejano (profundidad > LEJOS m en el splat completo), el cielo (alfa < 0,5) y las personas
  (mascaras YOLO que ya tenia el dataset). Asi Brush solo afina lo cercano y no inventa niebla para explicar el cielo;
- init.ply: la parte del splat a menos de LEJOS m del camino en planta (Brush siempre arranca de init.ply si existe).
Con SOLO_PERSONAS=1 no se tapa lo lejano ni el cielo y init.ply es el splat cercano entero (con su cupula de cielo):
asi el cielo de las fotos lo explica la cupula y nada cercano se estira para imitarlo (lo tapado no se corrige solo).
uso: armar_dataset_brush.py <poses.json> <dataset_colmap> <splat_completo.ply> <splat_cercano.ply> <track.json> <salida> [lejos=30] [min_inliers=60]"""
import sys, os, json, numpy as np, cv2
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin
from scipy.spatial.transform import Rotation

POSES, DS, COMPLETO, CERCANO, TRACK, OUT = sys.argv[1:7]
LEJOS = float(sys.argv[7]) if len(sys.argv) > 7 else 30.0
MININ = int(sys.argv[8]) if len(sys.argv) > 8 else 60
SOLO_PERSONAS = os.environ.get("SOLO_PERSONAS") == "1"
REDIM = int(os.environ.get("REDIM", "0"))      # >0: fotos mas anchas se guardan reducidas a ese ancho (y su camara)


def escala_de(c):
    return REDIM / cams[c][1] if REDIM and cams[c][1] > REDIM else 1.0
poses = json.load(open(POSES))
cams = colmapbin.leer_camaras(os.path.join(DS, "sparse/0/cameras.bin"))
ims = {v["name"]: v for v in colmapbin.leer_imagenes(os.path.join(DS, "sparse/0/images.bin")).values()}
for d in ("sparse/0", "images", "masks"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

usadas = sorted(n for n, p in poses.items() if p["inliers"] >= MININ)
print("fotos registradas %d, con >= %d inliers %d" % (len(poses), MININ, len(usadas)))
cam_ids = sorted({ims[n]["cam"] for n in usadas})
with open(os.path.join(OUT, "sparse/0/cameras.txt"), "w") as f:
    for c in cam_ids:
        mod, w, h, p = cams[c]
        e = escala_de(c)
        f.write("%d PINHOLE %d %d %.6f %.6f %.6f %.6f\n" % (c, round(w * e), round(h * e), p[0] * e, p[1] * e,
                                                             p[2] * e, p[3] * e))
with open(os.path.join(OUT, "sparse/0/images.txt"), "w") as f:
    for i, n in enumerate(usadas, 1):
        R = np.array(poses[n]["R"]); t = np.array(poses[n]["t"])
        x, y, z, w_ = Rotation.from_matrix(R).as_quat()
        f.write("%d %.9f %.9f %.9f %.9f %.9f %.9f %.9f %d %s\n\n" % (i, w_, x, y, z, *t, ims[n]["cam"], n))
open(os.path.join(OUT, "sparse/0/points3D.txt"), "w").close()

# init: lo cercano al camino
g = splat.leer(CERCANO)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
dist = cKDTree(den[:, [0, 2]]).query(g["xyz"][:, [0, 2]])[0]
cerca = dist < LEJOS if not SOLO_PERSONAS else np.ones(len(dist), bool)
splat.escribir(os.path.join(OUT, "init.ply"), {k: v[cerca] for k, v in g.items()})
print("init: %d de %d gaussianas a menos de %.0f m del camino" % (cerca.sum(), len(cerca), LEJOS))

G = None if SOLO_PERSONAS else render.a_gpu(splat.leer(COMPLETO))
tapado = []
for k, n in enumerate(usadas):
    v = ims[n]; mod, W, H, p = cams[v["cam"]]
    dst = os.path.join(OUT, "images", n); os.makedirs(os.path.dirname(dst), exist_ok=True)
    e = escala_de(v["cam"])
    if not os.path.exists(dst):
        if e == 1.0:
            os.link(os.path.join(DS, "images", n), dst)
        else:
            im = cv2.imread(os.path.join(DS, "images", n))
            cv2.imwrite(dst, cv2.resize(im, (round(W * e), round(H * e)), interpolation=cv2.INTER_AREA),
                        [cv2.IMWRITE_JPEG_QUALITY, 95])
    if SOLO_PERSONAS:
        m = np.full((H, W), 255, np.uint8)
    else:
        s = 480 / W; w2, h2 = 480, int(round(H * s))
        _, alfa, prof = render.render(G, np.array(poses[n]["R"]), np.array(poses[n]["t"]), p[0] * s, p[1] * s,
                                      p[2] * s, p[3] * s, w2, h2)
        quitar = (alfa < 0.5) | (prof > LEJOS)
        m = np.where(quitar, 0, 255).astype(np.uint8)
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_NEAREST)
    mp = os.path.join(DS, "masks", n + ".png")
    if os.path.exists(mp):
        per = cv2.imread(mp, cv2.IMREAD_GRAYSCALE)
        if per is not None and per.shape == m.shape:
            m = np.minimum(m, per)
    if SOLO_PERSONAS and m.min() == 255:
        tapado.append(0.0)
        continue
    if e != 1.0:
        m = cv2.resize(m, (round(W * e), round(H * e)), interpolation=cv2.INTER_NEAREST)
    md = os.path.join(OUT, "masks", n + ".png"); os.makedirs(os.path.dirname(md), exist_ok=True)
    cv2.imwrite(md, m)
    tapado.append((m == 0).mean())
    if k % 50 == 0:
        print("%d/%d mascaras, tapado medio %.1f %%" % (k + 1, len(usadas), 100 * np.mean(tapado)), flush=True)
print("listo: %d fotos, tapado medio %.1f %% (cielo, lejos y personas)" % (len(usadas), 100 * np.mean(tapado)))
