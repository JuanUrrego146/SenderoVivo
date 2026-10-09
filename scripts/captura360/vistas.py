# -*- coding: utf-8 -*-
"""
Reproyecta las panoramicas .insp de Insta360 a vistas rectilineas para COLMAP.

El ojo de pez crudo no le sirve a COLMAP. El detector de puntos (SIFT) no
reconoce un mismo arbol cuando se deforma al pasar del centro al borde del
circulo, y con fotos separadas varios metros la cadena se rompe casi en cada
eslabon: sobre la tanda del 7 de octubre de 2026 registra 37 de 1310 imagenes. Con
vistas rectilineas los mismos pares pasan de 0 a 17-81 correspondencias
validas, y los que ya funcionaban se multiplican por cuatro o cinco.

Por que tampoco se usa el equirectangular de Insta360 Studio: la costura entre
lentes deja una deformacion que COLMAP lee como geometria real. Aqui cada
vista sale de UNA sola lente, asi que no hay costura.

La reproyeccion es exacta: usa la calibracion OPENCV_FISHEYE que el propio
COLMAP refino sobre estas imagenes (ver CALIBRACION). La proyeccion se calcula
a mano y no con cv2.fisheye, porque esa funcion confunde los rayos a mas de 90
grados del eje, y esta lente ve hasta unos 103.

Las ocho vistas de una panoramica salen del mismo punto, asi que entre ellas
no hay base para triangular. Si COLMAP las trata como fotos sueltas, intenta
arrancar la reconstruccion con dos de ellas y fracasa una y otra vez. Por eso
se declaran como un rig: una carpeta por vista, el mismo nombre de archivo en
las ocho para la misma panoramica, y un rig.json con la orientacion fija de
cada vista. COLMAP mueve entonces cada panoramica como un bloque rigido.

Salida, lista para COLMAP con una camara PINHOLE de parametros conocidos por
carpeta:

    <destino>/images/a0/p0001.jpg ...   (lente y vista / orden de captura)
    <destino>/masks/a0/p0001.jpg.png    (negro = ignorar: operador y fuera del circulo util)
    <destino>/rig.json                  (para colmap rig_configurator)

Uso:

    python vistas.py --origen "F:/Escaneo con Insta360" \\
                     --destino "F:/Sendero/vistas-sol" --sesiones 125332
"""

import argparse
import json
import math
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np


# OPENCV_FISHEYE refinado por COLMAP sobre la tanda del 7 de octubre de 2026,
# promediando los dos fragmentos que logro reconstruir con el ojo de pez crudo.
# Coordenadas del circulo completo de 5984 px. fx, fy, cx, cy, k1, k2, k3, k4.
CALIBRACION = {
    "a": (1577.3, 1571.0, 2992.0, 2992.0, 0.0923, -0.0518, 0.0237, -0.0050),
    "b": (1570.4, 1563.2, 2992.0, 2992.0, 0.0750, -0.0278, 0.0123, -0.0032),
}

# Vistas por lente, en grados respecto al eje de la lente: (guinada, cabeceo).
# Tres horizontales algo inclinadas al suelo cubren las paredes y el sendero;
# la cuarta mira al dosel. No hay vista hacia abajo: ahi esta el operador.
VISTAS = ((-55, -15), (0, -15), (55, -15), (0, 55))

LADO = 2400          # px de cada vista
FOCAL = LADO / 2     # 90 grados de campo: tan(45) = (LADO/2) / FOCAL

# Radio util del circulo, en px del ojo de pez. Mas alla esta el aro brillante
# del protector de lente, que queda fijo en el cuadro y no aporta.
RADIO_UTIL = 2820

# A partir de cuantos grados por debajo del horizonte se tapa, por lente. El
# operador va debajo de la camara, pero con el palo inclinado solo una lente lo
# ve de lleno: en la tanda del 7 de octubre, la gorra asoma en la lente a hasta
# unos 40 grados bajo el horizonte, y en la b apenas las manos en el borde.
# Medido sobre vistas reales; si en otra jornada la camara iba al reves, se
# intercambian.
UMBRAL_OPERADOR = {"a": 38.0, "b": 55.0}


