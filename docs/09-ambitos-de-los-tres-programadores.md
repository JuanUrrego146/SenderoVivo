# Ámbitos de los tres programadores: Sendero Vivo

> Versión 1,0, 11/08/2026 · Responsable: Juan Urrego
> Decisión asociada: [`decisiones/ADR-004-reparto-de-ambitos.md`](decisiones/ADR-004-reparto-de-ambitos.md)

---

## 1. El problema que esto resuelve

El equipo tiene **tres programadores**: Juan Urrego, Alejandra Chambueta y David Beltrán. Tres personas escribiendo JavaScript sobre el mismo motor, en catorce semanas, sin un reparto explícito, terminan en el mismo archivo el mismo día.

La regla es la misma que se usa con los agentes: **cada uno tiene un ámbito, y el ámbito es una carpeta.** No "un tema", no "una responsabilidad conceptual": una carpeta con nombre, que aparece en el diff de la PR. Si dos personas tocan la misma carpeta en la misma semana, se ve inmediatamente y se habla.

---

## 2. El reparto

| Programador | Carpeta | Ámbito en una frase |
|---|---|---|
| **Alejandra Chambueta** | `src/engine/` | Todo lo que **mueve la cámara y dibuja la escena** |
| **David Beltrán** | `src/poi/` · `src/data/` · `src/audio/` | Todo lo que el visitante **activa** y todo lo que produce **números y sonido** |
| **Juan Urrego** | `src/app/` · `src/ui/` · `config/` | El **cableado**: arranque, orquestación, HUD y contratos de datos |

Y las carpetas que no son de programación:

| Carpeta | Dueño |
|---|---|
| `styles/`, tokens de color, tipografía, componentes | **Eybar Viasus** + **Alberto Alemán** |
| `assets/models/` · `assets/audio/` | **Felipe Acevedo** |
| `assets/scenes/` | **Juan Urrego** |
| `docs/` · `plan/` | **Juan Urrego** |

---

## 3. Qué hay dentro de cada ámbito

### 3.1 `src/engine/`: Alejandra Chambueta

| Módulo | Qué hace |
|---|---|
| `TourEngine` | El **único** que escribe posición y rotación de cámara |
| `SceneLoader` | Carga, precarga y descarga de escenas `.sog` |
| `TrailPath` | El trazado. `clampToTrail()` es la garantía de RF-004 |
| `CameraRig` | Ángulos, límites verticales, guardar y restaurar estado |
| `QualityProfile` | Detección de dispositivo, `splatBudget`, antialiasing, pixel ratio |
| `LodController` | **Nuevo.** Nivel de detalle por proximidad al recorrido (RF-027) |

**Nadie más escribe en `src/engine/`.** Ni para "un ajuste pequeño".

### 3.2 `src/poi/`, `src/data/` y `src/audio/`: David Beltrán

| Carpeta | Módulos |
|---|---|
| `src/poi/` | `PoiManager`, `PoiCard`, `ModelViewer` (incluye la animación idle, RF-029) |
| `src/data/` | `TrailDataLayer`, `GpsTrack` |
| `src/audio/` | `AmbienceController`, `SpatialAudioSource`, `AudioPlayer` |

Tres carpetas, un dueño, porque las tres responden a lo mismo: **lo que pasa cuando el visitante llega a un sitio**. El POI se activa, el dato cambia, el sonido se acerca. Separarlas entre dos personas obligaría a coordinar en cada historia de S5 y S6.

### 3.3 `src/app/` y `src/ui/`: Juan Urrego

| Carpeta | Qué hace |
|---|---|
| `src/app/` | `main.js`, arranque de la aplicación, cableado de módulos, gestión de estados globales, onboarding |
| `src/ui/` | `HudView` y el shell de la interfaz, **implementación** del diseño de Eybar y Alberto |
| `config/` | `scenes.json`, `pois.json`, `track.json`, `soundscape.json` y sus esquemas de validación |

Juan es el integrador: es quien conecta el motor de Alejandra con los POIs de David y con el diseño de Eybar y Alberto. Por eso `src/app/` es suyo, es la carpeta donde se ven los tres.

**Aclaración sobre `src/ui/`:** Eybar y Alberto son diseñadores, no programadores. Ellos son **dueños del diseño** (`styles/`, especificación de componentes, textos); Juan es quien **implementa** `HudView` y el shell consumiendo esos tokens. Una PR que cambie la apariencia sin que el diseño esté en `styles/` se rechaza.

---

## 4. Las tres fronteras

Donde dos ámbitos se tocan hay un contrato. Solo hay tres, y están escritas para que nadie tenga que adivinar.

### Frontera 1 · Motor → Datos y POIs (Alejandra → David)

`TourEngine` publica la posición del recorrido; nadie la pide a la cámara.

```javascript
// src/engine/TourEngine.js , Alejandra publica
this.events.fire('tour:progress', { distanceMeters, position, forward });

// src/data/ y src/poi/ , David escucha
tourEngine.events.on('tour:progress', ({ distanceMeters }) => { … });
```

