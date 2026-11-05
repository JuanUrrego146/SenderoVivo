"""Diagnóstico de una escena horneada (marco del motor) sobre su trazado:
1) Huecos: en n puntos del trazado dibuja 4 vistas horizontales (adelante, derecha, atrás, izquierda, 10 grados hacia
   arriba) y una hacia el cielo (50 grados), con fondo magenta; mide la fracción de píxeles con alfa < 0,5 en la mitad
   superior de las vistas horizontales y en toda la vista al cielo.
2) Agujas: cuenta gaussianas visibles (opacidad > 0,2) con razón de ejes (mayor / mediano) > 6 y > 10, por anillos de
   distancia al trazado, y cuántas son además largas (eje mayor > 0,15 m).
uso: diagnostico.py <splat.ply> <track.json> <alto_ojos> <n_puntos> <salida.jpg> [salida.json]"""
import sys, os, json, numpy as np, cv2
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import splat, render

PLY, TRACK, OJOS, N, OUT = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
OUTJ = sys.argv[6] if len(sys.argv) > 6 else None
g = splat.leer(PLY)
w = np.array([[p["x"], p["y"], p["z"]] for p in json.load(open(TRACK))["sceneWaypoints"]])
L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(w, axis=0), axis=1))]
den = np.c_[[np.interp(np.arange(0, L[-1], 0.1), L, w[:, k]) for k in range(3)]].T
TT = cKDTree(den[:, [0, 2]])

# --- agujas
op = splat.sigmoide(g["opacidad"].ravel())
es = np.sort(np.exp(g["escala"]), axis=1)[:, ::-1]
razon = es[:, 0] / np.maximum(es[:, 1], 1e-6)
dist = TT.query(g["xyz"][:, [0, 2]])[0]
agujas = {}
for a, b in [(0, 3), (3, 8), (8, 20), (20, 1e9)]:
    m = (op > 0.2) & (dist >= a) & (dist < b)
    agujas["%g-%g m" % (a, b)] = dict(visibles=int(m.sum()), razon6=int((m & (razon > 6)).sum()),
                                      razon10=int((m & (razon > 10)).sum()),
                                      razon6_largas=int((m & (razon > 6) & (es[:, 0] > 0.15)).sum()))
print("agujas:", json.dumps(agujas))

# --- huecos
G = render.a_gpu(g)
W, H = 360, 240; f = 0.5 * W / np.tan(np.radians(35))
filas, hueco_h, hueco_cielo = [], [], []
for i in np.linspace(0, len(w) - 2, N).astype(int):
    c = w[i] + [0, OJOS, 0]
    fw = w[min(i + 2, len(w) - 1)] - w[max(i - 1, 0)]; fw[1] = 0; fw /= np.linalg.norm(fw)
    tiles = []
    for giro, picado in [(0, -10), (90, -10), (180, -10), (270, -10), (0, -50)]:
        a = np.radians(giro)
        d = np.cos(a) * fw + np.sin(a) * np.cross(fw, [0, 1.0, 0]) * -1
        der = np.cross(d, [0, 1, 0]); der /= np.linalg.norm(der)
        p = np.radians(picado)
        dd = np.cos(p) * d - np.sin(p) * np.array([0, 1.0, 0])   # picado negativo = mirar hacia arriba
        abajo = np.cross(dd, der)
        Rw = np.stack([der, abajo, dd])
        img, alfa, _ = render.render(G, Rw, -Rw @ c, f, f, W / 2, H / 2, W, H, fondo=(1, 0, 1))
        if picado == -50:
            hueco_cielo.append(float((alfa < 0.5).mean()))
        else:
            hueco_h.append(float((alfa[: H // 2] < 0.5).mean()))
        t = (np.clip(img, 0, 1)[..., ::-1] * 255).astype(np.uint8).copy()
        cv2.putText(t, "d=%.0f %s" % (L[i], "cielo" if picado == -50 else "%d" % giro), (6, 18), 0, 0.5, (0, 255, 255), 1)
        tiles.append(t)
    filas.append(np.hstack(tiles))
cv2.imwrite(OUT, np.vstack(filas), [cv2.IMWRITE_JPEG_QUALITY, 85])
res = dict(agujas=agujas, hueco_mitad_superior=float(np.mean(hueco_h)), hueco_cielo=float(np.mean(hueco_cielo)),
           hueco_mitad_superior_max=float(np.max(hueco_h)), hueco_cielo_max=float(np.max(hueco_cielo)))
print("huecos: mitad superior %.1f %% (max %.1f), cielo %.1f %% (max %.1f)" % (
    100 * res["hueco_mitad_superior"], 100 * res["hueco_mitad_superior_max"], 100 * res["hueco_cielo"], 100 * res["hueco_cielo_max"]))
if OUTJ: json.dump(res, open(OUTJ, "w"), indent=1)
