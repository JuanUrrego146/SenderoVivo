# Visión de proyecto — Sendero Vivo

> Punto 1 de la actividad del curso (segunda mitad).
> Versión 1,0 — 11 de agosto de 2026.
> Horizonte: 15 semanas (11 ago – 24 nov de 2026).

---

## 1. El problema

Los senderos de los Cerros Orientales de Bogotá son **gratuitos** y se reservan por la app del Acueducto. El acceso, en el papel, está resuelto. Lo que no está resuelto es todo lo que pasa antes y durante la caminata.

Quien va a la Quebrada La Vieja por primera vez no sabe cuánto dura, qué tan duro es, hasta dónde va a alcanzar a llegar, ni por dónde va exactamente el camino autorizado. El sendero completo son **7,3 km, +406 m de desnivel y unas 3 horas**. Esas cifras existen, pero no significan nada para alguien que nunca ha subido: 406 metros de desnivel no se imaginan, se sienten.

De ahí salen cuatro problemas concretos y observables:

1. **La gente se devuelve a mitad de camino.** Sube sin saber a qué se enfrenta, se le acaba el aire o el tiempo, y se regresa. El plan se frustra y la próxima vez no vuelve.
2. **La gente se sale del trazado.** En una reserva protegida, salirse del camino no es una anécdota: es pisar bosque altoandino que tarda décadas en recuperarse.
3. **Se camina sin entender lo que se ve.** Un colibrí chillón, un helecho arbóreo y un musgo de páramo pasan como "verde". El sendero tiene contenido biológico enorme y casi nadie tiene cómo leerlo.
4. **Quien no puede subir, nunca conoce el lugar.** Condición física, edad, discapacidad, tiempo, distancia, miedo. El cerro está a 700 metros de un TransMilenio y aun así es inaccesible para mucha gente.

**El problema, en una frase:** el sendero es público y gratuito, pero la información para recorrerlo con criterio —y la posibilidad de conocerlo sin subir— no existe.

---

## 2. Para quién es

| Perfil | Quién es | Qué necesita de Sendero Vivo |
|---|---|---|
| **El que va a ir** | Vive o trabaja en Bogotá, quiere hacer el sendero el próximo fin de semana | Ver el camino real antes de reservar. Saber a qué va y hasta dónde puede llegar |
| **El que no puede subir** | Movilidad reducida, edad, condición física, o simplemente está lejos | Conocer el lugar. Recorrerlo de verdad, no ver fotos |
| **El curioso del bosque** | Le interesan las aves y las plantas, no solo caminar | Poder identificar qué está viendo: nombre, canto, cómo reconocerlo |
| **El que enseña** | Docente, guía, líder ambiental | Un material para mostrar el ecosistema altoandino sin sacar a 30 personas a la montaña |

**Usuario primario del MVP:** el visitante que quiere reconocer el sendero antes de ir. Es el que valida las tres promesas de golpe.

---

## 3. Propuesta de valor

> **Sendero Vivo permite recorrer el tramo real de un sendero de los Cerros Orientales desde el navegador, reconstruido tal como es —capturado, no dibujado— para saber a qué se va, entender lo que se ve y medir lo que cuesta.**

La propuesta se sostiene en tres verbos:

### Reconocer
Ver el camino real: los escalones de piedra, las barandas de madera, el cauce, la pendiente. No un render ni un mapa: **el lugar, capturado**. La diferencia entre "el sendero tiene 406 m de desnivel" y ver la escalera que hay que subir.

### Entender
Marcadores flotantes anclados a lugares reales del tramo. Al tocarlos se abre la ficha del ave, la planta o el elemento: modelo 3D girable, nombre común y científico, narración corta, canto del ave, a qué altura vive y cómo identificarla en campo.

### Medir
Mientras se avanza, en pantalla: altitud sobre el nivel del mar, distancia recorrida y restante, desnivel acumulado, pendiente actual, y tiempo estimado hasta el siguiente punto. Datos reales tomados con GPS el mismo día de la captura.

