"""Cortes y paradas del recorrido decididos con lo que se ve EN LA APP (medidas.json de barrido_hoja.py sobre un
barrido de barrido_app.mjs en modo tramo: una captura por metro, llegando con un toque).

Umbral de «flojo»: FLOJO por la mediana de la nitidez de todo el tramo. Con eso:
- propone los cortes: CAPTURAS_CORTE capturas seguidas o mas (una por metro) con la nitidez por debajo del umbral, o
  una captura con una mancha que ocupa MANCHA_CORTE de la vista o mas. Son una propuesta: los bordes se llevan a mano
  a la primera captura limpia de cada lado mirando las hojas, y los que se usan son los que se pasan en `cortes=`;
- elige las paradas fuera de esos cortes. El puntaje de un punto es ln(nitidez / umbral) menos MULTA por la parte de la
  vista ocupada por manchas, interpolado cada 0,5 m; un punto con puntaje negativo no puede ser parada. En cada trecho
  recorrible (entre dos cortes, o entre un corte y un extremo) las paradas son el conjunto que maximiza la suma de
  (puntaje - COSTO) con separaciones de SEPMIN a SEPMAX m; los dos bordes del trecho son parada siempre. Se admite
  una separacion mayor, hasta SALTO m, pagando 0,3 por cada metro de mas: asi un bache corto, que no da para un
  corte, se cruza caminando de una vez en lugar de detenerse en medio. Con COSTO mayor que cero las paradas quedan
  mas juntas donde mejor se ve y mas separadas donde se ve regular.
Imprime la propuesta de cortes y las paradas con su nitidez, y deja <salida.json> con `cuts` y `stops`.
uso: paradas_app.py <medidas.json> <largo_del_trazado> <salida.json> [cortes=a-b,c-d] [flojo=0.6] [capturas_corte=4]
     [mancha_corte=0.2] [sepmin=2.2] [sepmax=4.2] [salto=7.5] [costo=0.5] [multa=3.0]"""
import sys, json, numpy as np

MED, LARGO, OUT = sys.argv[1], float(sys.argv[2]), sys.argv[3]
opc = dict(a.split("=", 1) for a in sys.argv[4:])
CORTES = sorted(tuple(float(x) for x in c.split("-")) for c in opc.get("cortes", "").split(",") if c)
FLOJO = float(opc.get("flojo", 0.6)); CAPTURAS_CORTE = int(opc.get("capturas_corte", 4)); MANCHA_CORTE = float(opc.get("mancha_corte", 0.2))
SEPMIN = float(opc.get("sepmin", 2.2)); SEPMAX = float(opc.get("sepmax", 4.2)); SALTO = float(opc.get("salto", 7.5))
COSTO = float(opc.get("costo", 0.5)); MULTA = float(opc.get("multa", 3.0))
PASO = 0.5

m = sorted(json.load(open(MED, encoding="utf-8")), key=lambda r: r["d"])
dm = np.array([r["d"] for r in m]); nm = np.array([r["nitidez"] for r in m]); mm = np.array([r["mancha"] for r in m])
umbral = FLOJO * float(np.median(nm))
print(f"largo {LARGO:.2f} | nitidez mediana del tramo {np.median(nm):.0f} | umbral de flojo {umbral:.0f}")

# propuesta de cortes sobre las capturas tal como se midieron
malo = (nm < umbral) | (mm >= MANCHA_CORTE)
prop, i = [], 0
while i < len(dm):
    if malo[i]:
        j = i
        while j + 1 < len(dm) and malo[j + 1]:
            j += 1
        desde = dm[i - 1] if i > 0 else dm[i]
        hasta = dm[j + 1] if j + 1 < len(dm) else dm[j]
        if j - i + 1 >= CAPTURAS_CORTE or (mm[i:j + 1] >= MANCHA_CORTE).any():
            prop.append((float(desde), float(hasta), float(nm[i:j + 1].min()), float(mm[i:j + 1].max())))
        i = j + 1
    else:
        i += 1
