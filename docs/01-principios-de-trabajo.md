# Principios de trabajo — Sendero Vivo

> Punto 1 de la actividad del curso (primera mitad).
> Acordado en la reunión de inicio del **11 de agosto de 2026**.
> Vigente durante las 15 semanas del proyecto (11 ago – 24 nov de 2026).

Este documento es el contrato de trabajo del equipo. No describe cómo queremos trabajar en abstracto: describe qué se considera aceptable y qué no, para un equipo de seis personas que además es primerizo en las tres tecnologías centrales del proyecto (Gaussian Splatting, SuperSplat/SOG y PlayCanvas) al mismo tiempo.

---

## 1. Los cinco principios

### P1 — Lo capturado manda sobre lo modelado
El sendero es un lugar real dentro de una reserva protegida. La geometría del recorrido sale de la captura fotogramétrica, no del criterio artístico de nadie. Si la reconstrucción de una zona sale mal, se vuelve a capturar o se recorta el tramo: **no se modela a mano un pedazo de sendero para "arreglarlo"**. Lo que sí se modela es lo que la captura no puede resolver (aves, plantas de detalle, el puente, la señalización), y eso va siempre declarado como pieza modelada, no como parte del terreno.

### P2 — El alcance está cerrado y no se negocia por entusiasmo
La lista de "no lo hacemos" (README y `docs/02-vision-de-proyecto.md`) es tan vinculante como la de "sí". Una idea nueva no entra al sprint: entra al backlog, y solo se discute en la revisión de sprint. Nadie implementa nada que no esté trazado a un RF. Si una tarea no cita un RF o RNF, o sobra la tarea o falta el requerimiento — y entonces se agrega el requerimiento primero.

### P3 — Nadie se bloquea más de un día en silencio
Somos primerizos en el stack. Atascarse es lo esperado, no la excepción. Lo inaceptable es atascarse callado. Regla dura: **24 horas hábiles de bloqueo sin avance ⇒ se escribe en el canal del equipo**, con qué se intentó y qué falló. Pedir ayuda a tiempo no es debilidad; es la única forma de que 14 semanas alcancen.

### P4 — Espacios listos antes de que lleguen los demás
El integrador (Juan) deja preparados los contratos de datos, las carpetas y los puntos de extensión **antes** de que artistas y programadores necesiten usarlos. Un artista no debe esperar a que exista el motor para exportar un modelo, ni un programador debe inventarse el formato del JSON de POIs. Esto es lo que permite que E3 (modelado) corra en paralelo con E1 (procesamiento).

### P5 — Cada entrega se prueba en un celular de verdad
El objetivo es el navegador móvil. Una funcionalidad que solo se probó en el escritorio del desarrollador **no está terminada**. El rendimiento en gama media (RNF-001) es un requisito, no una aspiración de la última semana.

---

## 2. Definición de "hecho" (Definition of Done)

Una historia está **hecha** cuando cumple **todos** estos puntos. No hay "hecho al 90 %".

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | Cumple todos sus criterios de aceptación | Quien revisa los recorre uno por uno en la PR |
| 2 | Cita el/los RF o RNF que implementa | Enlace en la descripción de la issue/PR |
| 3 | Funciona en Chrome escritorio **y** en un celular real | Captura o video corto adjunto a la PR |
| 4 | No baja de 30 fps en el celular de referencia | Medición con el profiler de PlayCanvas o contador en pantalla |
| 5 | Revisada y aprobada por otra persona | 1 aprobación obligatoria en la PR |
| 6 | Fusionada a `develop` sin conflictos pendientes | CI/checks en verde |
| 7 | Documentada si cambia un contrato de datos | Actualización de `context-for-vibe-coding.md` en la misma PR |
| 8 | Los textos visibles están en español | Revisión visual |

### "Hecho" para piezas que no son código

- **Escena capturada:** procesada, limpia en SuperSplat, comprimida a SOG, dentro del presupuesto de peso, cargando en el visor y declarada en `scenes.json`.
- **Modelo 3D:** dentro del presupuesto de triángulos y de peso, exportado a `.glb`, con nombre común y científico verificados, cargando en el visor de ficha sin errores de material.
- **Pantalla de UI:** con estados de carga, error y vacío resueltos; contraste AA verificado; probada en 375 px de ancho.
- **Documento:** revisado por una segunda persona y con la fecha de la versión actualizada.

---

## 3. Flujo de ramas

Modelo **Git Flow simplificado**, ajustado a que hay cuatro épicas con dueños distintos.

