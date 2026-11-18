"""Utilidades comunes para trabajar los modelos de Sendero Vivo dentro de Blender.

Se usa desde el conector:  import importlib, sys; sys.path.insert(0, r"E:\\SenderoModelos\\scripts"); import sv_lib
"""
import math
import os

import bpy
from mathutils import Vector

BLENDER_DIR = os.path.dirname(bpy.app.binary_path)
HDRI_DIR = os.path.join(BLENDER_DIR, "4.5", "datafiles", "studiolights", "world")
RAIZ = r"E:\SenderoModelos"
# Estado que sobrevive entre llamadas del conector (cada llamada corre en un espacio de nombres nuevo).
ESTADO = globals().get("ESTADO", {})


def primeros_planos(ave, carpeta, prefijo, res=760, vistas=None):
    """Renderiza acercamientos del ave: cuerpo de frente y de espalda, cabeza y ala."""
    sc = bpy.context.scene
    cam = sc.camera
    sc.render.resolution_x = res
    sc.render.resolution_y = res
    cab = Vector(ave.C_cab)
    cuerpo = Vector(ave.eje_p[len(ave.eje_p) // 3])
    todas = {
        "frente": (cuerpo, ave.U * 0.95, 40, 8),
        "cabeza": (cab, ave.R_cab * 2.4, 60, 8),
        "atras": (cuerpo, ave.U * 0.95, 215, 22),
        "ala": (Vector(ave.h["Wrist_L"]), ave.U * 0.75, 200, 55),
        "lado": (cuerpo, ave.U * 1.25, 90, 4),
    }
    rutas = []
    os.makedirs(carpeta, exist_ok=True)
    for nombre in (vistas or ("frente", "cabeza", "atras", "ala")):
        c, r, az, el = todas[nombre]
        encuadrar(cam, az, el, 1.0, centro=c, radio=r)
        ruta = os.path.join(carpeta, "{}_{}.png".format(prefijo, nombre))
        sc.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        rutas.append(ruta)
    return rutas


# --------------------------------------------------------------------------- escena

def limpiar():
    """Deja el archivo vacio sin recargar preferencias."""
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except RuntimeError:
            pass
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for nombre in ("meshes", "armatures", "materials", "images", "actions", "cameras", "lights",
                   "node_groups", "textures", "curves", "hair_curves", "pointclouds", "worlds"):
        col = getattr(bpy.data, nombre, None)
        if col is None:
            continue
        for b in list(col):
            try:
                col.remove(b)
            except (RuntimeError, ReferenceError):
                pass
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)
    bpy.context.scene.frame_set(0)


def importar_glb(ruta, soldar=False):
    import contextlib
    import io
    antes = set(bpy.data.objects)
    with contextlib.redirect_stdout(io.StringIO()):
        try:
            bpy.ops.import_scene.gltf(filepath=ruta, merge_vertices=soldar, disable_bone_shape=True)
        except TypeError:
            bpy.ops.import_scene.gltf(filepath=ruta, merge_vertices=soldar)
    nuevos = [o for o in bpy.data.objects if o not in antes]
    # El importador crea una icoesfera como forma de hueso: no es parte del modelo.
    for o in list(nuevos):
        if o.type == 'MESH' and o.name.startswith("Icosphere") and not o.data.materials:
            nuevos.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
    return nuevos


def mallas(objs=None):
    objs = objs if objs is not None else bpy.data.objects
    return [o for o in objs if o.type == 'MESH']


def caja_mundo(objs=None, evaluada=True):
    """Caja envolvente en mundo de las mallas (con deformacion del esqueleto si evaluada)."""
    dg = bpy.context.evaluated_depsgraph_get()
    mn = Vector((1e18,) * 3)
    mx = Vector((-1e18,) * 3)
    hay = False
    for o in mallas(objs):
        if o.hide_render:
            continue
        if evaluada:
            oe = o.evaluated_get(dg)
            me = oe.to_mesh()
            M = oe.matrix_world
            for v in me.vertices:
                p = M @ v.co
                mn = Vector(map(min, mn, p))
                mx = Vector(map(max, mx, p))
                hay = True
            oe.to_mesh_clear()
        else:
            for c in o.bound_box:
                p = o.matrix_world @ Vector(c)
                mn = Vector(map(min, mn, p))
                mx = Vector(map(max, mx, p))
                hay = True
    if not hay:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return mn, mx


# --------------------------------------------------------------------------- estudio

def montar_estudio(hdri="courtyard.exr", fuerza=1.0, sol=1.4, res=720, muestras=48, transparente=True,
                   vista="Khronos PBR Neutral", exposicion=0.678, motor="BLENDER_EEVEE_NEXT"):
    sc = bpy.context.scene
    sc.render.engine = motor
    sc.render.resolution_x = res
    sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparente
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.compression = 60
    try:
        sc.view_settings.view_transform = vista
    except TypeError:
        sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = exposicion
    if motor == "BLENDER_EEVEE_NEXT":
        ee = sc.eevee
        ee.taa_render_samples = muestras
        ee.use_raytracing = True
        ee.use_shadows = True
        try:
            ee.ray_tracing_options.resolution_scale = '1'
        except Exception:
            pass
    else:
        sc.cycles.samples = muestras
        sc.cycles.use_denoising = True
        sc.cycles.device = 'GPU'

    mundo = bpy.data.worlds.get("SV_Mundo") or bpy.data.worlds.new("SV_Mundo")
    sc.world = mundo
    mundo.use_nodes = True
    nt = mundo.node_tree
    nt.nodes.clear()
    salida = nt.nodes.new("ShaderNodeOutputWorld")
    fondo = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    mapeo = nt.nodes.new("ShaderNodeMapping")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    ruta = os.path.join(HDRI_DIR, hdri)
    img = bpy.data.images.get(hdri) or bpy.data.images.load(ruta)
    env.image = img
    fondo.inputs["Strength"].default_value = fuerza
    nt.links.new(coord.outputs["Generated"], mapeo.inputs["Vector"])
    nt.links.new(mapeo.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], fondo.inputs["Color"])
    nt.links.new(fondo.outputs["Background"], salida.inputs["Surface"])

    luz = bpy.data.objects.get("SV_Sol")
    if luz is None:
        dato = bpy.data.lights.new("SV_Sol", 'SUN')
        luz = bpy.data.objects.new("SV_Sol", dato)
        sc.collection.objects.link(luz)
    luz.data.energy = sol
    luz.data.angle = math.radians(18)
    luz.rotation_euler = (math.radians(52), 0, math.radians(35))

    cam = bpy.data.objects.get("SV_Cam")
    if cam is None:
        dato = bpy.data.cameras.new("SV_Cam")
        cam = bpy.data.objects.new("SV_Cam", dato)
        sc.collection.objects.link(cam)
    cam.data.lens = 70
    cam.data.sensor_width = 36
    sc.camera = cam
    return cam


