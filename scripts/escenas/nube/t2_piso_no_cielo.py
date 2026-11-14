"""Quita de lo transparente (cielo) los pixeles cuyo rayo cae sobre el terreno del corredor (t2_terreno.py).
El piso asoleado cumple las pruebas de cielo de t2_dataset.py (claro, sin color, liso, sin puntos de COLMAP y, cuesta
arriba, por encima del horizonte); en las vistas con cielo transparente Brush lo deja sin nada y quedan huecos.
Solo toca las vistas PNG con canal alfa del conjunto (las de mascara ignoran esos pixeles, no los vuelven
transparentes). En cada una proyecta los puntos del terreno que estan delante y a menos de DMAX m, cada uno como un
disco del tamano de su celda a esa distancia; donde cae terreno, el alfa era 0 y la foto no es negra (el borde invalido
de la correccion de lente), el alfa pasa a 255. Los trozos enlazan estos mismos archivos (enlaces duros), asi que se
reescriben en el sitio. Tambien corrige <base>/masks si se da, para que el conjunto se pueda rehacer igual.
Sin APLICAR=1 solo mide y deja una hoja con las vistas mas afectadas (foto, alfa actual en magenta, terreno en verde).
uso: t2_piso_no_cielo.py <conjunto_alfa> <terreno.npz> <informe.json> [dmax=25] [hoja.jpg] [base_con_masks]"""
import sys, os, json, numpy as np, cv2
from concurrent.futures import ProcessPoolExecutor
from scipy.spatial.transform import Rotation

DS, TER, INF = sys.argv[1:4]
DMAX = float(sys.argv[4]) if len(sys.argv) > 4 else 25.0
HOJA = sys.argv[5] if len(sys.argv) > 5 else None
BASE = sys.argv[6] if len(sys.argv) > 6 else None
APLICAR = os.environ.get("APLICAR") == "1"
NIV = [1, 2, 3, 5, 8, 12, 18, 27, 40, 60]
_t = np.load(TER); P = _t["puntos"].astype(np.float64); CEL = float(_t["celda"])
cams = {}
for l in open(os.path.join(DS, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and not l.startswith("#"):
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[6]), float(p[7]))
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.split()
    if len(p) >= 10 and not l.startswith("#"):
        vistas.append((p[9], int(p[8]), [float(x) for x in p[1:5]], [float(x) for x in p[5:8]]))


def terreno_en(q, t, cam, wr=480):
    """mascara (a wr de ancho) de los pixeles sobre los que cae el terreno"""
    W, H, f, cx, cy = cams[cam]
    s = wr / W; hr = round(H * s)
    R = Rotation.from_quat([q[1], q[2], q[3], q[0]]).as_matrix()
    pc = P @ R.T + np.array(t)
    z = pc[:, 2]
    ok = (z > 0.25) & (z < DMAX)
    u = pc[ok, 0] / z[ok] * f * s + cx * s; v = pc[ok, 1] / z[ok] * f * s + cy * s
    r = np.maximum(1.0, 0.75 * CEL * f * s / z[ok])
    den = (u > -60) & (u < wr + 60) & (v > -60) & (v < hr + 60)
    u, v, r = u[den], v[den], r[den]
    M = 64
    out = np.zeros((hr + 2 * M, wr + 2 * M), np.uint8)
    ant = 0
    for n in NIV:
        k = (r > ant) & (r <= n) if n < NIV[-1] else (r > ant)
        ant = n
        if not k.any():
            continue
        capa = np.zeros_like(out)
        capa[np.clip(v[k].astype(int) + M, 0, hr + 2 * M - 1), np.clip(u[k].astype(int) + M, 0, wr + 2 * M - 1)] = 1
        out |= cv2.dilate(capa, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * n + 1, 2 * n + 1)))
    return out[M:M + hr, M:M + wr]


