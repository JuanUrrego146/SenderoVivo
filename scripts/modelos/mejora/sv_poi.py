"""Mejora de los modelos de puntos de interes (letreros, bancas, estructuras).

Los originales son sopas de triangulos sin soldar: cada triangulo trae sus tres vertices y por eso se ven facetados y
con aristas de navaja. Aqui se sueldan, se reconstruyen los cuadrilateros, se marcan las aristas vivas por angulo,
se biselan para que tomen luz y se recalculan las normales. Las UV y los materiales originales se conservan.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import sv_lib


def _activar(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def cargar(nombre):
    sv_lib.limpiar()
    objs = sv_lib.importar_glb(os.path.join(sv_lib.RAIZ, "originales", "poi", nombre + ".glb"))
    mallas = [o for o in objs if o.type == 'MESH']
    ob = mallas[0]
    if len(mallas) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in mallas:
            o.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.join()
    return ob


def medidas(ob):
    co = np.array([ob.matrix_world @ v.co for v in ob.data.vertices])
    mn, mx = co.min(0), co.max(0)
    return mn, mx, float(np.linalg.norm(mx - mn))


def recoger_piso(ob, margen=0.10, minimo_area=0.55):
    """Si el modelo trae un piso plano mucho mayor que el objeto, lo recoge alrededor del objeto."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    mn = Vector((min(v.co.x for v in bm.verts), min(v.co.y for v in bm.verts), min(v.co.z for v in bm.verts)))
    mx = Vector((max(v.co.x for v in bm.verts), max(v.co.y for v in bm.verts), max(v.co.z for v in bm.verts)))
    # eje vertical: el de menor extension de los tres candidatos no aplica; en estos modelos Z es arriba
    alto = mx.z - mn.z
    area_total = (mx.x - mn.x) * (mx.y - mn.y)
    # islas conectadas
    vistos = set()
    islas = []
    for v in bm.verts:
        if v.index in vistos:
            continue
        pila = [v]
        isla = []
        vistos.add(v.index)
        while pila:
            a = pila.pop()
            isla.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in vistos:
                    vistos.add(b.index)
                    pila.append(b)
        islas.append(isla)
    hecho = None
    for isla in islas:
        zs = [v.co.z for v in isla]
        xs = [v.co.x for v in isla]
        ys = [v.co.y for v in isla]
        plano = (max(zs) - min(zs)) < 0.06 * max(alto, 1e-6)
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if plano and area > minimo_area * area_total and min(zs) < mn.z + 0.2 * alto:
            resto = [v for otra in islas if otra is not isla for v in otra]
            if not resto:
                continue
            rx = (min(v.co.x for v in resto), max(v.co.x for v in resto))
            ry = (min(v.co.y for v in resto), max(v.co.y for v in resto))
            lado = max(rx[1] - rx[0], ry[1] - ry[0])
            m = margen * lado
            x0, x1 = max(min(xs), rx[0] - m), min(max(xs), rx[1] + m)
            y0, y1 = max(min(ys), ry[0] - m), min(max(ys), ry[1] + m)
            ax, ay = min(xs), min(ys)
            lx, ly = max(max(xs) - ax, 1e-9), max(max(ys) - ay, 1e-9)
            for v in isla:
                tx = (v.co.x - ax) / lx
                ty = (v.co.y - ay) / ly
                v.co.x = x0 + tx * (x1 - x0)
                v.co.y = y0 + ty * (y1 - y0)
            hecho = {"antes": [round(lx, 2), round(ly, 2)], "despues": [round(x1 - x0, 2), round(y1 - y0, 2)]}
            break
    bm.to_mesh(me)
    bm.free()
    me.update()
    return hecho


