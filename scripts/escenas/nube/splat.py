"""PLY de gaussianas (formato 3DGS: x y z, f_dc, f_rest, opacity, scale, rot) a diccionario de arreglos y de vuelta."""
import numpy as np


def leer(path):
    with open(path, "rb") as f:
        cab = b""
        while not cab.endswith(b"end_header\n"):
            cab += f.readline()
        props, n = [], 0
        for l in cab.decode("ascii", "replace").splitlines():
            p = l.split()
            if p[:2] == ["element", "vertex"]: n = int(p[2])
            elif p[:1] == ["property"]: props.append(p[2])
        datos = np.fromfile(f, np.float32, n * len(props)).reshape(n, len(props))
    col = {p: i for i, p in enumerate(props)}
    g = dict(
        xyz=datos[:, [col["x"], col["y"], col["z"]]].astype(np.float64),
        dc=datos[:, [col["f_dc_0"], col["f_dc_1"], col["f_dc_2"]]],
        rest=datos[:, [col["f_rest_%d" % i] for i in range(45) if "f_rest_%d" % i in col]],
        opacidad=datos[:, col["opacity"]],
        escala=datos[:, [col["scale_0"], col["scale_1"], col["scale_2"]]],
        rot=datos[:, [col["rot_0"], col["rot_1"], col["rot_2"], col["rot_3"]]])
    return g


def escribir(path, g):
    n = len(g["xyz"]); nr = g["rest"].shape[1]
    props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2"] + ["f_rest_%d" % i for i in range(nr)] + \
            ["opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    datos = np.concatenate([g["xyz"].astype(np.float32), np.zeros((n, 3), np.float32), g["dc"], g["rest"],
                            g["opacidad"][:, None], g["escala"], g["rot"]], axis=1).astype(np.float32)
    cab = "ply\nformat binary_little_endian 1.0\nelement vertex %d\n" % n + \
          "".join("property float %s\n" % p for p in props) + "end_header\n"
    with open(path, "wb") as f:
        f.write(cab.encode("ascii")); datos.tofile(f)


def sigmoide(x):
    return 1 / (1 + np.exp(-x))


def quat_mul(a, b):
    w1, x1, y1, z1 = a.T; w2, x2, y2, z2 = b.T
    return np.stack([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2], axis=1)


def rot2quat(R):
    m = R; t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2; q = [0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; q = [(m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s]
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; q = [(m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s]
    else:
        s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; q = [(m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s]
    return np.array(q)


def base_sh(d):
    """Funciones base reales de grado 1 a 3 con las constantes y el orden de 3DGS. d (N,3) unitarias -> (N,15)."""
    x, y, z = d[:, 0], d[:, 1], d[:, 2]
    xx, yy, zz = x * x, y * y, z * z
    return np.stack([-y, z, -x,
                     x * y, y * z, 2 * zz - xx - yy, x * z, xx - yy,
                     y * (3 * xx - yy), x * y * z, y * (4 * zz - xx - yy), z * (2 * zz - 3 * xx - 3 * yy),
                     x * (4 * zz - xx - yy), z * (xx - yy), x * (xx - 3 * yy)], 1)


def matriz_sh(R):
    """Matriz por bloques (15x15) que lleva coeficientes SH al marco rotado: c' = M c, ajustada por minimos
    cuadrados sobre direcciones al azar (exacta, porque cada grado es un subespacio invariante)."""
    d = np.random.default_rng(0).normal(size=(4000, 3)); d /= np.linalg.norm(d, axis=1, keepdims=True)
    B, Bp = base_sh(d), base_sh(d @ R.T)   # color(d') con d' = R d debe igualar al de antes en d
    M = np.zeros((15, 15))
    for a, b in [(0, 3), (3, 8), (8, 15)]:
        M[a:b, a:b] = np.linalg.lstsq(Bp[:, a:b], B[:, a:b], rcond=None)[0]
    return M


def transformar(g, s, R, t):
    """Aplica x' = s R x + t a posiciones, escalas, rotaciones y armonicos esfericos."""
    h = dict(g)
    h["xyz"] = (s * (R @ g["xyz"].T)).T + t
    h["escala"] = (g["escala"] + np.log(s)).astype(np.float32)
    q = g["rot"] / np.linalg.norm(g["rot"], axis=1, keepdims=True)
    h["rot"] = quat_mul(np.repeat(rot2quat(R)[None], len(q), 0), q).astype(np.float32)
    k = g["rest"].shape[1] // 3
    if k:
        M = matriz_sh(R)[:k, :k]
        sh = g["rest"].reshape(-1, 3, k)
        h["rest"] = np.einsum("ij,ncj->nci", M, sh).reshape(-1, 3 * k).astype(np.float32)
    return h
