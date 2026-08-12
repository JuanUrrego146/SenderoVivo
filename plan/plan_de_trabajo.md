# Plan de trabajo: Sendero Vivo

> Versión 1,1, 11/08/2026 · Responsable: Juan Urrego
> Periodo: **11 de agosto – 28 de noviembre de 2026** (15 semanas)
> **Dedicación: 12 horas semanales por persona**, es la exigencia del curso y es la base de todo el cálculo de este documento.

> **Este plan es una guía inicial, no el plan definitivo.** La visita de reconocimiento (V1) de la semana 2 va a cambiar el tramo exacto, los puntos de interés y probablemente algunas estimaciones. Está previsto que así sea.

---

## 1. Método de estimación

**Complejidad por requerimiento**, con las bandas acordadas:

| Complejidad | Banda | Valor usado |
|---|---|---|
| **S** | 2–4 h | 3 h |
| **M** | 4–8 h | 6 h |
| **L** | 8–16 h | 12 h |

Se usa el **punto medio de cada banda**. Los RNF transversales suman como tareas propias, no se diluyen en los RF.

**Margen del 50 %, no del 30 %.** El equipo es primerizo con **las tres tecnologías centrales al mismo tiempo** (Gaussian Splatting, SuperSplat/SOG y PlayCanvas). Además, buena parte del proyecto es producción de contenido físico, cuatro salidas de campo que dependen del clima, donde el reintento cuesta días, no horas. El 30 % habitual asume familiaridad con el stack; aquí no la hay.

Además de RF y RNF, el plan estima explícitamente el **trabajo de producción** (campo, procesamiento, modelado 3D, audio, diseño) y la **gestión**. Sin ellos la estimación estaría mintiendo: en este proyecto la mayor parte del esfuerzo **no es escribir código**.

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
| RF-017 | Encadenar las escenas de forma continua | L | 12 | S4 |
| RF-018 | Volver a la posición al cerrar la ficha | S | 3 | S5 |
| RF-019 | Adaptar la interfaz a escritorio y celular | L | 12 | S7 |
| RF-020 | Consumir el track GPS del sendero | M | 6 | S6 |
| RF-021 | Añadir un POI por archivo de configuración | M | 6 | S5 |
| RF-022 | Ajustar calidad y presupuesto según el dispositivo | M | 6 | S4 |
| RF-023 | Publicar una escena por archivo de configuración | S | 3 | S2 |
| RF-024 | Mostrar la transcripción de la narración | S | 3 | S5 |
| RF-025 | Mostrar el progreso de carga de la escena | S | 3 | S3 |
| RF-026 | Onboarding la primera vez | M | 6 | S7 |
| **RF-027** | **Nivel de detalle por proximidad al recorrido** | **L** | **12** | **S4** |
| **RF-028** | **Ambientación sonora binaural con audio espacial 3D** | **L** | **12** | **S5** |
| **RF-029** | **Animación idle en el modelo 3D de fauna** | **M** | **6** | **S5** |
| **RF-030** | **Ficha de punto de interés patrimonial o histórico** | **M** | **6** | **S5** |
| **RF-031** | **Consejos de avistamiento en la ficha de fauna** | **S** | **3** | **S5** |
| **RF-032** | **Identidad visual aplicada: paleta y tipografía** | **M** | **6** | **S3** |
| | **Subtotal RF (32)** | | **201 h** | |

**Reparto:** 11 requerimientos S (33 h) · 14 M (84 h) · 7 L (84 h).

Los seis RF nuevos salen de la lluvia de ideas del equipo y están justificados en [`../docs/decisiones/ADR-002-lod-por-proximidad.md`](../docs/decisiones/ADR-002-lod-por-proximidad.md) y [`../docs/decisiones/ADR-003-audio-binaural-espacial.md`](../docs/decisiones/ADR-003-audio-binaural-espacial.md).

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
| **RNF-016** | **Presupuesto de fuentes de audio espacial** | **S** | **3** | **S4** |
| | **Subtotal RNF (16)** | | **81 h** | |

---

## 4. Estimación de producción de contenido

