"""Verifica una alineacion propia ya llevada al marco de la escena:
- fotos registradas por toma y lente estimado por camara (ancho de campo);
- distancia por toma entre el centro de cada foto y su posicion conocida (registrar_fotos2 contra la Polycam). En las
  tomas buenas mide el encaje; en las cinco de lente viejo equivocado, cuanto estaba corrida la posicion vieja.
uso: propia_verificar.py <sparse> <poses.json>"""
import sys, os, re, json, numpy as np
from collections import defaultdict
sys.path.insert(0, os.path.dirname(__file__))
import colmapbin

SP, POSES = sys.argv[1:3]
BUENAS = {"c_CentroAbajo_Ida", "c_CentroCentro_Devuelta", "c_CentroCentro_Ida", "c_DerechaCentro_Devuelta",
          "c_IzquierdaArriba_Devuelta", "c_IzquierdaArriba_Ida", "c_OrbitacionPlataforma", "c_Plataforma_VistaTramo1"}
cams = colmapbin.leer_camaras(os.path.join(SP, "cameras.bin"))
ims = colmapbin.leer_imagenes(os.path.join(SP, "images.bin"))
for c, (mod, w, h, p) in cams.items():
    print("camara %d: %dx%d f %.1f k %s  ancho de campo %.1f grados" % (c, w, h, p[0], np.round(p[3:], 4),
                                                                       2 * np.degrees(np.arctan(w / 2 / p[0]))))
poses = json.load(open(POSES))
por = defaultdict(list); n_toma = defaultdict(int)
for v in ims.values():
    t = v["name"].split("/")[0]; n_toma[t] += 1
    p = poses.get(v["name"])
    if p and p["inliers"] >= 60:
        C = -np.array(p["R"]).T @ np.array(p["t"])
        por[t].append(np.linalg.norm(v["centro"] - C))
print("%-30s %5s %8s %8s %8s" % ("toma", "fotos", "med m", "p90 m", "n ref"))
for t in sorted(n_toma):
    d = np.array(por[t]) if por[t] else np.array([np.nan])
    print("%-30s %5d %8.2f %8.2f %8d %s" % (t, n_toma[t], np.median(d), np.percentile(d, 90), len(por[t]),
                                           "prior" if t in BUENAS else ""))
print("total registradas: %d" % len(ims))
