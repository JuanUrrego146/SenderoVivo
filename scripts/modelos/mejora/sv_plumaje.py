"""Montaje del plumaje: alas, cola y cuerpo. Usa sv_aves (Ave, Tarjetas) y una especie (sv_especies)."""
import math

import bpy
import numpy as np

import sv_aves
from sv_aves import _norm, hexa, suave, banda


def _rot(v, eje, ang):
    """Rota vectores v (n,3) alrededor de ejes unitarios (n,3) un angulo ang (n,) en radianes."""
    ang = np.asarray(ang, np.float64)[..., None]
    return v * np.cos(ang) + np.cross(eje, v) * np.sin(ang) + eje * (eje * v).sum(-1, keepdims=True) * (1 - np.cos(ang))


class Pintor:
    """Lienzo para describir un plumaje por zonas sobre un conjunto de puntos."""

    def __init__(self, c, base, celda="cont_liso"):
        self.c = c
        n = len(c["s"])
        self.color = np.tile(hexa(base), (n, 1))
        self.punta = np.full((n, 3), np.nan)
        self.celda = np.full(n, celda, dtype=object)
        self.tam = np.ones(n)
        self.lev = np.ones(n)

    def zona(self, m, color=None, celda=None, tam=None, punta=None, lev=None):
        m = np.clip(np.asarray(m, np.float64), 0, 1)
        m1 = m[:, None]
        if color is not None:
            self.color = self.color * (1 - m1) + hexa(color) * m1
            self.punta = np.where(m1 > 0.5, np.nan, self.punta)
        if punta is not None:
            self.punta = np.where(m1 > 0.5, hexa(punta)[None, :], self.punta)
        if celda is not None:
            self.celda[m > 0.5] = celda
        if tam is not None:
            self.tam = self.tam * (1 - m) + tam * m
        if lev is not None:
            self.lev = self.lev * (1 - m) + lev * m
        return self


# --------------------------------------------------------------------------- marco del ala

class MarcoAla:
    def __init__(self, ave, lado="L"):
        self.ave = ave
        h = ave.h
        self.S, self.E, self.Wr = h["Shoulder_" + lado], h["Elbow_" + lado], h["Wrist_" + lado]
        self.F1, self.F2 = h["IndexFinger1_" + lado], h["IndexFinger2_" + lado]
        w = ave.w_ala_L if lado == "L" else ave.w_ala_R
        self.sel = ave.v_piel & (w > 0.55)
        pts = ave.co[self.sel]
        s_eje = _norm(self.F2 - self.S)
        q = pts - pts.mean(0)
        q = q - np.outer(q @ s_eje, s_eje)
        _, _, vt = np.linalg.svd(q, full_matrices=False)
        n = vt[1] if len(vt) > 1 else np.array([0, 0, 1.0])     # menor varianza tras quitar la envergadura
        n = _norm(n - (n @ s_eje) * s_eje)
        cS = ave.coords(self.S[None, :])
        if n @ cS["dorsal"][0] < 0:
            n = -n
        c_eje = np.cross(n, s_eje)
        if c_eje @ cS["eje_t"][0] < 0:
            c_eje = -c_eje
        self.s, self.c, self.n = s_eje, c_eje, n
        self.diestro = float(np.cross(self.s, self.c) @ self.n)      # +1 ala izquierda, -1 derecha
        u, v, hh = self.uvh(pts)
        self.B = float(np.percentile(u, 99.5))                       # hombro -> punta de la tabla
        self.u_E = float((self.E - self.S) @ s_eje)
        self.u_W = float((self.Wr - self.S) @ s_eje)
        self.h_mid = float(np.median(hh))
        self.h_top = float(np.percentile(hh, 92))
        self.h_bot = float(np.percentile(hh, 8))
        self.v_te = float(np.percentile(v, 97))
        self.v_le = float(np.percentile(v, 3))

    def uvh(self, P):
        d = np.asarray(P) - self.S
        return d @ self.s, d @ self.c, d @ self.n

    def punto(self, u, v, hh):
        u, v, hh = (np.asarray(a, np.float64) for a in (u, v, hh))
        return self.S + u[..., None] * self.s + v[..., None] * self.c + hh[..., None] * self.n

    def dir(self, ang_deg):
        a = np.radians(np.asarray(ang_deg, np.float64))
        return np.cos(a)[..., None] * self.c + np.sin(a)[..., None] * self.s


