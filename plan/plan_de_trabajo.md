# Plan de trabajo — Sendero Vivo

> Versión 1,0 — 11/08/2026 · Responsable: Juan Urrego
> Periodo: **11 de agosto – 24 de noviembre de 2026** (15 semanas)

---

## 1. Método de estimación

**Complejidad por requerimiento**, con las bandas acordadas:

| Complejidad | Banda | Valor usado |
|---|---|---|
| **S** | 2–4 h | 3 h |
| **M** | 4–8 h | 6 h |
| **L** | 8–16 h | 12 h |

Se usa el **punto medio de cada banda** para el cálculo base. Los RNF transversales suman como tareas propias, no se diluyen en los RF.

**Margen del 50 %, no del 30 %.** El equipo es primerizo con **las tres tecnologías centrales al mismo tiempo** (Gaussian Splatting, SuperSplat/SOG y PlayCanvas). Además, buena parte del proyecto es producción de contenido físico —una salida de campo que depende del clima— donde el reintento cuesta días, no horas. El 30 % habitual asume familiaridad con el stack; aquí no la hay.

Además de RF y RNF, el plan estima explícitamente el **trabajo de producción** (captura, procesamiento, modelado 3D, audio, diseño) y la **gestión**. Sin ellos la estimación estaría mintiendo: en este proyecto la mayor parte del esfuerzo **no es escribir código**.

---

## 2. Estimación por requerimiento funcional

| RF | Nombre | Compl. | Horas | Sprint |
|---|---|---|---|---|
| RF-001 | Cargar la primera escena sin instalación | M | 6 | S3 |
| RF-002 | Mostrar el recorrido en Gaussian Splats (SOG) | L | 12 | S4 |
| RF-003 | Avanzar y retroceder por el trazado | M | 6 | S3 |
| RF-004 | Restringir el desplazamiento al trazado autorizado | M | 6 | S3 |
| RF-005 | Rotar la cámara 360° | S | 3 | S3 |
| RF-006 | Marcadores anclados a coordenadas reales | L | 12 | S5 |
| RF-007 | Activar un marcador para abrir la ficha | S | 3 | S5 |
| RF-008 | Nombre común y nombre científico | S | 3 | S5 |
| RF-009 | Visor 3D girable con acercamiento | L | 12 | S5 |
| RF-010 | Altura de distribución e identificación en campo | S | 3 | S5 |
| RF-011 | Reproducir la narración del punto de interés | M | 6 | S5 |
| RF-012 | Reproducir el canto del ave (POI de fauna) | S | 3 | S5 |
| RF-013 | Mostrar la altitud sobre el nivel del mar | S | 3 | S6 |
| RF-014 | Mostrar distancia recorrida y restante | M | 6 | S6 |
| RF-015 | Mostrar desnivel acumulado y pendiente | M | 6 | S6 |
| RF-016 | Tiempo estimado hasta el siguiente POI | M | 6 | S6 |
| RF-017 | Encadenar las tres escenas de forma continua | L | 12 | S4 |
| RF-018 | Volver a la posición al cerrar la ficha | S | 3 | S5 |
| RF-019 | Adaptar la interfaz a escritorio y celular | L | 12 | S7 |
| RF-020 | Consumir el track GPS del sendero | M | 6 | S6 |
| RF-021 | Añadir un POI por archivo de configuración | M | 6 | S5 |
| RF-022 | Ajustar calidad y presupuesto según el dispositivo | M | 6 | S4 |
| RF-023 | Publicar una escena por archivo de configuración | S | 3 | S2 |
| RF-024 | Mostrar la transcripción de la narración | S | 3 | S5 |
| RF-025 | Mostrar el progreso de carga de la escena | S | 3 | S3 |
| RF-026 | Onboarding la primera vez | M | 6 | S7 |
| | **Subtotal RF (26)** | | **156 h** | |

**Reparto:** 9 requerimientos S (27 h) · 11 M (66 h) · 6 L (72 h).

---

