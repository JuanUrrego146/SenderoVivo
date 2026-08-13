> Versión Markdown generada desde [`F_Analisis_de_Requerimientos_V1,0_SenderoVivo.docx`](F_Analisis_de_Requerimientos_V1,0_SenderoVivo.docx) para lectura directa en GitHub. El archivo Word es el documento fuente; si se modifica, esta versión debe regenerarse con `pandoc -t gfm`.

**DOCUMENTO DE ANÁLISIS Y ESPECIFICACIÓN DE REQUERIMIENTOS:**

**SENDERO VIVO**

*Recorrido virtual 3D de 200 m del sendero de la Quebrada La Vieja, sector Claro de Luna\
Cerros Orientales de Bogotá*

**Versión 1,0**

11/08/2026

Formato 08-IF-019

# Tabla de contenido

1\. Equipo del Proyecto

2\. Control de Versiones

3\. Definiciones, Siglas y Abreviaturas

3.1 Justificación de la necesidad

3.2 Visión del proyecto

4\. Documentación relacionada

5\. Diagrama flujo de actividades del proceso

6\. Casos de Uso

6.1.1 CUS-001: Iniciar el recorrido virtual

6.1.2 CUS-002: Avanzar por el sendero de forma guiada

6.1.3 CUS-003: Mirar libremente en 360°

6.1.4 CUS-004: Consultar un punto de interés

6.1.5 CUS-005: Inspeccionar el modelo 3D de la ficha

6.1.6 CUS-006: Escuchar la narración y el canto del ave

6.1.7 CUS-007: Consultar los datos del recorrido en pantalla

6.1.8 CUS-008: Transitar entre escenas del tramo

6.1.9 CUS-009: Cargar y descomprimir una escena SOG

6.1.10 CUS-010: Adaptar la experiencia al dispositivo

6.1.11 CUS-011: Procesar y publicar una escena capturada

6.1.12 CUS-012: Registrar y publicar un punto de interés

6.1.13 CUS-013: Escuchar la ambientación sonora espacial del recorrido

6.1.14 CUS-014: Consultar un punto de interés patrimonial o histórico

6.1.15 CUS-015: Ajustar el nivel de detalle según la proximidad al recorrido

7\. Requerimientos

7.1 Requerimientos funcionales

7.1.1 Lista de requerimientos funcionales

7.1.2 Especificación de requerimientos funcionales

7.2 Requerimientos No Funcionales

8\. Matriz de trazabilidad de Requerimientos vs Casos de uso

9\. Observaciones adicionales

10\. Control de revisión y aprobaciones del documento y sus anexos

# 1. Equipo del Proyecto

| **Rol** | **Persona asignada** |
|----|----|
| Gestor de Proyectos | Juan Urrego |
| Analista de requerimientos | Juan Urrego |
| Arquitecto de software / Integrador | Juan Urrego |
| Programadores | Juan Urrego, Alejandra Chambueta, David Beltrán |
| Artista 3D | Felipe Acevedo |
| Diseñador UI/UX | Eybar Viasus |
| Diseñador UI/UX | Alberto Alemán |
| Tester / QA | Por definir |

# 2. Control de Versiones

| **Fecha** | **Versión** | **Descripción** | **Responsable de la versión** |
|----|----|----|----|
| 11/08/2026 | 1,0 | Creación de documento de requerimientos | Juan Urrego |
| 11/08/2026 | 1,0 | Revisado por Juan Urrego | Juan Urrego |

# 3. Definiciones, Siglas y Abreviaturas

- **3DGS (3D Gaussian Splatting):** Técnica de reconstrucción y renderizado de campos de radiancia que representa una escena mediante millones de gaussianas 3D optimizadas contra fotografías reales. Presentada en SIGGRAPH 2023 por Kerbl, Kopanas, Leimkühler y Drettakis.

- **Gaussiana:** Unidad mínima de una escena reconstruida por 3DGS: un elipsoide con posición, escala, rotación, opacidad y color dependiente de la dirección de vista.

- **Flotante:** Gaussiana espuria con opacidad no nula situada en espacio vacío. Artefacto típico de las capturas en exteriores con vegetación; se elimina en la fase de limpieza.

- **SOG (Spatially Ordered Gaussians):** Formato contenedor comprimido para datos de Gaussian Splats. Almacena los atributos como imágenes WebP en orden Morton, con un archivo meta.json descriptor. Reduce el tamaño entre 15 y 20 veces frente a PLY.

- **PLY:** Formato de nube de puntos usado como salida intermedia del entrenamiento 3DGS. No es un formato de entrega: puede alcanzar el orden de 1 GB por escena.

- **SuperSplat:** Editor de Gaussian Splats de código abierto (licencia MIT) que se ejecuta íntegramente en el navegador. Se usa para eliminar flotantes, recortar la escena y ajustar el color.

- **SplatTransform:** Herramienta de línea de comandos de código abierto que convierte y comprime escenas de splats, incluida la conversión de PLY a SOG.

- **PlayCanvas:** Motor 3D para web de código abierto (licencia MIT) usado para cargar y renderizar las escenas y para construir la lógica del recorrido.

- **gsplat:** Tipo de asset y componente del motor PlayCanvas que carga y renderiza una escena de Gaussian Splats.

- **splatBudget:** Presupuesto máximo de gaussianas que el motor renderiza. Referencias: aproximadamente 1 millón en dispositivos móviles y 3 millones o más en escritorio.

- **Fill rate (tasa de relleno):** Capacidad de la GPU para procesar fragmentos por píxel. Es el principal cuello de botella del renderizado de splats por el sobredibujo con mezcla alfa.

- **LOD (Level of Detail):** Nivel de detalle. Mecanismo que reduce la complejidad de la escena en función de la distancia a la cámara.

- **SfM (Structure from Motion):** Técnica que deduce las posiciones y orientaciones de la cámara y una nube de puntos dispersa a partir de un conjunto de fotografías.

- **POI (Point of Interest):** Punto de interés: lugar del tramo con contenido asociado (un ave, una planta o un elemento del sendero), señalado con un marcador flotante.

- **HUD (Head-Up Display):** Capa de información superpuesta al recorrido que muestra altitud, distancia, desnivel, pendiente y tiempo estimado.

- **Track GPS:** Registro de las coordenadas y altitudes del recorrido, grabado en campo el mismo día de la captura. Es la fuente de todos los datos que se muestran al visitante.

- **Trazado autorizado:** Recorrido oficial del sendero dentro de la reserva protegida. El sistema restringe todo desplazamiento a este trazado.

- **msnm:** Metros sobre el nivel del mar.

- **Desnivel acumulado:** Suma de todos los ascensos a lo largo del recorrido, expresada en metros.

- **WebGPU / WebGL:** Interfaces de programación gráfica del navegador. WebGPU ofrece cómputo de propósito general y mejor rendimiento; WebGL es más compatible y actúa como repliegue.

- **glTF / GLB:** Formato estándar de entrega de modelos 3D para web. GLB es su variante binaria empaquetada.

- **Bosque altoandino:** Ecosistema de montaña de los Andes tropicales, característico de los Cerros Orientales de Bogotá, con vegetación densa de estructuras finas.

## 3.1 Justificación de la necesidad

Los senderos de los Cerros Orientales de Bogotá son gratuitos y se reservan mediante la aplicación del Acueducto. El acceso está resuelto; la información para recorrerlos con criterio, no. Quien va a la Quebrada La Vieja por primera vez no sabe cuánto dura el recorrido, qué tan exigente es, hasta dónde alcanzará a llegar ni por dónde va exactamente el camino autorizado. El sendero completo son 7,3 kilómetros, más de 406 metros de desnivel y alrededor de 3 horas de caminata.

De esa falta de información se derivan cuatro consecuencias observables: las personas se devuelven a mitad de camino porque subieron sin saber a qué se enfrentaban; se salen del trazado autorizado dentro de una reserva natural protegida, pisando bosque altoandino que tarda décadas en recuperarse; caminan sin entender el ecosistema que atraviesan, de modo que el enorme contenido biológico del sendero pasa desapercibido; y quien no puede subir —por condición física, edad, discapacidad, tiempo o distancia— nunca llega a conocer el lugar, pese a que está a 700 metros de una estación de transporte masivo.

Sendero Vivo responde a este problema reconstruyendo los primeros 200 metros del sendero, en el sector Claro de Luna, mediante captura fotogramétrica con Gaussian Splatting, y haciéndolo recorrible desde el navegador, en computador y en celular, sin instalación. El tramo elegido es el de entrada, justo donde el visitante decide si continúa o se devuelve, porque es el punto en el que la información cambia efectivamente la decisión.

La propuesta se articula en tres capacidades: reconocer el camino real y saber a qué se va; entender el ecosistema mediante fichas tridimensionales de aves y plantas ancladas a lugares reales del tramo; y medir la exigencia del recorrido con datos reales de altitud, distancia, desnivel y pendiente tomados con GPS el mismo día de la captura. El sistema está dirigido a cuatro perfiles: el visitante que planea ir, la persona que no puede subir, el interesado en la fauna y la flora del bosque altoandino, y el docente o guía que necesita material para mostrar el ecosistema.

## 3.2 Visión del proyecto

Sendero Vivo permite recorrer 200 metros reales del sendero de la Quebrada La Vieja, sector Claro de Luna, desde el navegador, reconstruidos tal como son —capturados, no dibujados— para saber a qué se va, entender lo que se ve y medir lo que cuesta.