def afinar_alas(ave, frente=0.085, atras=0.13, grosor=0.028):
    """Convierte la 'tabla' del ala en un brazo delgado: las plumas daran la silueta.

    frente, atras y grosor son las medidas del brazo (hacia el borde de ataque, hacia atras y medio espesor)
    como fraccion de la envergadura de la tabla.
    """
    for lado in ("L", "R"):
        m = MarcoAla(ave, lado)
        w = ave.w_ala_L if lado == "L" else ave.w_ala_R
        sel = ave.v_piel & (w > 0.3)
        u, v, hh = m.uvh(ave.co[sel])
        mez = suave(0.3, 0.85, w[sel])
        afila = 1.0 - 0.45 * suave(m.u_W, m.B, u)                 # mas fino hacia la punta
        k_f = np.minimum(1.0, frente * m.B / max(-m.v_le, 1e-9)) * afila
        k_a = np.minimum(1.0, atras * m.B / max(m.v_te, 1e-9)) * afila
        v2 = np.where(v > 0, v * k_a, v * k_f)
        medio = max(m.h_top - m.h_mid, m.h_mid - m.h_bot, 1e-9)
        k_h = np.minimum(1.0, grosor * m.B / medio) * afila
        h2 = m.h_mid + (hh - m.h_mid) * k_h
        nuevo = m.punto(u, v2, h2)
        ave.co[sel] = ave.co[sel] * (1 - mez[:, None]) + nuevo * mez[:, None]


def afinar_cola(ave, k_largo=0.42, k_ancho=0.6):
    sel = ave.v_piel & (ave.w_cola > 0.3)
    if sel.sum() < 4:
        return
    mc = MarcoCola(ave)
    d = ave.co[sel] - mc.base
    a, x, e = d @ mc.t, d @ ave.X, d @ mc.D
    mez = suave(0.3, 0.8, ave.w_cola[sel])
    a2 = np.where(a > 0, a * k_largo, a)
    nuevo = mc.base + a2[:, None] * mc.t + (x * k_ancho)[:, None] * ave.X + (e * k_ancho)[:, None] * mc.D
    ave.co[sel] = ave.co[sel] * (1 - mez[:, None]) + nuevo * mez[:, None]


class MarcoCola:
    def __init__(self, ave):
        self.ave = ave
        j = int(np.abs(ave.eje_arco - ave.arco_rab).argmin())
        self.base = ave.eje_p[j].copy()
        fin = ave.eje_p[-1]
        self.largo = float(np.linalg.norm(fin - self.base))
        self.t = _norm(fin - self.base)
        self.D = _norm(np.cross(ave.X, self.t))
        sel = ave.v_piel & (ave.w_cola > 0.5)
        self.sel = sel
        if sel.sum() > 4:
            d = ave.co[sel] - self.base
            a = d @ self.t
            x = np.abs(d @ ave.X)
            self.ancho_base = float(2 * np.percentile(x[a < 0.3 * self.largo], 90)) if (a < 0.3 * self.largo).sum() > 2 else 0.2 * self.largo
            self.ancho_fin = float(2 * np.percentile(x[a > 0.6 * self.largo], 90)) if (a > 0.6 * self.largo).sum() > 2 else self.ancho_base
            e = d @ self.D
            self.e_mid = float(np.median(e))
        else:
            self.ancho_base = self.ancho_fin = 0.2 * self.largo
            self.e_mid = 0.0


# --------------------------------------------------------------------------- colores de una pluma

def rejilla_color(F, ts, nx, base, punta=None, t_punta=0.8, borde=None, lado_borde=1, fuerza_borde=1.0,
                  sombra_base=0.72, ruido=0.05, rng=None, t_borde=0.15):
    """Devuelve (F, filas, cols, 3) con degradado raiz->punta y color de borde opcional."""
    base = np.broadcast_to(np.asarray(base, np.float64), (F, 3))
    ts = np.asarray(ts, np.float64)
    nf, nc = len(ts), nx + 1
    col = np.broadcast_to(base[:, None, None, :], (F, nf, nc, 3)).copy()
    if punta is not None:
        punta = np.broadcast_to(np.asarray(punta, np.float64), (F, 3))
        valida = ~np.isnan(punta[:, 0])
        k = suave(t_punta - 0.12, t_punta + 0.02, ts)[None, :, None, None]
        pc = np.where(valida[:, None], punta, base)[:, None, None, :]
        col = col * (1 - k) + pc * k
    if borde is not None:
        borde = np.broadcast_to(np.asarray(borde, np.float64), (F, 3))
        xi = np.linspace(-1, 1, nc)
        if lado_borde == 0:
            kx = np.abs(xi)
        else:
            kx = np.clip(xi * lado_borde, 0, 1)
        kt = suave(t_borde, t_borde + 0.25, ts)
        k = (kx[None, None, :, None] * kt[None, :, None, None]) * fuerza_borde
        col = col * (1 - k) + borde[:, None, None, :] * k
    sombra = (sombra_base + (1 - sombra_base) * suave(0.0, 0.45, ts))[None, :, None, None]
    col = col * sombra
    if rng is not None and ruido > 0:
        col = col * (1 + ruido * (rng.random((F, 1, 1, 1)) * 2 - 1))
    return col


# --------------------------------------------------------------------------- alas

