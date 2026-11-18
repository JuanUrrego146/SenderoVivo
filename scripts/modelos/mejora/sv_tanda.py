"""Construccion por tandas: arma un ave, saca vistas de revision y exporta el .glb."""
import os
import time

import bpy

import sv_especies
import sv_lib
import sv_plumaje

SALIDA = {
    "aguililla": "aguililla-de-swainson", "colibri": "colibri-chillon", "copeton": "copeton", "cucarachero": "cucarachero-rufo",
    "golondrina": "golondrina-plomiza", "nuca": "atlapetes-nuquipalido", "pibi-ahumado": "pibi-ahumado", "saltapared": "saltapared-comun",
    "tucan": "tucan-andino", "vireo": "vireo-ojirrojo",
}


def hacer(nombre, carpeta, res=560, exportar=True, vistas=((35, 10), (205, 28), (90, 5)), planos=None, muestras=24):
    t0 = time.time()
    esp = sv_especies.ESPECIES[nombre]()
    a = sv_plumaje.construir(nombre, esp)
    sv_lib.ESTADO["ave"] = a
    cam = sv_lib.montar_estudio(res=res, muestras=muestras)
    sc = bpy.context.scene
    objs = [a.ob, a.plumas] + list(a.extras)
    mn, mx = sv_lib.caja_mundo(objs)
    centro = (mn + mx) * 0.5
    radio = (mx - mn).length * 0.5
    os.makedirs(carpeta, exist_ok=True)
    rutas = []
    for k, (az, el) in enumerate(vistas):
        sv_lib.encuadrar(cam, az, el, 0.82, centro=centro, radio=radio)
        sc.render.filepath = os.path.join(carpeta, "{}_{}.png".format(nombre, k))
        bpy.ops.render.render(write_still=True)
        rutas.append(sc.render.filepath)
    if planos:
        rutas += sv_lib.primeros_planos(a, carpeta, nombre, res=res, vistas=planos)
    tam = None
    if exportar:
        tam = sv_lib.exportar_glb(os.path.join(sv_lib.RAIZ, "salida", "aves", SALIDA[nombre] + ".glb"))
        a.arm.data.pose_position = 'REST'
    return {"cuenta": a.cuenta, "bytes": tam, "seg": round(time.time() - t0, 1), "rutas": rutas}
