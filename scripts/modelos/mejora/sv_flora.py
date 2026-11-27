"""Flora nueva de las fichas (27/11/2026): pino (Pinus), aliso y helecho arborescente (Cyathea).

No hay originales de Alberto Aleman para estos puntos: se construyen por codigo con texturas de
sv_flora_tex.py (corteza con mapa de normales y tarjetas de follaje con alfa en modo MASK).
La oclusion se hornea en el color de vertice: el follaje se oscurece hacia el interior de la copa y
el tronco hacia el pie y bajo la copa, porque el visor de la ficha no calcula sombras de contacto.
Uso desde el conector: sv_flora.hacer("pino", "E:/SenderoModelos/nuevos/salida")
"""
import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import sv_lib

TEX = "E:/SenderoModelos/nuevos/tex"


# --------------------------------------------------------------------------- materiales

def _img(nombre, color=True):
    ruta = os.path.join(TEX, nombre)
    im = bpy.data.images.load(ruta, check_existing=True)
    im.reload()
    if not color:
        im.colorspace_settings.name = "Non-Color"
    return im


def material(nombre, col, nrm=None, alfa=False, rugosidad=0.85, fuerza_normal=0.8):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rugosidad
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = _img(col)
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "ao"
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs[0].default_value = 1.0
    nt.links.new(t.outputs["Color"], mul.inputs[6])
    nt.links.new(vc.outputs["Color"], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
    if alfa:
        nt.links.new(t.outputs["Alpha"], bsdf.inputs["Alpha"])
        m.blend_method = 'CLIP' if hasattr(m, "blend_method") else None
        try:
            m.surface_render_method = 'DITHERED'
        except Exception:
            pass
        m.alpha_threshold = 0.42
        m.use_backface_culling = False
    if nrm:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = _img(nrm, color=False)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = fuerza_normal
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return m


# --------------------------------------------------------------------------- geometria

class Malla:
    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.ao = self.bm.loops.layers.color.new("ao")

    def cara(self, pts, uvs):
        vs = [self.bm.verts.new(p) for p in pts]
        f = self.bm.faces.new(vs)
        for lp, uv in zip(f.loops, uvs):
            lp[self.uv].uv = uv
        return f

    def objeto(self, nombre, mat):
        me = bpy.data.meshes.new(nombre)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(nombre, me)
        bpy.context.scene.collection.objects.link(ob)
        me.materials.append(mat)
        for p in me.polygons:
            p.use_smooth = True
        return ob


def marco(d):
    d = Vector(d).normalized()
    a = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    x = d.cross(a).normalized()
    y = d.cross(x).normalized()
    return x, y


def tubo(m, puntos, radios, lados=10, rep_u=1.0, rep_v=1.0):
    """Tubo por una polilinea con radio variable; UV u alrededor, v a lo largo (en metros / rep_v)."""
    anillos = []
    largo = 0.0
    for i, p in enumerate(puntos):
        p = Vector(p)
        if i < len(puntos) - 1:
            d = Vector(puntos[i + 1]) - p
        else:
            d = p - Vector(puntos[i - 1])
        if i > 0:
            largo += (p - Vector(puntos[i - 1])).length
        x, y = marco(d)
        anillos.append([(p + (x * math.cos(2 * math.pi * k / lados) + y * math.sin(2 * math.pi * k / lados)) * radios[i],
                         largo) for k in range(lados + 1)])
    for i in range(len(anillos) - 1):
        for k in range(lados):
            a, b = anillos[i][k], anillos[i][k + 1]
            c, d = anillos[i + 1][k + 1], anillos[i + 1][k]
            m.cara([a[0], b[0], c[0], d[0]],
                   [(k / lados * rep_u, a[1] / rep_v), ((k + 1) / lados * rep_u, b[1] / rep_v),
                    ((k + 1) / lados * rep_u, c[1] / rep_v), (k / lados * rep_u, d[1] / rep_v)])


def curva(p0, d0, largo, n, caida=0.0, ondula=0.0, rng=None):
    """Polilinea que sale de p0 en direccion d0 y se curva hacia abajo (caida > 0) o arriba (< 0)."""
    p = Vector(p0)
    d = Vector(d0).normalized()
    pts = [p.copy()]
    for i in range(n):
        u = (i + 1) / n
        d = (d + Vector((0, 0, -caida * 2.2 / n))).normalized()
        if rng is not None and ondula:
            d = (d + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * ondula).normalized()
        p = p + d * (largo / n)
        pts.append(p.copy())
    return pts


def tarjeta(m, centro_arriba, eje, abajo, ancho, alto, celda, giro=0.0):
    """Tarjeta cuyo borde superior va a lo largo de 'eje' (la ramita del atlas) y cuelga hacia 'abajo'.
    celda = (u0, v0, u1, v1) en el atlas (v hacia arriba)."""
    e = Vector(eje).normalized()
    b = Vector(abajo)
    b = (b - e * b.dot(e)).normalized()
    if giro:
        b = (Matrix.Rotation(giro, 3, e) @ b).normalized()
    c = Vector(centro_arriba)
    p0 = c - e * ancho / 2
    p1 = c + e * ancho / 2
    p2 = p1 + b * alto
    p3 = p0 + b * alto
    u0, v0, u1, v1 = celda
    return m.cara([p0, p1, p2, p3], [(u0, v1), (u1, v1), (u1, v0), (u0, v0)])


def hornear_ao(ob, centro, radio, fondo=0.55, pie=None):
    """Oscurece por cercania al centro de la copa (follaje) y al pie del tronco."""
    me = ob.data
    ca = me.color_attributes["ao"]
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            r = (v - centro).length / max(radio, 1e-6)
            k = fondo + (1 - fondo) * min(1.0, max(0.0, r) ** 1.2)
            if pie is not None:
                k *= 0.7 + 0.3 * min(1.0, max(0.0, (v.z - pie[0]) / max(pie[1], 1e-6)))
            ca.data[li].color = (k, k, k, 1.0)


# --------------------------------------------------------------------------- especies

CELDAS4 = [(0.0, 0.5, 0.5, 1.0), (0.5, 0.5, 1.0, 1.0), (0.0, 0.0, 0.5, 0.5), (0.5, 0.0, 1.0, 0.5)]


def pino(sem=11):
    rng = random.Random(sem)
    H = 9.0
    tronco = Malla()
    follaje = Malla()
    pts = [(rng.uniform(-0.03, 0.03) * i, rng.uniform(-0.03, 0.03) * i, H * i / 14) for i in range(15)]
    radios = [0.24 * (1 - 0.92 * (i / 14)) + 0.015 for i in range(15)]
    pts[0] = (0, 0, -0.15)
    tubo(tronco, pts, radios, lados=14, rep_u=2.0, rep_v=1.2)
    # verticilos de ramas desde 1,6 m hasta la punta; mas largas abajo (copa conica)
    z = 2.4
    nivel = 0
    while z < H - 0.3:
        u = (z - 2.4) / (H - 2.7)
        n_ramas = rng.randint(4, 6)
        L = 3.1 * (1 - u) ** 1.05 + 0.35
        base = rng.uniform(0, 2 * math.pi)
        for k in range(n_ramas):
            a = base + 2 * math.pi * k / n_ramas + rng.uniform(-0.3, 0.3)
            d0 = Vector((math.cos(a), math.sin(a), rng.uniform(0.05, 0.35)))
            ruta = curva((0, 0, z), d0, L * rng.uniform(0.85, 1.1), 6, caida=0.25 + 0.2 * (1 - u), ondula=0.06, rng=rng)
            r0 = 0.05 * (1 - u) + 0.018
            tubo(tronco, ruta, [r0 * (1 - 0.85 * i / 6) + 0.006 for i in range(7)], lados=6, rep_u=1.0, rep_v=0.6)
            # ramilletes de agujas colgando a lo largo de la rama
            for i in range(1, 7):
                p = ruta[i]
                eje = (ruta[i] - ruta[i - 1]).normalized()
                lado = eje.cross(Vector((0, 0, 1))).normalized()
                for s in (-1, 1):
                    e2 = (eje + lado * s * 0.6).normalized()
                    tam = 0.95 * (0.55 + 0.45 * (1 - i / 7)) * (0.8 + 0.4 * (1 - u))
                    tarjeta(follaje, p, e2, Vector((0, 0, -1)) + lado * s * 0.3, tam, tam * 0.9,
                            rng.choice(CELDAS4), giro=rng.uniform(-0.5, 0.5))
        z += rng.uniform(0.55, 0.75)
        nivel += 1
    # penacho en la punta
    for k in range(7):
        a = 2 * math.pi * k / 7
        e2 = Vector((math.cos(a), math.sin(a), 0.6))
        tarjeta(follaje, (0, 0, H - 0.1), e2, Vector((0, 0, -1)), 0.7, 0.8, rng.choice(CELDAS4))
    mt = material("Pino_Corteza", "pino_corteza_col.png", "pino_corteza_nrm.png", rugosidad=0.9)
    mf = material("Pino_Agujas", "pino_agujas.png", alfa=True, rugosidad=0.7)
    ot = tronco.objeto("Pino_Tronco", mt)
    of = follaje.objeto("Pino_Agujas", mf)
    hornear_ao(of, Vector((0, 0, 3.8)), 3.4, fondo=0.5)
    hornear_ao(ot, Vector((0, 0, 3.8)), 3.4, fondo=0.55, pie=(0.0, 2.0))
    return [ot, of]


def aliso(sem=7):
    rng = random.Random(sem)
    H = 7.5
    tronco = Malla()
    follaje = Malla()
    pts = [(math.sin(i * 0.5) * 0.04, math.cos(i * 0.4) * 0.03, 3.2 * i / 8) for i in range(9)]
    pts[0] = (0, 0, -0.15)
    tubo(tronco, pts, [0.20 * (1 - 0.45 * i / 8) for i in range(9)], lados=14, rep_u=1.5, rep_v=1.0)
    copa = Vector((0, 0, 4.9))
    ramas = []
    for k in range(6):
        a = 2 * math.pi * k / 6 + rng.uniform(-0.25, 0.25)
        z0 = rng.uniform(2.4, 3.2)
        d0 = Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 1.25))
        r = curva((pts[-1][0] * z0 / 3.2, pts[-1][1] * z0 / 3.2, z0), d0, rng.uniform(3.0, 4.2), 7, caida=-0.05, ondula=0.08, rng=rng)
        ramas.append(r)
        tubo(tronco, r, [0.09 * (1 - 0.85 * i / 7) + 0.01 for i in range(8)], lados=8, rep_u=1.0, rep_v=0.8)
        # ramas secundarias
        for j in (3, 5):
            a2 = a + rng.choice((-1, 1)) * rng.uniform(0.6, 1.1)
            d2 = Vector((math.cos(a2), math.sin(a2), rng.uniform(0.2, 0.7)))
            r2 = curva(r[j], d2, rng.uniform(1.2, 1.9), 5, caida=0.1, ondula=0.1, rng=rng)
            ramas.append(r2)
            tubo(tronco, r2, [0.035 * (1 - 0.8 * i / 5) + 0.006 for i in range(6)], lados=6, rep_u=1.0, rep_v=0.5)
    # hojas: ramitas del atlas a lo largo de las ramas exteriores, mas densas hacia afuera
    for r in ramas:
        for i in range(2, len(r)):
            for _ in range(5):
                p = r[i] + Vector((rng.uniform(-0.45, 0.45), rng.uniform(-0.35, 0.35), rng.uniform(-0.25, 0.3)))
                e = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.3, 0.3)))
                ab = Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), -1))
                tam = rng.uniform(0.75, 1.05)
                celda = rng.choice(CELDAS4)
                # la ramita del atlas esta a media altura de la celda: se centra la tarjeta en ella
                u0, v0, u1, v1 = celda
                tarjeta(follaje, p - ab.normalized() * tam * 0.0 + Vector((0, 0, tam * 0.5)), e, ab, tam, tam, celda,
                        giro=rng.uniform(-0.8, 0.8))
    mt = material("Aliso_Corteza", "aliso_corteza_col.png", "aliso_corteza_nrm.png", rugosidad=0.85, fuerza_normal=0.5)
    mf = material("Aliso_Hojas", "aliso_hojas.png", alfa=True, rugosidad=0.6)
    ot = tronco.objeto("Aliso_Tronco", mt)
    of = follaje.objeto("Aliso_Hojas", mf)
    hornear_ao(of, copa, 2.8, fondo=0.5)
    hornear_ao(ot, copa, 2.8, fondo=0.6, pie=(0.0, 1.5))
    return [ot, of]