def una(a):
    n, cam, q, t = a
    if not n.lower().endswith(".png"):
        return n, 0, 0.0, 0.0
    f = os.path.join(DS, "images", n)
    im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
    if im is None or im.ndim != 3 or im.shape[2] != 4:
        return n, 0, 0.0, 0.0
    alfa = im[..., 3]
    if not (alfa == 0).any():
        return n, 0, 0.0, 0.0
    ter = cv2.resize(terreno_en(q, t, cam), alfa.shape[::-1], interpolation=cv2.INTER_NEAREST) > 0
    cambia = ter & (alfa == 0) & (im[..., :3].max(2) > 40)
    c = int(cambia.sum())
    if c and APLICAR:
        im[..., 3][cambia] = 255
        cv2.imwrite(f, im, [cv2.IMWRITE_PNG_COMPRESSION, 1])
        if BASE:
            mp = os.path.join(BASE, "masks", os.path.splitext(n)[0] + ".jpg.png")
            m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE)
            if m is not None and m.shape == cambia.shape:
                m[cambia] = 255; cv2.imwrite(mp, m)
    return n, c, float((alfa == 0).mean()), float(cambia.mean())


if __name__ == "__main__":
    with ProcessPoolExecutor(5) as ex:
        res = list(ex.map(una, vistas, chunksize=8))
    tocadas = [r for r in res if r[1] > 0]
    con_alfa = [r for r in res if r[2] > 0]
    json.dump({"aplicado": APLICAR, "vistas": {r[0]: [r[1], round(r[2], 5), round(r[3], 5)] for r in tocadas}}, open(INF, "w"), indent=0)
    print("vistas %d; con algo transparente %d; con piso marcado como cielo %d (%.1f %% de las transparentes)"
          % (len(res), len(con_alfa), len(tocadas), 100 * len(tocadas) / max(len(con_alfa), 1)))
    if tocadas:
        fr = np.array([r[3] for r in tocadas])
        tr = sum(r[2] for r in con_alfa); pi = sum(r[3] for r in tocadas)
        print("de lo transparente, cae sobre el terreno el %.1f %%; en las vistas afectadas: mediana %.2f %% de la foto, p90 %.2f %%, maximo %.2f %%; con mas de 1 %% de la foto: %d vistas"
              % (100 * pi / max(tr, 1e-9), 100 * np.median(fr), 100 * np.percentile(fr, 90), 100 * fr.max(), (fr > 0.01).sum()))
        por_toma = {}
        for r in tocadas:
            por_toma[r[0].split("/")[0]] = por_toma.get(r[0].split("/")[0], 0) + 1
        print("por toma: " + ", ".join("%s %d" % kv for kv in sorted(por_toma.items())))
    print("APLICADO" if APLICAR else "solo medido (APLICAR=1 para corregir)")
    if HOJA and tocadas and not APLICAR:
        peores = sorted(tocadas, key=lambda r: -r[3])
        elegidas = [peores[i] for i in np.linspace(0, min(len(peores) - 1, 40), 8).astype(int)]
        d = {v[0]: v for v in vistas}
        filas = []
        for r in elegidas:
            n, cam, q, t = d[r[0]]
            im = cv2.imread(os.path.join(DS, "images", n), cv2.IMREAD_UNCHANGED)
            ch = cv2.resize(im, (480, round(480 * im.shape[0] / im.shape[1])), interpolation=cv2.INTER_AREA)
            foto = ch[..., :3].copy(); a = ch[..., 3]
            ter = terreno_en(q, t, cam) > 0
            if ter.shape != a.shape:
                ter = cv2.resize(ter.astype(np.uint8), a.shape[::-1], interpolation=cv2.INTER_NEAREST) > 0
            v1 = foto.copy(); v1[a < 128] = (255, 0, 255)
            v2 = foto.copy(); v2[ter] = (0.5 * v2[ter] + 0.5 * np.array([0, 255, 0])).astype(np.uint8); v2[(a < 128) & ter] = (0, 0, 255)
            cv2.putText(foto, "%s %.1f%%" % (n[-28:], 100 * r[3]), (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
            filas.append(np.hstack([foto, v1, v2]))
        cv2.imwrite(HOJA, np.vstack(filas), [cv2.IMWRITE_JPEG_QUALITY, 82])
        print("hoja: %s (foto | transparente en magenta | terreno en verde y lo que se corrige en rojo)" % HOJA)