def plumas_alas(ave, T, esp, rng):
    cfg = esp["ala"]
    mL = MarcoAla(ave, "L")
    escala = cfg.get("escala", 1.0)
    if cfg.get("envergadura"):
        lp0 = np.asarray(cfg["largo_prim"], np.float64)
        lp0 = np.interp(np.linspace(0, 1, cfg["n_prim"]), np.linspace(0, 1, len(lp0)), lp0)
        a0 = np.radians(np.linspace(cfg["ang_prim"][0], cfg["ang_prim"][1], cfg["n_prim"]))
        u0 = np.linspace(mL.u_W + 0.02 * mL.B, mL.B * 0.985, cfg["n_prim"])
        objetivo = cfg["envergadura"] * ave.U
        lo_e, hi_e = 0.2, 4.0
        for _ in range(40):
            mid = 0.5 * (lo_e + hi_e)
            alcance = np.max(u0 + mid * lp0 * mL.B * np.sin(a0))
            if alcance < objetivo:
                lo_e = mid
            else:
                hi_e = mid
        escala = 0.5 * (lo_e + hi_e)
    ave.escala_ala = float(escala)
    B = mL.B * escala
    g = ave.grupos
    perm = np.array([g.index(n[:-2] + ("_R" if n.endswith("_L") else "_L")) if n.endswith(("_L", "_R")) and (n[:-2] + ("_R" if n.endswith("_L") else "_L")) in g else i
                     for i, n in enumerate(g)])
    lotes = []      # cada lote: dict con los argumentos de Tarjetas.agregar para el ala izquierda

    n_p, n_s, n_t = cfg["n_prim"], cfg["n_sec"], cfg["n_ter"]
    # --- remeras: indice k = 0 en la primaria mas externa ... hacia el cuerpo
    lp = np.asarray(cfg["largo_prim"], np.float64)
    lp = np.interp(np.linspace(0, 1, n_p), np.linspace(0, 1, len(lp)), lp)          # P1 (muñeca) .. Pn (punta)
    ang_p = np.linspace(cfg["ang_prim"][0], cfg["ang_prim"][1], n_p) ** 1.0
    u_p = np.linspace(mL.u_W + 0.02 * mL.B, mL.B * 0.985, n_p)
    ls = np.full(n_s, cfg["largo_sec"])
    ang_s = np.linspace(cfg["ang_sec"][0], cfg["ang_sec"][1], n_s)                  # S1 (junto a P1) .. Sn (codo)
    u_s = np.linspace(mL.u_W - 0.03 * mL.B, mL.u_E + 0.02 * mL.B, n_s)
    lt = np.asarray(cfg["largo_ter"], np.float64)
    lt = np.interp(np.linspace(0, 1, n_t), np.linspace(0, 1, len(lt)), lt)
    ang_t = np.linspace(cfg["ang_ter"][0], cfg["ang_ter"][1], n_t)
    u_t = np.linspace(mL.u_E - 0.03 * mL.B, mL.u_E - cfg.get("tramo_ter", 0.55) * mL.u_E, n_t)

    # orden de apilado: de la punta hacia el cuerpo, cada pluma un poco mas alta
    u_all = np.concatenate([u_p[::-1], u_s, u_t])
    L_all = np.concatenate([lp[::-1], ls, lt]) * B
    ang_all = np.concatenate([ang_p[::-1], ang_s, ang_t])
    tipo = np.array(["prim"] * n_p + ["sec"] * n_s + ["ter"] * n_t, dtype=object)
    n_r = len(u_all)
    paso_h = cfg.get("paso_h", 0.0035) * mL.B
    h_r = mL.h_mid + paso_h * (np.arange(n_r) - n_r * 0.5)
    v_r = cfg.get("v_raiz", 0.04) * mL.B
    raiz = mL.punto(u_all, np.full(n_r, v_r), h_r)
    # ligera irregularidad natural en secundarias y terciarias
    no_prim = (tipo != "prim")
    ang_all = ang_all + np.where(no_prim, 2.5 * (rng.random(n_r) * 2 - 1), 0.8 * (rng.random(n_r) * 2 - 1))
    L_all = L_all * (1 + np.where(no_prim, 0.035, 0.01) * (rng.random(n_r) * 2 - 1))
    y = mL.dir(ang_all)
    x0 = np.cross(y, mL.n) * mL.diestro
    rho = math.radians(cfg.get("alabeo", 7.0))
    x = x0 * math.cos(rho) + mL.n * math.sin(rho)
    ancho = np.where(tipo == "prim", cfg["ancho_prim"], np.where(tipo == "sec", cfg["ancho_sec"], cfg["ancho_ter"])) * L_all
    ts_v = np.linspace(0, 1, 8)
    col = cfg["color"]
    celda_r = np.where(tipo == "prim", col.get("celda_prim", "prim_lisa"), np.where(tipo == "sec", col.get("celda_sec", "sec_lisa"), col.get("celda_ter", "sec_lisa")))
    base_r = np.array([hexa(col["ter"] if t == "ter" else col["remera"]) for t in tipo])
    borde_r = np.array([hexa(col.get("borde_ter", col.get("borde", col["remera"])) if t == "ter" else col.get("borde", col["remera"])) for t in tipo])
    fb = np.where(tipo == "ter", col.get("fuerza_borde_ter", 0.9), col.get("fuerza_borde", 0.7))
    C = rejilla_color(n_r, ts_v, 2, base_r, borde=borde_r, lado_borde=1, sombra_base=0.8, rng=rng, ruido=0.04)
    C = C * 1.0
    # el color de borde va en la columna distal (lamina externa)
    kfb = fb[:, None, None, None]
    C_sin = rejilla_color(n_r, ts_v, 2, base_r, sombra_base=0.8)
    C = C_sin * (1 - kfb) + C * kfb
    if col.get("punta_remera"):
        kp = suave(0.86, 0.97, ts_v)[None, :, None, None] * col.get("fuerza_punta", 0.8)
        C = C * (1 - kp) + hexa(col["punta_remera"])[None, None, None, :] * kp
    pesos = ave.pesos_cercanos(raiz + y * (0.10 * L_all[:, None]), mL.sel)
    lotes.append(dict(raiz=raiz, eje_y=y, eje_x=x, L=L_all, ancho=ancho, celda=list(celda_r), color=C, pesos=pesos,
                      curva=cfg.get("curva_remera", 0.035), comba=0.07, nx=2, ts=ts_v, espejo=True, dorsal=True, mat=1))

    def remera_en(u):
        """Direccion y largo de la remera que corresponde a la posicion u de la envergadura."""
        orden = np.argsort(u_all)
        return np.interp(u, u_all[orden], ang_all[orden]), np.interp(u, u_all[orden], L_all[orden])

    def altura_remera(u):
        orden = np.argsort(u_all)
        return np.interp(u, u_all[orden], h_r[orden])

    # --- coberteras: filas dorsales y ventrales
    def fila(n, u0, u1, v0, k_largo, k_ancho, h_raiz, h_punta, celda, color, punta=None, borde=None, dorsal=True, ts=None,
             t_punta=0.78, fuerza_borde=0.8, desfase=0.0, ang_extra=0.0, k_suave=0.0, color2=None, u_mezcla=(0.35, 0.55)):
        paso_u = (u1 - u0) / max(n - 1, 1)
        u = np.linspace(u0, u1, n) + desfase * paso_u + 0.30 * paso_u * (rng.random(n) * 2 - 1)
        ang, Lr = remera_en(u)
        k_l = np.broadcast_to(np.asarray(k_largo, np.float64), (n,))
        # sobre la mano las coberteras son mas cortas respecto a su primaria
        k_l = k_l * (1.0 - cfg.get("acorta_mano", 0.42) * suave(mL.u_W - 0.05 * mL.B, mL.u_W + 0.12 * mL.B, u))
        L = Lr * k_l * (1 + 0.12 * (rng.random(n) * 2 - 1))
        h_loc = altura_remera(u)
        sg = 1.0 if dorsal else -1.0
        holgura = cfg.get("holgura", 0.022) * B
        h_r0 = h_loc + sg * (h_raiz + holgura)
        h_r0 = np.maximum(h_r0, mL.h_top + 0.004 * mL.B) if dorsal else np.minimum(h_r0, mL.h_bot - 0.004 * mL.B)
        h_p0 = h_loc + sg * (h_punta + holgura)
        r = mL.punto(u, v0 * mL.B + 0.007 * mL.B * (rng.random(n) * 2 - 1), h_r0)
        d = mL.dir(ang + ang_extra + 7 * (rng.random(n) * 2 - 1))
        punta_p = r + d * L[:, None] + mL.n * (h_p0 - h_r0)[:, None]
        yv = _norm(punta_p - r)
        nn = mL.n if dorsal else -mL.n
        xv = np.cross(yv, nn) * mL.diestro
        xv = xv * math.cos(rho) + nn * math.sin(rho) * (1 if dorsal else -1)
        ts_c = np.array([0.0, 0.35, 0.70, 0.90, 1.0]) if ts is None else ts
        base_c = np.tile(hexa(color), (n, 1))
        if color2 is not None:
            km = suave(u_mezcla[0] * mL.B, u_mezcla[1] * mL.B, u)[:, None]
            base_c = base_c * (1 - km) + hexa(color2)[None, :] * km
        Cc = rejilla_color(n, ts_c, 2, base_c, punta=None if punta is None else hexa(punta), t_punta=t_punta,
                           borde=None if borde is None else hexa(borde), lado_borde=0, fuerza_borde=fuerza_borde,
                           sombra_base=0.7, rng=rng, ruido=0.06)
        pw = ave.pesos_cercanos(r, mL.sel)
        lotes.append(dict(raiz=r, eje_y=yv, eje_x=xv, L=L, ancho=L * k_ancho, celda=celda, color=Cc, pesos=pw,
                          curva=(0.03 if dorsal else -0.02), comba=(0.10 if dorsal else -0.06), nx=2, ts=ts_c,
                          espejo=dorsal, dorsal=dorsal, mat=1))

    d_h = cfg.get("paso_cob", 0.012) * B
    u_ini = cfg.get("u_cob_ini", 0.02) * mL.B
    for f in esp["ala"]["filas"]:
        dorsal = f.get("dorsal", True)
        signo = 1 if dorsal else -1
        h_borde = mL.h_top if dorsal else mL.h_bot
        nivel = f.get("nivel", 1)
        fila(n=f["n"], u0=f.get("u0", u_ini / mL.B) * mL.B, u1=f.get("u1", 0.97) * mL.B, v0=f["v"], k_largo=f["largo"], k_ancho=f.get("ancho", 0.55),
             h_raiz=d_h * (nivel * 0.5 + 0.6), h_punta=d_h * nivel,
             celda=f.get("celda", "cob_lisa"), color=f["color"], punta=f.get("punta"),
             borde=f.get("borde"), dorsal=dorsal, t_punta=f.get("t_punta", 0.78), fuerza_borde=f.get("fuerza_borde", 0.8),
             desfase=f.get("desfase", 0.0), ang_extra=f.get("ang", 0.0), color2=f.get("color2"), u_mezcla=f.get("u_mezcla", (0.35, 0.55)))

    # --- emitir izquierda y espejo a la derecha
    for lote in lotes:
        dorsal = lote.pop("dorsal")
        T.agregar(**lote)
        esp_m = dict(lote)
        E = np.array([-1.0, 1, 1])
        esp_m["raiz"] = lote["raiz"] * E
        esp_m["eje_y"] = lote["eje_y"] * E
        esp_m["eje_x"] = -(lote["eje_x"] * E)
        esp_m["espejo"] = not lote["espejo"]
        esp_m["pesos"] = lote["pesos"][:, perm]
        T.agregar(**esp_m)
    return mL