## 3. Estimación por requerimiento no funcional

| RNF | Nombre | Compl. | Horas | Sprint |
|---|---|---|---|---|
| RNF-001 | Rendimiento: ≥ 30 fps en gama media | L | 12 | S4 |
| RNF-002 | Tiempos de carga: < 10 s a 10 Mbps | M | 6 | S3 |
| RNF-003 | Peso por escena SOG | M | 6 | S2 |
| RNF-004 | Compatibilidad de navegadores | M | 6 | S3 |
| RNF-005 | Usabilidad sin instrucciones | M | 6 | S7 |
| RNF-006 | Accesibilidad: contraste AA y transcripciones | M | 6 | S7 |
| RNF-007 | Tolerancia a errores de carga | M | 6 | S3 |
| RNF-008 | Audio nunca automático | S | 3 | S5 |
| RNF-009 | Mantenibilidad: POI sin recompilar | S | 3 | S5 |
| RNF-010 | Idioma español | S | 3 | S7 |
| RNF-011 | Versionado y licencia de assets | S | 3 | S2 |
| RNF-012 | Presupuesto de modelos 3D de ficha | M | 6 | S2b |
| RNF-013 | Privacidad: sin datos personales | S | 3 | Cierre |
| RNF-014 | Despliegue estático sobre HTTPS | M | 6 | Cierre |
| RNF-015 | Responsabilidad ambiental y normativa | S | 3 | Cierre |
| | **Subtotal RNF (15)** | | **78 h** | |

---

## 4. Estimación de producción de contenido

Este bloque es **el 42 % del esfuerzo base** y no aparece en ningún RF. Omitirlo sería el error clásico de este tipo de proyectos.

| Tarea | Horas | Sprint | Responsable |
|---|---|---|---|
| Visita de reconocimiento a las tres opciones y ADR-001 | 16 | S1 | Juan Urrego |
| Protocolo de captura, ensayo y prueba 1x vs 2x | 10 | S1 | Juan Urrego |
| Salida de campo: captura, GPS, audio, fotos por POI | 12 | S1 | Todo el equipo |
| **Salida de contingencia** (reserva ante mal clima) | 8 | S1 | Todo el equipo |
| Extracción de cuadros, SfM y entrenamiento 3DGS ×3 | 24 | S2 | Juan Urrego |
| Limpieza en SuperSplat ×3 escenas | 18 | S2 | Juan Urrego / Felipe |
| Compresión a SOG y validación de peso y calidad | 8 | S2 | Juan Urrego |
| Modelado de aves (colibrí, mirla, copetón, pava andina) | 32 | S2b | Felipe Acevedo |
| Modelado y escaneo de plantas, helechos y musgos | 20 | S2b | Felipe Acevedo |
| Escaneos de detalle (insectos, minerales, piezas) | 12 | S2b | Felipe Acevedo |
| Modelado del puente de madera y la señalización | 10 | S2b | Felipe Acevedo |
| Optimización de polígonos y export a glTF | 12 | S2b | Felipe Acevedo |
| Narraciones, cantos y transcripciones | 10 | S2b | Alberto / Felipe / David |
| Wireframes y prototipo de ficha, HUD y onboarding | 16 | S3 | Eybar Viasus |
| Sistema de diseño consolidado | 14 | S7 | Eybar Viasus |
| | **Subtotal producción** | **222 h** | |

---

## 5. Estimación de gestión, integración y entrega

| Tarea | Horas | Cuándo |
|---|---|---|
| Ceremonias: planeación, sincronizaciones, demo y retro (2 h/semana × 14) | 28 | S1–S7 |
| Repositorio, contratos de datos y documentación inicial | 12 | S1 |
| Integración final, pruebas cruzadas en dispositivos y despliegue | 24 | Cierre |
| Actualización final de documentación y cierre de validaciones | 4 | Cierre |
| | **Subtotal gestión** | **68 h** |

---

## 6. Total estimado

