# Avances a nivel de tecnología — Sendero Vivo

> Punto 2 de la actividad del curso.
> Investigación realizada entre el 4 y el 11 de agosto de 2026.
> Responsable: Juan Urrego, con aportes de Alejandra Chambueta (motor) y Felipe Acevedo (assets).

Este documento registra qué se investigó, qué se descargó y probó, qué se aprendió y —sobre todo— **qué quedó sin validar**. Las tres tecnologías centrales son nuevas para todo el equipo, así que la parte más útil de este documento es la última: la lista de lo que todavía no sabemos.

---

## 1. El stack, de un vistazo

```
Captura (celular, video 4K60)
        ↓
Extracción de frames + poses de cámara (SfM / COLMAP)
        ↓
Entrenamiento 3DGS (estación con GPU del equipo)
        ↓
Limpieza y recorte (SuperSplat, en el navegador)
        ↓
Compresión a SOG (SplatTransform CLI)
        ↓
Carga y render (PlayCanvas Engine, componente gsplat)
        ↓
Navegador de escritorio y celular
```

| Pieza | Qué es | Licencia / coste | Versión de referencia |
|---|---|---|---|
| **3D Gaussian Splatting** | Técnica de reconstrucción y render de campos de radiancia | Investigación abierta (INRIA / MPII) | Formulación original SIGGRAPH 2023 |
| **SuperSplat** | Editor de splats en el navegador | MIT, gratuito | Editor 2.x |
| **SOG** | Formato comprimido de splats | Especificación abierta (v2) | Soportado desde engine 2.11.0 |
| **SplatTransform** | CLI de conversión y compresión | Open source, vía npm | — |
| **PlayCanvas Engine** | Motor 3D web | MIT | **2.21.3** (npm, ago 2026) |

---

## 2. 3D Gaussian Splatting

### 2.1 Qué es

Es una técnica de **reconstrucción y renderizado de campos de radiancia** presentada en *"3D Gaussian Splatting for Real-Time Radiance Field Rendering"* (Kerbl, Kopanas, Leimkühler y Drettakis), publicada en **ACM Transactions on Graphics / SIGGRAPH 2023**.

En lugar de representar una escena con mallas y texturas —o con una red neuronal implícita como hacen los NeRF—, la escena se representa como **millones de gaussianas 3D**: elipsoides con posición, escala, rotación (cuaternión), opacidad y color dependiente de la dirección de vista (armónicos esféricos). Se parte de una nube de puntos dispersa obtenida por Structure-from-Motion, y se **optimizan** esas gaussianas contra las fotos originales hasta que el render coincide con lo capturado.

La contribución que hace que esto importe para nosotros: el render es por **rasterización**, no por trazado de rayos ni por evaluación de una red neuronal. Eso es lo que permite tiempo real (≥ 30 fps) con calidad de estado del arte, y lo que hace que la técnica sea viable en un navegador.

### 2.2 Por qué se eligió para este proyecto

Frente a las dos alternativas obvias:

| Enfoque | Por qué no |
|---|---|
| **Modelado 3D a mano** | Un bosque modelado es la interpretación de un artista sobre cómo se ve un bosque. El producto entero se basa en que el visitante **reconozca el lugar cuando llegue**. Además, modelar 200 m de bosque altoandino con fidelidad es inviable para un equipo de seis personas en 15 semanas |
| **Fotogrametría clásica (malla + textura)** | La malla necesita superficies continuas. El follaje, las ramas finas y los helechos producen mallas rotas o exigen simplificaciones que destruyen justamente lo que hace reconocible al sitio |
| **NeRF** | Calidad comparable, pero el render depende de evaluar una red neuronal por rayo. En un celular, dentro del navegador, no es realista |

El Gaussian Splatting es el único de los tres que produce **el lugar capturado** y además corre en tiempo real en un navegador móvil. Por eso es el proyecto, no un detalle de implementación.

### 2.3 Qué se probó

- Se leyó el paper original y la página del proyecto de INRIA.
- Se revisaron escenas de ejemplo ya publicadas en visores web para calibrar expectativas de calidad y de peso.
- **Aún no se ha entrenado una escena propia.** Es la primera tarea real del Sprint 2 y la mayor incógnita del proyecto.

### 2.4 Qué se aprendió

