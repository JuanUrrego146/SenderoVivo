# Backlog propuesto: del prototipo al proyecto real

> **Propuesta, todavía no aplicada.** Sustituye las 53 issues abiertas por 44 tareas escritas
> sobre lo que ya existe. Las 14 issues cerradas se conservan como registro de lo entregado.
>
> Fecha: 25 de agosto de 2026 · Cierre del proyecto: 28 de noviembre de 2026 (14 semanas)
> · Auditoría del estado real: `plan/resumen-auditoria-2026-08-24.md`

---

## 1. Por qué se rehace el backlog

El backlog actual se escribió en la semana 1, **antes de saber que había que entregar un
prototipo**. Asumía que todo se construía desde cero. Hoy hay **4.875 líneas de JavaScript
funcionando y publicadas**, y eso hace que las tareas describan un proyecto que ya no es este:
piden construir cosas que existen, nombran archivos que se borraron, y reparten trabajo según
un plan anterior al prototipo.

El equipo lo dijo con sus palabras: *"no entiendo qué tengo que hacer"*. Tenían razón.

---

## 2. Qué hay hoy, verificado en producción

No es lo que dicen los documentos: es lo que respondió <https://senderovivo.pages.dev> al
inspeccionarlo el 25/08/2026.

### 2.1 Código que funciona

| Archivo | Líneas | Qué hace |
|---|---|---|
| `src/app/main.js` | 536 | Arranque: carga la escena, monta cámara, nivela, activa streaming y cablea los POIs |
| `src/poi/PoiManager.js` | 1.217 | Marcadores de POI leídos de `config/pois.json`. **Cargó 3 POIs** |
| `src/poi/PoiCard.js` | 1.156 | Ficha: nombre científico en cursiva, altitud, botones de canto y narración |
| `src/ui/shell.js` | 591 | Interfaz de Eybar: HUD, Bitácora, filtros, y **su propio catálogo de 6 hotspots** |
| `src/WorldModel.js` | 368 | Modelo 3D anclado a coordenadas del mundo |
| `src/engine/TourEngine.js` | 229 | Recorrido guiado, mirada 360°, guardar y restaurar posición |
| `src/engine/TrailMarkers.js` | 280 | Flechas 3D sobre el camino |
| `src/engine/TrailPath.js` | 125 | Corredor: nadie se sale del trazado autorizado |
| `src/engine/TrailRecorder.js` | 66 | Editor de trazado (`?editor=1`) |

**Total: 4.875 líneas.**

### 2.2 Lo que se ve en pantalla ahora mismo

Escena escaneada recorrible · recorrido guiado con flechas · mirada 360° · pantalla de carga
con reintento · HUD con altitud, recorrido, desnivel y pendiente · Bitácora con especies vistas
· filtros de fauna y flora · panel de especies · modo celular · streaming con 4 niveles de
detalle · fichas de POI con audio.

### 2.3 Datos y arte

- `config/scenes.json` — 4 empaques de **una sola escena** (la del parque de práctica):
  completa 56 MB, Luma liviana 16 MB, streaming, y podada para móvil.
- `config/pois.json` — 3 POIs declarados.
- `config/track.json` — trazado de la escena de práctica.
- `assets/models/golondrina-plomiza.glb` — **el único modelo real del proyecto** (6,6 MB, 3.016
  triángulos), con pipeline reproducible propio en `scripts/modelos/`.
- `assets/audio/` — canto y narración de la golondrina.

### 2.4 Lo que NO existe

`src/audio/` · `src/data/` · `assets/text/` (ninguna transcripción) · `config/soundscape.json`
· `QualityProfile.js` · `colibri-chillon.glb` · `muro-antiguo.glb` · ninguna medición de fps ·
ninguna animación en ningún modelo.

---

## 3. Los siete problemas a resolver

**1. Dos sistemas de puntos de interés vivos a la vez.** `PoiManager` carga 3 POIs del JSON y
`shell.js` dibuja 6 hotspots de una lista escrita a mano. El visitante ve los dos superpuestos.
**Decisión tomada: se queda el de Alejandra y se migra el contenido de Eybar al JSON.**

