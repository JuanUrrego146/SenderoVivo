"""Constructor de plumaje para las aves de Sendero Vivo.

Toma el .glb original (malla con piel de 44 huesos y animacion), conserva esqueleto, pesos y animacion,
y le monta encima plumas reales: remeras y coberteras en las alas, timoneras en la cola y plumas de
contorno sobre todo el cuerpo. Cada pluma es una tarjeta con la textura del atlas comun, teñida por
color de vertice segun el plumaje de la especie y pegada al esqueleto con los pesos de la malla original.
"""
import json
import math
import os

import bpy
import numpy as np

import sv_lib

ATLAS_DIR = os.path.join(sv_lib.RAIZ, "trabajo", "atlas")
# La ficha de la app (ModelView.js) muestra los modelos con exposicion 1,6. Los colores se escriben
# multiplicados por 1/1,6 para que en la app se vean con el tono con el que se pintaron.
GANANCIA_VISOR = 1.0 / 1.6

ALA = ("Shoulder", "Elbow", "Wrist", "IndexFinger1", "IndexFinger2")
PATA = ("Knee", "Ankle", "Toes", "ToesEnd")
COLA = ("Tail2_M", "Tail3_M", "Tail3End_M", "Tail3ASide_L", "Tail3Side_L", "Tail3SideEnd_L",
        "Tail3ASide_R", "Tail3Side_R", "Tail3SideEnd_R")
CABEZA = ("Head_M", "HeadEnd_M", "Eye_L", "Eye_R", "EyeEnd_L", "EyeEnd_R", "Jaw_M", "JawEnd_M")


# --------------------------------------------------------------------------- utilidades

def _norm(a):
    return a / np.maximum(np.linalg.norm(a, axis=-1, keepdims=True), 1e-12)


