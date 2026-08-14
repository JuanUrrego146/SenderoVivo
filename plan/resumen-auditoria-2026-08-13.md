# Resumen para auditoría: cambios del 13 de agosto de 2026

> Registro completo de lo ejecutado el 13/08/2026 sobre el repositorio, las issues de GitHub y el tablero de Jira, para auditoría de Juan Urrego. Tras el visto bueno, `dev/juan-urrego` se fusiona a `develop` conservando los cambios de esta rama.

---

## 1. Cambios en el repositorio (rama `dev/juan-urrego`)

| Cambio | Detalle |
|---|---|
| Visor prototipo | `index.html` + `src/app/main.js`: carga SOG con cámara orbital, placeholder si no hay escena, error con reintento. Probado con SOG real |
| Contratos de datos | `config/scenes.json` (3 escenas) y `config/pois.json` (colibrí + patrimonio), según los contratos de la arquitectura |
| Estructura de assets | `assets/scenes|models|audio|text` con `.gitkeep`; los `.sog` siguen ignorados por Git |
| Guía de captura | `docs/11-guia-de-captura-en-campo.md`: instructivo de escaneo paso a paso |
| Requerimientos legibles | `docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md` generado desde el `.docx` con pandoc |
| README | Sin vibe coding, sin backlog de Jira, sin encuadre de "actividad del curso", con acceso rápido a la guía de captura |
| Eliminado | `docs/10-guion-de-la-presentacion.md` (material de clase, no del proyecto) |
| PROTOTIPO.md | Cómo levantar el visor y cómo meter un `.sog` nuevo |
| Ramas locales | Borradas las copias locales de `dev/alberto-aleman`, `dev/alejandra-chambueta`, `dev/david-beltran`, `dev/eybar-viasus`, `dev/felipe-acevedo` (siguen en origin) |

**Regla nueva registrada:** el material que existe solo para presentar en clase no se versiona en el repo.

## 2. Issues nuevas (GitHub y Jira, 13/08/2026)

