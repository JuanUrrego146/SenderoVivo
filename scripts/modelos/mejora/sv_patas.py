"""Patas nuevas para las aves de Sendero Vivo.

Las patas de los modelos originales son tubos lisos color piel que cuelgan durante el aleteo, con dedos
en forma de cono. Este modulo las reemplaza por patas construidas: tarso con escamas (escudetes), cuatro
dedos con almohadillas en las articulaciones y unas curvas, con el color y el grosor de cada especie.

Modos:
  recogidas  el ave vuela con las patas plegadas bajo el vientre y los dedos cerrados, como hacen las
             aves reales en vuelo (el tarso apunta hacia atras y los dedos quedan cerrados en puno).
  percha     el ave esta posada: los dedos delanteros abrazan la percha por encima y el hallux por detras.

La geometria se arma ya en su pose final, en el espacio de reposo del esqueleto, y va pegada al hueso
de la cadera de cada lado; las curvas de animacion de la pierna se quitan para que no se muevan solas.
"""
import math

import bpy
import numpy as np

import sv_aves
from sv_aves import _norm, hexa, suave


def _rot(v, eje, ang):
    """Rota el vector v alrededor del eje unitario un angulo ang (Rodrigues)."""
    eje = _norm(np.asarray(eje, np.float64))
    v = np.asarray(v, np.float64)
    c, s = math.cos(ang), math.sin(ang)
    return v * c + np.cross(eje, v) * s + eje * (eje @ v) * (1 - c)


# Patas por especie. El color sale de esp["base"]["patas"]; aqui van modo, grosor y unas.
# grosor: radio del tarso / largo del tarso. k_dedo: dedo medio / tarso. k_una: una / dedo medio.
PATAS = {
    "aguililla": dict(modo="recogidas", grosor=0.085, k_dedo=0.56, k_una=0.44, k_una_hallux=0.52, una="#141210", escudetes=12),
    "colibri": dict(modo="recogidas", grosor=0.065, k_dedo=0.55, una="#1c1a19"),
    "copeton": dict(modo="recogidas", grosor=0.052, una="#3a302a"),
    "cucarachero": dict(modo="recogidas", grosor=0.055, una="#2a2220"),
    "golondrina": dict(modo="recogidas", grosor=0.055, k_dedo=0.60, una="#1c1a19"),
    "nuca": dict(modo="recogidas", grosor=0.055, una="#2a2420"),
    "pibi-ahumado": dict(modo="percha", grosor=0.055, una="#141414"),
    "saltapared": dict(modo="recogidas", grosor=0.050, una="#4a3a30"),
    "tucan": dict(modo="recogidas", grosor=0.075, k_dedo=0.58, zigodactilo=True, una="#2e3236", escudetes=10),
    "vireo": dict(modo="recogidas", grosor=0.050, una="#3e4650"),
}

# --------------------------------------------------------------------------- tubos