1. La calidad final depende mucho más de **la captura** que del entrenamiento. Un mal conjunto de fotos no se arregla después.
2. El resultado del entrenamiento es un `.ply` **enorme** (del orden de 1 GB para escenas de varios millones de gaussianas). El PLY no es un formato de entrega: es un formato intermedio.
3. La técnica es fuerte en superficies duras con textura y débil en estructuras finas, translúcidas o en movimiento. Esto condiciona **dónde y cuándo** capturamos, no solo cómo.

---

## 3. Captura: qué recomienda la documentación

La guía de captura de PlayCanvas es la fuente que estamos siguiendo. Contrastada con nuestro protocolo:

| Parámetro | Recomendación documentada | Nuestro protocolo | Estado |
|---|---|---|---|
| Dispositivo | iPhone 13 Pro+, Pixel 7+, Galaxy S22+ | iPhone 13 o equivalente | ✅ Alineado |
| Resolución de video | **4K mínimo** (1080p no da suficiente detalle) | 4K | ✅ |
| Cuadros por segundo | **60 fps o más** | 60 fps | ✅ |
| Obturación | **mínimo 1/125 s** a pulso | 1/125 o más rápida | ✅ |
| ISO | 100–400 (200–400 en día nublado) | Manual, lo más bajo posible | ✅ |
| Exposición | **Bloqueada en manual** — evita parpadeo entre cuadros | Todo manual | ✅ Crítico |
| Foco | **Manual, muy preferible** | Manual | ✅ |
| Balance de blancos | Fijo | Manual | ✅ |
| Iluminación | Día nublado: luz suave y uniforme | Día nublado, sin viento, primera hora | ✅ |
| Solapamiento | 70–80 % entre vistas contiguas | Varias pasadas caminando despacio | ⚠️ Por validar en campo |
| Extracción de cuadros | Cada 2.º–5.º cuadro según velocidad | Por definir tras la primera prueba | ⚠️ |
| Qué evitar | Superficies reflectantes, objetos en movimiento, cambios de exposición | — | ⚠️ El agua del cauce y el follaje al viento son exactamente esto |

### 3.1 Un hallazgo que hay que resolver antes de la salida

La documentación recomienda una focal equivalente de **35–85 mm** y desaconseja explícitamente los **ultra gran angular (< 24 mm)**. Nuestro protocolo dice "lente fija en 1x". En un iPhone 13, el 1x (lente principal) equivale a **~26 mm**, es decir, justo por debajo del rango recomendado.

**No cambiamos el stack ni el dispositivo.** Pero esto entra como tarea explícita de la preparación del Sprint 1: hacer una prueba corta comparando 1x contra 2x (teleobjetivo/recorte) en el sendero y decidir con evidencia. El 1x da más contexto por cuadro y menos pasadas; el 2x se acerca al rango recomendado pero exige muchas más pasadas para cubrir el mismo tramo. La decisión queda registrada en la issue de la historia HU-02.

### 3.2 Qué más se registra en campo

Además del video: **track GPS** del recorrido, **audio ambiente y cantos**, **una foto por POI**, y **un objeto de tamaño conocido** dentro de la escena para dar escala. Lo último es lo que permite que la capa de datos (altitud, distancia, desnivel) se corresponda con la geometría reconstruida y no con unidades arbitrarias del entrenamiento.

---

## 4. SuperSplat

### 4.1 Qué es

Editor de Gaussian Splats **que corre íntegramente en el navegador**, desarrollado por PlayCanvas y liberado como **open source bajo licencia MIT**. Está construido sobre el propio PlayCanvas Engine.

Lo relevante para nosotros:

- **No hay nada que instalar.** Se abre en el navegador y se trabaja ahí.
- **Nada se sube hasta que uno decide publicar**: el archivo se procesa localmente. Para material capturado dentro de una reserva protegida, esto no es un detalle menor.
- Guarda proyectos en formato `.ssproj`, así que el trabajo de limpieza se puede retomar entre sesiones — importante porque la limpieza de tres escenas no se hace de una sentada.

### 4.2 Para qué lo vamos a usar

1. **Eliminar flotantes** — gaussianas espurias con opacidad en el vacío, el artefacto típico de las capturas de exterior con vegetación.
2. **Recortar la escena** al tramo que nos interesa, quitando todo lo que quedó fuera del sendero.
3. **Retoque de color** entre las tres escenas, para que al encadenarlas no se note el salto.
4. Exportar hacia el paso de compresión.