print("propuesta de cortes (de la ultima captura buena a la primera buena, nitidez minima, mancha maxima):")
for a, b, n, ma in prop:
    print(f"  {a:6.1f} a {b:6.1f}   nitidez {n:5.0f}   mancha {ma * 100:3.0f} %")
print(f"cortes usados: {CORTES} | recorrible {LARGO - sum(b - a for a, b in CORTES):.2f} m")

ds = np.r_[np.arange(0, LARGO - 1e-6, PASO), LARGO]
nit = np.interp(ds, dm, nm); man = np.interp(ds, dm, mm)
fuera = np.array([not any(a < d < b for a, b in CORTES) for d in ds])
punt = np.log(nit / umbral) - MULTA * man

bordes = [0.0] + [x for c in CORTES for x in c] + [LARGO]
trechos = [(bordes[i], bordes[i + 1]) for i in range(0, len(bordes), 2) if bordes[i + 1] - bordes[i] > 1e-6]
paradas = []
for a, b in trechos:
    idx = [i for i, d in enumerate(ds) if a - 1e-6 <= d <= b + 1e-6]
    if abs(ds[idx[0]] - a) > 1e-6 or abs(ds[idx[-1]] - b) > 1e-6:
        raise SystemExit(f"los bordes {a} y {b} deben caer en la malla de {PASO} m")
    for estricto in (True, False):
        # primero solo puntos con puntaje no negativo; si asi no se puede cruzar el trecho, se admiten con multa
        vale = lambda k: k in (idx[0], idx[-1]) or punt[k] >= 0 or not estricto
        mejor = {idx[0]: (punt[idx[0]] - COSTO, None)}
        for j in idx[1:]:
            if not vale(j):
                continue
            cand = None
            for i in idx:
                if i >= j or i not in mejor:
                    continue
                sep = ds[j] - ds[i]
                if sep > SALTO + 1e-6 or (sep < SEPMIN - 1e-6 and not (i == idx[0] and j == idx[-1])):
                    continue
                valor = mejor[i][0] + punt[j] - COSTO - 0.3 * max(0.0, sep - SEPMAX) - (0 if punt[j] >= 0 or j == idx[-1] else 2.0)
                if cand is None or valor > cand[0]:
                    cand = (valor, i)
            if cand:
                mejor[j] = cand
        if idx[-1] in mejor:
            break
    if idx[-1] not in mejor:
        raise SystemExit(f"no hay forma de repartir paradas entre {a} y {b}")
    camino, k = [], idx[-1]
    while k is not None:
        camino.append(k); k = mejor[k][1]
    paradas += [float(ds[k]) for k in reversed(camino)]

paradas = sorted(set(round(p, 2) for p in paradas))
json.dump({"cuts": [list(c) for c in CORTES], "stops": paradas}, open(OUT, "w", encoding="utf-8"))
print(f"nitidez mediana fuera de los cortes {np.median(nit[fuera]):.0f}" + (f"; dentro {np.median(nit[~fuera]):.0f}" if (~fuera).any() else ""))
print(f"{len(paradas)} paradas:")
ant = None
for p in paradas:
    i = int(np.argmin(np.abs(ds - p)))
    sep = "" if ant is None else f"  +{p - ant:.1f}" + ("  (corte)" if any(abs(ant - a) < 1e-6 and abs(p - b) < 1e-6 for a, b in CORTES) else "")
    print(f"  {p:7.2f}  nitidez {nit[i]:5.0f}  mancha {man[i] * 100:3.0f} %  puntaje {punt[i]:+.2f}{sep}")
    ant = p
en = np.array([nit[int(np.argmin(np.abs(ds - p)))] for p in paradas])
print(f"nitidez mediana en las paradas {np.median(en):.0f}; la menor {en.min():.0f}")
