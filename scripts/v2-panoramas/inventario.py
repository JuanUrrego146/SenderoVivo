# -*- coding: utf-8 -*-
"""
Inventario de las fotos 360 (.insp) de la Insta360 X3 para la version 2.

Para cada foto mide, sin mirarla:

- hora (DateTimeOriginal) y orden de captura dentro de su sesion;
- luz de la escena: EV a ISO 100 desde el EXIF, EV = log2(N^2 / t) - log2(ISO / 100).
  Con sol directo en estos cerros sale por encima de 12; con nube y bajo dosel, por debajo de 10;
- brillo medio (luma 0-255) dentro del circulo util de las dos lentes;
- borrosidad (la columna se llama 'gotas' por el primer intento; validado sobre fotos, mide sobre todo
  desenfoque por movimiento y no gotas, que se miden en gotas.py): la imagen de cada lente se parte en cuadros de 48 px (a un cuarto de
  resolucion) dentro del circulo util. Para cada cuadro se mide la energia de alta frecuencia
  (media del cuadrado del laplaciano). Una gota es una mancha borrosa que se queda fija en el
  lente, asi que se compara cada cuadro con la mediana de ese MISMO cuadro en todas las fotos: un
  cuadro con menos del 30 % de su nitidez habitual cuenta como borroso. Los cuadros que parecen
  cielo (claros y poco saturados) no cuentan, porque el cielo es liso con o sin gota. La medida es
  el porcentaje de cuadros borrosos de cada lente, y la de la foto, el de la peor lente;
- gravedad del acelerometro (MakerNote, tres primeros numeros), que luego sirve para nivelar.

Salida: <salida>/inventario.csv y <salida>/cuadros.npz (energias por cuadro, para rehacer la
medida sin volver a leer las fotos).

uso: python inventario.py "E:/Escaneo con Insta360" E:/SenderoV2/inv
"""
import csv
import math
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np
from PIL import Image

REDUCCION = 4                 # se lee a 1/4: 2992 x 1496
LADO_OJO = 5984 // REDUCCION  # 1496 px por lente
RADIO_UTIL = 2820 / REDUCCION  # como en scripts/captura360/vistas.py
CUADRO = 48
UMBRAL_BORROSO = 0.30


def rejilla():
    """Centros de los cuadros que caen enteros dentro del circulo util."""
    c = LADO_OJO / 2
    celdas = []
    for y in range(0, LADO_OJO - CUADRO + 1, CUADRO):
        for x in range(0, LADO_OJO - CUADRO + 1, CUADRO):
            esquinas = [(x, y), (x + CUADRO, y), (x, y + CUADRO), (x + CUADRO, y + CUADRO)]
            if all(math.hypot(px - c, py - c) < RADIO_UTIL * 0.97 for px, py in esquinas):
                celdas.append((x, y))
    return celdas


CELDAS = rejilla()


def exif(ruta):
    im = Image.open(ruta)
    ex = im.getexif()
    sub = ex.get_ifd(0x8769)
    fecha = str(sub.get(0x9003) or ex.get(0x0132))
    t = float(sub.get(0x829A))
    n = float(sub.get(0x829D))
    iso = float(sub.get(0x8827))
    nota = sub.get(0x927C) or b""
    if isinstance(nota, bytes):
        nota = nota.split(b"\x00")[0].decode("ascii", "ignore")
    nums = [float(v) for v in str(nota).split("_") if re.fullmatch(r"-?\d+(\.\d+)?", v)]
    g = nums[:3] if len(nums) >= 3 else [float("nan")] * 3
    ev = math.log2(n * n / t) - math.log2(iso / 100.0)
    return fecha, t, iso, n, ev, g


