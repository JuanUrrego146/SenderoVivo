# -*- coding: utf-8 -*-
"""
Correccion de color y exposicion de cada panorama: que se vea nitido, sin velo ni quemado.

Pedido de Juan del 27/11: «corregir color, sobreexposicion de las tomas, tienen que verse nitidas,
ni empanadas ni quemadas». Las fotos son JPEG de 8 bits: lo que salio blanco puro no se recupera,
pero si se puede quitar el velo, comprimir las luces que aun tienen detalle y devolver la definicion.

Pasos, en este orden:
1. Balance de blancos: ganancias por canal para que los pixeles casi grises (poca saturacion, luz
   media) queden neutros; limitadas a +-15 % para no inventar colores. Quita el tinte lila.
2. Punto negro: el 0,1 % mas oscuro va a negro; el blanco no se mueve (estirarlo quemaba mas
   cielo). Quita el velo general (la imagen «lavada»).
3. Contraste local: CLAHE sobre la luminancia (espacio Lab), rejilla de 8 x 16, limite 1,6 y mezclado al 70 %. Despues, una leve subida de
   las sombras para que lo oscuro bajo el dosel no quede negro. Es lo
   que quita lo empanado bajo el dosel sin oscurecer todo.
4. Luces: despues del enfoque, hombro suave de 230 hacia 247 en la luminancia: lo que en la foto
   no estaba quemado no puede terminar quemado, y las copas contra el cielo no se funden con el blanco.
5. Saturacion: +12 % en tonos medios, y el morado de las orillas de la lente (franja cromatica, tono
   lila contra el cielo) se lleva a gris.
6. Enfoque: mascara de enfoque de radio 1,2 px y cantidad 0,6, solo en la luminancia y solo en bordes
   reales (detalle de 3 niveles o mas); antes del contraste local, un filtro bilateral suave quita el
   grano, que si no se amplifica y hace pesar el doble a los panoramas.

uso como modulo: corregir(imagen_bgr) -> imagen_bgr
"""
import cv2
import numpy as np

UMBRAL_ENFOQUE = 3.0


def balance(im):
    f = im.astype(np.float32)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    m = (hsv[..., 1] < 60) & (hsv[..., 2] > 50) & (hsv[..., 2] < 230)
    if m.sum() < 1000:
        return f
    medias = f[m].mean(axis=0)
    g = medias.mean() / medias
    g = np.clip(g, 0.85, 1.15)
    return f * g


def niveles(f):
    lum = f.mean(axis=2)
    negro = np.percentile(lum, 0.1)
    return np.clip((f - negro) * (255.0 / (255.0 - negro)), 0, 255)


def corregir(im):
    H, W = im.shape[:2]
    f = niveles(balance(im))
    lab = cv2.cvtColor(f.astype(np.uint8), cv2.COLOR_BGR2LAB)
    L = lab[..., 0]
    # ruido: suavizado leve de la luminancia antes del contraste local, que si no lo amplifica
    L = cv2.bilateralFilter(L, 5, 12, 3)
    L0 = L.astype(np.float32)
    clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(16, 8))
    L2 = 0.7 * clahe.apply(L).astype(np.float32) + 0.3 * L0
    # mezcla: menos contraste local en las luces (no levantar el cielo)
    t = np.clip((L0 - 170) / 60, 0, 1)
    L2 = L2 * (1 - 0.6 * t) + L0 * 0.6 * t
    # sombras: leve subida para que lo oscuro bajo el dosel no quede negro
    x = L2 / 255.0
    L2 = (x + 0.12 * x * (1 - x) ** 2 * 4) * 255.0
    # enfoque en luminancia
    s = max(1.2 * W / 6144, 0.6)
    detalle = L2 - cv2.GaussianBlur(L2, (0, 0), s)
    # solo bordes reales: el grano de las sombras (detalle menor de 3 niveles) no se enfoca
    detalle = np.where(np.abs(detalle) < UMBRAL_ENFOQUE, 0, detalle)
    L2 = L2 + 0.6 * detalle
    # luces: lo que no estaba quemado no puede quedar quemado; hombro suave de 230 hacia 247
    alto = L2 > 230
    L2 = np.where(alto, 230 + 17 * (1 - np.exp(-(L2 - 230) / 17)), L2)
    L2 = np.where(L0 >= 250, np.maximum(L2, L0), L2)
    lab[..., 0] = np.clip(L2, 0, 255).astype(np.uint8)
    out = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, sat, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    medio = np.clip(1 - np.abs(v - 128) / 128, 0, 1)
    sat = sat * (1 + 0.12 * medio)
    lila = (h > 118) & (h < 165) & (v > 140)
    sat = np.where(lila, sat * 0.25, sat)
    hsv[..., 1] = np.clip(sat, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