class Malla:
    def __init__(self):
        self.V, self.F, self.C, self.MI = [], [], [], []
        self.n = 0

    def tubo(self, centro, radio, color, mat=0, m=10, aplanar=1.0, ref=None, tapa_ini=True, tapa_fin=True):
        """Tubo a lo largo de la polilinea centro (n,3) con radio (n,) y color (n,3)."""
        P = np.asarray(centro, np.float64)
        n = len(P)
        T = np.gradient(P, axis=0)
        T = _norm(T)
        ref = np.array([0.0, 0.0, 1.0]) if ref is None else _norm(np.asarray(ref, np.float64))
        if abs(ref @ T[0]) > 0.95:
            ref = np.array([1.0, 0.0, 0.0])
        N = _norm(ref - (ref @ T[0]) * T[0])
        Ns = []
        for i in range(n):
            if i > 0:
                # transporte paralelo del marco
                N = N - (N @ T[i]) * T[i]
                N = _norm(N)
            Ns.append(N)
        Ns = np.array(Ns)
        B = np.cross(T, Ns)
        ang = np.linspace(0, 2 * math.pi, m, endpoint=False)
        ca, sa = np.cos(ang), np.sin(ang)
        r = np.asarray(radio, np.float64)
        anillos = P[:, None, :] + r[:, None, None] * (ca[None, :, None] * Ns[:, None, :] + aplanar * sa[None, :, None] * B[:, None, :])
        V = anillos.reshape(-1, 3)
        col = np.repeat(np.asarray(color, np.float64), m, axis=0)
        base = self.n
        caras = []
        for i in range(n - 1):
            for j in range(m):
                a = base + i * m + j
                b = base + i * m + (j + 1) % m
                caras.append((a, b, b + m, a + m))
        extra_v, extra_c = [], []
        k = len(V)
        if tapa_ini:
            extra_v.append(P[0] - T[0] * r[0] * 0.5)
            extra_c.append(color[0])
            c0 = base + k
            for j in range(m):
                caras.append((base + (j + 1) % m, base + j, c0))
            k += 1
        if tapa_fin:
            extra_v.append(P[-1] + T[-1] * r[-1] * 0.5)
            extra_c.append(color[-1])
            c1 = base + k
            u = base + (n - 1) * m
            for j in range(m):
                caras.append((u + j, u + (j + 1) % m, c1))
            k += 1
        if extra_v:
            V = np.vstack([V, np.array(extra_v)])
            col = np.vstack([col, np.array(extra_c)])
        self.V.append(V)
        self.C.append(col)
        self.F.extend(caras)
        self.MI.extend([mat] * len(caras))
        self.n += len(V)

    def esfera(self, centro, radio, color, mat=0, m=10):
        t = np.linspace(-1, 1, 7)
        P = np.asarray(centro)[None, :] + np.outer(t * radio, np.array([0.0, 0.0, 1.0]))
        r = radio * np.sqrt(np.clip(1 - t * t, 0.02, 1))
        self.tubo(P, r, np.repeat(np.asarray(color)[None, :], len(t), 0), mat=mat, m=m)


def arco(p0, d0, eje, largo, giro, n=12, giro_pot=1.0):
    """Centro de un dedo: parte de p0 en direccion d0 y se curva alrededor del eje un angulo total giro.
    giro_pot > 1 concentra la curvatura hacia la punta."""
    P = [np.asarray(p0, np.float64)]
    d = _norm(np.asarray(d0, np.float64))
    paso = largo / (n - 1)
    ts = np.linspace(0, 1, n)
    acum = 0.0
    for i in range(1, n):
        objetivo = giro * ts[i] ** giro_pot
        d = _rot(d, eje, objetivo - acum)
        acum = objetivo
        P.append(P[-1] + d * paso)
    return np.array(P), d


def dedo(mal, base, d0, eje, largo, r0, falanges, color, color_una, largo_una, giro, giro_una, m=8, aplanar=0.85,
         ref=None, n=None):
    """Dedo con almohadillas en cada articulacion y una curva al final."""
    n = n or max(10, falanges * 4 + 2)
    P, d_fin = arco(base, d0, eje, largo, giro, n=n, giro_pot=1.25)
    t = np.linspace(0, 1, n)
    # se adelgaza hacia la punta y engorda en cada articulacion (almohadillas)
    r = r0 * (1.0 - 0.32 * t)
    bulto = 0.5 + 0.5 * np.cos(2 * math.pi * t * falanges)
    r = r * (1.0 + 0.14 * bulto)
    col = np.repeat(np.asarray(color)[None, :], n, 0) * (1.0 - 0.10 * (1 - bulto))[:, None]
    mal.tubo(P, r, col, mat=0, m=m, aplanar=aplanar, ref=ref, tapa_ini=True, tapa_fin=False)
    # una: arco mas cerrado, de la base del ultimo tramo hasta una punta fina
    nu = 9
    Pu, _ = arco(P[-1] - d_fin * r[-1] * 0.4, d_fin, eje, largo_una, giro_una, n=nu, giro_pot=1.1)
    tu = np.linspace(0, 1, nu)
    ru = r[-1] * 0.78 * (1 - tu) ** 0.9 + 1e-5
    cu = np.repeat(np.asarray(color_una)[None, :], nu, 0)
    cu[:2] = cu[:2] * 0.6 + np.asarray(color)[None, :] * 0.4
    mal.tubo(Pu, ru, cu, mat=1, m=m, aplanar=0.75, ref=ref, tapa_ini=False, tapa_fin=True)
    return P[-1]