def medir(ruta):
    try:
        fecha, t, iso, n, ev, g = exif(ruta)
        im = cv2.imread(ruta, cv2.IMREAD_REDUCED_COLOR_4)
        gris = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
        hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
        lap = cv2.Laplacian(cv2.GaussianBlur(gris, (3, 3), 0), cv2.CV_32F)
        energia = np.zeros((2, len(CELDAS)), np.float32)
        cielo = np.zeros((2, len(CELDAS)), bool)
        brillo = []
        for k in range(2):
            x0 = k * LADO_OJO
            for j, (x, y) in enumerate(CELDAS):
                sl = (slice(y, y + CUADRO), slice(x0 + x, x0 + x + CUADRO))
                energia[k, j] = float(np.mean(lap[sl] ** 2))
                v = float(np.mean(hsv[sl][..., 2]))
                s = float(np.mean(hsv[sl][..., 1]))
                cielo[k, j] = v > 170 and s < 60
                brillo.append(float(np.mean(gris[sl])))
        return dict(ruta=ruta, fecha=fecha, t=t, iso=iso, f=n, ev=ev, g=g, brillo=float(np.mean(brillo)),
                    energia=energia, cielo=cielo)
    except Exception as e:  # noqa: BLE001
        return dict(ruta=ruta, error=str(e))


def main():
    origen, salida = sys.argv[1], sys.argv[2]
    os.makedirs(salida, exist_ok=True)
    rutas = []
    for cam in ("Camera01", "Camera02"):
        d = os.path.join(origen, cam)
        rutas += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".insp")]
    print("fotos:", len(rutas), flush=True)
    res = []
    with ProcessPoolExecutor(6) as ex:
        for i, r in enumerate(ex.map(medir, rutas, chunksize=4)):
            res.append(r)
            if i % 50 == 0:
                print(i, flush=True)
    errores = [r for r in res if "error" in r]
    res = [r for r in res if "error" not in r]
    for r in errores:
        print("ERROR", r["ruta"], r["error"])
    E = np.stack([r["energia"] for r in res])          # fotos x 2 x celdas
    C = np.stack([r["cielo"] for r in res])
    med = np.median(E, axis=0)                          # nitidez habitual de cada cuadro
    razon = E / np.maximum(med, 1e-6)
    borroso = (razon < UMBRAL_BORROSO) & ~C
    validos = np.maximum((~C).sum(axis=2), 1)
    pct = 100.0 * borroso.sum(axis=2) / validos         # fotos x 2
    np.savez_compressed(os.path.join(salida, "cuadros.npz"), energia=E, cielo=C,
                        celdas=np.array(CELDAS), rutas=np.array([r["ruta"] for r in res]))
    # Orden: por sesion (hora de inicio en el nombre) y, dentro, por fecha y numero de archivo.
    filas = []
    for i, r in enumerate(res):
        nombre = os.path.basename(r["ruta"])
        m = re.match(r"IMG_(\d{8})_(\d{6})_\d\d_(\d+)\.insp", nombre)
        filas.append(dict(archivo=os.path.relpath(r["ruta"], origen).replace("\\", "/"), sesion=m.group(2),
                          numero=int(m.group(3)), fecha=r["fecha"], exposicion_s=r["t"], iso=r["iso"],
                          ev100=round(r["ev"], 2), brillo=round(r["brillo"], 1),
                          gotas_lente_a=round(pct[i, 0], 1), gotas_lente_b=round(pct[i, 1], 1),
                          gotas=round(max(pct[i]), 1), nitidez_mediana=round(float(np.median(razon[i])), 3),
                          cielo_pct=round(100.0 * C[i].mean(), 1),
                          gx=r["g"][0], gy=r["g"][1], gz=r["g"][2]))
    filas.sort(key=lambda f: (f["sesion"], f["fecha"], f["numero"]))
    orden = {}
    for f in filas:
        orden[f["sesion"]] = orden.get(f["sesion"], 0) + 1
        f["orden"] = orden[f["sesion"]]
    campos = ["sesion", "orden", "archivo", "numero", "fecha", "exposicion_s", "iso", "ev100", "brillo",
              "gotas_lente_a", "gotas_lente_b", "gotas", "nitidez_mediana", "cielo_pct", "gx", "gy", "gz"]
    with open(os.path.join(salida, "inventario.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, campos)
        w.writeheader()
        w.writerows(filas)
    print("listo:", len(filas), "errores:", len(errores))


if __name__ == "__main__":
    main()
