# Resumen para auditoría: backlog contra realidad, 24 de agosto de 2026

> Auditoría del backlog completo (67 issues de GitHub y 71 de Jira) contra el código realmente
> publicado en `develop` y contra las ramas personales sin fusionar. Ejecutada por el agente de
> gestión de proyecto; todos los cambios ya están aplicados en ambos sistemas.
>
> Antecedente: `plan/resumen-auditoria-2026-08-13.md`.

---

## 1. El diagnóstico en una frase

**Hay un prototipo funcional publicado y el tablero no lo sabía.** Antes de esta auditoría,
60 issues de GitHub tenían 7 cerradas y el tablero de Jira tenía **63 de 64 historias en
«Tareas por hacer»** — mientras <https://senderovivo.pages.dev> servía una escena escaneada
recorrible, con interfaz completa, HUD de datos, fichas de especies, modo celular y streaming
por niveles de detalle.

Además: **dos personas tienen trabajo entregado que nunca se fusionó**, y una de esas ramas,
si se fusiona tal cual, borra la interfaz que hoy está en producción.

---

## 2. Lo que se corrigió, por tipo

### 2.1 Desajustes de metadatos entre GitHub y Jira (10 issues)

| Qué estaba mal | Dónde | Corrección |
|---|---|---|
| Cerrada en GitHub, «por hacer» en Jira | HU-50, HU-39, HU-55 | Jira → **Finalizada** |
| Titular en GitHub ≠ titular en Jira | HU-11, HU-12, HU-13, HU-14, HU-47 | Añadida etiqueta `alberto-aleman` en Jira (GitHub ya lo tenía como asignado) |
| Etiqueta `resp-felipe-acevedo` con Juan asignado | HU-08 (#10) | Etiqueta → `resp-juan-urrego`, coincide con Jira |
| Hito M1 en una historia de sprint 5 | HU-46 (#36) | Hito → **M5: Puntos de interés** |
| Etiqueta `blocked` obsoleta | HU-01 (#1) | Retirada: ADR-001 está **Aceptada** y ratificada |

### 2.2 Historias completas que seguían abiertas (4 cerradas)

Se cerraron solo las que cumplen **todos** sus criterios y están **fusionadas en `develop`**:

| HU | GitHub | Jira | Evidencia |
|---|---|---|---|
| HU-01 Cerrar la decisión de sendero | [#1](https://github.com/JuanUrrego146/SenderoVivo/issues/1) | SCRUM-5 | ADR-001 con las 3 opciones contra C1–C6, estado Aceptada |
| HU-17 Progreso de carga y fallo con reintento | [#21](https://github.com/JuanUrrego146/SenderoVivo/issues/21) | SCRUM-30 | Overlay con progreso en MB, error en español, botón Reintentar |
| HU-18 Avanzar y retroceder por el trazado | [#22](https://github.com/JuanUrrego146/SenderoVivo/issues/22) | SCRUM-8 | `TourEngine.js`: teclado, ratón, táctil, avance gradual, `tour:progress` |
| HU-20 Restringir el desplazamiento al trazado | [#24](https://github.com/JuanUrrego146/SenderoVivo/issues/24) | SCRUM-14 | `TrailPath.js` con `corridorRadius` 1,5 |

### 2.3 Estado real anotado en 25 issues

Cada issue desalineada recibió un comentario **«Auditoría de PM · 24/08/2026»** con qué existe,
en qué archivo o rama, y qué falta exactamente. Las 25: #7, #8, #9, #10, #11, #12, #14, #20,
#23, #27, #28, #29, #30, #31, #32, #34, #35, #36, #37, #39, #40, #41, #42, #45, #56.

### 2.4 Estados intermedios: el tablero ya no miente

Se creó la etiqueta `en-curso` en GitHub y se aplicó a **21 issues** con trabajo empezado y
verificable. En Jira, las mismas pasaron a **En curso** (y HU-56 a **En revisión**, porque su
código está terminado y solo espera fusión).

Jira pasa de 1 historia fuera de «por hacer» a **35**: 14 Finalizada, 20 En curso, 1 En revisión.

### 2.5 Trabajo entregado que no tenía issue (5 nuevas)

Semanas de trabajo real sin rastro en el backlog. En un proyecto académico eso es esfuerzo que
no se ve:

| HU | Título | GitHub | Jira | Estado |
|---|---|---|---|---|
| HU-64 | Bitácora, filtros por categoría y panel de especies | [#64](https://github.com/JuanUrrego146/SenderoVivo/issues/64) | SCRUM-67 | Cerrada |
| HU-65 | Escena Luma alterna y switch de técnica con coordenadas registradas | [#65](https://github.com/JuanUrrego146/SenderoVivo/issues/65) | SCRUM-68 | Cerrada |
| HU-66 | Pipeline reproducible de Maya `.mb` a GLB sin Maya | [#66](https://github.com/JuanUrrego146/SenderoVivo/issues/66) | SCRUM-69 | Cerrada |
| HU-67 | Guía de producción de vídeo a web (`docs/08`) | [#67](https://github.com/JuanUrrego146/SenderoVivo/issues/67) | SCRUM-70 | Cerrada |
| HU-68 | Vídeo demo del prototipo y difusión institucional | [#68](https://github.com/JuanUrrego146/SenderoVivo/issues/68) | SCRUM-71 | **Abierta** — falta reintentar Amigos de la Montaña |

### 2.6 Riesgos de integración que no estaban en ninguna parte (2 nuevas, bloqueantes)

| HU | Título | GitHub | Jira |
|---|---|---|---|
| HU-62 | Unificar el sistema de POIs: una sola implementación en `develop` | [#62](https://github.com/JuanUrrego146/SenderoVivo/issues/62) | SCRUM-65 |
| HU-63 | Rebasar la rama de David sobre `develop` antes de integrar el audio | [#63](https://github.com/JuanUrrego146/SenderoVivo/issues/63) | SCRUM-66 |

---

## 3. Los tres hallazgos que exigen una decisión de Juan

### 3.1 Hay dos sistemas de POIs y el invariante 3 está roto en producción

- En `develop`: los hotspots y las fichas viven dentro de `src/ui/shell.js`, con el catálogo de
  especies **escrito a mano en el propio archivo**. `develop` **no lee `config/pois.json` en
  ningún sitio**, aunque el archivo existe y está bien formado.
- En `dev/alejandra-chambueta`, **sin fusionar**: `PoiManager.js` (1.218 líneas), `PoiCard.js`
  (1.157), `ModelViewer.js` (308) y `WorldModel.js` (369), que **sí** leen `config/pois.json`.
  Commits `6207ad3`, `085ae49`, `864fab1`, más los audios de la golondrina.

Consecuencia: hoy, **añadir un POI sí requiere tocar código**. El invariante 3 del proyecto
(«añadir un POI, una escena o una fuente de sonido no toca código») está incumplido en producción.

Bloquea a seis historias de David (HU-25, HU-26, HU-27, HU-28, HU-29, HU-30) y a HU-56 de
Alejandra. **Mientras no se decida cuál manda, cualquiera que empiece produce una tercera versión.**

### 3.2 La rama de David borraría la interfaz de Eybar

`git diff --stat origin/develop origin/dev/david-beltran` → **665 inserciones, 4.602 eliminaciones**.

Su commit `5d6c30e` (`AmbienceController.js`, 68 líneas) es trabajo válido. El problema es la
base: su rama sale del refactor modular que se revirtió en `6ba4088`. Fusionarla tal cual borra
`src/ui/shell.js`, `styles/glass.css`, `tailwind.config.js`, `tailwind.in.css`, los scripts de
modelos y `muestrear.js`, y reintroduce archivos que ya no existen.

### 3.3 Alejandra está asignada a motor pero trabaja en 3D

Las descripciones de Jira registran el reajuste del 18/08: *«Alejandra pasa a integración de
modelos 3D y elementos 3D en escena»*. Y sus tres commits lo confirman: POIs y modelo 3D.

Pero en GitHub sigue asignada a cinco historias de motor: HU-16 (#20), HU-21 (#26), HU-45 (#27),
HU-22 (#28), HU-23 (#29). El reajuste vive solo en el texto de Jira y nunca llegó a los asignados.

**Esta auditoría no reasigna personas: eso es decisión de Juan.** Pero el desajuste está anotado
en cada issue afectada.

---

## 4. Datos medidos que contradicen criterios de aceptación vigentes

Tres historias piden cosas que la práctica ya demostró incorrectas. Están anotadas en sus issues:

| HU | Lo que dice el criterio | Lo que se midió |
|---|---|---|
| HU-07 (#9) | «V5 resuelta: ~5 h por escena» y «V3 resuelta: 1,5 M de gaussianas» | La receta de publicación real es **60 mil pasos, 5 M, ~19,5 h**. Con 2,5 M a 30 mil pasos las gaussianas salen filamentosas. Son ~60 h de cómputo para tres escenas, no 15 |
| HU-08 (#10) | «Escenas recortadas al tramo de interés» | **Sin cajas de recorte.** La caja se aplica en el marco de COLMAP, torcido 151,5°, y corta en diagonal. Hoy se filtra por umbrales medidos con `medir.js` y `filtrar.js` |
| HU-06 (#8) | «Extraer 1 de cada 20 cuadros» | Confirmado por medición: con 1/30 quedaron 121 imágenes en un modelo desconectado |

---

## 5. Lo que sigue bloqueado, y por qué

**M1 «Decisión y reconocimiento» vencía hoy, 24/08**, y quedan 11 issues abiertas en ese hito.
Casi todas cuelgan de lo mismo:

- **HU-42 (#4), la visita V1**, sigue `blocked` — con razón. Depende del permiso de la EAAB.
- **HU-60 (#61)**, el contacto con la EAAB, está enviado (21/08) pero sin respuesta.
- De V1 dependen: las cifras reales del tramo (HU-31 a HU-35), los POIs con coordenada
  (HU-25), la calibración del ritmo (HU-24), el objeto de escala y el mapa sonoro (HU-02, HU-04).

**El hueco de datos más caro es otro y no depende de nadie externo: los fps nunca se han medido**
(HU-23 / #29). Hay presupuestos fijados (3,5 M escritorio / 1 M móvil) pero cero evidencia de que
sostengan 30 fps. Bloquea a Felipe en HU-51, cuyo criterio pide «los 30 fps se sostienen con todos
los POIs cargados». La medición exige ventana visible: con la pestaña oculta el `rAF` se congela.

---

## 6. Nota sobre Jira: la titularidad vive en etiquetas

**Juan es el único humano con cuenta en el sitio de Jira** (`unimilitar-team-ic64wte1`). Los otros
cinco no existen como usuarios, así que **no se pueden asignar historias** y el campo «Asignado»
seguirá vacío. La titularidad en Jira se lee de las etiquetas (`felipe-acevedo`,
`alejandra-chambueta`, …), que es lo que esta auditoría sincronizó contra los asignados de GitHub.

No es un defecto que se pueda arreglar desde aquí: o se invita a las cinco personas al sitio, o
las etiquetas siguen siendo la fuente de verdad. **GitHub manda; Jira es el espejo.**

**Deuda menor detectada:** las descripciones de Jira citan `docs/04-actividades-y-roles.md` y
`docs/05-catalogo-fauna-y-flora.md`, renombrados el 17/08 a `docs/04-backlog.md` y
`docs/06-contenido-de-la-experiencia.md`. Son ~60 descripciones; no se tocaron para no generar
ruido masivo en el tablero.

---

## 7. Recuento

| Sistema | Antes | Después |
|---|---|---|
| Issues de GitHub | 60 (7 cerradas) | **67** (14 cerradas, 21 con `en-curso`) |
| Historias de Jira | 60 (3 finalizadas, 57 por hacer) | **67** (14 finalizadas, 20 en curso, 1 en revisión) |
| Issues con comentario de estado real | 0 | **25** |
| Riesgos de integración registrados | 0 | **2 bloqueantes** |

---

## 8. Lo que le queda a cada quien esta semana

| Persona | Lo primero |
|---|---|
| **Juan** | Decidir HU-62 (cuál sistema de POIs manda) y ejecutar HU-63 (rebase de David). Son los dos bloqueos que paran a dos personas |
| **Juan** | Publicar `config/soundscape.json`, que falta desde el revert y bloquea a David (#7) |
| **Alejandra** | Nada nuevo hasta que se decida HU-62; su HU-56 está entregada y espera fusión |
| **David** | No fusionar su rama. Esperar HU-63 |
| **Felipe** | HU-47: animación idle de aleteo. El `.mb` no traía animación, así que es trabajo desde cero |
| **Eybar** | Verificar HU-37 en Safari iOS: es lo único que falta para cerrarla |
| **Alberto** | HU-15 y HU-48: contenido de narraciones y patrimonio, ninguno depende de V1 |
