"""Vuelve opaco el piso de un tramo visto desde arriba, sin inventar nada: solo sube la opacidad de lo que ya hay.
Las escenas de Brush estan hechas de gaussianas tenues apiladas (en el Tramo 2 el 69 % tiene alfa menor a 0,2). Las
camaras caminaron mirando hacia adelante, asi que vieron el piso de refilon: en esos rayos la pila es larga y el piso
sale opaco. Quien mira mas hacia abajo cruza la capa del piso casi de frente, encuentra pocas gaussianas y ve a traves:
son los parches traslucidos junto a los pies. Los tapaba un velo de gaussianas gigantes y tenues que el filtro de
empaque quita (y que de lado se ven como agujas).
Metodo, sobre el mapa de alturas del terreno (t2_terreno.py), celda por celda:
  profundidad optica vertical de la celda = suma de alfa x 2 pi x eje mayor x eje medio de las gaussianas de la capa
  del piso (entre BAJO m por debajo y SOBRE m por encima del terreno), repartida en un disco de 3 sigmas, sobre el area
  de la celda;
  factor de la celda = OBJ / profundidad (entre 1 y KMAX), suavizado con sus vecinas;
y la profundidad optica de cada gaussiana PEQUENA de la capa (eje mayor hasta TAM m) se multiplica por el factor de su
celda: alfa' = 1 - (1 - alfa)^factor. Las grandes no se tocan: son manchas borrosas y volverlas opacas taparia el
detalle. OBJ = 3,5 equivale a un alfa de 0,97 mirando el piso de frente.
Sin salida solo mide (reparto de la profundidad optica vertical cerca de las camaras).
uso: opacar_piso.py <escena.ply> <terreno.npz> <conjunto_con_sparse> [salida.ply] [obj=3.5] [kmax=12] [bajo=0.12] [sobre=0.25] [tam=0.12]"""
import sys, os, shutil, numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import uniform_filter
from scipy.spatial.transform import Rotation

PLY, TER, DS = sys.argv[1:4]
OUT = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] not in ("", "-") else None
OBJ = float(sys.argv[5]) if len(sys.argv) > 5 else 3.5
KMAX = float(sys.argv[6]) if len(sys.argv) > 6 else 12.0
BAJO = float(sys.argv[7]) if len(sys.argv) > 7 else 0.12
SOBRE = float(sys.argv[8]) if len(sys.argv) > 8 else 0.25
TAM = float(sys.argv[9]) if len(sys.argv) > 9 else 0.12


def cabecera(path):
    with open(path, "rb") as f:
        cab = b""
        while not cab.endswith(b"end_header\n"):
            cab += f.readline()
    props, n = [], 0
    for l in cab.decode("ascii", "replace").splitlines():
        p = l.split()
        if p[:2] == ["element", "vertex"]: n = int(p[2])
        elif p[:1] == ["property"]: props.append(p[2])
    return len(cab), n, props


def columnas(path, nombres):
    ini, n, props = cabecera(path)
    mm = np.memmap(path, np.float32, "r", offset=ini, shape=(n, len(props)))
    out = []
    for nm in nombres:
        j = props.index(nm); col = np.empty(n, np.float32)
        for a in range(0, n, 2000000):
            col[a:a + 2000000] = mm[a:a + 2000000, j]
        out.append(col)
    return out


def camaras(ds):
    c = []
    for l in open(os.path.join(ds, "sparse/0/images.txt")):
        p = l.split()
        if len(p) < 10 or l.startswith("#"):
            continue
        q = [float(x) for x in p[1:5]]; t = np.array([float(x) for x in p[5:8]])
        c.append(-Rotation.from_quat([q[1], q[2], q[3], q[0]]).as_matrix().T @ t)
    return np.array(c)


t = np.load(TER); P = t["puntos"].astype(np.float64); CEL = float(t["celda"])
x0, z0 = P[:, 0].min() - CEL / 2, P[:, 2].min() - CEL / 2
ix = np.round((P[:, 0] - x0) / CEL - 0.5).astype(np.int64); iz = np.round((P[:, 2] - z0) / CEL - 0.5).astype(np.int64)
nx, nz = ix.max() + 1, iz.max() + 1
H = np.full((nx, nz), np.nan); H[ix, iz] = P[:, 1]

