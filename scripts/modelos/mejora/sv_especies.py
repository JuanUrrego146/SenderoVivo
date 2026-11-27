"""Plumaje de cada especie: colores por zona, formula alar y cola.

Las zonas se describen con coordenadas del ave:
  s      0 en el centro de la cabeza, 1 en la base de la cola (a lo largo del eje del cuerpo)
  theta  0 en la linea del lomo, 180 en la linea del vientre
  phi    en la cabeza: 0 coronilla, 90 costado (altura del ojo), 180 garganta
  lam    en la cabeza: 0 hacia el pico, 180 hacia la nuca
  cab    1 en la cabeza, 0 en el cuerpo;  dist_cab: distancia al centro de la cabeza en radios de cabeza

Especies segun config/pois.json y docs/06: Buteo swainsoni, Colibri coruscans, Zonotrichia capensis,
Cinnycerthia unirufa, Orochelidon murina, Contopus fumigatus, Troglodytes musculus, Andigena nigrirostris,
Vireo olivaceus. Criterio de Juan (18/11/2026): aves de los cerros orientales de Bogota. El modelo «Nuca Blanca»
tiene forma de atlapetes y se pinta como Atlapetes pallidinucha, el de los cerros.
"""
import numpy as np

from sv_aves import suave, banda
from sv_plumaje import Pintor

NEGRO = "#1b1918"


class Zonas:
    """Mascaras comunes sobre las coordenadas del ave."""

    def __init__(self, ave, c):
        self.c = c
        self.s, self.th, self.phi, self.lam = c["s"], c["theta"], c["phi"], c["lam"]
        self.cab, self.dc, self.d_ojo = c["cab"], c["dist_cab"], c["d_ojo"]
        self.po, self.lo = ave.phi_ojo, ave.lam_ojo
        self.dor = 1 - suave(62, 105, self.th)
        self.ven = suave(100, 140, self.th)
        self.lat = banda(self.th, 72, 128, 14)

    def tramo(self, a, b, sv=0.06):
        return banda(self.s, a, b, sv)

    def corona(self, hasta=None, sv=6):
        hasta = self.po - 26 if hasta is None else hasta
        return self.cab * (1 - suave(hasta - sv, hasta + sv, self.phi))

    def garganta(self, desde=124, lam_max=138):
        return self.cab * suave(desde - 9, desde + 9, self.phi) * (1 - suave(lam_max - 12, lam_max + 12, self.lam))

    def franja(self, a, b, sv=4, lam0=None, lam1=None):
        """Franja de la cabeza entre dos angulos phi relativos al ojo (negativo = encima del ojo)."""
        m = self.cab * banda(self.phi, self.po + a, self.po + b, sv)
        if lam0 is not None:
            m = m * suave(lam0 - 6, lam0 + 6, self.lam)
        if lam1 is not None:
            m = m * (1 - suave(lam1 - 6, lam1 + 6, self.lam))
        return m

    def nuca(self, desde=135):
        return self.cab * suave(desde - 12, desde + 12, self.lam)

    def cerca_ojo(self, r=2.2):
        return 1 - suave(r * 0.8, r * 1.2, self.d_ojo)

    def cuello(self, a=1.18, b=1.92, sv=0.13):
        return banda(self.dc, a, b, sv)


def _filas(may, med, men, inf, punta_may=None, punta_med=None, borde_may=None, t_punta=0.97, celda="cob_lisa", celda_men="cob_lisa",
           fuerza_borde=0.6, n=(15, 13, 16, 17, 18, 20), n_inf=(14, 13, 15, 18), largo_may=0.50, color2=None, u_mezcla=(0.35, 0.55)):
    men = [men] * 4 if isinstance(men, str) else list(men)
    inf = [inf] * 4 if isinstance(inf, str) else list(inf)
    filas = _filas_base(may, med, men, inf, punta_may, punta_med, borde_may, t_punta, celda, celda_men, fuerza_borde, n, n_inf, largo_may)
    if color2 is not None:
        for f in filas:
            if f.get("dorsal", True):
                f["color2"] = color2
                f["u_mezcla"] = u_mezcla
    return filas


