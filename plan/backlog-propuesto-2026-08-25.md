# Backlog propuesto: del prototipo al proyecto real

> **Propuesta, todavía no aplicada.** Sustituye las 53 issues abiertas por 43 tareas escritas
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

## 5. Las 43 tareas

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

### 5.6 Arte — 11 tareas

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
| ART-09 | Narraciones y transcripciones de cada POI | Alberto |
| ART-10 | Contenido patrimonial con fuente citable | Alberto |
| ART-11 | Optimización final del catálogo 3D | Felipe |

**Las cuatro aves salen del catálogo verificado** de `docs/06-contenido-de-la-experiencia.md`
§A.3. Las anteriores (mirla, copetón, pava andina) quedaron fuera: dos están *Por verificar* y
la pava tiene *Discrepancia* sin resolver, así que sus fichas no se podrían publicar.

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

## 8. Pendiente de decisión

1. **Las issues de Jira no se pueden borrar** desde el conector: solo crear, editar y cambiar
   de estado. O las borra Juan a mano, o quedan marcadas como canceladas.
2. **El componente `<model-viewer>` se descarga de un CDN.** Hoy la ficha 3D depende de que
   haya internet más allá del propio sitio. Hay que decidir si se empaqueta antes de la entrega.
3. **Si Alberto pasa a apoyar interfaz**, las texturas de las cuatro aves se quedan sin dueño.
