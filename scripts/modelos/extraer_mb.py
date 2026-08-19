#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extraer_mb.py — Extractor de geometria de un .mb de Maya 2026 (IFF FOR8).

Formato verificado empiricamente sobre "Golondrina Entregable.mb":

Contenedor IFF FOR8 (64 bits, big-endian):
  - Chunk: tag(4) + extra(4, ignorable) + size(8 BE) + datos[size].
  - Grupos: FOR8/LIS8; sus datos empiezan con un tipo de 4 bytes (Maya, HEAD,
    XFRM, DMSH, SHAD, CONS, ...) seguido de los chunks miembros.
  - Avance: los chunks de DATOS se rellenan hasta multiplo de 8 contando la
    cabecera (avance = ceil8(16+size)); los GRUPOS avanzan exacto 16+size
    (su tamano ya incluye el padding interno).

Nodos:
  - CREA: flag(1) + nombre\0 [+ padre\0] + UUID(16).
  - Atributos: nombre\0 + flag(1, 0x20) + payload BE (DBLE/DBL2/DBL3 doubles,
    FLT2 float32, STR texto, CMP# listas de componentes "CMDF").

Chunk MESH (atributo "o" del nodo DMSH), todo big-endian:
  - "o\0 " +
  - nvf:u32 + nvf float32          -> posiciones xyz (nvf/3 vertices)
  - ne:u32  + ne  int32            -> aristas como pares (v0|flag_dura, v1)
  - nfr:u32 + nfr int32            -> refs de arista por cara, en orden;
        bit 0x80000000 = arista invertida, bits 0x60000000 = ultima de la cara,
        indice = valor & 0x1FFFFFFF
  - u32 = 0                        -> seccion vacia (holes/normales explicitas)
  - nsets:u32; por set: id:u32 + nombre\0 + nuv:u32 + nuv float32 (u,v)
                        + nuvi:u32 + nuvi int32 (indice UV por vertice-de-cara)
  - cola: gtags (no necesarios)

Grupos de material: chunks CMP# "iog[0].og[N].gcl" del DMSH dan rangos de caras
[ini,fin] por grupo; las conexiones CWFL del LIS8 CONS
("pCube31Shape.iog.og[N]" -> "<shadingEngine>.dsm") dan el nombre de cada grupo.

Salida: un OBJ por grupo de material (v/vt/f con indices remapeados) en el
espacio de mundo del transform padre, mas informe.json con metricas.
"""
import json
import math
import os
import re
import struct
import sys

RUTA_MB = sys.argv[1] if len(sys.argv) > 1 else r"assets\models\golondrina-plomiza-fuente\Golondrina Entregable.mb"
DIR_SALIDA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "golondrina_extraida")

GRUPOS = {b"FOR8", b"LIS8", b"CAT8", b"PRO8"}


# ---------------------------------------------------------------- IFF FOR8 --
def iter_chunks(data, ini, fin):
    """Itera (tag, data_ini, size) de los chunks entre ini y fin."""
    off = ini
    while off + 16 <= fin:
        tag = data[off:off + 4]
        size = struct.unpack(">Q", data[off + 8:off + 16])[0]
        if off + 16 + size > fin:
            break
        yield tag, off + 16, size
        total = 16 + size
        if tag not in GRUPOS and total % 8:
            total += 8 - (total % 8)
        off += total


def parse_crea(data):
    """CREA: flag(1) + nombre\0 [+ padre\0] + UUID(16)."""
    cuerpo = data[1:-16]
    partes = cuerpo.split(b"\x00")
    nombre = partes[0].decode("utf-8", "replace")
    padre = partes[1].decode("utf-8", "replace") if len(partes) > 1 and partes[1] else None
    return nombre, padre


def parse_attr_nombre(data):
    """nombre\0 + flag(1) + payload -> (nombre, payload)."""
    i = data.index(b"\x00")
    return data[:i].decode("utf-8", "replace"), data[i + 2:]


# ------------------------------------------------------------------- nodos --
def recolectar(data):
    """Recorre el arbol y devuelve (nodos, conexiones).

    nodos: lista de dicts {tipo4, nombre, padre, attrs:{nombre:bytes}, chunks:[(tag,nombre,payload)]}
    conexiones: lista (src, dst) de los CWFL del LIS8 CONS.
    """
    nodos, conexiones = [], []

    def visitar(ini, fin):
        for tag, doff, size in iter_chunks(data, ini, fin):
            if tag not in GRUPOS:
                continue
            gtipo = data[doff:doff + 4]
            g_ini, g_fin = doff + 4, doff + size
            if gtipo in (b"Maya",):
                visitar(g_ini, g_fin)
            elif gtipo == b"HEAD":
                continue
            elif gtipo == b"CONS":
                def coger_conexiones(ini2, fin2):
                    for t2, d2, s2 in iter_chunks(data, ini2, fin2):
                        if t2 in GRUPOS:  # p.ej. FOR8 CONN anidado
                            coger_conexiones(d2 + 4, d2 + s2)
                        elif t2 == b"CWFL":
                            cuerpo = data[d2 + 1:d2 + s2]  # 1 byte de flag
                            partes = cuerpo.split(b"\x00")
                            if len(partes) >= 2:
                                conexiones.append((partes[0].decode("utf-8", "replace"),
                                                   partes[1].decode("utf-8", "replace")))
                coger_conexiones(g_ini, g_fin)
            else:
                nodo = {"tipo4": gtipo, "nombre": None, "padre": None,
                        "attrs": {}, "chunks": []}
                for t2, d2, s2 in iter_chunks(data, g_ini, g_fin):
                    cuerpo = data[d2:d2 + s2]
                    if t2 == b"CREA":
                        nodo["nombre"], nodo["padre"] = parse_crea(cuerpo)
                    else:
                        try:
                            an, ap = parse_attr_nombre(cuerpo)
                        except ValueError:
                            an, ap = None, cuerpo
                        nodo["chunks"].append((t2, an, ap))
                        if an is not None:
                            nodo["attrs"][an] = (t2, ap)
                nodos.append(nodo)

    visitar(0, len(data))
    return nodos, conexiones


# -------------------------------------------------------------- transform --
def leer_dbl(nodo, nombre, n, defecto):
    """Lee un atributo DBLE/DBL3 de n doubles; devuelve tupla o defecto."""
    ent = nodo["attrs"].get(nombre)
    if not ent:
        return defecto
    _, payload = ent
    if len(payload) < 8 * n:
        return defecto
    return struct.unpack(f">{n}d", payload[:8 * n])


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def mat_trans(t):
    m = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    m[0][3], m[1][3], m[2][3] = t
    return m


def mat_escala(s):
    return [[s[0], 0, 0, 0], [0, s[1], 0, 0], [0, 0, s[2], 0], [0, 0, 0, 1.0]]


def mat_rot_xyz(r, orden="xyz"):
    """Rotacion Maya (grados, orden por defecto xyz => R = Rz*Ry*Rx)."""
    rx, ry, rz = (math.radians(v) for v in r)
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    mx = [[1, 0, 0, 0], [0, cx, -sx, 0], [0, sx, cx, 0], [0, 0, 0, 1]]
    my = [[cy, 0, sy, 0], [0, 1, 0, 0], [-sy, 0, cy, 0], [0, 0, 0, 1]]
    mz = [[cz, -sz, 0, 0], [sz, cz, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    ejes = {"x": mx, "y": my, "z": mz}
    m = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    for eje in orden:  # orden xyz: primero X, luego Y, luego Z => Rz*Ry*Rx
        m = mat_mul(ejes[eje], m)
    return m


def matriz_mundo(xfrm):
    """Matriz local->mundo de un transform Maya (sin shear/rotateAxis raros).

    Formula Maya: M = T * Mrpt * Mrp * MR * Mra * Mrp^-1 * Mspt * Msp * MS * Msp^-1
    (con vectores columna, aplicada como M @ v).
    """
    t = leer_dbl(xfrm, "t", 3, (0.0, 0.0, 0.0))
    r = leer_dbl(xfrm, "r", 3, (0.0, 0.0, 0.0))
    s = leer_dbl(xfrm, "s", 3, (1.0, 1.0, 1.0))
    rp = leer_dbl(xfrm, "rp", 3, (0.0, 0.0, 0.0))
    sp = leer_dbl(xfrm, "sp", 3, (0.0, 0.0, 0.0))
    rpt = leer_dbl(xfrm, "rpt", 3, (0.0, 0.0, 0.0))
    spt = leer_dbl(xfrm, "spt", 3, (0.0, 0.0, 0.0))
    ra = leer_dbl(xfrm, "ra", 3, (0.0, 0.0, 0.0))
    neg = lambda v: tuple(-x for x in v)
    m = mat_trans(t)
    m = mat_mul(m, mat_trans(rpt))
    m = mat_mul(m, mat_trans(rp))
    m = mat_mul(m, mat_rot_xyz(r))
    m = mat_mul(m, mat_rot_xyz(ra))
    m = mat_mul(m, mat_trans(neg(rp)))
    m = mat_mul(m, mat_trans(spt))
    m = mat_mul(m, mat_trans(sp))
    m = mat_mul(m, mat_escala(s))
    m = mat_mul(m, mat_trans(neg(sp)))
    return m


def es_identidad(m, eps=1e-12):
    return all(abs(m[i][j] - (1.0 if i == j else 0.0)) < eps for i in range(4) for j in range(4))


def aplicar(m, v):
    x, y, z = v
    return (m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
            m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
            m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3])


# ------------------------------------------------------------------- MESH --
def parse_mesh(payload):
    """Decodifica el payload del chunk MESH (ya sin 'o\\0 ')."""
    pos = 0

    def u32():
        nonlocal pos
        v = struct.unpack(">I", payload[pos:pos + 4])[0]
        pos += 4
        return v

    nvf = u32()
    posiciones = struct.unpack(f">{nvf}f", payload[pos:pos + 4 * nvf]); pos += 4 * nvf
    vertices = [tuple(posiciones[i:i + 3]) for i in range(0, nvf, 3)]

    ne = u32()
    earr = struct.unpack(f">{ne}i", payload[pos:pos + 4 * ne]); pos += 4 * ne
    aristas = [((earr[i] & 0x7FFFFFFF), earr[i + 1], bool(earr[i] & -0x80000000))
               for i in range(0, ne, 2)]  # (v0, v1, dura)

    nfr = u32()
    refs = struct.unpack(f">{nfr}I", payload[pos:pos + 4 * nfr]); pos += 4 * nfr
    caras = []      # cada cara: lista de (indice_arista, invertida)
    actual = []
    for ref in refs:
        idx = ref & 0x1FFFFFFF
        invertida = bool(ref & 0x80000000)
        actual.append((idx, invertida))
        if (ref & 0x60000000) == 0x60000000:
            caras.append(actual)
            actual = []
    if actual:
        raise ValueError("cara sin cerrar al final de la seccion de caras")

    seccion_vacia = u32()
    if seccion_vacia != 0:
        raise ValueError(f"seccion post-caras no vacia ({seccion_vacia}), formato inesperado")

    nsets = u32()
    sets_uv = []
    for _ in range(nsets):
        _sid = u32()
        fin_nombre = payload.index(b"\x00", pos)
        nombre = payload[pos:fin_nombre].decode("utf-8", "replace")
        pos = fin_nombre + 1
        nuv = u32()
        fuv = struct.unpack(f">{nuv}f", payload[pos:pos + 4 * nuv]); pos += 4 * nuv
        uvs = [tuple(fuv[i:i + 2]) for i in range(0, nuv, 2)]
        nuvi = u32()
        uvi = list(struct.unpack(f">{nuvi}i", payload[pos:pos + 4 * nuvi])); pos += 4 * nuvi
        sets_uv.append({"nombre": nombre, "uvs": uvs, "indices": uvi})

    return {"vertices": vertices, "aristas": aristas, "caras": caras,
            "sets_uv": sets_uv, "bytes_cola": len(payload) - pos}


def vertices_de_cara(cara, aristas):
    """Vertices de la cara siguiendo sus aristas orientadas; valida la cadena."""
    vs = []
    for idx, inv in cara:
        v0, v1, _ = aristas[idx]
        vs.append(v1 if inv else v0)
    # validacion: el final de cada arista debe ser el inicio de la siguiente
    for k, (idx, inv) in enumerate(cara):
        v0, v1, _ = aristas[idx]
        fin = v0 if inv else v1
        sig = vs[(k + 1) % len(vs)]
        if fin != sig:
            raise ValueError(f"cadena de aristas rota en cara {cara}")
    return vs


def parse_cmp_rangos(payload):
    """CMP# 'CMDF': u32(1) + 'CMDF' + n + n*(ini,fin) -> lista de rangos."""
    pos = 0
    _uno = struct.unpack(">I", payload[pos:pos + 4])[0]; pos += 4
    magia = payload[pos:pos + 4]; pos += 4
    if magia != b"CMDF":
        raise ValueError(f"lista de componentes sin CMDF: {magia!r}")
    n = struct.unpack(">I", payload[pos:pos + 4])[0]; pos += 4
    vals = struct.unpack(f">{2 * n}i", payload[pos:pos + 8 * n])
    return [(vals[i], vals[i + 1]) for i in range(0, 2 * n, 2)]


# -------------------------------------------------------------------- main --
def main():
    data = open(RUTA_MB, "rb").read()
    nodos, conexiones = recolectar(data)

    mallas = [n for n in nodos if n["tipo4"] == b"DMSH"]
    xfrms = {n["nombre"]: n for n in nodos if n["tipo4"] == b"XFRM"}
    print(f"nodos: {len(nodos)}  conexiones: {len(conexiones)}  mallas DMSH: {len(mallas)}")

    os.makedirs(DIR_SALIDA, exist_ok=True)
    informe = {"archivo": RUTA_MB, "mallas_dmsh": len(mallas), "piezas": {}, "notas": []}

    for malla in mallas:
        nombre_shape = malla["nombre"]
        nombre_padre = malla["padre"]
        print(f"\n== malla {nombre_shape} (padre {nombre_padre}) ==")

        # transform padre -> matriz mundo (encadenando ancestros si hubiera)
        m = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
        cadena, p = [], nombre_padre
        while p and p in xfrms:
            cadena.append(xfrms[p])
            p = xfrms[p]["padre"]
        for xf in cadena:  # cadena va de hijo a raiz: m = M_raiz @ ... @ M_padre
            m = mat_mul(matriz_mundo(xf), m)
        identidad = es_identidad(m)
        print(f"transform mundo identidad: {identidad}")

        # chunk MESH
        chunk_mesh = next((ap for (t, an, ap) in malla["chunks"] if t == b"MESH"), None)
        if chunk_mesh is None:
            informe["notas"].append(f"{nombre_shape}: sin chunk MESH")
            continue
        mesh = parse_mesh(chunk_mesh)
        vertices = mesh["vertices"]
        aristas = mesh["aristas"]
        caras = mesh["caras"]
        set_uv = mesh["sets_uv"][0] if mesh["sets_uv"] else None
        print(f"vertices {len(vertices)}  aristas {len(aristas)}  caras {len(caras)}  "
              f"uvs {len(set_uv['uvs']) if set_uv else 0}  cola {mesh['bytes_cola']}B")

        # euler por confianza
        euler = len(vertices) - len(aristas) + len(caras)
        print(f"caracteristica de Euler V-E+F = {euler} (2 x num shells cerrados)")

        # validar cadenas de aristas y armar vertices por cara
        caras_v = [vertices_de_cara(c, aristas) for c in caras]

        # indices UV por vertice-de-cara, en el mismo orden plano que las caras
        uvi_por_cara = []
        if set_uv:
            plano = set_uv["indices"]
            k = 0
            for c in caras:
                uvi_por_cara.append(plano[k:k + len(c)])
                k += len(c)
            assert k == len(plano), "indices UV no cuadran con las caras"

        # grupos de material: rangos de caras por og[N]
        rangos_og = {}
        for (t, an, ap) in malla["chunks"]:
            mo = re.match(r"iog\[0\]\.og\[(\d+)\]\.gcl$", an or "")
            if t == b"CMP#" and mo:
                rangos_og[int(mo.group(1))] = parse_cmp_rangos(ap)

        # conexiones og[N] -> shadingEngine (dsm), y SG -> material (ss)
        og_a_sg = {}
        for src, dst in conexiones:
            pref = f"{nombre_shape}.iog.og["
            if src.startswith(pref) and dst.endswith(".dsm"):
                n_og = int(src[len(pref):].split("]")[0])
                og_a_sg[n_og] = dst[:-4]
        sg_a_material = {}
        for src, dst in conexiones:
            if dst.endswith(".ss"):
                sg_a_material[dst[:-3]] = src.split(".")[0]

        # texturas por material (RTFT = nodo file; STR ftn = ruta)
        tex_por_material = {}
        for nodo in nodos:
            if nodo["tipo4"] != b"RTFT":
                continue
            ent = nodo["attrs"].get("ftn")
            if ent:
                ruta = ent[1].split(b"\x00")[0].decode("utf-8", "replace")
                tex_por_material[nodo["nombre"]] = ruta

        if not rangos_og:
            rangos_og = {0: [(0, len(caras) - 1)]}
            og_a_sg = {0: nombre_shape}
            informe["notas"].append(f"{nombre_shape}: sin grupos de material; se exporta entera")

        # cobertura y solapamiento
        asignadas = [None] * len(caras)
        for n_og, rangos in rangos_og.items():
            for ini, fin in rangos:
                for f in range(ini, fin + 1):
                    if asignadas[f] is not None:
                        informe["notas"].append(f"cara {f} en dos grupos: og[{asignadas[f]}] y og[{n_og}]")
                    asignadas[f] = n_og
        sin_grupo = [i for i, g in enumerate(asignadas) if g is None]
        if sin_grupo:
            informe["notas"].append(f"{nombre_shape}: {len(sin_grupo)} caras sin grupo de material")

        # exportar un OBJ por grupo
        nombres_usados = set()
        for n_og in sorted(rangos_og):
            sg = og_a_sg.get(n_og, f"og{n_og}")
            material = sg_a_material.get(sg, sg)
            # nombre de pieza: shadingEngine sin sufijo numerico (Ala_Izquierda1 -> Ala_Izquierda)
            pieza = re.sub(r"\d+$", "", sg) or sg
            if pieza in nombres_usados:
                pieza = sg
            nombres_usados.add(pieza)
            caras_grupo = [f for ini, fin in rangos_og[n_og] for f in range(ini, fin + 1)]

            remap_v, remap_uv = {}, {}
            lista_v, lista_uv, lineas_f = [], [], []
            uv_ok = 0
            uv_total = 0
            for f in caras_grupo:
                idx_v, idx_uv = [], []
                for k, v in enumerate(caras_v[f]):
                    if v not in remap_v:
                        remap_v[v] = len(lista_v) + 1
                        lista_v.append(vertices[v])
                    idx_v.append(remap_v[v])
                    uv_total += 1
                    ui = uvi_por_cara[f][k] if set_uv else -1
                    if set_uv and 0 <= ui < len(set_uv["uvs"]):
                        uv_ok += 1
                        if ui not in remap_uv:
                            remap_uv[ui] = len(lista_uv) + 1
                            lista_uv.append(set_uv["uvs"][ui])
                        idx_uv.append(remap_uv[ui])
                    else:
                        idx_uv.append(None)
                if all(u is not None for u in idx_uv):
                    cuerpo = " ".join(f"{v}/{u}" for v, u in zip(idx_v, idx_uv))
                else:
                    cuerpo = " ".join(str(v) for v in idx_v)
                lineas_f.append("f " + cuerpo)

            if not identidad:
                lista_v = [aplicar(m, v) for v in lista_v]

            xs = [v[0] for v in lista_v]; ys = [v[1] for v in lista_v]; zs = [v[2] for v in lista_v]
            bbox = {"min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]}

            # volumen firmado (positivo => caras CCW vistas desde fuera)
            vol = 0.0
            tam_caras = {}
            for f in caras_grupo:
                idx = [remap_v[v] - 1 for v in caras_v[f]]
                tam_caras[len(idx)] = tam_caras.get(len(idx), 0) + 1
                v0 = lista_v[idx[0]]
                for k in range(1, len(idx) - 1):
                    v1, v2 = lista_v[idx[k]], lista_v[idx[k + 1]]
                    vol += (v0[0] * (v1[1] * v2[2] - v1[2] * v2[1])
                            - v0[1] * (v1[0] * v2[2] - v1[2] * v2[0])
                            + v0[2] * (v1[0] * v2[1] - v1[1] * v2[0]))
            vol /= 6.0

            ruta_obj = os.path.join(DIR_SALIDA, f"{pieza}.obj")
            with open(ruta_obj, "w", encoding="utf-8", newline="\n") as fo:
                fo.write(f"# extraido de {os.path.basename(RUTA_MB)}\n")
                fo.write(f"# shape {nombre_shape} / grupo de material og[{n_og}] "
                         f"/ shadingEngine {sg} / material {material}\n")
                fo.write(f"o {pieza}\n")
                for v in lista_v:
                    fo.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
                for u in lista_uv:
                    fo.write(f"vt {u[0]:.6f} {u[1]:.6f}\n")
                fo.write(f"g {pieza}\nusemtl {material}\n")
                fo.write("\n".join(lineas_f) + "\n")

            texturas = {}
            for clave, ruta in tex_por_material.items():
                # nodos file: p.ej. "Golondrina_Cuerpo1_Metallic_1" para material "Cuerpo1"
                marca = f"_{material}_"
                if marca in clave:
                    mapa = clave.split(marca, 1)[1]
                    if mapa.endswith("_1"):
                        mapa = mapa[:-2]
                    texturas[mapa or clave] = ruta
            informe["piezas"][pieza] = {
                "obj": ruta_obj,
                "shading_engine": sg,
                "material": material,
                "grupo_og": n_og,
                "num_vertices": len(lista_v),
                "num_caras": len(caras_grupo),
                "caras_por_tamano": tam_caras,
                "volumen_firmado": round(vol, 6),
                "bbox_min": [round(c, 6) for c in bbox["min"]],
                "bbox_max": [round(c, 6) for c in bbox["max"]],
                "pct_vertices_cara_con_uv": round(100.0 * uv_ok / uv_total, 2) if uv_total else 0.0,
                "texturas": texturas,
            }
            print(f"  og[{n_og}] -> {pieza}.obj  v={len(lista_v)} f={len(caras_grupo)} "
                  f"uv={100.0 * uv_ok / max(uv_total, 1):.1f}%  vol={vol:+.4f}")

        informe["totales"] = {
            "vertices": len(vertices), "aristas": len(aristas), "caras": len(caras),
            "uvs": len(set_uv["uvs"]) if set_uv else 0,
            "euler_V_E_F": euler,
            "normales": "no almacenadas en el archivo (Maya las recalcula); "
                        "recalcular al importar",
        }
        informe["estructura"] = {
            "resumen": "La escena NO tiene 9 mallas separadas: hay una sola malla "
                       f"combinada ({nombre_shape}, transform {nombre_padre} con "
                       "matriz identidad => coordenadas locales = mundo). Las 9 "
                       "'piezas' son 9 shells disjuntos asignados a 9 shadingEngines "
                       "via grupos de caras iog[0].og[N]; los nombres tipo 'Cuerpo1' "
                       "son los materiales aiStandardSurface y 'Cuerpo' el "
                       "shadingEngine (el sufijo 1 esta invertido en el resto de "
                       "piezas). Cada OBJ es un grupo de material completo.",
            "transform_identidad": identidad,
        }

    ruta_informe = os.path.join(DIR_SALIDA, "informe.json")
    with open(ruta_informe, "w", encoding="utf-8") as fj:
        json.dump(informe, fj, indent=2, ensure_ascii=False)
    print(f"\ninforme: {ruta_informe}")


if __name__ == "__main__":
    sys.exit(main())