x, y, z, op, s0, s1, s2 = columnas(PLY, ["x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2"])
gx = np.floor((x - x0) / CEL).astype(np.int64); gz = np.floor((z - z0) / CEL).astype(np.int64)
den = (gx >= 0) & (gx < nx) & (gz >= 0) & (gz < nz)
h = np.full(len(x), np.nan); h[den] = H[gx[den], gz[den]]
capa = den & np.isfinite(h) & (y > h - BAJO) & (y < h + SOBRE)
idx = np.where(capa)[0]
alfa = 1 / (1 + np.exp(-np.clip(op[idx].astype(np.float64), -12, 12)))
s = np.sort(np.exp(np.clip(np.c_[s0[idx], s1[idx], s2[idx]].astype(np.float64), -20, 6)), axis=1)
area = 2 * np.pi * s[:, 2] * s[:, 1]
print("gaussianas %d; en la capa del piso (de %.2f m bajo el terreno a %.2f m sobre el): %d; de eje mayor hasta %.2f m: %d"
      % (len(x), BAJO, SOBRE, len(idx), TAM, (s[:, 2] <= TAM).sum()), flush=True)
# profundidad optica vertical por celda: cada gaussiana reparte alfa x area en un disco de radio 3 sigma (minimo una celda)
tau = np.zeros((nx, nz))
r = np.clip(np.round(3 * s[:, 2] / CEL).astype(int), 0, 12)
cx, cz = gx[idx], gz[idx]
for rad in np.unique(r):
    k = r == rad
    if rad == 0:
        np.add.at(tau, (cx[k], cz[k]), alfa[k] * area[k]); continue
    dd = [(a, b) for a in range(-rad, rad + 1) for b in range(-rad, rad + 1) if a * a + b * b <= rad * rad]
    w = alfa[k] * area[k] / len(dd)
    for a, b in dd:
        u, v = np.clip(cx[k] + a, 0, nx - 1), np.clip(cz[k] + b, 0, nz - 1)
        np.add.at(tau, (u, v), w)
tau /= CEL * CEL
C = camaras(DS)
val = np.isfinite(H)
pc = np.c_[x0 + (np.where(val)[0] + 0.5) * CEL, z0 + (np.where(val)[1] + 0.5) * CEL]
dcam = np.full((nx, nz), np.inf); dcam[val] = cKDTree(C[:, [0, 2]]).query(pc, workers=4)[0]


def resumen(nombre, m):
    v = tau[m]
    print("  %s (%d celdas): mediana %.2f; menos de 1 (alfa < 0,63 de frente): %.1f %%; menos de 2,3 (alfa < 0,9): %.1f %%; menos de 3,5: %.1f %%; sin nada: %.1f %%"
          % (nombre, m.sum(), np.median(v), 100 * (v < 1).mean(), 100 * (v < 2.3).mean(), 100 * (v < 3.5).mean(), 100 * (v < 0.05).mean()), flush=True)


print("profundidad optica vertical del piso:")
resumen("a menos de 0,6 m de las camaras", dcam < 0.6)
resumen("de 0,6 a 1,5 m", (dcam >= 0.6) & (dcam < 1.5))
resumen("de 1,5 a 3 m", (dcam >= 1.5) & val)
if OUT:
    lleno = np.where(val, tau, 0.0)
    peso = uniform_filter(val.astype(np.float64), 3); suave = uniform_filter(lleno, 3) / np.maximum(peso, 1e-6)
    fac = np.clip(OBJ / np.maximum(suave, 1e-3), 1.0, KMAX)
    fac[~val] = 1.0
    peq = s[:, 2] <= TAM
    f = np.where(peq, fac[cx, cz], 1.0)
    alfa_n = np.clip(1 - (1 - np.minimum(alfa, 0.9995)) ** f, 1e-6, 0.9995)
    op_n = op.copy(); op_n[idx] = np.log(alfa_n / (1 - alfa_n)).astype(np.float32)
    shutil.copyfile(PLY, OUT)
    ini, n, props = cabecera(OUT)
    mm = np.memmap(OUT, np.float32, "r+", offset=ini, shape=(n, len(props)))
    j = props.index("opacity")
    for a in range(0, n, 2000000):
        mm[a:a + 2000000, j] = op_n[a:a + 2000000]
    mm.flush(); del mm
    print("factor por celda con piso: mediana %.2f, p90 %.2f, en el tope %.1f %%; gaussianas cambiadas %d; su alfa: mediana %.3f -> %.3f, mayor a 0,9 el %.1f %% -> %.1f %%"
          % (np.median(fac[val]), np.percentile(fac[val], 90), 100 * (fac[val] >= KMAX).mean(), (peq & (f > 1.001)).sum(),
             np.median(alfa[peq]), np.median(alfa_n[peq]), 100 * (alfa[peq] > 0.9).mean(), 100 * (alfa_n[peq] > 0.9).mean()), flush=True)
