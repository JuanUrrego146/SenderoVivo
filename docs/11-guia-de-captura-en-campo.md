# Guía de captura en campo: protocolo operativo paso a paso

> Versión 1,0, 13/08/2026 · Responsable: Juan Urrego
> Esta guía aterriza el protocolo de captura de [`03-avances-tecnologia.md`](03-avances-tecnologia.md) §3 y la banda de alta densidad de [`decisiones/ADR-002-lod-por-proximidad.md`](decisiones/ADR-002-lod-por-proximidad.md) en instrucciones ejecutables en el sitio. Escrita para un tramo de práctica de ~30 m; para las escenas reales de ~70 m se aplica el mismo patrón por segmento.

---

## 1. Antes de salir

- [ ] Día **nublado, sin viento, a primera hora**. Si hay viento, se aplaza: el follaje en movimiento es la primera causa de flotantes.
- [ ] Celular cargado y con espacio libre suficiente (~2 GB por cada 10 minutos de 4K60).
- [ ] Lente limpio (pasarle un paño antes de configurar).
- [ ] **Objeto de escala**: algo de tamaño conocido (regla, hoja A4, metro extendido) para colocar visible al inicio del tramo. Es lo que después permite convertir unidades del entrenamiento a metros reales.
- [ ] Si la salida es en la Quebrada La Vieja: reserva previa por la app del Acueducto y prohibido salirse del trazado ([`07-plan-de-visitas-de-campo.md`](07-plan-de-visitas-de-campo.md) §7).

## 2. Configuración de la cámara

El protocolo exige video 4K a 60 fps con exposición, foco y balance de blancos manuales y bloqueados. La cámara nativa del iPhone no permite fijar obturación e ISO en video; una app gratuita que sí lo permite es **Blackmagic Camera** (sugerencia operativa, no requisito del protocolo).

| Ajuste | Valor | Motivo |
|---|---|---|
| Resolución y cuadros | 4K (2160p) a 60 fps | Protocolo del proyecto |
| Obturación | 1/125 s fija (1/250 con buena luz) | Congela el detalle a pulso |
| ISO | Fijo, el más bajo con exposición correcta (bajo árboles, 400 es normal) | Se prefiere grano a desenfoque: subir ISO antes que bajar obturación |
| Balance de blancos | Fijo (nublado, ~6500 K) | Consistencia entre cuadros |
| Enfoque | Manual, fijado a un punto a ~2 m, sin tocarlo más | El autofoco variable arruina la reconstrucción |
| Lente | 1x (principal). No usar la 0.5x | La guía de PlayCanvas desaconseja el ultra gran angular |
| Estabilización | Apagada | La estabilización electrónica deforma cada cuadro de manera distinta |

**Regla de oro:** se configura una sola vez al llegar, con la luz del sitio, y no se toca nada hasta terminar todas las pasadas. Verificar antes de empezar que ningún valor cambia solo al mover la cámara.

## 3. Las pasadas

Caminar **lento** (un paso por segundo, rodillas semiflexionadas, codos pegados al cuerpo, cámara con las dos manos). En un tramo de 30 m cada pasada toma ~90 segundos. **Un clip por pasada**: si una sale mal se repite sola, sin contaminar las demás. Al final de cada pasada se corta la grabación, se gira y se arranca el clip siguiente; los giros grabados producen cuadros borrosos inservibles.

```
        <- ~1 m ->   eje del sendero   <- ~1 m ->
   P5 ->  -----------------------------------  <- P6
                 P1 -> (ida)
                 <- P2 (regreso)
                 P3 -> (agachado)
                 <- P4 (brazo en alto)
```

| # | Recorrido | Altura | La cámara apunta a |
|---|---|---|---|
| P1 | Centro, ida | Ojos | Adelante, inclinada 10 a 15 grados hacia abajo |
| P2 | Centro, regreso | Ojos | Adelante (cubre la vista de quien mira hacia atrás) |
| P3 | Centro, ida | Agachado (cintura) | Adelante y ligeramente abajo: es la pasada del piso |
| P4 | Centro, regreso | Brazo en alto | Picada hacia abajo ~30 grados |
| P5 | Borde izquierdo, ida | Ojos | Cruzada hacia el centro y la derecha (30 a 45 grados) |
| P6 | Borde derecho, regreso | Ojos | Cruzada hacia el centro y la izquierda |
| P7 | Centro, ida | Ojos | Lateral izquierda: vegetación y troncos de ese lado |
| P8 | Centro, regreso | Ojos | Lateral derecha |