def rotacion(guinada, cabeceo):
    """Rayo de la camara virtual -> rayo de la lente. x derecha, y abajo, z al frente."""
    a, b = math.radians(guinada), math.radians(cabeceo)
    ry = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
    rx = np.array([[1, 0, 0], [0, math.cos(b), -math.sin(b)], [0, math.sin(b), math.cos(b)]])
    return ry @ rx


def mapa(lente, guinada, cabeceo):
    """Para cada pixel de la vista: de que pixel del ojo de pez sale, y si sirve."""
    fx, fy, cx, cy, k1, k2, k3, k4 = CALIBRACION[lente]
    u, v = np.meshgrid(np.arange(LADO, dtype=np.float64), np.arange(LADO, dtype=np.float64))
    rayos = np.stack([(u - LADO / 2) / FOCAL, (v - LADO / 2) / FOCAL, np.ones_like(u)], axis=-1)
    x, y, z = np.moveaxis(rayos @ rotacion(guinada, cabeceo).T, -1, 0)
    rho = np.hypot(x, y)
    theta = np.arctan2(rho, z)                     # valido mas alla de 90 grados
    t2 = theta * theta
    td = theta * (1 + t2 * (k1 + t2 * (k2 + t2 * (k3 + t2 * k4))))
    escala = np.divide(td, rho, out=np.zeros_like(rho), where=rho > 1e-12)
    mx = (fx * escala * x + cx).astype(np.float32)
    my = (fy * escala * y + cy).astype(np.float32)
    # Se tapa lo que cae fuera del circulo util y lo que mira demasiado abajo,
    # que es donde esta el operador. y crece hacia abajo.
    dentro = np.hypot(mx - cx, my - cy) < RADIO_UTIL
    bajo_horizonte = np.degrees(np.arctan2(y, np.hypot(x, z)))
    mascara = ((dentro & (bajo_horizonte < UMBRAL_OPERADOR[lente])) * 255).astype(np.uint8)
    return mx, my, mascara


# La lente b mira hacia atras: girada 180 grados sobre el eje vertical de la a.
GIRO_LENTE = {"a": np.eye(3), "b": np.diag([-1.0, 1.0, -1.0])}


def cuaternion(r):
    """Matriz de rotacion -> [w, x, y, z], el orden que lee COLMAP.

    Se parte de la componente mayor para no perder signos en giros de 180
    grados, que son justamente los de la lente b.
    """
    traza = r[0, 0] + r[1, 1] + r[2, 2]
    if traza > 0:
        s = 2 * math.sqrt(1 + traza)
        q = [s / 4, (r[2, 1] - r[1, 2]) / s, (r[0, 2] - r[2, 0]) / s, (r[1, 0] - r[0, 1]) / s]
    elif r[0, 0] > r[1, 1] and r[0, 0] > r[2, 2]:
        s = 2 * math.sqrt(1 + r[0, 0] - r[1, 1] - r[2, 2])
        q = [(r[2, 1] - r[1, 2]) / s, s / 4, (r[0, 1] + r[1, 0]) / s, (r[0, 2] + r[2, 0]) / s]
    elif r[1, 1] > r[2, 2]:
        s = 2 * math.sqrt(1 + r[1, 1] - r[0, 0] - r[2, 2])
        q = [(r[0, 2] - r[2, 0]) / s, (r[0, 1] + r[1, 0]) / s, s / 4, (r[1, 2] + r[2, 1]) / s]
    else:
        s = 2 * math.sqrt(1 + r[2, 2] - r[0, 0] - r[1, 1])
        q = [(r[1, 0] - r[0, 1]) / s, (r[0, 2] + r[2, 0]) / s, (r[1, 2] + r[2, 1]) / s, s / 4]
    return [float(v) for v in q]


def configuracion_rig():
    """Orientacion de cada vista respecto a la de referencia, a1 (lente a, al frente).

    La traslacion entre lentes, unos tres centimetros, se deja en cero: el
    ajuste de COLMAP la refina, y frente a objetos a metros no se nota.
    """
    referencia = rotacion(*VISTAS[1])
    camaras = []
    for lente in CALIBRACION:
        for indice, vista in enumerate(VISTAS):
            carpeta = "%s%d/" % (lente, indice)
            if lente == "a" and indice == 1:
                # COLMAP exige que la referencia vaya primera en la lista.
                camaras.insert(0, {"image_prefix": carpeta, "ref_sensor": True})
                continue
            cam_desde_rig = rotacion(*vista).T @ GIRO_LENTE[lente].T @ referencia
            camaras.append({
                "image_prefix": carpeta,
                "cam_from_rig_rotation": cuaternion(cam_desde_rig),
                "cam_from_rig_translation": [0.0, 0.0, 0.0],
            })
    for camara in camaras:
        camara["camera_model_name"] = "PINHOLE"
        camara["camera_params"] = [FOCAL, FOCAL, LADO / 2, LADO / 2]
    return [{"cameras": camaras}]