Las versiones recientes incorporan además línea de tiempo para animación de cámara, anotaciones/hotspots, post-procesado (bloom, viñeteado, corrección de color) y publicación directa. **No vamos a usar esas funciones**: nuestros marcadores y nuestra cámara los controla nuestro propio motor, porque tienen que estar ligados a la capa de datos GPS y al JSON de POIs. Se anota aquí para que nadie lo redescubra a mitad de sprint y proponga cambiar de enfoque.

### 4.3 Qué se probó

- Se abrió el editor y se cargaron escenas de ejemplo públicas.
- Se recorrió el flujo de recorte y borrado de flotantes sobre una escena ajena.
- **Falta probarlo sobre material propio**, que es donde aparecerán los problemas reales.

---

## 5. El formato SOG

### 5.1 Qué es

**SOG (Spatially Ordered Gaussians)** es el formato contenedor comprimido que PlayCanvas creó para entregar splats por web. Es la evolución de **SOGS (Self-Organizing Gaussians)**, una técnica de compresión de Wieland Morgenstern (Fraunhofer HHI) que PlayCanvas adoptó primero y luego reemplazó por una versión propia que **no depende de CUDA** para comprimir. La especificación está abierta y va por la **versión 2**.

### 5.2 Cómo funciona

La idea central: en lugar de guardar millones de estructuras de datos, **los atributos de las gaussianas se "desenrollan" en imágenes 2D** — una imagen por atributo — y se guardan como WebP. Un dataset SOG se compone de:

| Archivo | Qué guarda |
|---|---|
| `meta.json` | Metadatos de la escena, rangos de dequantización, codebooks y nombres de archivo |
| `means_l.webp` + `means_u.webp` | Posición: 16 bits por eje, repartidos en bits bajos y altos |
| `scales.webp` | Tamaño por eje, vía codebook |
| `quats.webp` | Orientación, cuaternión con esquema *smallest-three* (3×8 bits + 2 bits de modo) |
| `sh0.webp` | Color base (DC) + opacidad |
| `shN_centroids.webp`, `shN_labels.webp` | Armónicos esféricos de orden superior (opcional) |

Dos detalles que importan para el motor:

- Los datos se almacenan en **orden Morton** (curva de recorrido espacial), lo que deja el archivo **listo para GPU sin procesamiento en la carga**. Esto ataca directamente el RNF-002 (primera escena navegable en < 10 s).
- Las imágenes deben ser **WebP sin pérdida**, para preservar exactamente los valores cuantizados. La pérdida ya ocurrió en la cuantización; el WebP no debe añadir más.

Todo el conjunto se puede empaquetar en un único archivo `.sog` (un ZIP), que es lo que vamos a entregar.

### 5.3 Cuánto comprime

- Especificación: archivos típicamente **~15–20× más pequeños** que el PLY equivalente.
- Caso de referencia publicado por PlayCanvas: una escena de **skate park con 4 millones de gaussianas** pasó de **1 GB en PLY a 42 MB en SOG** — una reducción del **~95 %**.
- Frente al formato *Compressed PLY* que usaba SuperSplat, SOG comprime aproximadamente **2–3× mejor**.

**La compresión es con pérdida por diseño** (viene de la cuantización). Es un intercambio consciente: sin ella no hay proyecto en móvil.

### 5.4 Cómo se genera

Con **SplatTransform**, la CLI open source que se instala por npm:

```bash
splat-transform entrada.ply salida.sog
```

Es el paso más simple de todo el pipeline, lo cual es una buena noticia: el riesgo está antes (captura y entrenamiento), no aquí.

---

## 6. PlayCanvas Engine

### 6.1 Qué es

Motor 3D para web, **open source bajo licencia MIT**. La versión actual en npm es la **2.21.3**. El soporte de SOG entró en el **engine 2.11.0**, así que cualquier versión ≥ 2.11 sirve; usaremos la última estable.

### 6.2 Cómo se cargan los splats

El motor expone un tipo de asset `gsplat` y un componente `GSplatComponent`. Los formatos aceptados son `.ply`, `.compressed.ply`, `.sog` (empaquetado), `meta.json` + WebP (SOG sin empaquetar) y `.lod-meta.json` (SOG con streaming).

