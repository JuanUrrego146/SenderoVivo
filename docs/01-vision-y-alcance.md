# Visión y alcance: Sendero Vivo

> Versión 1,1, 17 de agosto de 2026 (antes «visión de proyecto», 02).
> Horizonte: 15 semanas (11 ago – 28 nov de 2026).
> **Documento raíz del proyecto.** Es la única fuente del alcance SÍ/NO vinculante,
> de las cifras del tramo, de los criterios de éxito E1–E16 y de los riesgos R1–R10.
> El README resume y enlaza aquí; no repite.

---

## 1. El problema

Los senderos de los Cerros Orientales de Bogotá son **gratuitos** y se reservan por la app del Acueducto. El acceso, en el papel, está resuelto. Lo que no está resuelto es todo lo que pasa antes y durante la caminata.

Quien va al sendero Santa Ana - La Aguadora por primera vez no sabe cuánto dura, qué tan duro es, hasta dónde va a alcanzar a llegar, ni por dónde va exactamente el camino autorizado. El circuito del Bosque de Pinos son **3,1 km**, y el desnivel y la duración **ni siquiera se publican**. Esa cifra existe, pero no significa nada para alguien que nunca ha subido: los metros de desnivel no se imaginan, se sienten.

De ahí salen cuatro problemas concretos y observables:

1. **La gente se devuelve a mitad de camino.** Sube sin saber a qué se enfrenta, se le acaba el aire o el tiempo, y se regresa. El plan se frustra y la próxima vez no vuelve.
2. **La gente se sale del trazado.** En una reserva protegida, salirse del camino no es una anécdota: es pisar bosque altoandino que tarda décadas en recuperarse.
3. **Se camina sin entender lo que se ve.** Un colibrí chillón, un helecho arbóreo y un musgo de páramo pasan como "verde". El sendero tiene contenido biológico enorme y casi nadie tiene cómo leerlo.
4. **Quien no puede subir, nunca conoce el lugar.** Condición física, edad, discapacidad, tiempo, distancia, miedo. El cerro está a 700 metros de un TransMilenio y aun así es inaccesible para mucha gente.

**El problema, en una frase:** el sendero es público y gratuito, pero la información para recorrerlo con criterio, y la posibilidad de conocerlo sin subir, no existe.

---

## 2. Para quién es

| Perfil | Quién es | Qué necesita de Sendero Vivo |
|---|---|---|
| **El que va a ir** | Vive o trabaja en Bogotá, quiere hacer el sendero el próximo fin de semana | Ver el camino real antes de reservar. Saber a qué va y hasta dónde puede llegar |
| **El que no puede subir** | Movilidad reducida, edad, condición física, o simplemente está lejos | Conocer el lugar. Recorrerlo de verdad, no ver fotos |
| **El curioso del bosque** | Le interesan las aves y las plantas, no solo caminar | Poder identificar qué está viendo: nombre, canto, cómo reconocerlo |
| **El que enseña** | Docente, guía, líder ambiental | Un material para mostrar el ecosistema altoandino sin sacar a 30 personas a la montaña |

**Usuario primario del MVP:** el visitante que quiere reconocer el sendero antes de ir. Es el que valida las tres promesas de golpe.

### 2.1 Interesados

Más allá de los usuarios finales, hay seis grupos con algo que aportar o que recibir:

| Interesado | Relación con el proyecto | Qué necesita el proyecto de él |
|---|---|---|
| **Docentes evaluadores** | Evaluación académica | Métricas de calificación y criterios claros |
| **Estudiantes** | Beta testers y usuarios potenciales | Retroalimentación de experiencia de usuario |
| **Equipo desarrollador** | Construcción del producto | PM, tres programadores, artista 3D y dos de UI/UX |
| **Turistas y deportistas** | Usuarios finales | Métricas de impacto; son el público objetivo y sus promotores |
| **Instituciones educativas** | Uso como recurso pedagógico | Convenio de uso o de investigación |
| **Acueducto de Bogotá** | Administra el acceso a los senderos | Permisos de reserva y, eventualmente, alianza |

### 2.2 Lo que hay que averiguar de los usuarios

Preguntas abiertas que orientan la investigación con usuarios, pendiente de programar:

- ¿Cuál es su estado físico y con qué frecuencia hace actividad física?
- ¿Cuál es su motivación para hacer este tipo de actividades?
- ¿Qué razones lo harían **no** ir el día que lo tenía programado?
- ¿Qué sabe de las especies endémicas de los Cerros y qué le gustaría conocer?
- ¿Con qué frecuencia explora lugares turísticos de la ciudad?

