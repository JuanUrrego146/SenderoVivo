"""Genera el atlas de plumas (color en gris + alfa, y mapa de normales) que comparten todas las aves.

El gris multiplica el color por vertice de cada pluma; por eso el atlas es neutro y solo lleva
forma (alfa), barbas, raquis y los patrones oscuros (estria central, barras, borde, punta).

Uso: python -I generar_atlas_plumas.py carpeta_salida [tam=1024]
Escribe plumas_color.png (RGBA), plumas_normal.png (RGB) y plumas_celdas.json (rectangulos por celda).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SS = 3  # supermuestreo


def ruido1d(n, rng, suav=0.0):
    r = rng.random(n)
    if suav > 0:
        r = ndi.gaussian_filter1d(r, suav, mode="wrap")
        r = (r - r.min()) / max(r.max() - r.min(), 1e-9)
    return r


def pluma(w, h, rng, tipo="contorno", patron="liso", asim=0.0, punta=2.0, y_max=0.55, calamo=0.07,
          paso_barba=2.6, pendiente=1.05, fleco=0.10, cortes=2, plumon=0.30, ancho=0.90, subida=0.55,
          fuerza_patron=0.75, n_barras=4, ancho_estria=0.34, ciclo=0.40, banda=0.0, k_raquis=0.22, k_barba=0.07, alt_raquis=1.3, alt_barba=0.22, k_borde=0.06):
    """Devuelve gris, alfa y altura (float32, tamano h*SS x w*SS). Raiz abajo, punta arriba."""
    W, H = w * SS, h * SS
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    px = (xs + 0.5) / SS            # pixeles finales
    py = (H - ys - 0.5) / SS        # 0 abajo (raiz), h arriba (punta)
    Y = py / h
    mitad = w / 2.0
    xr = mitad + asim * mitad * ancho          # posicion del raquis
    lado = np.sign(px - xr)
    d = np.abs(px - xr)                       # distancia horizontal al raquis en pixeles
    wmax = np.where(lado < 0, xr - mitad * (1 - ancho), mitad * (1 + ancho) - xr)  # semiancho de cada lado

    y_c, y_t = calamo, 0.985
    t_sub = np.clip((Y - y_c) / max(y_max - y_c, 1e-4), 0, 1)
    sube = 1.0 - (1.0 - t_sub) ** (1.0 / max(subida, 1e-3))
    u = np.clip((Y - y_max) / (y_t - y_max), 0, 1)
    baja = np.clip(1.0 - u ** punta, 0, 1) ** (1.0 / punta)
    perfil = np.where(Y < y_max, sube, baja)
    perfil = np.where((Y < y_c) | (Y > y_t), 0.0, perfil)
    semi = wmax * perfil                       # semiancho de la lamina a esta altura

    # coordenada de barba: cada barba sale del raquis hacia afuera y hacia la punta
    tb = py - pendiente * (d + 0.10 * d * d / np.maximum(wmax, 1.0))
    idx = np.floor(tb / paso_barba).astype(np.int64)
    n_idx = int(h / paso_barba * 3) + 64
    desfase = n_idx // 2
    r_largo = ruido1d(n_idx, rng)[np.clip(idx + desfase, 0, n_idx - 1)]
    r_brillo = ruido1d(n_idx, rng, 0.6)[np.clip(idx + desfase, 0, n_idx - 1)]
    r_lado = ruido1d(n_idx, rng)[np.clip(idx + desfase + (lado > 0) * 7, 0, n_idx - 1)]
    fase = (tb / paso_barba) % 1.0

    # borde deshilachado: cada barba llega un poco mas o menos lejos
    semi_b = semi * (1.0 - fleco * r_largo * (0.35 + 0.65 * np.clip(d / np.maximum(wmax, 1), 0, 1)))
    dentro = d < semi_b
    alfa = dentro.astype(np.float32)

    # plumon de la base: barbas sueltas
    if plumon > 0:
        zona = np.clip((plumon - Y) / max(plumon - y_c, 1e-4), 0, 1)
        suelta = (fase > zona * (0.25 + 0.5 * r_lado)) | (d < 1.2)
        ralo = r_lado > zona * 0.75
        alfa = np.where(zona > 0, alfa * suelta * (ralo | (d < semi * 0.55)), alfa)

    # cortes entre barbas (muescas en cuna)
    if cortes > 0:
        for _ in range(cortes):
            y_corte = rng.uniform(max(plumon, 0.3) + 0.05, 0.88)
            lado_c = rng.choice([-1.0, 1.0])
            t_c = y_corte * h - pendiente * wmax.mean() * 0.5
            prof = rng.uniform(0.35, 0.7)
            ancho_c = rng.uniform(0.5, 1.3)
            fr = np.clip((d / np.maximum(semi, 1e-3) - (1 - prof)) / prof, 0, 1)
            muesca = (np.abs(tb - t_c) < ancho_c * fr) & (lado == lado_c)
            alfa = np.where(muesca, 0.0, alfa)

    # raquis
    grosor = np.clip(1.25 * (1.0 - Y) ** 0.8 + 0.25, 0.25, 1.6)
    raquis = np.clip(1.0 - d / grosor, 0, 1) * (Y > 0.0) * (Y < y_t)
    alfa = np.maximum(alfa, (d < grosor * 0.9) & (Y > 0.005) & (Y < y_t - 0.02))

    # gris base: barbas, sombreado hacia la base y hacia los bordes
    surco = 0.5 + 0.5 * np.cos(2 * np.pi * fase)
    gris = (1.0 - k_barba) + k_barba * surco
    gris *= 0.90 + 0.10 * r_brillo
    gris *= 0.80 + 0.20 * np.clip((Y - y_c) / 0.45, 0, 1)
    rel = np.clip(d / np.maximum(semi, 1e-3), 0, 1)
    gris *= 1.0 - k_borde * rel ** 2.4
    gris = gris * (1.0 - k_raquis * raquis) + 0.0

    # patrones oscuros
    k = fuerza_patron
    if patron == "estria":
        sig = ancho_estria * (0.35 + 0.65 * np.clip((Y - y_c) / 0.6, 0, 1))
        m = np.exp(-(rel / np.maximum(sig, 1e-3)) ** 2.2)
        m *= np.clip((Y - 0.12) / 0.2, 0, 1) * np.clip((0.97 - Y) / 0.06, 0, 1)
        gris *= 1.0 - k * m
    elif patron == "borde":
        dist_punta = np.clip((y_t - Y) / 0.16, 0, 1)
        borde = np.minimum(1.0 - rel, dist_punta)
        m = np.clip((borde - 0.14) / 0.14, 0, 1)
        gris *= 1.0 - k * m
    elif patron == "barras":
        tbar = (py - 0.45 * d) / h
        f = (tbar * n_barras + 0.25) % 1.0
        m = np.clip((ciclo / 2 - np.abs(f - 0.5)) / 0.05, 0, 1)
        if banda > 0:
            mb = np.clip((Y - (0.93 - banda)) / 0.03, 0, 1) * np.clip((0.945 - Y) / 0.02, 0, 1)
            m = np.maximum(m * (Y < 0.93 - banda), mb)
        gris *= 1.0 - k * m
    elif patron == "punta":
        m = np.clip((Y - 0.70) / 0.06, 0, 1) * np.clip((0.955 - Y) / 0.035, 0, 1)
        gris *= 1.0 - k * m
    elif patron == "gota":
        cy = 0.74
        rr = np.sqrt((rel / 0.62) ** 2 + ((Y - cy) / 0.17) ** 2)
        m = np.clip((1.0 - rr) / 0.25, 0, 1)
        gris *= 1.0 - k * m

    # altura para el mapa de normales
    alt = 0.9 * (1.0 - rel ** 2) * np.clip(semi / np.maximum(wmax, 1), 0, 1)   # combadura de la lamina
    alt += alt_barba * surco * (1 - raquis)                                          # barbas
    alt += alt_raquis * raquis                                                         # raquis en relieve
    alt *= alfa
    return gris.astype(np.float32), alfa.astype(np.float32), alt.astype(np.float32)


def reducir(a):
    H, W = a.shape
    return a.reshape(H // SS, SS, W // SS, SS).mean(axis=(1, 3))


def construir(tam=1024):
    esc = tam / 1024.0
    rng = np.random.default_rng(7)
    color = np.full((tam, tam), 0.80, np.float32)
    alfa = np.zeros((tam, tam), np.float32)
    altura = np.zeros((tam, tam), np.float32)
    celdas = {}
    cw, ch1, ch2 = int(128 * esc), int(256 * esc), int(512 * esc)
    margen = max(2, int(3 * esc))

    def poner(nombre, col, fila_y, alto, **kw):
        w, h = cw - 2 * margen, alto - 2 * margen
        g, a, z = pluma(w, h, rng, **kw)
        g, a, z = reducir(g), reducir(a), reducir(z)
        x0, y0 = col * cw + margen, fila_y + margen
        color[y0:y0 + h, x0:x0 + w] = np.where(a > 0.02, g, 0.80)
        alfa[y0:y0 + h, x0:x0 + w] = a
        altura[y0:y0 + h, x0:x0 + w] = z
        celdas[nombre] = {"x": x0, "y": y0, "w": w, "h": h}

    pb = 2.3 * esc
    # fila A: plumas de contorno (cuerpo)
    A = dict(tipo="contorno", punta=2.2, y_max=0.60, calamo=0.05, paso_barba=pb * 0.85, fleco=0.24, cortes=2,
             plumon=0.34, ancho=0.92, subida=0.50, k_raquis=0.05, k_barba=0.04, alt_raquis=0.30, alt_barba=0.10)
    poner("cont_liso", 0, 0, ch1, patron="liso", **A)
    poner("cont_liso2", 1, 0, ch1, patron="liso", **{**A, "punta": 1.7, "y_max": 0.55, "cortes": 2})
    poner("cont_estria", 2, 0, ch1, patron="estria", **A)
    poner("cont_borde", 3, 0, ch1, patron="borde", **A)
    poner("cont_punta", 4, 0, ch1, patron="punta", **A)
    poner("cont_barras", 5, 0, ch1, patron="barras", n_barras=4, ciclo=0.40, fuerza_patron=0.40, **A)
    poner("cont_suelta", 6, 0, ch1, patron="liso", **{**A, "plumon": 0.62, "fleco": 0.30, "cortes": 3, "punta": 1.8})
    poner("cont_gota", 7, 0, ch1, patron="gota", **A)
    # fila B: coberteras y escapulares
    B = dict(tipo="cobertera", punta=2.6, y_max=0.58, calamo=0.05, paso_barba=pb, fleco=0.07, cortes=1,
             plumon=0.22, ancho=0.90, subida=0.42, k_borde=0.14)
    poner("cob_lisa", 0, ch1, ch1, patron="liso", **B)
    poner("cob_lisa2", 1, ch1, ch1, patron="liso", **{**B, "asim": -0.12, "punta": 2.2})
    poner("cob_estria", 2, ch1, ch1, patron="estria", **B)
    poner("cob_borde", 3, ch1, ch1, patron="borde", **B)
    poner("cob_barras", 4, ch1, ch1, patron="barras", n_barras=6, ciclo=0.34, fuerza_patron=0.38, **B)
    poner("cob_punta", 5, ch1, ch1, patron="punta", **B)
    poner("cob_larga", 6, ch1, ch1, patron="liso", **{**B, "punta": 1.5, "y_max": 0.45, "ancho": 0.70})
    poner("cob_larga_estria", 7, ch1, ch1, patron="estria", **{**B, "punta": 1.5, "y_max": 0.45, "ancho": 0.70})
    # filas C: plumas de vuelo y de cola
    V = dict(tipo="vuelo", calamo=0.06, paso_barba=pb, fleco=0.035, plumon=0.10, subida=0.30, k_borde=0.26, k_raquis=0.30)
    y2 = 2 * ch1
    poner("prim_lisa", 0, y2, ch2, patron="liso", asim=-0.42, punta=1.9, y_max=0.50, cortes=3, ancho=0.80, **V)
    poner("prim_barras", 1, y2, ch2, patron="barras", n_barras=9, ciclo=0.34, fuerza_patron=0.42, asim=-0.42, punta=1.9, y_max=0.50, cortes=3, ancho=0.80, **V)
    poner("sec_lisa", 2, y2, ch2, patron="liso", asim=-0.22, punta=2.3, y_max=0.60, cortes=2, ancho=0.88, **V)
    poner("sec_barras", 3, y2, ch2, patron="barras", n_barras=9, ciclo=0.34, fuerza_patron=0.42, asim=-0.22, punta=2.3, y_max=0.60, cortes=2, ancho=0.88, **V)
    poner("cola_lisa", 4, y2, ch2, patron="liso", asim=0.0, punta=3.0, y_max=0.66, cortes=2, ancho=0.84, **V)
    poner("cola_barras", 5, y2, ch2, patron="barras", n_barras=11, ciclo=0.30, fuerza_patron=0.45, asim=0.0, punta=3.0, y_max=0.66, cortes=2, ancho=0.84, **V)
    poner("cola_banda", 6, y2, ch2, patron="barras", n_barras=11, ciclo=0.24, fuerza_patron=0.62, banda=0.14, asim=0.0, punta=3.0, y_max=0.66, cortes=2, ancho=0.84, **V)
    poner("vuelo_aguda", 7, y2, ch2, patron="liso", asim=-0.30, punta=1.25, y_max=0.42, cortes=2, ancho=0.66, **V)
    return color, alfa, altura, celdas


def normales(altura, fuerza=2.2):
    gy, gx = np.gradient(altura)
    nx, ny, nz = -gx * fuerza, gy * fuerza, np.ones_like(altura)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([(nx / n) * 0.5 + 0.5, (ny / n) * 0.5 + 0.5, (nz / n) * 0.5 + 0.5], -1)


def main():
    salida = Path(sys.argv[1])
    tam = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    salida.mkdir(parents=True, exist_ok=True)
    color, alfa, altura, celdas = construir(tam)
    rgba = np.dstack([color, color, color, alfa])
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(salida / "plumas_color.png", optimize=True)
    alt_s = ndi.gaussian_filter(altura, 0.6)
    nrm = normales(alt_s)
    Image.fromarray((np.clip(nrm, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").save(salida / "plumas_normal.png", optimize=True)
    (salida / "plumas_celdas.json").write_text(json.dumps({"tam": tam, "celdas": celdas}, indent=1), encoding="utf-8")
    # vista previa sobre fondo medio
    prev = (color * alfa + 0.35 * (1 - alfa))
    Image.fromarray((np.clip(prev, 0, 1) * 255).astype(np.uint8), "L").save(salida / "plumas_previa.png")
    print("ok", tam, len(celdas), "celdas")


if __name__ == "__main__":
    main()
