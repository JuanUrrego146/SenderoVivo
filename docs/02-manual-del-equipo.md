# Manual del equipo: Sendero Vivo

> Versión 1,1, 17 de agosto de 2026 (antes «principios de trabajo», 01).
> Acordado en la reunión de inicio del **11 de agosto de 2026**; el acta está al final.
> Vigente durante las 15 semanas del proyecto (11 ago – 28 nov de 2026).

Este documento es el contrato de trabajo del equipo. No describe cómo queremos trabajar en abstracto: describe qué se considera aceptable y qué no, para un equipo de seis personas que además es primerizo en las tres tecnologías centrales del proyecto (Gaussian Splatting, SuperSplat/SOG y PlayCanvas) al mismo tiempo.

---

## 1. Los cinco principios

### P1: Lo capturado manda sobre lo modelado
El sendero es un lugar real dentro de una reserva protegida. La geometría del recorrido sale de la captura fotogramétrica, no del criterio artístico de nadie. Si la reconstrucción de una zona sale mal, se vuelve a capturar o se recorta el tramo: **no se modela a mano un pedazo de sendero para "arreglarlo"**. Lo que sí se modela es lo que la captura no puede resolver (aves, plantas de detalle, el puente `[por confirmar en V1 que existe en el tramo]`, la señalización), y eso va siempre declarado como pieza modelada, no como parte del terreno.

### P2: El alcance está cerrado y no se negocia por entusiasmo
La lista de "no lo hacemos" ([`01-vision-y-alcance.md`](01-vision-y-alcance.md) §4.2) es tan vinculante como la de "sí". Una idea nueva no entra al sprint: entra al backlog, y solo se discute en la revisión de sprint. Nadie implementa nada que no esté trazado a un RF. Si una tarea no cita un RF o RNF, o sobra la tarea o falta el requerimiento, y entonces se agrega el requerimiento primero.

### P3: Nadie se bloquea más de un día en silencio
Somos primerizos en el stack. Atascarse es lo esperado, no la excepción. Lo inaceptable es atascarse callado. Regla dura: **24 horas hábiles de bloqueo sin avance ⇒ se escribe en el canal del equipo**, con qué se intentó y qué falló. Pedir ayuda a tiempo no es debilidad; es la única forma de que quepan **16 semanas de esfuerzo en 14 de calendario dejando la semana 15 entera para el cierre**.

### P4: Espacios listos antes de que lleguen los demás
El integrador (Juan) deja preparados los contratos de datos, las carpetas y los puntos de extensión **antes** de que artistas y programadores necesiten usarlos. Un artista no debe esperar a que exista el motor para exportar un modelo, ni un programador debe inventarse el formato del JSON de POIs. Esto es lo que permite que E3 (modelado) corra en paralelo con E1 (procesamiento).

### P5: Cada entrega se prueba en un celular de verdad
El objetivo es el navegador móvil. Una funcionalidad que solo se probó en el escritorio del desarrollador **no está terminada**. El rendimiento en gama media (RNF-001) es un requisito, no una aspiración de la última semana.

---

## 2. Definición de "hecho" (Definition of Done)

Una historia está **hecha** cuando cumple **todos** estos puntos. No hay "hecho al 90 %".

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | Cumple todos sus criterios de aceptación | Quien revisa los recorre uno por uno contra la issue |
| 2 | Cita el/los RF o RNF que implementa | Enlace en la descripción de la issue |
| 3 | Funciona en Chrome escritorio **y** en un celular real | Se abre la **URL de la rama** (`https://dev-<nombre>.senderovivo.pages.dev`) desde el celular; ya no hace falta adjuntar video |
| 4 | No baja de 30 fps en el celular de referencia | Medición con el profiler de PlayCanvas o contador en pantalla |
| 5 | Revisada y aprobada por otra persona | El revisor de la carpeta (§4) revisa los commits o la URL de la rama y deja su visto bueno en la issue |
| 6 | Integrada a `develop` sin conflictos pendientes | Verificación manual (CONTEXTO-EQUIPO §8) + el despliegue de Cloudflare Pages en verde |
| 7 | Documentada si cambia un contrato de datos | Actualización de `CONTEXTO-EQUIPO.md` y de `docs/03-arquitectura.md` §6 en el mismo cambio |
| 8 | Los textos visibles están en español | Revisión visual |