### Por qué "capturado, no modelado"
Esta es la decisión que define el proyecto. Un modelo 3D hecho a mano es la interpretación de un artista sobre cómo se ve un bosque. Un Gaussian Splat es **el bosque**, con su desorden, su luz de esa mañana y su geometría imposible de dibujar. Para una app cuyo propósito es que reconozcas el lugar cuando llegues, esa diferencia es todo el producto.

---

## 4. Alcance

### 4.1 Lo que SÍ está en el alcance

- Un tramo real de **120 a 200 metros**, dividido en **3 escenas** encadenadas.
- **5 a 6 puntos de interés** completos, con todo su contenido.
- **Fichas 3D de aves y plantas**: modelo girable con zoom, nombre común y científico, narración, canto, altura de distribución e identificación en campo.
- **Recorrido guiado** sobre el trazado, con **mirada libre 360°** en cualquier punto.
- **Datos del recorrido en pantalla**: altitud, distancia recorrida y restante, desnivel acumulado, pendiente, tiempo estimado al siguiente punto.
- **Web para escritorio y celular**, sin instalación.

### 4.2 Lo que NO está en el alcance

Esta lista es vinculante. No es una lista de "fase 2": es una lista de lo que este proyecto **no va a hacer**, y no se propone de nuevo.

- ❌ El sendero completo de 7,3 km.
- ❌ Caminar libre tipo videojuego (WASD, movimiento fuera del trazado).
- ❌ App nativa iOS o Android.
- ❌ Realidad virtual.
- ❌ Multijugador o cualquier función social.
- ❌ Captura con dron.
- ❌ Más de un sendero.

**Por qué el tramo y no el sendero completo:** en un bosque cada metro es geometría nueva —no hay superficies repetibles, no hay simplificación posible sin perder el sitio— y el navegador tiene un techo duro de memoria y de coste de ordenamiento por profundidad. Capturar 7,3 km produciría un archivo que ningún celular puede cargar. Se captura el primer tramo, justo donde el visitante decide si sigue o se devuelve, porque es exactamente el punto donde la información cambia la decisión.

### 4.3 Ubicación

**Quebrada La Vieja, tramo de entrada.** Calle 71 con Avenida Circunvalar, Chapinero. TransMilenio a 700 m.

El tramo tiene escalones de piedra, barandas de madera y cauce rocoso: superficies duras, con textura y aristas definidas, que es justo lo que la reconstrucción por Gaussian Splatting resuelve bien. Es un criterio técnico, no estético.

**Cifras del tramo a capturar** — Altitud: **2.712 m** · Recorrido: **340 m** · Desnivel: **62 m** · Pendiente media: **9 %**.

> La decisión final de sendero se cierra en la primera semana y es **hito bloqueante del Sprint 1**. Las tres opciones evaluadas y los criterios están en [ADR-001](decisiones/ADR-001-eleccion-de-sendero.md).

---

## 5. Criterios de éxito

Medibles, verificables y con fecha. Si no se pueden comprobar, no son criterios.

### 5.1 De producto

| # | Criterio | Meta | Cómo se mide | Cuándo |
|---|---|---|---|---|
| E1 | El tramo está reconstruido y es navegable | 3 escenas encadenadas, 120–200 m | Recorrido completo de extremo a extremo sin cortes | Fin S4 |
| E2 | Los puntos de interés están completos | ≥ 5 POIs con los 5 elementos de ficha | Revisión de contenido POI por POI | Fin S5 |
| E3 | Los datos del recorrido son reales y correctos | Altitud, distancia, desnivel y pendiente derivados del track GPS capturado | Contraste contra el track grabado en campo | Fin S6 |
| E4 | Funciona en celular sin instalar nada | Carga y recorrido completo en Chrome Android y Safari iOS | Prueba en dispositivo físico | Fin S7 |

### 5.2 De calidad técnica