def helecho(sem=5):
    rng = random.Random(sem)
    H = 4.2
    tronco = Malla()
    follaje = Malla()
    pts = [(math.sin(i * 0.7) * 0.05 * i / 10, 0.02 * i / 10, H * i / 10) for i in range(11)]
    pts[0] = (0, 0, -0.1)
    tubo(tronco, pts, [0.16 * (1 - 0.15 * i / 10) + 0.02 * (1 if i == 0 else 0) for i in range(11)], lados=14, rep_u=2.0, rep_v=0.7)
    top = Vector(pts[-1])
    nf = 19
    for k in range(nf):
        a = 2 * math.pi * k / nf + rng.uniform(-0.15, 0.15)
        alza = rng.uniform(0.25, 1.3) if k % 3 else rng.uniform(1.2, 1.8)
        d0 = Vector((math.cos(a), math.sin(a), alza))
        L = rng.uniform(2.3, 2.9)
        ruta = curva(top, d0, L, 10, caida=0.55 + rng.uniform(0, 0.2))
        # tira curvada: ancho segun el lado del atlas (la fronda llena el ancho de la celda)
        lado = Vector((-math.sin(a), math.cos(a), 0))
        anc = 1.3 * L / 2.6
        for i in range(10):
            p0, p1 = ruta[i], ruta[i + 1]
            v0, v1 = 1 - i / 10, 1 - (i + 1) / 10
            # inclinacion lateral leve para que no sea un plano
            l0 = (lado + Vector((0, 0, 0.15))).normalized() * anc / 2
            follaje.cara([p0 - l0, p0 + l0, p1 + l0, p1 - l0], [(0, v0), (1, v0), (1, v1), (0, v1)])
        # raquis grueso al pie de la fronda
        tubo(tronco, ruta[:4], [0.03, 0.025, 0.02, 0.015], lados=5, rep_u=1.0, rep_v=0.5)
    mt = material("Helecho_Tronco", "helecho_tronco_col.png", "helecho_tronco_nrm.png", rugosidad=0.95, fuerza_normal=1.0)
    mf = material("Helecho_Fronda", "helecho_fronda.png", alfa=True, rugosidad=0.6)
    ot = tronco.objeto("Helecho_Tronco", mt)
    of = follaje.objeto("Helecho_Frondas", mf)
    hornear_ao(of, top, 1.6, fondo=0.55)
    hornear_ao(ot, top, 1.6, fondo=0.7, pie=(0.0, 1.0))
    return [ot, of]


CONSTRUCTORES = {"pino": pino, "aliso": aliso, "helecho-arborescente": helecho}


def hacer(nombre, carpeta, render=True):
    sv_lib.limpiar()
    objs = CONSTRUCTORES[nombre]()
    sv_lib.ESTADO["flora"] = objs
    rutas = []
    if render:
        cam = sv_lib.montar_estudio(res=560, muestras=16)
        sc = bpy.context.scene
        mn, mx = sv_lib.caja_mundo(objs)
        c = (mn + mx) * 0.5
        r = (mx - mn).length * 0.5
        os.makedirs(os.path.join(carpeta, "render"), exist_ok=True)
        for k, (az, el) in enumerate(((35, 8), (160, 25))):
            sv_lib.encuadrar(cam, az, el, 0.9, centro=c, radio=r)
            sc.render.filepath = os.path.join(carpeta, "render", "{}_{}.png".format(nombre, k))
            bpy.ops.render.render(write_still=True)
            rutas.append(sc.render.filepath)
    tam = sv_lib.exportar_glb(os.path.join(carpeta, nombre + ".glb"), animaciones=False)
    caras = sum(len(o.data.polygons) for o in objs)
    return {"caras": caras, "bytes": tam, "rutas": rutas}