# --------------------------------------------------------------------------- cola

def plumas_cola(ave, T, esp, rng):
    cfg = esp["cola"]
    mc = MarcoCola(ave)
    n = cfg.get("n", 12)
    q = np.linspace(-1, 1, n)
    largo = mc.largo * cfg.get("largo", 1.0)
    perfil = np.interp(np.abs(q), [0, 1], [cfg.get("largo_centro", 1.0), cfg.get("largo_borde", 0.92)])
    L = largo * perfil
    ancho_base = max(mc.ancho_base, 0.08 * mc.largo) * cfg.get("ancho_base", 0.7)
    paso = cfg.get("paso_h", 0.006) * mc.largo
    raiz = mc.base + ave.X * (q * 0.5 * ancho_base)[:, None] + mc.D * (mc.e_mid * 0.3 - np.abs(q) * paso * n * 0.5)[:, None] + mc.t * (0.02 * largo)
    ang = np.radians(q * cfg.get("abanico", 11.0))
    y = np.cos(ang)[:, None] * mc.t + np.sin(ang)[:, None] * ave.X
    x0 = np.cross(y, mc.D)
    rho = np.radians(cfg.get("alabeo", 8.0)) * np.sign(q)
    x = x0 * np.cos(rho)[:, None] - mc.D * np.sin(rho)[:, None]
    ts = np.linspace(0, 1, 8)
    col = cfg["color"]
    C = rejilla_color(n, ts, 2, hexa(col["base"]), borde=hexa(col["borde"]) if col.get("borde") else None, lado_borde=0,
                      fuerza_borde=col.get("fuerza_borde", 0.6), sombra_base=0.8, rng=rng, ruido=0.04)
    if col.get("punta"):
        kp = suave(col.get("t_punta", 0.86), 0.98, ts)[None, :, None, None] * col.get("fuerza_punta", 0.9)
        C = C * (1 - kp) + hexa(col["punta"])[None, None, None, :] * kp
    if col.get("banda"):
        a, b = col.get("t_banda", (0.68, 0.9))
        kb = banda(ts, a, b, 0.03)[None, :, None, None]
        C = C * (1 - kb) + hexa(col["banda"])[None, None, None, :] * kb
    pesos = ave.pesos_cercanos(raiz + y * (0.25 * L[:, None]), mc.sel if mc.sel.sum() > 4 else None)
    T.agregar(raiz=raiz, eje_y=y, eje_x=x, L=L, ancho=L * cfg.get("ancho", 0.15), celda=col.get("celda", "cola_lisa"), color=C,
              pesos=pesos, curva=cfg.get("curva", 0.02), comba=0.06, nx=2, ts=ts, mat=1)
    return mc