```javascript
const assets = [
  new Asset('scene01', 'gsplat', { url: 'assets/scenes/scene-01.sog' })
];
const loader = new AssetListLoader(assets, app.assets);
await new Promise(resolve => loader.load(resolve));

const entity = new pc.Entity();
entity.addComponent('gsplat', { asset: assets[0] });
```

Es una API sencilla, y eso importa: significa que nuestro esfuerzo de programación se va a ir en el **motor de recorrido, los POIs y la capa de datos** —que es donde está el producto— y no en pelear con la carga del splat.

### 6.3 Rendimiento: lo que dice la documentación

Esta es la parte que más condiciona el diseño, y conviene tenerla explícita:

- **Presupuesto de splats.** El motor expone un presupuesto global:
  ```javascript
  app.scene.gsplat.splatBudget = 1_000_000; // móvil
  ```
  Referencias de la documentación: **~1 millón para móvil**, **3+ millones para escritorio**.

- **El cuello de botella principal es el *fill rate*, no la memoria.** El splatting es especialmente caro en tasa de relleno por el sobredibujo: cada píxel puede acumular decenas o cientos de fragmentos con mezcla alfa. Esto explica por qué una escena puede ir bien en una pantalla pequeña y colapsar al llenar la pantalla.

- **Ordenamiento por profundidad en cada cuadro.** Todas las gaussianas visibles se ordenan por profundidad de cámara cada frame. El coste crece peor que linealmente con el número de gaussianas.

- **Dos ajustes de escena con impacto directo:**
  1. **Desactivar antialiasing** — multiplica los fragmentos procesados por píxel, que es justo lo caro aquí.
  2. **Limitar el *device pixel ratio*** — reduce la resolución efectiva y por tanto el trabajo de fragmentos.

- **LOD por distancia:** `lodBaseDistance` y `lodMultiplier` controlan a qué distancia baja la calidad y con qué progresión geométrica (`lodBaseDistance * lodMultiplier^i`).

### 6.4 WebGL frente a WebGPU

WebGL no tiene cómputo de propósito general, así que el ordenamiento por profundidad se termina haciendo en CPU vía JavaScript o WebAssembly, con el coste de latencia y de ancho de banda que eso implica. WebGPU mejora esto de forma sustancial.

**Decisión:** apuntamos a WebGPU cuando el dispositivo lo soporte, con **repliegue automático a WebGL**. No podemos exigir WebGPU porque RNF-004 pide versiones vigentes de Chrome, Safari y Firefox en escritorio y móvil, y el repliegue es justamente lo que protege ese requisito. Queda como tarea de validación temprana en S3.

### 6.5 Streamed SOG (plan de choque de peso)

Si el peso o el rendimiento no cierran, existe **Streamed SOG**: se pregeneran versiones del splat a distintos niveles de detalle, se organizan en un árbol espacial descrito por un `.lod-meta.json`, y el motor carga y descarga niveles según la distancia de cámara. Solo se mantiene en memoria lo necesario para el punto de vista actual. SplatTransform puede generar los niveles automáticamente a partir de un splat de alta calidad, y activarlo no requiere configuración extra: basta cargar el asset en el componente `gsplat`.

**No es parte del plan base.** Está identificado, entendido y reservado como respuesta al riesgo R2.

---

## 7. Riesgos técnicos reales

### RT-1 — Peso de las escenas en móvil
**Severidad: alta**

Con 3 escenas y un presupuesto de ~1 M de gaussianas por escena en móvil, el peso por escena en SOG debería quedar en el orden de decenas de MB si extrapolamos el caso de referencia (4 M de gaussianas → 42 MB). Pero es una extrapolación, no una medición: la densidad de gaussianas que necesita un bosque no es la de un skate park.

- **RNF-003 sigue con el umbral `[por definir tras la primera captura]`**, y así se queda hasta que haya una medición real. Poner un número ahora sería inventarlo.
- **Primera medición: Sprint 2**, y es un criterio de "hecho" de esa escena.
- **Respuestas escalonadas:** reducir gaussianas → recortar el tramo → Streamed SOG con LOD.

### RT-2 — Rendimiento en gama media
**Severidad: alta**

RNF-001 pide ≥ 30 fps sostenidos en un celular de gama media de los últimos tres años. El problema no es la memoria sino el *fill rate*: en pantalla pequeña, el usuario está **dentro** de la escena, lo que maximiza el sobredibujo.

