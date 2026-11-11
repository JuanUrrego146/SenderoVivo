"""Deja en un fondo 360 SOLO el cielo real y lo continua donde la panoramica tenia arboles u otra cosa cercana.
El fondo de la app esta en el infinito: sirve para el cielo, que se ve igual desde todo el recorrido, pero un arbol
fotografiado desde un punto quedaria pintado en el cielo y quieto al caminar. Por eso:
- cielo = pixeles por encima del horizonte, claros y poco saturados (V > VMIN, S < 80) o azulados. Se le quitan los
  cables (lineas oscuras finas: sombrero negro de 21 px mayor que 12), las motas, las manchas menores al 0,2 % de la
  imagen (claros entre hojas dentro de una copa) y se encoge 12 px para no dejar el borde oscuro de las hojas;
- lo que no es cielo se rellena por continuidad con una piramide (empujar y tirar) SOLO sobre el hemisferio de arriba:
  cada hueco toma el promedio del cielo conocido a la escala mas fina que lo alcance, con la longitud cerrada (da la
  vuelta en 360 grados); donde ni la escala mas gruesa alcanza, el promedio de todo el cielo;
- por debajo del horizonte el relleno se funde hacia un tono de suelo entre 0 y -10 grados: esa parte la tapa la escena.
Funciona igual con el archivo ya volteado para PlayCanvas. uso: propia_cielo360.py <fondo.jpg> <salida.jpg> [vmin=135]"""
import sys, os, numpy as np, cv2

SRC, OUT = sys.argv[1:3]
VMIN = int(sys.argv[3]) if len(sys.argv) > 3 else 135
E = cv2.imread(SRC)
H, W = E.shape[:2]
lat = (0.5 - (np.arange(H) + 0.5) / H) * 180
LAT = np.repeat(lat[:, None], W, 1)
hsv = cv2.cvtColor(E, cv2.COLOR_BGR2HSV)
h_, s_, v_ = hsv[..., 0], hsv[..., 1], hsv[..., 2]
cielo = (LAT > 1.0) & (((v_ > VMIN) & (s_ < 80)) | ((h_ > 95) & (h_ < 130) & (v_ > 110) & (s_ < 160)))
# lo que el fondo crudo dejo sin cubrir viene en magenta (y su borde, contaminado por el JPG): no es cielo
magenta = (E[..., 1].astype(int) < 90) & (E[..., 0] > 150) & (E[..., 2] > 150)
cielo &= ~(cv2.dilate(magenta.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0)
tres = lambda a: np.hstack([a, a, a])
cables = cv2.morphologyEx(tres(v_), cv2.MORPH_BLACKHAT, np.ones((21, 21), np.uint8)) > 12
cables = cv2.dilate(cables.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
m = tres(cielo.astype(np.uint8)); m[cables] = 0
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m[:, W:2 * W])
mm = m[:, W:2 * W].copy()
for j in range(1, n):
    if st[j, cv2.CC_STAT_AREA] < 0.002 * H * W:
        mm[lab == j] = 0
m = cv2.erode(tres(mm), np.ones((25, 25), np.uint8))[:, W:2 * W]
cielo = m > 0
h0 = int((LAT[:, 0] > 1.0).sum())
print("cielo real: %.1f %% del hemisferio superior" % (100 * cielo[:h0].mean()))

Es = E[:h0].astype(np.float32); ms = cielo[:h0].astype(np.float32)
media = (Es * ms[..., None]).sum((0, 1)) / max(ms.sum(), 1)


def bajar(img, peso):
    tam = (max(1, img.shape[1] // 2), max(1, img.shape[0] // 2))
    a = cv2.resize(img * peso[..., None], tam, interpolation=cv2.INTER_AREA)
    p = cv2.resize(peso, tam, interpolation=cv2.INTER_AREA)
    return a / np.maximum(p[..., None], 1e-6), p


niveles = [(Es, ms)]
while niveles[-1][0].shape[0] > 2:
    niveles.append(bajar(*niveles[-1]))
img, peso = niveles[-1]
relleno = np.where(peso[..., None] > 1e-4, img, media)
for img, peso in reversed(niveles[:-1]):
    r = relleno.shape[1]
    pad = np.hstack([relleno[:, -2:], relleno, relleno[:, :2]])          # longitud cerrada
    f = img.shape[1] / r
    up = cv2.resize(pad, (int(round(pad.shape[1] * f)), img.shape[0]), interpolation=cv2.INTER_LINEAR)
    k = int(round(2 * f))
    up = up[:, k:k + img.shape[1]]
    if up.shape[1] < img.shape[1]:
        up = np.hstack([up, up[:, -1:].repeat(img.shape[1] - up.shape[1], 1)])
    c = np.clip(peso, 0, 1)[..., None]
    relleno = img * c + up * (1 - c)
sal = E.astype(np.float32)
# cielo real donde hay, con el borde fundido en 10 px hacia el relleno
w_real = np.clip(cv2.GaussianBlur(ms, (0, 0), 20) * 2 - 1, 0, 1)[..., None] * ms[..., None]
arriba = Es * w_real + cv2.GaussianBlur(relleno, (0, 0), 2) * (1 - w_real)
# MEDIA_BGR="b,g,r": lleva el color medio del cielo al de las fotos del celular (otro dia, otra luz), sin tocar el contraste
if os.environ.get("MEDIA_BGR"):
    obj = np.array([float(x) for x in os.environ["MEDIA_BGR"].split(",")], np.float32)
    act = (arriba * ms[..., None]).sum((0, 1)) / max(ms.sum(), 1)
    arriba = np.clip(arriba * (obj / np.maximum(act, 1)), 0, 255)
    print("color medio del cielo de", act.round(0), "a", obj.round(0))
sal[:h0] = arriba
# bajo el horizonte: la ultima fila del cielo fundida hacia un tono de suelo
suelo = np.array([58, 70, 78], np.float32)
base = cv2.GaussianBlur(arriba[-1:].repeat(H - h0, 0), (0, 0), 8)
t = (np.clip((1.0 - LAT[h0:]) / 11.0, 0, 1) ** 1.5)[..., None]
sal[h0:] = base * (1 - t) + suelo * t
cv2.imwrite(OUT, np.clip(sal, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("escrito", OUT)
