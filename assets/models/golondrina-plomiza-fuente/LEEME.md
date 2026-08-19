# Golondrina plomiza — archivos fuente de Felipe

Subido por Felipe a Drive el 14/08/2026 y traído al repositorio el 18/08/2026.

| Qué | Archivo |
|---|---|
| Escena de Maya (binaria, Maya 2026) | `Golondrina Entregable.mb` |
| Texturas PBR (BaseColor, Height, Metallic, Roughness, Normal por pieza, 1024×1024) | `texturas/` |

## Estado: ya convertida a GLB (18/08/2026)

El modelo **ya está exportado** como [`assets/models/golondrina-plomiza.glb`](../golondrina-plomiza.glb)
(6,6 MB, 9 piezas, 3.016 triángulos, texturas embebidas) y declarado en
[`config/pois.json`](../../../config/pois.json) (`poi-golondrina-plomiza`).

Como en el equipo no hay Maya instalado, la conversión se hizo con un pipeline
propio y reproducible (sin servicios online: el fuente nunca salió de la máquina):

1. `python scripts/modelos/extraer_mb.py` — lee el binario IFF FOR8 de Maya y
   saca un OBJ por pieza (9 piezas con UVs al 100%, validadas por topología:
   mallas cerradas, volúmenes espejo idénticos entre alas/patas/ojos).
2. `python scripts/modelos/ensamblar_glb.py` — arma el GLB: tríangula, suelda,
   calcula normales suaves, empaqueta Metallic+Roughness en un solo PNG por
   pieza (contrato glTF), embebe BaseColor y Normal tal cual, y hornea la
   escala cm→m de Maya (el ave queda de ~7 cm; la escala de colocación en la
   escena se decide en la integración).

**Lo que el .mb NO trae** (verificado): ni esqueleto, ni skin, ni curvas de
animación. La **animación idle de aleteo (RF-029) sigue pendiente de Felipe**;
cuando exista, se reexporta y se declara en `idleAnimation` del POI. El mapa
`Height` no se usa (el núcleo de glTF no tiene desplazamiento).

> Ojo: el catálogo ([`docs/06-contenido-de-la-experiencia.md`](../../../docs/06-contenido-de-la-experiencia.md) §A.3)
> lista la golondrina plomiza como **"por verificar: la fuente cita el nombre común sin
> binomio"**. El modelo puede avanzar; la ficha no se publica hasta que Felipe cierre el
> nombre científico (HU-11.2).