Este bloque es el **47,8 % del esfuerzo base** y casi nada de él aparece en un RF. Omitirlo sería el error clásico de este tipo de proyectos.

### 4.1 Campo

Cuatro visitas de 5 h. El cálculo es en **horas-persona**: una visita de 5 h a la que van seis personas cuesta 30 h de capacidad del equipo. Detalle en [`../docs/07-plan-de-visitas-de-campo.md`](../docs/07-plan-de-visitas-de-campo.md).

| Visita | Cuándo | Personas | h-persona |
|---|---|---|---|
| **V1 · Reconocimiento, sin grabar** | Semana 2 | **6 (todo el equipo)** | **30** |
| **V2 · Captura principal** | Semana 3 | 4 | 20 |
| **V3 · Captura complementaria y contingencia** | Semana 4 | 4 | 20 |
| **V4 · Verificación en campo** | Semana 6 | 3 | 15 |
| | | **Subtotal campo** | **85 h** |

### 4.2 Resto de producción

| Tarea | Horas | Sprint | Responsable |
|---|---|---|---|
| Visita de reconocimiento a las tres opciones y ADR-001 | 16 | S1 | Juan Urrego |
| Protocolo de captura, ensayo y prueba 1x vs 2x | 10 | S1 | Juan Urrego |
| Extracción de cuadros, SfM y entrenamiento 3DGS ×3 | 24 | S2 | Juan Urrego |
| Limpieza en SuperSplat ×3 escenas | 18 | S2 | Felipe Acevedo |
| Compresión a SOG y validación de peso y calidad | 8 | S2 | Juan Urrego |
| Modelado de aves (colibrí, mirla, copetón, pava andina) | 32 | S2b | Felipe Acevedo |
| **Rigging y animación idle de aleteo ×4 aves** | **12** | **S2b** | **Felipe Acevedo** |
| Modelado y escaneo de plantas, helechos y musgos | 20 | S2b | Felipe Acevedo |
| Escaneos de detalle (insectos, minerales, piezas) | 12 | S2b | Alberto Alemán |
| Modelado del puente de madera y la señalización | 10 | S2b | Felipe Acevedo |
| **Modelado o escaneo de elementos patrimoniales** | **8** | **S2b** | **Felipe Acevedo** |
| Optimización de polígonos y export a glTF | 12 | S2b | Felipe Acevedo |
| Narraciones, cantos y transcripciones | 10 | S2b | Alberto Alemán |
| **Edición del lecho ambiente y de las fuentes espaciales** | **10** | **S2b** | **David Beltrán** |
| **Investigación y verificación de fauna, flora e historia** | **10** | **S2b** | **Felipe / Alberto** |
| Wireframes y prototipo de ficha, HUD y onboarding | 16 | S3 | Eybar Viasus |
| **Identidad visual: paleta, tipografía y tokens** | **8** | **S3** | **Eybar Viasus** |
| Sistema de diseño consolidado | 14 | S7 | Eybar Viasus |
| | **Subtotal resto** | **250 h** | |

| | **Subtotal producción (85 + 250)** | **335 h** |
|---|---|---|

---

## 5. Estimación de gestión, integración y entrega

| Tarea | Horas | Cuándo |
|---|---|---|
| Ceremonias: planeación, sincronizaciones, demo y retro (2 h/semana × 14) | 28 | S1–S7 |
| Repositorio, contratos de datos y documentación inicial | 12 | S1 |
| **Administración de Jira y mantenimiento del backlog** | **8** | S1–Cierre |
| **Preparación de presentaciones y entregas del curso** | **8** | S1–Cierre |
| Integración final, pruebas cruzadas en dispositivos y despliegue | 24 | Cierre |
| Actualización final de documentación y cierre de validaciones | 4 | Cierre |
| | **Subtotal gestión** | **84 h** |

---

## 6. Total estimado

| Bloque | Horas base | % |
|---|---|---|
| Requerimientos funcionales (32) | 201 | 28,7 % |
| Requerimientos no funcionales (16) | 81 | 11,6 % |
| Producción de contenido | 335 | 47,8 % |
| Gestión, integración y entrega | 84 | 12,0 % |
| **Base** | **701 h** | 100 % |
| **Margen (50 %)** | **351 h** | |
| **TOTAL** | **1.052 h** | |

