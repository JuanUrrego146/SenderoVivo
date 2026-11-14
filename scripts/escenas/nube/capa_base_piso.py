"""Capa base bajo el piso de un tramo: una lamina de gaussianas planas y opacas justo debajo del terreno, con el color
medio del piso de cada punto. No cambia ninguna gaussiana entrenada.
Por que: las camaras caminaron mirando hacia adelante y vieron el piso de refilon. Brush lo dejo hecho de gaussianas
tenues apiladas (profundidad optica vertical mediana de 2,0 sobre el camino del Tramo 2: alfa de 0,87 mirando de
frente, y 0,7 a los lados), opaco para quien mira como las camaras y traslucido para quien mira hacia abajo. Subirles
la opacidad no alcanza (de 16,8 % a 10,8 % de la mitad de abajo de la vista con alfa menor a 0,9, mirando 45 grados
hacia abajo) y quema lo claro. Con la capa base, el rayo que atraviesa el piso real encuentra debajo su mismo color:
el detalle sigue saliendo de lo entrenado y donde era traslucido se ve una base del color del sitio en vez del fondo.
Metodo, sobre el mapa de alturas (t2_terreno.py, celdas de 10 cm):
- celdas con piso MEDIDO, mas los huecos chicos entre ellas (cierre morfologico de CIERRE celdas); las zonas grandes
  sin medir no se rellenan: ahi no se sabe si hay piso;
- color de la celda: media de los f_dc de las gaussianas del fondo de la capa del piso (de BAJO m por debajo a
  FONDO_COLOR m por encima del terreno), pesada por alfa x area, y suavizada con sus vecinas (gaussiana de SUAVE celdas);
- una gaussiana por celda: disco de SIGMA m de radio y 8 mm de grosor, acostado sobre la pendiente del terreno,
  HUNDIR m por debajo de la altura del mapa (que ya es el percentil 10 de la capa: queda bajo el 90 % de lo real),
  con alfa ALFA y sin armonicos de grado 1.
uso: capa_base_piso.py <escena.ply> <terreno.npz> <salida.ply> [hundir=0.05] [sigma=0.055] [alfa=0.97] [cierre=3] [suave=1.2] [bajo=0.12] [sobre=0.25] [fondo_color=0.04] [track=<trazado.json>] [picado=35]
     (la salida es la escena con la capa anadida al final; con solo=1 como ultimo argumento escribe solo la capa)"""
import sys, os, numpy as np
from scipy.ndimage import binary_closing, gaussian_filter, distance_transform_edt

args = [a for a in sys.argv[1:] if a != "solo=1" and not a.startswith("track=") and not a.startswith("picado=")]
SOLO = "solo=1" in sys.argv
TRACK = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("track=")), None)
# el color se toma como se ve caminando: hacia adelante y PICADO grados hacia abajo. En una escena que se recorre en
# los dos sentidos y girando (la Cumbre) va picado=90: directo hacia abajo, que no depende del rumbo.
PICADO = float(next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("picado=")), 35.0))
PLY, TER, OUT = args[:3]
num = lambda i, d: float(args[i]) if len(args) > i else d
HUNDIR, SIGMA, ALFA, CIERRE, SUAVE, BAJO, SOBRE = num(3, 0.05), num(4, 0.055), num(5, 0.97), int(num(6, 3)), num(7, 1.2), num(8, 0.12), num(9, 0.25)
FONDO_COLOR = num(10, 0.04)
C0 = 0.28209479177387814


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
    return cab, n, props


def columnas(path, nombres):
    cab, n, props = cabecera(path)
    mm = np.memmap(path, np.float32, "r", offset=len(cab), shape=(n, len(props)))
    out = []
    for nm in nombres:
        j = props.index(nm); col = np.empty(n, np.float32)
        for a in range(0, n, 2000000):
            col[a:a + 2000000] = mm[a:a + 2000000, j]
        out.append(col)
    return out