### "Hecho" para piezas que no son código

- **Escena capturada:** procesada, limpia en SuperSplat, **exportada como carpeta SOG desempaquetada** (`assets/scenes/<id>/` con `meta.json` + `.webp` — nunca el `.sog` empaquetado, que supera el límite de 25 MiB por archivo de Cloudflare), dentro del presupuesto de peso, **con su `sceneUp` medido y anotado**, cargando derecha en el visor y declarada en `scenes.json`.
- **Modelo 3D:** dentro del presupuesto de triángulos y de peso, exportado a `.glb`, con nombre común y científico verificados, cargando en el visor de ficha sin errores de material.
- **Pantalla de UI:** con estados de carga, error y vacío resueltos; contraste AA verificado; probada en 375 px de ancho.
- **Documento:** revisado por una segunda persona y con la fecha de la versión actualizada.

---

## 3. Flujo de ramas

Modelo **Git Flow simplificado**, con **una rama por persona**: cada quien trabaja en la suya y nadie se pisa.

```
main                       ← solo versiones entregables (hitos y entrega final). Protegida.
└── develop                ← integración continua del equipo. Todo pasa por aquí.
    ├── dev/juan-urrego
    ├── dev/alejandra-chambueta
    ├── dev/david-beltran
    ├── dev/felipe-acevedo
    ├── dev/eybar-viasus
    └── dev/alberto-aleman
```

**Reglas (modelo vigente desde el 13/08: sin Pull Requests, con push directo):**

1. **Cada persona trabaja en su propia rama `dev/<nombre>` y hace push directo a ella.** Es su espacio: sube cuando quiera y todas las veces que quiera, sin pedir permiso ni romperle nada a nadie. Cada push despliega solo su URL de rama.
2. Si alguien quiere separar una historia concreta, abre una rama hija de la suya: `dev/alejandra-chambueta/HU-18-avance-retroceso`. Es opcional.
3. **La rama de cada persona se integra a `develop` al menos una vez por semana**, coincidiendo con la entrega semanal del viernes. La integración la hace **Juan (integrador)** mediante merge directo, después de la revisión de §4. Una rama que lleva más de una semana sin integrarse es un problema que se dice en la sincronización, no en la demo.
4. `develop` → `main` solo en los hitos: fin de S4 (motor navegable), fin de S6 (experiencia completa) y entrega final.
5. **Antes de empezar el día, `git pull` de `develop` a tu rama.** El reparto por carpetas ([`03-arquitectura.md`](03-arquitectura.md)) hace que los conflictos sean raros, pero raros no es ninguno.

### 3.1 Despliegue continuo por rama

Cada push a cualquier rama publica automáticamente en Cloudflare Pages:

| Rama | URL |
|---|---|
| `develop` (producción) | <https://senderovivo.pages.dev> |
| `dev/<nombre>` | `https://dev-<nombre>.senderovivo.pages.dev` (ej.: `dev-david-beltran.senderovivo.pages.dev`) |

La URL de rama es el medio de prueba en celular (DoD fila 3) y el medio de revisión (§4). El
despliegue tarda 1–2 minutos tras el push.

> **Por qué por persona y no por épica.** Las épicas se solapan, S2b corre en paralelo con S2, y S5 y S6 comparten módulos con S3 y S4, así que una rama por épica acaba con dos personas dentro. Una rama por persona no tiene esa ambigüedad: si hay un conflicto, hay exactamente dos nombres que hablar.

**Mensajes de commit**, Conventional Commits, en español:

```
feat(motor): avanzar y retroceder sobre el trazado guiado (RF-003)
fix(poi): la ficha ya no pierde la posición de cámara al cerrarse (RF-018)
docs(arquitectura): diagrama de secuencia de carga de escena
chore(assets): comprimir escena 02 a SOG
```

El tipo va en inglés (`feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`), el resto en español, y **siempre** el ID del requerimiento cuando aplique.

---

## 4. Revisión de código