def _filas_base(may, med, men, inf, punta_may, punta_med, borde_may, t_punta, celda, celda_men, fuerza_borde, n, n_inf, largo_may):
    return [
        dict(n=n[0], v=0.03, largo=largo_may, color=may, borde=borde_may, fuerza_borde=fuerza_borde, punta=punta_may, t_punta=t_punta, nivel=1, ancho=0.50, celda=celda),
        dict(n=n[1], v=0.00, largo=0.30, color=med, punta=punta_med, t_punta=t_punta, nivel=2, ancho=0.60, u1=0.82, celda=celda),
        dict(n=n[2], v=-0.02, largo=0.22, color=men[0], nivel=3, ancho=0.70, u1=0.95, celda=celda_men),
        dict(n=n[3], v=-0.05, largo=0.17, color=men[1], nivel=4, ancho=0.75, u1=0.95, desfase=0.5, celda=celda_men),
        dict(n=n[4], v=-0.08, largo=0.13, color=men[2], nivel=5, ancho=0.80, u1=0.95, celda=celda_men),
        dict(n=n[5], v=-0.10, largo=0.09, color=men[3], nivel=6, ancho=0.85, u1=0.96, desfase=0.5, celda=celda_men),
        dict(n=n_inf[0], v=0.03, largo=0.40, color=inf[0], nivel=1, dorsal=False, ancho=0.50, u0=0.10),
        dict(n=n_inf[1], v=0.00, largo=0.28, color=inf[1], nivel=2, dorsal=False, ancho=0.60, u0=0.12, u1=0.90),
        dict(n=n_inf[2], v=-0.04, largo=0.18, color=inf[2], nivel=3, dorsal=False, ancho=0.70, u0=0.12, u1=0.95),
        dict(n=n_inf[3], v=-0.08, largo=0.12, color=inf[3], nivel=4, dorsal=False, ancho=0.80, u0=0.12, u1=0.95, desfase=0.5),
    ]


ALA_REDONDA = dict(n_prim=9, n_sec=6, n_ter=3, largo_prim=[0.70, 0.80, 0.88, 0.94, 0.98, 1.00, 0.98, 0.92, 0.80], ang_prim=(14, 68),
                   largo_sec=0.66, ang_sec=(8, -2), largo_ter=[0.60, 0.54, 0.46], ang_ter=(-8, -22),
                   ancho_prim=0.19, ancho_sec=0.27, ancho_ter=0.30)
ALA_PUNTIAGUDA = dict(n_prim=9, n_sec=6, n_ter=3, largo_prim=[0.62, 0.74, 0.88, 1.02, 1.14, 1.24, 1.30, 1.30, 1.20], ang_prim=(10, 74),
                      largo_sec=0.56, ang_sec=(6, -2), largo_ter=[0.52, 0.46, 0.40], ang_ter=(-8, -20),
                      ancho_prim=0.16, ancho_sec=0.27, ancho_ter=0.30)
ALA_GOLONDRINA = dict(n_prim=9, n_sec=6, n_ter=3, largo_prim=[0.55, 0.68, 0.84, 1.00, 1.18, 1.34, 1.48, 1.58, 1.60], ang_prim=(8, 70),
                      largo_sec=0.46, ang_sec=(6, -2), largo_ter=[0.44, 0.40, 0.34], ang_ter=(-8, -20),
                      ancho_prim=0.17, ancho_sec=0.28, ancho_ter=0.30)
ALA_COLIBRI = dict(n_prim=10, n_sec=6, n_ter=2, largo_prim=[0.50, 0.62, 0.76, 0.90, 1.04, 1.18, 1.30, 1.40, 1.48, 1.50], ang_prim=(6, 80),
                   largo_sec=0.36, ang_sec=(6, 0), largo_ter=[0.34, 0.30], ang_ter=(-6, -16),
                   ancho_prim=0.125, ancho_sec=0.30, ancho_ter=0.32)
ALA_RAPAZ = dict(n_prim=10, n_sec=12, n_ter=4, largo_prim=[0.78, 0.84, 0.90, 0.96, 1.04, 1.12, 1.18, 1.20, 1.14, 0.98], ang_prim=(8, 72),
                 largo_sec=0.74, ang_sec=(6, -3), largo_ter=[0.64, 0.58, 0.50, 0.42], ang_ter=(-8, -24),
                 ancho_prim=0.16, ancho_sec=0.20, ancho_ter=0.22)