La propuesta se articula en cuatro capacidades. Reconocer: ver el camino real, los escalones de piedra, las barandas de madera, el cauce y la pendiente; no un render ni un mapa, sino el lugar capturado. Entender: marcadores flotantes anclados a lugares reales del tramo que, al activarse, abren la ficha del ave, la planta o el elemento patrimonial, con modelo tridimensional girable y animado, nombre común y científico, narración corta, canto, altura de distribución, identificación en campo y consejos de avistamiento. Medir: altitud sobre el nivel del mar, distancia recorrida y restante, desnivel acumulado, pendiente actual y tiempo estimado hasta el siguiente punto, derivados del track GPS grabado en campo. Y oír: ambientación sonora binaural con audio espacial tridimensional, de modo que la quebrada suene donde la quebrada está y quede atrás conforme el visitante avanza.

La decisión que define el proyecto es capturar en lugar de modelar. Un bosque modelado a mano es la interpretación de un artista sobre cómo se ve un bosque; una escena reconstruida mediante Gaussian Splatting es el bosque, con su desorden, su luz y una geometría que no se puede dibujar. Para un sistema cuyo propósito es que el visitante reconozca el lugar cuando llegue físicamente, esa diferencia constituye la totalidad del producto.

El alcance está deliberadamente acotado, y la delimitación forma parte de la visión: no es una concesión. El compromiso firme son 200 metros desde el inicio del sendero, divididos en tres etapas —de 0 a 70, de 70 a 140 y de 140 a 200 metros—, con cinco o seis puntos de interés completos. Ampliar el tramo más allá de esa cifra no está comprometido: se evaluará al cerrar el Sprint 2 con mediciones reales de peso y de rendimiento. Quedan expresamente fuera de alcance el sendero completo de 7,3 kilómetros, el desplazamiento libre de tipo videojuego, la aplicación nativa, la realidad virtual, el multijugador, la captura con dron y cualquier sendero adicional.

El sistema se dirige a cuatro perfiles de usuario: el visitante que planea ir y quiere reconocer el sendero antes de reservar; la persona que no puede subir por condición física, edad, discapacidad o distancia; el interesado en la fauna y la flora del bosque altoandino; y el docente o guía que necesita material para mostrar el ecosistema sin llevar un grupo a la montaña. El usuario primario del producto mínimo viable es el primero, porque valida las cuatro promesas de manera simultánea.

Los criterios de éxito son verificables y tienen fecha. El tramo debe estar reconstruido y recorrerse de extremo a extremo sin cortes al final del Sprint 4; los puntos de interés deben estar completos, incluido al menos uno de tipo patrimonial, al final del Sprint 5; los datos del recorrido deben derivarse del track GPS capturado en campo al final del Sprint 6; y el sistema debe funcionar en un teléfono móvil sin instalación alguna al final del Sprint 7. A ello se suman los criterios de calidad técnica recogidos en los requerimientos no funcionales y el criterio de usabilidad de que cuatro de cada cinco personas sin experiencia previa inicien el recorrido y abran una ficha sin recibir instrucciones.

La visión detallada, con el análisis de interesados, el estado del arte y el registro completo de riesgos y mitigaciones, se mantiene en el documento docs/02-vision-de-proyecto.md, del cual esta sección es la síntesis normativa.

# 4. Documentación relacionada

| **Título de documento** | **Ubicación** |
|----|----|
| Principios de trabajo del equipo | docs/01-principios-de-trabajo.md |
| Visión de proyecto | docs/02-vision-de-proyecto.md |
| Avances a nivel de tecnología | docs/03-avances-tecnologia.md |
| Actividades y roles: épicas, sprints y asignación | docs/04-actividades-y-roles.md |
| Arquitectura y diagramas UML | docs/arquitectura.md |
| ADR-001: Elección del sendero a capturar | docs/decisiones/ADR-001-eleccion-de-sendero.md |
| Plan de trabajo, estimación y cronograma | plan/plan_de_trabajo.md |
| Backlog importable a Jira | plan/backlog-jira.csv |
| Contexto para vibe coding | context-for-vibe-coding.md |
| Catálogo de fauna y flora del tramo | docs/05-catalogo-fauna-y-flora.md |
| Identidad visual | docs/06-identidad-visual.md |
| Plan de visitas de campo | docs/07-plan-de-visitas-de-campo.md |
| Ambientación sonora | docs/08-ambientacion-sonora.md |
| Ámbitos de los tres programadores | docs/09-ambitos-de-los-tres-programadores.md |
| Guion de la presentación | docs/10-guion-de-la-presentacion.md |
| ADR-002 Nivel de detalle por proximidad | docs/decisiones/ADR-002-lod-por-proximidad.md |
| ADR-003 Audio binaural espacial | docs/decisiones/ADR-003-audio-binaural-espacial.md |
| ADR-004 Reparto de ámbitos entre programadores | docs/decisiones/ADR-004-reparto-de-ambitos.md |

# 5. Diagrama flujo de actividades del proceso

El siguiente diagrama describe el proceso completo del proyecto, desde la decisión del sendero a capturar hasta la publicación del tramo virtual y su recorrido por parte del visitante. Incluye los dos puntos de control que pueden devolver el proceso a una etapa anterior: la verificación de peso y calidad de la escena comprimida, y la verificación de rendimiento en el dispositivo de referencia.

| **Etapa** | **Actividad** | **Entrada** | **Salida** | **Punto de control** |
|----|----|----|----|----|
| 1\. Captura en campo | Grabar video 4K a 60 fps con los ajustes manuales bloqueados, el track GPS, el audio ambiente y de cantos, y una fotografía por cada punto de interés. | Tramo, etapas y puntos de interés decididos en la visita de reconocimiento. | Material bruto respaldado en dos ubicaciones distintas el mismo día. | — |
| 2\. Extracción y poses | Extraer los cuadros del video, descartar los que presentan movimiento borroso y resolver las poses de cámara mediante SfM. | Material bruto. | Nube de puntos dispersa y poses de cámara. | — |
| 3\. Entrenamiento 3DGS | Entrenar las tres escenas en la estación con unidad de procesamiento gráfico del equipo. | Cuadros y poses de cámara. | Escenas en formato PLY. | — |
| 4\. Limpieza y recorte | Eliminar las gaussianas espurias, recortar la escena al tramo de interés y ajustar el color entre escenas en SuperSplat. | Escenas en formato PLY. | Escenas limpias y recortadas. | Si la vegetación presenta ruido inaceptable se recorta el tramo. Nunca se modela terreno a mano. |
| 5\. Compresión a SOG | Convertir las escenas con SplatTransform y medir el peso resultante de cada una. | Escenas limpias. | Escenas en formato SOG. | Control 1. Si una escena excede el peso permitido se regresa a la etapa 3 y se reduce el número de gaussianas. |
| 6\. Publicación | Declarar cada escena en el archivo de configuración con su orden, sus rutas y sus puntos de entrada y salida, y asociar el track GPS a la secuencia. | Escenas en formato SOG. | Escenas publicadas y declaradas. | — |
| 7\. Carga y renderizado | El motor carga el recurso gsplat, aplica el perfil de calidad del dispositivo y configura el nivel de detalle por proximidad al recorrido. | Escenas publicadas. | Recorrido navegable en el navegador. | Control 2. Si no se alcanzan treinta cuadros por segundo en el dispositivo de referencia se regresa a la etapa 3. |
| 8\. Recorrido del visitante | El visitante avanza sobre el trazado autorizado, mira en trescientos sesenta grados, activa los puntos de interés y consulta los datos del recorrido. | Recorrido navegable. | Experiencia completa. | — |

*Tabla 1. Flujo de actividades del proceso, con sus dos puntos de control. El diagrama equivalente se mantiene en docs/arquitectura.md.*

# 6. Casos de Uso

Se identificaron quince casos de uso que cubren la interacción del visitante con el recorrido, el comportamiento autónomo del sistema y los procesos de publicación de contenido a cargo del equipo. Cada caso indica su actor, su flujo principal, sus flujos alternativos y los requerimientos asociados.

#### 6.1.1 CUS-001: Iniciar el recorrido virtual

**Actor:** Visitante

**Descripción:** El visitante abre la aplicación en su navegador y queda situado en el punto de partida del tramo, listo para recorrerlo, sin haber instalado nada.

**Flujo principal:**

> 1\. El visitante abre la dirección web de Sendero Vivo en su navegador.
>
> 2\. El sistema detecta las capacidades del dispositivo y selecciona el perfil de calidad correspondiente.
>
> 3\. El sistema muestra el progreso de carga de la primera escena.
>
> 4\. Si es la primera visita, el sistema muestra el onboarding con las tres acciones básicas: avanzar, mirar y abrir una ficha.
>
> 5\. El sistema sitúa al visitante en el punto de entrada del tramo.
>
> 6\. El sistema muestra el HUD con los datos iniciales del recorrido.

**Flujos alternativos:**

- 2a. El dispositivo no soporta WebGPU → el sistema repliega automáticamente a WebGL y continúa.

- 3a. La escena no carga → el sistema informa el error en español y ofrece reintentar; nunca muestra pantalla en negro.

- 4a. El visitante ya ha visitado antes → el sistema omite el onboarding y continúa en el paso 5.

- 4b. El visitante omite el onboarding → el sistema continúa en el paso 5.

**Requerimientos asociados:** RF-001, RF-002, RF-022, RF-025, RF-026, RNF-002, RNF-004, RNF-005, RNF-007, RNF-010, RNF-014

#### 6.1.2 CUS-002: Avanzar por el sendero de forma guiada

