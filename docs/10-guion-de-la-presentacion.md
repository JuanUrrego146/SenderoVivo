# Guion de la presentación: Sendero Vivo

> Versión 2,0, 11/08/2026 · Responsable: Juan Urrego
> **Qué pide la actividad:** mostrar la **visión del proyecto**, lo que hay en **Jira**, lo que hay en el **repositorio** y alguna **imagen de interfaz** o similar.
> **Dónde está:** diseño de Canva **SenderoVivo** (`DAHSC3fvR_Y`), 10 páginas, 1920 × 1080.
> Duración objetivo: **8 a 10 minutos**, un minuto por diapositiva.

---

## Cómo usar este guion

Cada diapositiva trae **qué se ve**, **qué se dice** y **de dónde sale**. El texto de "qué se dice" no es para leerlo: es el argumento en el orden en que hay que darlo. La versión corta de cada argumento ya está en las **notas del orador** dentro de Canva.

Regla de la presentación: **cada afirmación se muestra en pantalla o no se dice.** Si decimos que el backlog está en Jira, se ve Jira. Si decimos que el repositorio existe, se ve el repositorio.

**La plantilla no se toca.** Estructura, tipografía y posiciones vienen del diseño. Lo único que cambia es el texto y las fotografías.

---

## D1 · Portada

**Qué se ve:** título "Sendero Vivo", la frase de qué es el proyecto y dos fotografías.

**Qué se dice:** una frase, sin adornos: *«Capturamos 200 metros reales de un sendero de los Cerros y los volvemos un lugar que se puede recorrer, ver y escuchar desde cualquier navegador.»*

**De dónde sale:** README §1.

---

## D2 · El problema

**Qué se ve:** título "Gratis, pero a ciegas" y el planteamiento del problema.

**Qué se dice:** los senderos son gratuitos y se reservan por la app del Acueducto. El acceso está resuelto, **la información no**. De ahí salen cuatro cosas observables: la gente se devuelve a mitad de camino, se sale del trazado dentro de una reserva protegida, camina sin entender qué ve, y quien no puede subir nunca conoce el lugar.

**De dónde sale:** [`02-vision-de-proyecto.md`](02-vision-de-proyecto.md) §1.

---

## D3 · La propuesta

**Qué se ve:** título "Los 200 metros" y dos bloques: tres escenas encadenadas y recorrido guiado.

**Qué se dice:** comprometemos 200 metros, no el sendero completo, y esa es una decisión técnica, no de pereza. En un bosque cada metro es geometría nueva: no hay superficies repetibles y el navegador tiene un techo duro de memoria. Sobre esos 200 metros van cinco o seis puntos de interés de fauna, flora y patrimonio.

**De dónde sale:** README §Alcance, [`ADR-001`](decisiones/ADR-001-eleccion-de-sendero.md).

---

## D4 · La tecnología

**Qué se ve:** título "Se captura, no se dibuja" y la explicación del método.

**Qué se dice:** video 4K a 60 fps con celular, extracción de cuadros, entrenamiento 3D Gaussian Splatting, limpieza en SuperSplat, compresión a SOG y carga en PlayCanvas. Todo el stack es abierto y gratuito. La diferencia frente a un render es que quien llega al sendero **reconoce el lugar**.

**De dónde sale:** [`03-avances-tecnologia.md`](03-avances-tecnologia.md).

---

## D5 · Lo que pedía la actividad

**Qué se ve:** título "Lo que pedía la actividad" y los seis puntos resumidos.

**Qué se dice:** los seis puntos están entregados y versionados. Principios de trabajo, visión de proyecto, avances de tecnología, actividades y roles con responsable, requerimientos y plan de trabajo. Se muestran las dos capturas.

**De dónde sale:** documentos 01 a 04, el documento de requerimientos y el plan de trabajo.

---

## D6 · GitHub

**Qué se ve:** título "El repositorio" y tres bloques: una rama por persona, una issue por historia, un solo origen de verdad.

**Qué se dice:** ocho ramas, 51 issues, 42 etiquetas y 9 milestones. El punto que hay que defender es el último: **el backlog vive en un CSV y un script reconstruye GitHub a partir de él.** Mantener el mismo contenido escrito a mano en dos sitios garantiza que se desincronicen.

**De dónde sale:** [`01-principios-de-trabajo.md`](01-principios-de-trabajo.md) §3, [`sync-github.mjs`](../scripts/sync-github.mjs).