Hay dos percepciones que el proyecto tiene que atacar directamente: la **incertidumbre** sobre qué tan exigente o largo es el sendero, el producto entero es un preámbulo a eso, y la **percepción de inseguridad**, que se combate con información, no con silencio.

### 2.3 Qué hay ya en el mundo

| Referencia | Qué resuelve | Qué no resuelve |
|---|---|---|
| **Wikiloc**, **Strava**, **Happylife** | Trazado, perfil de elevación y estadísticas del recorrido | No dejan *ver* el camino. Y buena parte de la información está en millas y pies |
| **Calico Tanks, Red Rock Canyon** (galería de PlayCanvas) | Demuestra que un sendero de montaña se puede escanear y recorrer en el navegador | Es una demostración técnica, sin capa de contenido ni de datos |

La conclusión que da origen al proyecto: **la técnica ya funciona sobre senderos reales; lo que no existe es alguien que la combine con contenido biológico verificado y con datos de esfuerzo, en español y para un sendero de Bogotá.**

---

## 3. Propuesta de valor

> **Sendero Vivo permite recorrer el tramo real de un sendero de los Cerros Orientales desde el navegador, reconstruido tal como es, capturado, no dibujado, para saber a qué se va, entender lo que se ve y medir lo que cuesta.**

La propuesta se sostiene en tres verbos:

### Reconocer
Ver el camino real: los escalones de piedra, las barandas de madera, el cauce, la pendiente. No un render ni un mapa: **el lugar, capturado**. La diferencia entre "el sendero tiene 406 m de desnivel" y ver la escalera que hay que subir.

### Entender
Marcadores flotantes anclados a lugares reales del tramo. Al tocarlos se abre la ficha del ave, la planta o el elemento: modelo 3D girable, nombre común y científico, narración corta, canto del ave, a qué altura vive y cómo identificarla en campo.

### Medir
Mientras se avanza, en pantalla: altitud sobre el nivel del mar, distancia recorrida y restante, desnivel acumulado, pendiente actual, y tiempo estimado hasta el siguiente punto. Datos reales tomados con GPS el mismo día de la captura.

### Y oír
La experiencia no es solo visual e interactiva. El recorrido lleva **ambientación sonora binaural con audio espacial 3D**: la quebrada suena a la izquierda cuando la quebrada está a la izquierda, y queda atrás al avanzar. No es una pista de fondo, es un espacio. Es la diferencia entre mirar un sendero y estar en él.

### Por qué "capturado, no modelado"
Esta es la decisión que define el proyecto. Un modelo 3D hecho a mano es la interpretación de un artista sobre cómo se ve un bosque. Un Gaussian Splat es **el bosque**, con su desorden, su luz de esa mañana y su geometría imposible de dibujar. Para una app cuyo propósito es que reconozcas el lugar cuando llegues, esa diferencia es todo el producto.

---

## 4. Alcance

### 4.1 Lo que SÍ está en el alcance

- **200 metros desde el inicio del sendero**: compromiso firme, divididos en **3 escenas** encadenadas por etapas: 0–70, 70–140 y 140–200 m.
- **5 a 6 puntos de interés** completos, de tres clases: **fauna**, **flora** y **patrimonio**.
- **Fichas 3D de aves y plantas**: modelo girable con zoom, **animación idle de aleteo**, nombre común y científico, narración, canto, altura de distribución, identificación en campo y **consejos de avistamiento**.
- **Puntos de interés no vivos**: puertas derrumbadas, muros, monumentos y tramos de camino, con su historia y su fuente citable.
- **Recorrido guiado** sobre el trazado, con **mirada libre 360°** en cualquier punto.
- **Nivel de detalle por proximidad al recorrido**: máximo detalle en la banda que el visitante mira de cerca, menos detalle en el contexto.
- **Ambientación sonora binaural con audio espacial 3D** durante todo el recorrido.
- **Datos del recorrido en pantalla**: altitud, distancia recorrida y restante, desnivel acumulado, pendiente, tiempo estimado al siguiente punto.
- **Identidad visual propia**: paleta de grises, negros y verdes que resalta la quebrada y la fauna.
- **Web para escritorio y celular**: sin instalación.