Sin PRs, la revisión no desaparece: cambia de lugar. **Se revisa sobre los commits de la rama
y sobre su URL desplegada**, y el visto bueno queda escrito en la issue de la historia antes
de que Juan integre a `develop`.

- **Una aprobación obligatoria** por historia. Nunca se aprueba el propio trabajo.
- **Revisa el dueño de la carpeta.** Cada carpeta tiene uno (ver [`03-arquitectura.md`](03-arquitectura.md)), y eso da el revisor sin discutirlo. **Esta tabla es la única copia de la regla de revisores:**

  | Autor | Revisor por defecto |
  |---|---|
  | Alejandra (`src/engine/`) | **David** |
  | David (`src/poi/`, `src/data/`, `src/audio/`) | **Alejandra** |
  | Juan (`src/app/`, `src/ui/`, `config/`) | **Alejandra** o **David**, alternando |
  | Eybar / Alberto (`styles/`) | El otro de los dos, y **Juan** si cambian tokens |
  | Felipe (`assets/`) | **Juan** |

Juan no es revisor único de nada: si él integra y además revisa todo, deja de haber revisión.
- **Tamaño máximo recomendado:** 400 líneas de diff por revisión. Un cambio más grande se parte, salvo que sea generado (assets, datos).
- **Plazo de respuesta:** 24 horas hábiles. Pasado ese plazo, quien pidió la revisión la escala en el canal del equipo.
- **Qué se revisa, en este orden:**
  1. ¿Hace exactamente lo que dice el RF citado? ¿Ni más ni menos?
  2. ¿Rompe algún RNF vigente (fps, peso, contraste, español)?
  3. ¿Respeta los invariantes de arquitectura de `docs/03-arquitectura.md`?
  4. ¿Introduce dependencias nuevas? Si sí, ¿está justificado en la issue?
  5. Legibilidad y nombres (código y variables en inglés).
- **Tono:** se comenta el código, no a la persona. Una objeción sin propuesta alternativa no bloquea la integración.

**Cambios que NO requieren revisión de código:** solo documentación (`docs/**.md`) y subida de assets brutos. Todo lo demás sí.

---

## 5. Ceremonias y frecuencia

| Ceremonia | Cuándo | Duración | Quién | Para qué |
|---|---|---|---|---|
| **Planeación de sprint** | Lunes de semana impar del sprint | 60 min | Todo el equipo | Elegir historias, estimar, repartir subtareas |
| **Sincronización corta** | Martes y viernes | 15 min | Todo el equipo | Qué hice / qué sigo / qué me bloquea |
| **Entrega semanal** | **Viernes de cada semana** | 20 min | Todo el equipo | Enseñar lo que cierra esa semana, sobre lo que ya está en `develop` |
| **Revisión de sprint (demo)** | Viernes de cierre de sprint | 45 min | Todo el equipo | Mostrar funcionando en un celular real |
| **Retrospectiva** | Inmediatamente después de la demo | 30 min | Todo el equipo | Qué mantener, qué cambiar, un solo compromiso |
| **Revisión técnica de riesgo** | A demanda, la convoca cualquiera | 30 min | Los implicados | Desatascar decisiones técnicas |

**Sobre la entrega semanal.** El curso exige entregar todas las semanas y el enunciado exige sprints de dos semanas. Se resuelve así: **el sprint es la unidad de compromiso; la semana es la unidad de entrega.** Cada historia lleva su etiqueta de semana (`W01`…`W15`) en Jira y en GitHub, además de la de sprint, así que filtrando por semana sale exactamente lo que toca enseñar ese viernes. El calendario completo está en [`../plan/plan_de_trabajo.md`](../plan/plan_de_trabajo.md) §8 bis.

**Reglas de las ceremonias:**
- La entrega semanal se enseña **sobre `develop`**, no sobre la rama de nadie. Si una semana no hay nada enseñable, se dice ahí, no se maquilla ni se deja para la demo del sprint.
- La sincronización corta es de 15 minutos reales. Lo que se pase, se saca a una reunión aparte.
- La demo se hace sobre lo que está en `develop`, no sobre la rama de nadie.
- La retro produce **un solo compromiso concreto** con dueño y fecha. Uno. Diez compromisos son cero compromisos.
- Nadie presenta trabajo que no cumple la definición de "hecho". Se presenta como "en curso" y punto.