**Actor:** Visitante

**Descripción:** El visitante se desplaza hacia adelante y hacia atrás a lo largo del trazado autorizado del sendero, sin posibilidad de salirse de él.

**Flujo principal:**

> 1\. El visitante indica avanzar mediante gesto táctil o control de escritorio.
>
> 2\. El sistema calcula la nueva posición sobre el trazado.
>
> 3\. El sistema restringe la posición calculada al trazado autorizado.
>
> 4\. El sistema desplaza la cámara aplicando la velocidad y el suavizado definidos.
>
> 5\. El sistema actualiza la capa de datos y el tiempo estimado hasta el siguiente punto de interés.
>
> 6\. El sistema desacelera al aproximarse a un punto de interés.

**Flujos alternativos:**

- 1a. El visitante indica retroceder → el sistema aplica el mismo flujo en sentido inverso.

- 3a. La posición calculada cae fuera del trazado → el sistema la ajusta al trazado; nunca permite salir.

- 4a. El visitante alcanza el límite de la escena actual → se dispara CUS-008.

- 4b. El visitante alcanza el final del tramo → el sistema indica el fin del recorrido y ofrece recorrerlo de nuevo.

**Requerimientos asociados:** RF-003, RF-004, RF-016, RNF-001, RNF-005, RNF-015

#### 6.1.3 CUS-003: Mirar libremente en 360°

**Actor:** Visitante

**Descripción:** El visitante rota la cámara en cualquier punto del recorrido para observar el entorno, sin desplazarse de su posición.

**Flujo principal:**

> 1\. El visitante arrastra sobre la pantalla o acciona el control de rotación.
>
> 2\. El sistema calcula los nuevos ángulos de giro horizontal y vertical.
>
> 3\. El sistema aplica los límites verticales definidos.
>
> 4\. El sistema actualiza la orientación de la cámara sin modificar su posición.
>
> 5\. El sistema mantiene los marcadores visibles y anclados a sus coordenadas reales.

**Flujos alternativos:**

- 3a. El giro vertical excede el límite definido → el sistema lo satura en el valor máximo.

- 4a. El visitante rota mientras avanza → el sistema compone ambas acciones sin abandonar el trazado.

**Requerimientos asociados:** RF-004, RF-005, RNF-001

#### 6.1.4 CUS-004: Consultar un punto de interés

**Actor:** Visitante

**Descripción:** El visitante activa un marcador flotante anclado al tramo y consulta la ficha del ave, la planta o el elemento correspondiente.

**Flujo principal:**

> 1\. El sistema muestra los marcadores anclados a las coordenadas reales del tramo.
>
> 2\. El visitante activa un marcador.
>
> 3\. El sistema guarda la posición y la orientación actuales de la cámara.
>
> 4\. El sistema abre el panel de ficha del punto de interés.
>
> 5\. El sistema muestra el nombre común y el nombre científico.
>
> 6\. El sistema muestra la altura a la que vive la especie y cómo identificarla en campo.
>
> 7\. El visitante cierra la ficha.
>
> 8\. El sistema restaura la posición y la orientación guardadas.

**Flujos alternativos:**

- 2a. El marcador está demasiado lejos → el sistema no permite activarlo hasta que el visitante se aproxime.

- 4a. El contenido de la ficha no carga → el sistema informa y ofrece reintentar sin abandonar el recorrido.

- 6a. El punto de interés es un elemento del sendero y no una especie → el sistema omite los campos de distribución altitudinal.

**Requerimientos asociados:** RF-006, RF-007, RF-008, RF-010, RF-018, RNF-005, RNF-006, RNF-010

#### 6.1.5 CUS-005: Inspeccionar el modelo 3D de la ficha

**Actor:** Visitante

**Descripción:** El visitante gira y acerca el modelo tridimensional mostrado en la ficha del punto de interés para reconocer su forma y su color.

**Flujo principal:**

> 1\. El sistema carga el modelo 3D declarado para el punto de interés.
>
> 2\. El sistema encuadra el modelo en el visor de la ficha.
>
> 3\. El visitante gira el modelo.
>
> 4\. El visitante acerca o aleja el modelo.
>
> 5\. El sistema mantiene la escena del recorrido en segundo plano sin degradar el rendimiento.

**Flujos alternativos:**

- 1a. El modelo no carga → el sistema muestra la ficha sin visor 3D e informa de la ausencia.

- 3a. El visitante emplea gesto táctil → el sistema aplica el mismo comportamiento que con ratón.

- 5a. El dispositivo no sostiene ambas cargas → el sistema reduce la calidad de la escena de fondo mientras la ficha permanece abierta.

**Requerimientos asociados:** RF-009, RF-018, RNF-001, RNF-012

#### 6.1.6 CUS-006: Escuchar la narración y el canto del ave

**Actor:** Visitante

**Descripción:** El visitante activa la narración del punto de interés y, cuando se trata de fauna, el canto del ave, disponiendo siempre de la transcripción textual.

**Flujo principal:**

> 1\. El sistema muestra los controles de audio dentro de la ficha, sin reproducir nada.
>
> 2\. El visitante activa la narración.
>
> 3\. El sistema reproduce la narración corta del punto de interés.
>
> 4\. El sistema deja accesible la transcripción textual de la narración.
>
> 5\. Si el punto de interés es de fauna, el visitante activa el canto del ave.
>
> 6\. El sistema reproduce el canto.
>
> 7\. Al cerrar la ficha, el sistema detiene toda reproducción de audio.

**Flujos alternativos:**

- 1a. El sistema nunca inicia una reproducción de forma automática.

- 3a. El archivo de audio no carga → el sistema muestra la transcripción y avisa de la ausencia del audio.

- 5a. El punto de interés no es de fauna → el sistema no ofrece la opción de canto.

**Requerimientos asociados:** RF-011, RF-012, RF-024, RNF-006, RNF-008, RNF-010

#### 6.1.7 CUS-007: Consultar los datos del recorrido en pantalla

**Actor:** Visitante

**Descripción:** El visitante consulta en pantalla la altitud, la distancia recorrida y restante, el desnivel acumulado, la pendiente y el tiempo estimado hasta el siguiente punto.

**Flujo principal:**

> 1\. El sistema deriva la posición del visitante sobre el track GPS del sendero.
>
> 2\. El sistema calcula la altitud sobre el nivel del mar de la posición actual.
>
> 3\. El sistema calcula la distancia recorrida y la distancia restante.
>
> 4\. El sistema calcula el desnivel acumulado y la pendiente actual.
>
> 5\. El sistema calcula el tiempo estimado hasta el siguiente punto de interés considerando la pendiente.
>
> 6\. El sistema presenta los datos en el HUD y los actualiza conforme el visitante avanza.

**Flujos alternativos:**

- 5a. No quedan puntos de interés por delante → el sistema muestra el tiempo estimado hasta el final del tramo.

- 6a. La pantalla es de tamaño reducido → el sistema compacta el HUD conservando la totalidad de los datos.

**Requerimientos asociados:** RF-013, RF-014, RF-015, RF-016, RF-020, RNF-001, RNF-005, RNF-006

#### 6.1.8 CUS-008: Transitar entre escenas del tramo

**Actor:** Sistema

**Descripción:** El sistema encadena las tres escenas que componen el tramo de manera continua, sin que el visitante perciba el cambio.

**Flujo principal:**

> 1\. El sistema detecta que el visitante se aproxima al límite de la escena actual.
>
> 2\. El sistema precarga la escena siguiente declarada en el archivo de configuración de escenas.
>
> 3\. El visitante alcanza el punto de salida de la escena actual.
>
> 4\. El sistema activa la escena siguiente en su punto de entrada correspondiente.
>
> 5\. El sistema libera la escena anterior si el presupuesto de memoria lo requiere.
>
> 6\. El recorrido continúa sin corte perceptible para el visitante.

**Flujos alternativos:**

- 1a. El visitante retrocede → el sistema aplica el mismo procedimiento con la escena anterior.

- 2a. La precarga falla → el sistema reintenta; si no lo consigue, informa y ofrece reintentar antes de bloquear el paso.

- 4a. Se percibe un salto de color entre escenas → se corrige en el material capturado, no en el motor.

**Requerimientos asociados:** RF-002, RF-003, RF-017, RNF-001, RNF-002, RNF-007

#### 6.1.9 CUS-009: Cargar y descomprimir una escena SOG

**Actor:** Sistema

**Descripción:** El sistema descarga, decodifica y deja navegable una escena en formato SOG, informando del progreso y de cualquier fallo.

**Flujo principal:**

> 1\. El sistema lee el archivo de configuración de escenas y obtiene la ruta del archivo SOG.
>
> 2\. El sistema muestra el progreso de carga.
>
> 3\. El sistema descarga el archivo SOG.
>
> 4\. El sistema decodifica las imágenes WebP y transfiere los datos a la GPU.
>
> 5\. El sistema asigna el asset al componente gsplat de la entidad correspondiente.
>
> 6\. El sistema oculta el progreso y entrega la escena navegable.

**Flujos alternativos:**

- 3a. Se produce un fallo de red → el sistema informa en español y ofrece reintentar; nunca muestra pantalla en negro.

- 4a. El archivo está corrupto o la versión del formato no es reconocida → el sistema informa el error concreto y no continúa en silencio.

- 6a. La escena excede el presupuesto de splats del dispositivo → el sistema aplica el perfil de calidad reducido.

**Requerimientos asociados:** RF-001, RF-002, RF-025, RNF-002, RNF-003, RNF-007, RNF-014