# --------------------------------------------------------------------------- marco de la pierna

def marco(ave):
    """Ejes en mundo para armar la pata: adelante (horizontal, hacia la cabeza), abajo (vertical) y X lateral.

    Ni los huesos de la pierna ni el eje del tronco sirven en todos los modelos (en uno el tarso cuelga de
    la cadera y en otro de la rodilla; en un ave redonda el eje principal sale torcido). El cuerpo no gira
    en la animacion, asi que se usan la vertical del mundo y la direccion horizontal cola -> cabeza."""
    X = _norm(np.asarray(ave.X, np.float64))
    arriba = np.array([0.0, 0.0, 1.0])
    abajo = -arriba
    adelante = ave.h["Head_M"] - ave.h["Tail1_M"]
    adelante = adelante - (adelante @ arriba) * arriba - (adelante @ X) * X
    adelante = _norm(adelante)
    abajo = _norm(np.cross(adelante, X))
    if abajo @ arriba > 0:
        abajo = -abajo
    return adelante, abajo, X


def mascara_pata(ave, lado):
    """Vertices de la pata visible de un lado: material de patas o peso de pierna, del lado que toca."""
    X = _norm(np.asarray(ave.X, np.float64))
    centro = ave.h["Root_M"] @ X
    sg = 1.0 if (ave.h["Hip_" + lado] @ X) > centro else -1.0
    lado_ok = ((ave.co @ X) - centro) * sg > 0
    w = ave.peso([b + "_" + lado for b in sv_aves.PATA])
    return (ave.v_patamat | (w > 0.5)) & lado_ok


def tope_pata(ave, lado, abajo):
    """Punto donde la pata visible sale del cuerpo: el promedio del 8 % de sus vertices mas altos."""
    m = mascara_pata(ave, lado)
    if m.sum() < 8:
        return ave.h["Knee_" + lado]
    P = ave.co[m]
    pr = P @ abajo
    corte = np.percentile(pr, 8)
    return P[pr <= corte].mean(0)


