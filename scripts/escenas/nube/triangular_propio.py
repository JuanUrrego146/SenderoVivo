"""Triangula los puntos de un modelo con poses ya conocidas, sin pasar por COLMAP.

uso: triangular_propio.py <modelo_texto> <base.db> <images> <salida_binaria> [min_vistas=3] [max_error=2.0]

Para cuando point_triangulator no sirve: con la base del Tramo 1 (que tiene las vistas 360 declaradas como rig) se cae
en silencio sobre un modelo parcial. Lee cameras.txt e images.txt (poses, sin puntos) y, de la base de COLMAP, los
puntos clave de esas imagenes y las coincidencias verificadas entre ellas (two_view_geometries con 15 o mas):
1) pistas: componentes conexas del grafo de coincidencias (se descartan las que traen dos rasgos de una misma foto);
2) cada pista se triangula como el punto mas cercano a todos sus rayos (minimos cuadrados, en bloque);
3) se quitan las observaciones con mas de 4 px de error o detras de la camara y se vuelve a triangular; quedan los
   puntos con min_vistas o mas, error medio menor que max_error px y rayos abiertos al menos 1,5 grados;
4) color: el del pixel de una de sus fotos (leida reducida).
Escribe un modelo binario completo (cameras.bin, images.bin con los puntos 2D y points3D.bin con las pistas).
Camaras SIMPLE_RADIAL o PINHOLE.
"""
import sys, os, struct, sqlite3, numpy as np, cv2
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
sys.path.insert(0, os.path.dirname(__file__))
import t2_modelo as tm, colmapbin

SP, DB, IMG, OUT = sys.argv[1:5]
MINV = int(sys.argv[5]) if len(sys.argv) > 5 else 3
MAXE = float(sys.argv[6]) if len(sys.argv) > 6 else 2.0
cams = {}
for l in open(os.path.join(SP, "cameras.txt")):
    p = l.split()
    if len(p) >= 5 and not l.startswith("#"):
        cams[int(p[0])] = (p[1], int(p[2]), int(p[3]), [float(x) for x in p[4:]])
ims = {}
for l in open(os.path.join(SP, "images.txt")):
    p = l.split()
    if len(p) == 10 and not l.startswith("#"):
        ims[int(p[0])] = dict(q=np.array([float(x) for x in p[1:5]]), t=np.array([float(x) for x in p[5:8]]), cam=int(p[8]), name=p[9])
ids = sorted(ims); pos = {i: k for k, i in enumerate(ids)}
con = sqlite3.connect("file:" + DB + "?mode=ro", uri=True, timeout=600)
kps, off = [], [0]
for i in ids:
    r, c, d = con.execute("select rows, cols, data from keypoints where image_id = ?", (i,)).fetchone()
    kps.append(np.frombuffer(d, np.float32).reshape(r, c)[:, :2].astype(np.float64)); off.append(off[-1] + r)
off = np.array(off); NN = off[-1]
print("imagenes %d, rasgos %d" % (len(ids), NN), flush=True)
M = 2147483647; ea, eb = [], []; npar = 0
for pid, data in con.execute("select pair_id, data from two_view_geometries where rows >= 15"):
    a, b = divmod(pid, M)
    if a in pos and b in pos:
        mt = np.frombuffer(data, np.uint32).reshape(-1, 2).astype(np.int64)
        ea.append(off[pos[a]] + mt[:, 0]); eb.append(off[pos[b]] + mt[:, 1]); npar += 1
ea = np.concatenate(ea); eb = np.concatenate(eb)
print("pares %d, coincidencias %d" % (npar, len(ea)), flush=True)
nc, lab = connected_components(coo_matrix((np.ones(len(ea), np.int8), (ea, eb)), shape=(NN, NN)), directed=False)
nodos = np.unique(np.r_[ea, eb]); lb = lab[nodos]
img_de = np.searchsorted(off, nodos, side="right") - 1
orden = np.lexsort((img_de, lb)); nodos, lb, img_de = nodos[orden], lb[orden], img_de[orden]
_, ini, cnt = np.unique(lb, return_index=True, return_counts=True)
rep = np.r_[False, (lb[1:] == lb[:-1]) & (img_de[1:] == img_de[:-1])]            # dos rasgos de una misma foto
mala = np.zeros(len(ini), bool); np.logical_or.at(mala, np.searchsorted(lb[ini], lb[rep]), True)
tid_de_obs = np.repeat(np.arange(len(ini)), cnt)
ok_t = (cnt >= MINV) & ~mala
m = ok_t[tid_de_obs]
nodos, img_de, tid = nodos[m], img_de[m], tid_de_obs[m]
_, tid = np.unique(tid, return_inverse=True); NT = tid.max() + 1
print("pistas de %d o mas vistas: %d (descartadas por repetir foto: %d); observaciones %d" % (MINV, NT, int(mala.sum()), len(nodos)), flush=True)

Rs = np.array([tm.qvec2rot(ims[i]["q"]) for i in ids]); ts = np.array([ims[i]["t"] for i in ids]); Cs = -np.einsum("nji,nj->ni", Rs, ts)
par = np.zeros((len(ids), 4))
for k, i in enumerate(ids):
    mod, w, h, p = cams[ims[i]["cam"]]
    par[k] = (p[0], p[1], p[2], p[3]) if mod == "SIMPLE_RADIAL" else (0.5 * (p[0] + p[1]), p[2], p[3], 0.0)
xy = np.vstack(kps)[nodos]
f, cx, cy, kk = par[img_de].T
xd, yd = (xy[:, 0] - cx) / f, (xy[:, 1] - cy) / f
xu, yu = xd.copy(), yd.copy()
for _ in range(4):
    r2 = xu * xu + yu * yu; xu, yu = xd / (1 + kk * r2), yd / (1 + kk * r2)