| HU | Título | GitHub | Jira | Responsables | Fecha |
|---|---|---|---|---|---|
| HU-53 | Documento de diseño y dirección de arte | [#53](https://github.com/JuanUrrego146/SenderoVivo/issues/53) | SCRUM-56 | Eybar (lidera), Alberto, Felipe | **Jue 20/08** |
| HU-54 | Prototipo: escena escaneada con desplazamiento rápido | [#54](https://github.com/JuanUrrego146/SenderoVivo/issues/54) | SCRUM-57 | Juan | Semana 18–24/08 |
| HU-55 | Prototipo: ruidos de fondo en el visor | [#55](https://github.com/JuanUrrego146/SenderoVivo/issues/55) | SCRUM-58 | David (su ámbito) | Semana 18–24/08 |
| HU-56 | Prototipo: punto de interés con ficha y modelo básico | [#56](https://github.com/JuanUrrego146/SenderoVivo/issues/56) | SCRUM-59 | Alejandra (revisa David) | Semana 18–24/08 |
| HU-57 | Prototipo: modelo básico del colibrí | [#57](https://github.com/JuanUrrego146/SenderoVivo/issues/57) | SCRUM-60 | Felipe + Alberto (texturas y UV) | Semana 18–24/08 |
| HU-58 | Aves más frecuentes y sus puntos del sendero | [#58](https://github.com/JuanUrrego146/SenderoVivo/issues/58) | SCRUM-61 | Felipe | Esta semana + V1 |
| HU-59 | Revisión de las fotos de la V1 por todo el equipo | [#59](https://github.com/JuanUrrego146/SenderoVivo/issues/59) | SCRUM-62 | Todo el equipo | 2 días tras la V1 |
| HU-60 | Contactar a la EAAB (permisos y cronograma) | [#61](https://github.com/JuanUrrego146/SenderoVivo/issues/61) | SCRUM-63 | Juan | **Correo hoy; seguimiento diario** |
| HU-61 | Registro fotográfico de la V1 (Insta 360 por confirmar) | [#60](https://github.com/JuanUrrego146/SenderoVivo/issues/60) | SCRUM-64 | Juan + Alejandra o Eybar | Durante la V1 |

Nota: los números de GitHub #60 y #61 quedaron cruzados respecto a los códigos HU-60/HU-61 porque el #52 lo ocupa una PR antigua; los títulos son los que mandan.

## 3. Issues existentes modificadas

- **Las 60 issues quedaron asignadas, ninguna sin responsable.** Cuentas de GitHub del equipo: `JuanUrrego146` (Juan), `UmngH` (Alejandra), `Davideuni774` (David), `Frat713` (Felipe), `Sviasus` (Eybar), `DGerman1203` (Alberto).

  | Persona | Issues asignadas |
  |---|---|
  | Juan Urrego | 17 |
  | David Beltrán | 15 |
  | Alejandra Chambueta | 13 |
  | Alberto Alemán | 13 |
  | Felipe Acevedo | 12 |
  | Eybar Viasus | 5 |

  Eybar tiene menos porque el plan solo lo pone como responsable de HU-50 y HU-39, más las nuevas HU-53, HU-59 y HU-61; participa en muchas otras como subtarea. Está anotado en §6 como desbalance a revisar.
- **34 issues de trabajo** recibieron la sección **"Ámbito para implementar"**: carpetas y archivos que tocar, contratos de datos, referencias de documentación, invariantes y entorno de trabajo, pensada para quien programa con otra IA o solo.
- **HU-11, HU-12, HU-13, HU-14, HU-47** (modelado): nota de que **Alberto Alemán apoya en texturas y aperturas de UV** en las primeras semanas + etiqueta y asignación. Replicado en Jira como comentario.
- **HU-50, HU-39, HU-52** (identidad visual): nota de que **el estilo visual no está decidido**; docs/06 queda como propuesta y la decisión sale del documento de diseño (HU-53). Replicado en Jira.
- **HU-05**: las subtareas administrativas ("crear repositorio, ramas, labels y milestones", "publicar contratos de datos") quedaron marcadas como hechas; era la única issue con contenido de ese tipo. Replicado en Jira.

**Sincronización adoptada:** GitHub lleva el detalle completo (ámbitos, criterios); Jira es espejo con resumen, fecha límite y enlace a la issue de GitHub. `plan/backlog-jira.csv` y `scripts/sync-github.mjs` quedan deprecados: el backlog se edita directo en ambos sistemas.

## 4. Qué hace cada quien

### Semana W02 (18 a 24 de agosto): prototipo + V1

| Persona | Tareas |
|---|---|
| **Juan** | HU-54 (escanear y montar desplazamiento rápido), HU-60 (correo EAAB hoy + seguimiento diario), HU-61 (fotos V1), HU-42 (V1) |
| **Alejandra** | HU-56 (POI: click y ficha desplegable, revisa David), acompañar fotos V1 si no hay Insta 360, HU-59 (revisar fotos: riesgo de reconstrucción) |
| **David** | HU-55 (ruidos de fondo, su ámbito), HU-59 (fotos: mapa sonoro) |
| **Felipe** | HU-57 (modelo básico colibrí), HU-58 (aves frecuentes y puntos), HU-53 (criterios 3D del doc de diseño), HU-59 (fotos: especies) |
| **Eybar** | HU-53 (lidera documento de diseño, entrega jue 20/08), HU-61 si hay Insta 360, HU-59 (fotos: paleta contra el lugar) |
| **Alberto** | HU-53 (documento de diseño), HU-57 (texturas y UV del colibrí), HU-59 (fotos: candidatos patrimoniales) |

### Resto del plan (responsable principal por semana)

| Sem | Fechas | Juan | Alejandra | David | Felipe | Eybar | Alberto |
|---|---|---|---|---|---|---|---|
| W03 | 25–31 ago | HU-04, 06, 07 | apoyos | apoyo V2 | HU-11, 12 (+UV Alberto) | valida legibilidad | apoyo UV |
| W04 | 1–7 sep | HU-09, 10 | apoyos | HU-43 | HU-08, 47, 13, 14 (+UV Alberto) | coherencia visual | HU-15, UV |
| W05 | 8–14 sep | apoyos | HU-16, 17 | apoyo | (hueco, ver §6) | HU-50 | apoyo HU-50 |
| W06 | 15–21 sep | HU-44 (V4) | HU-18, 19, 20 | apoyo | apoyo V4 | gestos | apoyos |
| W07 | 22–28 sep | apoyo | HU-21, 24 | (hueco) | apoyo | apoyo | apoyo |
| W08 | 29 sep–5 oct | apoyo | HU-45, 22, 23 | apoyos | (hueco) | (hueco) | (hueco) |
| W09 | 6–12 oct | (hueco) | apoyo | HU-25, 26, 30 | apoyos | apoyos | (hueco) |
| W10 | 13–19 oct | apoyos | (hueco) | HU-27, 28, 46, 29 | apoyos | apoyos | HU-48 |
| W11 | 20–26 oct | apoyo | apoyo | HU-31 | HU-51 | apoyo | (hueco) |
| W12 | 27 oct–2 nov | apoyo | apoyo | HU-32, 33, 34, 35 | (hueco) | apoyos | apoyos |
| W13 | 3–9 nov | apoyo | apoyo | apoyo | (hueco) | apoyos | HU-36, 37 |
| W14 | 10–16 nov | apoyo | (hueco) | apoyo | HU-52 | HU-39 | HU-38 |
| W15 | 17–28 nov | HU-40, 41 | apoyo | apoyo | apoyo | apoyo | apoyo |

El detalle de subtareas por persona está en cada issue y en `docs/04-actividades-y-roles.md`. Además, cada semana el curso deja entregas nuevas: se irán convirtiendo en issues sobre la marcha, como se hizo hoy con el prototipo.

## 5. Contacto EAAB (investigado hoy)

- **Gerente Corporativo Ambiental: Octavio Augusto Reyes Ávila** — oreyesa@acueducto.com.co — ext. 7043
- Asesora: Ángela Lucía Hernández Castiblanco — alhernandezc@acueducto.com.co — ext. 7058
- Conmutador: (+57 601) 344 7000 · Reservas: app Caminos de los Cerros Orientales (https://caminos.eaab.gov.co/)
- Fuente: directorio oficial de la EAAB (verificar vigencia del cargo al llamar). **El borrador del correo está en la issue [#61](https://github.com/JuanUrrego146/SenderoVivo/issues/61).**

## 6. Inconsistencias del plan detectadas (para corregir cuando toque)

1. **12 casillas persona-semana vacías** en el reparto real (Felipe: W05, W08, W12, W13; Alberto: W08, W09, W11; Alejandra: W10, W14; Juan: W09; David: W07; Eybar: W08). El plan §8 bis afirma que no hay semanas vacías; solo es cierto a nivel de sprint. Las tareas semanales que envíe el curso pueden llenar esos huecos.
2. **HU-49 no existe**: la numeración salta de HU-48 a HU-50 (por eso las nuevas empezaron en HU-53).
3. **RF-031 (consejos de avistamiento)** está estimado en el plan pero no tiene HU propia.
4. `docs/04-actividades-y-roles.md` no incluye HU-51 ni HU-52 (sí están en el plan y en el backlog) y asigna a Alejandra una subtarea de HU-39 que el backlog da a otros.

## 7. Pendientes de Juan

- [ ] **Auditar este resumen** y dar el visto bueno para fusionar `dev/juan-urrego` → `develop`.
- [ ] **Enviar hoy el correo a la EAAB** (borrador en la issue #61) y repetir a diario.
- [ ] **Invitar a Felipe y Alejandra** como colaboradores del repo (sin cuenta no se les pueden asignar issues). Confirmar que `DGerman1203` es Alberto Alemán.
- [ ] **Cerrar o fusionar la PR #52** (quedó abierta de antes de la regla "sin PR").
- [ ] Confirmar la **Insta 360** con Eybar (define quién acompaña las fotos de V1).
- [ ] Cambiar el perfil de red a **Privada** si quieres abrir el visor desde el iPhone (`http://192.168.1.1:3311`).
- [ ] Borrar el worktree viejo del agente de docs (bloqueado para el asistente por permisos):

  ```bash
  git worktree remove --force .claude/worktrees/docs-sendero-vivo && git branch -D worktree-docs-sendero-vivo
  ```