def construir_pata(ave, mal, lado, cfg, adelante, abajo, X):
    s = "_" + lado
    sg = 1.0 if (ave.h["Hip" + s] @ X) > (ave.h["Root_M"] @ X) else -1.0
    lat = X * sg                                  # hacia afuera de este lado
    # el tarso va de donde la pata sale del cuerpo hasta el tobillo (donde nacen los dedos)
    rodilla = tope_pata(ave, lado, abajo)
    tobillo = ave.h["Ankle" + s]
    L_tar = float(np.linalg.norm(tobillo - rodilla)) * cfg.get("k_tarso", 1.0)
    r_t = L_tar * cfg.get("grosor", 0.050)
    col = hexa(cfg["color"])
    col_esc = col * cfg.get("k_escama", 0.72)
    col_una = hexa(cfg.get("una", "#2a2522"))
    modo = cfg.get("modo", "recogidas")
    L3 = L_tar * cfg.get("k_dedo", 0.62)          # dedo medio
    zigo = cfg.get("zigodactilo", False)

    if modo == "recogidas":
        # la articulacion queda metida entre las plumas del vientre y el tarso apunta atras y un poco abajo
        j = rodilla - abajo * (cfg.get("hundir", 0.42) * L_tar) + adelante * (0.28 * L_tar) - lat * (0.06 * L_tar)
        ang = math.radians(cfg.get("caida", 12.0))
        d_t = _norm(-adelante * math.cos(ang) + abajo * math.sin(ang) + lat * cfg.get("abre", 0.10))
        a = j + d_t * L_tar
    else:
        j = rodilla
        a = tobillo
        d_t = _norm(a - j)

    # tarso: escudetes por delante como anillos mas oscuros en los bordes
    n_t = 26
    t = np.linspace(0, 1, n_t)
    P = j[None, :] + np.outer(t, a - j)
    n_esc = cfg.get("escudetes", 9)
    fase = (t * n_esc) % 1.0
    borde = np.exp(-((fase - 0.0) / 0.10) ** 2) + np.exp(-((fase - 1.0) / 0.10) ** 2)
    r = r_t * (1.0 + 0.08 * (1 - 2 * np.abs(fase - 0.5))) * (1.0 + 0.18 * suave(0.82, 1.0, t))
    r = r * (1.0 + 0.10 * (1 - suave(0.0, 0.15, t)))   # ensancha un poco arriba (articulacion)
    ctar = col[None, :] * (1 - 0.45 * np.clip(borde, 0, 1))[:, None] + col_esc[None, :] * 0.0
    mal.tubo(P, r, ctar, mat=0, m=10, aplanar=cfg.get("aplanar_tarso", 0.82), ref=lat)
    mal.esfera(a, r_t * 1.18, col * 0.95, m=10)

    # dedos
    ref = lat
    if modo == "recogidas":
        # puno cerrado: los dedos delanteros bajan y se enroscan hacia atras, el hallux sale atras y se cierra
        frente = _norm(abajo * 0.85 + adelante * 0.35)
        abre = math.radians(cfg.get("abre_dedos", 14.0))
        delanteros = [(-1, 0.80, 3), (0, 1.00, 4), (1, 0.85, 5)]
        if zigo:
            delanteros = [(-1, 0.85, 3), (0, 1.00, 4)]
        for i, kl, fal in delanteros:
            d0 = _norm(_rot(frente, abajo, i * abre) + lat * 0.06 * i)
            dedo(mal, a + d0 * r_t * 0.3, d0, _rot_signo(lat, d0, -adelante), L3 * kl, r_t * 0.62, fal, col, col_una,
                 L3 * cfg.get("k_una", 0.30), math.radians(cfg.get("cierre", 110.0)), math.radians(70), ref=ref)
        atras = [(0, cfg.get("k_hallux", 0.70), 2)]
        if zigo:
            atras = [(-0.6, 0.75, 2), (0.6, 0.90, 5)]
        for i, kl, fal in atras:
            d0 = _norm(-adelante * 0.55 + abajo * 0.80 + lat * 0.25 * i)
            dedo(mal, a + d0 * r_t * 0.3, d0, _rot_signo(lat, d0, adelante), L3 * kl, r_t * 0.66, fal, col, col_una,
                 L3 * cfg.get("k_una_hallux", 0.38), math.radians(cfg.get("cierre_hallux", 100.0)), math.radians(75), ref=ref)
    else:
        # percha: dedos delanteros por encima de la percha y hacia abajo por delante, hallux por detras
        perc = cfg["percha"]                     # (centro, eje, radio) en mundo
        c_p, e_p, r_p = perc
        e_p = _norm(np.asarray(e_p))
        rel = a - c_p
        rel = rel - (rel @ e_p) * e_p
        r_contacto = r_p + r_t * 0.55
        abre = math.radians(cfg.get("abre_dedos", 16.0))
        delanteros = [(-1, 0.80, 3), (0, 1.00, 4), (1, 0.85, 5)]
        if zigo:
            delanteros = [(-1, 0.85, 3), (0, 1.00, 4)]
        for i, kl, fal in delanteros:
            d0 = _norm(_rot(adelante, abajo, i * abre) + abajo * 0.25)
            L = L3 * kl
            ang_total = L / max(r_contacto, 1e-6)
            dedo(mal, a + d0 * r_t * 0.3, d0, _eje_percha(d0, a, c_p, e_p),
                 L, r_t * 0.62, fal, col, col_una, L3 * cfg.get("k_una", 0.30), min(ang_total * 0.85, math.radians(130)),
                 math.radians(100), ref=ref)
        atras = [(0, cfg.get("k_hallux", 0.70), 2)]
        if zigo:
            atras = [(-0.6, 0.75, 2), (0.6, 0.90, 5)]
        for i, kl, fal in atras:
            d0 = _norm(-adelante + abajo * 0.35 + lat * 0.2 * i)
            L = L3 * kl
            dedo(mal, a + d0 * r_t * 0.3, d0, _eje_percha(d0, a, c_p, e_p), L, r_t * 0.66, fal, col, col_una,
                 L3 * cfg.get("k_una_hallux", 0.38), min(L / max(r_contacto, 1e-6) * 0.85, math.radians(120)),
                 math.radians(100), ref=ref)
    return j, a


