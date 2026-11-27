"""Une las seis caras de un cubo (de panoramica_desde_app.mjs) en una equirectangular 360.

Uso: python equirectangular_desde_caras.py CARPETA_DE_CARAS PREFIJO_DE_SALIDA

Escribe PREFIJO.webp (4096 por 2048, 1,2 MB como maximo) y PREFIJO-2048.webp (2048 por 1024, 400 kB
como maximo, para celular). Hace falta numpy y Pillow.

Convencion: el centro de la imagen mira hacia adelante (-z de PlayCanvas) y el ancho crece hacia la
derecha, de modo que la panoramica no sale en espejo vista desde adentro, que es como la usa el
skybox de model-viewer. Cada cara es la captura de una camara de 90 grados y 1:1: adelante,
derecha, atras e izquierda con la camara girada en el horizonte; arriba y abajo con el cabeceo a
mas y menos 90 grados.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# (derecha, arriba, adelante) de la camara de cada cara, en coordenadas del mundo (x derecha,
# y arriba, z hacia atras).
CARAS = {
    'adelante': ((1, 0, 0), (0, 1, 0), (0, 0, -1)),
    'derecha': ((0, 0, 1), (0, 1, 0), (1, 0, 0)),
    'atras': ((-1, 0, 0), (0, 1, 0), (0, 0, 1)),
    'izquierda': ((0, 0, -1), (0, 1, 0), (-1, 0, 0)),
    'arriba': ((1, 0, 0), (0, 0, 1), (0, 1, 0)),
    'abajo': ((1, 0, 0), (0, 0, -1), (0, -1, 0)),
}
LIMITES = ((4096, 1_200_000), (2048, 400_000))


def cargar(carpeta: Path) -> dict:
    return {n: np.asarray(Image.open(carpeta / f'cara-{n}.png').convert('RGB'), dtype=np.float32) for n in CARAS}


def equirectangular(caras: dict, ancho: int) -> Image.Image:
    alto = ancho // 2
    lado = next(iter(caras.values())).shape[0]
    lon = (np.arange(ancho) + 0.5) / ancho * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(alto) + 0.5) / alto * np.pi
    lon, lat = np.meshgrid(lon, lat)
    d = np.stack([np.sin(lon) * np.cos(lat), np.sin(lat), -np.cos(lon) * np.cos(lat)], axis=-1)
    # Cara dominante: la de mayor producto con la direccion.
    proyecciones = np.stack([d @ np.array(f, dtype=np.float32) for _, _, f in CARAS.values()], axis=0)
    elegida = np.argmax(proyecciones, axis=0)
    salida = np.zeros((alto, ancho, 3), dtype=np.float32)
    for indice, (nombre, (derecha, arriba, adelante)) in enumerate(CARAS.items()):
        mascara = elegida == indice
        if not mascara.any():
            continue
        dm = d[mascara]
        z = dm @ np.array(adelante, dtype=np.float32)
        u = (dm @ np.array(derecha, dtype=np.float32)) / z
        v = (dm @ np.array(arriba, dtype=np.float32)) / z
        # Pixel de la cara: u va a la derecha y v hacia arriba, con el origen arriba a la izquierda.
        px = (u + 1) / 2 * lado - 0.5
        py = (1 - (v + 1) / 2) * lado - 0.5
        x0 = np.clip(np.floor(px).astype(int), 0, lado - 1)
        y0 = np.clip(np.floor(py).astype(int), 0, lado - 1)
        x1 = np.clip(x0 + 1, 0, lado - 1)
        y1 = np.clip(y0 + 1, 0, lado - 1)
        fx = (px - x0)[:, None]
        fy = (py - y0)[:, None]
        cara = caras[nombre]
        muestra = (cara[y0, x0] * (1 - fx) * (1 - fy) + cara[y0, x1] * fx * (1 - fy)
                   + cara[y1, x0] * (1 - fx) * fy + cara[y1, x1] * fx * fy)
        salida[mascara] = muestra
    return Image.fromarray(np.clip(salida, 0, 255).astype(np.uint8))


def guardar(imagen: Image.Image, ruta: Path, tope: int) -> int:
    for calidad in (88, 84, 80, 76, 72, 68, 64, 60, 55, 50):
        imagen.save(ruta, 'WEBP', quality=calidad, method=6)
        if ruta.stat().st_size <= tope:
            return calidad
    return calidad


def main(carpeta: Path, prefijo: Path) -> None:
    caras = cargar(carpeta)
    grande = equirectangular(caras, LIMITES[0][0])
    prefijo.parent.mkdir(parents=True, exist_ok=True)
    for (ancho, tope), sufijo in zip(LIMITES, ('.webp', '-2048.webp')):
        imagen = grande if ancho == grande.width else grande.resize((ancho, ancho // 2), Image.LANCZOS)
        ruta = Path(str(prefijo) + sufijo)
        calidad = guardar(imagen, ruta, tope)
        print(f'{ruta}: {imagen.size[0]}x{imagen.size[1]}, calidad {calidad}, {ruta.stat().st_size // 1024} kB')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
