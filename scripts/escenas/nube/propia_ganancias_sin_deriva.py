"""Quita la deriva lenta de las exposiciones de propia_ganancias.py y acota los valores extremos.
En un tramo largo los pares enlazan sobre todo cuadros vecinos, asi que un sesgo pequeno por par se acumula a lo largo
del recorrido: en el Tramo 2 la exposicion mediana por decimo del recorrido iba de 3,41 a 0,80 en la ida y de 2,13 a
0,33 en la vuelta, y habia fotos con 0,09 y 11,25. Aplicar eso oscurece un extremo del tramo y aclara el otro, y deja
la ida y la vuelta distintas en el mismo lugar. Lo que si es fiable es lo LOCAL: la diferencia entre tomas en el mismo
punto del recorrido y los cambios rapidos dentro de una toma.
Metodo: por sentido (tomas _Ida y tomas _Devuelta por separado) se calcula la tendencia comun de log(e) contra el
avance u de cada cuadro dentro de su toma (0 a 1): mediana movil de todas las tomas del sentido en una ventana de
+-VENT de u, suavizada. Esa tendencia se resta, por canal. Las tomas que no son de ida ni de vuelta se dejan igual.
Al final e se acota a [EMIN, EMAX] y se informa cuantas fotos tocaron el tope: esas conviene mirarlas o sacarlas.
uso: propia_ganancias_sin_deriva.py <ganancias.json> <salida.json> [vent=0.06] [emin=0.4] [emax=2.5]"""
import sys, re, json, numpy as np
from collections import defaultdict
from scipy.ndimage import gaussian_filter1d

SRC, OUT = sys.argv[1:3]
VENT = float(sys.argv[3]) if len(sys.argv) > 3 else 0.06
EMIN = float(sys.argv[4]) if len(sys.argv) > 4 else 0.4
EMAX = float(sys.argv[5]) if len(sys.argv) > 5 else 2.5
G = json.load(open(SRC))
por = defaultdict(list)
for k in G:
    if not k.startswith("i360/"):
        por[k.split("/")[0]].append((int(re.search(r"_(\d+)\.[a-z]+$", k).group(1)), k))
u = {}
grupo = defaultdict(list)
for t, l in por.items():
    l.sort()
    g = "ida" if t.lower().endswith("_ida") else ("vuelta" if t.lower().endswith("_devuelta") else None)
    for i, (_, k) in enumerate(l):
        u[k] = i / max(len(l) - 1, 1)
        if g:
            grupo[g].append(k)


def deciles(claves):
    a = np.array([[u[k], np.log(G[k][1])] for k in claves])
    c = np.linspace(0, 1, 11)
    return " ".join("%.2f" % np.exp(np.median(a[(a[:, 0] >= c[i]) & (a[:, 0] <= c[i + 1]), 1])) for i in range(10))


S = {k: np.log(np.array(v, float)) for k, v in G.items()}
rej = np.linspace(0, 1, 101)
for g, claves in grupo.items():
    print("%-7s antes:   %s" % (g, deciles(claves)))
    uu = np.array([u[k] for k in claves]); xx = np.array([S[k] for k in claves])
    tend = np.zeros((len(rej), 3))
    for j, r in enumerate(rej):
        m = np.abs(uu - r) <= VENT
        tend[j] = np.median(xx[m], axis=0) if m.sum() >= 5 else np.nan
    for c in range(3):
        b = np.isfinite(tend[:, c])
        tend[:, c] = np.interp(rej, rej[b], tend[b, c])
        tend[:, c] = gaussian_filter1d(tend[:, c], 2, mode="nearest")
    for k in claves:
        S[k] = S[k] - np.array([np.interp(u[k], rej, tend[:, c]) for c in range(3)])
tope = 0
sal = {}
for k, v in S.items():
    e = np.exp(v)
    if (e < EMIN).any() or (e > EMAX).any():
        tope += 1
    sal[k] = [round(float(x), 4) for x in np.clip(e, EMIN, EMAX)]
G = sal
for g, claves in grupo.items():
    print("%-7s despues: %s" % (g, deciles(claves)))
ev = np.array([v[1] for k, v in sal.items() if not k.startswith("i360/")])
print("fotos %d; exposicion G de %.2f a %.2f (percentiles 1 y 99: %.2f y %.2f); acotadas a [%.2f, %.2f]: %d"
      % (len(ev), ev.min(), ev.max(), np.percentile(ev, 1), np.percentile(ev, 99), EMIN, EMAX, tope))
json.dump(sal, open(OUT, "w"))
print("escrito", OUT)