**2. Dos de los tres POIs apuntan a modelos que no existen.** `pois.json` pide
`colibri-chillon.glb` y `muro-antiguo.glb`; ninguno está en el repositorio.

**3. Los tres POIs están en la coordenada (0,0,0).** No están colocados: son marcadores de
posición esperando la visita al sendero.

**4. El código no sigue el modelo MVC** que exige el curso. Está organizado por módulos
técnicos. **Decisión tomada: el refactor entra ya, antes de seguir construyendo.**

**5. El invariante 3 se cumple a medias.** Añadir un POI ya no toca código para el modelo y los
textos, pero **`PoiCard.js` tiene las rutas de audio escritas a mano** apuntando a la
golondrina: con un segundo POI de fauna sonaría el ave equivocada.

**6. Nadie ha medido los fps.** Hay presupuestos fijados (3,5 M en escritorio, 1 M en móvil)
pero cero evidencia. Es el único requisito medible que no depende de nadie externo.

**7. El escaneo del sendero real no ha empezado.** Depende del acuerdo con el Acueducto.

---

## 4. La estructura MVC

Es la reorganización que hay que hacer primero, porque todo lo demás nace encima.

```
src/
  models/       ← datos y reglas. No conoce el DOM ni el motor 3D
      PoiCatalog.js       lee config/pois.json y valida
      SceneCatalog.js     lee config/scenes.json
      GpsTrack.js         lee config/track.json
      Soundscape.js       lee config/soundscape.json
      TrailModel.js       trazado, corredor y distancias
      QualityProfile.js   capacidades del dispositivo
  views/        ← todo lo que pinta. No decide nada
      SceneView.js        escena, nivelación, streaming
      TrailArrowsView.js  flechas 3D
      PoiMarkersView.js   marcadores
      PoiCardView.js      ficha
      ModelView.js        visor 3D de la ficha
      HudView.js          datos del recorrido
      ShellView.js        cascarón, filtros, bitácora
      OverlayView.js      carga y error
  controllers/  ← orquesta y responde a la entrada
      TourController.js   avance, mirada, corredor
      PoiController.js    seleccionar, abrir y cerrar ficha
      AudioController.js  ambiente y audio espacial
      DataController.js   alimenta el HUD desde el track
      AppController.js    arranque y cableado
```

**La regla que hace que esto funcione:** un Modelo nunca importa una Vista, una Vista nunca
decide nada, y la comunicación entre capas va por eventos (`tour:progress`, `poi:selected`),
no por llamadas directas.

---

## 5. Las 44 tareas

### 5.1 Software · Arquitectura MVC — 5 tareas

| Id | Tarea | Quién |
|---|---|---|
| SW-01 | Definir la estructura MVC y documentarla en `docs/03-arquitectura.md` | Juan |
| SW-02 | Mover datos y contratos a `src/models/` | Alejandra |
| SW-03 | Mover visor y cascarón a `src/views/` | Alejandra + Eybar |
| SW-04 | Mover la orquestación a `src/controllers/` | Alejandra |
| SW-05 | Comprobar que el visor se comporta igual tras el refactor | David |

### 5.2 Software · Modelo — 4 tareas

| Id | Tarea | Quién |
|---|---|---|
| SW-06 | Catálogo de POIs que avisa con mensaje claro cuando el JSON está mal | Alejandra |
| SW-07 | Track GPS como modelo consultable, sin depender del motor 3D | David |
| SW-08 | Publicar `config/soundscape.json` con su contrato y un ejemplo válido | Juan |
| SW-09 | Perfil de calidad del dispositivo, con `maxSpatialAudioSources` | Alejandra |

### 5.3 Software · Vista — 8 tareas

