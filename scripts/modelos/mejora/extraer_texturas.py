"""Vuelca las imagenes embebidas de un .glb a una carpeta, con los bytes originales.

Uso: python -I extraer_texturas.py modelo.glb carpeta_salida
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from inspeccionar_glb import leer_glb, dimensiones  # noqa: E402


def main():
    ruta, salida = sys.argv[1], Path(sys.argv[2])
    salida.mkdir(parents=True, exist_ok=True)
    g, binario = leer_glb(ruta)
    vistas = g.get("bufferViews", [])
    for i, im in enumerate(g.get("images", [])):
        if "bufferView" not in im:
            continue
        bv = vistas[im["bufferView"]]
        buf = binario[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
        tipo, w, h = dimensiones(buf)
        nombre = re.sub(r"[^A-Za-z0-9_.-]+", "_", im.get("name") or "img")
        destino = salida / "{:02d}_{}.{}".format(i, nombre, tipo)
        destino.write_bytes(buf)
        print(destino.name, w, h, len(buf))


if __name__ == "__main__":
    main()