ALA_TUCAN = dict(n_prim=10, n_sec=10, n_ter=3, largo_prim=[0.74, 0.80, 0.86, 0.90, 0.94, 0.96, 0.95, 0.90, 0.82, 0.70], ang_prim=(12, 66),
                 largo_sec=0.72, ang_sec=(8, -2), largo_ter=[0.66, 0.60, 0.52], ang_ter=(-8, -22),
                 ancho_prim=0.19, ancho_sec=0.25, ancho_ter=0.30)


# --------------------------------------------------------------------------- copeton (Zonotrichia capensis)

def _pinta_copeton(ave, c):
    z = Zonas(ave, c)
    s, th, phi, lam, cab, dc = z.s, z.th, z.phi, z.lam, z.cab, z.dc
    p = Pintor(c, "#d6d1c6", "cont_liso")
    p.zona(z.ven * z.tramo(0.20, 0.45, 0.08), color="#c6c2ba")                       # pecho gris claro
    p.zona(z.ven * z.tramo(0.47, 0.92, 0.10), color="#e8e4db")                       # vientre blanquecino
    p.zona(banda(th, 82, 128, 14) * z.tramo(0.36, 0.98, 0.10), color="#b89d80")      # flancos ante
    p.zona(z.ven * suave(0.88, 1.0, s), color="#cfbb9f", tam=1.2)                    # infracoberteras de la cola
    p.zona(z.dor * z.tramo(0.24, 0.72), color="#ad7d47", celda="cont_estria", tam=1.15)        # manto estriado
    p.zona(z.dor * suave(0.68, 0.80, s), color="#8f6c48", celda="cont_liso", tam=1.25)         # rabadilla
    p.zona(cab, color="#8f9296", celda="cont_liso2")                                             # cabeza gris
    p.zona(cab * suave(122, 140, phi) * (1 - suave(118, 140, lam)), color="#f0ede5")            # garganta blanca
    p.zona(suave(140, 158, th) * banda(dc, 0.6, 1.75, 0.15), color="#f0ede5")
    p.zona(cab * banda(phi, 15, 35, 4) * suave(22, 36, lam), color=NEGRO)                       # listas de la corona
    p.zona(z.franja(-6, 9, lam0=z.lo + 11), color=NEGRO)                                        # lista postocular
    p.zona(cab * banda(phi, 112, 124, 4) * banda(lam, 40, 108, 10), color=NEGRO)                # bigotera
    p.zona(cab * banda(phi, z.po + 12, 106, 6) * banda(lam, 58, 150, 12), color="#7f7d7a")      # auriculares
    p.zona(z.cuello() * (1 - suave(110, 138, th)) * suave(92, 118, lam), color="#8f4a22", celda="cont_liso")   # collar rufo
    p.zona(banda(dc, 1.72, 2.35, 0.10) * banda(th, 104, 150, 10), color=NEGRO)                  # parches del pecho
    p.zona(cab * (1 - suave(30, 48, phi)) * banda(lam, 72, 150, 15), tam=1.35, lev=1.5)         # copete
    return p


def copeton():
    return {
        "pinta": _pinta_copeton,
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(ALA_REDONDA, envergadura=1.27,
                    color=dict(remera="#3a3028", borde="#a57a4c", ter="#221b16", borde_ter="#b5682e", fuerza_borde=0.7,
                               brazo="#6e4a30", brazo_inf="#c9c3b8"),
                    filas=_filas("#2a221c", "#241d18", ["#7d5536", "#7a5335", "#765033", "#6e4a30"],
                                 ["#b9b3a8", "#cfcabf", "#d8d3c8", "#d2ccc0"], punta_may="#e9e3d3", punta_med="#eee9da", borde_may="#9a5f30")),
        "cola": dict(n=12, abanico=10.0, largo=1.0, largo_centro=0.96, largo_borde=1.0, ancho=0.17,
                     color=dict(base="#3d332b", borde="#8a6f52", fuerza_borde=0.55)),
        "base": dict(pico="#58565a", pico_inf="#8f8a86", patas="#b08a72", iris="#2a1a12"),
    }


# --------------------------------------------------------------------------- aguililla de Swainson (Buteo swainsoni), morfo claro