| Id | Tarea | Quién |
|---|---|---|
| SW-10 | Dejar un solo sistema de marcadores de POI | Alejandra |
| SW-11 | Pasar el catálogo de especies de `shell.js` a `config/pois.json` | Juan |
| SW-12 | Ficha con consejos de avistamiento y cómo identificar en campo | Alejandra |
| SW-13 | Transcripción accesible desde la ficha | Alejandra + Alberto |
| SW-14 | Visor 3D que avisa con claridad si falta el modelo | Alejandra |
| SW-15 | HUD alimentado por el track real, no por una constante | David |
| SW-16 | Onboarding la primera vez, breve y omitible | Eybar |
| SW-17 | Accesibilidad: contraste AA, y nada que dependa solo del color | Eybar |

### 5.4 Software · Controlador — 6 tareas

| Id | Tarea | Quién |
|---|---|---|
| SW-18 | Controlador del recorrido guiado, con parada en los puntos de interés | Alejandra |
| SW-19 | Controlador de POIs: abrir, cerrar y volver exactamente donde estabas | Alejandra |
| SW-20 | Ambiente sonoro que nunca arranca solo | David |
| SW-21 | Audio espacial binaural anclado a coordenadas del sendero | David |
| SW-22 | Datos del recorrido calculados desde el track | David |
| SW-23 | Encadenar las tres escenas sin cortes ni pantalla en negro | Alejandra |

### 5.5 Software · Calidad — 3 tareas

| Id | Tarea | Quién |
|---|---|---|
| SW-24 | Medir y fijar los 30 fps en el dispositivo de referencia | Alejandra |
| SW-25 | WebGPU con repliegue automático a WebGL | Alejandra |
| SW-26 | Integración final, pruebas cruzadas y entrega documental | Juan |

### 5.6 Arte — 12 tareas

| Id | Tarea | Quién |
|---|---|---|
| ART-01 | Colibrí chillón · *Colibri coruscans* | Felipe modela · Alberto texturiza |
| ART-02 | Colibrí inca · *Coeligena bonapartei* | Felipe modela · Alberto texturiza |
| ART-03 | Trogón enmascarado · *Trogon personatus* | Felipe modela · Alberto texturiza |
| ART-04 | Periquito de alas amarillas · *Pyrrhura calliptera* | Felipe modela · Alberto texturiza |
| ART-05 | Animación de aleteo para las cuatro aves | Felipe |
| ART-06 | Verificar los nombres científicos que faltan | Felipe |
| ART-07 | Helecho arbóreo y flora del tramo | Felipe + Alberto |
| ART-08 | Puente de madera y señalización | Felipe + Alberto |
| ART-09 | Escribir los guiones de narración y sus transcripciones | Alberto |
| ART-10 | **Grabar las voces de las narraciones** de fauna, flora y patrimonio | Alberto + Felipe · *espera campo* |
| ART-11 | Contenido patrimonial con fuente citable | Alberto |
| ART-12 | Optimización final del catálogo 3D | Felipe |

**Las cuatro aves salen del catálogo verificado** de `docs/06-contenido-de-la-experiencia.md`
§A.3. Las anteriores (mirla, copetón, pava andina) quedaron fuera: dos están *Por verificar* y
la pava tiene *Discrepancia* sin resolver, así que sus fichas no se podrían publicar.

**Por qué ART-09 y ART-10 son dos tareas y no una.** El **guion** se puede escribir desde ya
para las especies que ya tienen ficha, y la **transcripción** sale del propio guion, que es lo
que exige RNF-006 para accesibilidad. La **grabación de las voces** espera a la visita: lo que
se cuenta de cada especie y de cada punto patrimonial depende de qué hay realmente en los 200 m
y de qué se ve desde el trazado, y eso solo se sabe estando allá.

Las voces las ponen **Alberto y Felipe**. No se confunde con la grabación de campo de V3
(CAM-04, de David), que es otra cosa: aquella captura el lecho ambiente y los cantos reales de
las aves en el sendero; esta es la voz humana que narra la ficha.

**Regla que sigue vigente:** si un canto no se logra grabar, la ficha lo dice y no suena. No se
descarga de bancos de sonido.

