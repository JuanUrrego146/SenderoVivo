# -*- coding: utf-8 -*-
"""Une inventario.csv (hora, orden, luz, borrosidad), gotas.csv (gotas por persistencia) y operador.csv
(donde aparece quien lleva la camara, gravedad) en inventario_completo.csv, y resume por bloques de 20.

En inventario.csv la columna 'gotas' resulto medir desenfoque (validado sobre fotos): aqui se llama
'borrosidad'. Las gotas de verdad son 'gotas_pct' de gotas.py.

uso: python unir_medidas.py E:/SenderoV2/inv
"""
import csv
import os
import sys
from statistics import median

inv = sys.argv[1]
base = list(csv.DictReader(open(os.path.join(inv, "inventario.csv"), encoding="utf-8")))
gotas = {r["archivo"]: r for r in csv.DictReader(open(os.path.join(inv, "gotas.csv"), encoding="utf-8"))}
oper = {r["archivo"]: r for r in csv.DictReader(open(os.path.join(inv, "operador.csv"), encoding="utf-8"))}
filas = []
for b in base:
    g, o = gotas[b["archivo"]], oper[b["archivo"]]
    filas.append(dict(
        sesion=b["sesion"], orden=int(b["orden"]), archivo=b["archivo"], hora=b["fecha"][11:19],
        ev100=float(b["ev100"]), brillo=float(b["brillo"]), borrosidad=float(b["gotas"]),
        nitidez=float(b["nitidez_mediana"]), gotas_pct=float(g["gotas_pct"]),
        gotas_a=float(g["gotas_a"]), gotas_b=float(g["gotas_b"]),
        inclinacion=float(o["inclinacion"]),
        op_elev_max=float(o["op_elev_max"]) if o["op_elev_max"] else None,
        op_rumbo_min=o["op_rumbo_min"], op_rumbo_max=o["op_rumbo_max"], op_esfera_pct=float(o["op_esfera_pct"]),
        otras_personas=int(o["otras_personas"]), otras_elev_max=o["otras_elev_max"],
        ax=o["ax"], ay=o["ay"], az=o["az"]))
campos = list(filas[0].keys())
with open(os.path.join(inv, "inventario_completo.csv"), "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, campos)
    w.writeheader()
    w.writerows(filas)


def q(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * (len(v) - 1) + 0.5))]


ses = {}
for f in filas:
    ses.setdefault(f["sesion"], []).append(f)
print("sesion   n  horas        EV100 med  gotas% med p90  borros med  operador elev max med (p90)  sin operador")
for s, fs in ses.items():
    el = [f["op_elev_max"] for f in fs if f["op_elev_max"] is not None]
    print("%s %4d  %s-%s  %6.2f    %5.2f %5.2f    %5.1f        %6.1f (%6.1f)            %d" % (
        s, len(fs), fs[0]["hora"][:5], fs[-1]["hora"][:5], median(f["ev100"] for f in fs),
        median(f["gotas_pct"] for f in fs), q([f["gotas_pct"] for f in fs], .9),
        median(f["borrosidad"] for f in fs), median(el) if el else float("nan"), q(el, .9) if el else float("nan"),
        len(fs) - len(el)))
print()
for s, fs in ses.items():
    print("== sesion", s)
    for i in range(0, len(fs), 20):
        b = fs[i:i + 20]
        el = [f["op_elev_max"] for f in b if f["op_elev_max"] is not None]
        print("  %3d-%3d %s  EV %5.2f  gotas med %5.2f max %5.2f  borros %5.1f  op elev med %6.1f max %6.1f  otras %d" % (
            b[0]["orden"], b[-1]["orden"], b[0]["hora"], median(f["ev100"] for f in b),
            median(f["gotas_pct"] for f in b), max(f["gotas_pct"] for f in b), median(f["borrosidad"] for f in b),
            median(el) if el else float("nan"), max(el) if el else float("nan"), sum(f["otras_personas"] > 0 for f in b)))
