# Genera la version ligera de un GLB para colocarlo en el mundo del visor.
#
# El original (assets/models/<nombre>.glb) conserva sus texturas de 1024 px y lo
# usa la ficha 3D, que carga un modelo a la vez. En el mundo hay varios modelos
# a la vez y cada textura de 1024 px ocupa unos 5,3 MB de memoria de video con
# sus mipmaps: esta copia (assets/models/mundo/<nombre>.glb) baja el tamano de
# las imagenes sin tocar la geometria.
#
# Decisiones:
# - Clasificacion por uso en los materiales: baseColorTexture y emissiveTexture
#   son de color; normalTexture es normal; metallicRoughnessTexture y
#   occlusionTexture son del mapa combinado. Una imagen con varios usos toma el
#   tamano mayor de sus usos y solo es "de color" si todos sus usos lo son.
#   Una imagen que ningun material usa se elimina.
# - Tamano: lado maximo --base para las de color y --resto para las demas, con
#   Image.LANCZOS y conservando la proporcion. Nunca agranda.
# - Formato: las de color sin transparencia real van a JPEG (RGB, --calidad);
#   las demas a PNG con optimize=True. Un canal alfa que vale 255 en todos los
#   pixeles no es transparencia: se descarta, el resultado se ve igual.
# - Duplicados: se compara el hash de los bytes ya codificados y las texturas
#   que apuntaban a una copia pasan a apuntar a la primera.
# - bufferViews: primero los que no son de imagen, en su orden y alineados a 4
#   bytes; despues uno por imagen unica. Se reapuntan accessors e images con una
#   tabla de traduccion; ningun indice viejo queda vivo.
# - Determinista: la misma entrada da los mismos bytes (sin fechas ni azar).
# Uso (desde la raiz del repo):
#   python scripts/modelos/aligerar_glb.py <entrada.glb> <salida.glb> [--base 512] [--resto 256] [--calidad 90]
# Requiere: pip install pillow
import argparse
import hashlib
import io
import json
import struct
import sys

from PIL import Image

MAGIA_GLB = 0x46546C67   # "glTF"
TROZO_JSON = 0x4E4F534A  # "JSON"
TROZO_BIN = 0x004E4942   # "BIN\0"

# usos de una textura dentro de un material
COLOR, NORMAL, COMBINADO = "color", "normal", "combinado"


def leer_glb(ruta):
    datos = open(ruta, "rb").read()
    magia, version, _ = struct.unpack_from("<III", datos, 0)
    if magia != MAGIA_GLB or version != 2:
        sys.exit(f"{ruta}: no es un GLB de glTF 2.0")
    js, binario, pos = None, b"", 12
    while pos < len(datos):
        largo, tipo = struct.unpack_from("<II", datos, pos)
        trozo = datos[pos + 8: pos + 8 + largo]
        if tipo == TROZO_JSON:
            js = json.loads(trozo.decode("utf8"))
        elif tipo == TROZO_BIN:
            binario = trozo
        pos += 8 + largo
    if js is None:
        sys.exit(f"{ruta}: no trae el trozo JSON")
    if len(js.get("buffers", [])) != 1:
        sys.exit(f"{ruta}: se esperaba un solo buffer embebido")
    return js, binario, len(datos)


def usos_por_imagen(js):
    """Mapa imagen -> lista de usos (color / normal / combinado) segun los materiales."""
    texturas = js.get("textures", [])
    usos = {}

    def anotar(ref, uso):
        if not ref:
            return
        imagen = texturas[ref["index"]]["source"]
        usos.setdefault(imagen, []).append(uso)

    for material in js.get("materials", []):
        pbr = material.get("pbrMetallicRoughness", {})
        anotar(pbr.get("baseColorTexture"), COLOR)
        anotar(material.get("emissiveTexture"), COLOR)
        anotar(material.get("normalTexture"), NORMAL)
        anotar(pbr.get("metallicRoughnessTexture"), COMBINADO)
        anotar(material.get("occlusionTexture"), COMBINADO)
    return usos


def tiene_transparencia(img):
    if img.mode in ("RGBA", "LA"):
        return img.getchannel("A").getextrema()[0] < 255
    if img.mode == "P":
        return "transparency" in img.info
    return False


def codificar(img, es_color, calidad):
    """Devuelve (bytes, mimeType) de la imagen ya redimensionada."""
    salida = io.BytesIO()
    if es_color and not tiene_transparencia(img):
        img.convert("RGB").save(salida, "JPEG", quality=calidad)
        return salida.getvalue(), "image/jpeg"
    if tiene_transparencia(img):
        img = img.convert("RGBA")
    elif img.mode not in ("L", "RGB"):
        img = img.convert("RGB")
    img.save(salida, "PNG", optimize=True)
    return salida.getvalue(), "image/png"


