"""Lectura y escritura COMPLETA de un modelo de COLMAP en binario (con los puntos 2D de cada imagen y las pistas de
cada punto 3D), para poder modificar poses y puntos y que las herramientas de COLMAP (bundle_adjuster,
image_registrator, model_analyzer) sigan aceptando el resultado. colmapbin.py solo lee y se salta los puntos 2D."""
import struct, numpy as np

DT2 = np.dtype([("x", "<f8"), ("y", "<f8"), ("id", "<i8")])
DTT = np.dtype([("img", "<u4"), ("idx", "<u4")])


def qvec2rot(q):
    w, x, y, z = q
    return np.array([[1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * w * z, 2 * x * z + 2 * w * y],
                     [2 * x * y + 2 * w * z, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * w * x],
                     [2 * x * z - 2 * w * y, 2 * y * z + 2 * w * x, 1 - 2 * x * x - 2 * y * y]])


def rot2qvec(R):
    from scipy.spatial.transform import Rotation
    x, y, z, w = Rotation.from_matrix(R).as_quat()
    return np.array([w, x, y, z])


def leer(carpeta):
    """devuelve (camaras_bytes, imagenes, puntos). imagenes[id] = dict(q, t, cam, name, p2 (estructurado x, y, id));
    puntos[id] = dict(xyz, rgb, err, track (estructurado img, idx))."""
    cam = open(carpeta + "/cameras.bin", "rb").read()
    datos = open(carpeta + "/images.bin", "rb").read()
    n, = struct.unpack_from("<Q", datos, 0); o = 8
    ims = {}
    for _ in range(n):
        iid, = struct.unpack_from("<I", datos, o); o += 4
        q = np.array(struct.unpack_from("<4d", datos, o)); o += 32
        t = np.array(struct.unpack_from("<3d", datos, o)); o += 24
        cid, = struct.unpack_from("<I", datos, o); o += 4
        e = datos.index(b"\x00", o); nombre = datos[o:e].decode(); o = e + 1
        np2, = struct.unpack_from("<Q", datos, o); o += 8
        p2 = np.frombuffer(datos, DT2, np2, o).copy(); o += 24 * np2
        ims[iid] = dict(q=q, t=t, cam=cid, name=nombre, p2=p2)
    datos = open(carpeta + "/points3D.bin", "rb").read()
    n, = struct.unpack_from("<Q", datos, 0); o = 8
    pts = {}
    for _ in range(n):
        pid, x, y, z, r, g, b, err, tl = struct.unpack_from("<Q3d3BdQ", datos, o); o += 51
        tr = np.frombuffer(datos, DTT, tl, o).copy(); o += 8 * tl
        pts[pid] = dict(xyz=np.array([x, y, z]), rgb=(r, g, b), err=err, track=tr)
    return cam, ims, pts


def escribir(carpeta, cam, ims, pts):
    import os
    os.makedirs(carpeta, exist_ok=True)
    open(carpeta + "/cameras.bin", "wb").write(cam)
    with open(carpeta + "/images.bin", "wb") as f:
        f.write(struct.pack("<Q", len(ims)))
        for iid in sorted(ims):
            v = ims[iid]
            f.write(struct.pack("<I4d3dI", iid, *v["q"], *v["t"], v["cam"]))
            f.write(v["name"].encode() + b"\x00")
            f.write(struct.pack("<Q", len(v["p2"]))); f.write(v["p2"].tobytes())
    with open(carpeta + "/points3D.bin", "wb") as f:
        f.write(struct.pack("<Q", len(pts)))
        for pid in sorted(pts):
            p = pts[pid]
            f.write(struct.pack("<Q3d3BdQ", pid, *p["xyz"], *p["rgb"], p["err"], len(p["track"])))
            f.write(p["track"].tobytes())


def centro(v):
    return -qvec2rot(v["q"]).T @ v["t"]


def parejas_por_puente(con, ims, por_nombre, grupo, prefijo, minimo=15, usar=None):
    """Parejas de puntos 3D (uno del grupo «sube», otro del «baja») que son el mismo punto fisico segun una imagen
    PUENTE que no esta en el modelo (una vista de una panoramica 360, de nombre <prefijo>...): si un rasgo de la vista
    quedo emparejado y verificado con un rasgo de una foto que sube y con otro de una foto que baja, los puntos 3D de
    esos dos rasgos son el mismo. Una panoramica ve desde un solo centro lo que cada sentido ve por su lado, y por eso
    ata lo que las fotos de ida y de vuelta no alcanzan a emparejar entre si.
    con: sqlite de la base de COLMAP; usar(nombre_de_la_vista) filtra vistas. Devuelve (parejas, atadas, pares_usados):
    parejas = {(id_sube, id_baja)}, atadas = puntos que ya son uno solo para los dos sentidos."""
    M = 2147483647
    nombre = {i: n for i, n in con.execute("select image_id, name from images")}
    obs, npar = {}, 0
    for pid, data in con.execute("select pair_id, data from two_view_geometries where rows >= ?", (minimo,)):
        a, b = divmod(pid, M); na, nb = nombre.get(a), nombre.get(b)
        if na is None or nb is None or na.startswith(prefijo) == nb.startswith(prefijo):
            continue
        mt = np.frombuffer(data, np.uint32).reshape(-1, 2)
        if nb.startswith(prefijo):
            v, nv, nc, kv, kc = b, nb, na, mt[:, 1], mt[:, 0]
        else:
            v, nv, nc, kv, kc = a, na, nb, mt[:, 0], mt[:, 1]
        if nc not in por_nombre or (usar is not None and not usar(nv)):
            continue
        i = por_nombre[nc]; g = grupo.get(i)
        if g not in ("sube", "baja"):
            continue
        ids = ims[i]["p2"]["id"][kc]; ok = ids >= 0
        npar += 1
        for k, x in zip(kv[ok], ids[ok]):
            obs.setdefault((v, int(k)), (set(), set()))[0 if g == "sube" else 1].add(int(x))
    pares, atadas = set(), set()
    for su, ba in obs.values():
        for x in su:
            for y in ba:
                if x == y:
                    atadas.add(x)
                else:
                    pares.add((x, y))
    return pares, atadas, npar
