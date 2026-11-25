"""Procesa las capturas de las miniaturas de los POI (lo llama generar.sh).

  procesar.py miniatura CAPTURA.png SALIDA.webp
      Quita la franja gris que Edge sin ventana deja arriba, recorta el margen
      transparente dejando un 6 % de aire por lado, centra el modelo en un cuadrado
      de 256 por 256 y lo guarda como WebP con alfa (calidad 85).
  procesar.py hoja CARPETA SALIDA.jpg
      Arma una hoja de contactos con todas las miniaturas de CARPETA y su nombre
      debajo, sobre fondo claro.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

LADO = 256            # lado de la miniatura final
AIRE = 0.06           # aire por lado, como fracción del lado del cuadrado
FRANJA = 10           # filas de arriba que se descartan (franja gris de Edge)
UMBRAL_ALFA = 8       # alfa mínimo para contar un píxel como parte del modelo


def miniatura(captura: Path, salida: Path) -> None:
    im = Image.open(captura).convert('RGBA')
    ancho, alto = im.size
    im = im.crop((0, FRANJA, ancho, alto))
    mascara = im.getchannel('A').point(lambda v: 255 if v > UMBRAL_ALFA else 0)
    caja = mascara.getbbox()
    if caja is None:
        sys.exit(f'captura vacia (sin modelo): {captura}')
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    if min(w, h) < 40:
        sys.exit(f'captura con modelo diminuto ({w}x{h} px): {captura}')
    if y0 <= 0 or x0 <= 0 or x1 >= im.size[0] or y1 >= im.size[1]:
        sys.exit(f'el modelo toca el borde de la captura (caja {caja}): {captura}')
    recorte = im.crop(caja)
    lado = round(max(w, h) / (1 - 2 * AIRE))
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    lienzo.paste(recorte, ((lado - w) // 2, (lado - h) // 2))
    final = lienzo.resize((LADO, LADO), Image.LANCZOS)
    salida.parent.mkdir(parents=True, exist_ok=True)
    final.save(salida, 'WEBP', quality=85, method=6)


def hoja(carpeta: Path, salida: Path) -> None:
    archivos = sorted(carpeta.glob('*.webp'))
    columnas = 7
    filas = -(-len(archivos) // columnas)
    margen, rotulo = 16, 34
    celda_w, celda_h = LADO + margen, LADO + rotulo + margen
    fondo = (242, 237, 228)
    lienzo = Image.new('RGB', (columnas * celda_w + margen, filas * celda_h + margen), fondo)
    dib = ImageDraw.Draw(lienzo)
    try:
        letra = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    except OSError:
        letra = ImageFont.load_default()
    for i, archivo in enumerate(archivos):
        col, fila = i % columnas, i // columnas
        x = margen + col * celda_w
        y = margen + fila * celda_h
        mini = Image.open(archivo).convert('RGBA')
        lienzo.paste(mini, (x, y), mini)
        nombre = archivo.stem
        ancho_texto = dib.textlength(nombre, font=letra)
        dib.text((x + (LADO - ancho_texto) / 2, y + LADO + 8), nombre, fill=(40, 40, 40), font=letra)
    salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(salida, 'JPEG', quality=90)


if __name__ == '__main__':
    orden = sys.argv[1] if len(sys.argv) > 1 else ''
    if orden == 'miniatura' and len(sys.argv) == 4:
        miniatura(Path(sys.argv[2]), Path(sys.argv[3]))
    elif orden == 'hoja' and len(sys.argv) == 4:
        hoja(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        sys.exit(__doc__)
