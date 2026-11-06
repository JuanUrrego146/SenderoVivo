"""Junta varios modelos COLMAP que ya estan en el mismo marco (por ejemplo los que deja pose_prior_mapper alineados a
los priores) en uno solo: camaras renumeradas por modelo, fotos sin repetir (gana el primer modelo), puntos unidos.
uso: propia_juntar.py <salida> <modelo1> <modelo2> ..."""
import sys, os, struct, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin
from scipy.spatial.transform import Rotation

OUT = sys.argv[1]; MODS = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
cams_out, ims_out, pts_out, vistos = {}, [], [], set()
for k, m in enumerate(MODS):
    cams = colmapbin.leer_camaras(os.path.join(m, "cameras.bin"))
    remap = {c: 10 * k + c for c in cams}
    for c, v in cams.items():
        cams_out[remap[c]] = v
    ims = colmapbin.leer_imagenes(os.path.join(m, "images.bin"))
    nuevo = {}
    for i, v in sorted(ims.items()):
        if v["name"] in vistos:
            continue
        vistos.add(v["name"])
        nid = len(ims_out) + 1; nuevo[i] = nid
        ims_out.append((nid, v["R"], v["t"], remap[v["cam"]], v["name"]))
    xyz, rgb, err, vis = colmapbin.leer_puntos(os.path.join(m, "points3D.bin"))
    for j in range(len(xyz)):
        tr = [nuevo[int(i)] for i in vis[j] if int(i) in nuevo]
        pts_out.append((xyz[j], rgb[j], err[j], tr))
    print("%s: %d fotos, %d puntos" % (m, len(nuevo), len(xyz)))
with open(os.path.join(OUT, "cameras.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(cams_out)))
    for c, (mod, w, h, p) in sorted(cams_out.items()):
        f.write(struct.pack("<iiQQ", c, mod, w, h)); f.write(struct.pack("<%dd" % len(p), *p))
with open(os.path.join(OUT, "images.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(ims_out)))
    for nid, R, t, c, n in ims_out:
        x, y, z, w_ = Rotation.from_matrix(R).as_quat()
        f.write(struct.pack("<I4d3dI", nid, w_, x, y, z, *t, c)); f.write(n.encode() + b"\x00"); f.write(struct.pack("<Q", 0))
with open(os.path.join(OUT, "points3D.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(pts_out)))
    for j, (X, c, e, tr) in enumerate(pts_out):
        f.write(struct.pack("<Q3d3Bd", j + 1, *X, *c, e)); f.write(struct.pack("<Q", len(tr)))
        for i in tr:
            f.write(struct.pack("<II", i, 0))
print("juntado en %s: %d fotos, %d puntos, %d camaras" % (OUT, len(ims_out), len(pts_out), len(cams_out)))
