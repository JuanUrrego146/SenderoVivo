# Golondrina plomiza — archivos fuente de Felipe

Subido por Felipe a Drive el 14/08/2026 y traído al repositorio el 18/08/2026.
**No está integrado al visor todavía**: es el material fuente.

| Qué | Archivo |
|---|---|
| Escena de Maya | `Golondrina Entregable.mb` |
| Texturas PBR (BaseColor, Height, Metallic, Normal, Roughness por pieza) | `texturas/` |

## Qué falta para que aparezca en la web

1. Exportar desde Maya a **`.glb`** (glTF binario) con las texturas embebidas y la
   animación idle de aleteo incluida (RF-029). Presupuesto: ver validación V10.
2. Guardarlo como `assets/models/golondrina-plomiza.glb` (kebab-case).
3. Declararlo en `config/pois.json` (`modelUrl` + `idleAnimation`).
4. Nada más: el visor lo carga desde la configuración, sin tocar código.

> Ojo: el catálogo ([`docs/06-contenido-de-la-experiencia.md`](../../../docs/06-contenido-de-la-experiencia.md) §A.3)
> lista la golondrina plomiza como **"por verificar: la fuente cita el nombre común sin
> binomio"**. El modelo puede avanzar; la ficha no se publica hasta que Felipe cierre el
> nombre científico (HU-11.2).