---

## D7 · Jira

**Qué se ve:** título "El tablero" y tres bloques: cuatro épicas, ocho sprints, quince entregas semanales.

**Qué se dice:** el curso pide dos cosas que parecen contradecirse, sprints de dos semanas y entregas semanales. Se resuelven poniendo una capa sobre la otra: **el sprint es la unidad de compromiso y la semana es la unidad de entrega.** Cada historia lleva además etiqueta de semana, de W01 a W15, y no hay ninguna casilla persona × semana vacía.

**De dónde sale:** [`plan_de_trabajo.md`](../plan/plan_de_trabajo.md) §7.4 y §8 bis.

---

## D8 · El equipo

**Qué se ve:** título "Seis personas" y tres tarjetas: programación, arte 3D, diseño e interfaz.

**Qué se dice:** doce horas semanales por persona es la exigencia del curso y es la base de todo el cálculo. Cada carpeta tiene un dueño y ese dueño es el revisor por defecto, así que **nadie aprueba su propio trabajo**.

**De dónde sale:** [`04-actividades-y-roles.md`](04-actividades-y-roles.md), [`09-ambitos-de-los-tres-programadores.md`](09-ambitos-de-los-tres-programadores.md).

---

## D9 · Cronograma y campo

**Qué se ve:** título "Quince semanas" y las cuatro salidas de campo.

**Qué se dice:** del 11 de agosto al 28 de noviembre. La visita 1 es de **reconocimiento y no se graba**: va todo el equipo y ahí se deciden el tramo exacto, las etapas, los puntos de interés y el mapa sonoro. Este plan es una guía inicial y está previsto que la V1 lo cambie.

**De dónde sale:** [`07-plan-de-visitas-de-campo.md`](07-plan-de-visitas-de-campo.md).

---

## D10 · Lo que sigue

**Qué se ve:** título "Lo que sigue ahora" y los cuatro datos de referencia.

**Qué se dice:** lo inmediato, antes de tener captura propia, es un **prototipo básico en PlayCanvas** que cargue una escena de prueba y permita moverse por ella. Sirve para validar el motor y el presupuesto de peso antes del Sprint 3. Se publica en una **web estática sobre HTTPS** y el enlace queda en el README. En paralelo, la semana 2 es la visita de reconocimiento.

**De dónde sale:** README §Estado del proyecto, [`arquitectura.md`](arquitectura.md).

---

## Qué capturas hay que tomar y dónde van

Canva no puede recibir capturas privadas de forma automática: hay que arrastrarlas dentro del diseño y soltarlas sobre la fotografía que ocupa el sitio. La imagen se sustituye y la posición no se mueve.

| Diapositiva | Ranura | Qué capturar |
|---|---|---|
| **D5** | fotografía **izquierda** (vertical) | Documento de requerimientos abierto en la **matriz de trazabilidad**, para que se vean las filas y las columnas |
| **D5** | fotografía **derecha** (vertical) | **Jira**, backlog del proyecto SCRUM con las cuatro épicas desplegadas y el conteo de historias |
| **D6** | fotografía **izquierda** | **GitHub**, pestaña Issues con el filtro por etiqueta `resp-` puesto, para que se vea el responsable |
| **D6** | fotografía **derecha** | **GitHub**, lista de ramas (`Branches`) con las ocho visibles |
| **D1, D2, D3, D4, D9** | todas | **Fotografías reales del sendero.** Las de la plantilla son de banco y no corresponden al lugar |

Además, dos capturas de apoyo por si sobra tiempo o el profesor pregunta:

- **Jira**, el tablero del Sprint 1 en curso, con las tarjetas en columnas.
- **GitHub**, la vista de milestones, que muestra los nueve con su avance.

> **Prioridad si no da tiempo a todo:** primero las de D6 (repositorio) y la de Jira en D5. La actividad pide explícitamente Jira y el repositorio.

---

## Reparto de la exposición

| Diapositivas | Quién |
|---|---|
| D1, D2, D3 | Juan Urrego |
| D4 | Alejandra Chambueta |
| D5, D6, D7 | Juan Urrego |
| D8 | Felipe Acevedo o Eybar Viasus |
| D9, D10 | Juan Urrego |

Es un reparto propuesto, no una imposición: lo importante es que **quien hizo cada cosa la cuente**.