Las ocho pasadas materializan la banda de alta densidad del ADR-002: del suelo hasta ~1 m por encima de los ojos, y ~1 m a cada lado del eje. Si sobra tiempo, dar una media órbita lenta (180 grados) a uno o dos elementos duros importantes (tronco grueso, piedra, baranda): los elementos duros son el ancla geométrica de la escena.

## 4. Qué no hacer

- **No apuntar al cielo.** No tiene rasgos que la reconstrucción pueda emparejar, quema la exposición y las nubes se mueven. El cielo que se cuele entre las copas es suficiente.
- **No grabar con viento**, ni gente, perros o vehículos cruzando el cuadro.
- **No dejar entrar la propia sombra ni los pies** al encuadre.
- **No confiar en superficies de agua o reflejos**: se reconstruyen mal y es una limitación esperada, no un error de captura.
- **No cambiar ningún ajuste a mitad de sesión.** Si la luz cambia de forma drástica (se abre el sol), es mejor pausar y esperar.
- **No usar zoom digital** para la captura principal.

## 5. Al terminar, el mismo día

1. **Respaldar el material en dos ubicaciones distintas antes de terminar el día** (regla del proyecto, riesgo R8).
2. Pasar los clips al PC y extraer cuadros. Punto de partida: 1 de cada 15 cuadros (~4 por segundo; caminando lento equivale a ~10 cm entre cuadros).

   ```bash
   ffmpeg -i P1.mov -vf "select=not(mod(n\,15))" -vsync vsync_drop -q:v 2 frames/P1_%04d.jpg
   ```

   Meta orientativa para 30 m: entre 500 y 1.500 imágenes en total. Si la alineación sale con huecos, bajar a 1 de cada 10.
3. Reconstruir: RealityScan (alineación SfM, gratuito para uso individual) y Brush (entrenamiento 3DGS, open source) en una estación con GPU NVIDIA. Alternativa sin instalación: subir el video a Luma AI, asumiendo menor control y más limpieza posterior.
4. Limpiar el PLY resultante en SuperSplat (flotantes y recorte) y comprimir a SOG:

   ```bash
   npx @playcanvas/splat-transform escena.ply --filter-nan scene-01.sog
   ```

5. Verificar el resultado en el visor del prototipo (ver [`../PROTOTIPO.md`](../PROTOTIPO.md)).

## 6. Qué medir y anotar durante la práctica

Una salida de práctica responde varias preguntas abiertas de [`03-avances-tecnologia.md`](03-avances-tecnologia.md) §8. Anotar:

| Pregunta | Qué anotar |
|---|---|
| V1: ¿1x o 2x? | Grabar un segmento corto con cada opción y comparar la reconstrucción |
| V2: ¿Cada cuántos cuadros extraer? | El divisor que funcionó (15, 10, otro) y cuántas imágenes resultaron |
| V3: ¿Cuántas gaussianas se necesitan? | El conteo de gaussianas del PLY entrenado y cómo se ve |
| V5: ¿Cuánto tarda el entrenamiento? | Tiempo total de SfM y de entrenamiento, y en qué GPU |

## 7. Referencias

- Protocolo y parámetros: [`03-avances-tecnologia.md`](03-avances-tecnologia.md) §3
- Banda de alta densidad: [`decisiones/ADR-002-lod-por-proximidad.md`](decisiones/ADR-002-lod-por-proximidad.md)
- Guía oficial de captura: [Taking Photos, PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/taking-photos/)
- Herramientas recomendadas: [Recommended Tools, PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/recommended-tools/)
- Reglas de campo: [`07-plan-de-visitas-de-campo.md`](07-plan-de-visitas-de-campo.md) §7
