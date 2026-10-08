# -*- coding: utf-8 -*-
"""
Prepara capturas .insp de Insta360 para COLMAP, sin pasar por Insta360 Studio
ni por ninguna herramienta de pago.

Un .insp es un JPEG que guarda los DOS ojos de pez crudos, lado a lado, tal
como los vieron los sensores. Studio existe para coserlos en un
equirectangular, y esa costura deja una deformacion que COLMAP interpreta como
geometria real. Aqui hacemos lo contrario: partimos el archivo en sus dos
circulos y se los damos a COLMAP con el modelo OPENCV_FISHEYE, que es
exactamente lo que describe un circulo de ojo de pez. La geometria que recibe
COLMAP es entonces la que formo la lente, sin transformacion intermedia.

Tambien genera las mascaras. Quien captura sale en el 100% de las panoramicas,
siempre en el mismo sitio del circulo, asi que basta una mascara por lente
replicada con el nombre de cada imagen. Sin esto, la reconstruccion deja un
flotador con forma de persona siguiendo a la camara por toda la escena.

Salida, en el formato que COLMAP espera:

    <destino>/images/lente_a/IMG_...jpg
    <destino>/images/lente_b/IMG_...jpg
    <destino>/masks/lente_a/IMG_...jpg.png     (negro = ignorar)
    <destino>/masks/lente_b/IMG_...jpg.png

Uso:

    python preparar.py --origen "F:/Escaneo con Insta360" \\
                       --destino "F:/Sendero/ensayo-360" \\
                       --sesiones 125332 112015
"""

import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed

from PIL import Image, ImageDraw

# Pillow se niega a abrir imagenes muy grandes por precaucion ante archivos
# maliciosos. Un .insp de 72 MP son 71,6 millones de pixeles y supera el tope.
Image.MAX_IMAGE_PIXELS = None

LENTES = ("lente_a", "lente_b")

# Region del operador, en fraccion del circulo. Quien captura aparece abajo al
# centro, con el palo. Se tapa una elipse generosa en vez de toda la franja
# inferior, para conservar el piso del sendero a los lados, que si aporta.
OPERADOR_ANCHO = 0.78
OPERADOR_ALTO = 0.46

# El borde del circulo es una transicion suave a negro y genera falsos puntos
# caracteristicos. Se recorta un poco por dentro.
MARGEN_CIRCULO = 0.96


def construir_mascara(lado, ruta_salida):
    """Blanco donde COLMAP puede buscar puntos, negro donde debe ignorar."""
    mascara = Image.new("L", (lado, lado), 0)
    lapiz = ImageDraw.Draw(mascara)

    radio = lado / 2 * MARGEN_CIRCULO
    centro = lado / 2
    lapiz.ellipse(
        [centro - radio, centro - radio, centro + radio, centro + radio],
        fill=255,
    )

    ancho = lado * OPERADOR_ANCHO
    alto = lado * OPERADOR_ALTO
    lapiz.ellipse(
        [centro - ancho / 2, lado - alto, centro + ancho / 2, lado + alto],
        fill=0,
    )

    mascara.save(ruta_salida, "PNG", optimize=True)
    return mascara


def partir(tarea):
    """Parte un .insp en sus dos circulos. Devuelve (nombre, lado) o el error."""
    origen, destino, nombre = tarea
    try:
        with Image.open(origen) as imagen:
            ancho, alto = imagen.size
            if ancho != alto * 2:
                return (nombre, None, "no es doble ojo de pez: %dx%d" % (ancho, alto))
            salida = os.path.splitext(nombre)[0] + ".jpg"
            for indice, lente in enumerate(LENTES):
                recorte = imagen.crop((indice * alto, 0, (indice + 1) * alto, alto))
                recorte.save(
                    os.path.join(destino, "images", lente, salida),
                    "JPEG",
                    quality=96,
                    subsampling=0,
                )
            return (salida, alto, None)
    except Exception as fallo:  # noqa: BLE001
        return (nombre, None, str(fallo))


def main():
    analizador = argparse.ArgumentParser(description=__doc__)
    analizador.add_argument("--origen", required=True, help="Carpeta con los .insp (busca en subcarpetas)")
    analizador.add_argument("--destino", required=True, help="Carpeta de trabajo que consumira COLMAP")
    analizador.add_argument(
        "--sesiones",
        nargs="+",
        required=True,
        help="Horas de inicio de las sesiones a incluir, p. ej. 125332 112015",
    )
    analizador.add_argument("--procesos", type=int, default=max(1, (os.cpu_count() or 4) - 1))
    opciones = analizador.parse_args()

    entradas = []
    for raiz, _, archivos in os.walk(opciones.origen):
        for archivo in archivos:
            if not archivo.lower().endswith(".insp"):
                continue
            if any("_%s_" % sesion in archivo for sesion in opciones.sesiones):
                entradas.append(os.path.join(raiz, archivo))
    entradas.sort()

    if not entradas:
        sys.exit("No se encontro ningun .insp de las sesiones pedidas en %s" % opciones.origen)

    for lente in LENTES:
        os.makedirs(os.path.join(opciones.destino, "images", lente), exist_ok=True)
        os.makedirs(os.path.join(opciones.destino, "masks", lente), exist_ok=True)

    print("%d panoramicas -> %d imagenes de ojo de pez" % (len(entradas), len(entradas) * 2))

    tareas = [(ruta, opciones.destino, os.path.basename(ruta)) for ruta in entradas]
    hechas, fallos, lado = 0, [], None

    with ProcessPoolExecutor(max_workers=opciones.procesos) as grupo:
        pendientes = [grupo.submit(partir, tarea) for tarea in tareas]
        for futuro in as_completed(pendientes):
            nombre, medida, error = futuro.result()
            if error:
                fallos.append((nombre, error))
                continue
            hechas += 1
            lado = lado or medida
            if hechas % 50 == 0:
                print("  %d/%d" % (hechas, len(tareas)), flush=True)

    if not hechas:
        sys.exit("No se pudo partir ningun archivo")

    print("Partidas %d de %d" % (hechas, len(tareas)))
    for nombre, error in fallos[:10]:
        print("  FALLO %s: %s" % (nombre, error))

    print("Generando mascaras de %dx%d..." % (lado, lado))
    plantilla = os.path.join(opciones.destino, "_mascara.png")
    construir_mascara(lado, plantilla)
    with open(plantilla, "rb") as fuente:
        bytes_mascara = fuente.read()

    # COLMAP busca la mascara de images/<sub>/X.jpg en masks/<sub>/X.jpg.png
    for lente in LENTES:
        carpeta_img = os.path.join(opciones.destino, "images", lente)
        carpeta_msk = os.path.join(opciones.destino, "masks", lente)
        for imagen in os.listdir(carpeta_img):
            with open(os.path.join(carpeta_msk, imagen + ".png"), "wb") as destino_msk:
                destino_msk.write(bytes_mascara)

    os.remove(plantilla)
    print("Listo en %s" % opciones.destino)


if __name__ == "__main__":
    main()