def _rot_signo(eje, d0, hacia):
    """Elige el signo del eje para que el dedo, al curvarse, se cierre hacia 'hacia' (debajo del tarso)."""
    prueba = _rot(d0, eje, 0.5)
    return eje if prueba @ hacia > d0 @ hacia else -eje


def _eje_percha(d0, a, c_p, e_p):
    """Eje de giro para que un dedo que sale de a en direccion d0 se enrosque alrededor de la percha."""
    rel = a - c_p
    rel = rel - (rel @ e_p) * e_p
    eje = _norm(e_p)
    prueba = _rot(d0, eje, 0.5)
    hacia = -_norm(rel)
    return eje if prueba @ hacia > d0 @ hacia else -eje


# --------------------------------------------------------------------------- en la escena

def quitar_patas_originales(ave, umbral=0.5):
    """Borra de la malla original las caras de las patas (tarso y dedos), sin tocar la percha."""
    import bmesh
    me = ave.ob.data
    w = ave.peso([b + s for b in sv_aves.PATA for s in ("_L", "_R")])
    vm = ave.vmat
    madero = np.isin(vm, ave.i_otro) if ave.i_otro else np.zeros(len(w), bool)
    quitar = (w >= umbral) & ~madero
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    caras = [f for f in bm.faces if all(quitar[v.index] for v in f.verts)]
    n = len(caras)
    bmesh.ops.delete(bm, geom=caras, context='FACES_ONLY')
    bm.to_mesh(me)
    bm.free()
    me.update()
    return n


def meter_patas_originales(ave, desde=0.34, hasta=0.70):
    """Mete dentro del cuerpo las patas de la malla original (tarso y dedos), sin borrar caras.

    Cada vertice de la pata (material de patas o peso de pierna) se lleva a la cadera de su lado; los del
    borde, donde la pata se une al vientre, solo una parte. Asi no queda hueco y las plumas de contorno
    tapan el hundimiento. La percha del pibi es un objeto aparte y no se toca."""
    n = 0
    adj = _vecinos(ave)
    for lado in ("L", "R"):
        w = ave.peso([b + "_" + lado for b in sv_aves.PATA])
        m = mascara_pata(ave, lado)
        k = suave(desde, hasta, w) * mascara_lado(ave, lado)
        borde = m & adj(~m)
        k = np.maximum(k, np.where(borde, 0.55, np.where(m, 1.0, 0.0)))
        destino = ave.h["Hip_" + lado]
        ave.co = ave.co + k[:, None] * (destino[None, :] - ave.co)
        n += int((k > 0.5).sum())
    return n


def mascara_lado(ave, lado):
    X = _norm(np.asarray(ave.X, np.float64))
    centro = ave.h["Root_M"] @ X
    sg = 1.0 if (ave.h["Hip_" + lado] @ X) > centro else -1.0
    return ((ave.co @ X) - centro) * sg > 0


def _vecinos(ave):
    """Devuelve f(mascara) -> vertices que comparten triangulo con algun vertice de la mascara."""
    tri = ave.tri

    def f(mask):
        t = mask[tri].any(1)
        out = np.zeros(len(mask), bool)
        out[tri[t].ravel()] = True
        return out
    return f


def quitar_animacion_patas(ave):
    from sv_plumaje import _curvas_de
    arm = ave.arm
    if not arm.animation_data or not arm.animation_data.action:
        return 0
    act = arm.animation_data.action
    nombres = [b + s for b in ("Hip",) + sv_aves.PATA for s in ("_L", "_R")]
    quitadas = 0
    # interfaz de capas (Blender 4.4+) o clasica
    contenedores = []
    try:
        if len(act.fcurves):
            contenedores.append(act.fcurves)
    except AttributeError:
        pass
    for capa in getattr(act, "layers", []):
        for tira in capa.strips:
            for bolsa in getattr(tira, "channelbags", []):
                contenedores.append(bolsa.fcurves)
    for cont in contenedores:
        for fc in list(cont):
            if any('pose.bones["{}"]'.format(nm) in fc.data_path for nm in nombres):
                cont.remove(fc)
                quitadas += 1
    for nm in nombres:
        pb = arm.pose.bones.get(nm)
        if pb:
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.scale = (1, 1, 1)
    return quitadas


