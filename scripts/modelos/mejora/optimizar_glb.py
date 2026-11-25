"""Optimiza un .glb sin tocar la geometria ni la animacion.

Reencoda las imagenes embebidas (PNG de gris mas alfa para el atlas de plumas, JPEG para normales y mapas opacos),
las reduce a un lado maximo y quita extensiones de material que quedaron en cero.

Uso: python -I optimizar_glb.py entrada.glb salida.glb [--max 1024] [--calidad 88]
"""
import argparse
import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from inspeccionar_glb import leer_glb  # noqa: E402


def escribir_glb(ruta, gltf, binario):
    js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    binario = bytes(binario) + b"\x00" * ((4 - len(binario) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binario)
    with open(ruta, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, total))
        fh.write(struct.pack("<I4s", len(js), b"JSON"))
        fh.write(js)
        fh.write(struct.pack("<I4s", len(binario), b"BIN\x00"))
        fh.write(binario)
    return total


def papeles(g):
    """Para cada imagen: conjunto de usos (color, color_alfa, normal, datos)."""
    tex = g.get("textures", [])
    uso = {}

    def img(tinfo):
        if not tinfo:
            return None
        t = tex[tinfo["index"]]
        src = t.get("source")
        if src is None:
            for e in t.get("extensions", {}).values():
                src = e.get("source", src)
        return src

    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        i = img(pbr.get("baseColorTexture"))
        if i is not None:
            uso.setdefault(i, set()).add("color_alfa" if m.get("alphaMode", "OPAQUE") != "OPAQUE" else "color")
        for clave, dato in ((pbr.get("metallicRoughnessTexture"), "datos"), (m.get("normalTexture"), "normal"),
                            (m.get("occlusionTexture"), "datos"), (m.get("emissiveTexture"), "color")):
            i = img(clave)
            if i is not None:
                uso.setdefault(i, set()).add(dato)
    return uso


def _gauss(a, sigma):
    from scipy import ndimage as ndi
    return ndi.gaussian_filter(a, sigma, mode="wrap")


def realzar(color, normal, fuerza=1.0):
    """Da nitidez al color y suma al mapa de normales el relieve que sugiere el propio color (veta, grietas).

    color y normal son imagenes PIL del mismo material. Devuelve (color, normal, es_impreso).
    """
    c = np.asarray(color.convert("RGB"), np.float32) / 255.0
    lum = c @ np.array([0.299, 0.587, 0.114], np.float32)
    esc = max(c.shape[0], c.shape[1]) / 1024.0
    claro = float((lum > 0.75).mean())
    impreso = claro > 0.015
    # nitidez (mascara de enfoque)
    cantidad = (0.9 if impreso else 0.7) * fuerza
    borroso = np.stack([_gauss(c[..., k], 1.3 * esc) for k in range(3)], -1)
    c2 = np.clip(c + cantidad * (c - borroso), 0, 1)
    # contraste local suave en maderas y piedras
    if not impreso:
        medio = np.stack([_gauss(c2[..., k], 14 * esc) for k in range(3)], -1)
        c2 = np.clip(c2 + 0.22 * fuerza * (c2 - medio), 0, 1)
    color2 = Image.fromarray((c2 * 255 + 0.5).astype(np.uint8), "RGB")
    if normal is None:
        return color2, None, impreso
    n = np.asarray(normal.convert("RGB").resize((c.shape[1], c.shape[0]), Image.LANCZOS), np.float32) / 255.0 * 2 - 1
    lum2 = c2 @ np.array([0.299, 0.587, 0.114], np.float32)
    alto = lum2 - _gauss(lum2, 5.0 * esc)
    alto = _gauss(alto, 0.6 * esc)
    k = (1.2 if impreso else 5.5) * fuerza / esc
    gy, gx = np.gradient(alto)
    nx = n[..., 0] - gx * k
    ny = n[..., 1] + gy * k
    nz = np.maximum(n[..., 2], 0.05)
    mod = np.sqrt(nx * nx + ny * ny + nz * nz)
    n2 = np.stack([nx / mod, ny / mod, nz / mod], -1)
    normal2 = Image.fromarray(((n2 * 0.5 + 0.5) * 255 + 0.5).astype(np.uint8), "RGB")
    return color2, normal2, impreso