# --------------------------------------------------------------------------- cuerpo

def plumas_cuerpo(ave, T, esp, rng):
    cfg = esp["cuerpo"]
    L0 = cfg.get("largo", 0.15) * ave.U
    P, Nn, Wp, area = ave.candidatos(cfg.get("candidatos", 45000), rng)
    g = {n: i for i, n in enumerate(ave.grupos)}

    def suma(nombres):
        cols = [g[n] for n in nombres if n in g]
        return Wp[:, cols].sum(1) if cols else np.zeros(len(P))

    w_ala = suma([b + s for b in sv_aves.ALA for s in ("_L", "_R")])
    w_pata = suma([b + s for b in sv_aves.PATA for s in ("_L", "_R")])
    c = ave.coords(P, Nn)
    ok = (w_ala < cfg.get("corte_ala", 0.5)) & (w_pata < 0.35)
    ok &= c["s"] < 1.0 + cfg.get("cob_cola", 0.25)
    ok &= c["d_ojo"] > cfg.get("margen_ojo", 1.35)
    P, Nn, Wp = P[ok], Nn[ok], Wp[ok]
    c = ave.coords(P, Nn)
    pl = esp["pinta"](ave, c)
    tam = pl.tam * (1.0 + (cfg.get("largo_cabeza", 0.45) - 1.0) * c["cab"])
    tam *= 0.55 + 0.45 * suave(1.2, 3.2, c["d_ojo"])
    tam *= 0.5 + 0.5 * suave(0.05, 0.9, ave.dist_pico(P))
    Lp = L0 * tam
    radios = cfg.get("densidad", 0.36) * Lp
    idx = sv_aves.poisson(P, radios, rng)
    P, Nn, Wp, Lp = P[idx], Nn[idx], Wp[idx], Lp[idx]
    c = {k: v[idx] for k, v in c.items()}
    F = len(P)
    color, punta, celda, lev = pl.color[idx], pl.punta[idx], pl.celda[idx], pl.lev[idx]
    f = c["flujo"]
    gam = np.radians(cfg.get("desorden", 11.0)) * (rng.random(F) * 2 - 1)
    f = _norm(_rot(f, Nn, gam))
    alfa = np.radians((cfg.get("levante", 15.0) * (1 - 0.45 * c["cab"]) + 4 * (rng.random(F) * 2 - 1)) * lev)
    Lp = Lp * (1 + 0.14 * (rng.random(F) * 2 - 1))
    from mathutils import kdtree
    piel = np.nonzero(ave.v_piel)[0]
    kd = kdtree.KDTree(len(piel))
    for k, vi in enumerate(piel):
        kd.insert(ave.co[vi], k)
    kd.balance()
    k_curva = cfg.get("curva", 0.62)
    alfa0 = alfa.copy()
    h_min = cfg.get("despegue", 0.07)
    for _ in range(3):
        y = np.cos(alfa)[:, None] * f + np.sin(alfa)[:, None] * Nn
        for frac in (1.0, 0.6):
            pt = P + y * (Lp * frac)[:, None] - Nn * (Lp * np.sin(alfa) * k_curva * frac * frac)[:, None]
            falta = np.zeros(F)
            for i in range(F):
                _co, k, _d = kd.find(pt[i])
                vi = piel[k]
                d = float((pt[i] - ave.co[vi]) @ ave.no[vi])
                falta[i] = max(0.0, h_min * frac * Lp[i] - d) / (Lp[i] * frac)
            extra = np.arcsin(np.clip(falta, 0, 0.7))
            tope = alfa0 + np.radians(cfg.get("levante_max", 13.0))
            nuevo_alfa = np.minimum(alfa + extra, tope)
            sobra = np.clip((alfa + extra) - nuevo_alfa, 0, None)
            Lp = Lp * (1.0 - 0.45 * np.clip(sobra / 0.35, 0, 1))
            alfa = nuevo_alfa
    y = np.cos(alfa)[:, None] * f + np.sin(alfa)[:, None] * Nn
    x = np.cross(f, Nn)
    ts = np.array([0.0, 0.45, 1.0])
    C = rejilla_color(F, ts, 1, color, punta=punta, t_punta=cfg.get("t_punta", 0.80), sombra_base=cfg.get("sombra", 0.86), rng=rng,
                      ruido=cfg.get("ruido", 0.05))
    curva = np.sin(alfa) * k_curva
    T.agregar(raiz=P - Nn * (0.03 * Lp[:, None]), eje_y=y, eje_x=x, L=Lp, ancho=Lp * cfg.get("ancho", 0.60), celda=list(celda), color=C,
              pesos=Wp, n_suave=Nn, k_suave=cfg.get("suavizado", 0.8), curva=curva, comba=0.0, nx=1, ts=ts, mat=0)
    return F