def _pinta_aguililla(ave, c):
    z = Zonas(ave, c)
    s, th, cab = z.s, z.th, z.cab
    p = Pintor(c, "#efe6d6", "cont_liso")                                                        # vientre blanco crema
    p.zona(z.lat * z.tramo(0.45, 0.95, 0.08), color="#e3cba6", celda="cont_barras")              # flancos barrados
    p.zona(z.ven * suave(0.86, 0.98, s), color="#efe4cf", tam=1.25)                              # infracoberteras
    p.zona((1 - z.dor) * z.tramo(0.17, 0.43, 0.05), color="#73431f", celda="cont_liso", tam=1.1)  # babero rufo
    p.zona(z.dor * suave(-0.30, -0.10, s), color="#7d6850", celda="cont_borde", tam=1.35)          # dorso pardo oscuro escamado
    p.zona(z.dor * suave(0.90, 0.98, s), color="#e9e2d2", celda="cont_liso", tam=1.3)            # supracoberteras claras
    p.zona(cab, color="#4d3927", celda="cont_liso2")                                              # cabeza parda
    p.zona(z.garganta(desde=118, lam_max=125), color="#f4f0e8")                                  # garganta blanca
    p.zona(z.ven * banda(z.dc, 0.7, 1.5, 0.12), color="#f4f0e8")
    p.zona(cab * (1 - suave(24, 40, z.lam)) * (1 - suave(100, 130, z.phi)), color="#e6dccb")     # frente y lores claros
    p.zona(z.franja(-5, 7, lam0=z.lo + 12), color="#32261b")                                     # linea ocular
    return p


def aguililla():
    return {
        "pinta": _pinta_aguililla,
        "cuerpo": dict(largo=0.075, largo_cabeza=0.45, densidad=0.31, levante=12.0, candidatos=170000),
        "ala": dict(ALA_RAPAZ, envergadura=2.1,
                    color=dict(remera="#3f362e", borde="#6a5a48", ter="#3a3028", borde_ter="#7a6850", fuerza_borde=0.45,
                               celda_prim="prim_barras", celda_sec="sec_barras", celda_ter="cob_larga", brazo="#4a3b2d", brazo_inf="#e9e0cc"),
                    filas=_filas("#46382b", "#4a3b2d", ["#5a4835", "#564533", "#524231", "#4a3b2d"],
                                 ["#ece3cf", "#efe7d6", "#f1eadb", "#e6dbc4"], borde_may="#84705a", fuerza_borde=0.5,
                                 n=(22, 20, 24, 25, 26, 28), n_inf=(20, 20, 22, 24))),
        "cola": dict(n=12, abanico=13.0, largo=1.0, largo_centro=1.0, largo_borde=0.95, ancho=0.19,
                     color=dict(base="#8a7f72", celda="cola_banda", punta="#d9d1c2", t_punta=0.95, fuerza_punta=0.8)),
        "base": dict(pico="#26272a", pico_inf="#2c2d30", pico_cera="#d6b23c", patas="#d4ad3a", iris="#3a2414"),
    }


# --------------------------------------------------------------------------- colibri chillon (Colibri coruscans)

def _pinta_colibri(ave, c):
    z = Zonas(ave, c)
    s, cab = z.s, z.cab
    p = Pintor(c, "#1c8250", "cont_liso")                                                         # verde brillante
    p.zona(z.dor, color="#2a8442")                                                                # dorso verde dorado
    p.zona(z.ven * z.tramo(0.42, 0.74, 0.07) * suave(138, 160, z.th), color="#3a2fa6")            # parche violeta del vientre
    p.zona(z.ven * suave(0.86, 0.98, s), color="#5f8f6a", tam=1.2)                                # infracoberteras
    p.zona(cab, color="#208648", celda="cont_liso2")
    p.zona(z.franja(-2, 40, sv=6, lam0=z.lo - 4), color="#4a2fb4")                                # parche auricular violeta
    p.zona(z.cuello(0.95, 1.85, 0.12) * banda(z.th, 62, 128, 12), color="#4a2fb4")                # se prolonga por el cuello
    p.zona(z.garganta(desde=128, lam_max=78), color="#3f33aa")                                    # barbilla violeta
    return p