---

## 6. Canales de comunicación

| Canal | Para qué | Tiempo de respuesta esperado |
|---|---|---|
| **Canal de chat del equipo** | Coordinación diaria, bloqueos, preguntas rápidas | Mismo día hábil |
| **Issues de GitHub** | Todo lo que sea trabajo: alcance, criterios, discusión técnica de una historia | 24 h hábiles |
| **Pull Requests** | Discusión sobre código concreto | 24 h hábiles |
| **Jira (proyecto SCRUM)** | Estado del sprint, tablero, puntos, seguimiento del cronograma | Actualización diaria por cada quien. **GitHub lleva el detalle de cada historia; Jira es su espejo con resumen y enlace** (acordado el 13/08). `plan/backlog-jira.csv` y `scripts/sync-github.mjs` quedaron **deprecados**: el backlog se edita directo en GitHub y en Jira |
| **Reuniones (ver §5)** | Decisiones que requieren acuerdo del grupo | En el momento |
| **`docs/decisiones/ADR-*.md`** | Decisiones de arquitectura o de alcance que hay que poder justificar meses después | Permanente |

**Reglas:**
- **Una decisión que no quedó escrita no ocurrió.** Si se decide algo en una llamada, alguien lo escribe en la issue o en un ADR ese mismo día.
- Las discusiones técnicas de una historia van en su issue, no en el chat. El chat se pierde; la issue queda.
- Nadie tiene obligación de responder fuera de su horario. La urgencia real se acuerda en la reunión, no se impone por chat a las 11 de la noche.

---

## 7. Cómo se resuelven los bloqueos

Escalado en tres niveles, con reloj:

**Nivel 1, Autonomía (primeras 24 h hábiles).**
Se intenta resolver solo: documentación oficial, foro de PlayCanvas, ejemplos del motor, preguntar a una IA. Se anota qué se probó.

**Nivel 2, El equipo (24–48 h).**
Se escribe en el canal con el formato: *qué intento hacer · qué probé · qué error me da · qué necesito*. El dueño de la épica correspondiente responde primero. Si es transversal, responde Juan.

**Nivel 3, Decisión (más de 48 h).**
Se convoca la revisión técnica de riesgo (§5). De ahí sale **una** de estas cuatro salidas, y queda escrita:

1. **Se resuelve**, alguien lo desatasca, se documenta la solución.
2. **Se cambia el enfoque**, se busca otro camino técnico dentro del stack. Nunca fuera de él sin ADR.
3. **Se reduce**, la historia se recorta a una versión más simple que sigue cumpliendo el RF, y se anota qué se recortó.
4. **Se aplaza y se aísla**, sale del sprint, se marca `blocked` en GitHub, y se documenta qué la desbloquearía.