# --------------------------------------------------------------------------- piel, pico, ojos y patas

def vestir_base(ave, esp):
    """Colores de vertice y materiales de la malla original (piel bajo las plumas, pico, ojos y patas)."""
    me = ave.ob.data
    n = len(ave.co)
    c = ave.coords(ave.co, ave.no)
    pl = esp["pinta"](ave, c)
    col = pl.color * esp.get("piel_oscurece", 0.78)
    base = esp.get("base", {})
    # brazo del ala (lo que queda de la tabla original bajo las coberteras)
    ca_ala = esp["ala"]["color"]
    for lado in ("L", "R"):
        mA = MarcoAla(ave, lado)
        w = ave.w_ala_L if lado == "L" else ave.w_ala_R
        k = suave(0.35, 0.7, w)[:, None]
        arriba_ala = suave(-0.2, 0.2, ave.no @ mA.n)[:, None]
        c_ala = hexa(ca_ala.get("brazo_inf", "#bdb7ac"))[None, :] * (1 - arriba_ala) + hexa(ca_ala.get("brazo", "#3a2e25"))[None, :] * arriba_ala
        if ca_ala.get("brazo2"):
            u_b = mA.uvh(ave.co)[0]
            kb = suave(0.35 * mA.B, 0.55 * mA.B, u_b)[:, None]
            c_ala = c_ala * (1 - kb) + hexa(ca_ala["brazo2"])[None, :] * kb
        col = col * (1 - k) + c_ala * k
    # lo que queda de la tabla de la cola, del color de las timoneras
    k_cola = suave(0.35, 0.7, ave.w_cola)[:, None]
    col = col * (1 - k_cola) + hexa(esp["cola"]["color"]["base"])[None, :] * 0.8 * k_cola
    # pico
    if ave.v_pico.any():
        pc = hexa(base.get("pico", "#4a4744"))
        pc2 = hexa(base.get("pico_inf", base.get("pico", "#4a4744")))
        arriba = suave(-0.15, 0.15, ((ave.co - ave.C_cab) @ ave.u_cab - base.get("pico_corte", 0.0) * ave.R_cab) / max(ave.R_cab, 1e-9))
        punta_k = suave(0.5, 1.0, c["d_pico"] / max(ave.pico_largo / ave.R_cab, 1e-6))
        cp = pc2[None, :] * (1 - arriba[:, None]) + pc[None, :] * arriba[:, None]
        if base.get("pico_punta"):
            cp = cp * (1 - punta_k[:, None]) + hexa(base["pico_punta"])[None, :] * punta_k[:, None]
        if base.get("pico_cera"):
            cera_k = 1 - suave(base.get("cera_hasta", 0.30), base.get("cera_hasta", 0.30) + 0.12, ave.dist_pico_base(ave.co))
            cp = cp * (1 - cera_k[:, None]) + hexa(base["pico_cera"])[None, :] * cera_k[:, None]
        col[ave.v_pico] = cp[ave.v_pico]
    # patas
    es_pata = ave.v_patamat | ((ave.w_pata > 0.5) & ave.v_piel)
    col[es_pata] = hexa(base.get("patas", "#9c8473"))
    # ojos
    if ave.v_ojo.any():
        lado = np.sign(ave.co[:, 0])
        centro = np.stack([np.abs(ave.ojo_L[0]) * lado, np.full(n, ave.ojo_L[1]), np.full(n, ave.ojo_L[2])], 1)
        d = _norm(ave.co - centro)
        fuera = np.stack([lado, np.zeros(n), np.zeros(n)], 1)
        ang = np.degrees(np.arccos(np.clip((d * fuera).sum(1), -1, 1)))
        iris = hexa(base.get("iris", "#2b1a10"))
        pupila = hexa("#050505")
        ko = suave(base.get("pupila_ang", 34), base.get("pupila_ang", 34) + 8, ang)
        co_ojo = pupila[None, :] * (1 - ko[:, None]) + iris[None, :] * ko[:, None]
        col[ave.v_ojo] = co_ojo[ave.v_ojo]
    nl = len(me.loops)
    lv = np.empty(nl, np.int32)
    me.loops.foreach_get("vertex_index", lv)
    ca = me.color_attributes.get("Col") or me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    ca.data.foreach_set("color", np.concatenate([col[lv] * sv_aves.GANANCIA_VISOR, np.ones((nl, 1))], 1).astype(np.float32).ravel())
    me.color_attributes.active_color = ca
    for i in range(len(me.color_attributes)):
        if me.color_attributes[i].name == "Col":
            me.color_attributes.render_color_index = i

    m_piel = sv_aves.material_liso("SV_Piel", rugosidad=0.85, especular=0.18)
    m_pico = sv_aves.material_liso("SV_Pico", rugosidad=base.get("pico_rug", 0.38), barniz=0.25)
    m_ojo = sv_aves.material_liso("SV_Ojo", rugosidad=0.06, barniz=1.0)
    m_pata = sv_aves.material_liso("SV_Patas", rugosidad=0.55)
    viejos = list(me.materials)
    mi = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", mi)
    me.materials.clear()
    for m in (m_piel, m_pico, m_ojo, m_pata):
        me.materials.append(m)
    mapa = {}
    for i in range(len(viejos)):
        mapa[i] = 1 if i in ave.i_pico else 2 if i in ave.i_ojo else 3 if i in (ave.i_pata + ave.i_otro) else 0
    nuevo = np.array([mapa.get(int(k), 0) for k in mi], np.int32)
    # patas pintadas dentro del material del cuerpo: se separan por pesos
    pv = np.zeros(len(me.polygons), bool)
    for p in me.polygons:
        if nuevo[p.index] in (0, 1) and all(es_pata[v] for v in p.vertices):
            pv[p.index] = True
    nuevo[pv] = 3
    me.polygons.foreach_set("material_index", nuevo)
    me.update()