- Mitigación de partida: `splatBudget` diferenciado por dispositivo (RF-022), antialiasing desactivado, *device pixel ratio* limitado, LOD por distancia.
- **Sin dispositivo de referencia definido todavía.** Hay que fijar uno concreto en S3 y medir siempre contra él: "gama media" sin modelo específico no es un criterio verificable.

### RT-3 — Calidad de reconstrucción en vegetación densa
**Severidad: alta — es el riesgo que puede cambiar el alcance**

Es una limitación conocida y documentada de la técnica, no un problema de nuestra ejecución. La literatura sobre reconstrucción de vegetación reporta que:

- La forma irregular y compleja de la vegetación, **especialmente el follaje denso, introduce ruido y distorsiona la geometría** reconstruida, reduciendo precisión y completitud.
- Aparecen **muestras flotantes** causadas por gaussianas con opacidad no nula en espacio vacío.
- Las **estructuras finas** (tallos, ramas delgadas) se reconstruyen mal bajo oclusión del follaje.

Al mismo tiempo, la evidencia también muestra que 3DGS reconstruye geometría **detrás** de la oclusión vegetal mejor que la fotogrametría clásica, que es parte de por qué la elegimos.

**Cómo lo enfrentamos:**
1. El tramo se eligió por sus elementos duros: escalones de piedra, barandas de madera, cauce rocoso. Son el ancla geométrica.
2. Día **sin viento** — el follaje en movimiento rompe la consistencia entre cuadros, que es la premisa del método.
3. Varias pasadas a distintas alturas: más vistas del follaje, menos ambigüedad.
4. Limpieza de flotantes en SuperSplat como paso obligatorio.
5. **Si una escena sale inaceptable, se recorta el tramo.** 120 m impecables valen más que 200 m con ruido.

### RT-4 — El agua del cauce
**Severidad: media**

La guía de captura desaconseja explícitamente superficies reflectantes y objetos en movimiento. Un cauce rocoso con agua corriendo es ambas cosas a la vez. Las rocas se reconstruirán bien; la lámina de agua, probablemente no.

- Se documenta como limitación esperada.
- La composición de las tomas debe apoyarse en la roca y la baranda, no en el agua.
- Si el resultado es malo, se acepta como característica de la captura: **no se modela agua a mano** (principio P1).

### RT-5 — Correspondencia entre geometría reconstruida y datos GPS
**Severidad: media**

El entrenamiento produce una escena en unidades arbitrarias y con orientación arbitraria. La capa de datos (RF-013 a RF-016, RF-020) necesita metros reales y altitudes reales. La conexión entre ambos mundos depende del objeto de tamaño conocido incluido en la captura y del track GPS.

- Es una tarea de **alineación y escalado** que hoy nadie del equipo ha hecho nunca.
- Se aborda en S2 (al publicar las escenas) y se consume en S6.
- **Es la incógnita más subestimada del proyecto.** Se anota aquí para que no sorprenda.

---

## 8. Qué queda por validar

Lista abierta. Cada punto tiene dueño y sprint. Ninguno está resuelto hoy.

| # | Pregunta abierta | Dueño | Se resuelve en |
|---|---|---|---|
| V1 | ¿1x o 2x en la captura, dado que 1x (~26 mm) queda bajo el rango recomendado? | Juan Urrego | S1 |
| V2 | ¿Cada cuántos cuadros se extraen imágenes del video 4K60? | Juan Urrego | S2 |
| V3 | ¿Cuántas gaussianas necesita el tramo para verse bien? | Juan Urrego | S2 |
| V4 | ¿Cuánto pesa realmente una escena nuestra en SOG? → fija RNF-003 | Juan Urrego | S2 |
| V5 | ¿Cuánto tarda el entrenamiento en la estación del equipo? | Juan Urrego | S2 |
| V6 | ¿Qué celular concreto se adopta como "gama media" de referencia? | Alejandra Chambueta | S3 |
| V7 | ¿WebGPU con repliegue a WebGL funciona en Safari iOS vigente? | Alejandra Chambueta | S3 |
| V8 | ¿Qué `splatBudget` real sostiene 30 fps en el dispositivo de referencia? | Alejandra Chambueta | S4 |
| V9 | ¿Cómo se alinea y escala la escena contra el track GPS? | David Beltrán | S2→S6 |
| V10 | ¿Cuál es el presupuesto de triángulos y de peso por modelo de ficha? | Felipe Acevedo | S2b |
| V11 | ¿Hace falta Streamed SOG o basta con SOG plano? | Alejandra Chambueta | S4 |
| V12 | ¿Se nota el salto de color entre escenas al encadenarlas? | Felipe Acevedo | S4 |

