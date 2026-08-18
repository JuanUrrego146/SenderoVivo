# Sendero Vivo

**Recorre 200 metros reales del sendero de la Quebrada La Vieja, sector Claro de Luna, Cerros Orientales de Bogotá, desde el navegador. Reconstruido con Gaussian Splats a partir de captura real, no modelado a mano.**

Repositorio: [`JuanUrrego146/SenderoVivo`](https://github.com/JuanUrrego146/SenderoVivo)

> **Empiezas a programar?** Lee primero [**CONTEXTO-EQUIPO.md**](CONTEXTO-EQUIPO.md): estado real del proyecto, cómo levantarlo, qué archivo tocas y las reglas que no se rompen.
>
> **Acceso rápido:** [**Guía de captura en campo**](docs/11-guia-de-captura-en-campo.md), el instructivo de escaneo paso a paso: configuración de cámara, pasadas por el sendero y procesamiento hasta el `.sog`.

---

## ¿De qué trata?

Los senderos de los Cerros Orientales son gratuitos y se reservan por la app del Acueducto. El acceso está resuelto; la información no. Quien va por primera vez no sabe cuánto dura, qué tan duro es, hasta dónde va a alcanzar a llegar, ni por dónde va exactamente el camino autorizado. El sendero completo son **7,3 km, +406 m de desnivel y unas 3 horas**. La gente se devuelve a mitad de camino, se sale del trazado dentro de una reserva protegida, camina sobre bosque altoandino sin entender qué ve, y quien no puede subir nunca conoce el lugar.

Sendero Vivo reconstruye **los primeros 200 metros**, el tramo de entrada, justo donde el visitante decide si sigue o se devuelve, y lo hace recorrible desde el navegador. La reconstrucción se hace con **Gaussian Splatting**: el sendero se **captura**, no se dibuja. Esa es la diferencia entre ver el render de alguien y reconocer el lugar cuando llegas.

La propuesta se sostiene en tres verbos:

- **Reconocer**: ver el camino real y saber a qué se va.
- **Entender**: aves, plantas, ecosistema e historia del lugar en fichas 3D ancladas a lugares reales del tramo.
- **Medir**: altitud, distancia, desnivel y pendiente reales, tomados con GPS en campo.

Y una cuarta dimensión que no es visual: **ambientación sonora binaural con audio espacial 3D**. La quebrada se oye donde la quebrada está.

**Ubicación:** Quebrada La Vieja, sector **Claro de Luna**, tramo de entrada. Calle 71 con Avenida Circunvalar, Chapinero. TransMilenio a 700 m.
**Tramo comprometido:** **200 m** en 3 escenas · Altitud de inicio 2.712 msnm `[por confirmar en campo]` · Desnivel y pendiente `[por medir en campo]`

---

## Empezar a trabajar

Cada quien clona y se pone en **su** rama:

```bash
git clone https://github.com/JuanUrrego146/SenderoVivo.git
cd SenderoVivo
git checkout dev/tu-nombre
```

Y antes de empezar el día, trae lo que haya en `develop`:

```bash
git pull origin develop
```

---

## Stack técnico

| Aspecto | Elección |
|---|---|
| Motor | **PlayCanvas Engine 2.21.3** (MIT) |
| Reconstrucción 3D | **3D Gaussian Splatting** (Kerbl et al., SIGGRAPH 2023) |
| Edición de splats | **SuperSplat** (MIT, corre en el navegador) |
| Formato de entrega | **SOG**, Spatially Ordered Gaussians, v2 |
| Compresión | **SplatTransform** CLI (`splat-transform in.ply out.sog`) |
| Captura | Celular (iPhone 13 o equivalente), video 4K a 60 fps, todo manual |
| Procesamiento | Estación con GPU del equipo |
| Modelos de ficha | glTF / `.glb` con animación idle incluida |
| Audio | **Web Audio API vía `SoundComponent`**, `panningModel: 'HRTF'` |
| Idioma del código | **Inglés** (variables, funciones, clases, ramas) |
| Idioma de UI y contenidos | **Español** |
| Estilo | Módulos con responsabilidad única. Contenido declarativo en JSON |
| Runtime | Node 24 / npm |
| Gráficos | WebGPU con **repliegue automático a WebGL** |
| Plataformas objetivo | Navegador de escritorio y de celular. **Sin app nativa** |
| Backend | Ninguno. Sitio estático servido por HTTPS |

**El stack está cerrado y el protocolo de captura de PlayCanvas se sigue al pie de la letra.** Ninguna de las funcionalidades nuevas lo modifica.

---

## Alcance

### SÍ

- **200 m desde el inicio del sendero**: en **3 escenas** encadenadas por etapas (0–70, 70–140, 140–200 m).
- **5–6 puntos de interés** completos, de tres tipos: **fauna**, **flora** y **patrimonio**.
- **Fichas 3D**: modelo girable con zoom y **animación idle de aleteo**, nombre común y científico, narración, canto, altura de distribución, identificación en campo y **consejos de avistamiento**.
- **Puntos de interés no vivos**: puertas derrumbadas, muros, monumentos y tramos de camino, con su historia y su fuente.
- **Recorrido guiado** con **mirada libre 360°**.
- **Nivel de detalle por proximidad al recorrido** (LOD).
- **Ambientación sonora binaural con audio espacial 3D** durante todo el recorrido.
- **Datos del recorrido en pantalla**: altitud, distancia recorrida y restante, desnivel acumulado, pendiente, tiempo estimado al siguiente punto.
- **Web para escritorio y celular**: sin instalación.

### NO: lista vinculante

Esto **no** se hace, y tampoco se propone como fase 2:

- El sendero completo de 7,3 km
- Caminar libre tipo videojuego
- App nativa iOS/Android
- Realidad virtual
- Multijugador o funciones sociales
- Captura con dron
- Más de un sendero

**Por qué 200 m y no el sendero completo:** en un bosque cada metro es geometría nueva, no hay superficies repetibles, y el navegador tiene un techo duro de memoria y de coste de ordenamiento por profundidad. Capturar 7,3 km produciría un archivo que ningún celular puede cargar.

> **Ampliar el tramo** (etapa 4, metros 200–260) **no está comprometido.** Se decide al cerrar el Sprint 2, con datos reales de peso y rendimiento. Ver [plan de trabajo](plan/plan_de_trabajo.md) §6.

---

## Documentación

- [**1 · Principios de trabajo**](docs/01-principios-de-trabajo.md): definición de "hecho", ramas, revisión de código, ceremonias, canales, bloqueos
- [**2 · Visión de proyecto**](docs/02-vision-de-proyecto.md): problema, para quién, propuesta de valor, alcance, criterios de éxito, riesgos
- [**3 · Avances a nivel de tecnología**](docs/03-avances-tecnologia.md): investigación de 3DGS, SuperSplat, SOG y PlayCanvas; riesgos técnicos; qué queda por validar
- [**4 · Actividades y roles**](docs/04-actividades-y-roles.md): 4 épicas, 8 sprints, historias, criterios de aceptación y subtareas por persona
- [**5 · Catálogo de fauna y flora**](docs/05-catalogo-fauna-y-flora.md): qué hay realmente en el sendero, con fuentes y nivel de verificación
- [**6 · Identidad visual**](docs/06-identidad-visual.md): paleta de grises, negros y verdes, tipografía, tokens y contrastes calculados
- [**7 · Plan de visitas de campo**](docs/07-plan-de-visitas-de-campo.md): las cuatro visitas, qué decide cada una y quién mira qué
- [**8 · Ambientación sonora**](docs/08-ambientacion-sonora.md): audio binaural espacial: diseño, contrato de datos y presupuesto
- [**9 · Ámbitos de los tres programadores**](docs/09-ambitos-de-los-tres-programadores.md): quién toca qué carpeta y las tres fronteras
- [**11 · Guía de captura en campo**](docs/11-guia-de-captura-en-campo.md): el instructivo de escaneo, configuración de cámara, pasadas y procesamiento paso a paso
- [Arquitectura y diagramas](docs/arquitectura.md), casos de uso, módulos, secuencias, estados, contratos de datos e invariantes
- [Análisis y especificación de requerimientos](docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md), **incluye la visión del proyecto**, 15 CUS, 32 RF, 16 RNF y matriz de trazabilidad (fuente en Word: [`.docx`](docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.docx))
- [Plan de trabajo](plan/plan_de_trabajo.md), estimación por RF y cronograma semana a semana

**Decisiones de arquitectura:**

- [ADR-001 · Elección de sendero](docs/decisiones/ADR-001-eleccion-de-sendero.md)
- [ADR-002 · Nivel de detalle por proximidad](docs/decisiones/ADR-002-lod-por-proximidad.md)
- [ADR-003 · Audio binaural espacial](docs/decisiones/ADR-003-audio-binaural-espacial.md)
- [ADR-004 · Reparto de ámbitos entre programadores](docs/decisiones/ADR-004-reparto-de-ambitos.md)

---

## Estado del proyecto

Fecha de corte: **13 de agosto de 2026**. La planeación está terminada; el prototipo del visor ya funciona en la rama `dev/juan-urrego` y las issues de la semana de prototipo están asignadas en GitHub y Jira.

### GitHub

| Elemento | Estado |
|---|---|
| Ramas | 8: `main`, `develop` y **una por persona** (`dev/<nombre>`) |
| Issues | **60**, una por historia de usuario (HU-01 a HU-61), con etiqueta `resp-<persona>`, responsable asignado y sección de ámbito para implementar |
| Etiquetas | **42**: épica, sprint, responsable, tipo y semana (`W01`–`W15`) |
| Milestones | **9**: S1, S2, S2b, S3, S4, S5, S6, S7 y Cierre |

### Trabajo con ramas

Cada quien tiene la suya y sube a ella cuando quiera. Se fusiona a `develop` por Pull Request al menos una vez por semana, coincidiendo con la entrega del viernes. No hay ramas por sprint ni por épica: las épicas se solapan y acabarían con dos personas dentro de la misma rama.

### Lo que sigue

1. **Prototipo básico en PlayCanvas.** Cargar una escena de prueba y moverse por ella, para validar el motor antes de tener captura propia.
2. **Publicarlo en una web estática sobre HTTPS** y dejar el enlace en este README.
3. **Visita de reconocimiento V1** (semana 2, 18–24 de agosto, todo el equipo, sin grabar): se decide el tramo exacto, las etapas, los POIs y el mapa sonoro.
4. **Captura V2** (semana 3) y primer procesamiento a SOG.

> **Enlace del prototipo:** `[pendiente de publicar]`

---

## Cómo empezar

> El código arranca en el **Sprint 3** (8 de septiembre de 2026). Hasta entonces el repositorio contiene la especificación, el plan y los contratos de datos.

```bash
git clone https://github.com/JuanUrrego146/SenderoVivo.git
cd SenderoVivo
npm install
npm run dev
```

**Requisitos:** Node 24+ y un navegador vigente. Nada más, no hay backend, ni base de datos, ni servicios externos.

Para trabajar con las escenas capturadas:

```bash
npm install -g @playcanvas/splat-transform
```

Las escenas `.sog` **sí se versionan** desde el 14/08/2026, para que cada rama despliegue una web funcional. El material bruto de captura y los `.ply` siguen fuera del repositorio (ver `.gitignore`). Límite de GitHub: 100 MB por archivo.

---

## Convenciones

| Aspecto | Regla |
|---|---|
| Documentos, UI y contenidos | Español |
| Código, variables, funciones, ramas | Inglés |
| Commits | Conventional Commits, tipo en inglés y descripción en español, citando el RF: `feat(motor): avanzar sobre el trazado (RF-003)` |
| Ramas | Una por persona: `dev/<nombre-kebab-case>`. Opcional por historia: `dev/<nombre>/HU-<nn>-<descripción>` |
| Identificadores | `RF-0NN`, `RNF-0NN`, `CUS-0NN`, `HU-NN`, `ADR-0NN` |
| Fechas | `DD/MM/AAAA` |
| Unidades | Métricas. Altitud en msnm, distancia en m, pendiente en % |
| PRs | 1 aprobación obligatoria del **dueño de la carpeta**; máx. ~400 líneas de diff |
| Colores | Solo desde `styles/tokens.css`. Ningún color literal en `.js` |

**Flujo de ramas:**

**Una rama por persona.** Cada quien trabaja en la suya y la fusiona a `develop` por Pull Request, al menos una vez por semana.

```
main                       ← solo entregables. Protegida
└── develop                ← integración. Todo pasa por aquí
    ├── dev/juan-urrego
    ├── dev/alejandra-chambueta
    ├── dev/david-beltran
    ├── dev/felipe-acevedo
    ├── dev/eybar-viasus
    └── dev/alberto-aleman
```

Si alguien quiere separar una historia concreta, abre una rama hija de la suya: `dev/<persona>/HU-<nn>-<descripción>`. Es opcional.

---

## Quién toca qué carpeta

Cada carpeta tiene un dueño. Tocar la carpeta de otro se avisa en la issue **antes** de empezar y lo revisa el dueño. Detalle y fronteras en [`docs/09-ambitos-de-los-tres-programadores.md`](docs/09-ambitos-de-los-tres-programadores.md).

| Carpeta | Dueño | Contenido |
|---|---|---|
| `src/engine/` | **Alejandra Chambueta** | `TourEngine`, `SceneLoader`, `TrailPath`, `CameraRig`, `QualityProfile`, `LodController` |
| `src/poi/` | **David Beltrán** | `PoiManager`, `PoiCard`, `ModelViewer` |
| `src/data/` | **David Beltrán** | `TrailDataLayer`, `GpsTrack` |
| `src/audio/` | **David Beltrán** | `AmbienceController`, `SpatialAudioSource`, `AudioPlayer` |
| `src/app/` | **Juan Urrego** | Arranque, cableado, onboarding, estados globales |
| `src/ui/` | **Juan Urrego** (implementa) | `HudView` y shell, a partir del diseño de Eybar y Alberto |
| `styles/` | **Eybar Viasus** + **Alberto Alemán** | Tokens de color, tipografía, componentes |
| `assets/models/`, `assets/audio/` | **Felipe Acevedo** | Modelos `.glb`, cantos, escaneos |
| `assets/scenes/` | **Juan Urrego** | Escenas `.sog` |
| `config/` | **Juan Urrego** | `scenes.json`, `pois.json`, `track.json`, `soundscape.json` |
| `docs/`, `plan/` | **Juan Urrego** | Especificación, arquitectura, plan |

---

## Equipo

| Persona | Rol | Épica |
|---|---|---|
| **Juan Urrego** | PM + Programador / Integrador, arquitectura, contratos de datos, integración, despliegue | E1 |
| **Alejandra Chambueta** | Programadora, motor de recorrido, carga de escenas SOG, cámara, LOD, rendimiento | E2 |
| **David Beltrán** | Programador, sistema de POIs, fichas, audio espacial, capa de datos GPS | E3, E4 |
| **Felipe Acevedo** | Artista 3D, modelado, animación y rigging de aves y plantas; optimización para web | E3 |
| **Eybar Viasus** | Diseñador UI/UX, identidad visual, ficha de POI, visor 3D, HUD, sistema de diseño | E4 |
| **Alberto Alemán** | UI/UX, onboarding, flujo de recorrido, contenido patrimonial, responsive, accesibilidad | E4 |

**Dedicación: 12 horas semanales por persona.**

---

## Cronograma

**11 de agosto – 28 de noviembre de 2026** · 15 semanas.

| Sprint | Épica | Fechas | Objetivo |
|---|---|---|---|
| S1 | E1 | 11 ago – 24 ago | Cerrar ADR-001 y ejecutar la **visita de reconocimiento (V1)** con todo el equipo |
| S2 | E1 | 25 ago – 7 sep | **Captura (V2) y complementaria (V3).** Procesar en GPU, limpiar, comprimir a SOG |
| S2b | E3 | 25 ago – 7 sep | **En paralelo:** modelado de aves con animación idle, plantas y patrimonio |
| S3 | E2 | 8 sep – 21 sep | Cargar escenas SOG, cámara, navegación, identidad visual. **Verificación en campo (V4)** |
| S4 | E2 | 22 sep – 5 oct | Encadenado, **LOD por proximidad**, rendimiento |
| S5 | E3 | 6 oct – 19 oct | Marcadores, fichas, visor 3D, audio de ficha y **ambientación espacial** |
| S6 | E4 | 20 oct – 2 nov | Track GPS, HUD de altitud/distancia/desnivel/pendiente |
| S7 | E4 | 3 nov – 16 nov | UI/UX final, responsive, onboarding, accesibilidad |
| Cierre | | 17 nov – 28 nov | Integración, pruebas, despliegue y entrega |

### Las cuatro visitas de campo

| Visita | Cuándo | Quién | Qué |
|---|---|---|---|
| **V1 · Reconocimiento** | Semana 2 (18–24 ago) | **Todo el equipo** | **Sin grabar.** Se decide el tramo, las etapas, los POIs y el mapa sonoro |
| **V2 · Captura principal** | Semana 3 (25–31 ago) | 4 personas | Video 4K60 con el protocolo completo |
| **V3 · Complementaria** | Semana 4 (1–7 sep) | 4 personas | Audio binaural, cantos, patrimonio. **O contingencia si V2 falló** |
| **V4 · Verificación** | Semana 6 (15–21 sep) | 3 personas | Comparar la reconstrucción contra el sitio |

**Solo V1 y V2 están en el camino crítico.** Detalle en [`docs/07-plan-de-visitas-de-campo.md`](docs/07-plan-de-visitas-de-campo.md).

---

## Licencias del stack

PlayCanvas Engine (MIT) · SuperSplat (MIT) · SOG (especificación abierta) · SplatTransform (open source). Sin dependencias de pago.
