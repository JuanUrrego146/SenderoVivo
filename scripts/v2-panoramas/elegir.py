# -*- coding: utf-8 -*-
"""Elige las fotos de la version 2 a partir de inventario_completo.csv y escribe eleccion.csv con la
razon de cada descarte. Los umbrales estan explicados en v2/inventario/INVENTARIO-FOTOS-360.md.

uso: python elegir.py E:/SenderoV2/inv/inventario_completo.csv v2/inventario/eleccion.csv
"""
import csv
import sys

SESION = "125332"          # la subida de las 12:53, la unica sin gotas de punta a punta
GOTAS_MAX = 0.30           # % del lente con manchas fijas; limpias <= 0,15, con gotas visibles >= 0,35
BORROSIDAD_MAX = 35.0      # % de cuadros con menos del 30 % de su nitidez habitual (movimiento)
OPERADOR_ELEV_MAX = -10.0  # grados: por encima de esto el operador entra en la franja del horizonte

entrada, salida = sys.argv[1], sys.argv[2]
filas = list(csv.DictReader(open(entrada, encoding="utf-8")))
out = []
for r in filas:
    if r["sesion"] != SESION:
        continue
    z = []
    if float(r["gotas_pct"]) > GOTAS_MAX:
        z.append("gotas en el lente")
    if float(r["borrosidad"]) > BORROSIDAD_MAX:
        z.append("movida")
    if r["op_elev_max"] and float(r["op_elev_max"]) > OPERADOR_ELEV_MAX:
        z.append("operador en el horizonte")
    if int(r["otras_personas"]) > 0:
        z.append("otra persona")
    out.append(dict(orden=r["orden"], archivo=r["archivo"], hora=r["hora"],
                    estado="descartada" if z else "elegida", razon="; ".join(z),
                    gotas_pct=r["gotas_pct"], borrosidad=r["borrosidad"], ev100=r["ev100"],
                    operador_elev_max=r["op_elev_max"], inclinacion=r["inclinacion"]))
with open(salida, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
print("elegidas", sum(o["estado"] == "elegida" for o in out), "de", len(out))
