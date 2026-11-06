"""Lleva al marco de la escena una alineacion global en la que la ida y la vuelta quedaron con escalas distintas.
La ida y la vuelta miran en sentidos opuestos y comparten pocas vistas, asi que el alineador global las une con un
eslabon debil y les deja escalas distintas (3,29 contra 2,10 en la Cumbre); por dentro cada grupo es coherente (calza
con sus posiciones conocidas a 0,35-0,41 m de mediana, parejo en todas sus tomas). Aqui cada grupo recibe su propia
transformacion de similitud estimada con sus posiciones conocidas (registrar_fotos2 contra la Polycam, solo tomas de
lente correcto, descartando residuos de mas de 3 medianas). Los puntos 3D van con el grupo que mas los ve.
Escribe un modelo binario (cameras.bin, images.bin sin puntos 2D, points3D.bin) en <salida>.
uso: propia_dos_grupos.py <sparse_global> <poses.json> <salida>"""
import sys, os, json, struct, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin
from scipy.spatial.transform import Rotation

SP, POSES, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
BUENAS = {"c_CentroAbajo_Ida", "c_CentroCentro_Devuelta", "c_CentroCentro_Ida", "c_DerechaCentro_Devuelta",
          "c_IzquierdaArriba_Devuelta", "c_IzquierdaArriba_Ida", "c_OrbitacionPlataforma", "c_Plataforma_VistaTramo1"}


def grupo(t):
    return "ida" if (t.endswith("_Ida") or "Orbitacion" in t) else "vuelta"


def umeyama(A, B):
    ma, mb = A.mean(0), B.mean(0); a, b = A - ma, B - mb
    U, S, Vt = np.linalg.svd(b.T @ a / len(A)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt; s = (S * np.diag(D)).sum() / ((a ** 2).sum() / len(A)); return s, R, mb - s * R @ ma


cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
P = json.load(open(POSES))
T = {}
for g in ("ida", "vuelta"):
    A, B = [], []
    for v in ims.values():
        t = v["name"].split("/")[0]; p = P.get(v["name"])
        if t in BUENAS and grupo(t) == g and p and p["inliers"] >= 60:
            A.append(v["centro"]); B.append(-np.array(p["R"]).T @ np.array(p["t"]))
    A, B = np.array(A), np.array(B)
    ok = np.ones(len(A), bool)
    for _ in range(3):
        s, R, t = umeyama(A[ok], B[ok])
        r = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
        ok = r < 3 * np.median(r[ok])
    T[g] = (s, R, t)
    print("%-6s referencias %d (usadas %d)  escala %.4f  residuo mediano %.3f m  p90 %.3f m"
          % (g, len(A), ok.sum(), s, np.median(r[ok]), np.percentile(r[ok], 90)))

with open(os.path.join(OUT, "cameras.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(cams)))
    for c, (mod, w, h, p) in cams.items():
        f.write(struct.pack("<iiQQ", c, mod, w, h)); f.write(struct.pack("<%dd" % len(p), *p))
grupo_im = {}
with open(os.path.join(OUT, "images.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(ims)))
    for i, v in sorted(ims.items()):
        g = grupo(v["name"].split("/")[0]); grupo_im[i] = g
        s, R, t = T[g]
        C = s * R @ v["centro"] + t
        Rw = v["R"] @ R.T
        tw = -Rw @ C
        x, y, z, w_ = Rotation.from_matrix(Rw).as_quat()
        f.write(struct.pack("<I4d3dI", i, w_, x, y, z, *tw, v["cam"]))
        f.write(v["name"].encode() + b"\x00"); f.write(struct.pack("<Q", 0))
xyz, rgb, err, vis = colmapbin.leer_puntos(os.path.join(SP, "points3D.bin"))
with open(os.path.join(OUT, "points3D.bin"), "wb") as f:
    f.write(struct.pack("<Q", len(xyz)))
    for j in range(len(xyz)):
        gs = [grupo_im.get(int(i)) for i in vis[j]]
        g = "ida" if gs.count("ida") > gs.count("vuelta") else "vuelta"
        s, R, t = T[g]
        X = s * R @ xyz[j] + t
        f.write(struct.pack("<Q3d3Bd", j + 1, *X, *rgb[j], err[j]))
        f.write(struct.pack("<Q", len(vis[j])))
        for i in vis[j]:
            f.write(struct.pack("<II", int(i), 0))
print("modelo escrito en %s: %d fotos, %d puntos" % (OUT, len(ims), len(xyz)))
