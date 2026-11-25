"""Arma una hoja de contactos con varias imagenes PNG (RGBA) sobre un fondo liso.

Uso: python -I montar.py salida.jpg --cols 4 --alto 420 [--fondo E9E4D8] [--rotulos a,b,c] img1.png img2.png ...
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("salida")
    ap.add_argument("imagenes", nargs="+")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--alto", type=int, default=420)
    ap.add_argument("--fondo", default="E9E4D8")
    ap.add_argument("--rotulos", default="")
    ap.add_argument("--calidad", type=int, default=88)
    a = ap.parse_args()

    fondo = tuple(int(a.fondo[i:i + 2], 16) for i in (0, 2, 4))
    rotulos = a.rotulos.split(",") if a.rotulos else []
    celdas = []
    for i, ruta in enumerate(a.imagenes):
        im = Image.open(ruta).convert("RGBA")
        esc = a.alto / im.height
        im = im.resize((max(1, round(im.width * esc)), a.alto), Image.LANCZOS)
        base = Image.new("RGBA", im.size, fondo + (255,))
        base.alpha_composite(im)
        celdas.append(base.convert("RGB"))
    cols = min(a.cols, len(celdas))
    filas = (len(celdas) + cols - 1) // cols
    ancho_celda = max(c.width for c in celdas)
    hoja = Image.new("RGB", (cols * ancho_celda, filas * a.alto), fondo)
    dibujo = ImageDraw.Draw(hoja)
    try:
        fuente = ImageFont.truetype("arial.ttf", max(14, a.alto // 22))
    except OSError:
        fuente = ImageFont.load_default()
    for i, c in enumerate(celdas):
        x = (i % cols) * ancho_celda + (ancho_celda - c.width) // 2
        y = (i // cols) * a.alto
        hoja.paste(c, (x, y))
        if i < len(rotulos) and rotulos[i]:
            dibujo.text((x + 8, y + 6), rotulos[i], fill=(30, 30, 30), font=fuente,
                        stroke_width=2, stroke_fill=(255, 255, 255))
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    if a.salida.lower().endswith((".jpg", ".jpeg")):
        hoja.save(a.salida, quality=a.calidad)
    else:
        hoja.save(a.salida)
    print(a.salida, hoja.size)


if __name__ == "__main__":
    sys.exit(main())