> **Ampliar el tramo más allá de los 200 m no está comprometido.** Si al cerrar el Sprint 2 hay holgura de peso, rendimiento y horas, se añade una cuarta etapa (200–260 m). Se decide entonces, con datos reales, y no antes.

### 4.2 Lo que NO está en el alcance

Esta lista es vinculante. No es una lista de "fase 2": es una lista de lo que este proyecto **no va a hacer**, y no se propone de nuevo.

- El circuito completo de 3,1 km.
- Movimiento libre **fuera del trazado**. Las teclas WASD sí existen en el visor, pero avanzan, retroceden y se desplazan lateralmente **dentro del corredor del camino** (RF-004); lo vetado es salirse del trazado, no la tecla. El vuelo libre solo existe en el modo editor (`?editor=1`).
- App nativa iOS o Android.
- Realidad virtual.
- Multijugador o cualquier función social.
- Captura con dron.
- Más de un sendero.

**Por qué el tramo y no el sendero completo:** en un bosque cada metro es geometría nueva, no hay superficies repetibles, no hay simplificación posible sin perder el sitio, y el navegador tiene un techo duro de memoria y de coste de ordenamiento por profundidad. Capturar los 3,1 km del circuito produciría un archivo que ningún celular puede cargar. Se captura el primer tramo, justo donde el visitante decide si sigue o se devuelve, porque es exactamente el punto donde la información cambia la decisión.

### 4.3 Ubicación

**Santa Ana - La Aguadora, circuito Bosque de Pinos, tramo de entrada.** Calle 119 N° 0-10 Este, portería del Club La Aguadora, zona rural del barrio Santa Bárbara, localidad de Usaquén.

El tramo tiene escalones de piedra, barandas de madera y cauce rocoso: superficies duras, con textura y aristas definidas, que es justo lo que la reconstrucción por Gaussian Splatting resuelve bien. Es un criterio técnico, no estético.

**Cifras del tramo comprometido (200 m)**

| Dato | Valor | Estado |
|---|---|---|
| Longitud | **200 m** | Compromiso firme |
| Altitud de inicio | `[por medir en la primera visita]` | Se mide con GPS en el reconocimiento |
| Desnivel acumulado | | **`[por medir en campo]`**, se cierra en V1 |
| Pendiente media | | **`[por medir en campo]`**, se cierra en V1 |

> El desnivel, la pendiente y la duración del tramo **no los publica ninguna fuente oficial** para este sendero: se miden con GPS en la visita de reconocimiento. Ninguna cifra de recorrido se da por buena sin medirla en campo.

> La decisión final de sendero se cierra en la primera semana y es **hito bloqueante del Sprint 1**. Las tres opciones evaluadas y los criterios están en [ADR-001](decisiones/ADR-001-eleccion-de-sendero.md).

### 4.4 Cómo se llega al tramo: cuatro visitas de campo

| Visita | Cuándo | Quién | Qué resuelve |
|---|---|---|---|
| **V1 · Reconocimiento** | Semana 2 (18–24 ago) | **Todo el equipo** | **Sin grabar.** Tramo exacto, etapas, POIs, mapa sonoro y decisiones creativas |
| **V2 · Captura principal** | Semana 3 (25–31 ago) | 4 personas | El material del tramo, con el protocolo completo |
| **V3 · Complementaria** | Semana 4 (1–7 sep) | 4 personas | Audio binaural, cantos y patrimonio. **O contingencia si V2 falló** |
| **V4 · Verificación** | Semana 6 (15–21 sep) | 3 personas | Comprobar en el sitio que el lugar se reconoce |

**La primera visita es la más determinante y la más barata.** Se va a decidir, no a grabar: gastar una mañana nublada sin viento antes de saber qué se quiere capturar es como se pierde la ventana. Detalle en [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md).

---

## 5. Criterios de éxito

Medibles, verificables y con fecha. Si no se pueden comprobar, no son criterios.

### 5.1 De producto

| # | Criterio | Meta | Cómo se mide | Cuándo |
|---|---|---|---|---|
| E1 | El tramo está reconstruido y es navegable | 3 escenas encadenadas, **200 m** | Recorrido completo de extremo a extremo sin cortes | Fin S4 |
| E2 | Los puntos de interés están completos | ≥ 5 POIs completos, **al menos 1 de patrimonio** | Revisión de contenido POI por POI | Fin S5 |
| E3 | Los datos del recorrido son reales y correctos | Altitud, distancia, desnivel y pendiente derivados del track GPS capturado | Contraste contra el track grabado en campo | Fin S6 |
| E4 | Funciona en celular sin instalar nada | Carga y recorrido completo en Chrome Android y Safari iOS | Prueba en dispositivo físico | Fin S7 |

