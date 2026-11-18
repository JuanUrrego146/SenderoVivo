"""Inventario de un .glb sin dependencias: mallas, materiales, texturas, esqueleto y animaciones.

Uso: python -I inspeccionar_glb.py <carpeta o archivo .glb> [...]
"""
import json
import struct
import sys
from pathlib import Path


def leer_glb(ruta):
    datos = Path(ruta).read_bytes()
    magic, version, largo = struct.unpack_from("<4sII", datos, 0)
    assert magic == b"glTF", ruta
    pos = 12
    gltf = None
    binario = b""
    while pos < largo:
        tam, tipo = struct.unpack_from("<I4s", datos, pos)
        cuerpo = datos[pos + 8: pos + 8 + tam]
        if tipo == b"JSON":
            gltf = json.loads(cuerpo.decode("utf-8"))
        elif tipo == b"BIN\x00":
            binario = cuerpo
        pos += 8 + tam
    return gltf, binario


def dimensiones(buf):
    if buf[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack_from(">II", buf, 16)
        return "png", w, h
    if buf[:2] == b"\xff\xd8":
        i = 2
        while i < len(buf):
            if buf[i] != 0xFF:
                i += 1
                continue
            marca = buf[i + 1]
            if marca in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack_from(">HH", buf, i + 5)
                return "jpg", w, h
            seg = struct.unpack_from(">H", buf, i + 2)[0]
            i += 2 + seg
        return "jpg", 0, 0
    if buf[:4] == b"RIFF" and buf[8:12] == b"WEBP":
        return "webp", 0, 0
    return "?", 0, 0


def resumen(ruta):
    g, binario = leer_glb(ruta)
    acc = g.get("accessors", [])
    vistas = g.get("bufferViews", [])
    out = {"archivo": Path(ruta).name, "bytes": Path(ruta).stat().st_size}
    out["generador"] = g.get("asset", {}).get("generator")
    out["extensiones"] = g.get("extensionsUsed", [])
    out["nodos"] = len(g.get("nodes", []))

    mallas = []
    tot_v = tot_t = 0
    for m in g.get("meshes", []):
        v = t = 0
        attrs = set()
        mats = set()
        for p in m.get("primitives", []):
            a = p.get("attributes", {})
            attrs |= set(a)
            v += acc[a["POSITION"]]["count"] if "POSITION" in a else 0
            if "indices" in p:
                t += acc[p["indices"]]["count"] // 3
            else:
                t += (acc[a["POSITION"]]["count"] // 3) if "POSITION" in a else 0
            mats.add(p.get("material"))
        tot_v += v
        tot_t += t
        mallas.append({"nombre": m.get("name"), "prims": len(m.get("primitives", [])), "vert": v, "tri": t,
                       "attrs": sorted(attrs), "mats": sorted(x for x in mats if x is not None),
                       "morph": len(m.get("primitives", [{}])[0].get("targets", []))})
    out["mallas"] = mallas
    out["vert_total"] = tot_v
    out["tri_total"] = tot_t

    # Caja envolvente a partir de los min/max de POSITION (sin transformar).
    mins = [1e9] * 3
    maxs = [-1e9] * 3
    for m in g.get("meshes", []):
        for p in m.get("primitives", []):
            a = p.get("attributes", {})
            if "POSITION" in a and "min" in acc[a["POSITION"]]:
                for i in range(3):
                    mins[i] = min(mins[i], acc[a["POSITION"]]["min"][i])
                    maxs[i] = max(maxs[i], acc[a["POSITION"]]["max"][i])
    out["caja_local"] = [round(maxs[i] - mins[i], 3) for i in range(3)]

    imgs = []
    for im in g.get("images", []):
        if "bufferView" in im:
            bv = vistas[im["bufferView"]]
            buf = binario[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
            tipo, w, h = dimensiones(buf)
            imgs.append({"nombre": im.get("name"), "tipo": tipo, "w": w, "h": h, "kb": round(len(buf) / 1024)})
        else:
            imgs.append({"nombre": im.get("name"), "uri": im.get("uri", "")[:40]})
    out["imagenes"] = imgs

    tex = g.get("textures", [])

    def img_de(tinfo):
        if not tinfo:
            return None
        t = tex[tinfo["index"]]
        src = t.get("source")
        if src is None:
            for ext in t.get("extensions", {}).values():
                src = ext.get("source", src)
        return src

    mats = []
    for m in g.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        mats.append({
            "nombre": m.get("name"),
            "color": [round(c, 3) for c in pbr.get("baseColorFactor", [1, 1, 1, 1])],
            "metal": pbr.get("metallicFactor", 1), "rug": pbr.get("roughnessFactor", 1),
            "t_color": img_de(pbr.get("baseColorTexture")),
            "t_mr": img_de(pbr.get("metallicRoughnessTexture")),
            "t_normal": img_de(m.get("normalTexture")),
            "t_ao": img_de(m.get("occlusionTexture")),
            "t_emis": img_de(m.get("emissiveTexture")),
            "alpha": m.get("alphaMode", "OPAQUE"), "doble": m.get("doubleSided", False),
            "ext": sorted(m.get("extensions", {}).keys()),
        })
    out["materiales"] = mats

    out["skins"] = [{"nombre": s.get("name"), "huesos": len(s.get("joints", []))} for s in g.get("skins", [])]
    anims = []
    for a in g.get("animations", []):
        dur = 0.0
        for s in a.get("samplers", []):
            mx = acc[s["input"]].get("max", [0])[0]
            dur = max(dur, mx)
        rutas = {}
        for c in a.get("channels", []):
            rutas[c["target"]["path"]] = rutas.get(c["target"]["path"], 0) + 1
        anims.append({"nombre": a.get("name"), "canales": len(a.get("channels", [])), "dur_s": round(dur, 3), "rutas": rutas})
    out["animaciones"] = anims
    return out


def main():
    rutas = []
    for a in sys.argv[1:]:
        p = Path(a)
        rutas += sorted(p.rglob("*.glb")) if p.is_dir() else [p]
    for r in rutas:
        s = resumen(r)
        print("=" * 100)
        print(f"{r.parent.name}/{s['archivo']}  {s['bytes']/1e6:.2f} MB  gen={s['generador']}  ext={s['extensiones']}")
        print(f"  nodos={s['nodos']}  vert={s['vert_total']}  tri={s['tri_total']}  caja_local={s['caja_local']}")
        for m in s["mallas"]:
            print(f"  malla {m['nombre']!r}: prims={m['prims']} v={m['vert']} t={m['tri']} mats={m['mats']} morph={m['morph']} attrs={','.join(x for x in m['attrs'] if x not in ('POSITION','NORMAL'))}")
        for i, m in enumerate(s["materiales"]):
            print(f"  mat[{i}] {m['nombre']!r}: color={m['color']} metal={m['metal']} rug={m['rug']} tex(c/mr/n/ao/e)={m['t_color']}/{m['t_mr']}/{m['t_normal']}/{m['t_ao']}/{m['t_emis']} alpha={m['alpha']} doble={m['doble']} {m['ext'] or ''}")
        for i, im in enumerate(s["imagenes"]):
            print(f"  img[{i}] {im.get('nombre')!r}: {im.get('tipo')} {im.get('w')}x{im.get('h')} {im.get('kb')} KB")
        for sk in s["skins"]:
            print(f"  skin {sk['nombre']!r}: {sk['huesos']} huesos")
        for a in s["animaciones"]:
            print(f"  anim {a['nombre']!r}: canales={a['canales']} dur={a['dur_s']} s rutas={a['rutas']}")


if __name__ == "__main__":
    main()