### 6.1 Contraste con la capacidad del equipo

| | |
|---|---|
| Personas | 6 |
| Semanas | 15 |
| **Dedicación exigida por el curso** | **12 h/persona/semana** |
| **Capacidad total** | **1.080 h** |
| **Demanda estimada** | **1.052 h** |
| **Holgura** | **28 h (2,6 %)** |

**Lectura honesta de esta cifra.** La utilización queda en el **97,4 %**, que es alto y hay que decirlo sin adornos. Pero el colchón real no son esas 28 horas: son las **351 horas de margen** ya incorporadas al total. Si todo saliera perfecto, que no va a pasar, el proyecto se cerraría en 701 h y sobrarían casi cinco semanas de capacidad del equipo.

La cifra que hay que vigilar en cada retrospectiva no es la holgura: es **cuánto margen queda consumido**. Es el indicador temprano de si hay que recortar alcance, y hay que mirarlo antes de la semana 10, no después.

**Criterio de éxito E13:** al final de S6 debe quedar **más del 15 %** de las 351 h de margen sin consumir.

**Y una consecuencia directa:** por esto la **Etapa 4** (metros 200–260) **no está comprometida**. Con el 97,4 % de la capacidad ya asignada, ampliar el tramo hoy sería comprometer horas que no existen. Se decide al cerrar S2, con datos reales.

---

## 7. Esfuerzo por persona

Con 12 h semanales, el techo individual es de **180 h en las 15 semanas**. Ninguna asignación puede pasar de ahí, antes ese límite no existía en el plan y por eso aparecían personas con 218 h, que era imposible.

| Persona | Horas estimadas | h/semana | % de su capacidad | Carga |
|---|---|---|---|---|
| **Juan Urrego** | 180 | 12,0 | **100 %** |  Al límite |
| **Felipe Acevedo** | 180 | 12,0 | **100 %** |  Al límite |
| **David Beltrán** | 180 | 12,0 | **100 %** |  Al límite |
| **Alejandra Chambueta** | 176 | 11,7 | 98 % |  Alta |
| **Alberto Alemán** | 170 | 11,3 | 94 % |  Alta |
| **Eybar Viasus** | 166 | 11,1 | 92 % |  Alta |
| **Total** | **1.052** | **11,7 promedio** | **97,4 %** | |

### 7.1 Qué dice de verdad esta tabla

El reparto quedó **plano, y eso no es una buena noticia**: significa que no hay nadie con holgura a quien pasarle trabajo cuando alguien se atasque. Tres personas están exactamente en su techo.

Es la consecuencia aritmética de sumar al plan original las cuatro visitas de campo (85 h-persona), el audio espacial, la animación idle, los POIs patrimoniales y la identidad visual. **Todo eso es trabajo real que antes no estaba contado**, y contarlo es mejor que descubrirlo en octubre.

**Lo que se hace con esto, en orden:**

1. **Se vigila el margen en cada retro**, no el avance. El margen es el que avisa.
2. **Si en S3 el margen consumido supera el 40 %, se recorta alcance** según §11, sin discutirlo entonces.
3. **La Etapa 4 no se compromete.** Ya está dicho arriba.
4. **Las ausencias se descuentan antes de comprometer historias**, no después (principio de `01-principios-de-trabajo.md` §8).

### 7.2 Correcciones ya aplicadas respecto de la versión 1,0

- La **limpieza en SuperSplat** (18 h) pasa de Juan a **Felipe**. Descarga el camino crítico.
- Los **escaneos de detalle** (12 h) pasan de Felipe a **Alberto**, que estaba muy por debajo del promedio.
- **Alberto sube de 62 h a 170 h** al asumir escaneos, narraciones, patrimonio y accesibilidad adelantada a S5–S6 en lugar de esperar a S7.
- El **audio** deja de ser una tarea suelta y pasa a ser un bloque con dueño: **David**.

