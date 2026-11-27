"""Especies nuevas del 27/11/2026: carpintero candela (Colaptes rivolii).

El carpintero no tiene modelo original de Alberto Aleman. Se arma sobre el cuerpo posado del pibi ahumado
(originales/aves/carpintero.glb es una copia de pibi-ahumado.glb), el unico original que esta sobre una rama,
con el plumaje del carpintero candela segun su ficha (dorso rojo carmesi, vientre amarillo, garganta oscura
con pintas) y patas zigodactilas en percha.
"""
import sv_especies as E
import sv_patas
import sv_tanda
from sv_aves import suave, banda
from sv_plumaje import Pintor


def _pinta_carpintero(ave, c):
    z = E.Zonas(ave, c)
    s, th, phi, lam, cab, dc = z.s, z.th, z.phi, z.lam, z.cab, z.dc
    p = Pintor(c, "#d9b43c", "cont_liso")                                                   # vientre amarillo
    p.zona(z.ven * z.tramo(0.16, 0.58, 0.08), color="#c9a33a", celda="cont_barras", tam=1.1)  # pecho amarillo con escamas
    p.zona(banda(th, 84, 128, 14) * z.tramo(0.40, 0.95, 0.10), color="#c8a440", celda="cont_barras")   # flancos barrados
    p.zona(z.dor * z.tramo(0.10, 0.80, 0.08), color="#a8222b")                                # manto rojo carmesi
    p.zona(z.dor * suave(0.76, 0.88, s), color="#7d2a22", celda="cont_barras", tam=1.2)       # rabadilla
    p.zona(z.ven * suave(0.86, 0.98, s), color="#c9b066", celda="cont_barras", tam=1.2)       # infracoberteras
    p.zona(cab, color="#e6dcb0", celda="cont_liso2")                                          # cara crema
    p.zona(z.corona(hasta=z.po - 14), color="#b5232b", celda="cont_liso2")                    # corona roja
    p.zona(cab * suave(126, 140, lam), color="#b5232b")                                        # nuca roja
    p.zona(z.garganta(desde=128, lam_max=125), color="#26211d", celda="cont_gota")            # garganta negra con pintas
    p.zona(cab * banda(phi, 104, 120, 5) * banda(lam, 40, 120, 10), color="#2b2520")          # bigotera oscura
    p.zona(cab * (1 - suave(30, 46, phi)) * banda(lam, 80, 150, 14), tam=1.2, lev=1.3)        # corona algo erguida
    return p


def carpintero():
    return {
        "pinta": _pinta_carpintero,
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(E.ALA_REDONDA, envergadura=1.45,
                    color=dict(remera="#3c2b24", borde="#6a4a3a", ter="#8e2a28", borde_ter="#a8423a", fuerza_borde=0.35,
                               brazo="#9c2229", brazo_inf="#c9a648"),
                    filas=E._filas("#8e2026", "#9a2229", "#a3242b", ["#c9a648", "#cfad4e", "#d4b352", "#c9a648"])),
        "cola": dict(n=12, abanico=8.0, largo=1.0, largo_centro=1.05, largo_borde=0.92, ancho=0.16,
                     color=dict(base="#1f1b19", borde="#3a302a", fuerza_borde=0.3)),
        "base": dict(pico="#2a2a2c", pico_inf="#3b3b3e", patas="#5b6157", iris="#3a1d12"),
    }


def registrar():
    E.ESPECIES["carpintero"] = carpintero
    sv_patas.PATAS["carpintero"] = dict(modo="percha", grosor=0.062, k_dedo=0.58, zigodactilo=True, una="#1a1918", escudetes=10)
    sv_tanda.SALIDA["carpintero"] = "carpintero-candela"


def alargar_pico(ave, k=1.6, afinar=0.25):
    """Alarga el pico a lo largo de su eje desde la base (el del pibi es corto y ancho; el del carpintero es
    un cincel largo). Solo se mueven los vertices del material del pico que mueve la cabeza."""
    import numpy as np
    from mathutils import Vector
    from sv_aves import CABEZA
    sel = ave.v_pico & (ave.peso(list(CABEZA)) > 0.5)
    ob = ave.ob
    M = ob.matrix_world
    Mi = M.inverted()
    me = ob.data
    f = ave.f_cab
    cab = ave.C_cab
    base, L = ave.pico_base, ave.pico_largo
    err = []
    n = 0
    for i in np.nonzero(sel)[0]:
        w = np.array(M @ me.vertices[int(i)].co)
        err.append(float(np.linalg.norm(w - ave.co[i])))
        d = float((w - cab) @ f)
        t = d - base
        if t <= 0:
            continue
        u = t / max(L, 1e-9)
        eje = cab + f * d
        rad = w - eje
        nuevo = cab + f * (base + t * k) + rad * (1 - afinar * u)
        me.vertices[int(i)].co = Mi @ Vector(nuevo.tolist())
        n += 1
    me.update()
    return {"movidos": n, "err_max": max(err) if err else None}