#### 6.1.10 CUS-010: Adaptar la experiencia al dispositivo

**Actor:** Sistema

**Descripción:** El sistema ajusta automáticamente la calidad del renderizado y la disposición de la interfaz a las capacidades y al tamaño de pantalla del dispositivo.

**Flujo principal:**

> 1\. El sistema detecta el tipo de dispositivo y el soporte de WebGPU.
>
> 2\. El sistema selecciona el perfil de calidad correspondiente.
>
> 3\. El sistema fija el presupuesto de splats, el antialiasing y el device pixel ratio.
>
> 4\. El sistema configura los niveles de detalle por distancia.
>
> 5\. El sistema adapta la interfaz al tamaño de pantalla y a la entrada táctil.

**Flujos alternativos:**

- 1a. No hay soporte de WebGPU → el sistema repliega a WebGL.

- 3a. El rendimiento medido no alcanza el objetivo → el sistema reduce un nivel adicional el perfil de calidad.

- 5a. La pantalla es menor de 375 píxeles de ancho → el sistema prioriza el recorrido sobre el HUD sin perder usabilidad.

**Requerimientos asociados:** RF-019, RF-022, RNF-001, RNF-004, RNF-006, RNF-013

#### 6.1.11 CUS-011: Procesar y publicar una escena capturada

**Actor:** Equipo de captura

**Descripción:** El equipo de captura convierte el material bruto de campo en una escena publicada en formato SOG, declarada y lista para el motor.

**Flujo principal:**

> 1\. El equipo extrae los cuadros del video y descarta los que presentan movimiento borroso.
>
> 2\. El equipo resuelve las poses de cámara mediante SfM.
>
> 3\. El equipo entrena la escena 3DGS en la estación con GPU.
>
> 4\. El equipo elimina flotantes, recorta la escena y ajusta el color en SuperSplat.
>
> 5\. El equipo comprime la escena a formato SOG con SplatTransform.
>
> 6\. El equipo verifica el peso y la calidad contra el umbral definido.
>
> 7\. El equipo declara la escena en el archivo de configuración con su orden, rutas, puntos de entrada y salida y fecha de captura.
>
> 8\. El equipo asocia el track GPS a la secuencia de escenas.

**Flujos alternativos:**

- 3a. La reconstrucción presenta ruido inaceptable en vegetación → se recaptura o se recorta el tramo; nunca se modela terreno a mano.

- 6a. La escena excede el peso permitido → se reduce el número de gaussianas y se repite desde el paso 3.

- 6b. Persiste el exceso de peso → se adopta Streamed SOG con niveles de detalle.

**Requerimientos asociados:** RF-002, RF-020, RF-023, RNF-003, RNF-011

#### 6.1.12 CUS-012: Registrar y publicar un punto de interés

**Actor:** Equipo de contenido

**Descripción:** El equipo de contenido incorpora un nuevo punto de interés declarándolo en el archivo de configuración, sin modificar el motor ni recompilar.

**Flujo principal:**

> 1\. El equipo verifica el nombre común y el nombre científico contra una fuente citable.
>
> 2\. El equipo prepara el modelo 3D optimizado dentro del presupuesto establecido para web.
>
> 3\. El equipo graba la narración y obtiene su transcripción textual.
>
> 4\. Si el punto de interés es de fauna, el equipo prepara el canto del ave.
>
> 5\. El equipo declara el punto en el archivo de configuración de puntos de interés con sus rutas, su ancla y sus datos.
>
> 6\. El sistema valida el esquema y publica el punto sin recompilar ni modificar el motor.

**Flujos alternativos:**

- 1a. El dato no puede verificarse → se marca como pendiente; nunca se rellena con un valor inventado.

- 4a. El punto de interés no es de fauna → se omite el campo de canto.

- 6a. El esquema no valida → el sistema informa el error concreto y no publica el punto en silencio.

**Requerimientos asociados:** RF-006, RF-008, RF-009, RF-010, RF-011, RF-012, RF-021, RF-024, RNF-009, RNF-010, RNF-011, RNF-012

#### 6.1.13 CUS-013: Escuchar la ambientación sonora espacial del recorrido

Actor: Visitante

Descripción: El visitante recorre el tramo con una ambientación sonora continua en la que las fuentes de sonido están espacializadas en tres dimensiones y ancladas a posiciones reales del sendero.

Flujo principal:

1\. El visitante activa el inicio del recorrido mediante un gesto explícito, eligiendo entre iniciar con sonido o iniciar en silencio.

2\. El sistema inicia la reproducción del lecho ambiente continuo, que no es posicional.

3\. El sistema activa las fuentes sonoras puntuales cuya distancia al visitante se encuentra dentro del alcance configurado.

4\. El sistema espacializa cada fuente puntual mediante paneo binaural, tomando como oyente la cámara del recorrido.

5\. El visitante avanza y gira, y el sistema reorienta el campo sonoro sin intervención adicional.

6\. El sistema desactiva las fuentes que quedan fuera de alcance y respeta el máximo de fuentes simultáneas del perfil de calidad.

7\. El visitante puede silenciar la ambientación en cualquier momento desde el control visible en la interfaz.

Flujos alternativos:

- 1a. El visitante elige iniciar en silencio: el sistema no reproduce ambientación y conserva esa preferencia para visitas posteriores.

- 2a. El sistema no reproduce ningún sonido antes del gesto explícito del visitante, en ningún caso.

- 4a. El navegador no aplica paneo binaural real: el sistema degrada la espacialización a paneo estéreo por distancia y continúa.

- 6a. El número de fuentes en alcance supera el máximo permitido: el sistema conserva las más cercanas y desactiva el resto.

- 7a. El visitante abre la ficha de un punto de interés: la ambientación continúa sin interrumpirse y la narración se reproduce solo si el visitante la activa.

Requerimientos asociados: RF-028, RNF-001, RNF-006, RNF-008, RNF-009, RNF-016

#### 6.1.14 CUS-014: Consultar un punto de interés patrimonial o histórico

Actor: Visitante

Descripción: El visitante activa un marcador correspondiente a un elemento no vivo del sendero —una puerta derrumbada, un muro, un monumento o un tramo de camino— y consulta su ficha con la historia del lugar.

Flujo principal:

1\. El sistema muestra el marcador patrimonial, diferenciado por color y por forma de los marcadores de fauna y flora.

2\. El visitante activa el marcador.

3\. El sistema guarda la posición y la orientación actuales de la cámara.

4\. El sistema abre el panel de ficha del elemento patrimonial.

5\. El sistema muestra el modelo tridimensional del elemento, girable y con acercamiento.

6\. El sistema muestra la nota histórica, la época aproximada y la fuente citable de la que procede la información.

7\. El sistema omite los campos de distribución altitudinal e identificación de especie, que no aplican a este tipo de punto.

8\. El visitante cierra la ficha y el sistema restaura la posición y la orientación guardadas.

Flujos alternativos:

- 6a. La afirmación histórica no cuenta con fuente citable verificada: el sistema describe únicamente lo observable y marca la historia como pendiente de verificación; nunca la completa con datos no verificados.

- 6b. El elemento todavía no tiene nota histórica: la ficha muestra el modelo y la descripción física, y omite la sección histórica.

- 5a. El modelo tridimensional no carga: el sistema muestra la ficha sin visor e informa de la ausencia.

Requerimientos asociados: RF-006, RF-007, RF-009, RF-011, RF-018, RF-021, RF-024, RF-030, RNF-005, RNF-006, RNF-009, RNF-010, RNF-011

#### 6.1.15 CUS-015: Ajustar el nivel de detalle según la proximidad al recorrido

Actor: Sistema

Descripción: El sistema concentra el detalle de la escena en el entorno inmediato del recorrido y lo reduce progresivamente en el contexto más alejado, para sostener el rendimiento sin sacrificar aquello que el visitante observa de cerca.

Flujo principal:

1\. El sistema obtiene del perfil de calidad la distancia base y el multiplicador de nivel de detalle correspondientes al dispositivo.

2\. El sistema configura los niveles de detalle de la escena con una progresión geométrica a partir de la distancia base.

3\. El sistema mantiene el máximo nivel de detalle en la banda inmediata al trazado, que coincide con la banda de alta densidad empleada durante la captura.

4\. El sistema reduce progresivamente el detalle de los elementos más alejados del trazado conforme aumenta su distancia a la cámara.

5\. El sistema actualiza la selección de niveles conforme el visitante avanza por el recorrido.

Flujos alternativos:

- 1a. El dispositivo es móvil o de gama media: el sistema aplica un perfil con menor presupuesto de gaussianas y distancia base más corta.

- 4a. Se percibe un salto visible al cambiar de nivel: se ajustan la distancia base y el multiplicador, y el ajuste se documenta con medición, no por impresión.

- 5a. El rendimiento medido no alcanza el objetivo pese al ajuste: se escala a la estrategia de transmisión progresiva de la escena.

Requerimientos asociados: RF-002, RF-004, RF-022, RF-027, RNF-001

# 7. Requerimientos

Un requerimiento describe una necesidad de negocio en términos de capacidades y/o servicios funcionales que ofrece un sistema, así como las restricciones de calidad bajo las cuales debe operar. Los requerimientos funcionales describen qué debe hacer el sistema; los no funcionales, con qué nivel de calidad debe hacerlo. Todos los requerimientos aquí especificados son verificables y están trazados a por lo menos un caso de uso, según la matriz de la sección 8.

## 7.1 Requerimientos funcionales

#### 7.1.1 Lista de requerimientos funcionales

