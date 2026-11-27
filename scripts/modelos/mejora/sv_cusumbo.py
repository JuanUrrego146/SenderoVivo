"""Cusumbo andino (Nasuella olivacea) para la ficha, 27/11/2026.

No hay original de Alberto Aleman. El cuerpo sale de un armazon de vertices con el modificador Skin
(radio por vertice) y una subdivision; el esqueleto se crea desde el mismo armazon y pesa la malla.
Pelaje: color de vertice por zonas (olivaceo, vientre claro, patas oscuras, cola anillada, antifaz claro)
multiplicado por una textura de pelo fino con mapa de normales. Animacion de reposo «Take 001»:
respira, gira y baja la cabeza como olfateando y mece la cola.
Colores divididos por 1,6 como las aves, por la exposicion de la ficha.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import sv_lib

TEX = "E:/SenderoModelos/nuevos/tex"
K = 1 / 1.6


def hexa(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]) * K


# nodos: nombre -> (posicion, radio_lateral, radio_vertical)
NODOS = {
    "cadera": ((-0.17, 0, 0.205), 0.078, 0.082),
    "lomo": ((-0.02, 0, 0.215), 0.086, 0.090),
    "hombro": ((0.14, 0, 0.212), 0.070, 0.078),
    "cuello": ((0.225, 0, 0.232), 0.052, 0.056),
    "cabeza": ((0.290, 0, 0.240), 0.050, 0.047),
    "hocico0": ((0.342, 0, 0.224), 0.029, 0.027),
    "hocico1": ((0.385, 0, 0.208), 0.018, 0.017),
    "nariz": ((0.412, 0, 0.198), 0.012, 0.011),
    "cola0": ((-0.255, 0, 0.222), 0.036, 0.036),
    "cola1": ((-0.335, 0, 0.262), 0.032, 0.032),
    "cola2": ((-0.405, 0, 0.330), 0.028, 0.028),
    "cola3": ((-0.450, 0, 0.415), 0.025, 0.025),
    "cola4": ((-0.470, 0, 0.505), 0.021, 0.021),
    "cola5": ((-0.465, 0, 0.585), 0.016, 0.016),
    "cola6": ((-0.445, 0, 0.640), 0.009, 0.009),
}
for s, y in (("L", 1), ("R", -1)):
    NODOS.update({
        "brazo_" + s: ((0.150, 0.048 * y, 0.170), 0.036, 0.040),
        "codo_" + s: ((0.160, 0.056 * y, 0.100), 0.027, 0.027),
        "muneca_" + s: ((0.168, 0.058 * y, 0.035), 0.021, 0.021),
        "mano_" + s: ((0.195, 0.060 * y, 0.012), 0.022, 0.011),
        "muslo_" + s: ((-0.150, 0.052 * y, 0.165), 0.046, 0.052),
        "rodilla_" + s: ((-0.118, 0.062 * y, 0.100), 0.030, 0.030),
        "tobillo_" + s: ((-0.165, 0.062 * y, 0.038), 0.021, 0.021),
        "pie_" + s: ((-0.130, 0.062 * y, 0.012), 0.023, 0.011),
        "oreja0_" + s: ((0.278, 0.032 * y, 0.282), 0.017, 0.014),
        "oreja1_" + s: ((0.272, 0.044 * y, 0.318), 0.015, 0.006),
    })
ARISTAS = [("cadera", "lomo"), ("lomo", "hombro"), ("hombro", "cuello"), ("cuello", "cabeza"), ("cabeza", "hocico0"),
           ("hocico0", "hocico1"), ("hocico1", "nariz"), ("cadera", "cola0"), ("cola0", "cola1"), ("cola1", "cola2"),
           ("cola2", "cola3"), ("cola3", "cola4"), ("cola4", "cola5"), ("cola5", "cola6")]
for s in ("L", "R"):
    ARISTAS += [("hombro", "brazo_" + s), ("brazo_" + s, "codo_" + s), ("codo_" + s, "muneca_" + s), ("muneca_" + s, "mano_" + s),
                ("cadera", "muslo_" + s), ("muslo_" + s, "rodilla_" + s), ("rodilla_" + s, "tobillo_" + s), ("tobillo_" + s, "pie_" + s),
                ("cabeza", "oreja0_" + s), ("oreja0_" + s, "oreja1_" + s)]


def densificar(paso=0.03):
    """Nodos intermedios cada ~3 cm con radio interpolado: con tramos largos el Skin deja el cuerpo en caja."""
    nodos = {n: v for n, v in NODOS.items()}
    aristas = []
    for a, b in ARISTAS:
        pa, ra1, ra2 = nodos[a]
        pb, rb1, rb2 = nodos[b]
        L = (Vector(pb) - Vector(pa)).length
        k = max(1, int(round(L / paso)))
        prev = a
        for i in range(1, k):
            t = i / k
            n = "%s>%s_%d" % (a, b, i)
            nodos[n] = (tuple(Vector(pa).lerp(Vector(pb), t)), ra1 + (rb1 - ra1) * t, ra2 + (rb2 - ra2) * t)
            aristas.append((prev, n))
            prev = n
        aristas.append((prev, b))
    return nodos, aristas


def armazon():
    nodos, aristas = densificar()
    nombres = list(nodos)
    me = bpy.data.meshes.new("Cusumbo")
    me.from_pydata([nodos[n][0] for n in nombres], [(nombres.index(a), nombres.index(b)) for a, b in aristas], [])
    ob = bpy.data.objects.new("Cusumbo", me)
    bpy.context.scene.collection.objects.link(ob)
    sk = ob.modifiers.new("Skin", 'SKIN')
    sk.use_smooth_shade = True
    sk.branch_smoothing = 1.0
    for i, n in enumerate(nombres):
        me.skin_vertices[0].data[i].radius = (nodos[n][1], nodos[n][2])
    me.skin_vertices[0].data[nombres.index("lomo")].use_root = True
    sub = ob.modifiers.new("Sub", 'SUBSURF')
    sub.levels = 2
    sub.render_levels = 2
    sm = ob.modifiers.new("Suave", 'SMOOTH')
    sm.factor = 0.6
    sm.iterations = 6
    return ob, nombres


def pintar(ob):
    """Color de vertice por zonas segun la posicion en reposo."""
    me = ob.data
    if "pelo" not in me.color_attributes:
        me.color_attributes.new("pelo", 'FLOAT_COLOR', 'CORNER')
    ca = me.color_attributes["pelo"]
    oliva, vientre, oscuro = hexa("#7d6e30"), hexa("#a9944f"), hexa("#3a2f20")
    anillo_os, anillo_cl = hexa("#3a2c1f"), hexa("#b39a68")
    hocico, claro = hexa("#4b3d2e"), hexa("#cbbb8e")
    rng = np.random.default_rng(3)
    col_v = []
    for v in me.vertices:
        x, y, z = v.co
        c = oliva.copy()
        # vientre y pecho claros
        if x > -0.22 and x < 0.24:
            t = np.clip((0.180 - z) / 0.05, 0, 1)
            c = c * (1 - t) + vientre * t
        # patas oscuras hacia abajo
        if z < 0.14 and abs(y) > 0.02 and x > -0.22:
            t = np.clip((0.14 - z) / 0.07, 0, 1)
            c = c * (1 - t) + oscuro * t
        # cola anillada (8 anillos a lo largo de la cola)
        if x < -0.24:
            pts = [NODOS["cola%d" % i][0] for i in range(7)]
            acum, best, bd = 0.0, 0.0, 9
            for i in range(6):
                a, b = Vector(pts[i]), Vector(pts[i + 1])
                ab = b - a
                t = max(0, min(1, (v.co - a).dot(ab) / ab.length_squared))
                d = (v.co - (a + ab * t)).length
                if d < bd:
                    bd, best = d, acum + t * ab.length
                acum += ab.length
            u = best / acum
            fase = 0.5 + 0.5 * math.cos(u * 2 * math.pi * 8)
            m = np.clip((fase - 0.35) / 0.3, 0, 1)
            c = anillo_os * m + anillo_cl * (1 - m)
            if u > 0.9:
                c = anillo_os
        # cabeza: hocico oscuro, antifaz claro sobre y bajo el ojo, mejillas claras
        if x > 0.25:
            t_h = np.clip((x - 0.315) / 0.03, 0, 1)
            c = c * (1 - t_h) + hocico * t_h
            # antifaz claro: mancha suave alrededor del ojo y mejilla bajo el ojo
            d_ojo = (Vector((x, abs(y), z)) - Vector((0.312, 0.036, 0.252))).length
            t_m = np.clip((0.032 - d_ojo) / 0.016, 0, 1) * 0.75
            d_mej = (Vector((x, abs(y), z)) - Vector((0.322, 0.030, 0.228))).length
            t_m = max(t_m, np.clip((0.022 - d_mej) / 0.012, 0, 1) * 0.8)
            c = c * (1 - t_m) + claro * t_m
        # orejas con borde claro
        if z > 0.280 and x > 0.25 and x < 0.30:
            c = claro
        c = c * (0.93 + 0.14 * rng.random())
        col_v.append(c)
    for poly in me.polygons:
        for li in poly.loop_indices:
            c = col_v[me.loops[li].vertex_index]
            ca.data[li].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = ca


def textura_pelo(n=512):
    """Pelo fino en gris (multiplica el color de vertice) y su normal. Se corre fuera de Blender (necesita PIL):
    python -I -c "import sys; sys.path.insert(0, r'E:/SenderoModelos/scripts'); ..." o desde sv_flora_tex.py."""
    from PIL import Image
    rng = np.random.default_rng(9)
    h = np.zeros((n, n))
    for _ in range(9000):
        x0, y0 = rng.integers(0, n, 2)
        L = rng.integers(8, 22)
        ang = math.radians(rng.normal(90, 12))
        for t in range(L):
            x = int(x0 + math.cos(ang) * t) % n
            y = int(y0 + math.sin(ang) * t) % n
            h[y, x] = max(h[y, x], 1 - t / L * 0.5)
    from PIL import ImageFilter
    im = Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    h = np.asarray(im, np.float64) / 255
    g = 0.72 + 0.28 * h
    Image.fromarray((np.stack([g] * 3, -1) * 255).astype(np.uint8)).save(os.path.join(TEX, "cusumbo_pelo_col.png"))
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * 3, -gy * 3, np.ones_like(h)
    L = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nm = np.stack([nx / L, ny / L, nz / L], -1) * 0.5 + 0.5
    Image.fromarray((nm * 255).astype(np.uint8)).save(os.path.join(TEX, "cusumbo_pelo_nrm.png"))


def material_pelo():
    m = bpy.data.materials.new("Cusumbo_Pelo")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Specular IOR Level"].default_value = 0.2
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(os.path.join(TEX, "cusumbo_pelo_col.png"), check_existing=True)
    t.image.reload()
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "pelo"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1.0
    nt.links.new(vc.outputs["Color"], mix.inputs[6])
    nt.links.new(t.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = bpy.data.images.load(os.path.join(TEX, "cusumbo_pelo_nrm.png"), check_existing=True)
    tn.image.reload()
    tn.image.colorspace_settings.name = "Non-Color"
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 0.6
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def material_liso(nombre, color, rug=0.25):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = tuple(hexa(color)) + (1,)
    b.inputs["Roughness"].default_value = rug
    return m


def cuerpo_metabolas(k_radio=1.55, paso=0.012, resolucion=0.0045):
    """Superficie organica del cuerpo con metabolas a lo largo del armazon densificado."""
    nodos, aristas = densificar(paso=paso)
    mb = bpy.data.metaballs.new("CusumboMB")
    mb.resolution = resolucion
    mb.render_resolution = resolucion
    mb.threshold = 0.6
    ob = bpy.data.objects.new("CusumboMB", mb)
    bpy.context.scene.collection.objects.link(ob)
    for n, (p, r1, r2) in nodos.items():
        e = mb.elements.new()
        e.type = 'ELLIPSOID'
        e.co = p
        e.radius = max(r1, r2) * k_radio
        e.size_x = 1.0
        e.size_y = r1 / max(r1, r2)
        e.size_z = r2 / max(r1, r2)
        e.stiffness = 2.0
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    me_ob = bpy.context.view_layer.objects.active
    me_ob.name = "Cusumbo"
    me_ob.data.name = "Cusumbo"
    return me_ob


def esqueleto():
    """Esqueleto desde el armazon sin densificar: Skin sobre un objeto auxiliar, Create Armature y se borra."""
    nombres = list(NODOS)
    me = bpy.data.meshes.new("CusumboAux")
    me.from_pydata([NODOS[n][0] for n in nombres], [(nombres.index(a), nombres.index(b)) for a, b in ARISTAS], [])
    aux = bpy.data.objects.new("CusumboAux", me)
    bpy.context.scene.collection.objects.link(aux)
    aux.modifiers.new("Skin", 'SKIN')
    me.skin_vertices[0].data[nombres.index("lomo")].use_root = True
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = aux
    aux.select_set(True)
    bpy.ops.object.skin_armature_create(modifier="Skin")
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    arm.name = "Cusumbo_Esqueleto"
    bpy.data.objects.remove(aux, do_unlink=True)
    return arm


def construir():
    sv_lib.limpiar()
    arm = esqueleto()
    ob = cuerpo_metabolas()
    # suavizado y reduccion a un peso razonable
    dec = ob.modifiers.new("Dec", 'DECIMATE')
    dec.ratio = 0.35
    sm = ob.modifiers.new("Suave", 'SMOOTH')
    sm.factor = 0.5
    sm.iterations = 4
    bpy.context.view_layer.objects.active = ob
    for nm in ("Dec", "Suave"):
        bpy.ops.object.modifier_apply(modifier=nm)
    # pesos automaticos
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    # UV para la textura de pelo
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = ob.data.uv_layers.active.data
    for d in uv:
        d.uv = (d.uv[0] * 3.0, d.uv[1] * 3.0)
    pintar(ob)
    if not os.path.exists(os.path.join(TEX, "cusumbo_pelo_col.png")):
        raise RuntimeError("falta la textura de pelo: correr sv_flora_tex.py")
    ob.data.materials.append(material_pelo())
    for p in ob.data.polygons:
        p.use_smooth = True
    extras = []

    def esfera(nombre, centro, r, mat, escala=(1, 1, 1)):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
        me = bpy.data.meshes.new(nombre)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(nombre, me)
        bpy.context.scene.collection.objects.link(o)
        o.location = centro
        o.scale = escala
        me.materials.append(mat)
        for p in me.polygons:
            p.use_smooth = True
        bpy.context.view_layer.update()
        o.data.transform(o.matrix_world)
        o.matrix_world.identity()
        return o
    m_ojo = material_liso("Cusumbo_Ojo", "#120d0a", 0.15)
    m_nariz = material_liso("Cusumbo_Nariz", "#1a1512", 0.4)
    def superficie(origen, direccion):
        ok, loc, nor, _i = ob.ray_cast(Vector(origen), Vector(direccion).normalized())
        return (loc, nor) if ok else (Vector(origen), Vector(direccion))
    for y in (1, -1):
        loc, nor = superficie((0.312, 0.0, 0.254), (0.15, y, 0.12))
        extras.append(esfera("Ojo_" + ("L" if y > 0 else "R"), tuple(loc - nor * 0.004), 0.0095, m_ojo))
    loc, nor = superficie((0.36, 0.0, 0.212), (1.0, 0.0, -0.32))
    extras.append(esfera("Nariz", tuple(loc - nor * 0.006), 0.013, m_nariz, (1.0, 1.25, 0.8)))
    return ob, arm, extras


def hueso_cercano(arm, p):
    p = Vector(p)
    best, bd = None, 9
    for b in arm.data.bones:
        a, c = arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local
        ab = c - a
        t = max(0, min(1, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
        d = (p - (a + ab * t)).length
        if d < bd:
            bd, best = d, b.name
    return best


def emparentar(o, arm, hueso):
    mw = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = 'BONE'
    o.parent_bone = hueso
    bpy.context.view_layer.update()
    o.matrix_world = mw


def animar(arm, frames=96):
    """Reposo: respiracion (lomo), cabeza que olfatea y gira, cola que se mece. Bucle de 4 s a 24 c/s.
    Con el armazon densificado cada tramo tiene varios huesos: el giro se reparte entre ellos."""
    sc = bpy.context.scene
    sc.render.fps = 24
    act = bpy.data.actions.new("Take 001")
    arm.animation_data_create()
    arm.animation_data.action = act
    pb = arm.pose.bones
    B = arm.data.bones
    def centro(b):
        return (b.head_local + b.tail_local) * 0.5
    cola = sorted([b.name for b in B if centro(b).x < -0.25 and abs(centro(b).y) < 0.01], key=lambda n: centro(B[n]).z)
    cuello = [b.name for b in B if 0.19 < centro(b).x < 0.30 and abs(centro(b).y) < 0.01 and centro(b).z > 0.2]
    hocico = [b.name for b in B if centro(b).x >= 0.33 and abs(centro(b).y) < 0.01]
    lomo = [b.name for b in B if -0.12 < centro(b).x < 0.10 and abs(centro(b).y) < 0.01 and centro(b).z > 0.18]
    for b in pb:
        b.rotation_mode = 'XYZ'
    nc, nk = max(1, len(cuello)), max(1, len(cola))
    for f in range(0, frames + 1, 4):
        u = f / frames
        w = 2 * math.pi * u
        for n in lomo:
            pb[n].scale = (1.0, 1.0, 1.0)
            pb[n].scale[0] = 1.0 + 0.02 * math.sin(2 * w)
            pb[n].scale[2] = 1.0 + 0.02 * math.sin(2 * w)
            pb[n].keyframe_insert("scale", frame=f + 1)
        for n in cuello:
            pb[n].rotation_euler = (0.24 * math.sin(w) / nc, 0.0, 0.12 * math.sin(2 * w + 0.6) / nc)
            pb[n].keyframe_insert("rotation_euler", frame=f + 1)
        for n in hocico:
            pb[n].rotation_euler = (0.0, 0.0, 0.05 * math.sin(6 * w) / max(1, len(hocico)))
            pb[n].keyframe_insert("rotation_euler", frame=f + 1)
        for i, n in enumerate(cola):
            fa = w - 2.5 * i / nk
            pb[n].rotation_euler = (0.35 * math.sin(fa) / nk, 0.0, 0.20 * math.sin(fa + 1.0) / nk)
            pb[n].keyframe_insert("rotation_euler", frame=f + 1)
    sc.frame_start, sc.frame_end = 1, frames + 1
    return {"cuello": len(cuello), "hocico": len(hocico), "lomo": len(lomo), "cola": len(cola)}


def unir_a_cabeza(ob, arm, extras):
    """Une ojos y nariz a la malla con peso 1 en el hueso mas cercano (asi se mueven con la cabeza)."""
    for o in extras:
        bpy.context.view_layer.update()
        hueso = hueso_cercano(arm, o.data.vertices[0].co)
        vg = o.vertex_groups.new(name=hueso)
        vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for o in extras:
        o.select_set(True)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()
    return ob


def hacer(carpeta="E:/SenderoModelos/nuevos/salida", render=True):
    ob, arm, extras = construir()
    ob = unir_a_cabeza(ob, arm, extras)
    extras = []
    huesos = animar(arm)
    sv_lib.ESTADO["cusumbo"] = (ob, arm, extras)
    rutas = []
    if render:
        cam = sv_lib.montar_estudio(res=560, muestras=16)
        sc = bpy.context.scene
        sc.frame_set(1)
        objs = [ob] + extras
        mn, mx = sv_lib.caja_mundo(objs)
        c = (mn + mx) * 0.5
        r = (mx - mn).length * 0.5
        os.makedirs(os.path.join(carpeta, "render"), exist_ok=True)
        for k, (az, el, f) in enumerate(((35, 10, 1), (110, 15, 25), (-60, 25, 49))):
            sc.frame_set(f)
            sv_lib.encuadrar(cam, az, el, 0.9, centro=c, radio=r)
            sc.render.filepath = os.path.join(carpeta, "render", "cusumbo_%d.png" % k)
            bpy.ops.render.render(write_still=True)
            rutas.append(sc.render.filepath)
    tam = sv_lib.exportar_glb(os.path.join(carpeta, "cusumbo.glb"))
    return {"caras": len(ob.data.polygons), "huesos": len(arm.data.bones), "bytes": tam, "rutas": rutas, "anim": huesos}