### 5.7 Campo y gestión — 6 tareas

| Id | Tarea | Quién |
|---|---|---|
| CAM-01 | Acuerdo con el Acueducto: permisos, calendario y reservas | Juan |
| CAM-02 | Visita de reconocimiento V1, sin grabar | Todo el equipo |
| CAM-03 | Captura principal V2 | Juan |
| CAM-04 | Grabación del paisaje sonoro V3 | David |
| CAM-05 | Reconstruir y publicar las tres escenas del tramo | Juan |
| CAM-06 | Verificación en campo V4 | Juan |

**Todas las fechas de campo quedan `[por definir]`** hasta la reunión con el Acueducto. No se
inventan: se rellenan cuando haya calendario.

---

## 6. Cómo se reparte en las 14 semanas

| Fase | Semanas | Qué se cierra |
|---|---|---|
| **Base** | 3–4 | MVC (SW-01 a SW-05), un solo sistema de POIs, arranca el arte |
| **Cimientos** | 5–7 | Modelos de datos, `soundscape.json`, audio ambiente, primeras aves |
| **Contenido** | 8–11 | Audio espacial, datos reales del track, aves completas, narraciones |
| **Experiencia** | 12–14 | Onboarding, accesibilidad, rendimiento medido, escenas encadenadas |
| **Entrega** | 15 | Integración, pruebas cruzadas y documentación |

**Hay holgura a propósito.** El curso carga trabajos extra sin avisar, así que ninguna semana
va llena: si alguien pierde una semana, se recupera sin mover la fecha de entrega.

---

## 7. Lo que cambia respecto al backlog viejo

| Antes | Ahora |
|---|---|
| Nombres tipo "HU-27 Visor 3D girable" | Nombres que dicen la acción y el porqué |
| Criterios escritos para construir desde cero | Cada tarea arranca por lo que ya existe |
| Archivos previstos que no existen | Rutas MVC reales |
| Reparto anterior al prototipo | Reparto según quién escribió cada cosa |
| POIs asignados a David | POIs de Alejandra, que es quien los construyó |
| Cuatro aves, tres sin fuente citable | Cuatro aves verificadas y publicables |
| Sin distinguir lo que depende del sendero | Bloque de campo separado, con fechas por definir |

---

## 8. David: en pausa hasta que su rama esté al día

**Decisión de Juan del 25/08:** a David **no se le asigna nada** hasta que su rama esté
actualizada e integrada con el resto. Hoy está 36 commits atrás y su diff contra `develop`
borraría **8.152 líneas**, incluida toda la interfaz de Eybar. Ayer eran 4.602: el número crece
cada día que `develop` avanza.

Lo que hay que hacer antes de darle tareas, en este orden:

1. **QA trae a `develop` los tres archivos suyos que sí se integran tal cual**, sin fusionar su
   rama: `src/audio/AmbienceController.js` (68 líneas, clase autónoma sin imports),
   `config/soundscape.json` (el contrato de la ambientación, ya bien escrito) y
   `assets/audio/AudioPrueba.mp3`.
2. **QA no trae las 119 líneas de cableado** de `src/app/main.js`: llaman a `cssFromToken`, que
   no existe en `develop` (allí se llama `colorFromToken`), y crean un botón flotante que
   duplica la pestaña «Sonidos» que ya existe en la interfaz de Eybar.
3. **QA recrea `dev/david-beltran`** desde `develop` actual.
4. **Solo entonces** se le asignan SW-07, SW-20, SW-21 y SW-22.

### 8.1 Corrección sobre `config/soundscape.json` (26/08)

Una versión anterior de este documento decía que el archivo «no hay que redactarlo porque David
ya lo escribió». **Eso ya no se sostiene.** Lo escribió en su commit `5d6c30e`, sí, pero al
recrear su rama el archivo no sobrevivió: hoy **no está ni en `develop` ni en
`dev/david-beltran`**, solo en ese commit original y en la etiqueta de respaldo de QA.