def patas_nuevas(ave, esp):
    cfg = dict(esp.get("patas", {}))
    cfg.setdefault("color", esp.get("base", {}).get("patas", "#9c8473"))
    adelante, abajo, X = marco(ave)
    if cfg.get("modo") == "percha" and "percha" not in cfg:
        cfg["percha"] = buscar_percha(ave)
    mal = Malla()
    juntas = {}
    for lado in ("L", "R"):
        mal_l = Malla()
        juntas[lado] = construir_pata(ave, mal_l, lado, cfg, adelante, abajo, X)
        mal_l.lado = lado
        juntas[lado + "_malla"] = mal_l
    obs = []
    for lado in ("L", "R"):
        obs.append(_crear_objeto(ave, juntas[lado + "_malla"], "patas_" + lado, "Hip_" + lado, cfg))
    a_q = quitar_animacion_patas(ave)
    ave.patas = obs
    ave.extras = list(ave.extras) + obs
    return {"curvas_quitadas": a_q, "juntas": {k: [v[0].tolist(), v[1].tolist()] for k, v in juntas.items() if not k.endswith("malla")}}


def buscar_percha(ave):
    """Centro, eje y radio de la percha en mundo: el objeto aparte con material de madera."""
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for ob in ave.extras:
        if ob.type != 'MESH' or not any(m and "madero" in m.name.lower() for m in ob.data.materials):
            continue
        e = ob.evaluated_get(dg)
        me = e.to_mesh()
        pts += [tuple(e.matrix_world @ v.co) for v in me.vertices]
        e.to_mesh_clear()
    P = np.array(pts, np.float64)
    c = P.mean(0)
    _u, _s, vt = np.linalg.svd(P - c, full_matrices=False)
    e = vt[0]
    rel = P - c
    rel = rel - np.outer(rel @ e, e)
    r = float(np.median(np.linalg.norm(rel, axis=1)))
    return (c, e, r)


def _crear_objeto(ave, mal, nombre, hueso, cfg):
    V = np.vstack(mal.V)
    C = np.vstack(mal.C)
    Vl = V @ ave.Minv[:3, :3].T + ave.Minv[:3, 3]
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(Vl.tolist(), [], mal.F)
    me.update()
    nl = len(me.loops)
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get("vertex_index", lv)
    ca = me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    ca.data.foreach_set("color", np.concatenate([C[lv] * sv_aves.GANANCIA_VISOR, np.ones((nl, 1))], 1).astype(np.float32).ravel())
    me.color_attributes.active_color = ca
    me.color_attributes.render_color_index = 0
    for p in me.polygons:
        p.use_smooth = True
    m_pata = sv_aves.material_liso("SV_Patas", rugosidad=cfg.get("rugosidad", 0.55))
    m_una = sv_aves.material_liso("SV_Unas", rugosidad=0.32, barniz=0.3)
    me.materials.append(m_pata)
    me.materials.append(m_una)
    me.polygons.foreach_set("material_index", np.array(mal.MI, np.int32))
    me.update()
    ob = bpy.data.objects.new(nombre, me)
    for col in ave.ob.users_collection:
        col.objects.link(ob)
    ob.parent = ave.ob.parent
    ob.parent_type = ave.ob.parent_type
    ob.matrix_parent_inverse = ave.ob.matrix_parent_inverse.copy()
    ob.matrix_basis = ave.ob.matrix_basis.copy()
    g = ob.vertex_groups.new(name=hueso)
    g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    mod = ob.modifiers.new("Armature", 'ARMATURE')
    mod.object = ave.arm
    return ob