### 7.3 Sobre el pico de S2b

**S2b concentra 114 h de producción 3D, y ~94 son de Felipe.** En dos semanas serían 47 h semanales: **inviable**.

Se resuelve igual que en la versión anterior, y sigue siendo válido: **S2b está fuera del camino crítico**. Su entrega no se necesita hasta el inicio de **S5 (6 de octubre, semana 9)**. Formalmente ocupa las semanas 3–4 según la estructura de sprints del curso, pero el trabajo de modelado **se reparte realmente entre las semanas 3 y 8**, con Felipe a ~12 h/semana. Eso es exactamente lo que compra correr E3 en paralelo con E1: no comprime el trabajo del artista, **le da seis semanas en lugar de dos**.

**Regla de control:** al cerrar S2b (7 de septiembre) deben estar terminadas **las cuatro aves con su animación idle y el helecho arbóreo**, porque son los POIs confirmados. El resto del catálogo puede seguir hasta la semana 8.

### 7.4 Nadie se queda sin trabajo en ninguna semana

Se revisó el backlog persona por persona y sprint por sprint, y aparecieron **tres huecos reales**: Alejandra no tenía nada asignado en S6, y Felipe no tenía nada ni en S6 ni en S7, **cuatro semanas seguidas**, del 20 de octubre al 16 de noviembre.

Se corrigió añadiendo dos historias que **no son relleno**:

| Historia | Sprint | Quién | Por qué es trabajo real |
|---|---|---|---|
| **HU-51** · Segunda pasada de optimización de los assets 3D | S6 | Felipe + Alejandra | El presupuesto de triángulos se fijó en S2b **con una estimación**. En S4 se miden los fps reales y en S5 se integran los POIs: hasta S6 no hay números de verdad con los que revisarlo |
| **HU-52** · Cierre visual del catálogo 3D con el sistema de diseño | S7 | Felipe + Eybar | Los modelos se hicieron **antes de que existiera la paleta definitiva**. Un ave verde sobre un fondo verde no se ve, y eso solo se descubre cuando ambos coinciden en la misma pantalla |

**Esto no infla el total: redistribuye el pico de Felipe.** Tenía 103 puntos concentrados en S2b, dos semanas, y ahora parte del cierre de assets se hace cuando ya existen los datos que lo justifican. La comprobación se puede repetir en cualquier momento sobre `backlog-jira.csv`: no debe quedar ninguna casilla vacía en la matriz persona × sprint.

> S2 y S2b son **las mismas semanas de calendario**, así que se cuentan juntas al hacer esta comprobación. Que alguien no tenga nada en S2b no significa nada si tiene trabajo en S2.

---

## 8. Cronograma semana a semana

Ninguna semana supera las **72 h** de capacidad del equipo (6 × 12).

| Sem | Fechas | Sprint | Foco | h |
|---|---|---|---|---|
| **1** | 11–17 ago | S1 | ADR-001, repositorio, contratos de datos, protocolo de captura, paleta inicial | 66 |
| **2** | 18–24 ago | S1 | **V1 · Visita de reconocimiento con todo el equipo (sin grabar).** Tramo exacto, POIs, etapas, mapa sonoro, decisiones creativas | 72 |
| **3** | 25–31 ago | S2 + S2b | **V2 · Captura principal.** Extracción de cuadros, SfM · **Paralelo:** modelado de aves | 72 |
| **4** | 1–7 sep | S2 + S2b | **V3 · Captura complementaria y audio.** Entrenamiento, SuperSplat, SOG, `scenes.json`. **RNF-003 fijado con dato real** · **Paralelo:** aves con animación idle y helecho terminados | 72 |
| **5** | 8–14 sep | S3 | Carga de `.sog` en PlayCanvas, WebGPU con repliegue, dispositivo de referencia. **Prueba de HRTF en Safari iOS (A3)**. Identidad visual aplicada | 70 |
| **6** | 15–21 sep | S3 | **V4 · Verificación en campo.** Avance y retroceso, mirada libre 360°, restricción al trazado, estados de carga y error | 72 |
| **7** | 22–28 sep | S4 | Encadenado de las tres escenas y precarga | 68 |
| **8** | 29 sep – 5 oct | S4 | Perfiles de calidad, **LOD por proximidad**, optimización hasta 30 fps. **Decisión sobre Streamed SOG** | 70 |
| **9** | 6–12 oct | S5 | Marcadores anclados y panel de ficha | 72 |
| **10** | 13–19 oct | S5 | Visor 3D con **animación idle**, audio de ficha, **ambientación espacial**, **POIs patrimoniales**, POIs declarativos | 72 |
| **11** | 20–26 oct | S6 | Consumo del track GPS. **Alineación y escalado definitivos** | 70 |
| **12** | 27 oct – 2 nov | S6 | HUD: altitud, distancia, desnivel, pendiente, tiempo estimado | 70 |
| **13** | 3–9 nov | S7 | Onboarding y responsive móvil | 68 |
| **14** | 10–16 nov | S7 | Accesibilidad AA, sistema de diseño consolidado, revisión de textos | 66 |
| **15** | 17–28 nov | Cierre | Integración, pruebas cruzadas, despliegue y **entrega** | 72 |
| | | | **Total** | **1.052** |

