# -*- coding: utf-8 -*-
"""
Arma v2/datos/recorrido.json: las paradas, sus flechas y los puntos de interes.

Paradas: las fotos elegidas (v2/inventario/eleccion.csv) en el orden en que se caminaron, de la
planta del Acueducto a la Cumbre.

Flechas: la flecha de avanzar va hacia donde sigue el camino en cada parada, anotado a ojo sobre la
foto en v2/datos/ajustes_rumbo.csv (orden, grados; hojas de revision de scripts/v2-panoramas/
hojas_rumbo.py). Sin anotacion queda en 0, el eje de la lente que iba al frente. La de volver va en
el rumbo opuesto. Se intento calcularlas emparejando puntos entre fotos seguidas (SIFT y geometria
epipolar, y luego un modelo lineal de giro y paralaje), pero con 6 m entre fotos dentro del bosque
cerrado menos de la mitad de las parejas eran correctas y las direcciones salian erraticas.

Puntos de interes: v2/inventario/ubicacion_puntos.csv, con el panorama, el rumbo y la elevacion de
cada uno y como se decidio. Los letreros, la banca, el tablero y el pino van donde aparecen en la foto;
las aves, donde la foto muestra su habitat (pendiente de confirmar con Juan); los que no se pudieron
ubicar quedan como pendientes y no se muestran. Pedido de Juan del 27/11: «apenas quede el tramo hay
que ubicar los puntos de interes con precision, no se puede aleatoriamente».

uso: python armar_recorrido.py <repo>
"""
import csv
import json
import os
import sys

repo = sys.argv[1]
filas = [f for f in csv.DictReader(open(os.path.join(repo, "v2/inventario/eleccion.csv"), encoding="utf-8"))
         if f["estado"] == "elegida"]
ajustes = {}
ruta_aj = os.path.join(repo, "v2/datos/ajustes_rumbo.csv")
if os.path.exists(ruta_aj):
    for r in csv.DictReader(open(ruta_aj, encoding="utf-8")):
        ajustes[int(r["orden"])] = float(r["grados"])
nodos = []
for i, f in enumerate(filas):
    n = "p%03d" % int(f["orden"])
    nodos.append(dict(id=n, orden=int(f["orden"]), hora=f["hora"], rumbo=ajustes.get(int(f["orden"]), 0.0),
                      anterior=("p%03d" % int(filas[i - 1]["orden"])) if i > 0 else None,
                      siguiente=("p%03d" % int(filas[i + 1]["orden"])) if i < len(filas) - 1 else None))
ids = {n["id"] for n in nodos}
puntos = []
for r in csv.DictReader(open(os.path.join(repo, "v2/inventario/ubicacion_puntos.csv"), encoding="utf-8")):
    if r["estado"] == "pendiente":
        continue
    assert r["panorama"] in ids, r
    puntos.append(dict(poiId=r["poiId"], nodo=r["panorama"], rumbo=float(r["yaw"]), altura=float(r["pitch"]),
                       estado=r["estado"]))

os.makedirs(os.path.join(repo, "v2/datos"), exist_ok=True)
json.dump(dict(nota="Generado por scripts/v2-panoramas/armar_recorrido.py; ver su descripcion.",
               paradas=nodos, puntos=puntos),
          open(os.path.join(repo, "v2/datos/recorrido.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(nodos), "paradas;", len(puntos), "puntos:", [(u["poiId"][4:], u["nodo"]) for u in puntos])