| **Identificador** | **Nombre requerimiento** |
|----|----|
| RF-001 | Carga inicial sin instalación |
| RF-002 | Recorrido reconstruido en Gaussian Splats |
| RF-003 | Avance y retroceso por el trazado |
| RF-004 | Restricción al trazado autorizado |
| RF-005 | Rotación de cámara 360° |
| RF-006 | Marcadores anclados a coordenadas reales |
| RF-007 | Activación del marcador |
| RF-008 | Nombre común y nombre científico |
| RF-009 | Visor 3D de la ficha |
| RF-010 | Distribución altitudinal e identificación en campo |
| RF-011 | Reproducción de la narración |
| RF-012 | Reproducción del canto del ave |
| RF-013 | Altitud sobre el nivel del mar |
| RF-014 | Distancia recorrida y restante |
| RF-015 | Desnivel acumulado y pendiente |
| RF-016 | Tiempo estimado hasta el siguiente punto |
| RF-017 | Encadenado continuo de las escenas |
| RF-018 | Retorno a la posición al cerrar la ficha |
| RF-019 | Adaptación de la interfaz a escritorio y celular |
| RF-020 | Consumo del track GPS |
| RF-021 | Alta de punto de interés por configuración |
| RF-022 | Ajuste de calidad según el dispositivo |
| RF-023 | Publicación de escenas por configuración |
| RF-024 | Transcripción de la narración |
| RF-025 | Progreso de carga de la escena |
| RF-026 | Onboarding en la primera visita |
| RF-027 | Nivel de detalle por proximidad al recorrido |
| RF-028 | Ambientación sonora binaural con audio espacial 3D |
| RF-029 | Animación de reposo en el modelo tridimensional de fauna |
| RF-030 | Ficha de punto de interés patrimonial o histórico |
| RF-031 | Consejos de avistamiento en la ficha de fauna |
| RF-032 | Identidad visual aplicada: paleta y tipografía |

#### 7.1.2 Especificación de requerimientos funcionales

