"""Ajusta rugosidad y metal de materiales de un .glb sin tocar color ni normales.

La madera de los letreros venia con rugosidad de 0,5 a 0,6 (aspecto de barniz plastico) y las flechas
pintadas con 0,37; la madera a la intemperie anda entre 0,8 y 0,9. La rugosidad vive en el canal G de la
textura metallicRoughness y el metal en el B; el R a veces lleva la oclusion y no se toca.

Uso: python -I ajustar_pbr.py entrada.glb salida.glb --regla "Columna:0.4:1:0" --regla "Tuercas:1:0.6:0.55"
  regla = palabra:k:k_metal:minimo   rugosidad nueva = max(1 - (1 - G) * k, minimo); metal nuevo = B * k_metal
La palabra se busca en el nombre del material; gana la primera regla que coincide.
"""
import argparse
import io
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, "E:/SenderoModelos/scripts")
from inspeccionar_glb import leer_glb  # noqa: E402
from optimizar_glb import escribir_glb  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--regla", action="append", default=[])
    ap.add_argument("--calidad", type=int, default=90)
    a = ap.parse_args()
    reglas = []
    for r in a.regla:
        p, k, km, mn = r.split(":")
        reglas.append((p, float(k), float(km), float(mn)))
    g, binario = leer_glb(a.entrada)
    vistas = [bytes(binario[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]) for bv in g["bufferViews"]]
    tocadas = {}
    informe = []
    for m in g.get("materials", []):
        nombre = m.get("name", "")
        regla = next((r for r in reglas if r[0].lower() in nombre.lower()), None)
        pbr = m.get("pbrMetallicRoughness", {})
        if regla is None or "metallicRoughnessTexture" not in pbr:
            continue
        _p, k, km, mn = regla
        ti = pbr["metallicRoughnessTexture"]["index"]
        src = g["textures"][ti]["source"]
        if src in tocadas:
            # imagen compartida con otro material ya ajustado: no se ajusta dos veces
            informe.append((nombre, "compartida"))
            continue
        img = g["images"][src]
        bvi = img["bufferView"]
        im = Image.open(io.BytesIO(vistas[bvi])).convert("RGB")
        arr = np.asarray(im, np.float32) / 255.0
        G0, B0 = arr[..., 1].mean(), arr[..., 2].mean()
        arr[..., 1] = np.maximum(1.0 - (1.0 - arr[..., 1]) * k, mn)
        arr[..., 2] = arr[..., 2] * km
        out = io.BytesIO()
        nuevo = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
        if img.get("mimeType") == "image/png":
            nuevo.save(out, "PNG", optimize=True)
        else:
            nuevo.save(out, "JPEG", quality=a.calidad, optimize=True)
            img["mimeType"] = "image/jpeg"
        vistas[bvi] = out.getvalue()
        tocadas[src] = nombre
        informe.append((nombre, "rug %.2f -> %.2f, metal %.2f -> %.2f" % (G0, arr[..., 1].mean(), B0, arr[..., 2].mean())))
    # rearmar el binario con las vistas en el mismo orden, alineadas a 4 bytes
    nuevo_bin = bytearray()
    for bv, datos in zip(g["bufferViews"], vistas):
        while len(nuevo_bin) % 4:
            nuevo_bin.append(0)
        bv["byteOffset"] = len(nuevo_bin)
        bv["byteLength"] = len(datos)
        nuevo_bin.extend(datos)
    g["buffers"][0]["byteLength"] = len(nuevo_bin)
    tam = escribir_glb(a.salida, g, nuevo_bin)
    for n, t in informe:
        print("  %-34s %s" % (n[:34], t))
    print(a.salida.split("/")[-1], round(tam / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