> **Sobre la semana de cierre.** La entrega es el **28 de noviembre**, no el 24, así que el bloque de cierre son **12 días naturales** en lugar de 8. Eso da algo de aire justo en el tramo más tenso del calendario. **La estimación no se rebaja por ello**: las 72 h de esa fila siguen siendo las que se van a necesitar, y los cuatro días extra se tratan como colchón, no como capacidad ya comprometida.

> Las semanas 2, 3 y 4 van al tope porque concentran las tres primeras salidas de campo, y la 3 y la 4 además corren dos sprints a la vez. Es el tramo más frágil del calendario.

---

## 8 bis. Entregas semanales

El curso exige **entregar todas las semanas**, y el enunciado exige a la vez **8 sprints de dos semanas**. No son incompatibles, pero hay que decir cómo se resuelve:

> **El sprint sigue siendo de dos semanas, es la unidad de planificación y de compromiso. La semana es la unidad de entrega.** Cada semana cierra con algo enseñable, y la segunda semana de cada sprint cierra además el sprint con su demo y su retrospectiva.

Para que esto no sea una declaración de intenciones, **cada historia lleva su etiqueta de semana** (`W01` … `W15`) en Jira y en GitHub, además de la de sprint. Filtrando por `W07` sale exactamente lo que hay que entregar esa semana.

| Semana | Fechas | Sprint | Qué se entrega |
|---|---|---|---|
| **W01** | 11–17 ago | S1 | **ADR-001 cerrado**, repositorio con ramas y contratos de datos, protocolo de captura escrito y las cuatro visitas reservadas |
| **W02** | 18–24 ago | S1 | **V1 ejecutada**: tramo exacto y etapas marcados con GPS, POIs decididos con coordenada y foto, mapa sonoro, desnivel y pendiente medidos |
| **W03** | 25–31 ago | S2 · S2b | **V2 ejecutada**: material bruto respaldado en dos ubicaciones, cuadros extraídos y poses resueltas · **Paralelo:** aves y plantas modeladas |
| **W04** | 1–7 sep | S2 · S2b | **V3 ejecutada** · Tres escenas entrenadas, limpias y comprimidas a `.sog`, declaradas en `scenes.json`. **RNF-003 fijado con dato real** · Catálogo 3D base con animación idle |
| **W05** | 8–14 sep | S3 | Primera escena cargando en PlayCanvas con repliegue a WebGL, estados de carga y error, **paleta y tokens publicados** |
| **W06** | 15–21 sep | S3 | **V4 ejecutada** · Avance y retroceso, mirada libre 360° y restricción al trazado: una escena recorrible |
| **W07** | 22–28 sep | S4 | Las tres escenas encadenadas sin corte, con el ritmo del recorrido definido |
| **W08** | 29 sep – 5 oct | S4 | Perfiles de calidad, **LOD por proximidad** y **medición documentada de 30 fps** en el dispositivo de referencia |
| **W09** | 6–12 oct | S5 | Marcadores anclados a coordenadas reales y panel de ficha abriendo y cerrando sin perder la posición |
| **W10** | 13–19 oct | S5 | Visor 3D con animación idle, audio de ficha, **ambientación sonora espacial** y el primer POI patrimonial. 5–6 POIs completos |
| **W11** | 20–26 oct | S6 | Track GPS alineado y escalado contra la geometría · Segunda pasada de optimización de assets |
| **W12** | 27 oct – 2 nov | S6 | **HUD completo**: altitud, distancia, desnivel, pendiente y tiempo estimado, con datos reales |
| **W13** | 3–9 nov | S7 | Onboarding y responsive verificado en Chrome Android y Safari iOS |
| **W14** | 10–16 nov | S7 | Accesibilidad AA, sistema de diseño consolidado y cierre visual del catálogo 3D |
| **W15** | 17–28 nov | Cierre | **Entrega final**: integración, pruebas cruzadas, despliegue y documentación cerrada |