| **Identificador** | RF-001 |
|----|----|
| **Nombre del Requerimiento** | Carga inicial sin instalación |
| **Descripción** | El sistema debe cargar la primera escena del tramo en el navegador sin instalación previa. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El acceso es libre y anónimo: no se requiere cuenta, registro ni datos personales. |
| **Interoperabilidad con otro sistema, módulo o componente** | Motor PlayCanvas (componente gsplat); hosting estático sobre HTTPS. |
| **Relaciones entre requerimientos** | RF-002 (Recorrido en Gaussian Splats), RF-022 (Calidad según dispositivo), RF-025 (Progreso de carga) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001, CUS-009 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-002 |
|----|----|
| **Nombre del Requerimiento** | Recorrido reconstruido en Gaussian Splats |
| **Descripción** | El sistema debe mostrar el recorrido reconstruido con Gaussian Splats en formato SOG. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La geometría del sendero procede exclusivamente de la captura fotogramétrica; no se modela terreno a mano. |
| **Interoperabilidad con otro sistema, módulo o componente** | Motor PlayCanvas (asset tipo gsplat); archivos .sog generados con SplatTransform. |
| **Relaciones entre requerimientos** | RF-001 (Carga inicial), RF-017 (Encadenado de escenas), RF-023 (Publicación de escenas) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001, CUS-008, CUS-009, CUS-011 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-003 |
|----|----|
| **Nombre del Requerimiento** | Avance y retroceso por el trazado |
| **Descripción** | El usuario puede avanzar y retroceder a lo largo del trazado guiado. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | El desplazamiento sigue siempre el trazado autorizado del sendero. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; configuración de escenas. |
| **Relaciones entre requerimientos** | RF-004 (Restricción al trazado), RF-005 (Rotación 360°), RF-017 (Encadenado de escenas) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-002, CUS-008 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-004 |
|----|----|
| **Nombre del Requerimiento** | Restricción al trazado autorizado |
| **Descripción** | El sistema debe restringir el desplazamiento al trazado autorizado, sin movimiento libre fuera de él. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El sendero se encuentra dentro de una reserva natural protegida: el sistema no puede permitir ni sugerir salirse del camino. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; track GPS del sendero. |
| **Relaciones entre requerimientos** | RF-003 (Avance y retroceso), RF-005 (Rotación 360°) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-002, CUS-003 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-005 |
|----|----|
| **Nombre del Requerimiento** | Rotación de cámara 360° |
| **Descripción** | El usuario puede rotar la cámara 360° en cualquier punto del recorrido. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | La rotación no modifica la posición del visitante sobre el trazado. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido. |
| **Relaciones entre requerimientos** | RF-003 (Avance y retroceso), RF-004 (Restricción al trazado), RF-006 (Marcadores anclados) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-003 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-006 |
|----|----|
| **Nombre del Requerimiento** | Marcadores anclados a coordenadas reales |
| **Descripción** | El sistema debe mostrar marcadores flotantes anclados a coordenadas reales del tramo. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Cada marcador corresponde a un punto de interés verificado y ubicado en campo. El tramo contempla entre 5 y 6 puntos. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; archivo de configuración de POIs. |
| **Relaciones entre requerimientos** | RF-007 (Activación de marcador), RF-021 (Alta de POI por configuración) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-007 |
|----|----|
| **Nombre del Requerimiento** | Activación del marcador |
| **Descripción** | El usuario puede activar un marcador para abrir la ficha del punto de interés. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | El marcador solo puede activarse cuando el visitante se encuentra suficientemente próximo. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; panel de ficha. |
| **Relaciones entre requerimientos** | RF-006 (Marcadores anclados), RF-008 (Nombres de la especie), RF-018 (Retorno a la posición) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-008 |
|----|----|
| **Nombre del Requerimiento** | Nombre común y nombre científico |
| **Descripción** | La ficha debe mostrar el nombre común y el nombre científico. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Ambos nombres deben verificarse contra una fuente citable antes de publicarse. Lo no verificado se marca como pendiente, nunca se rellena. |
| **Interoperabilidad con otro sistema, módulo o componente** | Archivo de configuración de POIs. |
| **Relaciones entre requerimientos** | RF-007 (Activación de marcador), RF-010 (Distribución e identificación) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-009 |
|----|----|
| **Nombre del Requerimiento** | Visor 3D de la ficha |
| **Descripción** | La ficha debe incluir un visor 3D del modelo, girable y con acercamiento. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | El modelo debe permitir reconocer color y forma en campo. Su carga no puede comprometer el rendimiento de la escena. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; modelos en formato glTF/GLB. |
| **Relaciones entre requerimientos** | RF-007 (Activación de marcador), RF-018 (Retorno a la posición) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-005, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-010 |
|----|----|
| **Nombre del Requerimiento** | Distribución altitudinal e identificación en campo |
| **Descripción** | La ficha debe mostrar la altura donde vive la especie y cómo identificarla en campo. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Los rangos de altitud deben proceder de fuente verificable. El colibrí chillón (Colibri coruscans) habita entre 1.700 y 3.500 msnm. |
| **Interoperabilidad con otro sistema, módulo o componente** | Archivo de configuración de POIs. |
| **Relaciones entre requerimientos** | RF-008 (Nombres de la especie) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-011 |
|----|----|
| **Nombre del Requerimiento** | Reproducción de la narración |
| **Descripción** | El usuario puede reproducir la narración corta del punto de interés. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | La reproducción se inicia únicamente por acción explícita del visitante. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de audio; archivos de audio en formato web. |
| **Relaciones entre requerimientos** | RF-012 (Canto del ave), RF-024 (Transcripción de la narración) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-006, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-012 |
|----|----|
| **Nombre del Requerimiento** | Reproducción del canto del ave |
| **Descripción** | El usuario puede reproducir el canto del ave cuando el POI es de fauna. |
| **Actor** | Visitante |
| **Reglas de negocio relacionadas** | Solo aplica a puntos de interés de tipo fauna. La reproducción se inicia únicamente por acción del visitante. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de audio; archivos de audio capturados en campo. |
| **Relaciones entre requerimientos** | RF-011 (Narración del punto de interés) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-006, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-013 |
|----|----|
| **Nombre del Requerimiento** | Altitud sobre el nivel del mar |
| **Descripción** | El sistema debe mostrar la altitud sobre el nivel del mar de la posición actual. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El dato se deriva del track GPS grabado en campo; nunca se codifica de forma fija. Altitud del tramo: 2.712 msnm. |
| **Interoperabilidad con otro sistema, módulo o componente** | Capa de datos; track GPS; HUD. |
| **Relaciones entre requerimientos** | RF-014 (Distancias), RF-015 (Desnivel y pendiente), RF-020 (Consumo del track GPS) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-007 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-014 |
|----|----|
| **Nombre del Requerimiento** | Distancia recorrida y restante |
| **Descripción** | El sistema debe mostrar la distancia recorrida y la que falta. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Ambas distancias suman la longitud total del tramo. Recorrido del tramo: 340 m. |
| **Interoperabilidad con otro sistema, módulo o componente** | Capa de datos; track GPS; HUD. |
| **Relaciones entre requerimientos** | RF-013 (Altitud), RF-016 (Tiempo estimado), RF-020 (Consumo del track GPS) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-007 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-015 |
|----|----|
| **Nombre del Requerimiento** | Desnivel acumulado y pendiente |
| **Descripción** | El sistema debe mostrar el desnivel acumulado y la pendiente actual. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Los valores deben ser coherentes con las cifras reales del tramo: 62 m de desnivel y 9 % de pendiente media. |
| **Interoperabilidad con otro sistema, módulo o componente** | Capa de datos; track GPS; HUD. |
| **Relaciones entre requerimientos** | RF-013 (Altitud), RF-014 (Distancias), RF-020 (Consumo del track GPS) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-007 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-016 |
|----|----|
| **Nombre del Requerimiento** | Tiempo estimado hasta el siguiente punto |
| **Descripción** | El sistema debe mostrar el tiempo estimado hasta el siguiente punto de interés. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La estimación considera la pendiente del terreno, no solo la distancia. Si no quedan puntos por delante, se estima hasta el final del tramo. |
| **Interoperabilidad con otro sistema, módulo o componente** | Capa de datos; módulo de puntos de interés; HUD. |
| **Relaciones entre requerimientos** | RF-014 (Distancias), RF-015 (Desnivel y pendiente), RF-006 (Marcadores anclados) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-002, CUS-007 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-017 |
|----|----|
| **Nombre del Requerimiento** | Encadenado continuo de las escenas |
| **Descripción** | El sistema debe encadenar las tres escenas de forma continua para el usuario. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El tramo se compone de tres escenas. La transición no puede mostrar pantalla en negro ni salto de posición. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; archivo de configuración de escenas. |
| **Relaciones entre requerimientos** | RF-002 (Recorrido en Gaussian Splats), RF-003 (Avance y retroceso), RF-023 (Publicación de escenas) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-008 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-018 |
|----|----|
| **Nombre del Requerimiento** | Retorno a la posición al cerrar la ficha |
| **Descripción** | Al cerrar la ficha, el sistema debe devolver al usuario a la posición donde estaba. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Se conservan tanto la posición sobre el trazado como la orientación de la cámara. El audio se detiene al cerrar. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; módulo de puntos de interés. |
| **Relaciones entre requerimientos** | RF-007 (Activación de marcador), RF-009 (Visor 3D de la ficha) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-005 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-019 |
|----|----|
| **Nombre del Requerimiento** | Adaptación de la interfaz a escritorio y celular |
| **Descripción** | El sistema debe adaptar la interfaz a escritorio y a celular. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La interfaz debe ser usable desde 375 píxeles de ancho y no puede depender de estados de hover. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de interfaz; sistema de diseño. |
| **Relaciones entre requerimientos** | RF-022 (Calidad según dispositivo), RF-026 (Onboarding) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-010 |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-020 |
|----|----|
| **Nombre del Requerimiento** | Consumo del track GPS |
| **Descripción** | El sistema debe consumir el track GPS del sendero para alimentar la capa de datos. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El track se graba en campo el mismo día de la captura y se alinea y escala contra la geometría reconstruida. |
| **Interoperabilidad con otro sistema, módulo o componente** | Capa de datos; archivo de track GPS; escenas publicadas. |
| **Relaciones entre requerimientos** | RF-013 (Altitud), RF-014 (Distancias), RF-015 (Desnivel y pendiente), RF-016 (Tiempo estimado) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-007, CUS-011 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-021 |
|----|----|
| **Nombre del Requerimiento** | Alta de punto de interés por configuración |
| **Descripción** | El equipo de contenido puede añadir un POI declarándolo en un archivo de configuración, sin tocar el motor. |
| **Actor** | Equipo de contenido |
| **Reglas de negocio relacionadas** | El alta de un punto de interés no puede requerir recompilación ni modificación del motor. El esquema se valida al cargar. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; archivo de configuración de POIs. |
| **Relaciones entre requerimientos** | RF-006 (Marcadores anclados), RF-008 (Nombres de la especie), RF-009 (Visor 3D de la ficha) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-022 |
|----|----|
| **Nombre del Requerimiento** | Ajuste de calidad según el dispositivo |
| **Descripción** | El sistema debe ajustar el presupuesto de splats y la calidad de renderizado según las capacidades del dispositivo. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El ajuste es automático y no se delega al visitante. Referencias: ~1 millón de gaussianas en móvil y 3 millones o más en escritorio. |
| **Interoperabilidad con otro sistema, módulo o componente** | Motor PlayCanvas; perfiles de calidad; niveles de detalle. |
| **Relaciones entre requerimientos** | RF-001 (Carga inicial), RF-019 (Adaptación de la interfaz) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001, CUS-010 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-023 |
|----|----|
| **Nombre del Requerimiento** | Publicación de escenas por configuración |
| **Descripción** | El equipo de captura puede publicar una escena declarándola en el archivo de configuración de escenas, con su orden, ruta y puntos de entrada y salida. |
| **Actor** | Equipo de captura |
| **Reglas de negocio relacionadas** | Añadir o reordenar escenas no puede requerir modificación del motor. Cada escena se versiona con su fecha de captura. |
| **Interoperabilidad con otro sistema, módulo o componente** | Archivo de configuración de escenas; módulo de motor de recorrido. |
| **Relaciones entre requerimientos** | RF-002 (Recorrido en Gaussian Splats), RF-017 (Encadenado de escenas) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-011 |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-024 |
|----|----|
| **Nombre del Requerimiento** | Transcripción de la narración |
| **Descripción** | El sistema debe mostrar la transcripción textual de la narración del punto de interés. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Toda narración publicada debe contar con su transcripción, por exigencia de accesibilidad. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; archivos de texto de transcripción. |
| **Relaciones entre requerimientos** | RF-011 (Narración del punto de interés), RF-012 (Canto del ave) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-006, CUS-012 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-025 |
|----|----|
| **Nombre del Requerimiento** | Progreso de carga de la escena |
| **Descripción** | El sistema debe mostrar el progreso de carga de la escena mientras se descarga y decodifica. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | En ningún estado de carga puede quedar la pantalla en negro sin información. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; interfaz. |
| **Relaciones entre requerimientos** | RF-001 (Carga inicial), RF-017 (Encadenado de escenas) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001, CUS-009 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificador** | RF-026 |
|----|----|
| **Nombre del Requerimiento** | Onboarding en la primera visita |
| **Descripción** | El sistema debe mostrar una introducción breve la primera vez, explicando cómo avanzar, cómo mirar y cómo abrir una ficha. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El onboarding es omitible y no se repite en visitas posteriores. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de interfaz; almacenamiento local del navegador. |
| **Relaciones entre requerimientos** | RF-003 (Avance y retroceso), RF-005 (Rotación 360°), RF-007 (Activación de marcador), RF-019 (Adaptación de la interfaz) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001 |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-027 |
| **Nombre del Requerimiento** | Nivel de detalle por proximidad al recorrido |
| **Descripción** | El sistema debe representar con el máximo nivel de detalle los elementos situados en la banda inmediata al trazado —desde el suelo hasta aproximadamente un metro por encima de la altura de la vista del visitante, y aproximadamente un metro a cada lado del eje del sendero— y reducir progresivamente el detalle de los elementos situados fuera de esa banda, sin eliminarlos. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | El desplazamiento está restringido al trazado autorizado (RF-004), por lo que la distancia a la cámara equivale a la distancia al recorrido. El ajuste es automático y no lo elige el usuario. Los valores concretos se fijan mediante medición sobre el dispositivo de referencia y no por estimación. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de motor de recorrido; componente de renderizado de Gaussian Splats del motor gráfico. |
| **Relaciones entre requerimientos** | RF-002 (Recorrido en Gaussian Splats), RF-004 (Restricción al trazado), RF-022 (Ajuste de calidad según el dispositivo), RNF-001 (Rendimiento) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-002, CUS-010, CUS-015 |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-028 |
| **Nombre del Requerimiento** | Ambientación sonora binaural con audio espacial 3D |
| **Descripción** | El sistema debe reproducir una ambientación sonora continua durante el recorrido, compuesta por un lecho ambiente no posicional y por fuentes sonoras puntuales espacializadas en tres dimensiones mediante paneo binaural, ancladas a posiciones reales del tramo y declaradas en un archivo de configuración. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La reproducción nace siempre de un gesto explícito del visitante y nunca de forma automática. Existe un control de silencio permanentemente visible y la preferencia se conserva entre visitas. El oyente del campo sonoro es la cámara del recorrido. El material sonoro procede del propio sendero. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de audio; interfaz de audio del navegador; módulo de motor de recorrido, que aporta la posición del oyente. |
| **Relaciones entre requerimientos** | RF-011 (Reproducción de la narración), RF-012 (Canto del ave), RF-022 (Ajuste de calidad), RNF-008 (Comportamiento del sonido), RNF-016 (Presupuesto de audio espacial) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-001, CUS-013 |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-029 |
| **Nombre del Requerimiento** | Animación de reposo en el modelo tridimensional de fauna |
| **Descripción** | El sistema debe reproducir en bucle una animación de reposo —aleteo— sobre el modelo tridimensional de los puntos de interés de fauna, desde el momento en que se abre la ficha y sin que el visitante deba activarla. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La animación se declara por configuración, mediante el nombre del clip contenido en el propio modelo. El bucle no debe presentar salto perceptible. La regla de no reproducción automática aplica al audio, no a la animación visual. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; visor tridimensional de la ficha; formato de modelo glTF. |
| **Relaciones entre requerimientos** | RF-009 (Visor 3D de la ficha), RF-021 (Alta de POI por configuración), RNF-001 (Rendimiento), RNF-012 (Presupuesto de los modelos 3D) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-005, CUS-012 |
| **Responsable elaboración** | Felipe Acevedo |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-030 |
| **Nombre del Requerimiento** | Ficha de punto de interés patrimonial o histórico |
| **Descripción** | El sistema debe admitir puntos de interés de tipo patrimonial —puertas derrumbadas, muros, monumentos, tramos de camino y señalización— cuya ficha muestre el modelo tridimensional del elemento, una nota histórica, la época aproximada y la fuente citable de la que procede la información. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | La fuente citable es obligatoria cuando la nota histórica afirma un hecho. Si no existe fuente verificada, la ficha describe únicamente lo observable y marca la información histórica como pendiente de verificación. La ficha omite los campos de distribución altitudinal y de identificación de especie. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; archivo de configuración de puntos de interés. |
| **Relaciones entre requerimientos** | RF-006 (Marcadores anclados), RF-007 (Activación del marcador), RF-009 (Visor 3D), RF-021 (Alta de POI por configuración), RNF-011 (Versionado y trazabilidad de assets) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-012, CUS-014 |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-031 |
| **Nombre del Requerimiento** | Consejos de avistamiento en la ficha de fauna |
| **Descripción** | La ficha de un punto de interés de fauna debe incluir consejos de avistamiento: cuándo, dónde y cómo buscar la especie dentro del sendero. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Los consejos proceden de la observación registrada en la visita de reconocimiento o de fuente citable; no se publican consejos no verificados. Se distinguen de la identificación en campo, que describe cómo reconocer la especie una vez avistada. |
| **Interoperabilidad con otro sistema, módulo o componente** | Módulo de puntos de interés; archivo de configuración de puntos de interés. |
| **Relaciones entre requerimientos** | RF-008 (Nombre común y científico), RF-010 (Distribución altitudinal e identificación en campo), RF-021 (Alta de POI por configuración) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-012 |
| **Responsable elaboración** | Felipe Acevedo |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificador** | RF-032 |
| **Nombre del Requerimiento** | Identidad visual aplicada: paleta y tipografía |
| **Descripción** | El sistema debe aplicar una identidad visual basada en una paleta de grises, negros y verdes que resalte la quebrada y la fauna del tramo, definida en un único archivo de variables de estilo y empleada en la totalidad de la interfaz. |
| **Actor** | Sistema |
| **Reglas de negocio relacionadas** | Ningún archivo de código escribe un color literal. Cada combinación de texto y fondo debe tener su relación de contraste calculada y documentada. Ningún dato se comunica únicamente mediante color. El verde señala lo vivo, y un único acento verde azulado queda reservado para el cauce y los datos del recorrido. |
| **Interoperabilidad con otro sistema, módulo o componente** | Sistema de diseño; módulo de interfaz; hoja de variables de estilo. |
| **Relaciones entre requerimientos** | RF-019 (Adaptación de la interfaz), RF-025 (Progreso de carga), RNF-005 (Usabilidad), RNF-006 (Accesibilidad), RNF-010 (Idioma) |
| **Casos de uso relacionados / Historias de usuario relacionados** | CUS-004, CUS-010 |
| **Responsable elaboración** | Eybar Viasus |
| **Fecha de elaboración** | 11/08/2026 |

