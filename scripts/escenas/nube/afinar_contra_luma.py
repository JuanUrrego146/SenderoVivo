"""Afina una escena ya encajada (Polycam) contra la de Luma de la misma zona, con ICP sobre las
gaussianas opacas cercanas al camino: primero rígido con umbrales decrecientes y al final con escala.
Mide el desfase (mediana de distancia a la gaussiana de Luma más cercana) antes y después, por anillos.
uso: afinar_contra_luma.py <polycam.ply> <luma.ply> <track.json> <salida.ply> <salida_transformacion.json>"""
import sys, os, json, numpy as np, open3d as o3d
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat

PO, LU, TRACK, OUT, OUTJ = sys.argv[1:6]
po = splat.leer(PO); lu = splat.leer(LU)
w = np.array([[p['x'], p['y'], p['z']] for p in json.load(open(TRACK))['sceneWaypoints']])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
TT = cKDTree(den[:, [0, 2]])


def nube(g, radio=15):
    op = splat.sigmoide(g['opacidad'].ravel()) > 0.5
    d, _ = TT.query(g['xyz'][:, [0, 2]])
    p = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(g['xyz'][op & (d < radio)].astype(np.float64)))
    return p.voxel_down_sample(0.05)


def desfase(xyz_po, nombre):
    op = splat.sigmoide(po['opacidad'].ravel()) > 0.5
    d, _ = TT.query(xyz_po[:, [0, 2]])
    Tl = cKDTree(lu['xyz'][splat.sigmoide(lu['opacidad'].ravel()) > 0.5])
    fila = []
    for a, b in [(0, 3), (3, 6), (6, 10), (10, 20)]:
        m = np.where(op & (d >= a) & (d < b))[0]
        idx = np.random.default_rng(0).choice(m, min(30000, len(m)), replace=False)
        fila.append('%d-%d m: %.3f' % (a, b, np.median(Tl.query(xyz_po[idx])[0])))
    print(nombre, ' | '.join(fila))


desfase(po['xyz'], 'antes  ')
src, dst = nube(po), nube(lu)
reg = o3d.pipelines.registration
T = np.eye(4)
for umbral in [0.6, 0.4, 0.25, 0.15]:
    r = reg.registration_icp(src, dst, umbral, T, reg.TransformationEstimationPointToPoint(False),
                             reg.ICPConvergenceCriteria(max_iteration=60))
    T = r.transformation
    print('rigido umbral %.2f: fitness %.3f rmse %.3f' % (umbral, r.fitness, r.inlier_rmse))
r = reg.registration_icp(src, dst, 0.15, T, reg.TransformationEstimationPointToPoint(True),
                         reg.ICPConvergenceCriteria(max_iteration=60))
T = r.transformation
print('con escala: fitness %.3f rmse %.3f' % (r.fitness, r.inlier_rmse))
A = T[:3, :3]; s = float(np.cbrt(np.linalg.det(A))); R = A / s; t = T[:3, 3]
print('escala %.4f, giro %.2f grados, traslacion %s m' % (s, np.degrees(np.arccos(np.clip((np.trace(R) - 1) / 2, -1, 1))), t.round(3)))
h = splat.transformar(po, s, R, t)
desfase(h['xyz'], 'despues')
splat.escribir(OUT, h)
json.dump({'s': s, 'R': R.tolist(), 't': t.tolist(), 'nota': 'aplicada sobre final/cumbre_polycam.ply para llevarla al marco de Luma'}, open(OUTJ, 'w'), indent=1)
print('escrito', OUT)