**Regla:** `TrailDataLayer` y `PoiManager` **nunca** leen `camera.getPosition()`. Reciben `distanceMeters` y trabajan con eso. Es lo que permite probar la capa de datos sin motor.

### Frontera 2 · POIs → Motor (David → Alejandra)

Cuando se abre una ficha hay que guardar la cámara y luego restaurarla (RF-018). `PoiCard` **pide**; no toca.

```javascript
tourEngine.saveCameraState();     // David llama
tourEngine.restoreCameraState();  // David llama
```

**Regla:** ningún archivo bajo `src/poi/` importa nada de `src/engine/` salvo esta interfaz. Ningún archivo bajo `src/poi/` escribe posición ni rotación de cámara.

### Frontera 3 · Motor → Audio (Alejandra → David)

El oyente de audio espacial es la cámara. `QualityProfile` decide cuántas fuentes HRTF simultáneas admite el dispositivo; `AmbienceController` las respeta.

```javascript
// Alejandra expone
qualityProfile.maxSpatialAudioSources;   // 4 escritorio, 2 móvil , [por medir en S4]
```

**Regla:** `src/audio/` no configura el motor, y `src/engine/` no reproduce sonido.

---

## 5. Qué hacer cuando hay que tocar la carpeta de otro

Pasa, y no es un delito. El procedimiento:

1. **Se avisa en la issue antes de empezar**, no en la PR después.
2. **La PR la revisa obligatoriamente el dueño de la carpeta.** No cualquiera.
3. **El cambio se limita a lo mínimo.** Si hace falta refactorizar la carpeta de otro, eso es una issue del dueño, no un extra en tu PR.
4. Si dos personas necesitan la misma carpeta en el mismo sprint, se convoca la **revisión técnica de riesgo** (`01-principios-de-trabajo.md` §5) y sale una frontera nueva escrita aquí.

---

## 6. Revisión cruzada

Se ajusta la tabla de revisores de `01-principios-de-trabajo.md` §4 al reparto de tres:

| Autor | Revisor por defecto |
|---|---|
| Alejandra (`src/engine/`) | **David** |
| David (`src/poi/`, `src/data/`, `src/audio/`) | **Alejandra** |
| Juan (`src/app/`, `src/ui/`, `config/`) | **Alejandra** o **David**, alternando |
| Eybar / Alberto (`styles/`) | El otro de los dos, y **Juan** si afecta a tokens |
| Felipe (`assets/`) | **Juan** |

Nadie aprueba su propio trabajo. Juan no es revisor único de nada: si él integra y además revisa todo, deja de haber revisión.

---

## 7. Estructura de carpetas resultante

```
SenderoVivo/
├── src/
│   ├── app/          Juan       main.js, cableado, onboarding, estados globales
│   ├── engine/       Alejandra  TourEngine, SceneLoader, TrailPath, CameraRig,
│   │                            QualityProfile, LodController
│   ├── poi/          David      PoiManager, PoiCard, ModelViewer
│   ├── data/         David      TrailDataLayer, GpsTrack
│   ├── audio/        David      AmbienceController, SpatialAudioSource, AudioPlayer
│   └── ui/           Juan       HudView, shell  (diseño de Eybar + Alberto)
├── styles/           Eybar + Alberto   tokens.css, componentes
├── config/           Juan       scenes.json, pois.json, track.json, soundscape.json
└── assets/
    ├── models/       Felipe
    ├── audio/        Felipe
    ├── text/         Alberto
    ├── scenes/       Juan       (ignorado por Git)
    └── raw/          Juan       (ignorado por Git)
```

Cambios respecto a la estructura anterior: aparecen **`src/app/`**, **`src/audio/`** y **`styles/`**, y `src/ui/` pasa a tener a Juan como implementador con Eybar y Alberto como dueños del diseño.

---

## 8. Carga por programador

Con las 12 h semanales por persona que exige el curso:

| Programador | Sprints de carga principal | Épica | Ámbito |
|---|---|---|---|
| **Juan Urrego** | S1, S2, Cierre | E1 | Captura, contratos, integración, despliegue |
| **Alejandra Chambueta** | S3, S4 | E2 | Motor, cámara, rendimiento, LOD |
| **David Beltrán** | S5, S6 | E3, E4 | POIs, fichas, audio, capa de datos |

Los picos **no coinciden**, y eso es deliberado: cuando Alejandra está a tope en S3–S4, David revisa y prepara; cuando David está a tope en S5–S6, Alejandra revisa y optimiza. El reparto de carpetas es lo que hace que esa alternancia no genere conflictos de merge.

---

## 9. Referencias

- Invariantes de arquitectura: [`arquitectura.md`](arquitectura.md) §8
- Revisión de código y ceremonias: [`01-principios-de-trabajo.md`](01-principios-de-trabajo.md) §4 y §5
- Identidad visual y tokens: [`06-identidad-visual.md`](06-identidad-visual.md)
- Ambientación sonora: [`08-ambientacion-sonora.md`](08-ambientacion-sonora.md)
