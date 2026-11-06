"""Priores de posicion y lista de pares para alinear la Cumbre con COLMAP en el marco de la escena.

Posiciones conocidas: las fotos que registrar_fotos2.py ubico contra la Polycam (poses_cumbre.json). Solo las tomas
cuyo ancho de campo viejo era el correcto (unos 100 grados, gran angular del iPhone) dan priores; en las otras cinco la
camara vieja tenia 77 a 87 grados y su PnP corrio el centro a lo largo del eje, asi que solo sirven para elegir pares.
Los priores van a la tabla pose_priors (marco cartesiano, desviacion PRIOR_STD m) para pose_prior_mapper.

Pares (fotos que se comparan):
- dentro de cada toma: cada cuadro con los 10 siguientes y con los que estan a 12, 15 y 20;
- entre tomas: para cada cuadro con posicion aproximada, los 8 cuadros de otras tomas mas cercanos a menos de RADIO m
  y mirando a menos de 72 grados de su direccion; asi se cosen ida, vuelta y las alturas distintas;
- tomas sin ninguna posicion: contra las tomas del mismo sentido, por tiempo proporcional (+-15 cuadros).
uso: propia_priores_pares.py <db> <poses.json> <pares.txt> [prior_std=0.5] [radio=8]"""
import sys, os, re, json, sqlite3, numpy as np
from collections import defaultdict

DB, POSES, PARES = sys.argv[1:4]
PRIOR_STD = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
RADIO = float(sys.argv[5]) if len(sys.argv) > 5 else 8.0
BUENAS = {"c_CentroAbajo_Ida", "c_CentroCentro_Devuelta", "c_CentroCentro_Ida", "c_DerechaCentro_Devuelta",
          "c_IzquierdaArriba_Devuelta", "c_IzquierdaArriba_Ida", "c_OrbitacionPlataforma", "c_Plataforma_VistaTramo1"}

con = sqlite3.connect(DB)
ims = {n: (i, c) for i, n, c in con.execute("select image_id, name, camera_id from images")}
por_toma = defaultdict(list)
for n in ims:
    t = n.split("/")[0]
    k = int(re.search(r"_(\d+)\.jpg$", n).group(1))
    por_toma[t].append((k, n))
for t in por_toma:
    por_toma[t].sort()

poses = json.load(open(POSES))
reg = defaultdict(dict)   # toma -> k -> (C, d)
for n, p in poses.items():
    if p["inliers"] < 60 or n not in ims:
        continue
    R = np.array(p["R"]); t_ = np.array(p["t"])
    reg[n.split("/")[0]][int(re.search(r"_(\d+)\.jpg$", n).group(1))] = (-R.T @ t_, R[2])

# limpiar saltos: un centro a mas de 1 m de la mediana de sus vecinos de la misma toma se descarta
for t, d in reg.items():
    ks = sorted(d)
    malos = []
    for k in ks:
        vec = [d[j][0] for j in ks if j != k and abs(j - k) <= 6]
        if len(vec) >= 2 and np.linalg.norm(d[k][0] - np.median(vec, axis=0)) > 1.0:
            malos.append(k)
    for k in malos:
        del d[k]
    print("%-28s registradas %3d (descartadas por salto %d)%s" % (t, len(d), len(malos), "  [prior]" if t in BUENAS else ""))

# posicion aproximada de todos los cuadros: interpolada entre registrados a menos de 6 cuadros
aprox = {}
for t, lst in por_toma.items():
    d = reg.get(t, {})
    ks = np.array(sorted(d))
    if len(ks) < 2:
        continue
    C = np.array([d[k][0] for k in ks]); D = np.array([d[k][1] for k in ks])
    for k, n in lst:
        j = np.searchsorted(ks, k)
        if k in d:
            aprox[n] = d[k]
        elif 0 < j < len(ks) and ks[j] - ks[j - 1] <= 12 and min(k - ks[j - 1], ks[j] - k) <= 6:
            a = (k - ks[j - 1]) / (ks[j] - ks[j - 1])
            dd = (1 - a) * D[j - 1] + a * D[j]
            aprox[n] = ((1 - a) * C[j - 1] + a * C[j], dd / np.linalg.norm(dd))
print("cuadros con posicion aproximada: %d de %d" % (len(aprox), len(ims)))

# priores
con.execute("delete from pose_priors")
cov = (np.eye(3) * PRIOR_STD ** 2).astype(np.float64)
nan3 = np.full(3, np.nan)
npri = 0
for t in BUENAS:
    for k, (C, _) in reg.get(t, {}).items():
        n = [nn for kk, nn in por_toma[t] if kk == k][0]
        iid, cid = ims[n]
        con.execute("insert into pose_priors (pose_prior_id, corr_data_id, corr_sensor_id, corr_sensor_type, position, "
                    "position_covariance, gravity, coordinate_system) values (?,?,?,?,?,?,?,?)",
                    (iid, iid, cid, 0, np.asarray(C, np.float64).tobytes(), cov.T.tobytes(), nan3.tobytes(), 1))
        npri += 1
con.commit()
print("priores escritos: %d (desviacion %.2f m)" % (npri, PRIOR_STD))

pares = set()
def par(a, b):
    if a != b:
        pares.add((a, b) if a < b else (b, a))

for t, lst in por_toma.items():
    ns = [n for _, n in lst]
    for i in range(len(ns)):
        for s in list(range(1, 11)) + [12, 15, 20]:
            if i + s < len(ns):
                par(ns[i], ns[i + s])
nseq = len(pares)

nom = list(aprox)
C = np.array([aprox[n][0] for n in nom]); D = np.array([aprox[n][1] for n in nom])
T = np.array([n.split("/")[0] for n in nom])
for i, n in enumerate(nom):
    dist = np.linalg.norm(C - C[i], axis=1)
    ok = (T != T[i]) & (dist < RADIO) & (D @ D[i] > 0.31)
    idx = np.where(ok)[0]
    costo = dist[idx] + 3.0 * (1 - D[idx] @ D[i])
    for j in idx[np.argsort(costo)[:8]]:
        par(n, nom[j])
nesp = len(pares) - nseq

# tomas sin posiciones: por tiempo proporcional contra las del mismo sentido
sin = [t for t in por_toma if t not in reg or len(reg[t]) < 2]
for t in sin:
    sentido = t.split("_")[-1].lower()
    otras = [o for o in por_toma if o != t and o.split("_")[-1].lower() == sentido and o not in sin]
    a = [n for _, n in por_toma[t]]
    for o in otras:
        b = [n for _, n in por_toma[o]]
        for i in range(0, len(a), 2):
            c = int(round(i / max(1, len(a) - 1) * (len(b) - 1)))
            for j in range(max(0, c - 15), min(len(b), c + 16), 3):
                par(a[i], b[j])
    print("toma sin posiciones %s: pares por tiempo contra %s" % (t, otras))
with open(PARES, "w") as f:
    for a, b in sorted(pares):
        f.write("%s %s\n" % (a, b))
print("pares: %d dentro de cada toma, %d entre tomas por cercania, %d por tiempo; total %d"
      % (nseq, nesp, len(pares) - nseq - nesp, len(pares)))
