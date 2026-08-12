# Guion de la presentación: Sendero Vivo

> Versión 1,0, 11/08/2026 · Responsable: Juan Urrego
> **Qué pide la actividad:** mostrar lo que está en **Jira**, el **repositorio**, la **visión del proyecto** y **alguna imagen de interfaz** o similar.
> Formato: 10 diapositivas. Duración objetivo: **8–10 minutos**.

---

## Cómo usar este guion

Cada diapositiva trae **qué se ve**, **qué se dice** y **de dónde sale el material**. El texto de "qué se dice" no es para leerlo: es el argumento, en el orden en que hay que darlo.

Regla de la presentación: **cada afirmación se muestra en pantalla o no se dice.** Si decimos que el backlog está en Jira, se ve Jira. Si decimos que el repositorio existe, se ve el repositorio.

---

## D1 · Portada

**Qué se ve**, Título, el fotograma más reconocible del sendero, los cuatro números del tramo.

> **Sendero Vivo**
> Recorrido virtual de 200 m del sector **Claro de Luna**, sendero de la Quebrada La Vieja, Cerros Orientales de Bogotá.
> Capturado con Gaussian Splats. Navegable desde el navegador.

**Qué se dice**, Una frase, sin adornos: *«Capturamos 200 metros reales de un sendero de los Cerros y los volvemos un lugar que se puede recorrer, tocar y escuchar desde cualquier navegador.»*

**Material**, Portada de `55354807-Sendero_Vivo_Presentacion.pdf`.

---

## D2 · El problema

**Qué se ve**, Los tres números del sendero completo (7,3 km · +406 m · ~3 h) y las cuatro consecuencias.

**Qué se dice**, Los senderos son gratuitos y se reservan por app: el acceso está resuelto, **la información no**. De ahí salen cuatro cosas observables: la gente se devuelve a mitad de camino, se sale del trazado dentro de una reserva protegida, camina sin entender qué ve, y quien no puede subir nunca conoce el lugar.

**Material**, `docs/02-vision-de-proyecto.md` §1 · diapositiva 2 del PDF del equipo.

---

## D3 · La visión del proyecto

> **Esta es la diapositiva que responde el punto "visión del proyecto" de la actividad.** Es el centro de la presentación: si solo se ve una, que sea esta.

**Qué se ve**, Los tres verbos, grandes, con un ejemplo debajo de cada uno.

| **Reconocer** | **Entender** | **Medir** |
|---|---|---|
| Ver el camino real y saber a qué se va | Aves, plantas e historia del lugar, en fichas 3D | Altitud, distancia, desnivel y pendiente reales |

**Qué se dice**, La decisión que define el proyecto es **capturado, no modelado**. Un bosque modelado a mano es la interpretación de un artista sobre cómo se ve un bosque. Un Gaussian Splat **es** el bosque, con su desorden y con la luz de esa mañana. Para una aplicación cuyo propósito es que reconozcas el lugar cuando llegues, esa diferencia es todo el producto.

Cerrar con el alcance, porque un alcance cerrado también es parte de la visión: **200 m, tres escenas, 5–6 puntos de interés.** Y la lista de lo que no se hace es vinculante: no el sendero completo, no caminar libre, no app nativa, no VR, no dron, no un segundo sendero.

**Material**, `docs/02-vision-de-proyecto.md` §3 y §4. En el documento de requerimientos, la visión está en la sección 3.1.

---

## D4 · Así se ve

**Qué se ve**, **Esta es la diapositiva de imagen de interfaz que pide la actividad.** Composición de tres piezas:

1. La ficha de punto de interés con el visor 3D, colibrí chillón, nombre científico en cursiva, controles de audio.
2. El HUD con los cuatro datos del recorrido.
3. La paleta: grises, negros y verdes, con el verde-azulado de la quebrada.

**Qué se dice**, La interfaz aparece sobre todo cuando el visitante toca un punto de interés. Paleta de grises, negros y verdes: **el fondo no compite con la escena capturada, y el verde marca lo vivo**. Un solo acento distinto, el verde-azulado, reservado para el agua y para los datos.

**Material**, Diapositivas 3 y 6 del PDF del equipo · `docs/06-identidad-visual.md` §4 y §5 (los tokens y el esquema de la ficha están ahí, con los contrastes ya calculados).

> **Pendiente de producir:** el mockup de la ficha con la paleta aplicada. Responsable: **Eybar Viasus**. Es lo único de la presentación que todavía no existe como imagen.

