# ADR-001: Elección del sendero a capturar

- **Estado:** **Aceptada** (ratificada; compromiso de tramo fijado en 200 m)
- **Estado hoy (18/08/2026):** decisión en vigor. V1 (reconocimiento) pendiente para la semana del 18–24/08; gestión con la EAAB pendiente de envío; hay un prototipo publicado con una escena de práctica que ya validó el pipeline completo antes de la salida
- **Fecha:** 11/08/2026
- **Responsable de la decisión:** Juan Urrego (PM)
- **Participan:** todo el equipo
- **Afecta a:** E1 completa, y por dependencia a E2, E3 y E4

---

## Contexto

Sendero Vivo captura y reconstruye **un tramo de 200 metros** (rango inicial 120–200, fijado en 200) de un sendero de los Cerros Orientales de Bogotá, en tres escenas. No el sendero completo: en un bosque cada metro es geometría nueva, no hay superficies repetibles que permitan simplificar sin perder el sitio, y el navegador tiene un techo duro de memoria y de coste de ordenamiento por profundidad.

Como se captura un solo tramo, **la elección del sendero determina todo el proyecto**: la calidad de la reconstrucción, el contenido biológico disponible para las fichas, la logística de la salida de campo y el riesgo de tener que repetirla.

Los tres candidatos son senderos **gratuitos con reserva previa por la app del Acueducto de Bogotá**. Esa condición es común a los tres y por tanto no diferencia.

La decisión es **bloqueante del Sprint 1**: hasta que no esté cerrada no se puede reservar la salida ni preparar el protocolo definitivo de captura.

---

## Criterios de decisión

Ordenados por peso. Los dos primeros son técnicos y dominan la decisión, porque un tramo con mucho contenido pero que no se reconstruye bien no sirve para nada.

| # | Criterio | Peso | Por qué importa |
|---|---|---|---|
| C1 | **Densidad de elementos duros** | Alto | El Gaussian Splatting reconstruye bien superficies duras con textura y mal estructuras finas y translúcidas. Escalones, barandas y roca son el ancla geométrica de la escena |
| C2 | **Condiciones de captura del tramo de entrada** | Alto | Se captura justo donde el visitante decide si sigue o se devuelve. Necesita ser un tramo acotado, con recorrido claro y luz manejable |
| C3 | **Accesibilidad en transporte público** | Medio | Hay al menos dos salidas previstas (principal y contingencia) y el equipo carga material. Menos fricción, más probabilidad de aprovechar la ventana de buen clima |
| C4 | **Valor de contenido biológico** | Medio | 5–6 POIs con aves y plantas identificables y verificables |
| C5 | **Facilidad de reserva y de repetición** | Medio | Si la primera salida falla por clima, hay que poder volver rápido |
| C6 | **Valor patrimonial o narrativo** | Bajo | Suma al contenido, pero no compensa una mala reconstrucción |

---

## Opciones consideradas

### Opción A: Quebrada La Vieja (Chapinero) · **elegida**

Calle 71 con Avenida Circunvalar. TransMilenio a 700 m.

| Criterio | Valoración |
|---|---|
| C1 Elementos duros | **Alto**, escalones de piedra, barandas de madera y cauce rocoso a lo largo del tramo de entrada |
| C2 Condiciones de captura | **Alto**, tramo de entrada acotado y con recorrido definido |
| C3 Accesibilidad | **Alto**, 700 m desde TransMilenio |
| C4 Contenido biológico | **Alto**, colibrí chillón (*Colibri coruscans*), helecho arbóreo, bosque altoandino |
| C5 Repetición | **Alto**, cercanía y reserva por la app permiten volver con poca fricción |
| C6 Patrimonio | Medio |

### Opción B: Río San Francisco · Chorro de Padilla (La Candelaria / centro)

| Criterio | Valoración |
|---|---|
| C1 Elementos duros | **Alto**, sendero de quebrada con elementos construidos |
| C2 Condiciones de captura | Medio, `[por evaluar en la visita de reconocimiento]` |
| C3 Accesibilidad | **Alto**, muy cerca del centro |
| C4 Contenido biológico | Medio-alto `[por evaluar]` |
| C5 Repetición | Alto |
| C6 Patrimonio | **Muy alto**, origen del primer acueducto de Bogotá |

**Por qué no se elige:** su mayor fortaleza es el valor patrimonial (C6), que es el criterio de menor peso. Su proximidad al centro no aporta ventaja técnica frente a la Opción A, que ya está bien conectada. No hay ganancia en C1 ni en C2 que justifique cambiar.

> El valor patrimonial de esta opción es real y notable. Se descarta por prioridad de criterios técnicos, no por falta de mérito.

### Opción C: Santa Ana – La Aguadora (Usaquén)

| Criterio | Valoración |
|---|---|
| C1 Elementos duros | **Bajo-medio**, el arranque es más abierto y tiene **menos elementos duros** |
| C2 Condiciones de captura | **Bajo**, un arranque abierto complica la captura del tramo de entrada: menos referencias geométricas y luz más variable |
| C3 Accesibilidad | Medio `[por evaluar]` |
| C4 Contenido biológico | **Alto**, sube a subpáramo, con vistas amplias |
| C5 Repetición | Medio |
| C6 Patrimonio | Medio |