| Bloque | Horas base | % |
|---|---|---|
| Requerimientos funcionales (26) | 156 | 30 % |
| Requerimientos no funcionales (15) | 78 | 15 % |
| Producción de contenido | 222 | 42 % |
| Gestión, integración y entrega | 68 | 13 % |
| **Base** | **524 h** | 100 % |
| **Margen (50 %)** | **262 h** | |
| **TOTAL** | **786 h** | |

### Contraste con la capacidad del equipo

| | |
|---|---|
| Personas | 6 |
| Semanas | 15 |
| Dedicación asumida | **9 h/persona/semana** |
| **Capacidad total** | **810 h** |
| **Demanda estimada** | **786 h** |
| **Holgura** | **24 h (3 %)** |

**Lectura honesta de esta cifra:** la utilización queda en el **97 %**, que es alto. Pero el colchón real no son esas 24 horas: son las **262 horas de margen** ya incorporadas al total. Si todo saliera perfecto —que no va a pasar— el proyecto se cerraría en 524 h y sobraría más de un mes de capacidad. La cifra que hay que vigilar en cada retrospectiva es **cuánto margen queda consumido**, porque es el indicador temprano de si hay que recortar alcance.

**Criterio de éxito E13:** al final de S6 debe quedar **más del 15 %** de las 262 h de margen sin consumir.

---

## 7. Esfuerzo por persona

| Persona | Horas estimadas | h/semana | Carga |
|---|---|---|---|
| **Juan Urrego** | 218 | 14,5 | 🔴 Alta |
| **Felipe Acevedo** | 150 | 10,0 | 🟠 Media-alta |
| **Alejandra Chambueta** | 138 | 9,2 | 🟢 Ajustada |
| **David Beltrán** | 122 | 8,1 | 🟢 Ajustada |
| **Eybar Viasus** | 96 | 6,4 | 🟢 Holgada |
| **Alberto Alemán** | 62 | 4,1 | 🔵 Baja |
| **Total** | **786** | **8,7 promedio** | |

### Dos desequilibrios que hay que corregir en la planeación de S1

Esto no es un resultado deseado del plan: es lo que sale al sumar las responsabilidades tal como están asignadas hoy, y conviene decirlo antes de empezar y no en la semana 10.

**1. Juan concentra 218 h (28 % del proyecto).** Acumula toda E1 —la parte con más riesgo y más carga física—, más la gestión, más la integración final. Es el cuello de botella del camino crítico: si se atrasa, se atrasa todo.
> **Propuesta:** trasladar la limpieza en SuperSplat (18 h) a Felipe y parte de las pruebas de integración (8 h) a David y Alejandra. Bajaría a ~192 h.

**2. Alberto queda en 62 h (4,1 h/semana), muy por debajo del promedio.** Su trabajo se concentra en S7, casi al final.
> **Propuesta:** asignarle los escaneos de detalle de S2b (12 h, hoy en Felipe) y adelantar el trabajo de onboarding y accesibilidad a S5–S6 en lugar de esperar a S7. Subiría a ~90 h y descargaría a Felipe.

Con ambos ajustes el reparto quedaría entre 90 y 192 h por persona, que sigue sin ser plano —Juan es PM además de programador— pero es defendible.

### Sobre el pico de S2b

**S2b concentra 153 h con margen, y ~120 de esas son de una sola persona** (Felipe: modelado, escaneo y optimización). En dos semanas eso serían 60 h semanales para él: **inviable**.

**Cómo se resuelve, y por qué el paralelismo es lo que lo hace posible:** S2b está **fuera del camino crítico**. Su entrega no se necesita hasta el inicio de **S5 (6 de octubre, semana 9)**. Formalmente ocupa las semanas 3–4 según la estructura de sprints del curso, pero el trabajo de modelado **se reparte realmente entre las semanas 3 y 8**, con Felipe a ~20 h/semana. Eso es exactamente lo que compra correr E3 en paralelo con E1: no comprime el trabajo del artista, **le da seis semanas en lugar de dos**.