**Regla de la entrega semanal:** lo que se enseña el viernes tiene que estar en `develop`, no en la rama de nadie. Si una semana no hay nada enseñable, eso **es** la información importante y se dice en la sincronización del viernes, no en la demo del sprint (principio de `01-principios-de-trabajo.md` §8: avisar a tiempo no tiene consecuencia; que se descubra tarde, sí).

**Cómo verlo en Jira:** el backlog filtra por la etiqueta de semana. Las 15 semanas están cubiertas y **ninguna persona tiene una semana vacía**, comprobado en §7.4.

---

## 9. Milestones

| Milestone | Fecha límite | Qué debe estar hecho | Criterio de aceptación |
|---|---|---|---|
| **M1 · Decisión y reconocimiento** | 24/08/2026 | ADR-001 cerrado y **V1 ejecutada** | Tramo exacto y etapas marcados con GPS, POIs decididos con coordenada y foto, mapa sonoro levantado, desnivel y pendiente de los 200 m medidos |
| **M2 · Tramo capturado y reconstruido** | 07/09/2026 | **V2 y V3 ejecutadas**, 3 escenas en `.sog` limpias y publicadas | Cargan en un visor; RNF-003 fijado con medición real; material respaldado en dos ubicaciones |
| **M2b · Catálogo 3D base** | 07/09/2026 | Aves con **animación idle** y helecho arbóreo modelados y optimizados | `.glb` dentro de presupuesto, animación en bucle sin salto, cargando sin errores |
| **M3 · Tramo navegable** | 21/09/2026 | Escena cargando, cámara y navegación básica. **V4 ejecutada** | Recorrido de una escena en Chrome y en celular real; el lugar se reconoce al compararlo en campo |
| **M4 · Recorrido completo** | 05/10/2026 | 3 escenas encadenadas a ≥ 30 fps con **LOD por proximidad activo** | Extremo a extremo sin cortes, medición documentada, sin salto visible de nivel de detalle |
| **M5 · Puntos de interés** | 19/10/2026 | 5–6 POIs completos, incluido **al menos uno patrimonial**, y **ambientación sonora espacial funcionando** | Ficha con modelo 3D animado, audio y transcripción; POI añadible por JSON; la quebrada se oye donde está |
| **M6 · Capa de datos** | 02/11/2026 | HUD con datos reales del track | Altitud, distancia, desnivel, pendiente y tiempo estimado |
| **M7 · Experiencia final** | 16/11/2026 | UI final con la paleta aplicada, responsive, onboarding, accesibilidad | 4 de 5 usuarios inician y abren una ficha sin instrucciones; contraste AA verificado |
| **M8 · Entrega** | 28/11/2026 | Desplegado y documentado | Recorrido completo en Chrome, Safari y Firefox, escritorio y móvil |

---

## 10. Camino crítico y holguras

```
V1 ── V2 ── S2 ── S3 ── S4 ── S6 ── S7 ── Cierre       ← camino crítico
        │
        ├── V3 ········· S5 (audio)                          ← holgura
        ├── V4 ········· S4 (verificación)                   ← holgura
        └── S2b ······································· S5   ← holgura de 4 semanas
```