def codificar(buf, usos, lado_max, calidad):
    if isinstance(buf, Image.Image):
        im = buf
        buf = b""
    else:
        im = Image.open(io.BytesIO(buf))
        im.load()
    w, h = im.size
    cambia = max(w, h) > lado_max
    if cambia:
        esc = lado_max / max(w, h)
        im = im.resize((max(1, round(w * esc)), max(1, round(h * esc))), Image.LANCZOS)
    salida = io.BytesIO()
    if "color_alfa" in usos:
        rgba = np.asarray(im.convert("RGBA"))
        gris = (np.abs(rgba[..., 0].astype(int) - rgba[..., 1]) <= 2).all() and (np.abs(rgba[..., 1].astype(int) - rgba[..., 2]) <= 2).all()
        if gris:
            Image.fromarray(np.dstack([rgba[..., 0], rgba[..., 3]]), "LA").save(salida, "PNG", optimize=True)
        else:
            Image.fromarray(rgba, "RGBA").save(salida, "PNG", optimize=True)
        mime = "image/png"
    else:
        q = max(calidad, 90) if "normal" in usos else calidad
        im.convert("RGB").save(salida, "JPEG", quality=q, subsampling=0, optimize=True)
        mime = "image/jpeg"
    nuevo = salida.getvalue()
    if buf and not cambia and len(nuevo) >= len(buf):
        return buf, None, im.size
    return nuevo, mime, im.size


_COMPONENTES = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def cuantizar(g, datos):
    """Pasa a enteros normalizados los atributos que glTF 2.0 permite sin extensiones: UV, color y pesos.

    Solo toca accesores de flotantes que tienen su propia vista de buffer. Devuelve los bytes ahorrados.
    """
    acc = g.get("accessors", [])
    vistas = g.get("bufferViews", [])
    usos = {}
    for a in acc:
        if "bufferView" in a:
            usos[a["bufferView"]] = usos.get(a["bufferView"], 0) + 1
    hechos = set()
    ahorro = 0
    for m in g.get("meshes", []):
        for prim in m.get("primitives", []):
            for nombre, ia in prim.get("attributes", {}).items():
                if ia in hechos:
                    continue
                a = acc[ia]
                bv = a.get("bufferView")
                if bv is None or a.get("componentType") != 5126 or "sparse" in a or a.get("byteOffset", 0) or usos.get(bv) != 1:
                    continue
                if vistas[bv].get("byteStride") or a["type"] not in _COMPONENTES:
                    continue
                n = _COMPONENTES[a["type"]]
                arr = np.frombuffer(datos[bv], np.float32, count=a["count"] * n).reshape(a["count"], n)
                if nombre.startswith("TEXCOORD") and float(arr.min()) >= 0.0 and float(arr.max()) <= 1.0:
                    q = np.round(arr.astype(np.float64) * 65535).astype(np.uint16)
                    a["componentType"] = 5123
                elif nombre.startswith("COLOR"):
                    c = np.clip(arr.astype(np.float64), 0, 1)
                    if n == 3:
                        c = np.concatenate([c, np.ones((len(c), 1))], 1)
                        a["type"] = "VEC4"
                    q = np.round(c * 65535).astype(np.uint16)
                    a["componentType"] = 5123
                elif nombre.startswith("WEIGHTS") and n == 4:
                    w = np.clip(arr.astype(np.float64), 0, None)
                    w = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
                    qi = np.floor(w * 255 + 0.5).astype(np.int64)
                    filas = np.arange(len(qi))
                    qi[filas, qi.argmax(1)] += 255 - qi.sum(1)
                    q = np.clip(qi, 0, 255).astype(np.uint8)
                    a["componentType"] = 5121
                else:
                    continue
                a["normalized"] = True
                a.pop("min", None)
                a.pop("max", None)
                ahorro += len(datos[bv]) - q.nbytes
                datos[bv] = q.tobytes()
                hechos.add(ia)
    return ahorro


def _imagen_de(g, tinfo):
    if not tinfo:
        return None
    t = g["textures"][tinfo["index"]]
    src = t.get("source")
    if src is None:
        for e in t.get("extensions", {}).values():
            src = e.get("source", src)
    return src