**Decisión del PM:** el archivo se trae, pero **con `ambienceUrl` en `null`** y sin
`assets/audio/AudioPrueba.mp3`. Razones:

- Su `ambienceUrl` apunta a un mp3 de prueba de 3,4 MB. Traer el JSON sin el mp3 dejaría una
  referencia rota; traer el mp3 mete en el repositorio 3,4 MB de audio desechable que se
  sustituye en cuanto se grabe el lecho real en V3.
- **`AmbienceController` ya contempla el caso nulo por diseño**: hace
  `this.ambienceUrl = cfg?.ambienceUrl || null` y tanto `play()` como `_ensureAudioElement()`
  salen temprano si no hay URL. El botón de David muestra «En silencio (prototipo)» en ese
  estado. Es decir, `null` no es un apaño: es el estado previsto mientras no haya grabación.

Con eso el contrato queda publicado y David puede declarar fuentes sin tocar código, que es lo
que exige RNF-009, sin arrastrar un archivo provisional.

---

## 9. Defectos abiertos que no tienen issue

Detectados el 25 y 26/08. Entran en el backlog nuevo; ninguno está registrado hoy.

| # | Defecto | Dónde entra |
|---|---|---|
| 1 | **`assets/models/muro-antiguo.glb` no existe** aunque `config/pois.json` lo referencia. Es el mismo defecto que el colibrí, pero este no está en ninguna issue | ART-11 (patrimonio) y SW-06 (validación) |
| 2 | **39 `console.log` en producción**: `PoiManager.js` 17, `ModelViewer.js` 9, `PoiCard.js` 8, `WorldModel.js` 5. `PoiManager` imprime la ficha completa de cada POI en la consola, a la vista de cualquiera | SW-02 a SW-04: al mover el código a MVC se limpian |
| 3 | **`pois.json` declara un POI de una escena que no existe** (`muro-antiguo` apunta a `scene-02`) y los tres POIs están en la coordenada (0,0,0) | SW-06: la validación debe avisar de esto |

---

## 10. Cómo trabajan los agentes

**Un worktree por agente.** El 25/08 el agente PM y el agente QA compartieron el mismo
directorio de trabajo: el PM cambió la rama a `develop` y commiteó mientras QA integraba, y el
`git branch -f develop` de QA falló con *cannot force update the branch used by worktree*. Git
evitó el choque, pero por suerte, no por diseño. QA salió adelante haciendo las fusiones sin
checkout, con plumbing (`merge-tree --write-tree` → `commit-tree` → `update-ref`).

**Reglas que quedan:**

1. Cada agente trabaja en **su propio worktree**, nunca en el árbol principal.
2. **El PM no cambia de rama** en un árbol compartido. Si necesita publicar documentación,
   commitea sobre la rama que ya esté activa y avisa, o se lo pasa a QA.
3. **Solo QA fusiona ramas.** El PM audita, escribe y reparte tareas.

---

## 11. Pendiente de decisión

1. **Las issues de Jira no se pueden borrar** desde el conector: solo crear, editar y cambiar
   de estado. O las borra Juan a mano, o quedan marcadas como canceladas.
2. **El componente `<model-viewer>` se descarga de un CDN.** Hoy la ficha 3D depende de que
   haya internet más allá del propio sitio. Hay que decidir si se empaqueta antes de la entrega.
3. ~~Si Alberto pasa a apoyar interfaz, las texturas se quedan sin dueño.~~ **RESUELTO el 26/08:**
   Alberto lleva las dos cosas. Sigue en texturas y contenido, y **entra a apoyar interfaz hacia
   finales de septiembre**, cuando el refactor a MVC ya esté terminado y las vistas separadas, para
   que no se pise con nadie. Eybar sigue siendo el responsable de la interfaz.
4. **`muro-antiguo` en `pois.json`**: o se le modela un `.glb`, o se retira del JSON hasta que
   V1 identifique qué es realmente ese punto patrimonial. Hoy apunta a una escena inexistente.