t = np.load(TER); P = t["puntos"].astype(np.float64); MED = t["medido"]; CEL = float(t["celda"])
x0, z0 = P[:, 0].min() - CEL / 2, P[:, 2].min() - CEL / 2
ix = np.round((P[:, 0] - x0) / CEL - 0.5).astype(np.int64); iz = np.round((P[:, 2] - z0) / CEL - 0.5).astype(np.int64)
nx, nz = ix.max() + 1, iz.max() + 1
H = np.full((nx, nz), np.nan); H[ix, iz] = P[:, 1]
med = np.zeros((nx, nz), bool); med[ix, iz] = MED
val = np.isfinite(H)
usar = binary_closing(med, iterations=CIERRE) & val if CIERRE > 0 else med

x, y, z, op, s0, s1, s2, d0, d1, d2 = columnas(PLY, ["x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2", "f_dc_0", "f_dc_1", "f_dc_2"])
gx = np.floor((x - x0) / CEL).astype(np.int64); gz = np.floor((z - z0) / CEL).astype(np.int64)
den = (gx >= 0) & (gx < nx) & (gz >= 0) & (gz < nz)
h = np.full(len(x), np.nan); h[den] = H[gx[den], gz[den]]
idx = np.where(den & np.isfinite(h) & (y > h - BAJO) & (y < h + SOBRE))[0]
alfa = 1 / (1 + np.exp(-np.clip(op[idx].astype(np.float64), -12, 12)))
s = np.sort(np.exp(np.clip(np.c_[s0[idx], s1[idx], s2[idx]].astype(np.float64), -20, 6)), axis=1)
w = alfa * s[:, 2] * s[:, 1]
w[s[:, 2] > 0.3] = 0                      # las manchas grandes no dicen el color del sitio
# el color sale solo del FONDO de la capa (hasta FONDO_COLOR m sobre el terreno): la capa base continua lo que hay
# mas abajo. En tierra desnuda es el mismo color de la superficie; en paja o pasto es la sombra entre las hojas, y no
# la media de hojas claras y sombra, que deja una neblina clara en los huecos.
w[y[idx] > h[idx] + FONDO_COLOR] = 0
W = np.zeros((nx, nz)); np.add.at(W, (gx[idx], gz[idx]), w)
col = np.zeros((nx, nz, 3))
dc = np.c_[d0[idx], d1[idx], d2[idx]].astype(np.float64)
cab0, n0, props0 = cabecera(PLY)
if TRACK and "f_rest_8" in props0 and "f_rest_9" not in props0:
    # el f_dc solo no es el color que se ve: Brush reparte parte del color en los armonicos de grado 1 (en el Tramo 1
    # el f_dc del camino sale lila y lo corrige el grado 1). Se evalua el color en la direccion en que mira quien
    # camina por el trazado (la del tramo mas cercano, PICADO grados hacia abajo) y ese color queda horneado.
    import json
    from scipy.spatial import cKDTree
    wp = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
    tg = np.gradient(wp, axis=0); tg[:, 1] = 0; tg /= np.maximum(np.linalg.norm(tg, axis=1, keepdims=True), 1e-9)
    jt = cKDTree(wp[:, [0, 2]]).query(np.c_[x[idx], z[idx]], workers=4)[1]
    dv = tg[jt] * np.cos(np.radians(PICADO)) + np.array([0, -1.0, 0]) * np.sin(np.radians(PICADO))
    C1 = 0.4886025119029199
    rest = np.stack(columnas(PLY, ["f_rest_%d" % i for i in range(9)]), 1)[idx].astype(np.float64).reshape(-1, 3, 3)
    base = np.stack([-dv[:, 1], dv[:, 2], -dv[:, 0]], 1) * C1          # (-y, z, -x), como en splat.base_sh
    dc = np.clip(dc + (rest * base[:, None, :]).sum(2) / C0, -0.5 / C0, 0.5 / C0)
    print("color con armonicos de grado 1 en la direccion del recorrido (picado %.0f grados)" % PICADO, flush=True)
