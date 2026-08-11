# Sendero Vivo

**Recorre un tramo real del sendero de la Quebrada La Vieja, en los Cerros Orientales de Bogotá, desde el navegador — reconstruido con Gaussian Splats a partir de captura real, no modelado a mano.**

---

## ¿De qué trata?

Los senderos de los Cerros Orientales son gratuitos y se reservan por la app del Acueducto. El acceso está resuelto; la información no. Quien va por primera vez no sabe cuánto dura, qué tan duro es, hasta dónde va a alcanzar a llegar, ni por dónde va exactamente el camino autorizado. El sendero completo son **7,3 km, +406 m de desnivel y unas 3 horas**. La gente se devuelve a mitad de camino, se sale del trazado dentro de una reserva protegida, camina sobre bosque altoandino sin entender qué ve, y quien no puede subir nunca conoce el lugar.

Sendero Vivo reconstruye un tramo real de **120 a 200 metros** —el tramo de entrada, justo donde el visitante decide si sigue o se devuelve— y lo hace recorrible desde el navegador. La reconstrucción se hace con **Gaussian Splatting**: el sendero se **captura**, no se dibuja. Esa es la diferencia entre ver el render de alguien y reconocer el lugar cuando llegas.

La propuesta se sostiene en tres verbos:

- **Reconocer** — ver el camino real y saber a qué se va.
- **Entender** — aves, plantas y ecosistema en fichas 3D ancladas a lugares reales del tramo.
- **Medir** — altitud, distancia, desnivel y pendiente reales, tomados con GPS el día de la captura.

**Ubicación:** Quebrada La Vieja, tramo de entrada. Calle 71 con Avenida Circunvalar, Chapinero. TransMilenio a 700 m.
**Cifras del tramo:** Altitud 2.712 m · Recorrido 340 m · Desnivel 62 m · Pendiente 9 %.

---

## Stack técnico

| Aspecto | Elección |
|---|---|
| Motor | **PlayCanvas Engine 2.21.3** (MIT) |
| Reconstrucción 3D | **3D Gaussian Splatting** (Kerbl et al., SIGGRAPH 2023) |
| Edición de splats | **SuperSplat** (MIT, corre en el navegador) |
| Formato de entrega | **SOG** — Spatially Ordered Gaussians, v2 |
| Compresión | **SplatTransform** CLI (`splat-transform in.ply out.sog`) |
| Captura | Celular (iPhone 13 o equivalente), video 4K a 60 fps, todo manual |
| Procesamiento | Estación con GPU del equipo |
| Modelos de ficha | glTF / `.glb` optimizados para web |
| Idioma del código | **Inglés** (variables, funciones, clases, ramas) |
| Idioma de UI y contenidos | **Español** |
| Estilo | Módulos con responsabilidad única. Contenido declarativo en JSON |
| Runtime | Node 24 / npm |
| Gráficos | WebGPU con **repliegue automático a WebGL** |
| Plataformas objetivo | Navegador de escritorio y de celular. **Sin app nativa** |
| Backend | Ninguno. Sitio estático servido por HTTPS |

---

## Alcance

### SÍ

- Tramo de **120–200 m** en **3 escenas** encadenadas.
- **5–6 puntos de interés** completos.
- **Fichas 3D** de aves y plantas: modelo girable con zoom, nombre común y científico, narración, canto, altura de distribución e identificación en campo.
- **Recorrido guiado** con **mirada libre 360°**.
- **Datos del recorrido en pantalla**: altitud, distancia recorrida y restante, desnivel acumulado, pendiente, tiempo estimado al siguiente punto.
- **Web para escritorio y celular**, sin instalación.

### NO — lista vinculante

Esto **no** se hace, y tampoco se propone como fase 2:

- ❌ El sendero completo de 7,3 km
- ❌ Caminar libre tipo videojuego
- ❌ App nativa iOS/Android
- ❌ Realidad virtual
- ❌ Multijugador o funciones sociales
- ❌ Captura con dron
- ❌ Más de un sendero

**Por qué el tramo y no el sendero completo:** en un bosque cada metro es geometría nueva —no hay superficies repetibles— y el navegador tiene un techo duro de memoria y de coste de ordenamiento por profundidad. Capturar 7,3 km produciría un archivo que ningún celular puede cargar.

---

## Documentación

Los tres primeros documentos son la entrega de la actividad del curso:

- [**1 · Principios de trabajo**](docs/01-principios-de-trabajo.md) — definición de "hecho", ramas, revisión de código, ceremonias, canales, bloqueos
- [**2 · Visión de proyecto**](docs/02-vision-de-proyecto.md) — problema, para quién, propuesta de valor, alcance, criterios de éxito, riesgos
- [**3 · Avances a nivel de tecnología**](docs/03-avances-tecnologia.md) — investigación de 3DGS, SuperSplat, SOG y PlayCanvas; riesgos técnicos; qué queda por validar
- [**4 · Actividades y roles**](docs/04-actividades-y-roles.md) — 4 épicas, 8 sprints, historias, criterios de aceptación y subtareas por persona

El resto del paquete:

- [Arquitectura y diagramas](docs/arquitectura.md) — casos de uso, módulos, secuencias, estados, contratos de datos e invariantes
- [ADR-001 · Elección de sendero](docs/decisiones/ADR-001-eleccion-de-sendero.md)
- [Análisis y especificación de requerimientos](docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.docx) — 12 CUS, 26 RF, 15 RNF y matriz de trazabilidad
- [Plan de trabajo](plan/plan_de_trabajo.md) — estimación por RF y cronograma semana a semana
- [Backlog importable a Jira](plan/backlog-jira.csv)
- [Contexto para vibe coding](context-for-vibe-coding.md) — **léelo antes de escribir código**

