"""Mide y arma las hojas de un barrido de la app (carpeta que dejo barrido_app.mjs).

Por cada captura mide, sobre la imagen reducida a 640 x 360 (el mismo tamano con que paradas_recorrido.py mide el
dibujo aparte), la nitidez (varianza del laplaciano) y la parte de la vista ocupada por manchas: bloques de 32 x 32
sin textura (desviacion del gris menor a UMBRAL_PLANO), que es como se ve una gaussiana grande pegada a la camara o un
hueco de la reconstruccion. El cielo tambien es plano, pero claro y arriba: un bloque plano cuenta como mancha si es
oscuro (gris medio menor a UMBRAL_OSCURO) o si esta en las tres quintas partes de abajo de la vista.
Deja medidas.json (una fila por captura, ordenadas por distancia) y hojas hoja_NN.jpg con las capturas en orden y su
distancia, nitidez y mancha escritas encima, para decidir mirando.
uso: barrido_hoja.py <carpeta_del_barrido> [columnas=5] [filas=4] [ancho_miniatura=384] [cortes=a-b,c-d para pintar el borde]"""
import sys, os, json, numpy as np, cv2

CARPETA = sys.argv[1]
opc = dict(a.split("=", 1) for a in sys.argv[2:])
COLS = int(opc.get("columnas", 5)); FILAS = int(opc.get("filas", 4)); AM = int(opc.get("ancho_miniatura", 384))
CORTES = [tuple(float(x) for x in c.split("-")) for c in opc.get("cortes", "").split(",") if c]
UMBRAL_PLANO, UMBRAL_OSCURO, BLOQUE = 7.0, 95.0, 32

registro = json.load(open(os.path.join(CARPETA, "barrido.json"), encoding="utf-8"))
registro.sort(key=lambda r: r["d"])
filas = []
for r in registro:
    im = cv2.imread(os.path.join(CARPETA, r["archivo"]))
    if im is None:
        continue
    ch = cv2.resize(im, (640, 360), interpolation=cv2.INTER_AREA)
    gris = cv2.cvtColor(ch, cv2.COLOR_BGR2GRAY).astype(np.float32)
    nitidez = float(cv2.Laplacian(gris, cv2.CV_32F).var())
    hb, wb = 360 // BLOQUE, 640 // BLOQUE
    bloques = gris[:hb * BLOQUE, :wb * BLOQUE].reshape(hb, BLOQUE, wb, BLOQUE).swapaxes(1, 2).reshape(hb, wb, -1)
    plano = bloques.std(-1) < UMBRAL_PLANO
    abajo = (np.arange(hb) >= round(hb * 0.4))[:, None]
    es_mancha = plano & ((bloques.mean(-1) < UMBRAL_OSCURO) | abajo)
    mancha = float(es_mancha.mean())
    cielo = float((plano & ~es_mancha).mean())
    filas.append({**r, "nitidez": round(nitidez, 1), "mancha": round(mancha, 3), "cielo": round(cielo, 3)})
json.dump(filas, open(os.path.join(CARPETA, "medidas.json"), "w", encoding="utf-8"), indent=0)

alto = AM * 9 // 16
por_hoja = COLS * FILAS
for h in range(0, len(filas), por_hoja):
    hoja = np.zeros((FILAS * alto, COLS * AM, 3), np.uint8)
    for k, r in enumerate(filas[h:h + por_hoja]):
        im = cv2.resize(cv2.imread(os.path.join(CARPETA, r["archivo"])), (AM, alto), interpolation=cv2.INTER_AREA)
        dentro = any(a < r["d"] < b for a, b in CORTES)
        texto = f'{r["d"]:.1f}  n{r["nitidez"]:.0f}  m{r["mancha"] * 100:.0f}'
        cv2.rectangle(im, (0, 0), (AM - 1, 20), (0, 0, 0), -1)
        cv2.putText(im, texto, (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (90, 90, 255) if dentro else (255, 255, 255), 1, cv2.LINE_AA)
        if dentro:
            cv2.rectangle(im, (0, 0), (AM - 1, alto - 1), (60, 60, 255), 3)
        y, x = (k // COLS) * alto, (k % COLS) * AM
        hoja[y:y + alto, x:x + AM] = im
    cv2.imwrite(os.path.join(CARPETA, f"hoja_{h // por_hoja:02d}.jpg"), hoja, [cv2.IMWRITE_JPEG_QUALITY, 86])

n = np.array([f["nitidez"] for f in filas])
print(f"{len(filas)} capturas | nitidez mediana {np.median(n):.0f}, cuartiles {np.percentile(n, 25):.0f} y {np.percentile(n, 75):.0f}")
print(" d      nitidez  mancha%  giro")
for f in filas:
    print(f'{f["d"]:6.1f} {f["nitidez"]:8.0f} {f["mancha"] * 100:7.0f} {f["rel"]:6.1f}')
