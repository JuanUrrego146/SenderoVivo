# Ensambla golondrina-plomiza.glb (glTF 2.0 binario) desde los 9 OBJ extraidos
# del .mb + las texturas PBR de Felipe del repositorio.
#
# Decisiones:
# - Escala: la escena Maya esta en cm; glTF define metros -> se hornea x0.01.
# - Ejes: Maya y glTF son ambos Y-arriba diestros: sin conversion.
# - UV: OBJ/Maya usan origen abajo-izquierda, glTF arriba-izquierda -> v' = 1-v.
# - Normales: el .mb no las guarda (Maya las recalcula); se calculan suaves por
#   posicion, ponderadas por area (pajaro organico: suave es lo correcto).
# - Materiales: metal/rough de glTF nativo. BaseColor sRGB tal cual; Metallic(B)
#   + Roughness(G) empaquetados en un PNG lineal; Normal tal cual (lineal).
#   Height se omite: el nucleo de glTF no tiene desplazamiento (queda anotado).
# Uso (desde la raiz del repo, tras correr extraer_mb.py):
#   python scripts/modelos/ensamblar_glb.py [dir_objs] [dir_texturas] [salida.glb]
# Requiere: pip install pillow
import json, struct, io, os, sys
from PIL import Image

OBJS = sys.argv[1] if len(sys.argv) > 1 else os.path.join("scripts", "modelos", "golondrina_extraida")
TEX = sys.argv[2] if len(sys.argv) > 2 else os.path.join("assets", "models", "golondrina-plomiza-fuente", "texturas")
SALIDA = sys.argv[3] if len(sys.argv) > 3 else os.path.join("assets", "models", "golondrina-plomiza.glb")
ESCALA = 0.01  # cm -> m

# pieza -> prefijo de textura (el cuerpo usa 'Cuerpo1'; el resto su propio nombre)
PIEZAS = ["Cuerpo", "Ala_Derecha", "Ala_Izquierda", "Pata_Derecha", "Pata_Izquierda",
          "Pico_Superior", "Pico_Inferior", "Ojo_Derecho", "Ojo_Izquierdo"]
PREFIJO = {p: ("Cuerpo1" if p == "Cuerpo" else p) for p in PIEZAS}

def leer_obj(ruta):
    vs, vts, caras = [], [], []
    for linea in open(ruta, encoding="utf8"):
        t = linea.split()
        if not t: continue
        if t[0] == "v": vs.append(tuple(float(x) for x in t[1:4]))
        elif t[0] == "vt": vts.append(tuple(float(x) for x in t[1:3]))
        elif t[0] == "f":
            cara = []
            for w in t[1:]:
                a = w.split("/")
                cara.append((int(a[0]) - 1, int(a[1]) - 1))
            caras.append(cara)
    return vs, vts, caras

def cruz(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])

def resta(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])

bin_parts = []          # trozos del buffer binario
buffer_views = []
accessors = []
images = []
textures = []
materials = []
primitives = []

def alinear(n=4):
    total = sum(len(p) for p in bin_parts)
    resto = total % n
    if resto: bin_parts.append(b"\x00" * (n - resto))

def agregar_bv(datos, target=None):
    alinear(4)
    offset = sum(len(p) for p in bin_parts)
    bin_parts.append(datos)
    bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(datos)}
    if target: bv["target"] = target
    buffer_views.append(bv)
    return len(buffer_views) - 1

def agregar_imagen(pil_img=None, ruta=None, nombre=""):
    if ruta is not None:
        datos = open(ruta, "rb").read()
    else:
        out = io.BytesIO(); pil_img.save(out, "PNG", optimize=True); datos = out.getvalue()
    bv = agregar_bv(datos)
    images.append({"bufferView": bv, "mimeType": "image/png", "name": nombre})
    textures.append({"source": len(images) - 1, "sampler": 0})
    return len(textures) - 1