# --------------------------------------------------------------------------- animacion

def _curvas_de(accion):
    """Curvas de la accion, con la interfaz clasica o con la de capas de Blender 4.4 en adelante."""
    try:
        fcs = list(accion.fcurves)
        if fcs:
            return fcs
    except AttributeError:
        pass
    fcs = []
    for capa in getattr(accion, "layers", []):
        for tira in capa.strips:
            for bolsa in getattr(tira, "channelbags", []):
                fcs.extend(bolsa.fcurves)
    return fcs


def suavizar_aleteo(ave, k=0.30, huesos=("Elbow", "Wrist", "IndexFinger1", "IndexFinger2")):
    """Reduce el giro de codo, muñeca y dedos del ala en la animacion original.

    El aleteo original se hizo para un ala corta: cada articulacion gira unos 34 grados y la punta se enrosca
    mas de 130. Con remeras de largo real, en el punto bajo las alas se cruzaban bajo el cuerpo. Se conserva el
    batido del hombro y de la escapula y se deja una fraccion k del giro de las demas articulaciones.
    """
    from mathutils import Quaternion
    arm = ave.arm
    if not arm.animation_data or not arm.animation_data.action:
        return 0
    curvas = _curvas_de(arm.animation_data.action)
    tocadas = 0
    for lado in ("_L", "_R"):
        for h in huesos:
            ruta = 'pose.bones["{}{}"].rotation_quaternion'.format(h, lado)
            fcs = sorted([fc for fc in curvas if fc.data_path == ruta], key=lambda f: f.array_index)
            if len(fcs) != 4:
                continue
            n = min(len(fc.keyframe_points) for fc in fcs)
            for i in range(n):
                q = Quaternion([fcs[c].keyframe_points[i].co[1] for c in range(4)])
                if q.magnitude < 1e-9:
                    continue
                q.normalize()
                if q.w < 0:
                    q = -q
                q2 = Quaternion((1.0, 0.0, 0.0, 0.0)).slerp(q, k)
                for c in range(4):
                    kp = fcs[c].keyframe_points[i]
                    kp.co[1] = q2[c]
                    kp.handle_left[1] = q2[c]
                    kp.handle_right[1] = q2[c]
            for fc in fcs:
                fc.update()
            tocadas += 1
    return tocadas