_MAPAS = {}
_MASCARAS = {}


def _preparar_trabajador():
    for lente in CALIBRACION:
        for indice, (g, c) in enumerate(VISTAS):
            mx, my, mascara = mapa(lente, g, c)
            _MAPAS[(lente, indice)] = (mx, my)
            _MASCARAS[(lente, indice)] = mascara


def procesar(tarea):
    ruta, prefijo, destino = tarea
    try:
        ojos = cv2.imread(ruta, cv2.IMREAD_COLOR)
        if ojos is None:
            return (ruta, "no se pudo leer")
        alto = ojos.shape[0]
        for n, lente in enumerate(CALIBRACION):
            ojo = ojos[:, n * alto:(n + 1) * alto]
            for indice in range(len(VISTAS)):
                mx, my = _MAPAS[(lente, indice)]
                vista = cv2.remap(ojo, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
                carpeta = "%s%d" % (lente, indice)
                nombre = prefijo + ".jpg"
                cv2.imwrite(os.path.join(destino, "images", carpeta, nombre), vista, [cv2.IMWRITE_JPEG_QUALITY, 95])
                cv2.imwrite(os.path.join(destino, "masks", carpeta, nombre + ".png"), _MASCARAS[(lente, indice)])
        return (ruta, None)
    except Exception as fallo:  # noqa: BLE001
        return (ruta, str(fallo))


def main():
    analizador = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analizador.add_argument("--origen", required=True)
    analizador.add_argument("--destino", required=True)
    analizador.add_argument("--sesiones", nargs="+", required=True)
    analizador.add_argument("--prefijo", default="p",
                            help="Letra de los nombres; distinta por sesion si luego se juntan en un conjunto")
    analizador.add_argument("--procesos", type=int, default=max(1, (os.cpu_count() or 4) - 1))
    opciones = analizador.parse_args()

    entradas = []
    for raiz, _, archivos in os.walk(opciones.origen):
        for archivo in archivos:
            if archivo.lower().endswith(".insp") and any("_%s_" % s in archivo for s in opciones.sesiones):
                entradas.append(os.path.join(raiz, archivo))
    if not entradas:
        sys.exit("No hay .insp de esas sesiones en %s" % opciones.origen)

    # Orden de captura real. El numero del archivo no sirve: la camara cambia
    # de carpeta a los 999 y reinicia la cuenta en 001.
    entradas.sort(key=lambda r: (os.path.getmtime(r), r))

    for sub in ("images", "masks"):
        for lente in CALIBRACION:
            for indice in range(len(VISTAS)):
                os.makedirs(os.path.join(opciones.destino, sub, "%s%d" % (lente, indice)), exist_ok=True)
    with open(os.path.join(opciones.destino, "rig.json"), "w", encoding="utf-8") as archivo:
        json.dump(configuracion_rig(), archivo, indent=2)

    tareas = [(r, "%s%04d" % (opciones.prefijo, i + 1), opciones.destino) for i, r in enumerate(entradas)]
    print("%d panoramicas -> %d vistas de %dx%d" % (len(tareas), len(tareas) * 2 * len(VISTAS), LADO, LADO), flush=True)

    fallos = []
    with ProcessPoolExecutor(max_workers=opciones.procesos, initializer=_preparar_trabajador) as grupo:
        for hechas, (ruta, error) in enumerate(grupo.map(procesar, tareas, chunksize=4), start=1):
            if error:
                fallos.append((ruta, error))
            if hechas % 25 == 0:
                print("  %d/%d" % (hechas, len(tareas)), flush=True)

    print("Listas %d de %d" % (len(tareas) - len(fallos), len(tareas)))
    for ruta, error in fallos[:10]:
        print("  FALLO %s: %s" % (os.path.basename(ruta), error))


if __name__ == "__main__":
    main()