**Regla de control:** al cerrar S2b (7 de septiembre) deben estar terminadas **las cuatro aves y el helecho arbóreo**, porque son los POIs confirmados. El resto del catálogo puede seguir hasta la semana 8.

---

## 8. Cronograma semana a semana

| Sem | Fechas | Sprint | Foco | h estimadas |
|---|---|---|---|---|
| **1** | 11–17 ago | S1 | Visita de reconocimiento a las tres opciones. **ADR-001 cerrado el viernes.** Repositorio y contratos de datos | 46 |
| **2** | 18–24 ago | S1 | Protocolo de captura y ensayo. **Salida de campo.** Respaldo del material en dos ubicaciones | 47 |
| **3** | 25–31 ago | S2 + S2b | Extracción de cuadros, SfM, inicio de entrenamiento · **Paralelo:** modelado de aves | 76 |
| **4** | 1–7 sep | S2 + S2b | Limpieza en SuperSplat, compresión a SOG, `scenes.json`. **RNF-003 fijado con dato real** · **Paralelo:** aves y helecho arbóreo terminados | 76 |
| **5** | 8–14 sep | S3 | Carga de `.sog` en PlayCanvas. WebGPU con repliegue. Dispositivo de referencia definido | 47 |
| **6** | 15–21 sep | S3 | Avance y retroceso, mirada libre 360°, restricción al trazado, estados de carga y error | 46 |
| **7** | 22–28 sep | S4 | Encadenado de las tres escenas y precarga | 35 |
| **8** | 29 sep – 5 oct | S4 | Perfiles de calidad, LOD, optimización hasta 30 fps. **Decisión sobre Streamed SOG** | 34 |
| **9** | 6–12 oct | S5 | Marcadores anclados y panel de ficha | 48 |
| **10** | 13–19 oct | S5 | Visor 3D, audio con transcripción, POIs declarativos | 48 |
| **11** | 20–26 oct | S6 | Consumo del track GPS. **Alineación y escalado definitivos** | 24 |
| **12** | 27 oct – 2 nov | S6 | HUD: altitud, distancia, desnivel, pendiente, tiempo estimado | 23 |
| **13** | 3–9 nov | S7 | Onboarding y responsive móvil | 39 |
| **14** | 10–16 nov | S7 | Accesibilidad AA, sistema de diseño consolidado, revisión de textos | 38 |
| **15** | 17–24 nov | Cierre | Integración, pruebas cruzadas, despliegue y **entrega** | 60 |
| | | | **Total** | **786** |

> Las semanas 3 y 4 son las más cargadas (76 h) porque corren dos sprints a la vez. Las semanas 11–12 son las más ligeras: es holgura deliberada antes del tramo final de UI/UX y del cierre.

---

## 9. Milestones

| Milestone | Fecha límite | Qué debe estar hecho | Criterio de aceptación |
|---|---|---|---|
| **M1 · Decisión y captura** | 24/08/2026 | ADR-001 cerrado y material bruto en disco | Video 4K60, track GPS, audio y fotos por POI, respaldados en dos ubicaciones |
| **M2 · Tramo reconstruido** | 07/09/2026 | 3 escenas en `.sog`, limpias y publicadas | Cargan en un visor; RNF-003 fijado con medición real |
| **M2b · Catálogo 3D base** | 07/09/2026 | Aves y helecho arbóreo modelados y optimizados | `.glb` dentro de presupuesto, cargando sin errores |
| **M3 · Tramo navegable** | 21/09/2026 | Escena cargando, cámara y navegación básica | Recorrido de una escena en Chrome y en celular real |
| **M4 · Recorrido completo** | 05/10/2026 | 3 escenas encadenadas a ≥ 30 fps en gama media | Extremo a extremo sin cortes, medición documentada |
| **M5 · Puntos de interés** | 19/10/2026 | 5–6 POIs completos y consultables | Ficha con modelo 3D, audio y transcripción; POI añadible por JSON |
| **M6 · Capa de datos** | 02/11/2026 | HUD con datos reales del track | Altitud, distancia, desnivel, pendiente y tiempo estimado |
| **M7 · Experiencia final** | 16/11/2026 | UI final, responsive, onboarding, accesibilidad | 4 de 5 usuarios inician y abren una ficha sin instrucciones |
| **M8 · Entrega** | 24/11/2026 | Desplegado y documentado | Recorrido completo en Chrome, Safari y Firefox, escritorio y móvil |