for k in range(3):
    np.add.at(col[..., k], (gx[idx], gz[idx]), w * dc[:, k])
# suavizado normalizado: cada celda toma la media pesada de su vecindad; las celdas sin color heredan la del vecino
Ws = gaussian_filter(W, SUAVE)
cs = np.stack([gaussian_filter(col[..., k], SUAVE) for k in range(3)], -1) / np.maximum(Ws[..., None], 1e-12)
sin = Ws < 1e-9
if sin.any():
    j = distance_transform_edt(sin, return_distances=False, return_indices=True)
    cs = cs[j[0], j[1]]
# pendiente del terreno (alturas rellenadas con el vecino para que el gradiente no se rompa en el borde)
Hl = H.copy()
if (~val).any():
    j = distance_transform_edt(~val, return_distances=False, return_indices=True)
    Hl = H[j[0], j[1]]
Hl = gaussian_filter(Hl, 1.0)
dhx, dhz = np.gradient(Hl, CEL)
n = np.stack([-dhx, np.ones_like(dhx), -dhz], -1)
lim = np.tan(np.radians(60))
g = np.hypot(n[..., 0], n[..., 2]); esc = np.where(g > lim, lim / np.maximum(g, 1e-9), 1.0)
n[..., 0] *= esc; n[..., 2] *= esc
n /= np.linalg.norm(n, axis=-1, keepdims=True)
ci, cj = np.where(usar)
N = len(ci)
nn = n[ci, cj]
pos = np.c_[x0 + (ci + 0.5) * CEL, H[ci, cj], z0 + (cj + 0.5) * CEL] - HUNDIR * nn
# cuaternion (w, x, y, z) que lleva el eje Y al normal del terreno
eje = np.cross(np.tile([0, 1.0, 0], (N, 1)), nn)
sen = np.linalg.norm(eje, axis=1); ang = np.arctan2(sen, nn[:, 1])
eje = eje / np.maximum(sen[:, None], 1e-12)
q = np.c_[np.cos(ang / 2), eje * np.sin(ang / 2)[:, None]]
q[sen < 1e-9] = [1, 0, 0, 0]

cab, n_in, props = cabecera(PLY)
fila = np.zeros((N, len(props)), np.float32)
pi = {p: i for i, p in enumerate(props)}
fila[:, pi["x"]], fila[:, pi["y"]], fila[:, pi["z"]] = pos[:, 0], pos[:, 1], pos[:, 2]
for k in range(3):
    fila[:, pi["f_dc_%d" % k]] = cs[ci, cj, k]
fila[:, pi["opacity"]] = np.log(ALFA / (1 - ALFA))
fila[:, pi["scale_0"]] = np.log(SIGMA); fila[:, pi["scale_1"]] = np.log(0.008); fila[:, pi["scale_2"]] = np.log(SIGMA)
for k in range(4):
    fila[:, pi["rot_%d" % k]] = q[:, k]
cab_n = cab.replace(b"element vertex %d" % n_in, b"element vertex %d" % (N if SOLO else n_in + N))
with open(OUT, "wb") as f:
    f.write(cab_n)
    if not SOLO:
        mm = np.memmap(PLY, np.float32, "r", offset=len(cab), shape=(n_in, len(props)))
        for a in range(0, n_in, 2000000):
            f.write(np.ascontiguousarray(mm[a:a + 2000000]).tobytes())
    f.write(fila.tobytes())
rgb = np.clip(cs[ci, cj] * C0 + 0.5, 0, 1)
print("capa base: %d gaussianas (celdas medidas %d, huecos chicos cerrados %d) sobre %d de la escena; color medio RGB %.2f %.2f %.2f; pendiente mediana %.0f grados"
      % (N, med.sum(), N - (usar & med).sum(), n_in, *rgb.mean(0), np.degrees(np.median(ang))))