dc = np.c_[xu, yu, np.ones(len(xu))]; dc /= np.linalg.norm(dc, axis=1, keepdims=True)
dw = np.einsum("nji,nj->ni", Rs[img_de], dc); cw = Cs[img_de]


def triangular(sel):
    P = np.eye(3)[None] - dw[sel][:, :, None] * dw[sel][:, None, :]
    A = np.zeros((NT, 3, 3)); b = np.zeros((NT, 3)); n = np.bincount(tid[sel], minlength=NT)
    np.add.at(A, tid[sel], P); np.add.at(b, tid[sel], np.einsum("nij,nj->ni", P, cw[sel]))
    A[n < 2] = np.eye(3)
    X = np.linalg.solve(A + 1e-12 * np.eye(3), b[..., None])[..., 0]
    md = np.zeros((NT, 3)); np.add.at(md, tid[sel], dw[sel]); md /= np.maximum(np.linalg.norm(md, axis=1, keepdims=True), 1e-9)
    desv = np.zeros(NT); np.maximum.at(desv, tid[sel], np.degrees(np.arccos(np.clip((dw[sel] * md[tid[sel]]).sum(1), -1, 1))))
    return X, n, 2 * desv


def errores(X):
    pc = np.einsum("nij,nj->ni", Rs[img_de], X[tid]) + ts[img_de]
    z = pc[:, 2]; u, v = pc[:, 0] / np.maximum(z, 1e-9), pc[:, 1] / np.maximum(z, 1e-9); r2 = u * u + v * v
    e = np.hypot(f * u * (1 + kk * r2) + cx - xy[:, 0], f * v * (1 + kk * r2) + cy - xy[:, 1])
    return np.where(z > 0.01, e, 1e9)


sel = np.ones(len(nodos), bool)
for vuelta in range(3):
    X, n, ang = triangular(sel)
    e = errores(X)
    sel = (e < 4.0) & (n[tid] >= 2)
X, n, ang = triangular(sel); e = errores(X)
em = np.zeros(NT); np.add.at(em, tid[sel], e[sel]); em /= np.maximum(n, 1)
bien = (n >= MINV) & (em < MAXE) & (ang >= 1.5) & np.isfinite(X).all(1)
print("puntos buenos: %d de %d pistas (vistas >= %d, error medio < %.1f px, apertura >= 1,5 grados); error medio %.2f px; vistas por punto mediana %d"
      % (bien.sum(), NT, MINV, MAXE, em[bien].mean(), np.median(n[bien])), flush=True)

usar = sel & bien[tid]
pid_de_t = np.full(NT, -1, np.int64); pid_de_t[bien] = np.arange(1, bien.sum() + 1)
kp_local = nodos - off[img_de]
p2 = {i: np.zeros(len(kps[k]), tm.DT2) for k, i in enumerate(ids)}
for k, i in enumerate(ids):
    p2[i]["x"] = kps[k][:, 0]; p2[i]["y"] = kps[k][:, 1]; p2[i]["id"] = -1
o = np.argsort(img_de[usar], kind="stable"); iu, ku, tu = img_de[usar][o], kp_local[usar][o], tid[usar][o]
cortes = np.searchsorted(iu, np.arange(len(ids) + 1))
rgb = np.full((NT, 3), 128, np.uint8); tiene = np.zeros(NT, bool)
for k, i in enumerate(ids):
    a, b = cortes[k], cortes[k + 1]
    if a == b:
        continue
    p2[i]["id"][ku[a:b]] = pid_de_t[tu[a:b]]
    falta = ~tiene[tu[a:b]]
    if falta.any():
        im = cv2.imread(os.path.join(IMG, ims[i]["name"]), cv2.IMREAD_REDUCED_COLOR_4)
        if im is not None:
            px = kps[k][ku[a:b][falta]] / 4.0
            xx = np.clip(px[:, 0].astype(int), 0, im.shape[1] - 1); yy = np.clip(px[:, 1].astype(int), 0, im.shape[0] - 1)
            rgb[tu[a:b][falta]] = im[yy, xx, ::-1]; tiene[tu[a:b][falta]] = True
o = np.argsort(tid[usar], kind="stable"); t_o = tid[usar][o]; img_o = np.array(ids, np.uint32)[img_de[usar][o]]; kp_o = kp_local[usar][o].astype(np.uint32)
cortes = np.searchsorted(t_o, np.arange(NT + 1))
pts = {}
for t in np.where(bien)[0]:
    a, b = cortes[t], cortes[t + 1]
    tr = np.zeros(b - a, tm.DTT); tr["img"] = img_o[a:b]; tr["idx"] = kp_o[a:b]
    pts[int(pid_de_t[t])] = dict(xyz=X[t], rgb=tuple(int(c) for c in rgb[t]), err=float(em[t]), track=tr)
MOD = {"SIMPLE_PINHOLE": 0, "PINHOLE": 1, "SIMPLE_RADIAL": 2}
cam = struct.pack("<Q", len(cams)) + b"".join(struct.pack("<IiQQ%dd" % len(p), c, MOD[mod], w, h, *p) for c, (mod, w, h, p) in sorted(cams.items()))
modelo = {i: dict(q=ims[i]["q"], t=ims[i]["t"], cam=ims[i]["cam"], name=ims[i]["name"], p2=p2[i]) for i in ids}
tm.escribir(OUT, cam, modelo, pts)
print("modelo escrito en %s: %d fotos, %d puntos" % (OUT, len(modelo), len(pts)))