---

## 10. Camino crítico y holguras

```
S1 ──► S2 ──► S3 ──► S4 ──► S6 ──► S7 ──► Cierre        ← camino crítico
        │
        └──► S2b ····························► S5       ← holgura de 4 semanas
```

- **En el camino crítico:** S1, S2, S3, S4, S6, S7 y el cierre. Cualquier retraso aquí desplaza la entrega.
- **Fuera del camino crítico:** S2b, con **4 semanas de holgura** (termina en la semana 4, se necesita en la semana 9). Esa holgura es lo que hace realista el pico de carga de Felipe.
- **S5** depende de S4 (necesita el motor) y de S2b (necesita los modelos). Es el punto donde convergen las dos ramas: si alguna llega tarde, S5 se atasca.

**Los dos puntos de mayor riesgo de calendario:**
1. **Fin de S1 (24 ago).** Si la salida de campo falla por clima y se agota también la ventana de contingencia, todo el camino crítico se desplaza. Es el único riesgo del proyecto que no se puede resolver trabajando más horas.
2. **Fin de S4 (5 oct).** Si no se alcanzan los 30 fps, hay que volver a S2 a regenerar escenas con menos gaussianas, lo que reabre trabajo ya dado por cerrado.

---

## 11. Qué se recorta primero si hay que recortar

Orden de sacrificio acordado por adelantado, para no discutirlo bajo presión en la semana 13:

1. **Número de POIs:** de 6 a 5. Es el recorte más barato y el menos visible.
2. **Longitud del tramo:** de 200 m a 120 m. Dos escenas en lugar de tres. Ya está previsto como respuesta a los riesgos R1 y R2.
3. **Catálogo de modelos:** las cuatro aves y el helecho arbóreo son intocables (son POIs confirmados); los escaneos de detalle de insectos y minerales sí se pueden aplazar.
4. **Pulido de UI:** el sistema de diseño se consolida menos, pero **la accesibilidad (RNF-006) no se recorta**.

**Lo que no se recorta bajo ninguna circunstancia:** el rendimiento en móvil (RNF-001), la restricción al trazado autorizado (RF-004), la veracidad de los datos biológicos y de recorrido, y la accesibilidad.

---

## 12. Supuestos de este plan

1. Dedicación de **9 h/persona/semana**. Si baja, el plan no cierra: hay que recortar según §11.
2. La estación con GPU del equipo está disponible durante las semanas 3–4. `[especificaciones por documentar]`
3. La reserva por la app del Acueducto se obtiene para las dos ventanas de salida previstas.
4. Las cifras del tramo (2.712 m, 340 m, 62 m, 9 %) se confirman en campo. Si difieren, se actualizan aquí y en `scenes.json`.
5. RNF-003 (peso por escena) **está sin número** y se fija en S2 con una medición real. Cualquier estimación de S3 y S4 que dependa de él puede moverse.
6. Las horas de producción 3D asumen un solo artista. Si entra apoyo (§7), S2b se descomprime.

---

## 13. Referencias

- Épicas, sprints, historias y criterios de aceptación: [`../docs/04-actividades-y-roles.md`](../docs/04-actividades-y-roles.md)
- Riesgos y su mitigación: [`../docs/02-vision-de-proyecto.md`](../docs/02-vision-de-proyecto.md)
- Riesgos técnicos y validaciones pendientes: [`../docs/03-avances-tecnologia.md`](../docs/03-avances-tecnologia.md)
- Backlog importable a Jira: [`backlog-jira.csv`](backlog-jira.csv)