---

## D5 · Los puntos de interés

**Qué se ve**, El recorrido con tres marcadores flotantes y una ficha abierta.

**Qué se dice**, Mientras se recorre aparecen marcadores anclados a **lugares reales** del tramo, no a la pantalla. Al tocarlos se abre la ficha:

- El modelo 3D girable, **con animación de aleteo**, el ave se ve viva, no como una figura quieta.
- Nombre común y nombre científico verificados contra fuente citable.
- **Su canto**: grabado en el sendero.
- A qué altura vive y **consejos para avistarla en campo**.

Y hay puntos que no están vivos: **puertas derrumbadas, muros, monumentos, tramos de camino con historia**. Se ven en detalle, con su historia y con su fuente.

**Material**, Diapositivas 4 y 5 del PDF del equipo · `docs/05-catalogo-fauna-y-flora.md`.

---

## D6 · Lo que hay realmente en el sendero

**Qué se ve**, Tabla corta: las cifras del Acueducto (119 aves, 63 mamíferos, 8 anfibios, 6 reptiles) y cuatro especies con su nombre científico.

**Qué se dice**, El contenido no lo inventamos: la ficha oficial del Acueducto reporta 119 especies de aves y 63 de mamíferos para esta quebrada. El **zorro perro** (*Cerdocyon thous*) está reportado nominalmente para la Quebrada La Vieja y es el mamífero mediano más registrado en cámaras trampa de los Cerros.

Y la regla de la que estamos más orgullosos: **lo que no está verificado contra fuente citable no se publica**, se marca como pendiente. Un dato biológico falso en una app que la gente se cree es un error del proyecto, no un detalle.

**Material**, `docs/05-catalogo-fauna-y-flora.md` §2, §3 y §4, con las fuentes en §7.

---

## D7 · El repositorio

> **Esta es la diapositiva que responde el punto "repositorio" de la actividad.** Se muestra en vivo si hay red; si no, capturas.

**Qué se ve**, `github.com/JuanUrrego146/SenderoVivo`, y dentro:

- El árbol de ramas: `main` → `develop` → cuatro ramas de épica.
- La lista de issues con sus etiquetas de sprint, épica y responsable.
- Los milestones con fecha.
- La carpeta `docs/` con los documentos.

**Qué se dice**, El repositorio no es un sitio donde subir el código al final: es donde vive el trabajo desde el primer día. Ramas por épica con dueño, una issue por historia, etiquetas de sprint y de responsable, milestones con fecha real. **Cada issue cita el requerimiento que implementa**, si una tarea no traza a un RF, o sobra la tarea o falta el requerimiento.

**Material**, El repositorio.

---

## D8 · Jira

> **Esta es la diapositiva que responde el punto "Jira" de la actividad.**

**Qué se ve**, El proyecto **SCRUM** en Jira (unimilitar-team-ic64wte1.atlassian.net):

- El tablero con las épicas E1–E4.
- El backlog con las historias del Sprint 1 y del Sprint 2.
- Una historia abierta, con sus subtareas y su responsable.

**Qué se dice**, Cuatro épicas, ocho sprints de dos semanas, del 11 de agosto al 28 de noviembre. Cada historia tiene criterios de aceptación, subtareas repartidas por persona y su estimación en puntos. **Jira y GitHub están coordinados**: la misma numeración HU, las mismas etiquetas de sprint, los mismos responsables.

Y el dato que exige el curso: **12 horas semanales por persona.** Seis personas, quince semanas: 1.080 horas de capacidad contra una demanda estimada de 1.052, con el margen del 50 % ya incluido.

**Material**, Jira · `plan/backlog-jira.csv` · `plan/plan_de_trabajo.md` §6.

> **Listo:** el proyecto **SCRUM** existe, con las 4 épicas y las 51 historias cargadas bajo ellas, cada una con responsable, sprint y puntos de historia.

---

## D9 · Cómo se trabaja y quién hace qué

**Qué se ve**, El equipo con sus roles y el reparto de carpetas de los tres programadores.

**Qué se dice**, Seis personas, seis roles: un PM/integrador, tres programadores, un artista 3D y dos de UI/UX. Cada programador tiene **una carpeta, no un tema**: Alejandra el motor, David los puntos de interés, los datos y el audio, Juan el cableado y los contratos. Entre ámbitos hay **tres fronteras escritas**, para que nadie tenga que adivinar quién llama a quién.

