"""Lectura de modelos COLMAP en binario sin cargar los puntos 2D de cada imagen (images.bin pesa 1,7 GB)."""
import struct, numpy as np


def qvec2rot(q):
    w, x, y, z = q
    return np.array([
        [1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * w * z, 2 * x * z + 2 * w * y],
        [2 * x * y + 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * w * x],
        [2 * x * z - 2 * w * y, 2 * y * z + 2 * w * x, 1 - 2 * x * x - 2 * y * y]])


def leer_camaras(path):
    """id -> (modelo, ancho, alto, params). Modelos: 0 SIMPLE_PINHOLE, 1 PINHOLE, 2 SIMPLE_RADIAL, 3 RADIAL, 4 OPENCV."""
    npar = {0: 3, 1: 4, 2: 4, 3: 5, 4: 8, 5: 8, 6: 12, 7: 5, 8: 4, 9: 5, 10: 12}
    cams = {}
    with open(path, "rb") as f:
        n, = struct.unpack("<Q", f.read(8))
        for _ in range(n):
            cid, mod, w, h = struct.unpack("<iiQQ", f.read(24))
            p = struct.unpack("<%dd" % npar[mod], f.read(8 * npar[mod]))
            cams[cid] = (mod, w, h, np.array(p))
    return cams


def leer_imagenes(path):
    """id -> dict(name, R, t, cam, centro). Se salta los puntos 2D con seek."""
    ims = {}
    with open(path, "rb") as f:
        n, = struct.unpack("<Q", f.read(8))
        for _ in range(n):
            iid, = struct.unpack("<I", f.read(4))
            q = np.array(struct.unpack("<4d", f.read(32))); t = np.array(struct.unpack("<3d", f.read(24)))
            cid, = struct.unpack("<I", f.read(4))
            nombre = b""
            while True:
                c = f.read(1)
                if c == b"\x00": break
                nombre += c
            np2, = struct.unpack("<Q", f.read(8)); f.seek(24 * np2, 1)
            R = qvec2rot(q)
            ims[iid] = dict(name=nombre.decode(), R=R, t=t, cam=cid, centro=-R.T @ t)
    return ims


def leer_puntos(path):
    """Devuelve xyz (N,3), rgb (N,3), error (N,), y la lista de imagenes que ve cada punto."""
    with open(path, "rb") as f:
        datos = f.read()
    n, = struct.unpack_from("<Q", datos, 0); o = 8
    xyz = np.empty((n, 3)); rgb = np.empty((n, 3), np.uint8); err = np.empty(n); vistas = []
    for i in range(n):
        _, x, y, z, r, g, b, e, tl = struct.unpack_from("<Q3d3Bd Q".replace(" ", ""), datos, o); o += 51
        xyz[i] = (x, y, z); rgb[i] = (r, g, b); err[i] = e
        tr = np.frombuffer(datos, np.uint32, 2 * tl, o).reshape(-1, 2)[:, 0]; o += 8 * tl
        vistas.append(tr)
    return xyz, rgb, err, vistas
