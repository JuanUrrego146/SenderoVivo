# -*- coding: utf-8 -*-
"""
Lista de pares para unir dos sesiones que recorren el mismo sendero en
sentidos opuestos, una de subida y otra de bajada.

Dentro de cada sesion el emparejador secuencial de COLMAP basta, porque las
panoramicas vecinas en el tiempo son vecinas en el espacio. Entre sesiones
no hay ese orden, y compararlo todo contra todo son millones de pares. Como la
bajada recorre el sendero al reves, la panoramica j de la subida cae cerca de
la que esta a la misma fraccion del recorrido contando desde el final. Se
compara contra una ventana alrededor de ese punto, ancha porque el paso de
subida y el de bajada no son iguales.

Solo entran las vistas horizontales: la del dosel aporta poco entre sesiones
con luz distinta y multiplicaria los pares.

Uso, con los nombres que deja vistas.py:

    python pares.py --subida p 299 --bajada l 346 --carpetas F:/Sendero/vistas-mixto/images \\
                    --salida F:/Sendero/vistas-mixto/pares-entre-sesiones.txt

El segundo numero de --subida es cuantas panoramicas cubren el sendero; las
que sigan (por ejemplo, la cumbre) se emparejan con el comienzo de la bajada.
"""

import argparse
import os

VISTAS_HORIZONTALES = ("a0", "a1", "a2", "b0", "b1", "b2")


def main():
    analizador = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analizador.add_argument("--subida", nargs=2, metavar=("PREFIJO", "N"), required=True)
    analizador.add_argument("--bajada", nargs=2, metavar=("PREFIJO", "N"), required=True)
    analizador.add_argument("--carpetas", required=True, help="Carpeta images/ con una subcarpeta por vista")
    analizador.add_argument("--salida", required=True)
    analizador.add_argument("--ventana", type=int, default=30, help="Panoramicas de la bajada a cada lado")
    analizador.add_argument("--paso", type=int, default=3, help="Se toma una de cada tantas dentro de la ventana")
    opciones = analizador.parse_args()

    prefijo_s, sendero_s = opciones.subida[0], int(opciones.subida[1])
    prefijo_b, total_b = opciones.bajada[0], int(opciones.bajada[1])
    total_s = len([f for f in os.listdir(os.path.join(opciones.carpetas, "a1")) if f.startswith(prefijo_s)])

    pares = []
    for j in range(1, total_s + 1):
        centro = round(total_b * (1 - min(j, sendero_s) / sendero_s))
        for l in range(max(1, centro - opciones.ventana), min(total_b, centro + opciones.ventana) + 1, opciones.paso):
            for u in VISTAS_HORIZONTALES:
                for v in VISTAS_HORIZONTALES:
                    pares.append("%s/%s%04d.jpg %s/%s%04d.jpg" % (u, prefijo_s, j, v, prefijo_b, l))

    with open(opciones.salida, "w", encoding="utf-8") as archivo:
        archivo.write("\n".join(pares) + "\n")
    print("%d pares" % len(pares))


if __name__ == "__main__":
    main()