| # | Criterio | Meta | RNF |
|---|---|---|---|
| E5 | Rendimiento en gama media | ≥ 30 fps sostenidos | RNF-001 |
| E6 | Tiempo hasta primera escena navegable | < 10 s con 10 Mbps | RNF-002 |
| E7 | Peso por escena SOG | ≤ `[por definir tras la primera captura]` MB | RNF-003 |
| E8 | Accesibilidad de textos | Contraste AA + transcripción de narraciones | RNF-006 |
| E9 | Ninguna pantalla en negro | Todo fallo de carga informa y ofrece reintentar | RNF-007 |

### 5.3 De usabilidad

| # | Criterio | Meta | Cómo se mide |
|---|---|---|---|
| E10 | Autonomía del visitante | 4 de 5 personas sin experiencia previa inician el recorrido y abren una ficha **sin instrucciones** | Prueba con 5 usuarios en S7 |
| E11 | Reconocimiento del lugar | El visitante identifica el tramo al llegar físicamente | Validación cualitativa `[pendiente de programar]` |

### 5.4 De proceso

| # | Criterio | Meta |
|---|---|---|
| E12 | Los 8 sprints cierran con demo funcionando | 8/8 |
| E13 | Margen de esfuerzo restante al final de S6 | > 15 % de las 262 h reservadas |
| E14 | Todo RF entregado está trazado a un CUS y a una historia | 100 % |

---

## 6. Riesgos y mitigación

Ordenados por exposición (probabilidad × impacto). Los tres primeros son los que pueden hundir el proyecto.

### R1 — La vegetación densa no se reconstruye bien
**Probabilidad: alta · Impacto: alto**

El Gaussian Splatting resuelve muy bien superficies duras y muy mal estructuras finas, translúcidas y en movimiento. Un bosque altoandino es exactamente eso: hojas delgadas, ramas finas, follaje que se mueve. La literatura reporta que el follaje denso introduce ruido y distorsiona la geometría, y que quedan "flotantes" (gaussianas con opacidad en el vacío).

**Mitigación:**
- El tramo se eligió por sus **elementos duros** (escalones de piedra, barandas, cauce): son el ancla geométrica de la reconstrucción.
- Captura en **día nublado y sin viento** — el viento es el enemigo directo de este problema.
- Varias pasadas a distintas alturas para dar redundancia de vistas al follaje.
- Limpieza de flotantes en SuperSplat como paso obligatorio del "hecho" de cada escena.
- **Plan de choque:** si una escena sale inaceptable, se recorta el tramo. Es preferible entregar 120 m impecables que 200 m con ruido.

### R2 — La escena pesa más de lo que aguanta un celular
**Probabilidad: media-alta · Impacto: alto**

La guía de rendimiento de PlayCanvas sugiere un presupuesto de **~1 millón de gaussianas en móvil** frente a 3+ millones en escritorio, y advierte que el cuello de botella real es el *fill rate* (sobredibujo con mezcla alfa), no solo la memoria.

**Mitigación:**
- SOG comprime ~15–20× frente a PLY; el caso de referencia de PlayCanvas baja 1 GB a 42 MB.
- Tres escenas separadas en lugar de una sola: se carga solo lo necesario.
- Reducción de gaussianas por escena hasta cumplir RNF-001, aceptando pérdida de detalle en zonas sin POI.
- Desactivar antialiasing y limitar el *device pixel ratio* en móvil.
- **Plan de choque:** Streamed SOG con LOD (`.lod-meta.json`), que carga niveles de detalle según distancia de cámara.

### R3 — El clima impide la salida de campo
**Probabilidad: media · Impacto: alto**

La captura exige día nublado, sin viento y a primera hora. En Bogotá esa ventana no se pide por anticipado. Si la salida de S1 falla, se corre todo el cronograma: E1 bloquea a E2, que bloquea a E4.

**Mitigación:**
- **Dos ventanas de salida** reservadas dentro del Sprint 1, no una.
- Reserva previa por la app del Acueducto para ambas fechas.
- Checklist y ensayo de protocolo **antes** de la salida, para no gastar la ventana aprendiendo a usar el equipo.
- E3 (modelado 3D de aves y plantas) **no depende de la captura**: si S1 se retrasa, Felipe sigue produciendo y el retraso no paraliza al equipo entero.