**Por qué no se elige:** falla justo en los dos criterios de mayor peso. Menos elementos duros significa menos ancla geométrica, y el riesgo R1 (mala reconstrucción de vegetación densa) es el principal del proyecto. Sus vistas amplias de subpáramo son atractivas, pero **están arriba**, y el alcance cerrado es el tramo de entrada.

---

## Decisión

**Se captura el tramo de entrada de la Quebrada La Vieja (Opción A).**

Cifras del tramo previsto, Altitud: **2.712 m** · Recorrido: **340 m** · Desnivel: **62 m** · Pendiente media: **9 %**. El tramo capturado en tres escenas es de **200 m** dentro de ese recorrido.

**El motivo determinante es C1.** Escalones de piedra, barandas de madera y cauce rocoso son exactamente el tipo de superficie que el Gaussian Splatting reconstruye bien, y son la mitigación directa del riesgo más grave del proyecto: que el bosque altoandino salga con ruido y flotantes. Las otras dos opciones o no mejoran ese criterio (B) o lo empeoran (C).

La accesibilidad (C3) refuerza la decisión: con dos ventanas de salida reservadas y un equipo que carga material, 700 m desde TransMilenio reduce fricción real y aumenta la probabilidad de aprovechar la mañana nublada y sin viento que la captura necesita.

---

## Consecuencias

### Positivas

- El tramo tiene el mayor número de elementos duros de los tres candidatos: mejor punto de partida frente al riesgo R1.
- Los POIs ya identificados (colibrí chillón, puente de madera, helecho arbóreo) pertenecen a este sendero: el trabajo de contenido de E3 puede arrancar en S2b sin esperar la decisión final.
- Repetir la salida es barato en tiempo y en transporte, lo que hace creíble la estrategia de **dos ventanas** frente al riesgo R3 (clima).

### Negativas y aceptadas

- **El agua del cauce no se va a reconstruir bien.** Es superficie reflectante y en movimiento, justo lo que la guía de captura desaconseja. Se acepta como limitación: la composición se apoya en roca y baranda, y **no se modela agua a mano** (principio P1).
- **Se renuncia al valor patrimonial** del Chorro de Padilla y a **las vistas de subpáramo** de Santa Ana. Ambas cosas son contenido atractivo que este proyecto no va a tener.
- **Un solo sendero, un solo tramo.** Está en la lista de "no lo hacemos" y no se reabre.

### Qué queda pendiente de verificar en campo

- `[por medir en campo]`, Ubicación precisa de los 5–6 POIs sobre el tramo.
- `[por evaluar]`, Comportamiento real de la luz a primera hora bajo el dosel.
- `[por evaluar]`, Si el cauce estorba la reconstrucción más de lo previsto, se recompone el encuadre de las pasadas.

---

## Reversibilidad

**Alta hasta el final del Sprint 1; muy baja después.**

Mientras solo haya material bruto, cambiar de sendero cuesta una salida de campo. Una vez entrenadas las escenas en S2, cambiar implica repetir S1 y S2 completos, cuatro semanas, y arrastraría todo el cronograma. Por eso la decisión es **hito bloqueante de la semana 1** y por eso la visita de reconocimiento a las tres opciones ocurre antes de reservar la salida de captura.

Si la visita de reconocimiento contradice esta propuesta, **este ADR se actualiza antes de capturar**, no después.

---

## Actualización: 11/08/2026

Dos precisiones posteriores a la redacción de este ADR. **No cambian la decisión de sendero**, solo la concretan:

1. **El sector es Claro de Luna**, dentro de la Quebrada La Vieja.
2. **El tramo queda fijado en 200 m**, no en el rango de 120–200 m. Se divide en tres etapas: 0–70, 70–140 y 140–200 metros, con los cortes por ajustar a puntos naturales del sendero durante la visita de reconocimiento.

Las cifras de **340 m de recorrido, 62 m de desnivel y 9 % de pendiente** que aparecen arriba corresponden al **tramo de referencia evaluado en esta comparación**, no al tramo comprometido de 200 m. El desnivel y la pendiente de los 200 m están `[por medir en campo]` y se cierran en la visita de reconocimiento (V1).

La visita de reconocimiento pasa a tener historia propia y criterios de aceptación verificables: **HU-42**. Ver [`../05-produccion-de-escenas.md`](../05-produccion-de-escenas.md).

---

## Referencias

- Alcance y riesgos: [`../01-vision-y-alcance.md`](../01-vision-y-alcance.md)
- Limitaciones técnicas en vegetación densa (riesgo RT-3): [`../07-tecnologia.md`](../07-tecnologia.md)
- Historia que ejecuta esta decisión: HU-01, Sprint 1, [`../04-backlog.md`](../04-backlog.md)
- Plan de las cuatro visitas de campo: [`../05-produccion-de-escenas.md`](../05-produccion-de-escenas.md)