# --------------------------------------------------------------------------- todo junto

def construir(nombre, esp, semilla=11):
    rng = np.random.default_rng(semilla)
    ave = sv_aves.Ave(nombre)
    if esp.get("afinar_alas", True):
        afinar_alas(ave, **esp.get("afinar_alas_kw", {}))
    if esp.get("afinar_cola", True):
        afinar_cola(ave, **esp.get("afinar_cola_kw", {}))
    ave.escribir_posiciones()
    me = ave.ob.data
    no = np.empty(len(ave.co) * 3, np.float32)
    me.vertices.foreach_get("normal", no)
    ave.no = _norm(no.reshape(-1, 3).astype(np.float64) @ np.linalg.inv(ave.M[:3, :3]))
    T = sv_aves.Tarjetas()
    cuenta = {}
    plumas_alas(ave, T, esp, rng)
    cuenta["alas"] = T.n_plumas
    plumas_cola(ave, T, esp, rng)
    cuenta["cola"] = T.n_plumas - cuenta["alas"]
    cuenta["cuerpo"] = plumas_cuerpo(ave, T, esp, rng)
    # sin capa de seda: con la luz pareja del visor de la app vela de gris los colores oscuros
    kw_c = dict(rugosidad=0.78, fuerza_normal=0.30, brillo_seda=0.0)
    kw_c.update(esp.get("material_cuerpo", {}))
    kw_v = dict(rugosidad=0.60, fuerza_normal=0.9, brillo_seda=0.0)
    kw_v.update(esp.get("material_vuelo", {}))
    m_cuerpo = sv_aves.material_plumas("SV_Plumas_Cuerpo", **kw_c)
    m_vuelo = sv_aves.material_plumas("SV_Plumas_Vuelo", **kw_v)
    ave.plumas = T.crear(ave, "plumas", [m_cuerpo, m_vuelo])
    vestir_base(ave, esp)
    cuenta["tri_plumas"] = int(sum(len(p.vertices) - 2 for p in ave.plumas.data.polygons))
    cuenta["vert_plumas"] = len(ave.plumas.data.vertices)
    cuenta["articulaciones_suavizadas"] = suavizar_aleteo(ave, esp.get("aleteo_k", 0.30))
    ave.cuenta = cuenta
    return ave
