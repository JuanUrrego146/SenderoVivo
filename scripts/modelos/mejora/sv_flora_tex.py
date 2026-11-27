"""Texturas de la flora nueva (27/11/2026): corteza y tarjetas con alfa para pino, aliso y helecho arborescente.
Uso: python -I sv_flora_tex.py E:/SenderoModelos/nuevos/tex
Los colores van divididos por 1,6, como los de las aves, porque la ficha muestra los modelos con exposicion 1,6."""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
K = 1 / 1.6
def c(h, k=K):
    h = h.lstrip('#'); return tuple(int(min(255, int(h[i:i+2], 16) * k)) for i in (0, 2, 4))
rng = np.random.default_rng(20261127); random.seed(20261127)

def ruido(n, escalas=(4, 8, 16, 32, 64)):
    acc = np.zeros((n, n))
    for i, e in enumerate(escalas):
        r = rng.random((e, e))
        im = Image.fromarray((r * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC)
        acc += np.asarray(im, np.float64) / 255 / (1.6 ** i)
    acc -= acc.min(); return acc / acc.max()

def corteza(nombre, base, oscuro, claro, n=512, vertical=6.0, placas=False):
    y = np.linspace(0, 1, n)[:, None]; x = np.linspace(0, 1, n)[None, :]
    r1 = ruido(n); r2 = ruido(n, (2, 4, 8))
    # grietas verticales que serpentean
    g = np.abs(np.sin((x * vertical + r2 * 0.9) * math.pi * 2))
    grieta = np.clip((0.18 - g) / 0.18, 0, 1) if not placas else np.clip((0.25 - np.minimum(g, np.abs(np.sin((y * 9 + r1 * 0.6) * math.pi)))) / 0.25, 0, 1)
    t = np.clip(0.55 + 0.6 * (r1 - 0.5), 0, 1)
    B, O, C = (np.array(c(v), np.float64) for v in (base, oscuro, claro))
    col = B * (1 - t[..., None]) + C * t[..., None]
    col = col * (1 - grieta[..., None] * 0.85) + O * grieta[..., None] * 0.85
    Image.fromarray(col.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, nombre + "_col.png"))
    # normal a partir de la altura (grietas hundidas)
    h = (1 - grieta) * 0.8 + r1 * 0.2
    gy, gx = np.gradient(h)
    nx, ny = -gx * 6, -gy * 6; nz = np.ones_like(h)
    L = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nm = np.stack([nx / L, ny / L, nz / L], -1) * 0.5 + 0.5
    Image.fromarray((nm * 255).astype(np.uint8)).save(os.path.join(OUT, nombre + "_nrm.png"))

corteza("pino_corteza", "#6b4a35", "#2e1f17", "#8a6a50", placas=True)
corteza("aliso_corteza", "#8d8a80", "#4a4740", "#b3afa3", vertical=2.0)
corteza("helecho_tronco", "#4a3a2c", "#1f1812", "#6a5440", vertical=10.0)

def lienzo(n=1024):
    return Image.new("RGBA", (n, n), (0, 0, 0, 0))

# ---- pino: manojos de acículas colgantes (Pinus patula: agujas largas y caídas)
def agujas():
    n = 1024; im = lienzo(n); d = ImageDraw.Draw(im)
    verdes = [c("#5d7a3a"), c("#4e6b31"), c("#6e8a45"), c("#46602c")]
    # 4 celdas de 512x512, cada una un ramillete
    for cel in range(4):
        ox, oy = (cel % 2) * 512, (cel // 2) * 512
        # ramilla en diagonal desde arriba a la izquierda
        x0, y0, x1, y1 = ox + 40, oy + 60, ox + 470, oy + 200
        d.line([(x0, y0), (x1, y1)], fill=c("#5a3f2a") + (255,), width=7)
        for k in range(140):
            t = random.random(); bx, by = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            L = random.uniform(160, 300); ang = math.radians(random.uniform(60, 120))
            caida = random.uniform(0.15, 0.45)
            pts = [(bx, by)]
            for s in range(1, 9):
                u = s / 8
                pts.append((bx + math.cos(ang) * L * u * 0.5, by + math.sin(ang) * L * u + caida * L * u * u))
            col = random.choice(verdes)
            d.line(pts, fill=col + (255,), width=random.choice((2, 3, 3, 4)))
    im = im.filter(ImageFilter.SMOOTH)
    im.save(os.path.join(OUT, "pino_agujas.png"))
agujas()

# ---- aliso: ramita con hojas ovadas aserradas y amentos colgantes
def hoja(d, cx, cy, L, W, ang, col, nervio):
    pts = []
    for s in range(0, 41):
        u = s / 40; w = W * math.sin(math.pi * u) ** 0.9 * (1 - 0.25 * u)
        sierra = 1 + 0.06 * (s % 2)
        pts.append((u * L, w * sierra))
    pts += [(u, -w) for (u, w) in reversed(pts)]
    ca, sa = math.cos(ang), math.sin(ang)
    P = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]
    d.polygon(P, fill=col + (255,))
    d.line([(cx, cy), (cx + L * ca, cy + L * sa)], fill=nervio + (255,), width=3)
    for k in range(1, 8):
        u = k / 8.5
        bx, by = cx + L * u * ca, cy + L * u * sa
        for sg in (1, -1):
            a2 = ang + sg * math.radians(50)
            l2 = W * 0.85 * math.sin(math.pi * u)
            d.line([(bx, by), (bx + l2 * math.cos(a2), by + l2 * math.sin(a2))], fill=nervio + (255,), width=1)