### 5.2 De calidad técnica

| # | Criterio | Meta | RNF |
|---|---|---|---|
| E5 | Rendimiento en gama media | ≥ 30 fps sostenidos | RNF-001 |
| E6 | Tiempo hasta primera escena navegable | < 10 s con 10 Mbps **[en revisión]** | RNF-002 |
| E7 | Peso por escena SOG | **≤ 25 MB** (objetivo práctico: 1,5 M de gaussianas ≈ 21 MB, medido el 17/08) | RNF-003 |

> **Nota sobre E6 y E7 (17/08/2026):** la medición del prototipo
> ([`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §14) cerró E7: 1,5 M de
> gaussianas por escena ≈ 21 MB. Pero 21 MB a 10 Mbps son **17 s**, no 10: E6 y RNF-002 quedan
> **en revisión** — o se renegocia la meta, o se añade precarga/streaming al alcance. La escena
> de prueba versionada hoy tiene 3,89 M de gaussianas (~56 MB): excede el objetivo y se corrige
> al reprocesar. Decisión pendiente, dueño: Juan Urrego, se cierra en S2.
| E8 | Accesibilidad de textos | Contraste AA + transcripción de narraciones | RNF-006 |
| E9 | Ninguna pantalla en negro | Todo fallo de carga informa y ofrece reintentar | RNF-007 |
| E15 | La ambientación sonora es espacial y no rompe el rendimiento | Fuentes HRTF activas y ≥ 30 fps sostenidos con el audio encendido | RNF-016, RNF-001 |
| E16 | Ningún dato biológico o histórico publicado sin fuente | 100 % de las fichas con fuente citable o marca de pendiente | RNF-011 |

### 5.3 De usabilidad

| # | Criterio | Meta | Cómo se mide |
|---|---|---|---|
| E10 | Autonomía del visitante | 4 de 5 personas sin experiencia previa inician el recorrido y abren una ficha **sin instrucciones** | Prueba con 5 usuarios en S7 |
| E11 | Reconocimiento del lugar | El visitante identifica el tramo al llegar físicamente | Validación cualitativa `[pendiente de programar]` |

### 5.4 De proceso

| # | Criterio | Meta |
|---|---|---|
| E12 | Los 8 sprints cierran con demo funcionando | 8/8 |
| E14 | Todo RF entregado está trazado a un CUS y a una historia | 100 % |

> El seguimiento del margen de esfuerzo del equipo (criterio E13) es indicador de gestión interna; su detalle vive en `plan/plan_de_trabajo.md`.

---

## 6. Riesgos y mitigación

Ordenados por exposición (probabilidad × impacto). Los tres primeros son los que pueden hundir el proyecto.

### R1: La vegetación densa no se reconstruye bien
**Probabilidad: alta · Impacto: alto**

El Gaussian Splatting resuelve muy bien superficies duras y muy mal estructuras finas, translúcidas y en movimiento. Un bosque altoandino es exactamente eso: hojas delgadas, ramas finas, follaje que se mueve. La literatura reporta que el follaje denso introduce ruido y distorsiona la geometría, y que quedan "flotantes" (gaussianas con opacidad en el vacío).

**Mitigación:**
- El tramo se eligió por sus **elementos duros** (escalones de piedra, barandas, cauce): son el ancla geométrica de la reconstrucción.
- Captura en **día nublado y sin viento**, el viento es el enemigo directo de este problema.
- Varias pasadas a distintas alturas para dar redundancia de vistas al follaje.
- Limpieza de flotantes en SuperSplat como paso obligatorio del "hecho" de cada escena.
- **Plan de choque:** si una escena sale inaceptable, se recorta el tramo. Es preferible entregar 120 m impecables que 200 m con ruido.

### R2: La escena pesa más de lo que aguanta un celular
**Probabilidad: media-alta · Impacto: alto**

La guía de rendimiento de PlayCanvas sugiere un presupuesto de **~1 millón de gaussianas en móvil** frente a 3+ millones en escritorio, y advierte que el cuello de botella real es el *fill rate* (sobredibujo con mezcla alfa), no solo la memoria.

**Las tres cifras de gaussianas que circulan, conciliadas (17/08):** ~1 M es el presupuesto de
PlayCanvas para móvil; **1,5 M es el objetivo del proyecto por escena** (medido: más no mejora
la calidad y rompe peso y render móvil, [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §14);
3,89 M es lo que tiene la escena de prueba actual, que está por encima y se corrige al reprocesar.
**Estado: parcialmente materializado y medido, no ya solo anticipado** — el SOG de prueba pesó
70 MB y tardaría 58,7 s a 10 Mbps.

**Mitigación:**
- SOG comprime ~15–20× frente a PLY; el caso de referencia de PlayCanvas baja 1 GB a 42 MB.
- Tres escenas separadas en lugar de una sola: se carga solo lo necesario.
- Reducción de gaussianas por escena hasta cumplir RNF-001, aceptando pérdida de detalle en zonas sin POI.
- Desactivar antialiasing y limitar el *device pixel ratio* en móvil.
- **Plan de choque:** Streamed SOG con LOD (`.lod-meta.json`), que carga niveles de detalle según distancia de cámara. *(Ojo: el patrón `*.lod-meta.json` está hoy en `.gitignore`; si este plan se activa hay que sacarlo de ahí o los metadatos nunca llegarían al despliegue.)*

### R3: El clima impide la salida de campo
**Probabilidad: media · Impacto: alto**

La captura exige día nublado, sin viento y a primera hora. En Bogotá esa ventana no se pide por anticipado. Si la salida de S1 falla, se corre todo el cronograma: E1 bloquea a E2, que bloquea a E4.

**Mitigación:**
- **Dos ventanas de salida** reservadas dentro del Sprint 1, no una.
- Reserva previa por la app del Acueducto para ambas fechas.
- Checklist y ensayo de protocolo **antes** de la salida, para no gastar la ventana aprendiendo a usar el equipo.
- E3 (modelado 3D de aves y plantas) **no depende de la captura**: si S1 se retrasa, Felipe sigue produciendo y el retraso no paraliza al equipo entero.

### R4: El equipo es primerizo en las tres tecnologías a la vez
**Probabilidad: alta · Impacto: medio**

Gaussian Splatting, SuperSplat/SOG y PlayCanvas, simultáneamente, sin experiencia previa.

**Mitigación:**
- Margen de tiempo amplio y explícito reservado en el plan de trabajo (`plan/plan_de_trabajo.md`) para absorber la curva de aprendizaje.
- S1 incluye tiempo de aprendizaje y prueba de herramientas como trabajo real, no como algo que se hace "aparte".
- Toda la investigación queda en `docs/07-tecnologia.md`, no en la cabeza de quien la hizo.
- Revisión cruzada obligatoria: el conocimiento no se queda en una sola persona.

### R5: El alcance se expande
**Probabilidad: media · Impacto: medio**

Es un proyecto vistoso. Van a aparecer ideas: más senderos, VR, caminar libre.

**Mitigación:**
- Lista de "no lo hacemos" explícita y vinculante (§4.2), resumida en el README y en `CONTEXTO-EQUIPO.md`.
- Ninguna tarea entra al sprint sin trazar a un RF (principio P2).
- Las ideas nuevas van al backlog y solo se discuten en revisión de sprint.

### R6: Descoordinación entre las cuatro épicas
**Probabilidad: media · Impacto: medio**

Cuatro épicas, seis personas, dos disciplinas distintas (producción de assets y programación) y un sprint corriendo en paralelo.

**Mitigación:**
- Contratos de datos (`pois.json`, `scenes.json`, track GPS) definidos y publicados en S1, **antes** de que nadie los necesite (principio P4).
- Un solo integrador responsable (Juan) y **una rama por persona** (`dev/<nombre>`) con dueño claro — una rama por épica acabaría con dos personas dentro.
- Integración a `develop` al cierre de cada sprint, no al final de la épica.

### R7: Un dato biológico publicado resulta incorrecto
**Probabilidad: baja · Impacto: medio-alto**

Las fichas afirman nombres científicos y rangos de altitud. Un error se propaga como información confiable.

**Mitigación:**
- Verificación obligatoria contra fuente citable antes de publicar cualquier ficha.
- Lo no verificado se marca `[por medir en campo]` o `[por verificar]`; nunca se rellena.
- Felipe revisa toda ficha de fauna y flora antes de la demo.

### R9: El audio espacial no cabe en el presupuesto de rendimiento
**Probabilidad: media · Impacto: medio**

El paneo HRTF cuesta CPU, y el proyecto ya tiene el rendimiento móvil ajustado (R2). Además, **Safari en iOS podría no aplicar HRTF real** y caer a paneo de igual potencia, con lo que la promesa binaural se perdería justo en la mitad de los dispositivos.

**Mitigación:**
- **RNF-016** acota el número de fuentes espaciales simultáneas: 4 en escritorio, 2 en móvil.
- El lecho ambiente **no** es posicional: el coste está solo en las fuentes puntuales.
- La medición de 30 fps (HU-23) se hace **con el audio encendido**, no sin él.
- La prueba de HRTF en Safari se adelanta a **S3** (validación A3), no se deja para S5.
- **Plan de choque:** bajar a 2 fuentes simultáneas, y en iOS degradar a paneo estéreo por distancia. **El audio no se desactiva**: es parte del producto.

### R10: La visita de reconocimiento no se hace, o se hace grabando
**Probabilidad: media · Impacto: alto**

V1 es la visita que decide el tramo, las etapas, los POIs y el mapa sonoro. Si no se hace, o si se convierte en una captura improvisada porque el día salió bueno, todo lo demás se decide a ciegas y la captura de V2 se hace sin criterio.

**Mitigación:**
- V1 tiene **historia propia, bloqueante y con criterios de aceptación verificables** (HU-42).
- Cada persona va con un **encargo escrito**, no a acompañar.
- La regla «no se graba video de captura en V1» está escrita en el plan de campo y en la issue.
- Si el día de V1 sale excepcionalmente bueno, **no se adelanta la captura**: se toma nota y se reserva V2 lo antes posible.

### R8: Pérdida del material de captura
**Probabilidad: baja · Impacto: muy alto**

El video bruto de la salida es irrepetible sin volver a tener las mismas condiciones de luz.

**Mitigación:**
- Copia del material bruto en **dos ubicaciones distintas el mismo día de la captura**, antes de tocar nada.
- El material bruto no entra a Git (`assets/raw/`, `*.ply`, `*.sog` y video están en `.gitignore`); se almacena aparte y se documenta dónde. **Excepción del 14/08:** las escenas ya procesadas en formato SOG **desempaquetado** (`assets/scenes/<id>/` con `meta.json` + `.webp`) sí se versionan — son el producto, no el material bruto.

---

## 7. Lo que hace viable esta visión

Tres condiciones concretas, no optimismo:

1. **El alcance está deliberadamente pequeño.** 200 metros, 3 escenas, 5–6 POIs. Es un recorte defendible técnicamente, no una versión recortada por falta de tiempo.
2. **El camino crítico está identificado y protegido.** E1 (S1–S2) → E2 (S3–S4) → E4 (S6–S7). E3 sale del camino crítico corriendo en paralelo, que es exactamente lo que permite meter 16 semanas de esfuerzo en 14 de calendario.
3. **El stack está cerrado y es gratuito.** PlayCanvas Engine (MIT), SuperSplat (MIT), formato SOG (especificación abierta), captura con un celular que el equipo ya tiene, estación con GPU que el equipo ya tiene. Ninguna dependencia de presupuesto.
4. **La viabilidad ya está demostrada, no prometida (17/08).** Hay un prototipo publicado en <https://senderovivo.pages.dev> con una escena real capturada por el equipo, recorrido guiado dentro del corredor, flechas de avance en el mundo 3D y pantalla de carga. El pipeline completo (captura → COLMAP → Brush → SOG → visor) se ejecutó de punta a punta y está medido.

---

## 8. Referencias

- Backlog: [`04-backlog.md`](04-backlog.md)
- Manual del equipo (proceso): [`02-manual-del-equipo.md`](02-manual-del-equipo.md)
- Arquitectura y ámbitos: [`03-arquitectura.md`](03-arquitectura.md)
- Producción de escenas (campo + captura + procesamiento): [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md)
- Contenido de la experiencia (catálogo, identidad visual, audio): [`06-contenido-de-la-experiencia.md`](06-contenido-de-la-experiencia.md)
- Tecnología y validaciones: [`07-tecnologia.md`](07-tecnologia.md)
- Decisión de sendero: [`decisiones/ADR-001-eleccion-de-sendero.md`](decisiones/ADR-001-eleccion-de-sendero.md)
- Requerimientos completos, **con esta visión incorporada en la sección 3.2**: [`F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md`](F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md)
- Estimación y cronograma: [`../plan/plan_de_trabajo.md`](../plan/plan_de_trabajo.md)