def mejorar(nombre, bisel=0.0055, angulo=32.0, segmentos=2, piso=True, soldar=1e-4, cuadrar=True, oclusion=True):
    ob = cargar(nombre)
    me = ob.data
    info = {"vert_antes": len(me.vertices), "caras_antes": len(me.polygons)}
    mn, mx, diag = medidas(ob)
    _activar(ob)
    # quitar normales importadas y soldar
    try:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except RuntimeError:
        pass
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=soldar * diag)
    planas = [f for f in bm.faces if f.calc_area() < 1e-12 * diag * diag]
    if planas:
        bmesh.ops.delete(bm, geom=planas, context='FACES')
    bm.to_mesh(me)
    bm.free()
    me.update()
    info["vert_soldado"] = len(me.vertices)
    if piso:
        info["piso"] = recoger_piso(ob)
    if cuadrar:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.tris_convert_to_quads(face_threshold=math.radians(2.0), shape_threshold=math.radians(60.0), uvs=True, materials=True)
        bpy.ops.object.mode_set(mode='OBJECT')
    info["caras_cuadradas"] = len(me.polygons)
    for p in me.polygons:
        p.use_smooth = True
    mn, mx, diag = medidas(ob)
    mod = ob.modifiers.new("Bisel", 'BEVEL')
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(angulo)
    mod.width = bisel * diag
    mod.segments = segmentos
    mod.profile = 0.7
    mod.use_clamp_overlap = True
    mod.harden_normals = False
    mod.miter_outer = 'MITER_ARC'
    mod.loop_slide = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    if oclusion:
        info["vert_denso"] = densificar(ob)
    # aristas vivas donde aun queda un angulo fuerte, y normales ponderadas por area
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(48.0)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            e.smooth = e.calc_face_angle(0.0) < lim
        else:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    wn = ob.modifiers.new("Normales", 'WEIGHTED_NORMAL')
    wn.keep_sharp = True
    wn.weight = 60
    bpy.ops.object.modifier_apply(modifier=wn.name)
    me = ob.data
    if oclusion:
        info.update(hornear_oclusion(ob))
    info["vert_final"] = len(me.vertices)
    info["tri_final"] = int(sum(len(p.vertices) - 2 for p in me.polygons))
    info["diag"] = round(diag, 3)
    return ob, info


def densificar(ob, fraccion=1.0 / 22.0, pasadas=3):
    """Parte las aristas largas para que la oclusion por vertice tenga donde guardarse."""
    me = ob.data
    _mn, _mx, diag = medidas(ob)
    lim = diag * fraccion
    for _ in range(pasadas):
        bm = bmesh.new()
        bm.from_mesh(me)
        largas = [e for e in bm.edges if e.calc_length() > lim]
        if not largas:
            bm.free()
            break
        bmesh.ops.subdivide_edges(bm, edges=largas, cuts=1, use_grid_fill=True, use_only_quads=False)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
        bm.to_mesh(me)
        bm.free()
        me.update()
    return len(me.vertices)


def hornear_oclusion(ob, fuerza=0.80, minimo=0.30, distancia=0.16, muestras=64):
    """Hornea oclusion ambiental en el color de vertice 'Col' (multiplica el color base en glTF)."""
    sc = bpy.context.scene
    me = ob.data
    _mn, _mx, diag = medidas(ob)
    for ca in list(me.color_attributes):
        me.color_attributes.remove(ca)
    ca = me.color_attributes.new("Col", 'BYTE_COLOR', 'CORNER')
    me.color_attributes.active_color = ca
    me.color_attributes.render_color_index = 0
    motor = sc.render.engine
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    sc.cycles.samples = muestras
    if sc.world is None:
        sc.world = bpy.data.worlds.new("SV_Mundo")
    sc.world.light_settings.distance = distancia * diag
    sc.render.bake.target = 'VERTEX_COLORS'
    sc.render.bake.use_selected_to_active = False
    _activar(ob)
    bpy.ops.object.bake(type='AO')
    sc.render.engine = motor
    n = len(me.loops)
    col = np.empty(n * 4, np.float32)
    ca = me.color_attributes["Col"]
    ca.data.foreach_get("color", col)
    col = col.reshape(n, 4)
    a = col[:, 0]
    # el horneado devuelve valores lineales: 1 = sin oclusion
    a = np.clip(a, 0, 1) ** 0.85
    v = np.clip(1.0 - fuerza * (1.0 - a), minimo, 1.0)
    col[:, 0] = col[:, 1] = col[:, 2] = v
    col[:, 3] = 1.0
    ca.data.foreach_set("color", col.ravel())
    me.update()
    return {"ao_min": round(float(v.min()), 2), "ao_media": round(float(v.mean()), 2)}


def exportar(nombre, carpeta=None):
    carpeta = carpeta or os.path.join(sv_lib.RAIZ, "salida", "poi")
    ruta = os.path.join(carpeta, nombre + ".glb")
    return sv_lib.exportar_glb(ruta, animaciones=False, color_vertice='ACTIVE')
