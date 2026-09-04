# ADR-001: Elección del sendero a capturar

- **Estado:** **Aceptada** (acordada con el Acueducto; compromiso de tramo fijado en 200 m)
- **Estado hoy:** decisión en vigor. El sendero quedó pactado con el Acueducto en reunión y el correo formal con la solicitud de permiso de ingreso ya se envió; falta la respuesta con la autorización. Hay un prototipo publicado con una escena de práctica que ya validó el pipeline completo antes de la salida
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

### Opción A: Quebrada La Vieja (Chapinero)

Calle 71 con Avenida Circunvalar. TransMilenio a 700 m.

| Criterio | Valoración |
|---|---|
| C1 Elementos duros | **Alto**, escalones de piedra, barandas de madera y cauce rocoso a lo largo del tramo de entrada |
| C2 Condiciones de captura | **Alto**, tramo de entrada acotado y con recorrido definido |
| C3 Accesibilidad | **Alto**, 700 m desde TransMilenio |
| C4 Contenido biológico | **Alto**, colibrí chillón (*Colibri coruscans*), helecho arbóreo, bosque altoandino |
| C5 Repetición | **Alto**, cercanía y reserva por la app permiten volver con poca fricción |
| C6 Patrimonio | Medio |

**Por qué no se elige:** es la opción más fuerte en los dos criterios técnicos de mayor peso, y durante la primera evaluación fue la elegida. Se descarta por una razón externa al equipo: **el sendero disponible para el proyecto, acordado con el Acueducto, es Santa Ana – La Aguadora.** La valoración técnica de esta opción se conserva porque es la vara con la que se mide lo que se pierde.

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

### Opción C: Santa Ana – La Aguadora (Usaquén) · **elegida**

Calle 119 N° 0-10 Este, portería del Club La Aguadora, zona rural del barrio Santa Bárbara. Circuito Bosque de Pinos de 3,1 km que termina en el Mirador Santa Ana.

| Criterio | Valoración |
|---|---|
| C1 Elementos duros | **Bajo-medio**, el arranque es más abierto y tiene **menos elementos duros** |
| C2 Condiciones de captura | **Bajo**, un arranque abierto complica la captura del tramo de entrada: menos referencias geométricas y luz más variable |
| C3 Accesibilidad | Medio `[por evaluar]` |
| C4 Contenido biológico | **Alto**, sube a subpáramo, con vistas amplias |
| C5 Repetición | Medio |
| C6 Patrimonio | Medio |

**Por qué se elige:** porque es el sendero acordado con el Acueducto, que es quien administra la reserva y autoriza el ingreso y la grabación. **No es una elección técnica del equipo**, y este ADR no lo disfraza de tal cosa.

La valoración técnica de arriba sigue siendo válida y hay que leerla como lo que es: **una advertencia**. Menos elementos duros significa menos ancla geométrica, y el riesgo R1 (mala reconstrucción de vegetación densa) es el principal del proyecto. Elegir este sendero **sube ese riesgo**, y la mitigación deja de ser la elección del sitio para pasar a ser el protocolo de captura: más pasadas, encuadres que busquen deliberadamente los tramos con estructura construida, y una evaluación temprana del material antes de comprometer el entrenamiento largo.

A favor juega que el circuito atraviesa un **bosque de pinos introducido**: los troncos rectos y regularmente espaciados son mejor ancla geométrica que el bosque altoandino cerrado, y eso compensa en parte la falta de escalones y barandas.

---

## Decisión

**Se captura el tramo de entrada del sendero Santa Ana – La Aguadora (Opción C).**

El circuito Bosque de Pinos son **3,1 km**; el tramo capturado en tres escenas es de **200 m** dentro de ese recorrido. **La altitud de inicio, el desnivel y la pendiente no los publica ninguna fuente oficial para este sendero**: se miden con GPS en la visita de reconocimiento y hasta entonces quedan `[por medir en campo]`.

**El motivo determinante no es técnico: es el acuerdo con el Acueducto.** Es quien administra la Reserva Forestal Protectora Bosque Oriental de Bogotá y quien autoriza el ingreso y la grabación. Sin ese permiso no hay proyecto, y el permiso es para este sendero.

**Lo que eso cuesta, dicho sin adornos:** se renuncia a la mayor densidad de elementos duros de las tres opciones, que era la mitigación directa del riesgo R1. La compensación tiene que venir del protocolo de captura y del bosque de pinos, no de la elección del sitio.