def colibri():
    return {
        "pinta": _pinta_colibri,
        "cuerpo": dict(largo=0.088, largo_cabeza=0.50, densidad=0.32, levante=11.0, candidatos=170000, sombra=0.58),
        "material_cuerpo": dict(metalico=0.20, rugosidad=0.44, fuerza_normal=0.15),
        "ala": dict(ALA_COLIBRI, envergadura=1.6,
                    color=dict(remera="#2c2431", borde="#3a3040", ter="#2a2a30", borde_ter="#2f5a40", fuerza_borde=0.4,
                               brazo="#1f6f3c", brazo_inf="#4a4650", brazo2="#2c2431"),
                    filas=_filas("#1f6a3e", "#217440", ["#237a42", "#237a42", "#217440", "#1f6f3c"],
                                 ["#4a4650", "#514d58", "#56525c", "#4d4954"], largo_may=0.34, color2="#2c2431", u_mezcla=(0.22, 0.42))),
        "cola": dict(n=10, abanico=12.0, largo=1.0, largo_centro=0.92, largo_borde=1.0, ancho=0.20,
                     color=dict(base="#1d6068", banda="#12183a", t_banda=(0.66, 0.90), punta="#1f5560", t_punta=0.94, fuerza_punta=0.7)),
        "base": dict(pico="#121213", pico_inf="#151516", patas="#2a2a2c", iris="#1a120c", pico_rug=0.3),
    }


# --------------------------------------------------------------------------- cucarachero rufo (Cinnycerthia unirufa)