```
main                 ← solo versiones entregables (hitos y entrega final). Protegida.
└── develop          ← integración continua del equipo. Todo pasa por aquí.
    ├── epic/captura-reconstruccion      (E1 — Juan Urrego)
    ├── epic/motor-recorrido             (E2 — Alejandra Chambueta)
    ├── epic/pois-fichas                 (E3 — Felipe Acevedo + David Beltrán)
    └── epic/datos-experiencia           (E4 — Eybar Viasus + Alberto Alemán)
```

**Reglas:**

1. `main` y `develop` están protegidas: nadie hace push directo. Solo se entra por Pull Request.
2. El trabajo diario ocurre en ramas hijas de la rama de épica:
   `epic/motor-recorrido/HU-18-avance-retroceso`
3. Nombre de rama: `epic/<épica>/HU-<nn>-<descripción-corta-en-kebab-case>`.
4. La rama de épica se fusiona a `develop` **al cerrar cada sprint**, no al final de la épica.
5. `develop` → `main` solo en los hitos: fin de S4 (motor navegable), fin de S6 (experiencia completa) y entrega final.
6. Una rama que lleva más de un sprint sin fusionarse es un problema que se escala en la retro.

**Mensajes de commit** — Conventional Commits, en español:

```
feat(motor): avanzar y retroceder sobre el trazado guiado (RF-003)
fix(poi): la ficha ya no pierde la posición de cámara al cerrarse (RF-018)
docs(arquitectura): diagrama de secuencia de carga de escena
chore(assets): comprimir escena 02 a SOG
```

El tipo va en inglés (`feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`), el resto en español, y **siempre** el ID del requerimiento cuando aplique.

---

## 4. Revisión de código

- **Una aprobación obligatoria** por PR. Nunca se aprueba el propio trabajo.
- **Revisa el dueño de la carpeta.** Cada carpeta tiene uno (ver [`09-ambitos-de-los-tres-programadores.md`](09-ambitos-de-los-tres-programadores.md)), y eso da el revisor sin discutirlo:

  | Autor | Revisor por defecto |
  |---|---|
  | Alejandra (`src/engine/`) | **David** |
  | David (`src/poi/`, `src/data/`, `src/audio/`) | **Alejandra** |
  | Juan (`src/app/`, `src/ui/`, `config/`) | **Alejandra** o **David**, alternando |
  | Eybar / Alberto (`styles/`) | El otro de los dos, y **Juan** si cambian tokens |
  | Felipe (`assets/`) | **Juan** |

  Juan no es revisor único de nada: si él integra y además revisa todo, deja de haber revisión.
- **Tamaño máximo recomendado:** 400 líneas de diff. Una PR más grande se parte, salvo que sea generada (assets, datos).
- **Plazo de respuesta:** 24 horas hábiles. Pasado ese plazo, quien abrió la PR la escala en el canal del equipo.
- **Qué se revisa, en este orden:**
  1. ¿Hace exactamente lo que dice el RF citado? ¿Ni más ni menos?
  2. ¿Rompe algún RNF vigente (fps, peso, contraste, español)?
  3. ¿Respeta los invariantes de arquitectura de `docs/arquitectura.md`?
  4. ¿Introduce dependencias nuevas? Si sí, ¿está justificado en la PR?
  5. Legibilidad y nombres (código y variables en inglés).
- **Tono:** se comenta el código, no a la persona. Una objeción sin propuesta alternativa no bloquea la PR.

**PRs que NO requieren revisión de código:** solo documentación (`docs/**.md`) y subida de assets brutos. Todo lo demás sí.

---

## 5. Ceremonias y frecuencia

| Ceremonia | Cuándo | Duración | Quién | Para qué |
|---|---|---|---|---|
| **Planeación de sprint** | Lunes de semana impar del sprint | 60 min | Todo el equipo | Elegir historias, estimar, repartir subtareas |
| **Sincronización corta** | Martes y viernes | 15 min | Todo el equipo | Qué hice / qué sigo / qué me bloquea |
| **Revisión de sprint (demo)** | Viernes de cierre de sprint | 45 min | Todo el equipo | Mostrar funcionando en un celular real |
| **Retrospectiva** | Inmediatamente después de la demo | 30 min | Todo el equipo | Qué mantener, qué cambiar, un solo compromiso |
| **Revisión técnica de riesgo** | A demanda, la convoca cualquiera | 30 min | Los implicados | Desatascar decisiones técnicas |

**Reglas de las ceremonias:**
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
| **Jira (proyecto SV)** | Estado del sprint, tablero, puntos, seguimiento del cronograma | Actualización diaria por cada quien |
| **Reuniones (ver §5)** | Decisiones que requieren acuerdo del grupo | En el momento |
| **`docs/decisiones/ADR-*.md`** | Decisiones de arquitectura o de alcance que hay que poder justificar meses después | Permanente |

