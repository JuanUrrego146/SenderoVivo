"""Trazado del recorrido por donde de verdad caminaron las camaras.
Un splat se ve bien desde donde se tomaron las fotos y mal desde fuera (ahi aparecen flotantes y agujas que desde las
camaras no se ven). El trazado anterior salia de poses viejas de COLMAP corridas hacia el espacio libre y quedaba a
metros del camino real.
Metodo: una toma de referencia que recorre todo el tramo (REF, ordenada por numero de cuadro) se suaviza; cada camara
de TODAS las tomas se proyecta sobre ella (avance s) y, si esta a menos de LADO m en planta, entra a la mediana de su
tramo de 1 m de avance. La linea de medianas (x, z y altura de camara) se suaviza y se remuestrea cada PASO m.
Altura de cada punto: altura mediana de las camaras menos OJOS, para que los ojos del visitante queden a la altura a la
que se grabo. Conserva el sentido del trazado anterior (el extremo mas cercano a su inicio queda en d = 0).
Escribe el JSON del trazado nuevo (sin perfil de corredor: se calcula despues con espacio_libre.py) y un dibujo en planta.
uso: propia_trazado_camaras.py <sparse> <ref_toma> <track_anterior.json> <salida.json> <dibujo.png> [lado=1.5] [paso=1.5] [ojos=0.85]"""
import sys, os, re, json, numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import uniform_filter1d
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, REF, VIEJO, OUT, PNG = sys.argv[1:6]
LADO = float(sys.argv[6]) if len(sys.argv) > 6 else 1.5
PASO = float(sys.argv[7]) if len(sys.argv) > 7 else 1.5
OJOS = float(sys.argv[8]) if len(sys.argv) > 8 else 0.85
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
por = {}
for v in ims.values():
    if v["name"].startswith("i360/"):
        continue
    t = v["name"].split("/")[0]
    por.setdefault(t, []).append((int(re.search(r"_(\d+)\.jpg$", v["name"]).group(1)), v["centro"]))
for t in por:
    por[t].sort(key=lambda a: a[0])
ref = np.array([c for _, c in por[REF]])
ref = np.c_[[uniform_filter1d(ref[:, k], 7, mode="nearest") for k in range(3)]].T
s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(ref[:, [0, 2]], axis=0), axis=1))]
fino = np.arange(0, s[-1], 0.1)
rf = np.c_[[np.interp(fino, s, ref[:, k]) for k in range(3)]].T
arbol = cKDTree(rf[:, [0, 2]])
todas = np.array([c for l in por.values() for _, c in l])
d, j = arbol.query(todas[:, [0, 2]])
ok = d < LADO
cubos = np.floor(fino[j[ok]]).astype(int)
linea = []
for b in range(int(np.floor(fino[-1])) + 1):
    m = cubos == b
    if m.sum() >= 5:
        linea.append(np.median(todas[ok][m], axis=0))
linea = np.array(linea)
linea = np.c_[[uniform_filter1d(linea[:, k], 5, mode="nearest") for k in range(3)]].T
sl = np.r_[0, np.cumsum(np.linalg.norm(np.diff(linea[:, [0, 2]], axis=0), axis=1))]
n = max(2, int(round(sl[-1] / PASO)) + 1)
si = np.linspace(0, sl[-1], n)
w = np.c_[[np.interp(si, sl, linea[:, k]) for k in range(3)]].T
w[:, 1] -= OJOS
viejo = json.load(open(VIEJO))
wv = np.array([[p["x"], p["y"], p["z"]] for p in viejo["sceneWaypoints"]])
if np.linalg.norm(w[0, [0, 2]] - wv[0, [0, 2]]) > np.linalg.norm(w[-1, [0, 2]] - wv[0, [0, 2]]):
    w = w[::-1]
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
dc, _ = cKDTree(todas[:, [0, 2]]).query(w[:, [0, 2]])
print("trazado nuevo: %d puntos, %.1f m (el anterior %.1f m); camara mas cercana a cada punto: mediana %.2f m, maximo %.2f m"
      % (len(w), L[-1], np.r_[0, np.cumsum(np.linalg.norm(np.diff(wv, axis=0), axis=1))][-1], np.median(dc), dc.max()))
dv, _ = cKDTree(w[:, [0, 2]]).query(wv[:, [0, 2]])
print("distancia en planta del trazado anterior al nuevo: mediana %.2f m, maximo %.2f m" % (np.median(dv), dv.max()))
nuevo = {k: v for k, v in viejo.items() if k in ("version", "capturedOn", "distanceUnit", "eyeHeight")}
nuevo["eyeHeight"] = OJOS
nuevo["source"] = "camaras de la alineacion propia (COLMAP con una camara compartida y las vistas 360 como puente): mediana de todas las tomas por metro de avance sobre la toma %s" % REF
nuevo["note"] = ("Trazado por donde caminaron las camaras: mediana de los centros de camara de todas las tomas a menos de %.1f m "
                 "de la toma de referencia, por metro de avance, suavizada y remuestreada cada %.1f m. Cada punto va %.2f m por debajo "
                 "de la altura mediana de las camaras, asi los ojos quedan a la altura a la que se grabo. Coordenadas en metros del "
                 "motor (escena horneada, +Y arriba)." % (LADO, PASO, OJOS))
nuevo["sceneWaypoints"] = [{"x": round(float(a), 3), "y": round(float(b), 3), "z": round(float(c), 3)} for a, b, c in w]
nuevo["corridorRadius"] = viejo.get("corridorRadius", 1.5)
nuevo["points"] = []
json.dump(nuevo, open(OUT, "w"), indent=2, ensure_ascii=False)
try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(1, 2, figsize=(18, 8))
    for a, (i, k, nom) in zip(ax, [(0, 2, "planta x-z"), (0, 1, "alzado x-y")]):
        for t, l in sorted(por.items()):
            c = np.array([q for _, q in l]); a.plot(c[:, i], c[:, k], ".", ms=2, label=t[2:] if i == 0 and k == 2 else None)
        a.plot(wv[:, i], wv[:, k], "k--", lw=2, label="anterior")
        a.plot(w[:, i], w[:, k], "r-", lw=2.5, label="nuevo")
        a.plot(w[0, i], w[0, k], "ro", ms=10)
        a.set_title(nom); a.axis("equal")
    ax[0].legend(fontsize=7, ncol=2)
    plt.savefig(PNG, dpi=70, bbox_inches="tight")
except Exception as e:
    print("sin dibujo:", e)
print("escrito", OUT)