def encuadrar(cam, azimut=35.0, elevacion=15.0, margen=1.12, objs=None, centro=None, radio=None):
    """Ubica la camara mirando al centro de la caja desde azimut/elevacion (grados)."""
    mn, mx = caja_mundo(objs)
    c = (mn + mx) * 0.5 if centro is None else Vector(centro)
    r = (mx - mn).length * 0.5 if radio is None else radio
    r = max(r, 1e-5)
    fov = 2 * math.atan(cam.data.sensor_width / (2 * cam.data.lens))
    d = r / math.sin(fov / 2) * margen
    az = math.radians(azimut)
    el = math.radians(elevacion)
    direccion = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.location = c + direccion * d
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_start = max(d * 0.01, 1e-4)
    cam.data.clip_end = d * 10 + r * 10
    return c, r, d


def render_vistas(prefijo, vistas=((35, 15), (125, 15), (215, 15), (305, 20)), objs=None, margen=1.12,
                  centro=None, radio=None):
    """Renderiza una imagen por vista. Devuelve la lista de rutas."""
    sc = bpy.context.scene
    cam = sc.camera
    rutas = []
    for i, (az, el) in enumerate(vistas):
        encuadrar(cam, az, el, margen, objs, centro, radio)
        ruta = "{}_{:02d}.png".format(prefijo, i)
        sc.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        rutas.append(ruta)
    return rutas


# --------------------------------------------------------------------------- informes

def resumen_escena():
    out = {"objetos": []}
    for o in bpy.data.objects:
        d = {"nombre": o.name, "tipo": o.type, "padre": o.parent.name if o.parent else None,
             "loc": [round(x, 4) for x in o.location], "rot": [round(math.degrees(x), 2) for x in o.rotation_euler],
             "esc": [round(x, 5) for x in o.scale]}
        if o.type == 'MESH':
            me = o.data
            d.update({"vert": len(me.vertices), "caras": len(me.polygons), "tri": sum(len(p.vertices) - 2 for p in me.polygons),
                      "mats": [m.name if m else None for m in me.materials], "uv": [u.name for u in me.uv_layers],
                      "grupos": len(o.vertex_groups), "mods": [(m.type, m.name) for m in o.modifiers],
                      "dims": [round(x, 4) for x in o.dimensions]})
        if o.type == 'ARMATURE':
            d.update({"huesos": len(o.data.bones), "accion": o.animation_data.action.name if o.animation_data and o.animation_data.action else None})
        out["objetos"].append(d)
    out["acciones"] = [(a.name, [round(x, 1) for x in a.frame_range]) for a in bpy.data.actions]
    out["fps"] = bpy.context.scene.render.fps
    return out


# --------------------------------------------------------------------------- exportacion

def exportar_glb(ruta, raices=None, animaciones=True, color_vertice='MATERIAL'):
    """Exporta a .glb los objetos de la escena que no son camara ni luz, con piel y animaciones."""
    import contextlib
    import io
    sc = bpy.context.scene
    for o in bpy.data.objects:
        if o.type == 'ARMATURE':
            o.data.pose_position = 'POSE'
    f0, f1 = None, None
    for a in bpy.data.actions:
        r = a.frame_range
        f0 = r[0] if f0 is None else min(f0, r[0])
        f1 = r[1] if f1 is None else max(f1, r[1])
    if f0 is not None:
        sc.frame_start, sc.frame_end = int(f0), int(f1)
    sc.frame_set(sc.frame_start)
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ('CAMERA', 'LIGHT'):
            continue
        if o.hide_render:
            continue
        o.select_set(True)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(
            filepath=ruta, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
            export_animations=animaciones, export_animation_mode='ACTIONS', export_force_sampling=True,
            export_skins=True, export_all_influences=False, export_def_bones=False, export_morph=False,
            export_normals=True, export_tangents=False, export_vertex_color=color_vertice, export_all_vertex_colors=False,
            export_image_format='AUTO', export_cameras=False, export_lights=False, export_extras=False,
            export_optimize_animation_size=True, export_rest_position_armature=True)
    return os.path.getsize(ruta)