def srgb_a_lineal(c):
    c = np.asarray(c, np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexa(h):
    """'#RRGGBB' (sRGB) -> rgb lineal."""
    h = h.lstrip("#")
    return srgb_a_lineal([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def suave(a, b, x):
    t = np.clip((np.asarray(x, np.float64) - a) / (b - a + 1e-12), 0, 1)
    return t * t * (3 - 2 * t)


def banda(x, a, b, s):
    """1 dentro de [a, b], con borde suave de ancho s."""
    return suave(a - s, a + s, x) * (1 - suave(b - s, b + s, x))


def catmull(pts, n_por_tramo=24):
    pts = np.asarray(pts, np.float64)
    P = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n_por_tramo, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return np.array(out)


def poisson(P, radios, rng):
    """Filtro de disco de Poisson con radio variable. Devuelve indices aceptados."""
    celda = float(np.median(radios))
    claves = np.floor(P / celda).astype(np.int64)
    rejilla = {}
    aceptados = []
    for i in rng.permutation(len(P)):
        r = radios[i]
        k = claves[i]
        alcance = int(math.ceil(r / celda))
        p = P[i]
        ok = True
        for dx in range(-alcance, alcance + 1):
            for dy in range(-alcance, alcance + 1):
                for dz in range(-alcance, alcance + 1):
                    lst = rejilla.get((k[0] + dx, k[1] + dy, k[2] + dz))
                    if not lst:
                        continue
                    for j in lst:
                        q = P[j]
                        if (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < r * r:
                            ok = False
                            break
                    if not ok:
                        break
                if not ok:
                    break
            if not ok:
                break
        if ok:
            rejilla.setdefault((k[0], k[1], k[2]), []).append(i)
            aceptados.append(i)
    return np.array(aceptados, dtype=np.int64)


# --------------------------------------------------------------------------- acumulador de tarjetas

class Tarjetas:
    """Acumula plumas (tarjetas) en mundo y luego crea una malla con piel."""

    def __init__(self):
        with open(os.path.join(ATLAS_DIR, "plumas_celdas.json"), encoding="utf-8") as fh:
            d = json.load(fh)
        self.tam = d["tam"]
        self.celdas = d["celdas"]
        self.V, self.N, self.UV, self.C, self.F, self.PW, self.NV, self.MI = [], [], [], [], [], [], [], []
        self.total_v = 0
        self.n_plumas = 0

    def agregar(self, raiz, eje_y, eje_x, L, ancho, celda, color, pesos, n_suave=None, k_suave=0.0,
                curva=0.0, comba=0.10, nx=2, ts=None, espejo=None, torsion=0.0, mat=0):
        """Agrega F plumas.

        raiz, eje_y, eje_x: (F,3). eje_y a lo largo de la pluma, eje_x a lo ancho; normal = x × y.
        L, ancho, curva, comba: (F,) o escalar. celda: lista de nombres (F) o un nombre.
        color: (F,3) o (F, filas, cols, 3) lineal. pesos: (F, n_huesos).
        """
        raiz = np.atleast_2d(np.asarray(raiz, np.float64))
        F = len(raiz)
        if F == 0:
            return
        y = _norm(np.atleast_2d(eje_y))
        x = np.atleast_2d(eje_x)
        x = _norm(x - (x * y).sum(-1, keepdims=True) * y)
        z = np.cross(x, y)
        L = np.broadcast_to(np.asarray(L, np.float64), (F,))
        ancho = np.broadcast_to(np.asarray(ancho, np.float64), (F,))
        curva = np.broadcast_to(np.asarray(curva, np.float64), (F,))
        comba = np.broadcast_to(np.asarray(comba, np.float64), (F,))
        torsion = np.broadcast_to(np.asarray(torsion, np.float64), (F,))
        ts = np.linspace(0, 1, 4) if ts is None else np.asarray(ts, np.float64)
        xis = np.linspace(-0.5, 0.5, nx + 1)
        nf, nc = len(ts), len(xis)
        T = ts[None, :, None, None]
        XI = xis[None, None, :, None]
        Lb, Wb = L[:, None, None, None], ancho[:, None, None, None]
        cb, mb = curva[:, None, None, None], comba[:, None, None, None]
        tw = torsion[:, None, None, None]
        y4, x4, z4 = y[:, None, None, :], x[:, None, None, :], z[:, None, None, :]
        # la torsion gira la lamina alrededor del raquis conforme avanza hacia la punta
        ang = tw * T
        xr = x4 * np.cos(ang) + z4 * np.sin(ang)
        zr = z4 * np.cos(ang) - x4 * np.sin(ang)
        P = raiz[:, None, None, :] + y4 * (Lb * T) + xr * (Wb * XI) - zr * (Lb * cb * T * T + Wb * mb * (2 * XI) ** 2)
        Ng = _norm(zr + y4 * (2 * cb * T) + xr * (8 * mb * XI))
        if n_suave is not None and k_suave > 0:
            Ng = _norm((1 - k_suave) * Ng + k_suave * np.asarray(n_suave)[:, None, None, :])
        if isinstance(celda, str):
            celda = [celda] * F
        rect = np.array([[self.celdas[c]["x"], self.celdas[c]["y"], self.celdas[c]["w"], self.celdas[c]["h"]] for c in celda], np.float64)
        u_loc = np.broadcast_to(XI[..., 0] + 0.5, (F, nf, nc)).copy()
        if espejo is not None:
            esp = np.broadcast_to(np.asarray(espejo, bool), (F,))
            u_loc[esp] = 1.0 - u_loc[esp]
        U = (rect[:, 0, None, None] + u_loc * rect[:, 2, None, None]) / self.tam
        Vv = 1.0 - (rect[:, 1, None, None] + (1.0 - np.broadcast_to(T[..., 0], (F, nf, nc))) * rect[:, 3, None, None]) / self.tam
        color = np.asarray(color, np.float64)
        if color.ndim == 2:
            color = np.broadcast_to(color[:, None, None, :], (F, nf, nc, 3))
        base = self.total_v + np.arange(F)[:, None, None] * (nf * nc)
        jj, ii = np.meshgrid(np.arange(nf - 1), np.arange(nc - 1), indexing="ij")
        a = jj * nc + ii
        quad = np.stack([a, a + 1, a + nc + 1, a + nc], -1).reshape(1, -1, 4)
        caras = (base.reshape(F, 1, 1) + quad).reshape(-1, 4)
        self.V.append(P.reshape(-1, 3))
        self.N.append(Ng.reshape(-1, 3))
        self.UV.append(np.stack([U, Vv], -1).reshape(-1, 2))
        self.C.append(color.reshape(-1, 3))
        self.F.append(caras)
        self.PW.append(np.asarray(pesos, np.float32))
        self.NV.append(np.full(F, nf * nc, np.int64))
        self.MI.append(np.full(len(caras), mat, np.int32))
        self.total_v += F * nf * nc
        self.n_plumas += F

    def crear(self, ave, nombre="plumas", materiales=None):
        V = np.vstack(self.V)
        N = np.vstack(self.N)
        UV = np.vstack(self.UV)
        C = np.vstack(self.C)
        Fc = np.vstack(self.F)
        Minv = ave.Minv
        Vl = V @ Minv[:3, :3].T + Minv[:3, 3]
        Nl = _norm(N @ ave.M[:3, :3])
        me = bpy.data.meshes.new(nombre)
        me.from_pydata(Vl.tolist(), [], Fc.tolist())
        me.update()
        nl = len(me.loops)
        lv = np.empty(nl, np.int32)
        me.loops.foreach_get("vertex_index", lv)
        uvl = me.uv_layers.new(name="UVMap")
        uvl.data.foreach_set("uv", UV[lv].astype(np.float32).ravel())
        ca = me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
        rgba = np.concatenate([C[lv] * GANANCIA_VISOR, np.ones((nl, 1))], 1).astype(np.float32)
        ca.data.foreach_set("color", rgba.ravel())
        me.color_attributes.active_color = ca
        me.color_attributes.render_color_index = 0
        for p in me.polygons:
            p.use_smooth = True
        me.normals_split_custom_set_from_vertices(Nl.tolist())
        ob = bpy.data.objects.new(nombre, me)
        for col in ave.ob.users_collection:
            col.objects.link(ob)
        ob.parent = ave.ob.parent
        ob.parent_type = ave.ob.parent_type
        ob.matrix_parent_inverse = ave.ob.matrix_parent_inverse.copy()
        ob.matrix_basis = ave.ob.matrix_basis.copy()
        grupos = [ob.vertex_groups.new(name=g) for g in ave.grupos]
        inicio = 0
        for PW, NV in zip(self.PW, self.NV):
            orden = np.argsort(-PW, axis=1)[:, :4]
            for f in range(len(PW)):
                idx = list(range(inicio, inicio + int(NV[f])))
                w = PW[f, orden[f]]
                w = w / max(w.sum(), 1e-9)
                for b, wb in zip(orden[f], w):
                    if wb > 0.01:
                        grupos[int(b)].add(idx, float(wb), 'REPLACE')
                inicio += int(NV[f])
        for g in list(ob.vertex_groups):
            pass
        mod = ob.modifiers.new("Armature", 'ARMATURE')
        mod.object = ave.arm
        for m in (materiales or []):
            me.materials.append(m)
        if materiales:
            me.polygons.foreach_set("material_index", np.concatenate(self.MI))
            me.update()
        return ob


# --------------------------------------------------------------------------- materiales

def _imagen(ruta, no_color=False):
    nombre = os.path.basename(ruta)
    img = bpy.data.images.get(nombre)
    if img is None:
        img = bpy.data.images.load(ruta)
    if no_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def material_plumas(nombre="SV_Plumas", corte=0.42, rugosidad=0.62, fuerza_normal=1.0, brillo_seda=0.25, metalico=0.0, especular=0.18):
    mat = bpy.data.materials.get(nombre)
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = _imagen(os.path.join(ATLAS_DIR, "plumas_color.png"))
    tex.location = (-760, 300)
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    vc.location = (-760, 0)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1.0
    mix.location = (-420, 220)
    nt.links.new(tex.outputs["Color"], mix.inputs[6])
    nt.links.new(vc.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    mayor = nt.nodes.new("ShaderNodeMath")
    mayor.operation = 'GREATER_THAN'
    mayor.inputs[1].default_value = corte
    mayor.location = (-420, -40)
    nt.links.new(tex.outputs["Alpha"], mayor.inputs[0])
    nt.links.new(mayor.outputs[0], bsdf.inputs["Alpha"])
    ntex = nt.nodes.new("ShaderNodeTexImage")
    ntex.image = _imagen(os.path.join(ATLAS_DIR, "plumas_normal.png"), no_color=True)
    ntex.location = (-760, -320)
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = fuerza_normal
    nmap.location = (-420, -320)
    nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = rugosidad
    bsdf.inputs["Metallic"].default_value = metalico
    try:
        # reflejo especular bajo: con la luz pareja del visor el reflejo vela de gris los plumajes oscuros
        bsdf.inputs["Specular IOR Level"].default_value = especular
    except KeyError:
        pass
    try:
        bsdf.inputs["Sheen Weight"].default_value = brillo_seda
        bsdf.inputs["Sheen Roughness"].default_value = 0.45
    except KeyError:
        pass
    mat.use_backface_culling = False
    try:
        mat.surface_render_method = 'DITHERED'
    except Exception:
        pass
    return mat


def material_liso(nombre, rugosidad=0.8, color_vertice=True, color=(0.5, 0.5, 0.5), barniz=0.0, especular=0.5):
    mat = bpy.data.materials.get(nombre)
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    if color_vertice:
        vc = nt.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        vc.location = (-420, 200)
        nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rugosidad
    bsdf.inputs["Metallic"].default_value = 0.0
    try:
        bsdf.inputs["Coat Weight"].default_value = barniz
        bsdf.inputs["Coat Roughness"].default_value = 0.06
        bsdf.inputs["Specular IOR Level"].default_value = especular
    except KeyError:
        pass
    return mat


# --------------------------------------------------------------------------- el ave

class Ave:
    def __init__(self, nombre, ruta=None):
        self.nombre = nombre
        ruta = ruta or os.path.join(sv_lib.RAIZ, "originales", "aves", nombre + ".glb")
        sv_lib.limpiar()
        objs = sv_lib.importar_glb(ruta)
        self.arm = next(o for o in objs if o.type == 'ARMATURE')
        self.arm.data.pose_position = 'REST'
        bpy.context.view_layer.update()
        mallas = [o for o in objs if o.type == 'MESH']
        self.ob = max((o for o in mallas if len(o.vertex_groups) > 0), key=lambda o: len(o.data.vertices))
        self.extras = [o for o in mallas if o is not self.ob]
        self._leer_malla()
        self._huesos()
        self._regiones()
        self._eje()

    # ----- lectura
    def _leer_malla(self):
        me = self.ob.data
        n = len(me.vertices)
        co = np.empty(n * 3, np.float32)
        me.vertices.foreach_get("co", co)
        no = np.empty(n * 3, np.float32)
        me.vertices.foreach_get("normal", no)
        self.M = np.array(self.ob.matrix_world, dtype=np.float64)
        self.Minv = np.linalg.inv(self.M)
        R = self.M[:3, :3]
        self.co = co.reshape(n, 3).astype(np.float64) @ R.T + self.M[:3, 3]
        self.no = _norm(no.reshape(n, 3).astype(np.float64) @ np.linalg.inv(R))
        self.grupos = [g.name for g in self.ob.vertex_groups]
        W = np.zeros((n, len(self.grupos)), np.float32)
        for v in me.vertices:
            for g in v.groups:
                W[v.index, g.group] = g.weight
        W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
        self.W = W
        me.calc_loop_triangles()
        nt = len(me.loop_triangles)
        tv = np.empty(nt * 3, np.int32)
        me.loop_triangles.foreach_get("vertices", tv)
        tm = np.empty(nt, np.int32)
        me.loop_triangles.foreach_get("material_index", tm)
        self.tri = tv.reshape(nt, 3)
        self.tri_mat = tm
        self.mats = [(m.name if m else "") for m in me.materials]

    def _huesos(self):
        Ma = self.arm.matrix_world
        self.h = {b.name: np.array(Ma @ b.head_local, dtype=np.float64) for b in self.arm.data.bones}
        self.ht = {b.name: np.array(Ma @ b.tail_local, dtype=np.float64) for b in self.arm.data.bones}

    def peso(self, nombres):
        g = {n: i for i, n in enumerate(self.grupos)}
        cols = [g[n] for n in nombres if n in g]
        if not cols:
            return np.zeros(len(self.co), np.float32)
        return self.W[:, cols].sum(1)

    def _regiones(self):
        n = len(self.co)
        self.w_ala_L = self.peso([b + "_L" for b in ALA])
        self.w_ala_R = self.peso([b + "_R" for b in ALA])
        self.w_ala = self.w_ala_L + self.w_ala_R
        self.w_pata = self.peso([b + s for b in PATA for s in ("_L", "_R")])
        self.w_cola = self.peso(COLA)
        self.w_cab = self.peso(CABEZA)
        vm = np.full(n, -1, np.int64)
        vm[self.tri.ravel()] = np.repeat(self.tri_mat, 3)
        self.vmat = vm
        nombres = [m.lower() for m in self.mats]
        self.i_pico = [i for i, m in enumerate(nombres) if "pico" in m]
        self.i_ojo = [i for i, m in enumerate(nombres) if "ojo" in m]
        self.i_pata = [i for i, m in enumerate(nombres) if "pata" in m]
        self.i_otro = [i for i, m in enumerate(nombres) if "madero" in m]
        # hay modelos donde el material del pico tambien cubre las patas: se separan por pesos
        w_pata_total = self.peso([b + s for b in ("Hip",) + PATA for s in ("_L", "_R")])
        mat_pico = np.isin(vm, self.i_pico)
        self.v_pico = mat_pico & (w_pata_total < 0.5)
        self.v_ojo = np.isin(vm, self.i_ojo)
        self.v_patamat = np.isin(vm, self.i_pata + self.i_otro) | (mat_pico & (w_pata_total >= 0.5))
        self.v_piel = ~(self.v_pico | self.v_ojo | self.v_patamat)
        self.dom = np.array(self.grupos, dtype=object)[self.W.argmax(1)]

    # ----- eje del cuerpo y sistemas de coordenadas
    def _eje(self):
        co = self.co
        X = np.array([1.0, 0, 0])
        tronco = self.v_piel & (self.w_ala < 0.3) & (self.w_pata < 0.3)

        def centro(nombres, minimo=6):
            sel = tronco & np.isin(self.dom, nombres)
            if sel.sum() < minimo:
                return None
            c = co[sel].mean(0)
            c[0] = 0.0
            return c

        cab = centro(list(CABEZA)) if centro(list(CABEZA)) is not None else self.h["Head_M"].copy()
        cab[0] = 0.0
        self.C_cab = cab
        sel_cab = tronco & np.isin(self.dom, list(CABEZA))
        self.R_cab = float(np.median(np.linalg.norm(co[sel_cab] - cab, axis=1))) if sel_cab.sum() > 5 else 0.004
        pico = co[self.v_pico]
        if len(pico):
            punta = pico[np.argmax(np.linalg.norm(pico - cab, axis=1))].copy()
        else:
            punta = self.h.get("JawEnd_M", cab + np.array([0, -1e-3, 0])).copy()
        punta[0] = 0.0
        self.pico_punta = punta
        self.f_cab = _norm(punta - cab)
        self.u_cab = _norm(np.cross(self.f_cab, X))
        if len(pico):
            dist = (pico - cab) @ self.f_cab
            self.pico_base = float(np.percentile(dist, 8))
            self.pico_largo = float(dist.max() - self.pico_base)
        else:
            self.pico_base, self.pico_largo = self.R_cab, self.R_cab

        # eje medial: cortes perpendiculares a la recta cabeza -> punta de la cola
        sel_cola = self.v_piel & (self.w_cola > 0.5)
        if sel_cola.sum() > 4:
            pc = co[sel_cola]
            fin_cola = pc[np.argmax(np.linalg.norm(pc - cab, axis=1))].copy()
        else:
            fin_cola = self.ht.get("Tail3End_M", self.h["Tail3_M"]).copy()
        fin_cola[0] = 0.0
        d0 = _norm(fin_cola - cab)
        L0 = float(np.linalg.norm(fin_cola - cab))
        D0 = _norm(np.cross(X, d0))
        tt = ((co - cab) @ d0) / L0
        hh = (co - cab) @ D0
        nodos = [("pico", punta), ("cabeza", cab)]
        K = 10
        for k in range(1, K):
            tc = k / K
            sel = tronco & (np.abs(tt - tc) < 0.6 / K)
            if sel.sum() < 6:
                continue
            hc = 0.5 * (np.percentile(hh[sel], 3) + np.percentile(hh[sel], 97))
            nodos.append(("n%d" % k, cab + d0 * (tc * L0) + D0 * hc))
        nodos.append(("cola_fin", fin_cola))
        self.nodos = nodos
        pts = np.array([q for _, q in nodos])
        curva = catmull(pts, 24)
        seg = np.linalg.norm(np.diff(curva, axis=0), axis=1)
        arco = np.concatenate([[0], np.cumsum(seg)])
        tang = _norm(np.gradient(curva, axis=0))
        self.eje_p, self.eje_t, self.eje_arco = curva, tang, arco

        def arco_en(q):
            j = int(((curva - q) ** 2).sum(1).argmin())
            return float(arco[j] + (q - curva[j]) @ tang[j])

        self.arco_cab = arco_en(cab)
        if sel_cola.sum() > 4:
            t_c = tt[sel_cola]
            base = co[sel_cola][t_c <= np.percentile(t_c, 12)].mean(0)
            base[0] = 0.0
            self.arco_rab = arco_en(base)
        else:
            self.arco_rab = arco_en(self.h["Tail2_M"] * np.array([0, 1, 1]))
        self.arco_fin = float(arco[-1])
        self.U = float(self.arco_rab - self.arco_cab)          # unidad corporal: cabeza -> base de la cola
        self.s_fin = (self.arco_fin - self.arco_cab) / self.U
        self.X = X
        ojoL = co[self.v_ojo & (co[:, 0] > 0)]
        self.ojo_L = ojoL.mean(0) if len(ojoL) else cab + self.u_cab * 0.2 * self.R_cab + X * 0.8 * self.R_cab
        self.ojo_r = float(np.linalg.norm(ojoL - self.ojo_L, axis=1).max()) if len(ojoL) else 0.15 * self.R_cab
        co_ojo = self.coords(self.ojo_L[None, :])
        self.phi_ojo = float(co_ojo["phi"][0])
        self.lam_ojo = float(co_ojo["lam"][0])

    def coords(self, P, Nn=None):
        """Coordenadas de plumaje para puntos P (n,3)."""
        P = np.asarray(P, np.float64)
        ejes = self.eje_p[::2]
        j = np.empty(len(P), np.int64)
        for i0 in range(0, len(P), 8192):
            d2 = ((P[i0:i0 + 8192, None, :] - ejes[None, :, :]) ** 2).sum(-1)
            j[i0:i0 + 8192] = d2.argmin(1) * 2
        ap, at = self.eje_p[j], self.eje_t[j]
        s = (self.eje_arco[j] + ((P - ap) * at).sum(-1) - self.arco_cab) / self.U
        D = _norm(np.cross(self.X[None, :], at))
        r = P - ap
        r = r - (r * at).sum(-1, keepdims=True) * at
        rn = _norm(r)
        theta = np.degrees(np.arctan2(np.abs(rn @ self.X), (rn * D).sum(-1)))   # 0 dorsal, 180 ventral
        dc = P - self.C_cab
        dist_c = np.linalg.norm(dc, axis=1)
        dn = dc / np.maximum(dist_c[:, None], 1e-12)
        lam = np.degrees(np.arccos(np.clip(dn @ self.f_cab, -1, 1)))               # 0 hacia el pico, 180 nuca
        phi = np.degrees(np.arctan2(np.abs(dn @ self.X), dn @ self.u_cab))         # 0 coronilla, 180 garganta
        cab = 1.0 - suave(1.15 * self.R_cab, 1.75 * self.R_cab, dist_c)
        ojo = np.linalg.norm(np.stack([np.abs(P[:, 0]), P[:, 1], P[:, 2]], 1) - self.ojo_L, axis=1)
        out = {"P": P, "s": s, "theta": theta, "lam": lam, "phi": phi, "cab": cab, "dist_cab": dist_c / self.R_cab,
               "eje_t": at, "dorsal": D, "x": P[:, 0] / self.U, "d_ojo": ojo / max(self.ojo_r, 1e-9),
               "d_pico": (dc @ self.f_cab - self.pico_base) / max(self.R_cab, 1e-9), "radio": np.linalg.norm(r, axis=1) / self.U}
        if Nn is not None:
            flujo = at - (at * Nn).sum(-1, keepdims=True) * Nn
            malo = np.linalg.norm(flujo, axis=1) < 0.25
            alt = D - (D * Nn).sum(-1, keepdims=True) * Nn
            flujo[malo] = alt[malo]
            out["flujo"] = _norm(flujo)
        return out

    def dist_pico(self, P):
        """Distancia de cada punto al pico, en radios de cabeza."""
        pico = self.co[self.v_pico]
        if len(pico) == 0:
            return np.full(len(P), 9.0)
        out = np.empty(len(P))
        for i in range(0, len(P), 4096):
            d2 = ((np.asarray(P)[i:i + 4096, None, :] - pico[None, :, :]) ** 2).sum(-1)
            out[i:i + 4096] = np.sqrt(d2.min(1))
        return out / max(self.R_cab, 1e-9)

    def dist_pico_base(self, P):
        """Avance de cada punto a lo largo del pico: 0 en la base, 1 en la punta."""
        d = (np.asarray(P) - self.C_cab) @ self.f_cab
        return np.clip((d - self.pico_base) / max(self.pico_largo, 1e-9), 0, 1)

    # ----- muestreo de la superficie
    def candidatos(self, n, rng, excluir_mat=None):
        excl = set(self.i_pico + self.i_ojo + self.i_pata + self.i_otro) | set(excluir_mat or [])
        ok = ~np.isin(self.tri_mat, list(excl))
        tri = self.tri[ok]
        a, b, c = self.co[tri[:, 0]], self.co[tri[:, 1]], self.co[tri[:, 2]]
        area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
        idx = rng.choice(len(tri), size=n, p=area / area.sum())
        r1, r2 = rng.random(n), rng.random(n)
        s1 = np.sqrt(r1)
        b0, b1, b2 = (1 - s1)[:, None], (s1 * (1 - r2))[:, None], (s1 * r2)[:, None]
        t = tri[idx]
        P = b0 * self.co[t[:, 0]] + b1 * self.co[t[:, 1]] + b2 * self.co[t[:, 2]]
        Nn = _norm(b0 * self.no[t[:, 0]] + b1 * self.no[t[:, 1]] + b2 * self.no[t[:, 2]])
        Wp = b0 * self.W[t[:, 0]] + b1 * self.W[t[:, 1]] + b2 * self.W[t[:, 2]]
        return P, Nn, Wp, float(area.sum())

    def pesos_cercanos(self, P, mascara=None):
        """Pesos del vertice original mas cercano a cada punto (opcionalmente dentro de una mascara)."""
        idx = np.arange(len(self.co)) if mascara is None else np.nonzero(mascara)[0]
        base = self.co[idx]
        out = np.empty((len(P), self.W.shape[1]), np.float32)
        for i in range(0, len(P), 512):
            d2 = ((np.asarray(P)[i:i + 512, None, :] - base[None, :, :]) ** 2).sum(-1)
            out[i:i + 512] = self.W[idx[d2.argmin(1)]]
        return out

    def escribir_posiciones(self):
        me = self.ob.data
        loc = self.co @ self.Minv[:3, :3].T + self.Minv[:3, 3]
        me.vertices.foreach_set("co", loc.astype(np.float32).ravel())
        me.update()