for pieza in PIEZAS:
    vs, vts, caras = leer_obj(os.path.join(OBJS, pieza + ".obj"))
    vs = [(x * ESCALA, y * ESCALA, z * ESCALA) for (x, y, z) in vs]

    # normales suaves por posicion, ponderadas por area (via cruz sin normalizar)
    acum = [[0.0, 0.0, 0.0] for _ in vs]
    tris = []
    for cara in caras:
        for i in range(1, len(cara) - 1):        # abanico
            tri = (cara[0], cara[i], cara[i + 1])
            tris.append(tri)
            p0, p1, p2 = (vs[t[0]] for t in tri)
            n = cruz(resta(p1, p0), resta(p2, p0))
            for (vi, _) in tri:
                acum[vi][0] += n[0]; acum[vi][1] += n[1]; acum[vi][2] += n[2]
    normales = []
    for n in acum:
        l = (n[0]**2 + n[1]**2 + n[2]**2) ** 0.5 or 1.0
        normales.append((n[0]/l, n[1]/l, n[2]/l))

    # soldar por (v, vt)
    mapa, pos, nor, uv, indices = {}, [], [], [], []
    for tri in tris:
        for (vi, ti) in tri:
            clave = (vi, ti)
            if clave not in mapa:
                mapa[clave] = len(pos)
                pos.append(vs[vi]); nor.append(normales[vi])
                u, v = vts[ti]; uv.append((u, 1.0 - v))
            indices.append(mapa[clave])

    def acc_f32(datos, ncomp, tipo, target, minmax=False):
        plano = [c for tupla in datos for c in tupla]
        bv = agregar_bv(struct.pack("<%df" % len(plano), *plano), target)
        acc = {"bufferView": bv, "componentType": 5126, "count": len(datos), "type": tipo}
        if minmax:
            acc["min"] = [min(d[i] for d in datos) for i in range(ncomp)]
            acc["max"] = [max(d[i] for d in datos) for i in range(ncomp)]
        accessors.append(acc)
        return len(accessors) - 1

    a_pos = acc_f32(pos, 3, "VEC3", 34962, minmax=True)
    a_nor = acc_f32(nor, 3, "VEC3", 34962)
    a_uv = acc_f32(uv, 2, "VEC2", 34962)
    bv_idx = agregar_bv(struct.pack("<%dH" % len(indices), *indices), 34963)
    accessors.append({"bufferView": bv_idx, "componentType": 5123, "count": len(indices), "type": "SCALAR"})
    a_idx = len(accessors) - 1

    pref = PREFIJO[pieza]
    ruta_bc = os.path.join(TEX, f"Golondrina_{pref}_BaseColor.1001.png")
    ruta_no = os.path.join(TEX, f"Golondrina_{pref}_Normal.1001.png")
    ruta_ro = os.path.join(TEX, f"Golondrina_{pref}_Roughness.1001.png")
    ruta_me = os.path.join(TEX, f"Golondrina_{pref}_Metallic.1001.png")

    t_bc = agregar_imagen(ruta=ruta_bc, nombre=f"{pieza}_BaseColor")
    rough = Image.open(ruta_ro).convert("L")
    metal = Image.open(ruta_me).convert("L").resize(rough.size)
    blanco = Image.new("L", rough.size, 255)
    mr = Image.merge("RGB", (blanco, rough, metal))
    t_mr = agregar_imagen(pil_img=mr, nombre=f"{pieza}_MetalRough")
    t_no = agregar_imagen(ruta=ruta_no, nombre=f"{pieza}_Normal")

    materials.append({
        "name": pieza,
        "pbrMetallicRoughness": {
            "baseColorTexture": {"index": t_bc},
            "metallicRoughnessTexture": {"index": t_mr},
            "metallicFactor": 1.0, "roughnessFactor": 1.0
        },
        "normalTexture": {"index": t_no}
    })
    primitives.append({
        "attributes": {"POSITION": a_pos, "NORMAL": a_nor, "TEXCOORD_0": a_uv},
        "indices": a_idx, "material": len(materials) - 1, "mode": 4
    })
    print(f"{pieza}: {len(pos)} verts soldados, {len(indices)//3} tris")

alinear(4)
binario = b"".join(bin_parts)
gltf = {
    "asset": {"version": "2.0", "generator": "SenderoVivo ensamblar_glb.py",
              "copyright": "Modelo: Felipe Acevedo (Sendero Vivo, UMNG)"},
    "scene": 0,
    "scenes": [{"nodes": [0], "name": "GolondrinaPlomiza"}],
    "nodes": [{"mesh": 0, "name": "GolondrinaPlomiza"}],
    "meshes": [{"name": "GolondrinaPlomiza", "primitives": primitives}],
    "materials": materials,
    "textures": textures,
    "images": images,
    "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
    "accessors": accessors,
    "bufferViews": buffer_views,
    "buffers": [{"byteLength": len(binario)}]
}
js = json.dumps(gltf, separators=(",", ":")).encode("utf8")
js += b" " * ((4 - len(js) % 4) % 4)
total = 12 + 8 + len(js) + 8 + len(binario)
with open(SALIDA, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, total))
    f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack("<II", len(binario), 0x004E4942)); f.write(binario)
print("GLB:", SALIDA, round(total / 1e6, 2), "MB")