**El horario aprieta y hay que planificar con él:** el ingreso es de **jueves a domingo y festivos, entre las 6:30 y las 9:30 de la mañana**. Son tres horas de ventana en cuatro días de la semana. Eso coincide con la luz suave de primera hora que la captura necesita, pero deja poco margen si un día sale con viento o sol duro.

---

## Consecuencias

### Positivas

- **El permiso está encaminado.** El sendero está acordado con el administrador de la reserva y la solicitud formal de ingreso ya se envió, que era el bloqueo real del proyecto.
- **El bosque de pinos ayuda a la reconstrucción.** Troncos rectos, regulares y bien espaciados dan mejor ancla geométrica que el bosque altoandino cerrado.
- **El sendero es sitio reconocido de observación de aves**, con 121 especies registradas en eBird para el punto del recorrido. El contenido de fauna de E3 tiene material de sobra.
- **Tres ecosistemas en un circuito corto:** bosque altoandino, subpáramo y bosque de pinos introducido. Más variedad visual en 200 m de la que ofrecía la alternativa.

### Negativas y aceptadas

- **El agua del cauce no se va a reconstruir bien.** Es superficie reflectante y en movimiento, justo lo que la guía de captura desaconseja. Se acepta como limitación: la composición se apoya en roca y baranda, y **no se modela agua a mano** (principio P1).
- **Se renuncia a la mayor densidad de elementos duros**, que era la mitigación directa del riesgo R1. Es la pérdida más seria de este cambio y se compensa con protocolo de captura, no con el sitio.
- **La ventana de ingreso es estrecha:** jueves a domingo, de 6:30 a 9:30 de la mañana. Si una salida se malogra por clima, la siguiente oportunidad está a días, no a horas.
- **Se renuncia al valor patrimonial** del Chorro de Padilla, que es contenido atractivo que este proyecto no va a tener.
- **Un solo sendero, un solo tramo.** Está en la lista de "no lo hacemos" y no se reabre.

### Qué queda pendiente de verificar en campo

- `[por medir en campo]`, Ubicación precisa de los 5–6 POIs sobre el tramo.
- `[por medir en campo]`, Altitud de inicio, desnivel acumulado y pendiente media: ninguna fuente oficial las publica para este sendero.
- `[por evaluar]`, Si el bosque de pinos da suficiente ancla geométrica para compensar la menor densidad de elementos duros.
- `[por evaluar]`, Comportamiento real de la luz a primera hora bajo el dosel.
- `[por evaluar]`, Si el cauce estorba la reconstrucción más de lo previsto, se recompone el encuadre de las pasadas.

---

## Reversibilidad

**Alta hasta el final del Sprint 1; muy baja después.**

Mientras solo haya material bruto, cambiar de sendero cuesta una salida de campo. Una vez entrenadas las escenas en S2, cambiar implica repetir S1 y S2 completos, cuatro semanas, y arrastraría todo el cronograma. Por eso la decisión es **hito bloqueante de la semana 1** y por eso la visita de reconocimiento a las tres opciones ocurre antes de reservar la salida de captura.

Si la visita de reconocimiento contradice esta propuesta, **este ADR se actualiza antes de capturar**, no después.

---

## Alcance concreto del tramo

El tramo queda fijado en **200 m**, no en el rango de 120–200 m, y se divide en tres etapas: 0–70, 70–140 y 140–200 metros, con los cortes por ajustar a puntos naturales del sendero durante la visita de reconocimiento.

El punto de partida es el tramo de entrada del circuito Bosque de Pinos, desde la portería del Club La Aguadora. La altitud de inicio, el desnivel y la pendiente de esos 200 m están `[por medir en campo]` y se cierran en la visita de reconocimiento (V1).

La visita de reconocimiento tiene historia propia y criterios de aceptación verificables: **CAM-02**. Ver [`../05-produccion-de-escenas.md`](../05-produccion-de-escenas.md).

---

## Referencias

- Alcance y riesgos: [`../01-vision-y-alcance.md`](../01-vision-y-alcance.md)
- Limitaciones técnicas en vegetación densa (riesgo RT-3): [`../07-tecnologia.md`](../07-tecnologia.md)
- Historia que ejecuta esta decisión: HU-01, Sprint 1, [`../04-backlog.md`](../04-backlog.md)
- Plan de las cuatro visitas de campo: [`../05-produccion-de-escenas.md`](../05-produccion-de-escenas.md)