### R4 — El equipo es primerizo en las tres tecnologías a la vez
**Probabilidad: alta · Impacto: medio**

Gaussian Splatting, SuperSplat/SOG y PlayCanvas, simultáneamente, sin experiencia previa.

**Mitigación:**
- Margen de estimación del **50 %** (no 30 %), explícito en el plan de trabajo.
- S1 incluye tiempo de aprendizaje y prueba de herramientas como trabajo real, no como algo que se hace "aparte".
- Toda la investigación queda en `docs/03-avances-tecnologia.md`, no en la cabeza de quien la hizo.
- Revisión cruzada obligatoria: el conocimiento no se queda en una sola persona.

### R5 — El alcance se expande
**Probabilidad: media · Impacto: medio**

Es un proyecto vistoso. Van a aparecer ideas: más senderos, VR, caminar libre.

**Mitigación:**
- Lista de "no lo hacemos" explícita y vinculante (§4.2), repetida en README y en `context-for-vibe-coding.md`.
- Ninguna tarea entra al sprint sin trazar a un RF (principio P2).
- Las ideas nuevas van al backlog y solo se discuten en revisión de sprint.

### R6 — Descoordinación entre las cuatro épicas
**Probabilidad: media · Impacto: medio**

Cuatro épicas, seis personas, dos disciplinas distintas (producción de assets y programación) y un sprint corriendo en paralelo.

**Mitigación:**
- Contratos de datos (`pois.json`, `scenes.json`, track GPS) definidos y publicados en S1, **antes** de que nadie los necesite (principio P4).
- Un solo integrador responsable (Juan) y ramas por épica con dueño claro.
- Fusión a `develop` al cierre de cada sprint, no al final de la épica.

### R7 — Un dato biológico publicado resulta incorrecto
**Probabilidad: baja · Impacto: medio-alto**

Las fichas afirman nombres científicos y rangos de altitud. Un error se propaga como información confiable.

**Mitigación:**
- Verificación obligatoria contra fuente citable antes de publicar cualquier ficha.
- Lo no verificado se marca `[por medir en campo]` o `[por verificar]`; nunca se rellena.
- Felipe revisa toda ficha de fauna y flora antes de la demo.

### R8 — Pérdida del material de captura
**Probabilidad: baja · Impacto: muy alto**

El video bruto de la salida es irrepetible sin volver a tener las mismas condiciones de luz.

**Mitigación:**
- Copia del material bruto en **dos ubicaciones distintas el mismo día de la captura**, antes de tocar nada.
- El material bruto no entra a Git (`assets/raw/` está en `.gitignore`); se almacena aparte y se documenta dónde.

---

## 7. Lo que hace viable esta visión

Tres condiciones concretas, no optimismo:

1. **El alcance está deliberadamente pequeño.** 120–200 metros, 3 escenas, 5–6 POIs. Es un recorte defendible técnicamente, no una versión recortada por falta de tiempo.
2. **El camino crítico está identificado y protegido.** E1 (S1–S2) → E2 (S3–S4) → E4 (S6–S7). E3 sale del camino crítico corriendo en paralelo, que es exactamente lo que permite meter 16 semanas de esfuerzo en 14 de calendario.
3. **El stack está cerrado y es gratuito.** PlayCanvas Engine (MIT), SuperSplat (MIT), formato SOG (especificación abierta), captura con un celular que el equipo ya tiene, estación con GPU que el equipo ya tiene. Ninguna dependencia de presupuesto.

---

## 8. Referencias

- Alcance, roles y cronograma detallado: [`04-actividades-y-roles.md`](04-actividades-y-roles.md)
- Investigación técnica y riesgos técnicos: [`03-avances-tecnologia.md`](03-avances-tecnologia.md)
- Decisión de sendero: [`decisiones/ADR-001-eleccion-de-sendero.md`](decisiones/ADR-001-eleccion-de-sendero.md)
- Requerimientos completos: `F_Analisis_de_Requerimientos_V1,0_SenderoVivo.docx`
- Estimación y cronograma: [`../plan/plan_de_trabajo.md`](../plan/plan_de_trabajo.md)
