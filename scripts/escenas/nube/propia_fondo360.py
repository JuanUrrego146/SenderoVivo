"""Fondo 360 real para una escena: arma un equirectangular en el marco de la escena (+Y arriba) a partir de las 8 vistas
rectilineas de una panoramica de la Insta360 ya ubicadas por COLMAP en la alineacion propia (orientacion exacta).
Cada pixel del equirectangular toma el color de las vistas que lo ven, pesadas por la cercania al centro de cada vista
(coseno a la potencia 4) para que no se noten las uniones, sin usar lo tapado por la mascara (operador, carpa,
personas). Lo que ninguna vista ve (el suelo bajo el operador) se rellena con el color medio de la franja de suelo
visible, porque la escena lo tapa con su piso. Se arma con columna u = 0,5 + atan2(x, z) / 2 pi y fila
v = 0,5 - asin(y) / pi, y se escribe volteado en horizontal: PlayCanvas 2.21 muestrea el equirectangular del fondo con
x invertida (medido en la app: correlacion 0,95 con la vista volteada contra 0,02 sin voltear), asi que el archivo
queda listo para skyboxUrl sin giro.
Con varias panoramicas separadas por coma, la primera manda y las demas solo llenan lo que ella no ve (el cielo y lo
lejano se ven igual desde todas). Lo que siga sin cubrir arriba de -10 grados se rellena por continuidad (inpaint).
uso: propia_fondo360.py <sparse> <images> <masks> <pano[,pano2,...]> <salida.jpg> [ancho=4096]"""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, IMS, MKS, PANO, OUT = sys.argv[1:6]
W = int(sys.argv[6]) if len(sys.argv) > 6 else 4096
H = W // 2
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
PANOS = PANO.split(",")
u = (np.arange(W) + 0.5) / W; v = (np.arange(H) + 0.5) / H
lon = (u - 0.5) * 2 * np.pi; lat = (0.5 - v) * np.pi
LON, LAT = np.meshgrid(lon, lat)
d = np.stack([np.cos(LAT) * np.sin(LON), np.sin(LAT), np.cos(LAT) * np.cos(LON)], -1).astype(np.float32)
out = np.zeros((H, W, 3), np.float32); vis = np.zeros((H, W), bool)
for pano in PANOS:
  vistas = [v for v in ims.values() if v["name"].startswith("i360/") and v["name"].endswith("_%s.jpg" % pano)]
  acc = np.zeros((H, W, 3), np.float64); pes = np.zeros((H, W), np.float64)
  for vw in vistas:
      mod, w, h, p = cams[vw["cam"]]
      fx, fy, cx, cy = (p[0], p[1], p[2], p[3]) if mod == 1 else (p[0], p[0], p[1], p[2])
      im = cv2.imread(os.path.join(IMS, vw["name"])).astype(np.float32)
      mk = cv2.imread(os.path.join(MKS, vw["name"] + ".png"), cv2.IMREAD_GRAYSCALE)
      c = d @ vw["R"].T.astype(np.float32)          # direccion en la camara
      z = c[..., 2]
      ok = z > 0.05
      x = np.where(ok, fx * c[..., 0] / np.maximum(z, 1e-3) + cx, -1).astype(np.float32)
      y = np.where(ok, fy * c[..., 1] / np.maximum(z, 1e-3) + cy, -1).astype(np.float32)
      col = cv2.remap(im, x, y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
      m = cv2.remap(mk if mk is not None else np.full((h, w), 255, np.uint8), x, y, cv2.INTER_NEAREST,
                    borderMode=cv2.BORDER_CONSTANT, borderValue=0)
      dentro = ok & (x >= 0) & (x < w - 1) & (y >= 0) & (y < h - 1) & (m > 0)
      cosang = z / np.linalg.norm(c, axis=-1)
      wgt = np.where(dentro, cosang ** 4, 0)
      acc += col * wgt[..., None]; pes += wgt
  nuevo = (pes > 1e-4) & ~vis
  out[nuevo] = (acc[nuevo] / pes[nuevo, None]).astype(np.float32)
  vis |= nuevo
  print("%s: %d vistas, cubierto acumulado %.1f %%" % (pano, len(vistas), 100 * vis.mean()))
if os.environ.get("CRUDO") == "1":
    # sin rellenar: lo que ninguna vista cubre queda magenta, para que propia_cielo360.py lo trate como "no es cielo"
    out[~vis] = (255, 0, 255)
    cv2.imwrite(OUT, cv2.flip(np.clip(out, 0, 255).astype(np.uint8), 1), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("crudo: cubierto %.1f %% del fondo; escrito %s" % (100 * vis.mean(), OUT))
    sys.exit(0)
banda = vis & (LAT < np.radians(-10)) & (LAT > np.radians(-35))
fondo = np.median(out[banda], axis=0) if banda.any() else np.array([90, 100, 110], np.float32)
out[~vis] = fondo
huecos = (~vis & (LAT > np.radians(-10))).astype(np.uint8) * 255
if huecos.any():
    out = cv2.inpaint(np.clip(out, 0, 255).astype(np.uint8), huecos, 25, cv2.INPAINT_TELEA).astype(np.float32)
# suaviza la costura con lo rellenado
borde = cv2.dilate((~vis).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
suave = cv2.GaussianBlur(out, (31, 31), 0)
out[borde] = suave[borde]
cv2.imwrite(OUT, cv2.flip(np.clip(out, 0, 255).astype(np.uint8), 1), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("cubierto %.1f %% del fondo; arriba del horizonte %.1f %%; escrito %s"
      % (100 * vis.mean(), 100 * vis[LAT > 0].mean(), OUT))