---

## Cómo empezar

> El código arranca en el **Sprint 3** (8 de septiembre de 2026). Hasta entonces el repositorio contiene la especificación, el plan y los contratos de datos.

```bash
git clone <url-del-repo>
cd SenderoVivo
npm install
npm run dev
```

**Requisitos:** Node 24+ y un navegador vigente. Nada más — no hay backend, ni base de datos, ni servicios externos.

Para trabajar con las escenas capturadas:

```bash
npm install -g @playcanvas/splat-transform
splat-transform escena.ply escena.sog
```

Las escenas `.sog` y el material bruto **no están en el repositorio** (ver `.gitignore`): se distribuyen aparte por su peso.

---

## Convenciones

| Aspecto | Regla |
|---|---|
| Documentos, UI y contenidos | Español |
| Código, variables, funciones, ramas | Inglés |
| Commits | Conventional Commits, tipo en inglés y descripción en español, citando el RF: `feat(motor): avanzar sobre el trazado (RF-003)` |
| Ramas | `epic/<épica>/HU-<nn>-<descripción-kebab-case>` |
| Identificadores | `RF-0NN`, `RNF-0NN`, `CUS-0NN`, `HU-NN`, `ADR-0NN` |
| Fechas | `DD/MM/AAAA` |
| Unidades | Métricas. Altitud en msnm, distancia en m, pendiente en % |
| PRs | 1 aprobación obligatoria; máx. ~400 líneas de diff |

**Flujo de ramas:**

```
main                 ← solo entregables. Protegida
└── develop          ← integración. Todo pasa por aquí
    ├── epic/captura-reconstruccion      (E1)
    ├── epic/motor-recorrido             (E2)
    ├── epic/pois-fichas                 (E3)
    └── epic/datos-experiencia           (E4)
```

---

## Quién toca qué carpeta

Cada carpeta tiene un dueño. Tocar la carpeta de otro se avisa en la PR.

| Carpeta | Dueño | Contenido |
|---|---|---|
| `src/engine/` | **Alejandra Chambueta** | `TourEngine`, `SceneLoader`, `TrailPath`, `CameraRig`, `QualityProfile` |
| `src/poi/` | **David Beltrán** | `PoiManager`, `PoiCard`, `ModelViewer`, `AudioPlayer` |
| `src/data/` | **David Beltrán** | `TrailDataLayer`, `GpsTrack` |
| `src/ui/` | **Eybar Viasus** + **Alberto Alemán** | `HudView`, onboarding, sistema de diseño, responsive |
| `assets/models/`, `assets/audio/` | **Felipe Acevedo** | Modelos `.glb`, cantos, escaneos |
| `assets/scenes/` | **Juan Urrego** | Escenas `.sog` |
| `config/` | **Juan Urrego** | `scenes.json`, `pois.json`, `track.json` |
| `docs/`, `plan/` | **Juan Urrego** | Especificación, arquitectura, plan |

---

## Equipo

| Persona | Rol | Épica |
|---|---|---|
| **Juan Urrego** | PM + Programador / Integrador — arquitectura, contratos de datos, integración, despliegue | E1 |
| **Felipe Acevedo** | Artista 3D — modelado, animación y rigging de aves y plantas; optimización para web | E3 |
| **Eybar Viasus** | Diseñador UI/UX — ficha de POI, visor 3D, HUD, sistema de diseño | E4 |
| **Alberto Alemán** | UI/UX — onboarding, flujo de recorrido, responsive móvil, accesibilidad | E4 |
| **Alejandra Chambueta** | Programadora — motor de recorrido, carga de escenas SOG, cámara, rendimiento | E2 |
| **David Beltrán** | Programador — sistema de POIs, panel de fichas, audio, capa de datos GPS | E3 |

---

## Cronograma

**11 de agosto – 24 de noviembre de 2026** · 15 semanas.

| Sprint | Épica | Fechas | Objetivo |
|---|---|---|---|
| S1 | E1 | 11 ago – 24 ago | Cerrar decisión de sendero, preparar y ejecutar la salida de campo |
| S2 | E1 | 25 ago – 7 sep | Procesar en GPU, limpiar, comprimir a SOG, 3 escenas |
| S2b | E3 | 25 ago – 7 sep | **En paralelo:** modelado de aves y plantas |
| S3 | E2 | 8 sep – 21 sep | Cargar escenas SOG, cámara y navegación básica |
| S4 | E2 | 22 sep – 5 oct | Recorrido guiado, 360°, transiciones, rendimiento |
| S5 | E3 | 6 oct – 19 oct | Marcadores anclados, panel de ficha, visor 3D, audio |
| S6 | E4 | 20 oct – 2 nov | Track GPS, HUD de altitud/distancia/desnivel/pendiente |
| S7 | E4 | 3 nov – 16 nov | UI/UX final, responsive, onboarding, accesibilidad |
| Cierre | — | 17 nov – 24 nov | Integración, pruebas, despliegue y entrega |

Los 8 sprints suman 16 semanas de esfuerzo; S2b corre en paralelo con S2 (el modelado 3D no depende de la captura), lo que las comprime en 14 semanas de calendario y deja la semana 15 para el cierre.

---

## Licencias del stack

PlayCanvas Engine (MIT) · SuperSplat (MIT) · SOG (especificación abierta) · SplatTransform (open source). Sin dependencias de pago.