def impreso_nitido(color, factor=2, lado_max=2048, fuerza=0.55):
    """Cara impresa de un letrero: se amplia con Lanczos y se enfoca suave, para que el texto aguante el acercamiento."""
    im = color.convert("RGB")
    w, h = im.size
    f = max(1, min(factor, lado_max // max(w, h)))
    if f > 1:
        im = im.resize((w * f, h * f), Image.LANCZOS)
    c = np.asarray(im, np.float32) / 255.0
    borroso = np.stack([_gauss(c[..., k], 0.9 * f) for k in range(3)], -1)
    c2 = np.clip(c + fuerza * (c - borroso), 0, 1)
    return Image.fromarray((c2 * 255 + 0.5).astype(np.uint8), "RGB")


def optimizar(entrada, salida, lado_max=1024, calidad=88, realce=0.0, cuantiza=False, madera=None, lado_texto=2048):
    g, binario = leer_glb(entrada)
    vistas = g.get("bufferViews", [])
    datos = [bytes(binario[v.get("byteOffset", 0): v.get("byteOffset", 0) + v["byteLength"]]) for v in vistas]
    if cuantiza:
        cuantizar(g, datos)
    usos = papeles(g)
    informe = []
    retocadas = {}
    if realce > 0:
        hechos = set()
        for m in g.get("materials", []):
            if m.get("alphaMode", "OPAQUE") != "OPAQUE":
                continue
            ic = _imagen_de(g, m.get("pbrMetallicRoughness", {}).get("baseColorTexture"))
            inm = _imagen_de(g, m.get("normalTexture"))
            if ic is None or ic in hechos:
                continue
            hechos.add(ic)
            if madera is not None and not any(k.lower() in m.get("name", "").lower() for k in madera):
                continue
            imgs = g["images"]
            if "bufferView" not in imgs[ic]:
                continue
            color = Image.open(io.BytesIO(datos[imgs[ic]["bufferView"]]))
            color.load()
            normal = None
            if inm is not None and inm not in hechos and "bufferView" in imgs[inm]:
                normal = Image.open(io.BytesIO(datos[imgs[inm]["bufferView"]]))
                normal.load()
            c2, n2, _imp = realzar(color, normal, realce)
            retocadas[ic] = c2
            if n2 is not None:
                retocadas[inm] = n2
                hechos.add(inm)
    impresas = set()
    if madera is not None:
        for m in g.get("materials", []):
            if any(k.lower() in m.get("name", "").lower() for k in madera):
                continue
            ic = _imagen_de(g, m.get("pbrMetallicRoughness", {}).get("baseColorTexture"))
            if ic is not None and "bufferView" in g["images"][ic]:
                color = Image.open(io.BytesIO(datos[g["images"][ic]["bufferView"]]))
                color.load()
                retocadas[ic] = impreso_nitido(color, 2, lado_texto)
                impresas.add(ic)
    for i, im in enumerate(g.get("images", [])):
        if "bufferView" not in im:
            continue
        bv = im["bufferView"]
        nuevo, mime, tam = codificar(retocadas.get(i, datos[bv]), usos.get(i, {"color"}), lado_texto if i in impresas else lado_max,
                                     max(calidad, 92) if i in impresas else calidad)
        informe.append((im.get("name"), len(datos[bv]), len(nuevo), tam))
        datos[bv] = nuevo
        if mime:
            im["mimeType"] = mime
    # reconstruir el buffer
    nuevo_bin = bytearray()
    for v, d in zip(vistas, datos):
        nuevo_bin += b"\x00" * ((4 - len(nuevo_bin) % 4) % 4)
        v["byteOffset"] = len(nuevo_bin)
        v["byteLength"] = len(d)
        nuevo_bin += d
    g["buffers"][0]["byteLength"] = len(nuevo_bin) + ((4 - len(nuevo_bin) % 4) % 4)
    # extensiones de material en cero
    for m in g.get("materials", []):
        ext = m.get("extensions", {})
        cc = ext.get("KHR_materials_clearcoat")
        if cc is not None and not cc.get("clearcoatFactor", 0):
            ext.pop("KHR_materials_clearcoat")
        sh = ext.get("KHR_materials_sheen")
        if sh is not None and not any(sh.get("sheenColorFactor", [0, 0, 0])) and "sheenColorTexture" not in sh:
            ext.pop("KHR_materials_sheen")
        if "extensions" in m and not ext:
            m.pop("extensions")
    usadas = set()

    def recoge(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "extensions" and isinstance(v, dict):
                    usadas.update(v.keys())
                recoge(v)
        elif isinstance(o, list):
            for v in o:
                recoge(v)

    recoge(g)
    if usadas:
        g["extensionsUsed"] = sorted(usadas)
    else:
        g.pop("extensionsUsed", None)
    if "extensionsRequired" in g:
        g["extensionsRequired"] = [e for e in g["extensionsRequired"] if e in usadas]
        if not g["extensionsRequired"]:
            g.pop("extensionsRequired")
    Path(salida).parent.mkdir(parents=True, exist_ok=True)
    total = escribir_glb(salida, g, nuevo_bin)
    return total, informe


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--max", type=int, default=1024)
    ap.add_argument("--calidad", type=int, default=88)
    ap.add_argument("--detalle", action="store_true")
    ap.add_argument("--realce", type=float, default=0.0)
    ap.add_argument("--cuantizar", action="store_true")
    ap.add_argument("--madera", default=None, help="letreros: partes del nombre de los materiales de madera, separadas por coma; los demas se tratan como caras impresas")
    ap.add_argument("--lado_texto", type=int, default=2048)
    a = ap.parse_args()
    antes = Path(a.entrada).stat().st_size
    madera = [k.strip() for k in a.madera.split(",") if k.strip()] if a.madera is not None else None
    total, informe = optimizar(a.entrada, a.salida, a.max, a.calidad, a.realce, a.cuantizar, madera, a.lado_texto)
    print("{}  {:.2f} MB -> {:.2f} MB".format(Path(a.salida).name, antes / 1e6, total / 1e6))
    if a.detalle:
        for nombre, x, y, tam in informe:
            print("   {:<60} {:>7} -> {:>7}  {}x{}".format(str(nombre)[:60], x, y, tam[0], tam[1]))


if __name__ == "__main__":
    main()