**Bloqueos técnicos ya anticipados** (detalle y planes de choque en
[`01-vision-y-alcance.md`](01-vision-y-alcance.md) §6, R1–R3):
- La reconstrucción de la vegetación densa sale con ruido o "flotantes". *(Ya pasó con la escena de prueba: la receta de limpieza que funciona está en [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §12.4 y §17.)*
- La escena SOG pesa más de lo que aguanta un celular de gama media. *(Ya no es un riesgo anticipado: está **medido** — 70 MB, 58,7 s a 10 Mbps. La respuesta es el techo de 1,5 M de gaussianas de [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §14.)*
- El clima impide la salida de campo en la ventana prevista.

---

## 8. Qué se hace cuando alguien no alcanza

Este equipo es de seis personas con carga académica simultánea. Que alguien no alcance en algún sprint **es un escenario previsto, no una falta**. Lo que sí es una falta es enterarse el viernes de la demo.

**Regla de aviso temprano:** si a mitad del sprint (final de la primera semana) alguien ve que no llega, lo dice en la sincronización del viernes. No hay ninguna consecuencia por avisar a tiempo. Sí la hay por no avisar: se descubre en la demo y arrastra a los demás.

**Procedimiento, en orden:**

1. **Se replantea la historia, no la persona.** Primero se pregunta si la historia estaba mal estimada o mal cortada. Casi siempre lo estaba.
2. **Se parte.** Se saca la mitad que sí se puede terminar, se cierra esa, y el resto vuelve al backlog con su estimación corregida.
3. **Se empareja.** Otra persona con holgura entra a trabajar con quien está atascado, juntos, no reemplazándolo. El conocimiento se queda en dos cabezas en lugar de una.
4. **Se reasigna.** Solo si la persona sigue sin disponibilidad el siguiente sprint. La historia cambia de dueño en Jira y en GitHub, sin discusión moral.
5. **Se protege el camino crítico.** Si lo que no alcanzó está en el camino crítico (E1 en S1–S2, E2 en S3–S4), tiene prioridad sobre cualquier otra cosa del sprint y el equipo se reorganiza alrededor.

**Ausencias previstas** (parciales, viajes, exámenes): se anuncian en la planeación del sprint y se descuentan de la capacidad **antes** de comprometer historias. Un sprint con menos capacidad lleva menos historias, no las mismas historias con más presión.

**Sobre el margen de estimación:** el plan de trabajo (`plan/plan_de_trabajo.md`) ya reserva un margen amplio precisamente para esto. Consumirlo no es fracasar: es usar el plan como fue diseñado. Lo que sí se vigila en cada retro es **cuánto margen queda**, para saber a tiempo si hay que recortar alcance.

---

## 9. Reglas de contenido y de campo

Estas no son negociables porque el proyecto se hace dentro de una reserva natural protegida y sobre información biológica que la gente va a creerse.

1. **Nada de datos inventados.** Altitudes, distancias, desniveles, alturas de distribución de una especie: o están medidos/verificados, o van marcados con la marca de pendiente que corresponda. **La lista de marcas es cerrada** — `[por medir en campo]` (dato físico que exige ir al sitio), `[por verificar]` (dato que exige fuente citable), `[por completar]` (contenido editorial pendiente), `[por definir …]` y `[por confirmar …]` (decisiones pendientes) — y ningún agente ni persona normaliza una a otra: significan cosas distintas. Un dato inventado en una ficha de fauna es un error del proyecto, no un detalle.
2. **Nombre científico verificado** contra una fuente ornitológica o botánica citable antes de publicar cualquier ficha.
3. **En campo se respeta el trazado autorizado.** La captura no sale del sendero. Ni por un mejor ángulo.
4. **Reserva previa obligatoria** por la app del Acueducto para cada salida, como cualquier visitante.
5. **La app nunca sugiere salirse del camino.** El diseño refuerza el trazado autorizado (RF-004, RNF-015).

---

## 10. Convenciones fijas

| Aspecto | Regla |
|---|---|
| Idioma de documentos, UI y contenidos | **Español** |
| Idioma de código, variables, funciones, ramas | **Inglés** |
| Formato de fechas en documentos | `DD/MM/AAAA` |
| Identificadores | `RF-0NN`, `RNF-0NN`, `CUS-0NN`, `HU-NN`, `ADR-0NN` |
| Etiquetas de sprint | `S1`, `S2`, `S2b`, `S3` … `S7`, `Cierre` |
| Etiquetas de semana | `W01` … `W15` |
| Nombres en código | `camelCase` funciones y variables · `PascalCase` clases · `kebab-case` archivos de assets |
| Unidades | Sistema métrico. Altitud en msnm, distancia en m, pendiente en % |
| Assets pesados | El material **bruto** nunca en Git (`assets/raw/`, `*.ply`, `*.sog`, video). **Excepción del 14/08:** las escenas procesadas en SOG **desempaquetado** (`assets/scenes/<id>/`, `meta.json` + `.webp`) sí se versionan. Ver `.gitignore` |

---

## Registro de acuerdo

| Rol | Nombre | Fecha |
|---|---|---|
| PM + Programador/Integrador | Juan Urrego | 11/08/2026 |
| Artista 3D | Felipe Acevedo | 11/08/2026 |
| Diseñador UI/UX | Eybar Viasus | 11/08/2026 |
| UI/UX | Alberto Alemán | 11/08/2026 |
| Programadora | Alejandra Chambueta | 11/08/2026 |
| Programador | David Beltrán | 11/08/2026 |