## 7.2 Requerimientos No Funcionales

| **Identificador** | **Nombre requerimiento**              |
|-------------------|---------------------------------------|
| RNF-001           | Rendimiento                           |
| RNF-002           | Tiempos de carga                      |
| RNF-003           | Peso de las escenas                   |
| RNF-004           | Compatibilidad                        |
| RNF-005           | Usabilidad                            |
| RNF-006           | Accesibilidad                         |
| RNF-007           | Tolerancia a errores                  |
| RNF-008           | Comportamiento del sonido             |
| RNF-009           | Mantenibilidad del contenido          |
| RNF-010           | Idioma                                |
| RNF-011           | Versionado y trazabilidad de assets   |
| RNF-012           | Presupuesto de los modelos 3D         |
| RNF-013           | Privacidad                            |
| RNF-014           | Despliegue                            |
| RNF-015           | Responsabilidad ambiental y normativa |
| RNF-016           | Presupuesto de audio espacial         |

| **Identificación del requerimiento** | RNF-001 |
|----|----|
| **Nombre del Requerimiento** | Rendimiento |
| **Descripción** | El sistema debe sostener al menos 30 fps en un celular de gama media de los últimos tres años, recorriendo el tramo completo. La medición debe documentarse contra un dispositivo de referencia concreto. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-002 |
|----|----|
| **Nombre del Requerimiento** | Tiempos de carga |
| **Descripción** | La primera escena debe quedar navegable en menos de 10 segundos con una conexión de 10 Mbps. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-003 |
|----|----|
| **Nombre del Requerimiento** | Peso de las escenas |
| **Descripción** | Cada escena en formato SOG no debe superar \[por definir tras la primera captura\] MB. El umbral se fija con una medición real durante el Sprint 2. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-004 |
|----|----|
| **Nombre del Requerimiento** | Compatibilidad |
| **Descripción** | El sistema debe funcionar en las versiones vigentes de Chrome, Safari y Firefox, en escritorio y en móvil, sin instalación. WebGPU se emplea cuando está disponible, con repliegue automático a WebGL. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-005 |
|----|----|
| **Nombre del Requerimiento** | Usabilidad |
| **Descripción** | Un visitante sin experiencia previa debe poder iniciar el recorrido y abrir una ficha sin instrucciones. Meta verificable: 4 de cada 5 personas lo consiguen en prueba de usuario. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-006 |
|----|----|
| **Nombre del Requerimiento** | Accesibilidad |
| **Descripción** | Los textos de las fichas deben cumplir contraste AA. Toda narración debe contar con transcripción textual. Ningún dato puede comunicarse únicamente mediante color. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-007 |
|----|----|
| **Nombre del Requerimiento** | Tolerancia a errores |
| **Descripción** | Si una escena falla al cargar, el sistema debe informarlo en español y ofrecer reintentar. Nunca debe quedar la pantalla en negro. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alejandra Chambueta |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-008 |
|----|----|
| **Nombre del Requerimiento** | Comportamiento del sonido |
| **Descripción** | El audio no se reproduce automáticamente en ningún caso; su reproducción la inicia siempre el usuario. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-009 |
|----|----|
| **Nombre del Requerimiento** | Mantenibilidad del contenido |
| **Descripción** | Añadir un punto de interés no debe requerir recompilar ni modificar el motor. La misma regla aplica a añadir o reordenar escenas. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-010 |
|----|----|
| **Nombre del Requerimiento** | Idioma |
| **Descripción** | La interfaz y todos los contenidos deben estar en español. Los identificadores de código se escriben en inglés. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Eybar Viasus |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-011 |
|----|----|
| **Nombre del Requerimiento** | Versionado y trazabilidad de assets |
| **Descripción** | Cada escena y cada modelo 3D debe registrar su fecha de captura o creación y su origen. Los assets pesados no se versionan en el repositorio de código. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-012 |
|----|----|
| **Nombre del Requerimiento** | Presupuesto de los modelos 3D |
| **Descripción** | Cada modelo de ficha debe respetar el presupuesto de triángulos y de peso definido para web \[valor por fijar en el Sprint 2b\]. Su carga no puede comprometer el rendimiento de la escena de fondo. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Felipe Acevedo |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-013 |
|----|----|
| **Nombre del Requerimiento** | Privacidad |
| **Descripción** | El sistema no recoge datos personales del visitante. No requiere cuenta ni registro, y no incorpora analítica que permita identificarlo. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_\_\_ Baja\_\_X\_\_ |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-014 |
|----|----|
| **Nombre del Requerimiento** | Despliegue |
| **Descripción** | El sistema debe poder servirse como sitio estático sobre HTTPS, con una política de caché adecuada para los assets pesados. |
| **Prioridad** | Alta \_\_X\_\_ Media\_\_\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Juan Urrego |
| **Fecha de elaboración** | 11/08/2026 |

| **Identificación del requerimiento** | RNF-015 |
|----|----|
| **Nombre del Requerimiento** | Responsabilidad ambiental y normativa |
| **Descripción** | El sistema no debe revelar rutas fuera del trazado autorizado ni sugerir salirse de él. El diseño refuerza el respeto al camino oficial dentro de la reserva protegida. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | Alberto Alemán |
| **Fecha de elaboración** | 11/08/2026 |
| **Identificación del requerimiento** | RNF-016 |
| **Nombre del Requerimiento** | Presupuesto de audio espacial |
| **Descripción** | La ambientación sonora no debe superar cuatro fuentes espacializadas simultáneas en escritorio ni dos en dispositivos móviles \[valores por fijar mediante medición en el Sprint 4\], ni comprometer el objetivo de treinta cuadros por segundo establecido en el RNF-001. El lecho ambiente no es posicional. La medición de rendimiento se realiza con la ambientación activa, no sin ella. |
| **Prioridad** | Alta \_\_\_\_ Media\_\_X\_\_ Baja\_\_\_\_ |
| **Responsable elaboración** | David Beltrán |
| **Fecha de elaboración** | 11/08/2026 |

# 8. Matriz de trazabilidad de Requerimientos vs Casos de uso

**RF: Requerimiento Funcional**

**RNF: Requerimiento No Funcional**

**CUS: Caso de Uso**

*Cada X indica que el requerimiento de la fila participa en el caso de uso de la columna. Ningún requerimiento queda sin al menos una relación.*

