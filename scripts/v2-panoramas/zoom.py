# uso: python zoom.py salida.jpg pNNN yaw pitch [ancho_grados=24]   (recorte del panorama de 6144 alrededor de un rumbo)
import sys, cv2, numpy as np
out, n, yaw, pitch = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
w = float(sys.argv[5]) if len(sys.argv) > 5 else 24
im = cv2.imread("E:/SenderoV2/base/%s.jpg" % n); H, W = im.shape[:2]
im = np.roll(im, W // 2 - int((yaw + 180) / 360 * W), axis=1)
cx, cy = W // 2, int((90 - pitch) / 180 * H); r = int(w / 360 * W)
c = im[max(0, cy - r):cy + r, cx - r:cx + r].copy()
cv2.line(c, (r, 0), (r, 20), (0, 0, 255), 3)
cv2.imwrite(out, cv2.resize(c, (900, 900 * c.shape[0] // c.shape[1])))