---

## 9. Qué se descargó y probó (estado al 11/08/2026)

| Herramienta | Estado | Nota |
|---|---|---|
| PlayCanvas Engine 2.21.3 | ✅ Instalado vía npm | Proyecto base levantado |
| SuperSplat (editor web) | ✅ Probado | Sobre escenas de ejemplo públicas, no propias |
| SplatTransform CLI | ⏳ Pendiente | Se instala en S2, cuando haya PLY que convertir |
| Estación con GPU | ✅ Disponible | Del equipo. Especificaciones `[por documentar]` |
| iPhone 13 o equivalente | ✅ Disponible | Del equipo |
| Escenas SOG de ejemplo | ✅ Cargadas en el visor | Para calibrar peso y calidad esperados |
| Track GPS de prueba | ⏳ Pendiente | Se graba en la salida de campo (S1) |

---

## 10. Conclusión

El stack está **cerrado, es gratuito y es open source de punta a punta** (MIT en motor y editor, especificación abierta en el formato). No hay dependencia de presupuesto ni de licencias, y el hardware necesario ya lo tiene el equipo.

El riesgo del proyecto **no está en el software**: la API para cargar un SOG en PlayCanvas son seis líneas. Está en la física de la captura —una mañana nublada y sin viento, con exposición bloqueada, en un bosque de estructuras finas— y en lo que la técnica sabe hacer mal. Por eso el Sprint 1 se dedica entero a decidir el sendero y a preparar y ejecutar la salida, y por eso el margen de estimación es del 50 % y no del 30 %.

---

## Fuentes consultadas

- [3D Gaussian Splatting for Real-Time Radiance Field Rendering — Kerbl, Kopanas, Leimkühler, Drettakis (INRIA)](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)
- [SIGGRAPH — ficha del paper](https://history.siggraph.org/learning/3d-gaussian-splatting-for-real-time-radiance-field-rendering-by-kerbl-kopanas-leimkuehler-and-drettakis/)
- [The SOG Format — PlayCanvas Developer Site](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/sog/)
- [PlayCanvas Open Sources SOG: The WebP of Gaussian Splatting](https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/)
- [PlayCanvas Adopts SOGS for 20x 3DGS Compression](https://blog.playcanvas.com/playcanvas-adopts-sogs-for-20x-3dgs-compression/)
- [playcanvas/sogs — repositorio](https://github.com/playcanvas/sogs)
- [SuperSplat Editor — PlayCanvas Developer Site](https://developer.playcanvas.com/user-manual/supersplat/editor/)
- [playcanvas/supersplat — repositorio (MIT)](https://github.com/playcanvas/supersplat)
- [Introducing SplatTransform: CLI Tool for 3D Gaussian Splats](https://blog.playcanvas.com/introducing-splat-transform-cli-tool/)
- [Taking Photos — guía de captura de PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/taking-photos/)
- [Recommended Tools — PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/recommended-tools/)
- [Performance — Building Splat Applications, PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/performance/)
- [Streamed SOG / LOD Streaming — PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/lod-streaming/)
- [GSplatComponent — PlayCanvas Engine API Reference](https://api.playcanvas.com/engine/classes/GSplatComponent.html)
- [playcanvas — paquete npm (v2.21.3, MIT)](https://registry.npmjs.org/playcanvas/latest)
- [Seeing beyond vegetation: comparative occlusion analysis between MVS, NeRF and Gaussian Splatting](https://www.sciencedirect.com/science/article/pii/S2667393225000080)
- [ForestSplat: Scalable and High-Fidelity Forestry Mapping Using 3D Gaussian Splatting](https://www.mdpi.com/2072-4292/17/6/993)
- [WebSplatter: Enabling Cross-Device Efficient Gaussian Splatting in Web Browsers via WebGPU](https://arxiv.org/html/2602.03207v1)