def _pinta_cucarachero(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#9c5c2e", "cont_liso")
    p.zona(z.dor, color="#87481f")
    p.zona(z.ven * z.tramo(0.45, 0.95, 0.1), color="#a26434")
    p.zona(z.cab, color="#8a4b21", celda="cont_liso2")
    p.zona(z.corona(), color="#7d421c")
    p.zona(z.garganta(), color="#aa6a3c")
    p.zona(z.franja(-9, 9, lam1=z.lo - 6) * suave(14, 26, z.lam), color="#3a2a20")               # lores oscuros
    return p


def cucarachero():
    return {
        "pinta": _pinta_cucarachero,
        "cuerpo": dict(largo=0.095, largo_cabeza=0.46, densidad=0.31, levante=14.0, candidatos=140000),
        "ala": dict(ALA_REDONDA, envergadura=1.08,
                    color=dict(remera="#8a4c22", borde="#a05c2c", ter="#87481f", borde_ter="#a05c2c", fuerza_borde=0.4,
                               celda_prim="prim_barras", celda_sec="sec_barras", celda_ter="sec_barras", brazo="#7d431d", brazo_inf="#a87446"),
                    filas=_filas("#8a4b21", "#87481f", "#85471f", ["#a87446", "#ae7a4c", "#b28050", "#a87446"])),
        "cola": dict(n=12, abanico=11.0, largo=1.0, largo_centro=1.0, largo_borde=0.86, ancho=0.18,
                     color=dict(base="#8a4c22", celda="cola_barras")),
        "base": dict(pico="#2a2220", pico_inf="#4a3a32", patas="#3f332d", iris="#4a2a18"),
    }


# --------------------------------------------------------------------------- golondrina plomiza (Orochelidon murina)

def _pinta_golondrina(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#6d6965", "cont_liso")                                                        # partes inferiores gris humo
    p.zona(z.ven * z.tramo(0.45, 0.9, 0.1), color="#76726d")
    p.zona(z.ven * suave(0.86, 0.98, z.s), color="#3c3c40", tam=1.2)                             # infracoberteras oscuras
    p.zona(1 - suave(82, 110, z.th), color="#1c2a3a")                                            # dorso negro azulado; costados y vientre gris humo
    p.zona(z.cab, color="#1c2a3a", celda="cont_liso2")
    p.zona(z.cab * suave(z.po + 6, z.po + 22, z.phi), color="#5f5b58")                           # mejillas y garganta grises
    p.zona(z.franja(-10, 10, lam1=z.lo - 6), color="#14181e")                                    # lores negros
    return p


def golondrina():
    return {
        "pinta": _pinta_golondrina,
        "cuerpo": dict(largo=0.115, largo_cabeza=0.46, densidad=0.32, levante=11.0, candidatos=150000),
        "material_cuerpo": dict(metalico=0.0, rugosidad=0.62),
        "ala": dict(ALA_GOLONDRINA, envergadura=2.1,
                    color=dict(remera="#202127", borde="#2a2c34", ter="#1f2630", borde_ter="#27384a", fuerza_borde=0.4,
                               brazo="#1c2836", brazo_inf="#5c5a57"),
                    filas=_filas("#1d2733", "#1c2836", "#1b2a3a", ["#5a5855", "#625f5c", "#686561", "#5f5c59"], largo_may=0.42)),
        "cola": dict(n=12, abanico=13.0, largo=1.0, largo_centro=0.74, largo_borde=1.06, ancho=0.17,
                     color=dict(base="#1f2026")),
        "base": dict(pico="#121214", pico_inf="#141416", patas="#2b2726", iris="#1c130d"),
    }


# --------------------------------------------------------------------------- «nuca blanca»: atlapetes de los cerros (Atlapetes pallidinucha)

def _pinta_nuca(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#dcc530", "cont_liso")                                                        # partes inferiores amarillas
    p.zona(z.ven * z.tramo(0.30, 0.95, 0.1), color="#cdb93a")                                    # vientre amarillo oliva
    p.zona(z.lat * z.tramo(0.3, 0.98, 0.1), color="#8f8d4e")                                     # flancos oliva grisaceo
    p.zona(z.ven * suave(0.86, 0.98, z.s), color="#b8a84a", tam=1.2)
    p.zona(z.dor * suave(-0.30, -0.10, z.s), color="#3d4046", tam=1.1)                             # dorso gris pizarra
    p.zona(z.cab, color="#171616", celda="cont_liso2")                                            # lados de la cabeza negros
    lista = z.cab * (1 - suave(11, 20, z.phi)) * suave(24, 38, z.lam)
    p.zona(lista, color="#c9772e")                                                               # lista canela en la frente
    p.zona(lista * suave(72, 108, z.lam), color="#f3f1ec")                                       # que se vuelve blanca en la nuca
    p.zona(z.garganta(desde=120, lam_max=140), color="#e8c81f")                                  # garganta amarilla viva
    p.zona(z.ven * banda(z.dc, 0.6, 2.0, 0.15) * suave(138, 158, z.th), color="#e8c81f")
    return p


def nuca():
    return {
        "pinta": _pinta_nuca,
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(ALA_REDONDA, envergadura=1.17,
                    color=dict(remera="#2c2e32", borde="#4d5056", ter="#2a2c30", borde_ter="#4d5056", fuerza_borde=0.5,
                               brazo="#3a3d42", brazo_inf="#8c8d8c"),
                    filas=_filas("#34373c", "#383b40", "#3d4046", ["#8c8d8c", "#969796", "#9e9f9e", "#939493"])),
        "cola": dict(n=12, abanico=10.0, largo=1.0, largo_centro=1.0, largo_borde=0.92, ancho=0.17,
                     color=dict(base="#2a2c30", borde="#44474c", fuerza_borde=0.4)),
        "base": dict(pico="#151515", pico_inf="#1a1a1a", patas="#5f5048", iris="#4a1f14"),
    }


# --------------------------------------------------------------------------- pibi ahumado (Contopus fumigatus)

def _pinta_pibi(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#75787b", "cont_liso")
    p.zona(z.ven * z.tramo(0.45, 0.92, 0.1), color="#878a89")
    p.zona(z.ven * suave(0.86, 0.98, z.s), color="#8f8f88", tam=1.2)
    p.zona(z.dor, color="#55585b")
    p.zona(z.cab, color="#515457", celda="cont_liso2")
    p.zona(z.corona(), color="#44474a")
    p.zona(z.garganta(), color="#8b8e90")
    p.zona(z.cab * (1 - suave(28, 46, z.phi)) * banda(z.lam, 88, 152, 14), tam=1.5, lev=1.7)     # copete en punta
    return p


def pibi():
    return {
        "pinta": _pinta_pibi,
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(ALA_PUNTIAGUDA, envergadura=1.4,
                    color=dict(remera="#33353a", borde="#6c6f72", ter="#303236", borde_ter="#7c7f82", fuerza_borde=0.4,
                               brazo="#44474a", brazo_inf="#7e8183"),
                    filas=_filas("#383a3e", "#3c3e42", "#4a4d50", ["#7e8183", "#868989", "#8c8f8f", "#828585"],
                                 punta_may="#8a8d90", punta_med="#8a8d90", t_punta=0.96)),
        "cola": dict(n=12, abanico=9.0, largo=1.0, largo_centro=0.95, largo_borde=1.0, ancho=0.16,
                     color=dict(base="#35373b", borde="#55585b", fuerza_borde=0.4)),
        "base": dict(pico="#1a1a1b", pico_inf="#d68a2c", patas="#1f1e1e", iris="#20140c"),
    }


# --------------------------------------------------------------------------- saltapared comun (Troglodytes musculus)

def _pinta_saltapared(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#cfab82", "cont_liso")                                                        # partes inferiores ante canela
    p.zona(z.lat * z.tramo(0.4, 0.98, 0.1), color="#bb8858", celda="cont_barras")                # flancos mas rufos y barrados
    p.zona(z.ven * suave(0.84, 0.97, z.s), color="#c59a6c", celda="cont_barras", tam=1.2)
    p.zona(z.dor * suave(-0.30, -0.10, z.s), color="#876038", celda="cont_liso")                  # dorso pardo desde la coronilla
    p.zona(z.dor * suave(0.6, 0.75, z.s), color="#96693a")                                       # rabadilla mas rufa
    p.zona(z.cab, color="#86613b", celda="cont_liso2")                                            # cabeza parda como el dorso
    p.zona(z.corona(z.po - 14), color="#7a5632")                                                 # coronilla parda
    p.zona(z.nuca(), color="#7f5a34")
    p.zona(z.cab * suave(z.po + 4, z.po + 18, z.phi), color="#b08d66")                           # mejilla ante
    p.zona(z.franja(-12, -6, sv=2, lam0=40, lam1=140), color="#c4a47e")                          # ceja ante tenue
    p.zona(z.franja(-5, 5, sv=3, lam0=z.lo + 10), color="#6a4c2e")                               # linea postocular
    p.zona(z.garganta(), color="#dec7a8")
    return p


def saltapared():
    return {
        "pinta": _pinta_saltapared,
        "pico_fino": 0.62,                                                                     # pico fino de cucarachero
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(ALA_REDONDA, envergadura=1.1,
                    color=dict(remera="#8a643c", borde="#a57c50", ter="#876038", borde_ter="#a57c50", fuerza_borde=0.4,
                               celda_prim="prim_barras", celda_sec="sec_barras", celda_ter="sec_barras", brazo="#7f5a34", brazo_inf="#c2a27e"),
                    filas=_filas("#8a623a", "#876038", "#835d36", ["#c2a27e", "#c9aa86", "#cfb18c", "#c5a682"])),
        "cola": dict(n=12, abanico=11.0, largo=1.0, largo_centro=1.0, largo_borde=0.84, ancho=0.18,
                     color=dict(base="#8f663c", celda="cola_barras")),
        "base": dict(pico="#3a302a", pico_inf="#b79a7c", patas="#a8846c", iris="#3a2416"),
    }


# --------------------------------------------------------------------------- tucan andino celeste (Andigena nigrirostris)

def _pinta_tucan(ave, c):
    z = Zonas(ave, c)
    s = z.s
    p = Pintor(c, "#9cc4de", "cont_liso")                                                        # pecho y vientre celestes
    p.zona(z.lat * z.tramo(0.62, 0.9, 0.06), color="#6e3a1e")                                    # muslos castaños
    p.zona(z.ven * suave(0.86, 0.96, s), color="#b3231f", tam=1.2)                               # infracoberteras rojas
    p.zona(z.dor * suave(-0.30, -0.10, s), color="#6a5a33", tam=1.15)                              # manto pardo oliva
    p.zona(z.dor * z.tramo(0.70, 0.90, 0.04), color="#e0c42a")                                   # rabadilla amarilla
    p.zona(z.dor * suave(0.90, 0.96, s), color="#3c4a3a")                                        # supracoberteras verdosas
    p.zona(z.cab, color="#f3f3ef", celda="cont_liso2")                                            # mejillas y garganta blancas
    p.zona(z.ven * banda(z.dc, 0.6, 1.9, 0.15), color="#f3f3ef")
    p.zona(z.cab * (1 - suave(z.po - 14, z.po - 2, z.phi)), color="#161616")                     # capirote negro
    p.zona((1 - suave(85, 120, z.th)) * banda(z.dc, 0.8, 2.3, 0.2) * suave(100, 130, z.lam), color="#161616")   # nuca negra
    p.zona(z.cuello(0.95, 2.1, 0.15), tam=0.72, lev=0.55)                                        # cuello: plumas cortas y pegadas
    p.zona(z.cab * z.cerca_ojo(2.3), color="#6aa9cc")                                            # piel orbital azul
    return p


def tucan():
    return {
        "pinta": _pinta_tucan,
        "cuerpo": dict(largo=0.085, largo_cabeza=0.48, densidad=0.31, levante=12.0, candidatos=150000),
        "ala": dict(ALA_TUCAN, envergadura=1.08,
                    color=dict(remera="#3d4846", borde="#5a6a52", ter="#5a5030", borde_ter="#6a5a33", fuerza_borde=0.45,
                               brazo="#63552f", brazo_inf="#8a8f8c"),
                    filas=_filas("#5f522e", "#63552f", "#6a5a33", ["#8a8f8c", "#939896", "#9aa09d", "#8f9492"],
                                 n=(18, 16, 19, 20, 21, 23), n_inf=(17, 16, 18, 20))),
        "cola": dict(n=10, abanico=9.0, largo=1.0, largo_centro=1.0, largo_borde=0.74, ancho=0.17,
                     color=dict(base="#2d3336", punta="#6e3a1e", t_punta=0.84, fuerza_punta=0.9)),
        "base": dict(pico="#151517", pico_inf="#1b1b1d", patas="#5d7482", iris="#3a2618", pico_rug=0.3),
    }


# --------------------------------------------------------------------------- vireo ojirrojo (Vireo olivaceus)

def _pinta_vireo(ave, c):
    z = Zonas(ave, c)
    p = Pintor(c, "#f1efe8", "cont_liso")                                                        # partes inferiores blancas
    p.zona(z.lat * z.tramo(0.4, 0.98, 0.1), color="#e2dc9c")                                     # flancos amarillentos
    p.zona(z.ven * suave(0.84, 0.97, z.s), color="#e6df96", tam=1.2)
    p.zona(z.dor * suave(-0.30, -0.10, z.s), color="#78813f")                                      # dorso verde oliva
    p.zona(z.cab, color="#aaa87e", celda="cont_liso2")                                            # mejillas oliva ante
    p.zona(z.garganta(desde=118), color="#f1efe8")
    p.zona(z.nuca(150), color="#78813f")
    p.zona(z.franja(-19, -7, sv=3, lam0=22, lam1=152), color="#f1efe8")                          # ceja blanca
    p.zona(z.franja(-7, 6, sv=3, lam0=16, lam1=150), color="#3b3b38")                            # linea ocular oscura
    p.zona(z.corona(z.po - 19, sv=3), color="#2b2c2c")                                           # borde negro de la corona
    p.zona(z.corona(z.po - 25, sv=3), color="#6f7b85")                                           # corona gris
    return p


def vireo():
    return {
        "pinta": _pinta_vireo,
        "cuerpo": dict(largo=0.092, largo_cabeza=0.46, densidad=0.31, levante=13.0, candidatos=140000),
        "ala": dict(ALA_PUNTIAGUDA, envergadura=1.45,
                    color=dict(remera="#4b4a3b", borde="#8a8f4a", ter="#4a4a3a", borde_ter="#8a8f4a", fuerza_borde=0.6,
                               brazo="#6c733a", brazo_inf="#d9d9c0"),
                    filas=_filas("#5a5c3c", "#666c3c", "#70773c", ["#d9d9c0", "#dfdfc8", "#e4e4cf", "#dcdcc4"], borde_may="#8a8f4a")),
        "cola": dict(n=12, abanico=9.0, largo=1.0, largo_centro=0.96, largo_borde=1.0, ancho=0.16,
                     color=dict(base="#55573d", borde="#868b48", fuerza_borde=0.5)),
        "base": dict(pico="#4d5358", pico_inf="#9aa3a8", patas="#6f8090", iris="#a3241b"),
    }


ESPECIES = {
    "aguililla": aguililla, "colibri": colibri, "copeton": copeton, "cucarachero": cucarachero, "golondrina": golondrina,
    "nuca": nuca, "pibi-ahumado": pibi, "saltapared": saltapared, "tucan": tucan, "vireo": vireo,
}
