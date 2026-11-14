"""Recupera las poses de un modelo de COLMAP 4.1.1 que se cayo al guardarse, a partir de frames.bin.

uso: t1_recuperar_frames.py <carpeta_con_frames.bin> <base.db> <salida_texto> [modelo_de_control]

El mapeador con --input_path sobre un modelo sin frames.bin termina el trabajo y se cae al escribir («The reconstruction
object is broken as image 1 in frame 1 does not exist»): deja cameras.bin, rigs.bin y frames.bin, e images.bin vacio.
frames.bin trae la pose de cada cuadro registrado (rig_from_world) y la imagen que le corresponde; como cada camara de
celular es su propio rig, esa pose es la de la imagen. Formato (little endian): cantidad (uint64) y por cuadro
frame_id (uint32), rig_id (uint32), giro w x y z (4 double), traslado (3 double), cantidad de datos (uint32) y por dato
tipo de sensor (int32), id de sensor (uint32), id de imagen (uint64).
Escribe un modelo en texto (cameras.txt con la camara de cada imagen segun la base, images.txt sin puntos y
points3D.txt vacio) listo para point_triangulator. Con [modelo_de_control] compara los centros con los de ese modelo
(una copia intermedia del mismo mapeador) para confirmar que el formato se leyo bien.
"""
import sys, os, struct, sqlite3, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SRC, DB, OUT = sys.argv[1:4]
CTRL = sys.argv[4] if len(sys.argv) > 4 else None
d = open(os.path.join(SRC, "frames.bin"), "rb").read()
n, = struct.unpack_from("<Q", d, 0); o = 8
poses = {}
for _ in range(n):
    fid, rid = struct.unpack_from("<II", d, o); o += 8
    q = struct.unpack_from("<4d", d, o); o += 32
    t = struct.unpack_from("<3d", d, o); o += 24
    nd, = struct.unpack_from("<I", d, o); o += 4
    for _ in range(nd):
        tipo, sid, did = struct.unpack_from("<iIQ", d, o); o += 16
        poses[did] = (np.array(q), np.array(t), sid)
assert o == len(d), "frames.bin no cuadra con el formato esperado (%d de %d bytes)" % (o, len(d))
con = sqlite3.connect("file:" + DB + "?mode=ro", uri=True, timeout=300)
info = {i: (nm, c) for i, nm, c in con.execute("select image_id, name, camera_id from images")}
cams = colmapbin.leer_camaras(os.path.join(SRC, "cameras.bin"))
MODELOS = {0: "SIMPLE_PINHOLE", 1: "PINHOLE", 2: "SIMPLE_RADIAL", 3: "RADIAL", 4: "OPENCV"}
os.makedirs(OUT, exist_ok=True)
usadas = set()
with open(os.path.join(OUT, "images.txt"), "w") as f:
    for i in sorted(poses):
        q, t, sid = poses[i]; nm, c = info[i]; usadas.add(c)
        f.write("%d %.12f %.12f %.12f %.12f %.9f %.9f %.9f %d %s\n\n" % (i, q[0], q[1], q[2], q[3], t[0], t[1], t[2], c, nm))
with open(os.path.join(OUT, "cameras.txt"), "w") as f:
    for c in sorted(usadas):
        mod, w, h, p = cams[c]
        f.write("%d %s %d %d %s\n" % (c, MODELOS[mod], w, h, " ".join("%.6f" % float(x) for x in p)))
open(os.path.join(OUT, "points3D.txt"), "w").close()
print("cuadros con pose: %d; camaras usadas: %s -> %s" % (len(poses), sorted(usadas), OUT))
if CTRL:
    ref = {v["name"]: v["centro"] for v in colmapbin.leer_imagenes(os.path.join(CTRL, "images.bin")).values()}
    dif = []; C = []
    for i, (q, t, _) in poses.items():
        c = -colmapbin.qvec2rot(q).T @ t; C.append(c)
        if info[i][0] in ref:
            dif.append(np.linalg.norm(c - ref[info[i][0]]))
    C = np.array(C)
    print("control: %d cuadros comunes; diferencia de centros mediana %.4f, p95 %.4f, maxima %.4f (el modelo mide %.2f de punta a punta)"
          % (len(dif), np.median(dif), np.percentile(dif, 95), np.max(dif), np.linalg.norm(C.max(0) - C.min(0))))
