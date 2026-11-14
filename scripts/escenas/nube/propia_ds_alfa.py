"""Convierte un conjunto de Brush con mascaras (propia_dataset.py) en uno con CIELO TRANSPARENTE.
Con mascara, Brush ignora el cielo y lo que caiga en esos rayos queda sin vigilancia: de ahi salen los velos grises y las
motas entre los troncos. Con transparencia (foto PNG con canal alfa, sin archivo de mascara), Brush 0.3 penaliza que el
dibujo tenga algo donde la foto es transparente (--match-alpha-weight), asi que limpia esos rayos.
- vistas SIN personas: PNG RGBA; alfa 0 donde la mascara del conjunto original tapaba (cielo y lejania), encogiendo lo
  transparente BORDE px para no morder los bordes de ramas y troncos (la mascara original venia engrosada);
- vistas CON personas: se dejan como estaban (JPG + mascara que ignora personas, cielo y lejania), porque en Brush 0.3
  una vista es transparente o es enmascarada, no las dos cosas. Igual las que traen lo quemado tapado
  (<conjunto_origen>/vistas_mascara.txt, de propia_aplicar_ganancias.py).
Las personas se leen de <masks_personas>/<nombre>.png (0 = persona) al tamano que sea. No usa GPU.
uso: propia_ds_alfa.py <conjunto_origen> <masks_personas> <conjunto_salida> [borde=6]"""
import sys, os, shutil, numpy as np, cv2
from concurrent.futures import ProcessPoolExecutor

SRC, PER, OUT = sys.argv[1:4]
BORDE = int(sys.argv[4]) if len(sys.argv) > 4 else 6
# vistas que deben seguir enmascaradas aunque no tengan personas (lo quemado que tapo propia_aplicar_ganancias.py)
_vm = os.path.join(SRC, "vistas_mascara.txt")
FORZAR_MASCARA = set(l.strip() for l in open(_vm) if l.strip()) if os.path.exists(_vm) else set()


def una(n):
    im = cv2.imread(os.path.join(SRC, "images", n))
    h, w = im.shape[:2]
    mp = os.path.join(SRC, "masks", n + ".png")
    m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else np.full((h, w), 255, np.uint8)
    pp = os.path.join(PER, n + ".png")
    per = cv2.imread(pp, cv2.IMREAD_GRAYSCALE) if os.path.exists(pp) else None
    con_persona = (per is not None and (per == 0).any()) or n in FORZAR_MASCARA
    if con_persona:
        d = os.path.join(OUT, "images", n); os.makedirs(os.path.dirname(d), exist_ok=True)
        if not os.path.exists(d):
            os.link(os.path.join(SRC, "images", n), d)
        dm = os.path.join(OUT, "masks", n + ".png"); os.makedirs(os.path.dirname(dm), exist_ok=True)
        cv2.imwrite(dm, m)
        return n, n, True, float((m == 0).mean())
    k = 2 * BORDE + 1
    alfa = cv2.dilate(m, np.ones((k, k), np.uint8))          # crece lo opaco: encoge lo transparente
    nn = os.path.splitext(n)[0] + ".png"
    d = os.path.join(OUT, "images", nn); os.makedirs(os.path.dirname(d), exist_ok=True)
    cv2.imwrite(d, np.dstack([im, alfa]), [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return n, nn, False, float((alfa == 0).mean())


if __name__ == "__main__":
    os.makedirs(os.path.join(OUT, "sparse/0"), exist_ok=True)
    lineas = open(os.path.join(SRC, "sparse/0/images.txt")).read().split("\n")
    nombres = [l.split(" ", 9)[9] for l in lineas if l.strip()]
    with ProcessPoolExecutor(4) as ex:
        res = list(ex.map(una, nombres, chunksize=8))
    nuevo = {a: b for a, b, _, _ in res}
    with open(os.path.join(OUT, "sparse/0/images.txt"), "w") as f:
        for l in lineas:
            if l.strip():
                p = l.split(" ", 9); p[9] = nuevo[p[9]]; f.write(" ".join(p) + "\n\n")
    for a in ("cameras.txt", "points3D.txt"):
        shutil.copy(os.path.join(SRC, "sparse/0", a), os.path.join(OUT, "sparse/0", a))
    tr = [t for _, _, c, t in res if not c]
    print("vistas %d: %d con cielo transparente (%.1f %% transparente en promedio) y %d con personas (mascara)"
          % (len(res), len(tr), 100 * np.mean(tr) if tr else 0, sum(c for _, _, c, _ in res)))
