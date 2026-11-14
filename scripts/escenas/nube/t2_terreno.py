"""Mapa de alturas del terreno del corredor de un tramo, sacado de la escena ya entrenada.
Sirve para corregir las mascaras de cielo: el piso asoleado (claro, sin color, liso y sin puntos de COLMAP) cumple
las cuatro pruebas de cielo de t2_dataset.py y el entrenamiento lo deja transparente; con el terreno a la mano, un
pixel cuyo rayo cae sobre el terreno no puede ser cielo (t2_piso_no_cielo.py).
Metodo: rejilla de CELDA m en el plano XZ, solo en las celdas a menos de RADIO m (en planta) de alguna camara del
conjunto. En cada celda la altura es el percentil 10 de la Y de las gaussianas con opacidad mayor a OPMIN que caen en
ella y que estan entre BAJOCAM m por debajo y ALTO m por encima de la camara mas cercana (el piso queda debajo de quien
graba; ALTO deja entrar el talud). Despues se quitan las celdas con menos de MINN gaussianas, se suaviza con mediana
de 5 celdas y los huecos se rellenan por interpolacion lineal entre las celdas vecinas, que es justo lo que hace falta
donde el piso quedo transparente. Lee del .ply solo las columnas que usa.
uso: t2_terreno.py <escena.ply> <conjunto_con_sparse> <salida.npz> [radio=3.0] [celda=0.1] [alto=1.0] [opmin=0.1] [minn=3] [bajo_camara=3.0]
Las medidas van en unidades de la escena: la Cumbre esta en el marco de la Polycam, donde las camaras quedan a 2,5
unidades del piso (casi el doble que en los tramos), y ahi se usan radio 6, celda 0.2, alto 2 y bajo_camara 5."""
import sys, os, numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import median_filter
from scipy.interpolate import griddata
from scipy.spatial.transform import Rotation

PLY, DS, OUT = sys.argv[1:4]
RADIO = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
CEL = float(sys.argv[5]) if len(sys.argv) > 5 else 0.1
ALTO = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
OPMIN = float(sys.argv[7]) if len(sys.argv) > 7 else 0.1
MINN = int(sys.argv[8]) if len(sys.argv) > 8 else 3
BAJOCAM = float(sys.argv[9]) if len(sys.argv) > 9 else 3.0      # hasta cuanto por debajo de la camara puede estar el piso


def camaras(ds):
    c = []
    for l in open(os.path.join(ds, "sparse/0/images.txt")):
        p = l.split()
        if len(p) < 10 or l.startswith("#"):
            continue
        q = [float(x) for x in p[1:5]]; t = np.array([float(x) for x in p[5:8]])
        R = Rotation.from_quat([q[1], q[2], q[3], q[0]]).as_matrix()
        c.append(-R.T @ t)
    return np.array(c)


def columnas(path, nombres):
    with open(path, "rb") as f:
        cab = b""
        while not cab.endswith(b"end_header\n"):
            cab += f.readline()
        props, n = [], 0
        for l in cab.decode("ascii", "replace").splitlines():
            p = l.split()
            if p[:2] == ["element", "vertex"]: n = int(p[2])
            elif p[:1] == ["property"]: props.append(p[2])
        ini = len(cab)
    mm = np.memmap(path, np.float32, "r", offset=ini, shape=(n, len(props)))
    out = []
    for nm in nombres:
        j = props.index(nm); col = np.empty(n, np.float32)
        for a in range(0, n, 2000000):
            col[a:a + 2000000] = mm[a:a + 2000000, j]
        out.append(col)
    return out


C = camaras(DS)
x, y, z, op = columnas(PLY, ["x", "y", "z", "opacity"])
print("gaussianas %d; camaras %d" % (len(x), len(C)), flush=True)
arbol = cKDTree(C[:, [0, 2]])
ok = (1 / (1 + np.exp(-op))) > OPMIN
ok &= (x > C[:, 0].min() - RADIO) & (x < C[:, 0].max() + RADIO) & (z > C[:, 2].min() - RADIO) & (z < C[:, 2].max() + RADIO)
x, y, z = x[ok], y[ok], z[ok]
d, j = arbol.query(np.c_[x, z], distance_upper_bound=RADIO, workers=4)
ok = np.isfinite(d)
x, y, z, j = x[ok], y[ok], z[ok], j[ok]
dy = y - C[j, 1]
ok = (dy > -BAJOCAM) & (dy < ALTO)
x, y, z, dy = x[ok], y[ok], z[ok], dy[ok]
print("en el corredor de %.1f m: %d gaussianas" % (RADIO, len(x)), flush=True)
h, b = np.histogram(dy, bins=np.arange(-BAJOCAM, ALTO + 0.01, 0.2))
print("altura respecto a la camara mas cercana (m: miles): " + " ".join("%.1f:%d" % (b[i], h[i] // 1000) for i in range(len(h))), flush=True)

x0, z0 = x.min(), z.min()
ix = ((x - x0) / CEL).astype(np.int64); iz = ((z - z0) / CEL).astype(np.int64)
nx, nz = ix.max() + 1, iz.max() + 1
cel = ix * nz + iz
orden = np.lexsort((y, cel))
cel_o, y_o = cel[orden], y[orden]
u, ini, cnt = np.unique(cel_o, return_index=True, return_counts=True)
alt = y_o[ini + (0.10 * cnt).astype(np.int64)]
H = np.full((nx, nz), np.nan, np.float32)
bueno = cnt >= MINN
H[u[bueno] // nz, u[bueno] % nz] = alt[bueno]
# celdas del corredor (a menos de RADIO de una camara), tengan o no gaussianas
gx, gz = np.meshgrid(np.arange(nx), np.arange(nz), indexing="ij")
cx_, cz_ = x0 + (gx + 0.5) * CEL, z0 + (gz + 0.5) * CEL
dc, jc = arbol.query(np.c_[cx_.ravel(), cz_.ravel()], distance_upper_bound=RADIO, workers=4)
corr = np.isfinite(dc).reshape(nx, nz)
con = np.isfinite(H) & corr
print("celdas del corredor %d; con piso medido %d (%.1f %%)" % (corr.sum(), con.sum(), 100 * con.sum() / corr.sum()), flush=True)
# mediana de 5 celdas sobre lo medido (los huecos no cuentan: se rellenan con el vecino mas cercano solo para el filtro)
pts = np.c_[gx[con], gz[con]]
llena = griddata(pts, H[con], (gx, gz), method="nearest")
suave = median_filter(llena, size=5)
lin = griddata(pts, suave[con], (gx, gz), method="linear")
final = np.where(con, suave, lin)
final[~corr] = np.nan
val = np.isfinite(final)
P = np.c_[cx_[val], final[val], cz_[val]].astype(np.float32)
medido = con[val]
np.savez_compressed(OUT, puntos=P, medido=medido, celda=CEL, radio=RADIO)
camy = C[jc.reshape(nx, nz)[val], 1]
print("terreno: %d puntos (%d medidos, %d rellenados); altura de las camaras sobre el terreno bajo ellas: mediana %.2f m (p10 %.2f, p90 %.2f)"
      % (len(P), medido.sum(), (~medido).sum(), np.median((camy - P[:, 1])[dc.reshape(nx, nz)[val] < 0.3]),
         *np.percentile((camy - P[:, 1])[dc.reshape(nx, nz)[val] < 0.3], [10, 90])), flush=True)
