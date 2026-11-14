"""Iguala la exposicion de las fotos de un conjunto de Brush ya armado (propia_dataset.py) con las exposiciones
relativas de propia_ganancias.py: cada foto se divide, en espacio lineal (gamma 2,2), por su exposicion e por canal.
Lo quemado no se puede recuperar: en las fotos mas claras que el consenso (e > QUEMADO en algun canal) los pixeles que
estaban saturados (algun canal >= 250) quedarian grises tras oscurecer, mientras las demas fotos muestran ahi el valor
real; esos pixeles se tapan en la mascara (engrosados 2 px) y la vista se anota en <conjunto>/vistas_mascara.txt para
que propia_ds_alfa.py la deje como vista enmascarada y no la pase a cielo transparente.
Reescribe las imagenes en su sitio (JPG calidad 95, o PNG conservando el alfa). No usa GPU.
uso: propia_aplicar_ganancias.py <conjunto> <ganancias.json> [quemado=1.15]"""
import sys, os, json, numpy as np, cv2
from concurrent.futures import ProcessPoolExecutor

DS, GAN = sys.argv[1:3]
QUEMADO = float(sys.argv[3]) if len(sys.argv) > 3 else 1.15
G = json.load(open(GAN))


def una(rel):
    clave = os.path.splitext(rel)[0] + ".jpg"
    e = G.get(clave)
    if e is None:
        return rel, None, False
    e = np.array(e, np.float32)
    f = os.path.join(DS, "images", rel)
    im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
    alfa = im[..., 3] if im.shape[2] == 4 else None
    bgr = im[..., :3]
    con_mascara = False
    if e.max() > QUEMADO:
        mp = os.path.join(DS, "masks", clave + ".png")
        m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE) if os.path.exists(mp) else np.full(bgr.shape[:2], 255, np.uint8)
        # solo cuenta lo quemado que la mascara no tapaba ya (el cielo quemado ya esta tapado como cielo)
        quem = ((bgr.max(2) >= 250) & (m > 0)).astype(np.uint8)
        if quem.mean() > 0.0005:
            quem = cv2.dilate(quem, np.ones((5, 5), np.uint8)) > 0
            m[quem] = 0
            os.makedirs(os.path.dirname(mp), exist_ok=True)
            cv2.imwrite(mp, m)
            con_mascara = True
    lin = (bgr.astype(np.float32) / 255.0) ** 2.2 / e
    out = (np.clip(lin, 0, 1) ** (1 / 2.2) * 255.0 + 0.5).astype(np.uint8)
    if alfa is not None:
        cv2.imwrite(f, np.dstack([out, alfa]), [cv2.IMWRITE_PNG_COMPRESSION, 1])
    else:
        cv2.imwrite(f, out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return rel, float(e[1]), con_mascara


if __name__ == "__main__":
    marca = os.path.join(DS, "ganancias_aplicadas.txt")
    if os.path.exists(marca):
        raise SystemExit("este conjunto ya tiene la exposicion igualada (%s): no se aplica dos veces" % marca)
    rels = []
    for raiz, _, fs in os.walk(os.path.join(DS, "images")):
        for a in fs:
            if a.lower().endswith((".jpg", ".png")):
                rels.append(os.path.relpath(os.path.join(raiz, a), os.path.join(DS, "images")).replace("\\", "/"))
    with ProcessPoolExecutor(4) as ex:
        res = list(ex.map(una, sorted(rels), chunksize=8))
    hechas = [r for r in res if r[1] is not None]
    con = [r[0] for r in res if r[2]]
    open(os.path.join(DS, "vistas_mascara.txt"), "a").write("".join(os.path.splitext(c)[0] + ".jpg\n" for c in con))
    open(marca, "w").write("ganancias de %s, quemado %.2f\n" % (GAN, QUEMADO))
    ev = np.array([r[1] for r in hechas])
    print("fotos igualadas %d de %d (exposicion G de %.2f a %.2f, mediana %.2f); con quemado tapado: %d"
          % (len(hechas), len(res), ev.min(), ev.max(), np.median(ev), len(con)))