**Reglas:**
- **Una decisión que no quedó escrita no ocurrió.** Si se decide algo en una llamada, alguien lo escribe en la issue o en un ADR ese mismo día.
- Las discusiones técnicas de una historia van en su issue, no en el chat. El chat se pierde; la issue queda.
- Nadie tiene obligación de responder fuera de su horario. La urgencia real se acuerda en la reunión, no se impone por chat a las 11 de la noche.

---

## 7. Cómo se resuelven los bloqueos

Escalado en tres niveles, con reloj:

**Nivel 1 — Autonomía (primeras 24 h hábiles).**
Se intenta resolver solo: documentación oficial, foro de PlayCanvas, ejemplos del motor, preguntar a una IA. Se anota qué se probó.

**Nivel 2 — El equipo (24–48 h).**
Se escribe en el canal con el formato: *qué intento hacer · qué probé · qué error me da · qué necesito*. El dueño de la épica correspondiente responde primero. Si es transversal, responde Juan.

**Nivel 3 — Decisión (más de 48 h).**
Se convoca la revisión técnica de riesgo (§5). De ahí sale **una** de estas cuatro salidas, y queda escrita:

1. **Se resuelve** — alguien lo desatasca, se documenta la solución.
2. **Se cambia el enfoque** — se busca otro camino técnico dentro del stack. Nunca fuera de él sin ADR.
3. **Se reduce** — la historia se recorta a una versión más simple que sigue cumpliendo el RF, y se anota qué se recortó.
4. **Se aplaza y se aísla** — sale del sprint, se marca `blocked` en GitHub, y se documenta qué la desbloquearía.

**Bloqueos técnicos ya anticipados** (con su plan de choque en `docs/03-avances-tecnologia.md`):
- La reconstrucción de la vegetación densa sale con ruido o "flotantes".
- La escena SOG pesa más de lo que aguanta un celular de gama media.
- El clima impide la salida de campo en la ventana prevista.

---

## 8. Qué se hace cuando alguien no alcanza

Este equipo es de seis personas con carga académica simultánea. Que alguien no alcance en algún sprint **es un escenario previsto, no una falta**. Lo que sí es una falta es enterarse el viernes de la demo.

**Regla de aviso temprano:** si a mitad del sprint (final de la primera semana) alguien ve que no llega, lo dice en la sincronización del viernes. No hay ninguna consecuencia por avisar a tiempo. Sí la hay por no avisar: se descubre en la demo y arrastra a los demás.

**Procedimiento, en orden:**

1. **Se replantea la historia, no la persona.** Primero se pregunta si la historia estaba mal estimada o mal cortada. Casi siempre lo estaba.
2. **Se parte.** Se saca la mitad que sí se puede terminar, se cierra esa, y el resto vuelve al backlog con su estimación corregida.
3. **Se empareja.** Otra persona con holgura entra a trabajar con quien está atascado — juntos, no reemplazándolo. El conocimiento se queda en dos cabezas en lugar de una.
4. **Se reasigna.** Solo si la persona sigue sin disponibilidad el siguiente sprint. La historia cambia de dueño en Jira y en GitHub, sin discusión moral.
5. **Se protege el camino crítico.** Si lo que no alcanzó está en el camino crítico (E1 en S1–S2, E2 en S3–S4), tiene prioridad sobre cualquier otra cosa del sprint y el equipo se reorganiza alrededor.

**Ausencias previstas** (parciales, viajes, exámenes): se anuncian en la planeación del sprint y se descuentan de la capacidad **antes** de comprometer historias. Un sprint con menos capacidad lleva menos historias, no las mismas historias con más presión.

**Sobre el margen de estimación:** el plan de trabajo (`plan/plan_de_trabajo.md`) ya reserva un margen amplio precisamente para esto. Consumirlo no es fracasar: es usar el plan como fue diseñado. Lo que sí se vigila en cada retro es **cuánto margen queda**, para saber a tiempo si hay que recortar alcance.

---

## 9. Reglas de contenido y de campo

Estas no son negociables porque el proyecto se hace dentro de una reserva natural protegida y sobre información biológica que la gente va a creerse.

1. **Nada de datos inventados.** Altitudes, distancias, desniveles, alturas de distribución de una especie: o están medidos/verificados, o van marcados como `[por medir en campo]`. Un dato inventado en una ficha de fauna es un error del proyecto, no un detalle.
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
| Etiquetas de sprint | `S1`, `S2`, `S2b`, `S3` … `S7` |
| Unidades | Sistema métrico. Altitud en msnm, distancia en m, pendiente en % |
| Assets pesados | Nunca en Git. Ver `.gitignore` |

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
