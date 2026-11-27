# -*- coding: utf-8 -*-
"""
Medida de gotas en el lente que no se confunde con el desenfoque por movimiento ni con la textura.

Una gota se queda pegada en el mismo pixel del lente mientras la camara avanza y el paisaje cambia
de una foto a la siguiente (unos 6 s y varios metros entre fotos). Por eso:

1. Cada foto se lee a 1/8 (748 px por lente) en gris y se filtra con una diferencia de gaussianas
   (sigma 1,5 y 5 px): quedan los bordes del tamano de una gota, con signo (cache dog8.npy).
2. Para cada pixel se calcula la correlacion local normalizada (ventana gaussiana de sigma 4 px) de
   la foto con la ANTERIOR y con la SIGUIENTE de la misma sesion, y se toma la menor de las dos. El
   paisaje se movio y su correlacion queda cerca de cero; una gota esta en el mismo sitio en las tres
   fotos y correlaciona alto con las dos.
3. gotas_pct: porcentaje del circulo util con borde (energia local > 4) donde esa correlacion pasa de
   0,6. Se mide en la parte de arriba y del medio del circulo (hasta media altura bajo el centro), sin
   el anillo exterior del lente: abajo va el operador, que tambien se queda fijo.
4. parada: mediana de la correlacion en toda la lente a. Si pasa de 0,3 la camara casi no se movio
   entre fotos (paisaje fijo): ahi la medida no vale y la foto es casi un duplicado.

Validado sobre mapas (inv/ncc_*.jpg): las marcas caen sobre las gotas visibles de 103911 #110 y #101;
en fotos limpias (125332 #37, #90; 134356 #10) quedan por debajo de 0,15 %.

Un primer intento con la mediana temporal de 7 fotos (porcentaje de pixeles y luego numero de
manchas) no separaba fotos limpias de fotos con gotas: la textura del bosque no se cancela en 7 fotos.

uso: python gotas.py "E:/Escaneo con Insta360" E:/SenderoV2/inv
"""
import csv
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

L = 748
R_UTIL = 2820 / 8 * 0.95
UMBRAL_NCC = 0.6
ENERGIA = 4.0


def leer(ruta):
    g = cv2.imread(ruta, cv2.IMREAD_REDUCED_GRAYSCALE_8).astype(np.float32)
    d = cv2.GaussianBlur(g, (0, 0), 1.5) - cv2.GaussianBlur(g, (0, 0), 5)
    return np.clip(d, -127, 127).astype(np.int8)


def ncc(a, b, s=4):
    ab = cv2.GaussianBlur(a * b, (0, 0), s)
    aa = cv2.GaussianBlur(a * a, (0, 0), s)
    bb = cv2.GaussianBlur(b * b, (0, 0), s)
    return ab / np.sqrt(aa * bb + 1e-3), aa


def main():
    origen, inv = sys.argv[1], sys.argv[2]
    filas = list(csv.DictReader(open(os.path.join(inv, "inventario.csv"), encoding="utf-8")))
    rutas = [os.path.join(origen, f["archivo"]) for f in filas]
    cache = os.path.join(inv, "dog8.npy")
    if os.path.exists(cache):
        D = np.load(cache, mmap_mode="r")
    else:
        D = np.lib.format.open_memmap(cache, "w+", np.int8, (len(rutas), L, 2 * L))
        with ProcessPoolExecutor(6) as ex:
            for i, d in enumerate(ex.map(leer, rutas, chunksize=8)):
                D[i] = d
        D.flush()
    yy, xx = np.mgrid[0:L, 0:L]
    zona = (np.hypot(xx - L / 2, yy - L / 2) < R_UTIL) & (yy < L / 2 + 0.5 * R_UTIL)
    ses = [f["sesion"] for f in filas]
    salida = []
    for i, f in enumerate(filas):
        a = D[i].astype(np.float32)
        vecinas = [j for j in (i - 1, i + 1) if 0 <= j < len(filas) and ses[j] == ses[i]]
        cs, e = [], None
        for j in vecinas:
            c, e = ncc(a, D[j].astype(np.float32))
            cs.append(c)
        c = np.minimum.reduce(cs)
        fuerte = (c > UMBRAL_NCC) & (e > ENERGIA)
        pct = []
        for k in range(2):
            z = fuerte[:, k * L:(k + 1) * L] & zona
            ez = (e[:, k * L:(k + 1) * L] > ENERGIA) & zona
            pct.append(100.0 * z.sum() / max(ez.sum(), 1))
        parada = float(np.median(c[:, :L][zona]))
        salida.append(dict(archivo=f["archivo"], gotas_a=round(pct[0], 3), gotas_b=round(pct[1], 3),
                           gotas_pct=round(max(pct), 3), parada=round(parada, 3)))
    with open(os.path.join(inv, "gotas.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, ["archivo", "gotas_a", "gotas_b", "gotas_pct", "parada"])
        w.writeheader()
        w.writerows(salida)
    print("listo", len(salida))


if __name__ == "__main__":
    main()