Y **cuatro visitas de campo de cinco horas**. La primera es la semana que viene: **reconocimiento, sin grabar**, con todo el equipo. Ahí se decide el tramo exacto, dónde van los puntos de interés y cómo suena el sendero. Grabar antes de haber decidido es como se pierde la única mañana buena.

**Material**, `docs/09-ambitos-de-los-tres-programadores.md` · `docs/07-plan-de-visitas-de-campo.md`.

---

## D10 · Cierre

**Qué se ve**, La frase, y debajo el estado real.

> **Capturamos un pedazo real de los Cerros y lo volvemos un lugar que se puede recorrer, tocar, escuchar y entender desde cualquier navegador.**

**Qué se dice**, Estado honesto: la especificación, la arquitectura y el plan están cerrados; el repositorio y el backlog están montados; **todavía no hay código y no lo habrá hasta el Sprint 3**, porque antes hay que ir al sendero. La semana que viene vamos a reconocer el terreno.

Y lo que este plan es de verdad: **una guía inicial, no el plan definitivo**. Lo que salga de la visita de reconocimiento va a cambiar cosas, y eso está previsto.

---

## Antes de presentar: lista de comprobación

| # | Qué | Responsable | Estado |
|---|---|---|---|
| 1 | ~~Crear el proyecto en Jira e importar el backlog~~ | Juan Urrego |  Hecho, proyecto `SCRUM`, 4 épicas y 51 historias |
| 2 | ~~Desbloquear el push del repositorio~~ | Juan Urrego |  Hecho, 6 ramas en remoto, `develop` por defecto |
| 3 | **Capturar los 3 pantallazos** (GitHub, Jira, documento) y soltarlos en las páginas 6, 7 y 9 de Canva | **Juan Urrego** |  **Bloqueante** |
| 3b | Mockup de la ficha con la paleta aplicada (D4) | Eybar Viasus |  Pendiente |
| 4 | Capturas de Jira y de GitHub por si falla la red | Juan Urrego |  Pendiente |
| 5 | Confirmar la reserva de V1 en la app del Acueducto para las seis personas | Juan Urrego |  Pendiente |
| 6 | Ensayo cronometrado | Todo el equipo |  Pendiente |

**El punto 3 es el único bloqueante que queda.** Las diapositivas están montadas en Canva (SenderoVivoVisionYRoles) con el texto y las notas del orador; faltan las tres capturas, que no se pueden subir desde aquí porque el repositorio y Jira son privados y el conector de Canva solo acepta URLs públicas.

---

## Qué pregunta el profesor, casi seguro

| Pregunta | Respuesta corta | Dónde está el respaldo |
|---|---|---|
| ¿Por qué solo 200 metros? | En un bosque cada metro es geometría nueva y el navegador tiene un techo duro de memoria y de ordenamiento por profundidad. 200 m impecables valen más que 500 con ruido | `02-vision-de-proyecto.md` §4.2 |
| ¿Y si el clima impide la captura? | Cuatro visitas, no una. V3 es la ventana de contingencia. Y el modelado 3D no depende de la captura, así que un retraso no paraliza al equipo | `07-plan-de-visitas-de-campo.md` §1.1 |
| ¿Cómo saben que va a correr en un celular? | No lo sabemos todavía, y está escrito como riesgo R2 con tres planes de choque escalonados. Se mide en el Sprint 4 contra un dispositivo concreto | `03-avances-tecnologia.md` §7 |
| ¿De dónde salen los datos de las especies? | De la ficha oficial del Acueducto y de fuentes citables. Lo no verificado va marcado y no se publica | `05-catalogo-fauna-y-flora.md` §7 |
| ¿Cuántas horas dedica cada uno? | 12 h semanales por persona. Capacidad 1.080 h, demanda estimada 1.052 h con margen del 50 % incluido | `plan/plan_de_trabajo.md` §6 |
| ¿Por qué tres programadores y no todos programando? | Porque el 48 % del esfuerzo es producción de contenido, no código. Modelar, capturar y grabar no es tiempo de programador | `plan/plan_de_trabajo.md` §6 |
| ¿No están al 97 % de la capacidad? | Sí, y está escrito así en el plan. El colchón real son las 351 h de margen ya incluidas, no la holgura. Por eso la Etapa 4 no está comprometida | `plan/plan_de_trabajo.md` §7.1 |
