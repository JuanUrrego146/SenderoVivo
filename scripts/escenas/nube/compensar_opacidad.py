"""Devuelve a una escena reducida la cobertura de la escena completa, subiendo la opacidad de lo que quedo.
Las escenas de Brush estan hechas sobre todo de gaussianas tenues que se apilan (en el Tramo 2 el 69 % tiene alfa menor
a 0,2 y solo el 0,9 % pasa de 0,9): al quitar una parte, sea por puntaje (muestrear_recorrido.py) o por fusion
(splat-transform -d), la pila adelgaza y el piso queda traslucido aunque ninguna zona se haya quedado sin gaussianas.
Medido en el Tramo 2: de 24,9 M a 15 M los pixeles con alfa menor a 0,9 pasan de 1,4 % a 5,5 %.
Metodo: la fuerza de una gaussiana es su profundidad optica en el centro por su area, F = -ln(1 - alfa) x (eje mayor x
eje medio). Se suma F por celda de VOXEL m en la escena completa y en la reducida, y en cada celda la profundidad optica
de las gaussianas de la reducida se multiplica por el cociente (entre 1 y TOPE): alfa' = 1 - (1 - alfa)^cociente. Asi
cada celda conserva la opacidad total que tenia. No mueve ni agranda nada y no toca el color.
Lee de la completa solo las columnas que usa; la salida es una copia de la reducida con la columna de opacidad cambiada.
uso: compensar_opacidad.py <completa.ply> <reducida.ply> <salida.ply> [voxel=0.12] [tope=10]"""
import sys, os, shutil, numpy as np

COMP, RED, OUT = sys.argv[1:4]
VOX = float(sys.argv[4]) if len(sys.argv) > 4 else 0.12
TOPE = float(sys.argv[5]) if len(sys.argv) > 5 else 10.0


def cabecera(path):
    with open(path, "rb") as f:
        cab = b""
        while not cab.endswith(b"end_header\n"):
            cab += f.readline()
    props, n = [], 0
    for l in cab.decode("ascii", "replace").splitlines():
        p = l.split()
        if p[:2] == ["element", "vertex"]: n = int(p[2])
        elif p[:1] == ["property"]: props.append(p[2])
    return len(cab), n, props


def columnas(path, nombres):
    ini, n, props = cabecera(path)
    mm = np.memmap(path, np.float32, "r", offset=ini, shape=(n, len(props)))
    out = []
    for nm in nombres:
        j = props.index(nm); col = np.empty(n, np.float32)
        for a in range(0, n, 2000000):
            col[a:a + 2000000] = mm[a:a + 2000000, j]
        out.append(col)
    return out


def fuerza_y_celda(path, origen=None):
    x, y, z, op, s0, s1, s2 = columnas(path, ["x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2"])
    alfa = 1 / (1 + np.exp(-np.clip(op.astype(np.float64), -12, 12)))
    tau = -np.log(1 - np.minimum(alfa, 0.999))
    s = np.sort(np.exp(np.clip(np.c_[s0, s1, s2].astype(np.float64), -20, 6)), axis=1)
    F = tau * s[:, 2] * s[:, 1]
    if origen is None:
        origen = np.array([x.min(), y.min(), z.min()], np.float64)
    # dos clases de tamano, cada una con su celda: las pequenas (eje mayor hasta VOX) en celdas de VOX y las grandes
    # en celdas 8 veces mayores. Sin separar, una sola gaussiana grande domina la suma de su celda (la fuerza va con
    # el area) y las pequenas que se quitaron a su lado quedarian sin compensar.
    grande = s[:, 2] > VOX
    lado = np.where(grande, 8 * VOX, VOX)
    c = [np.clip(((v - o) / lado).astype(np.int64), 0, (1 << 20) - 1) for v, o in zip((x, y, z), origen)]
    return F, (grande.astype(np.int64) << 61) | (c[0] << 40) | (c[1] << 20) | c[2], tau, origen


Fc, kc, _, origen = fuerza_y_celda(COMP)
Fr, kr, tau_r, _ = fuerza_y_celda(RED, origen)
print("completa %d, reducida %d (%.1f %%); fuerza total reducida/completa %.3f" % (len(Fc), len(Fr), 100 * len(Fr) / len(Fc), Fr.sum() / Fc.sum()), flush=True)
u, inv = np.unique(np.concatenate([kc, kr]), return_inverse=True)
sc = np.bincount(inv[:len(kc)], weights=Fc, minlength=len(u))
sr = np.bincount(inv[len(kc):], weights=Fr, minlength=len(u))
coc = np.clip(sc / np.maximum(sr, 1e-12), 1.0, TOPE)[inv[len(kc):]]
perdida = sc[sr == 0].sum() / sc.sum()
tau_n = tau_r * coc
alfa_n = np.clip(1 - np.exp(-tau_n), 1e-6, 0.9995)
op_n = np.log(alfa_n / (1 - alfa_n)).astype(np.float32)
shutil.copyfile(RED, OUT)
ini, n, props = cabecera(OUT)
mm = np.memmap(OUT, np.float32, "r+", offset=ini, shape=(n, len(props)))
j = props.index("opacity")
for a in range(0, n, 2000000):
    mm[a:a + 2000000, j] = op_n[a:a + 2000000]
mm.flush(); del mm
Fn = Fr * coc
print("cociente por gaussiana: mediana %.2f, p90 %.2f, en el tope %.1f %%; fuerza total tras compensar %.3f de la completa; "
      "fuerza de la completa en celdas sin ninguna gaussiana de la reducida: %.1f %%"
      % (np.median(coc), np.percentile(coc, 90), 100 * (coc >= TOPE).mean(), Fn.sum() / Fc.sum(), 100 * perdida), flush=True)
a0 = 1 - np.exp(-tau_r)
print("alfa antes: mediana %.3f, mayor a 0,9 el %.1f %%; despues: mediana %.3f, mayor a 0,9 el %.1f %%"
      % (np.median(a0), 100 * (a0 > 0.9).mean(), np.median(alfa_n), 100 * (alfa_n > 0.9).mean()))
