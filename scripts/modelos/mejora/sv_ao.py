"""Oclusion ambiental horneada en el color de vertice.

El visor de la app (model-viewer) no calcula sombras de contacto: sin ellas las plumas de debajo, la
axila, el vientre bajo las alas y la base del pico se ven tan claros como lo expuesto y el ave parece
plana. Aqui se lanza un abanico de rayos desde cada vertice, en la pose de reposo, contra toda la
geometria del ave, y se oscurece el color en proporcion a lo tapado.
"""
import math

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _datos_mundo(ob, dg):
    e = ob.evaluated_get(dg)
    me = e.to_mesh()
    M = np.array(e.matrix_world, np.float64)
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get("vertices", tv)
    # normal de vertice a partir de las normales de esquina (respeta las normales propias de las plumas)
    nl = len(me.loops)
    ln = np.empty(nl * 3, np.float32)
    me.corner_normals.foreach_get("vector", ln) if hasattr(me, "corner_normals") else me.loops.foreach_get("normal", ln)
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get("vertex_index", lv)
    vn = np.zeros((n, 3))
    np.add.at(vn, lv, ln.reshape(nl, 3).astype(np.float64))
    Rn = np.linalg.inv(M[:3, :3]).T
    vn = vn @ Rn.T
    vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
    e.to_mesh_clear()
    return co, tv.reshape(nt, 3), vn


def _direcciones(k, rng):
    """k direcciones en el hemisferio z+ con distribucion coseno."""
    u1, u2 = rng.random(k), rng.random(k)
    r = np.sqrt(u1)
    phi = 2 * math.pi * u2
    return np.stack([r * np.cos(phi), r * np.sin(phi), np.sqrt(1 - u1)], 1)


def hornear(objs, distancia, rayos=24, fuerza=0.65, minimo=0.35, semilla=3, doble_cara=None):
    """Oscurece el atributo de color 'Col' de cada objeto segun su oclusion.

    distancia: alcance de los rayos en unidades de mundo. doble_cara: nombres de objetos cuyas caras se
    ven de los dos lados (plumas sueltas): ahi se toma el lado mas abierto."""
    dg = bpy.context.evaluated_depsgraph_get()
    datos = {ob.name: _datos_mundo(ob, dg) for ob in objs}
    Vs, Ts, base = [], [], 0
    for ob in objs:
        co, tri, _ = datos[ob.name]
        Vs.append(co)
        Ts.append(tri + base)
        base += len(co)
    V = np.vstack(Vs)
    T = np.vstack(Ts)
    bvh = BVHTree.FromPolygons([Vector(v) for v in V], T.tolist(), all_triangles=True, epsilon=0.0)
    rng = np.random.default_rng(semilla)
    dirs = _direcciones(rayos, rng)
    eps = distancia * 0.01
    resumen = {}
    for ob in objs:
        co, _, vn = datos[ob.name]
        n = len(co)
        # marco por vertice
        a = np.where(np.abs(vn[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]]))
        t1 = np.cross(vn, a)
        t1 /= np.maximum(np.linalg.norm(t1, axis=1, keepdims=True), 1e-12)
        t2 = np.cross(vn, t1)
        lados = (1.0, -1.0) if (doble_cara and ob.name in doble_cara) else (1.0,)
        mejor = np.zeros(n)
        for sg in lados:
            abierto = np.zeros(n)
            nn = vn * sg
            for d in dirs:
                w = t1 * d[0] + t2 * d[1] + nn * d[2]
                for i in range(n):
                    o = co[i] + nn[i] * eps
                    hit = bvh.ray_cast(Vector(o), Vector(w[i]), distancia)
                    if hit[0] is None:
                        abierto[i] += 1.0
                    else:
                        abierto[i] += min(1.0, hit[3] / distancia) ** 2
            mejor = np.maximum(mejor, abierto / len(dirs))
        ao = np.clip(minimo + (1 - minimo) * mejor, 0, 1)
        k = 1.0 - fuerza * (1.0 - ao)
        me = ob.data
        ca = me.color_attributes.get("Col")
        if ca is None:
            continue
        nl = len(me.loops)
        lv = np.empty(nl, np.int32)
        me.loops.foreach_get("vertex_index", lv)
        if ca.domain == 'CORNER':
            c = np.empty(nl * 4, np.float32)
            ca.data.foreach_get("color", c)
            c = c.reshape(nl, 4)
            c[:, :3] *= k[lv, None]
        else:
            c = np.empty(n * 4, np.float32)
            ca.data.foreach_get("color", c)
            c = c.reshape(n, 4)
            c[:, :3] *= k[:, None]
        ca.data.foreach_set("color", c.ravel())
        me.update()
        resumen[ob.name] = {"n": n, "ao_medio": round(float(ao.mean()), 3), "ao_p10": round(float(np.percentile(ao, 10)), 3)}
    return resumen


def hornear_ave(ave, rayos=20, fuerza=0.6, k_dist=0.22):
    """Oclusion para el ave completa en reposo (alas abiertas)."""
    arm = ave.arm
    previo = arm.data.pose_position
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    objs = [ave.ob, ave.plumas] + [o for o in getattr(ave, "patas", [])]
    r = hornear(objs, distancia=k_dist * ave.U, rayos=rayos, fuerza=fuerza, doble_cara={ave.plumas.name})
    arm.data.pose_position = previo
    return r
