"""Talla una escena de gaussianas con el cielo de las fotos, midiendo lo que cada gaussiana PINTA (GPU).

uso: tallar_cielo_gpu.py <conjunto> <entrada.ply> <salida.ply> [frac=0.5] [ancho=640] [maxv=300] [borde=1]

tallar_cielo.py mira solo el centro de cada gaussiana, y una mancha grande (las negras que el entrenamiento con cielo
transparente deja junto a las copas: sobre un pixel transparente da igual pintar negro que no pintar) tiene el centro
detras del follaje y el cuerpo sobre el cielo. Aqui se dibuja la escena desde cada foto con cielo transparente del
conjunto (PNG con alfa) y se suma, por gaussiana, el peso con que aporta a pixeles de cielo y el peso total. Se borran
las que ponen en el cielo FRAC o mas de todo lo que pintan: un pixel de cielo certifica que en su rayo no hay nada.
El cielo se encoge BORDE px (a ANCHO de ancho) para no castigar el borde de hojas y ramas.
Lee el conjunto en texto (sparse/0/cameras.txt e images.txt, PINHOLE). Usa hasta MAXV vistas repartidas.
"""
import sys, os, numpy as np, cv2, torch
sys.path.insert(0, os.path.dirname(__file__))
import splat, render, colmapbin

DS, IN, OUT = sys.argv[1:4]
FRAC = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
ANCHO = int(sys.argv[5]) if len(sys.argv) > 5 else 640
MAXV = int(sys.argv[6]) if len(sys.argv) > 6 else 300
BORDE = int(sys.argv[7]) if len(sys.argv) > 7 else 1
cams = {}
for l in open(os.path.join(DS, "sparse/0/cameras.txt")):
    p = l.split()
    if len(p) >= 8 and p[1] == "PINHOLE":
        cams[int(p[0])] = (int(p[2]), int(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]))
vistas = []
for l in open(os.path.join(DS, "sparse/0/images.txt")):
    p = l.strip().split(" ", 9)
    if len(p) == 10 and not l.startswith("#"):
        q = np.array([float(x) for x in p[1:5]]); t = np.array([float(x) for x in p[5:8]])
        vistas.append((p[9], colmapbin.qvec2rot(q), t, int(p[8])))


def cielo_de(n, h):
    base = os.path.splitext(n)[0]
    for f in (os.path.join(DS, "images", n), os.path.join(DS, "images", base + ".png")):
        if os.path.exists(f):
            im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
            if im is None or im.ndim != 3 or im.shape[2] != 4:
                return None
            c = (cv2.resize(im[..., 3], (ANCHO, h), interpolation=cv2.INTER_AREA) < 3).astype(np.uint8)
            if BORDE > 0:
                c = cv2.erode(c, np.ones((2 * BORDE + 1, 2 * BORDE + 1), np.uint8))
            return c
    return None


g = splat.leer(IN); N = len(g["xyz"])
G = render.a_gpu(g)
acum = dict(w_m=torch.zeros(N, device="cuda"), w_t=torch.zeros(N, device="cuda"), mascara=None)
sel = [vistas[int(k)] for k in np.linspace(0, len(vistas) - 1, min(MAXV, len(vistas)))]
usadas = 0
for n, R, t, c in sel:
    W, H, fx, fy, cx, cy = cams[c]; s = ANCHO / W; h = int(round(H * s))
    m = cielo_de(n, h)
    if m is None or m.mean() < 0.005:
        continue
    usadas += 1
    acum["mascara"] = torch.as_tensor(m > 0, device="cuda")
    render.render(G, R, t, fx * s, fy * s, cx * s, cy * s, ANCHO, h, acum=acum)
wm, wt = acum["w_m"].cpu().numpy(), acum["w_t"].cpu().numpy()
frac = wm / np.maximum(wt, 1e-6)
fuera = (wt > 0.5) & (frac >= FRAC)
splat.escribir(OUT, {k: a[~fuera] for k, a in g.items()})
op = 1 / (1 + np.exp(-g["opacidad"].ravel())); esc = np.exp(g["escala"]).max(1)
lum = (0.5 + 0.28209479 * g["dc"]).clip(0, 1) @ np.array([0.299, 0.587, 0.114])
print("vistas con cielo usadas: %d de %d; gaussianas que pintan sobre todo cielo (%.0f %% o mas): %d de %d (%.2f %%); de ellas oscuras %d, de mas de 1 m %d; opacidad media %.2f; quedan %d -> %s"
      % (usadas, len(sel), 100 * FRAC, fuera.sum(), N, 100.0 * fuera.mean(), int((fuera & (lum < 0.15)).sum()), int((fuera & (esc > 1)).sum()),
         float(op[fuera].mean()) if fuera.any() else 0.0, int((~fuera).sum()), OUT))