- **En el camino crítico:** V1, V2, S2, S3, S4, S6, S7 y el cierre.
- **Fuera del camino crítico:** V3, V4 y S2b. S2b tiene **4 semanas de holgura**, que es lo que hace realista el pico de carga de Felipe.
- **S5** depende de S4 (motor), de S2b (modelos) y de V3 (audio). Es donde convergen tres ramas: si alguna llega tarde, S5 se atasca.

**Los tres puntos de mayor riesgo de calendario:**

1. **V1 (semana 2).** Si no se hace, todo lo demás se decide a ciegas. Es la visita más barata y la más determinante.
2. **V2 (semana 3).** Si falla por clima y V3 tampoco alcanza, todo el camino crítico se desplaza. Es el único riesgo del proyecto que no se resuelve trabajando más horas.
3. **Fin de S4 (5 oct).** Si no se alcanzan los 30 fps, hay que volver a S2 a regenerar escenas con menos gaussianas, lo que reabre trabajo dado por cerrado.

---

## 11. Qué se recorta primero si hay que recortar

Orden de sacrificio acordado por adelantado, para no discutirlo bajo presión en la semana 13:

1. **La Etapa 4** (metros 200–260). No está comprometida: es lo primero que no se hace.
2. **Número de POIs:** de 6 a 5. El recorte más barato y el menos visible.
3. **Fuentes de audio espacial:** de 4 simultáneas a 2, y menos fuentes puntuales declaradas. La ambientación se mantiene; se simplifica.
4. **Longitud del tramo:** de 200 m a 140 m. Dos escenas en lugar de tres. Previsto como respuesta a los riesgos R1 y R2.
5. **Catálogo de modelos:** las cuatro aves y el helecho arbóreo son intocables (POIs confirmados); los escaneos de detalle de insectos y minerales sí se aplazan.
6. **Pulido de UI:** el sistema de diseño se consolida menos, pero **la accesibilidad (RNF-006) no se recorta**.

**Lo que no se recorta bajo ninguna circunstancia:** el rendimiento en móvil (RNF-001), la restricción al trazado autorizado (RF-004), la veracidad de los datos biológicos, históricos y de recorrido, y la accesibilidad.

---

## 12. Supuestos de este plan

1. Dedicación de **12 h/persona/semana**, exigida por el curso. Si baja, el plan no cierra: hay que recortar según §11.
2. **Las cuatro visitas se reservan por la app del Acueducto** con antelación, para todas las personas que asisten.
3. La estación con GPU del equipo está disponible durante las semanas 3–4. `[especificaciones por documentar]`
4. Las cifras de desnivel y pendiente del tramo de 200 m están **`[por medir en campo]`** y se cierran en V1. La altitud de inicio de 2.712 msnm procede del registro GPS público y se confirma en V1.
5. RNF-003 (peso por escena) **está sin número** y se fija en S2 con una medición real.
6. RNF-016 (fuentes de audio simultáneas) **está sin número** y se fija en S4.
7. Las horas de producción 3D asumen un solo artista. Si entra apoyo, S2b se descomprime.
8. **La planificación posterior a V1 se revisa.** Este documento es una guía inicial.

---

## 13. Referencias

- Épicas, sprints, historias y criterios de aceptación: [`../docs/04-actividades-y-roles.md`](../docs/04-actividades-y-roles.md)
- Plan de visitas de campo: [`../docs/07-plan-de-visitas-de-campo.md`](../docs/07-plan-de-visitas-de-campo.md)
- Ámbitos de los tres programadores: [`../docs/09-ambitos-de-los-tres-programadores.md`](../docs/09-ambitos-de-los-tres-programadores.md)
- Riesgos y su mitigación: [`../docs/02-vision-de-proyecto.md`](../docs/02-vision-de-proyecto.md)
- Riesgos técnicos y validaciones pendientes: [`../docs/03-avances-tecnologia.md`](../docs/03-avances-tecnologia.md)
- Backlog importable a Jira: [`backlog-jira.csv`](backlog-jira.csv)