def aligerar(js, binario, base, resto, calidad):
    usos = usos_por_imagen(js)
    imagenes_viejas = js.get("images", [])

    # 1. Re-codifica las imagenes usadas, en el orden en que aparecian.
    codificadas = {}      # indice viejo -> (bytes, mime)
    for indice, imagen in enumerate(imagenes_viejas):
        if indice not in usos:
            continue
        vista = js["bufferViews"][imagen["bufferView"]]
        inicio = vista.get("byteOffset", 0)
        origen = Image.open(io.BytesIO(binario[inicio: inicio + vista["byteLength"]]))
        origen.load()
        es_color = all(uso == COLOR for uso in usos[indice])
        lado = base if any(uso == COLOR for uso in usos[indice]) else resto
        factor = min(1.0, lado / max(origen.size))
        if factor < 1.0:
            nuevo = (max(1, round(origen.width * factor)), max(1, round(origen.height * factor)))
            origen = origen.resize(nuevo, Image.LANCZOS)
        codificadas[indice] = codificar(origen, es_color, calidad)

    # 2. Quita duplicados por hash de los bytes codificados.
    unicas, por_hash, nueva_imagen = [], {}, {}
    for indice in sorted(codificadas):
        datos, mime = codificadas[indice]
        clave = hashlib.sha256(datos).hexdigest()
        if clave not in por_hash:
            por_hash[clave] = len(unicas)
            unicas.append((datos, mime, imagenes_viejas[indice].get("name")))
        nueva_imagen[indice] = por_hash[clave]

    # 3. Reconstruye bufferViews: primero los que no son de imagen, luego una por imagen unica.
    de_imagen = {imagen["bufferView"] for imagen in imagenes_viejas}
    partes, vistas, traduccion = [], [], {}

    def alinear():
        resto_4 = sum(len(p) for p in partes) % 4
        if resto_4:
            partes.append(b"\x00" * (4 - resto_4))

    for indice, vista in enumerate(js["bufferViews"]):
        if indice in de_imagen:
            continue
        alinear()
        inicio = vista.get("byteOffset", 0)
        nueva = {k: v for k, v in vista.items() if k not in ("buffer", "byteOffset", "byteLength")}
        nueva = {"buffer": 0, "byteOffset": sum(len(p) for p in partes),
                 "byteLength": vista["byteLength"], **nueva}
        partes.append(binario[inicio: inicio + vista["byteLength"]])
        traduccion[indice] = len(vistas)
        vistas.append(nueva)

    imagenes_nuevas = []
    for datos, mime, nombre in unicas:
        alinear()
        vistas.append({"buffer": 0, "byteOffset": sum(len(p) for p in partes), "byteLength": len(datos)})
        partes.append(datos)
        imagen = {"bufferView": len(vistas) - 1, "mimeType": mime}
        if nombre:
            imagen["name"] = nombre
        imagenes_nuevas.append(imagen)

    # 4. Reapunta accessors (y sus datos dispersos), imagenes y texturas.
    for accesor in js.get("accessors", []):
        if "bufferView" in accesor:
            accesor["bufferView"] = traduccion[accesor["bufferView"]]
        disperso = accesor.get("sparse")
        if disperso:
            disperso["indices"]["bufferView"] = traduccion[disperso["indices"]["bufferView"]]
            disperso["values"]["bufferView"] = traduccion[disperso["values"]["bufferView"]]
    for textura in js.get("textures", []):
        if textura.get("source") in nueva_imagen:
            textura["source"] = nueva_imagen[textura["source"]]
    js["images"] = imagenes_nuevas
    js["bufferViews"] = vistas

    alinear()
    nuevo_binario = b"".join(partes)
    js["buffers"] = [{"byteLength": len(nuevo_binario)}]
    generador = js.get("asset", {}).get("generator", "origen desconocido")
    js.setdefault("asset", {"version": "2.0"})["generator"] = f"SenderoVivo aligerar_glb.py (desde {generador})"
    return js, nuevo_binario, len(imagenes_viejas), len(imagenes_nuevas)


def escribir_glb(ruta, js, binario):
    cuerpo = json.dumps(js, separators=(",", ":"), ensure_ascii=False).encode("utf8")
    cuerpo += b" " * ((4 - len(cuerpo) % 4) % 4)
    binario += b"\x00" * ((4 - len(binario) % 4) % 4)
    total = 12 + 8 + len(cuerpo) + 8 + len(binario)
    with open(ruta, "wb") as f:
        f.write(struct.pack("<III", MAGIA_GLB, 2, total))
        f.write(struct.pack("<II", len(cuerpo), TROZO_JSON))
        f.write(cuerpo)
        f.write(struct.pack("<II", len(binario), TROZO_BIN))
        f.write(binario)
    return total


def main():
    ap = argparse.ArgumentParser(description="Genera la version ligera de un GLB para el mundo.")
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--base", type=int, default=512, help="lado maximo del color base (px)")
    ap.add_argument("--resto", type=int, default=256, help="lado maximo de normal y mapa combinado (px)")
    ap.add_argument("--calidad", type=int, default=90, help="calidad JPEG del color base")
    args = ap.parse_args()

    js, binario, bytes_entrada = leer_glb(args.entrada)
    js, binario, antes, despues = aligerar(js, binario, args.base, args.resto, args.calidad)
    bytes_salida = escribir_glb(args.salida, js, binario)
    print(f"{args.salida}: imagenes de {antes} a {despues}, bytes de {bytes_entrada} a {bytes_salida}")


if __name__ == "__main__":
    main()
