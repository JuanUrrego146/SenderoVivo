"""Prepara la carpeta de la reconstruccion propia de la Cumbre a partir de los cuadros crudos (sin la correccion de
lente del COLMAP viejo, que tenia anchos de campo distintos por toma).
- images/<toma>/<cuadro>.jpg: enlaces duros a E:/SenderoCelular2/frames (4K en las tomas .MOV, 720p en las .MP4);
- masks/<toma>/<cuadro>.jpg.png: personas en negro (YOLO, ya calculado en frames_personas), al tamano de la foto y
  engrosadas un 1 % del ancho para no dejar el borde de la silueta;
- listas lista_4k.txt y lista_720.txt para extraer cada grupo con su propia camara compartida.
uso: propia_preparar.py <salida>"""
import sys, os, glob, numpy as np, cv2

OUT = sys.argv[1]
FR = "E:/SenderoCelular2/frames"
PER = "E:/SenderoCelular2/frames_personas"
tomas = sorted(os.path.basename(d) for d in glob.glob(FR + "/c_*"))
l4k, l720 = [], []
nm = 0
for t in tomas:
    os.makedirs(os.path.join(OUT, "images", t), exist_ok=True)
    fs = sorted(glob.glob(os.path.join(FR, t, "*.jpg")))
    w = cv2.imread(fs[0]).shape[1]
    for f in fs:
        n = os.path.basename(f)
        dst = os.path.join(OUT, "images", t, n)
        if not os.path.exists(dst):
            os.link(f, dst)
        (l4k if w > 2000 else l720).append(t + "/" + n)
        # COLMAP 4.1.1 se salta la foto si falta su mascara: toda foto lleva una (blanca si no hay personas)
        mp = os.path.join(PER, t, n)
        H, W = (2160, 3840) if w > 2000 else (720, 1280)
        if os.path.exists(mp):
            m = cv2.imread(mp, cv2.IMREAD_GRAYSCALE)
            m = cv2.resize(m, (W, H), interpolation=cv2.INTER_NEAREST)
            k = max(3, int(W * 0.01)) | 1
            m = 255 - cv2.dilate(255 - m, np.ones((k, k), np.uint8))
            nm += 1
        else:
            m = np.full((H, W), 255, np.uint8)
        os.makedirs(os.path.join(OUT, "masks", t), exist_ok=True)
        cv2.imwrite(os.path.join(OUT, "masks", t, n + ".png"), m)
    print(t, len(fs), "4K" if w > 2000 else "720p")
open(os.path.join(OUT, "lista_4k.txt"), "w").write("\n".join(l4k) + "\n")
open(os.path.join(OUT, "lista_720.txt"), "w").write("\n".join(l720) + "\n")
print("4K %d, 720p %d, mascaras %d" % (len(l4k), len(l720), nm))