def aliso_hojas():
    n = 1024; im = lienzo(n); d = ImageDraw.Draw(im)
    verdes = [c("#4f7a35"), c("#5c8a3e"), c("#47702f"), c("#63904a")]
    for cel in range(4):
        ox, oy = (cel % 2) * 512, (cel // 2) * 512
        x0, y0, x1, y1 = ox + 30, oy + 256, ox + 480, oy + 230
        d.line([(x0, y0), (x1, y1)], fill=c("#6b5a48") + (255,), width=6)
        if cel in (1, 3):  # amentos colgantes
            for k in range(3):
                bx = ox + 140 + k * 90; by = oy + 245
                for s in range(22):
                    d.ellipse([bx - 7, by + s * 9 - 6, bx + 7, by + s * 9 + 6], fill=c("#7a5a3a") + (255,))
        for k in range(9):
            t = (k + 0.5) / 9; bx, by = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            sg = 1 if k % 2 else -1
            hoja(d, bx, by, random.uniform(120, 170), random.uniform(42, 56), math.radians(sg * random.uniform(45, 75) - 10), random.choice(verdes), c("#82a860"))
    im.save(os.path.join(OUT, "aliso_hojas.png"))
aliso_hojas()

# ---- helecho: fronda bipinnada vista de frente (la tarjeta se curva en Blender)
def fronda():
    W, H = 512, 1024; im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = W / 2
    d.line([(cx, 0), (cx, H)], fill=c("#6b6a3a") + (255,), width=8)  # raquis
    verdes = [c("#5f8a3c"), c("#6a9645"), c("#557d35")]
    npin = 34
    for k in range(npin):
        u = (k + 0.5) / npin; y = u * H
        L = (W / 2 - 8) * (math.sin(math.pi * (0.15 + 0.85 * u)) ** 0.8) * (1 - 0.55 * u ** 2)
        for sg in (1, -1):
            x1 = cx + sg * L; y1 = y + L * 0.18
            d.line([(cx, y), (x1, y1)], fill=c("#6f7a3c") + (255,), width=3)
            nseg = max(4, int(L / 9))
            for s in range(nseg):
                t = (s + 0.6) / nseg
                px, py = cx + sg * L * t, y + L * 0.18 * t
                l2 = 22 * (1 - 0.55 * t) + 5
                col = random.choice(verdes)
                d.polygon([(px - 6, py), (px + 6, py), (px + sg * 4, py + l2)], fill=col + (255,))
                d.polygon([(px - 6, py), (px + 6, py), (px - sg * 4, py - l2 * 0.85)], fill=col + (255,))
    im.save(os.path.join(OUT, "helecho_fronda.png"))
fronda()

def pelo(n=512):
    """Pelo fino del cusumbo en gris (multiplica el color de vertice) y su normal."""
    r = np.random.default_rng(9)
    h = np.zeros((n, n))
    for _ in range(9000):
        x0, y0 = r.integers(0, n, 2)
        L = int(r.integers(8, 22))
        ang = math.radians(r.normal(90, 12))
        for t in range(L):
            x = int(x0 + math.cos(ang) * t) % n
            y = int(y0 + math.sin(ang) * t) % n
            h[y, x] = max(h[y, x], 1 - t / L * 0.5)
    im = Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    h = np.asarray(im, np.float64) / 255
    g = 0.72 + 0.28 * h
    Image.fromarray((np.stack([g] * 3, -1) * 255).astype(np.uint8)).save(os.path.join(OUT, "cusumbo_pelo_col.png"))
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * 3, -gy * 3, np.ones_like(h)
    L = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nm = np.stack([nx / L, ny / L, nz / L], -1) * 0.5 + 0.5
    Image.fromarray((nm * 255).astype(np.uint8)).save(os.path.join(OUT, "cusumbo_pelo_nrm.png"))
pelo()
print(sorted(os.listdir(OUT)))