|  | **CUS-001** | **CUS-002** | **CUS-003** | **CUS-004** | **CUS-005** | **CUS-006** | **CUS-007** | **CUS-008** | **CUS-009** | **CUS-010** | **CUS-011** | **CUS-012** | **CUS-013** | **CUS-014** | **CUS-015** |
|----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **RF-001** | X |  |  |  |  |  |  |  | X |  |  |  |  |  |  |
| **RF-002** | X |  |  |  |  |  |  | X | X |  | X |  |  |  | X |
| **RF-003** |  | X |  |  |  |  |  | X |  |  |  |  |  |  |  |
| **RF-004** |  | X | X |  |  |  |  |  |  |  |  |  |  |  | X |
| **RF-005** |  |  | X |  |  |  |  |  |  |  |  |  |  |  |  |
| **RF-006** |  |  |  | X |  |  |  |  |  |  |  | X |  | X |  |
| **RF-007** |  |  |  | X |  |  |  |  |  |  |  |  |  | X |  |
| **RF-008** |  |  |  | X |  |  |  |  |  |  |  | X |  |  |  |
| **RF-009** |  |  |  |  | X |  |  |  |  |  |  | X |  | X |  |
| **RF-010** |  |  |  | X |  |  |  |  |  |  |  | X |  |  |  |
| **RF-011** |  |  |  |  |  | X |  |  |  |  |  | X | X | X |  |
| **RF-012** |  |  |  |  |  | X |  |  |  |  |  | X |  |  |  |
| **RF-013** |  |  |  |  |  |  | X |  |  |  |  |  |  |  |  |
| **RF-014** |  |  |  |  |  |  | X |  |  |  |  |  |  |  |  |
| **RF-015** |  |  |  |  |  |  | X |  |  |  |  |  |  |  |  |
| **RF-016** |  | X |  |  |  |  | X |  |  |  |  |  |  |  |  |
| **RF-017** |  |  |  |  |  |  |  | X |  |  |  |  |  |  |  |
| **RF-018** |  |  |  | X | X |  |  |  |  |  |  |  |  | X |  |
| **RF-019** |  |  |  |  |  |  |  |  |  | X |  |  |  |  |  |
| **RF-020** |  |  |  |  |  |  | X |  |  |  | X |  |  |  |  |
| **RF-021** |  |  |  |  |  |  |  |  |  |  |  | X |  | X |  |
| **RF-022** | X |  |  |  |  |  |  |  |  | X |  |  |  |  | X |
| **RF-023** |  |  |  |  |  |  |  |  |  |  | X |  |  |  |  |
| **RF-024** |  |  |  |  |  | X |  |  |  |  |  | X |  | X |  |
| **RF-025** | X |  |  |  |  |  |  |  | X |  |  |  |  |  |  |
| **RF-026** | X |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **RNF-001** |  | X | X |  | X |  | X | X |  | X |  |  | X |  | X |
| **RNF-002** | X |  |  |  |  |  |  | X | X |  |  |  |  |  |  |
| **RNF-003** |  |  |  |  |  |  |  |  | X |  | X |  |  |  |  |
| **RNF-004** | X |  |  |  |  |  |  |  |  | X |  |  |  |  |  |
| **RNF-005** | X | X |  | X |  |  | X |  |  |  |  |  |  | X |  |
| **RNF-006** |  |  |  | X |  | X | X |  |  | X |  |  | X | X |  |
| **RNF-007** | X |  |  |  |  |  |  | X | X |  |  |  |  |  |  |
| **RNF-008** |  |  |  |  |  | X |  |  |  |  |  |  | X |  |  |
| **RNF-009** |  |  |  |  |  |  |  |  |  |  |  | X | X | X |  |
| **RNF-010** | X |  |  | X |  | X |  |  |  |  |  | X |  | X |  |
| **RNF-011** |  |  |  |  |  |  |  |  |  |  | X | X |  | X |  |
| **RNF-012** |  |  |  |  | X |  |  |  |  |  |  | X |  |  |  |
| **RNF-013** |  |  |  |  |  |  |  |  |  | X |  |  |  |  |  |
| **RNF-014** | X |  |  |  |  |  |  |  | X |  |  |  |  |  |  |
| **RNF-015** |  | X |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **RF-027** |  | X |  |  |  |  |  |  |  | X |  |  |  |  | X |
| **RF-028** | X |  |  |  |  |  |  |  |  |  |  |  | X |  |  |
| **RF-029** |  |  |  |  | X |  |  |  |  |  |  | X |  |  |  |
| **RF-030** |  |  |  | X |  |  |  |  |  |  |  | X |  | X |  |
| **RF-031** |  |  |  | X |  |  |  |  |  |  |  | X |  |  |  |
| **RF-032** |  |  |  | X |  |  |  |  |  | X |  |  |  |  |  |
| **RNF-016** |  |  |  |  |  |  |  |  |  | X |  |  | X |  | X |

# 9. Observaciones adicionales

- Alcance cerrado. El proyecto captura 200 metros en tres escenas, por etapas de 0 a 70, de 70 a 140 y de 140 a 200 metros, no el sendero completo de 7,3 kilómetros. En un bosque cada metro constituye geometría nueva, sin superficies repetibles que permitan simplificar, y el navegador impone un techo de memoria y de coste de ordenamiento por profundidad. Quedan expresamente fuera de alcance: el sendero completo, el desplazamiento libre tipo videojuego, la aplicación nativa iOS o Android, la realidad virtual, el multijugador, la captura con dron y cualquier sendero adicional.

- Ubicación. Quebrada La Vieja, sector Claro de Luna, tramo de entrada. Calle 71 con Avenida Circunvalar, Chapinero, con TransMilenio a 700 metros. Longitud comprometida: 200 m. Altitud de inicio: 2.712 msnm, procedente del registro GPS público y pendiente de confirmación en campo. El desnivel acumulado y la pendiente media del tramo de 200 metros quedan marcados como pendientes de medición y se cierran en la visita de reconocimiento. Las cifras de 340 m de recorrido, 62 m de desnivel y 9 % de pendiente corresponden al tramo de referencia evaluado en el ADR-001 y no al tramo comprometido. La elección se justifica en el documento ADR-001; el criterio determinante es la densidad de elementos duros (escalones de piedra, barandas de madera y cauce rocoso), que son los que la reconstrucción por Gaussian Splatting resuelve con fiabilidad.

- Requerimientos con valores pendientes. El RNF-003 (peso máximo por escena en formato SOG), el RNF-012 (presupuesto de los modelos 3D) y el RNF-016 (presupuesto de audio espacial) se encuentran sin valor numérico de forma deliberada. Se fijarán con mediciones reales durante el Sprint 2, el Sprint 2b y el Sprint 4 respectivamente. Consignar una cifra estimada en este momento sería inventar un dato.

- Datos pendientes de campo. Las coordenadas de anclaje de los puntos de interés y de las fuentes sonoras, el desnivel y la pendiente del tramo, y la fecha de captura de las escenas quedan marcados como pendientes de medición hasta las visitas de campo. El proyecto contempla cuatro visitas de cinco horas: reconocimiento sin grabación con la totalidad del equipo en la semana 2, captura principal en la semana 3, captura complementaria y contingencia en la semana 4, y verificación de la reconstrucción en la semana 6. Únicamente las dos primeras se encuentran en el camino crítico. Ningún dato biológico, de altitud o de distancia se publica sin verificación previa contra fuente citable o medición directa.

- Planificación. El proyecto se ejecuta en 4 épicas y 8 sprints de 2 semanas, entre el 11 de agosto y el 24 de noviembre de 2026. Los 8 sprints suman 16 semanas de esfuerzo frente a un plazo de 15 semanas de calendario. La contradicción se resuelve ejecutando el primer sprint de la Épica 3 en paralelo con el segundo sprint de la Épica 1: el modelado 3D de aves y plantas no depende de la captura del tramo. Esto comprime las 16 semanas de esfuerzo en 14 de calendario y reserva la semana 15 para integración, pruebas y entrega.

- Estimación. El esfuerzo base estimado asciende a 701 horas, distribuidas entre requerimientos funcionales (201 h), no funcionales (81 h), producción de contenido (335 h) y gestión e integración (84 h). Se aplica un margen del 50 %, superior al 30 % habitual, por tratarse de un equipo primerizo en las tres tecnologías centrales de forma simultánea y por depender de una salida de campo condicionada por el clima. El total estimado es de 1.052 horas. Con una dedicación de doce horas semanales por persona, exigida por el curso, la capacidad del equipo asciende a 1.080 horas, lo que sitúa la utilización en el 97,4 %. Por esa razón la ampliación del tramo más allá de los 200 metros no está comprometida.

- Restricción normativa y ambiental. El sendero se encuentra dentro de una reserva natural protegida y su acceso requiere reserva previa mediante la aplicación del Acueducto de Bogotá. Estas condiciones aplican tanto al equipo durante las salidas de captura como al diseño del sistema, que no puede revelar ni sugerir rutas fuera del trazado autorizado (RF-004 y RNF-015).

# 10. Control de revisión y aprobaciones del documento y sus anexos

| **Rol** | **Nombre** | **Fecha** | **Firma/Evidencia** |
|----|----|----|----|
| Gestor de Proyectos / Revisor | Juan Urrego | 11/08/2026 |  |
| Analista de requerimientos | Juan Urrego | 11/08/2026 |  |
| Artista 3D | Felipe Acevedo | 11/08/2026 |  |
| Diseñador UI/UX | Eybar Viasus | 11/08/2026 |  |
| Diseñador UI/UX | Alberto Alemán | 11/08/2026 |  |
| Programadora | Alejandra Chambueta | 11/08/2026 |  |
| Programador | David Beltrán | 11/08/2026 |  |
| Tester / QA | Por definir |  |  |
