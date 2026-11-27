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


def hacer_v4(nombre, carpeta_salida=None, ao=True, cambios=None, exportar=True):
    """Version 4: patas nuevas por especie, atlas de remeras redondeadas y oclusion horneada."""
    import sv_ao
    import sv_patas
    t0 = time.time()
    sv_lib.limpiar()
    esp = sv_especies.ESPECIES[nombre]()
    esp["patas"] = dict(sv_patas.PATAS[nombre], **esp.get("patas", {}))
    # plumaje del cuerpo mas fino y parejo: plumas un 24 % mas cortas (casi el doble de plumas), menos sombra
    # en la base y menos ruido de color por pluma; menos relieve en el mapa de normales. A la distancia de la
    # ficha cada pluma de contorno se leia como una escama.
    cu = dict(esp["cuerpo"])
    cu["largo"] = cu.get("largo", 0.15) * 0.76
    cu["candidatos"] = int(cu.get("candidatos", 45000) * 1.6)
    cu["sombra"] = max(cu.get("sombra", 0.86), 0.93)
    cu["ruido"] = min(cu.get("ruido", 0.05), 0.03)
    esp["cuerpo"] = cu
    mc = dict(esp.get("material_cuerpo", {}))
    mc["fuerza_normal"] = min(mc.get("fuerza_normal", 0.30), 0.15)
    esp["material_cuerpo"] = mc
    for k, v in (cambios or {}).items():
        if isinstance(v, dict) and isinstance(esp.get(k), dict):
            esp[k] = dict(esp[k], **v)
        else:
            esp[k] = v
    a = sv_plumaje.construir(nombre, esp)
    sv_lib.ESTADO["ave"] = a
    sv_lib.ESTADO["esp"] = esp
    r_ao = sv_ao.hornear_ave(a, rayos=24, fuerza=0.9, k_dist=0.40) if ao else None
    sv_lib.montar_estudio(res=640, muestras=20)
    tam = None
    if exportar:
        carpeta_salida = carpeta_salida or os.path.join(sv_lib.RAIZ, "salida_v4", "aves")
        tam = sv_lib.exportar_glb(os.path.join(carpeta_salida, SALIDA[nombre] + ".glb"))
        a.arm.data.pose_position = 'REST'
    return {"cuenta": a.cuenta, "ao": r_ao, "bytes": tam, "seg": round(time.time() - t0, 1)}
