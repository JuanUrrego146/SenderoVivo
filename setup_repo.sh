#!/usr/bin/env bash
#
# setup_repo.sh - Sendero Vivo
#
# Crea el repositorio en GitHub, sube el codigo, y genera labels, milestones e issues.
# Generado el 11/08/2026 a partir de plan/backlog-jira.csv.
#
# POR QUE EXISTE ESTE SCRIPT:
#   El 11/08/2026 la maquina de trabajo no tenia salida IPv4 (github.com resuelve solo
#   a IPv4 y no tiene registro AAAA), por lo que la API de GitHub era inalcanzable.
#   El repositorio quedo creado en local con todas sus ramas y su commit inicial.
#   Este script completa la parte remota cuando haya conectividad.
#
# USO:
#   gh auth login                 # si el token del keyring esta invalido
#   bash setup_repo.sh
#
# Es idempotente: puede ejecutarse varias veces sin duplicar labels ni milestones.
# Las issues SI se duplicarian, por eso el paso 6 comprueba antes de crear.

set -uo pipefail

REPO_NAME="SenderoVivo"
VISIBILITY="--private"   # cambiar a --public si se quiere abierto

echo "==> 0. Comprobaciones previas"
command -v gh >/dev/null || { echo 'ERROR: falta GitHub CLI (gh).'; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'ERROR: gh no autenticado. Ejecuta: gh auth login'; exit 1; }
OWNER="$(gh api user --jq .login)" || { echo "ERROR: no hay conexion con la API de GitHub."; exit 1; }
echo "    Autenticado como: $OWNER"

echo "==> 1. Crear el repositorio y subir el codigo"
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "    El repositorio ya existe, se omite la creacion."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
else
  gh repo create "$REPO_NAME" $VISIBILITY \
    --description "Recorrido virtual 3D de un tramo del sendero de la Quebrada La Vieja, Cerros Orientales de Bogota, reconstruido con Gaussian Splats" \
    --source=. --remote=origin
fi

echo "==> 2. Subir todas las ramas"
git push -u origin main
for BR in develop epic/captura-reconstruccion epic/motor-recorrido epic/pois-fichas epic/datos-experiencia; do
  git push origin "$BR" || true
done
gh repo edit "$OWNER/$REPO_NAME" --default-branch develop || true

echo "==> 3. Crear labels"
gh label create "E1" --color 0E8A16 --description "Epica 1: Captura y reconstruccion del tramo" --force >/dev/null 2>&1 || true
gh label create "E2" --color 1D76DB --description "Epica 2: Motor de recorrido web" --force >/dev/null 2>&1 || true
gh label create "E3" --color 8B5CF6 --description "Epica 3: Puntos de interes y fichas 3D" --force >/dev/null 2>&1 || true
gh label create "E4" --color D97706 --description "Epica 4: Capa de datos y experiencia de usuario" --force >/dev/null 2>&1 || true
gh label create "bug" --color D73A4A --description "Algo no funciona como deberia" --force >/dev/null 2>&1 || true
gh label create "docs" --color 0075CA --description "Documentacion y contratos de datos" --force >/dev/null 2>&1 || true
gh label create "3d-asset" --color C2185B --description "Modelado, escaneo u optimizacion de assets 3D" --force >/dev/null 2>&1 || true
gh label create "ui-ux" --color F59E0B --description "Diseno de interfaz, accesibilidad y experiencia" --force >/dev/null 2>&1 || true
gh label create "captura" --color 166534 --description "Trabajo de campo, procesamiento y reconstruccion" --force >/dev/null 2>&1 || true
gh label create "blocked" --color B60205 --description "Bloqueada: no puede avanzar sin resolver algo antes" --force >/dev/null 2>&1 || true
gh label create "S1" --color EDEDED --description "Sprint 1 - 11 ago a 24 ago" --force >/dev/null 2>&1 || true
gh label create "S2" --color EDEDED --description "Sprint 2 - 25 ago a 7 sep" --force >/dev/null 2>&1 || true
gh label create "S2b" --color EDEDED --description "Sprint 2b - 25 ago a 7 sep (paralelo)" --force >/dev/null 2>&1 || true
gh label create "S3" --color EDEDED --description "Sprint 3 - 8 sep a 21 sep" --force >/dev/null 2>&1 || true
gh label create "S4" --color EDEDED --description "Sprint 4 - 22 sep a 5 oct" --force >/dev/null 2>&1 || true
gh label create "S5" --color EDEDED --description "Sprint 5 - 6 oct a 19 oct" --force >/dev/null 2>&1 || true
gh label create "S6" --color EDEDED --description "Sprint 6 - 20 oct a 2 nov" --force >/dev/null 2>&1 || true
gh label create "S7" --color EDEDED --description "Sprint 7 - 3 nov a 16 nov" --force >/dev/null 2>&1 || true
echo "    18 labels."

echo "==> 4. Crear milestones"
existing_ms=$(gh api "repos/$OWNER/$REPO_NAME/milestones?state=all" --jq '.[].title' 2>/dev/null || echo "")
create_ms () {
  local title="$1" due="$2" desc="$3"
  if echo "$existing_ms" | grep -Fxq "$title"; then
    echo "    ya existe: $title"
  else
    gh api "repos/$OWNER/$REPO_NAME/milestones" -X POST \
      -f title="$title" -f due_on="${due}T23:59:59Z" -f description="$desc" >/dev/null \
      && echo "    creado: $title ($due)"
  fi
}
create_ms "M1: Decision y captura" "2026-08-24" "S1 - E1. ADR-001 cerrado y material bruto de campo respaldado. CUS-011."
create_ms "M2: Tramo reconstruido" "2026-09-07" "S2 - E1. Tres escenas en SOG, limpias y publicadas en scenes.json. CUS-011, RF-002, RF-023, RNF-003."
create_ms "M2b: Catalogo 3D base" "2026-09-07" "S2b - E3. Aves y helecho arboreo modelados y optimizados. CUS-012, RNF-012."
create_ms "M3: Tramo navegable" "2026-09-21" "S3 - E2. Escena cargando, camara y navegacion basica. CUS-001, CUS-002, CUS-003, CUS-009."
create_ms "M4: Recorrido completo" "2026-10-05" "S4 - E2. Tres escenas encadenadas a 30 fps en gama media. CUS-008, CUS-010, RNF-001."
create_ms "M5: Puntos de interes" "2026-10-19" "S5 - E3. Cinco o seis POIs completos y consultables. CUS-004, CUS-005, CUS-006, CUS-012."
create_ms "M6: Capa de datos" "2026-11-02" "S6 - E4. HUD con datos reales del track GPS. CUS-007, RF-013 a RF-016, RF-020."
create_ms "M7: Experiencia final" "2026-11-16" "S7 - E4. UI final, responsive, onboarding y accesibilidad. CUS-010, RF-019, RF-026, RNF-005, RNF-006."
create_ms "M8: Integracion y entrega" "2026-11-24" "Semana 15. Integracion, pruebas cruzadas, despliegue y entrega."

echo "==> 5. Crear issues (una por historia de usuario)"
existing_issues=$(gh issue list --repo "$OWNER/$REPO_NAME" --state all --limit 300 --json title --jq '.[].title' 2>/dev/null || echo "")

create_issue () {
  local title="$1" milestone="$2" labels="$3" assignee="$4" body="$5"
  if echo "$existing_issues" | grep -Fxq "$title"; then
    echo "    ya existe: $title"; return 0
  fi
  gh issue create --repo "$OWNER/$REPO_NAME" \
    --title "$title" --milestone "$milestone" --label "$labels" \
    --body "$body" >/dev/null && echo "    creada: $title"
}

# Nota sobre --assignee: se omite deliberadamente porque los nombres del equipo no
# corresponden a usuarios de GitHub conocidos. El responsable va en el cuerpo de la
# issue. Para asignar de verdad, anadir --assignee <usuario-github> a create_issue.

create_issue "HU-01 Cerrar la decision de sendero" \
  "M1: Decision y captura" \
  "S1,E1,captura,docs,blocked" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo necesitamos evaluar las tres opciones de sendero con criterios objetivos para poder capturar sabiendo por que ahi. HITO BLOQUEANTE: debe cerrarse antes del viernes de la semana 1.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Redactar y ponderar la matriz de criterios  _(Juan Urrego)_
- [ ] Redactar ADR-001  _(Juan Urrego)_
- [ ] Evaluar opciones por valor de contenido  _(Felipe Acevedo)_
- [ ] Evaluar opciones por riesgo de reconstruccion  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] las tres opciones evaluadas contra los mismos criterios
- [ ] criterios incluyen densidad de elementos duros, accesibilidad en transporte publico, condiciones de captura, valor de contenido biologico y facilidad de reserva
- [ ] decision escrita en ADR-001 con alternativas descartadas y consecuencias
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S1 (11 ago - 24 ago de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-02 Definir y validar el protocolo de captura" \
  "M1: Decision y captura" \
  "S1,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos un protocolo probado para no gastar la unica manana buena aprendiendo a usar el equipo.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Redactar el protocolo de captura  _(Juan Urrego)_
- [ ] Ensayo comparativo 1x frente a 2x  _(Juan Urrego)_
- [ ] Verificar procesamiento de extremo a extremo  _(Alejandra Chambueta)_
- [ ] Definir procedimiento de GPS y audio  _(David Beltran)_

## Criterio de hecho
- [ ] protocolo escrito con resolucion, fps, obturacion, ISO, foco, balance de blancos, numero y altura de pasadas
- [ ] resuelta la pregunta abierta V1 sobre 1x frente a 2x con una prueba real
- [ ] probado en un ensayo corto fuera del sendero objetivo
- [ ] definido el objeto de tamano conocido que da escala
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S1 (11 ago - 24 ago de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-03 Preparar la logistica de la salida" \
  "M1: Decision y captura" \
  "S1,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos la salida reservada y organizada para que la ventana de buen clima no se desperdicie.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Reservar las dos ventanas de salida  _(Juan Urrego)_
- [ ] Checklist de equipo y roles de campo  _(Juan Urrego)_
- [ ] Preparar y probar dispositivos de GPS y audio  _(David Beltran)_
- [ ] Preparar el registro fotografico por POI  _(Alberto Aleman)_

## Criterio de hecho
- [ ] DOS ventanas de salida reservadas por la app del Acueducto, principal y contingencia
- [ ] checklist de equipo cerrado
- [ ] roles asignados para el dia de campo
- [ ] protocolo de respaldo con dos copias del material el mismo dia
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S1 (11 ago - 24 ago de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 3 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-04 Ejecutar la salida y traer el material bruto" \
  "M1: Decision y captura" \
  "S1,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos el material del tramo para que exista el proyecto.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Capturar video de las tres escenas  _(Juan Urrego)_
- [ ] Grabar track GPS y audio  _(David Beltran)_
- [ ] Fotografiar referencias de POIs y modelado  _(Felipe Acevedo)_
- [ ] Bitacora de campo y condiciones  _(Alberto Aleman)_
- [ ] Verificar en sitio que el material es utilizable  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] video 4K a 60 fps con varias pasadas y ajustes manuales bloqueados
- [ ] track GPS grabado el mismo dia
- [ ] audio ambiente y cantos registrados
- [ ] una foto por cada POI candidato
- [ ] objeto de escala presente en las tomas
- [ ] material respaldado en DOS ubicaciones distintas antes de terminar el dia
- [ ] anotadas hora, nubosidad y viento reales
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S1 (11 ago - 24 ago de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-05 Dejar el repositorio y los contratos de datos listos" \
  "M1: Decision y captura" \
  "S1,E1,docs" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como PM necesito que los espacios esten preparados antes de que los demas lleguen para que nadie se pise ni invente formatos.

## Requerimientos que implementa
- RNF-009
- RNF-011

## Tareas
- [ ] Crear repositorio ramas labels y milestones  _(Juan Urrego)_
- [ ] Especificar y publicar los contratos de datos  _(Juan Urrego)_
- [ ] Validar el contrato de pois.json contra la ficha  _(Eybar Viasus)_
- [ ] Validar el formato del track GPS  _(David Beltran)_

## Criterio de hecho
- [ ] repositorio con ramas main, develop y una por epica
- [ ] pois.json y scenes.json especificados con ejemplo valido
- [ ] formato del track GPS definido
- [ ] context-for-vibe-coding.md publicado
- [ ] estructura de carpetas y .gitignore en su sitio. Implementa RNF-009 y RNF-011
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S1 (11 ago - 24 ago de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-06 Extraer cuadros y resolver poses de camara" \
  "M2: Tramo reconstruido" \
  "S2,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos cuadros utilizables y poses de camara para poder entrenar.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Extraer cuadros y descartar borrosos  _(Juan Urrego)_
- [ ] Ejecutar SfM y verificar la nube dispersa  _(Juan Urrego)_
- [ ] Revision cruzada de cobertura de vistas  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] cuadros extraidos con el intervalo decidido, resuelve V2
- [ ] cuadros con movimiento borroso descartados antes de procesar
- [ ] poses resueltas por SfM para las tres escenas
- [ ] documentado el intervalo elegido y el numero de cuadros por escena
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2 (25 ago - 7 sep de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-07 Entrenar el 3DGS de las tres escenas" \
  "M2: Tramo reconstruido" \
  "S2,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos las tres escenas reconstruidas. Implementa RF-002.

## Requerimientos que implementa
- RF-002

## Tareas
- [ ] Entrenar las tres escenas en la estacion con GPU  _(Juan Urrego)_
- [ ] Registrar parametros tiempos y conteo de gaussianas  _(Juan Urrego)_
- [ ] Evaluacion visual de calidad  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] las tres escenas entrenadas y exportadas a .ply
- [ ] documentado el tiempo de entrenamiento por escena, resuelve V5
- [ ] documentado el numero de gaussianas por escena, resuelve V3
- [ ] evaluacion visual: los escalones, barandas y cauce se reconocen
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2 (25 ago - 7 sep de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-08 Limpiar las escenas en SuperSplat" \
  "M2: Tramo reconstruido" \
  "S2,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos escenas limpias porque el follaje denso genera ruido y flotantes. Implementa RF-002 y RNF-003.

## Requerimientos que implementa
- RF-002
- RNF-003

## Tareas
- [ ] Eliminar flotantes y recortar  _(Juan Urrego)_
- [ ] Ajustar color y coherencia entre escenas  _(Felipe Acevedo)_
- [ ] Verificar que los POIs quedaron dentro del recorte  _(Alberto Aleman)_

## Criterio de hecho
- [ ] flotantes eliminados en las tres escenas
- [ ] escenas recortadas al tramo de interes
- [ ] color coherente entre las tres escenas, resuelve V12
- [ ] proyecto .ssproj guardado por escena
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2 (25 ago - 7 sep de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-09 Comprimir a SOG y validar peso y calidad" \
  "M2: Tramo reconstruido" \
  "S2,E1,captura" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos escenas en formato de entrega. Implementa RNF-003 y RNF-002.

## Requerimientos que implementa
- RNF-003
- RNF-002

## Tareas
- [ ] Convertir a SOG y medir pesos  _(Juan Urrego)_
- [ ] Actualizar RNF-003 con el dato real  _(Juan Urrego)_
- [ ] Cargar un .sog en un proyecto PlayCanvas minimo  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] las tres escenas convertidas a .sog con SplatTransform
- [ ] RNF-003 queda FIJADO con un numero real medido, resuelve V4
- [ ] comparacion documentada de peso PLY frente a SOG por escena
- [ ] perdida de calidad por compresion evaluada y aceptada
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2 (25 ago - 7 sep de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-10 Publicar las escenas en scenes.json" \
  "M2: Tramo reconstruido" \
  "S2,E1,docs" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de captura necesitamos declarar las escenas para que el motor las consuma sin tocar codigo. Implementa RF-023, RF-017 y RNF-011.

## Requerimientos que implementa
- RF-023
- RF-017
- RNF-011

## Tareas
- [ ] Publicar scenes.json y las rutas de assets  _(Juan Urrego)_
- [ ] Primera alineacion del track GPS con la geometria  _(David Beltran)_
- [ ] Validar que el motor lee scenes.json sin ambiguedades  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] las tres escenas declaradas con orden, ruta al .sog y puntos de entrada y salida
- [ ] track GPS asociado a la secuencia
- [ ] primera aproximacion de alineacion y escala contra el objeto de referencia, arranca V9
- [ ] cada escena versionada con fecha de captura
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2 (25 ago - 7 sep de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-11 Modelar y texturizar las aves" \
  "M2b: Catalogo 3D base" \
  "S2b,E3,3d-asset" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como artista 3D necesito el catalogo de aves para las fichas. Habilita RF-009. EN PARALELO con S2: no depende de la captura.

## Requerimientos que implementa
- RF-009

## Tareas
- [ ] Modelar texturizar y riggear las cuatro especies  _(Felipe Acevedo)_
- [ ] Verificar nombres cientificos y rangos de altitud  _(Felipe Acevedo)_
- [ ] Validar legibilidad al tamano del visor de ficha  _(Eybar Viasus)_

## Criterio de hecho
- [ ] modeladas colibri chillon Colibri coruscans, mirla, copeton y pava andina
- [ ] realista pero simplificado, con color y forma reconocibles en campo
- [ ] nombre comun y cientifico verificados contra fuente citable
- [ ] rig basico donde la animacion aporte a la identificacion
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2b (25 ago - 7 sep de 2026 (en paralelo con S2))
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** Felipe Acevedo
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-12 Modelar plantas y helechos" \
  "M2b: Catalogo 3D base" \
  "S2b,E3,3d-asset" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como artista 3D necesito la flora del tramo para las fichas. Habilita RF-009.

## Requerimientos que implementa
- RF-009

## Tareas
- [ ] Modelar y escanear plantas  _(Felipe Acevedo)_
- [ ] Limpiar escaneos y reducir geometria  _(Felipe Acevedo)_
- [ ] Cotejar con las fotos de referencia de campo  _(Alberto Aleman)_

## Criterio de hecho
- [ ] helechos, musgos y especies nativas modelados o escaneados
- [ ] escaneo con celular en el propio sendero donde sea viable
- [ ] helecho arboreo incluido por ser POI confirmado
- [ ] nombres verificados y lo no verificado marcado por verificar
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2b (25 ago - 7 sep de 2026 (en paralelo con S2))
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** Felipe Acevedo
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-13 Escanear detalle y modelar el puente y la senalizacion" \
  "M2b: Catalogo 3D base" \
  "S2b,E3,3d-asset" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como artista 3D necesito los elementos del sendero. Habilita RF-009. Regla: lo pequeno se escanea, lo grande se modela.

## Requerimientos que implementa
- RF-009

## Tareas
- [ ] Escaneos de detalle y limpieza  _(Felipe Acevedo)_
- [ ] Modelar el puente de madera y la senalizacion  _(Felipe Acevedo)_
- [ ] Revisar coherencia visual del conjunto  _(Eybar Viasus)_

## Criterio de hecho
- [ ] insectos, minerales y piezas del sendero escaneados
- [ ] puente de madera y senalizacion modelados
- [ ] el puente de madera queda listo como POI confirmado
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2b (25 ago - 7 sep de 2026 (en paralelo con S2))
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** Felipe Acevedo
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-14 Optimizar y exportar dentro del presupuesto web" \
  "M2b: Catalogo 3D base" \
  "S2b,E3,3d-asset" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como artista 3D necesito que los modelos no rompan el rendimiento. Implementa RNF-012 y RNF-001.

## Requerimientos que implementa
- RNF-012
- RNF-001

## Tareas
- [ ] Reducir poligonos y exportar a glTF  _(Felipe Acevedo)_
- [ ] Fijar el presupuesto de triangulos y peso  _(Alejandra Chambueta)_
- [ ] Probar carga de un .glb en un visor minimo  _(David Beltran)_

## Criterio de hecho
- [ ] presupuesto de triangulos y de peso definido por modelo, resuelve V10
- [ ] todos los modelos exportados a .glb dentro del presupuesto
- [ ] materiales compatibles con el visor de ficha
- [ ] probado que un .glb carga en el navegador sin errores de material
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2b (25 ago - 7 sep de 2026 (en paralelo con S2))
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** Felipe Acevedo
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-15 Narraciones cantos y transcripciones" \
  "M2b: Catalogo 3D base" \
  "S2b,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de contenido necesitamos el audio de las fichas. Implementa RF-011, RF-012, RF-024 y RNF-006.

## Requerimientos que implementa
- RF-011
- RF-012
- RF-024
- RNF-006

## Tareas
- [ ] Seleccionar y editar los cantos capturados  _(Felipe Acevedo)_
- [ ] Redactar narraciones y transcripciones  _(Alberto Aleman)_
- [ ] Revisar tono y longitud para la ficha  _(Eybar Viasus)_
- [ ] Convertir y normalizar el audio  _(David Beltran)_

## Criterio de hecho
- [ ] narracion corta escrita y grabada por cada POI
- [ ] canto disponible para cada POI de fauna
- [ ] TRANSCRIPCION textual de cada narracion, exigido por RNF-006
- [ ] audio normalizado y en formato web
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S2b (25 ago - 7 sep de 2026 (en paralelo con S2))
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** Alberto Aleman
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-16 Cargar la primera escena sin instalacion" \
  "M3: Tramo navegable" \
  "S3,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero que la primera escena cargue en el navegador sin instalar nada. Implementa RF-001 y RF-002.

## Requerimientos que implementa
- RF-001
- RF-002

## Tareas
- [ ] Proyecto base con componente gsplat  _(Alejandra Chambueta)_
- [ ] Deteccion de WebGPU y repliegue a WebGL  _(Alejandra Chambueta)_
- [ ] Publicar los .sog en una URL accesible  _(Juan Urrego)_
- [ ] Elegir el celular de referencia de gama media  _(David Beltran)_

## Criterio de hecho
- [ ] la primera escena .sog carga desde una URL sin instalar nada
- [ ] funciona en Chrome escritorio y en un celular real
- [ ] WebGPU con repliegue automatico a WebGL verificado, resuelve V7
- [ ] dispositivo de referencia de gama media definido, resuelve V6
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S3 (8 sep - 21 sep de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-17 Progreso de carga y fallo con reintento" \
  "M3: Tramo navegable" \
  "S3,E2,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero ver el progreso y un mensaje claro si algo falla. Implementa RF-025, RNF-007 y RNF-002.

## Requerimientos que implementa
- RF-025
- RNF-007
- RNF-002

## Tareas
- [ ] Estados de carga y error en el motor  _(Alejandra Chambueta)_
- [ ] Disenar estados de carga error y reintento  _(Eybar Viasus)_
- [ ] Redactar los mensajes en espanol  _(Alberto Aleman)_

## Criterio de hecho
- [ ] indicador de progreso visible mientras carga
- [ ] si falla se informa en espanol y se ofrece reintentar
- [ ] NUNCA hay pantalla en negro
- [ ] probado forzando un fallo de red
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S3 (8 sep - 21 sep de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-18 Avanzar y retroceder por el trazado" \
  "M3: Tramo navegable" \
  "S3,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero moverme por el trazado guiado hacia adelante y atras. Implementa RF-003.

## Requerimientos que implementa
- RF-003

## Tareas
- [ ] Motor de avance sobre el trazado  _(Alejandra Chambueta)_
- [ ] Definir gestos tactiles y control en escritorio  _(Alberto Aleman)_
- [ ] Pruebas de recorrido de extremo a extremo  _(David Beltran)_

## Criterio de hecho
- [ ] el usuario avanza y retrocede a lo largo del trazado guiado
- [ ] funciona con teclado y raton en escritorio y con gesto tactil en celular
- [ ] el movimiento es continuo, sin saltos bruscos
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S3 (8 sep - 21 sep de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-19 Mirada libre 360 grados" \
  "M3: Tramo navegable" \
  "S3,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero rotar la camara en cualquier punto del recorrido. Implementa RF-005.

## Requerimientos que implementa
- RF-005

## Tareas
- [ ] Control de camara con rotacion libre  _(Alejandra Chambueta)_
- [ ] Definir limites verticales y sensibilidad  _(Eybar Viasus)_

## Criterio de hecho
- [ ] la camara rota 360 grados en cualquier punto
- [ ] rotar no desplaza al usuario fuera del trazado
- [ ] arrastre en escritorio y en tactil
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S3 (8 sep - 21 sep de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-20 Restringir el desplazamiento al trazado autorizado" \
  "M3: Tramo navegable" \
  "S3,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como sistema debo impedir el movimiento fuera del trazado porque el sendero esta dentro de una reserva protegida. Implementa RF-004 y RNF-015.

## Requerimientos que implementa
- RF-004
- RNF-015

## Tareas
- [ ] Restriccion de posicion al trazado  _(Alejandra Chambueta)_
- [ ] Verificar que la interfaz no insinua movimiento libre  _(Alberto Aleman)_

## Criterio de hecho
- [ ] no existe movimiento libre fuera del trazado
- [ ] no hay forma de salirse ni por gesto ni por teclado
- [ ] el diseno refuerza el camino autorizado, no lo sugiere como opcional
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S3 (8 sep - 21 sep de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-21 Encadenar las tres escenas" \
  "M4: Recorrido completo" \
  "S4,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero recorrer el tramo como una sola experiencia continua. Implementa RF-017 y RF-002.

## Requerimientos que implementa
- RF-017
- RF-002

## Tareas
- [ ] Encadenado y precarga de escenas  _(Alejandra Chambueta)_
- [ ] Ajustar puntos de entrada y salida en scenes.json  _(Juan Urrego)_
- [ ] Correccion final de color si la transicion se nota  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] las tres escenas se recorren como un solo tramo continuo
- [ ] la transicion no muestra pantalla en negro ni salto de posicion
- [ ] la escena siguiente se precarga antes de llegar al limite
- [ ] el salto de color entre escenas no es perceptible
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S4 (22 sep - 5 oct de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-22 Ajustar calidad segun el dispositivo" \
  "M4: Recorrido completo" \
  "S4,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como sistema debo adaptar el render a las capacidades del dispositivo. Implementa RF-022, RF-019 y RNF-001.

## Requerimientos que implementa
- RF-022
- RF-019
- RNF-001

## Tareas
- [ ] Deteccion de capacidades y perfiles de calidad  _(Alejandra Chambueta)_
- [ ] Configurar LOD por distancia  _(Alejandra Chambueta)_
- [ ] Medicion comparativa entre perfiles  _(David Beltran)_

## Criterio de hecho
- [ ] splatBudget diferenciado entre escritorio y movil
- [ ] antialiasing desactivado y device pixel ratio limitado en movil
- [ ] LOD por distancia configurado
- [ ] el ajuste es automatico, sin que el usuario tenga que elegir
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S4 (22 sep - 5 oct de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-23 Sostener 30 fps en gama media" \
  "M4: Recorrido completo" \
  "S4,E2" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero que el recorrido sea fluido en mi celular. Implementa RNF-001.

## Requerimientos que implementa
- RNF-001

## Tareas
- [ ] Perfilado y optimizacion de render  _(Alejandra Chambueta)_
- [ ] Evaluar Streamed SOG si no se alcanza el objetivo  _(Alejandra Chambueta)_
- [ ] Regenerar escenas con menos gaussianas si hace falta  _(Juan Urrego)_
- [ ] Bateria de medicion en dispositivos  _(David Beltran)_

## Criterio de hecho
- [ ] 30 fps o mas sostenidos en el dispositivo de referencia recorriendo el tramo completo
- [ ] medicion documentada, no impresion subjetiva
- [ ] decidido si hace falta Streamed SOG, resuelve V11
- [ ] splatBudget real que sostiene el objetivo, documentado, resuelve V8
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S4 (22 sep - 5 oct de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-24 Ritmo del recorrido guiado" \
  "M4: Recorrido completo" \
  "S4,E2,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero que el recorrido tenga un ritmo comodo. Implementa RF-003, RF-016 y RNF-005.

## Requerimientos que implementa
- RF-003
- RF-016
- RNF-005

## Tareas
- [ ] Curvas de velocidad y suavizado  _(Alejandra Chambueta)_
- [ ] Definir el ritmo y los puntos de parada  _(Eybar Viasus)_
- [ ] Prueba de sensacion con personas ajenas al equipo  _(Alberto Aleman)_

## Criterio de hecho
- [ ] velocidad de avance y suavizado definidos y aplicados
- [ ] el recorrido se detiene o desacelera al llegar a un punto de interes
- [ ] el usuario mantiene el control: nunca hay una animacion de la que no pueda salir
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S4 (22 sep - 5 oct de 2026)
- **Epica:** E2 Motor de recorrido web
- **Responsable:** Alejandra Chambueta
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-25 Marcadores anclados a coordenadas reales" \
  "M5: Puntos de interes" \
  "S5,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero ver marcadores en los lugares reales del tramo. Implementa RF-006.

## Requerimientos que implementa
- RF-006

## Tareas
- [ ] Sistema de anclaje de marcadores en espacio 3D  _(David Beltran)_
- [ ] Disenar el marcador y sus estados  _(Eybar Viasus)_
- [ ] Ubicar los POIs sobre las escenas  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] los marcadores flotan anclados a coordenadas reales, no a la pantalla
- [ ] se mantienen en su sitio al rotar la camara y al avanzar
- [ ] legibles a distintas distancias, sin taparse entre si
- [ ] 5 o 6 marcadores colocados
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-26 Abrir la ficha de un punto de interes" \
  "M5: Puntos de interes" \
  "S5,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero abrir la ficha de un POI y entender que estoy viendo. Implementa RF-007, RF-008, RF-010 y RNF-010.

## Requerimientos que implementa
- RF-007
- RF-008
- RF-010
- RNF-010

## Tareas
- [ ] Panel de ficha y ciclo de apertura y cierre  _(David Beltran)_
- [ ] Disenar el panel y la jerarquia de informacion  _(Eybar Viasus)_
- [ ] Contenido verificado de cada ficha  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] al activar un marcador se abre el panel de ficha
- [ ] muestra nombre comun y nombre cientifico
- [ ] muestra la altura a la que vive la especie y como identificarla en campo
- [ ] todo el contenido en espanol
- [ ] colibri chillon, puente de madera y helecho arboreo funcionando como POIs reales
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-27 Visor 3D girable con acercamiento" \
  "M5: Puntos de interes" \
  "S5,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero girar y acercar el modelo de la ficha. Implementa RF-009 y RNF-012.

## Requerimientos que implementa
- RF-009
- RNF-012

## Tareas
- [ ] Visor 3D dentro del panel de ficha  _(David Beltran)_
- [ ] Ajustar modelos y materiales para el visor  _(Felipe Acevedo)_
- [ ] Encuadre iluminacion y controles del visor  _(Eybar Viasus)_

## Criterio de hecho
- [ ] el modelo se puede girar y acercar
- [ ] colores y forma reconocibles
- [ ] funciona con gesto tactil y con raton
- [ ] cargar el modelo no rompe el rendimiento de la escena de fondo
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-28 Narracion canto y transcripcion" \
  "M5: Puntos de interes" \
  "S5,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero escuchar la narracion y el canto, cuando yo lo decida. Implementa RF-011, RF-012, RF-024, RNF-006 y RNF-008.

## Requerimientos que implementa
- RF-011
- RF-012
- RF-024
- RNF-006
- RNF-008

## Tareas
- [ ] Reproductor de audio y gestion de estados  _(David Beltran)_
- [ ] Presentacion de la transcripcion  _(Alberto Aleman)_
- [ ] Disenar los controles de audio  _(Eybar Viasus)_

## Criterio de hecho
- [ ] la narracion se reproduce SOLO cuando el usuario la activa, nunca automaticamente
- [ ] el canto esta disponible en los POIs de fauna
- [ ] la transcripcion es accesible desde la ficha
- [ ] controles de reproduccion claros
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-29 Anadir un POI editando solo pois.json" \
  "M5: Puntos de interes" \
  "S5,E3,docs" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo de contenido quiero anadir un POI sin tocar el motor. Implementa RF-021 y RNF-009.

## Requerimientos que implementa
- RF-021
- RNF-009

## Tareas
- [ ] Carga declarativa de POIs  _(David Beltran)_
- [ ] Documentar el contrato y validar el esquema  _(Juan Urrego)_
- [ ] Prueba real anadiendo un POI sin ayuda  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] se puede anadir un POI declarandolo en pois.json SIN tocar el motor
- [ ] no requiere recompilar
- [ ] documentado con un ejemplo completo
- [ ] probado por alguien que no escribio el sistema de POIs
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-30 Volver a la posicion al cerrar la ficha" \
  "M5: Puntos de interes" \
  "S5,E3" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero volver exactamente donde estaba al cerrar la ficha. Implementa RF-018.

## Requerimientos que implementa
- RF-018

## Tareas
- [ ] Guardar y restaurar el estado de camara  _(David Beltran)_
- [ ] Coordinar con el motor de recorrido  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] al cerrar la ficha el usuario vuelve exactamente a donde estaba
- [ ] se conserva posicion y orientacion de camara
- [ ] el audio se detiene al cerrar
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S5 (6 oct - 19 oct de 2026)
- **Epica:** E3 Puntos de interes y fichas 3D
- **Responsable:** David Beltran
- **Estimacion:** 3 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-31 Consumir el track GPS" \
  "M6: Capa de datos" \
  "S6,E4" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como sistema debo alimentar la capa de datos con el track real capturado en campo. Implementa RF-020.

## Requerimientos que implementa
- RF-020

## Tareas
- [ ] Lectura y proyeccion del track sobre el trazado  _(David Beltran)_
- [ ] Alineacion y escalado definitivos escena y track  _(Juan Urrego)_
- [ ] Definir la precision que se muestra en pantalla  _(Eybar Viasus)_

## Criterio de hecho
- [ ] el track GPS alimenta la capa de datos
- [ ] el track esta alineado y escalado contra la geometria reconstruida, cierra V9
- [ ] la posicion del usuario se corresponde con un punto del track
- [ ] las cifras del tramo son las reales: 2712 m de altitud, 340 m de recorrido, 62 m de desnivel, 9 por ciento de pendiente
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S6 (20 oct - 2 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** David Beltran
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-32 Altitud sobre el nivel del mar" \
  "M6: Capa de datos" \
  "S6,E4" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero ver a que altura estoy. Implementa RF-013.

## Requerimientos que implementa
- RF-013

## Tareas
- [ ] Calculo y actualizacion de altitud  _(David Beltran)_
- [ ] Presentacion del dato en el HUD  _(Eybar Viasus)_

## Criterio de hecho
- [ ] se muestra la altitud de la posicion actual en msnm
- [ ] se actualiza al avanzar
- [ ] el dato se deriva del track, no es fijo
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S6 (20 oct - 2 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** David Beltran
- **Estimacion:** 3 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-33 Distancia recorrida y restante" \
  "M6: Capa de datos" \
  "S6,E4" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero saber cuanto llevo y cuanto me falta. Implementa RF-014.

## Requerimientos que implementa
- RF-014

## Tareas
- [ ] Calculo de distancias sobre el track  _(David Beltran)_
- [ ] Presentacion en el HUD  _(Eybar Viasus)_

## Criterio de hecho
- [ ] distancia recorrida y restante visibles y actualizadas
- [ ] suman el total del tramo
- [ ] unidades en metros
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S6 (20 oct - 2 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** David Beltran
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-34 Desnivel acumulado y pendiente" \
  "M6: Capa de datos" \
  "S6,E4" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero saber cuanto he subido y que tan empinado va. Implementa RF-015.

## Requerimientos que implementa
- RF-015

## Tareas
- [ ] Calculo de desnivel y pendiente  _(David Beltran)_
- [ ] Explicar el dato para quien no es caminante  _(Alberto Aleman)_

## Criterio de hecho
- [ ] desnivel acumulado desde el inicio en metros
- [ ] pendiente actual en porcentaje
- [ ] coherentes con las cifras reales del tramo
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S6 (20 oct - 2 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** David Beltran
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-35 Tiempo estimado hasta el siguiente punto" \
  "M6: Capa de datos" \
  "S6,E4" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante quiero saber cuanto falta para el proximo punto de interes. Implementa RF-016.

## Requerimientos que implementa
- RF-016

## Tareas
- [ ] Modelo de estimacion de tiempo  _(David Beltran)_
- [ ] Presentacion del dato  _(Eybar Viasus)_
- [ ] Validar que la cifra se entiende sin explicacion  _(Alberto Aleman)_

## Criterio de hecho
- [ ] se muestra el tiempo estimado hasta el proximo POI
- [ ] se recalcula al avanzar y al pasar un POI
- [ ] la estimacion considera la pendiente, no solo la distancia
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S6 (20 oct - 2 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** David Beltran
- **Estimacion:** 5 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-36 Onboarding la primera vez" \
  "M7: Experiencia final" \
  "S7,E4,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante nuevo quiero que me expliquen como usar la app. Implementa RF-026 y RNF-005.

## Requerimientos que implementa
- RF-026
- RNF-005

## Tareas
- [ ] Disenar y redactar el onboarding  _(Alberto Aleman)_
- [ ] Integrar con el sistema de diseno  _(Eybar Viasus)_
- [ ] Implementar y persistir el ya visto  _(David Beltran)_
- [ ] Prueba con 5 usuarios reales  _(Alberto Aleman)_

## Criterio de hecho
- [ ] la primera vez se explica como avanzar, como mirar y como abrir una ficha
- [ ] es breve y se puede omitir
- [ ] no se repite en visitas siguientes
- [ ] 4 de 5 personas sin experiencia previa inician el recorrido y abren una ficha SIN instrucciones
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S7 (3 nov - 16 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** Alberto Aleman
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-37 Responsive en celular" \
  "M7: Experiencia final" \
  "S7,E4,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante en celular quiero una interfaz adaptada a mi pantalla. Implementa RF-019 y RNF-004.

## Requerimientos que implementa
- RF-019
- RNF-004

## Tareas
- [ ] Layouts responsive de todas las pantallas  _(Alberto Aleman)_
- [ ] Adaptar componentes del sistema de diseno  _(Eybar Viasus)_
- [ ] Ajustes de motor para pantalla pequena  _(Alejandra Chambueta)_
- [ ] Pruebas en dispositivos reales  _(David Beltran)_

## Criterio de hecho
- [ ] interfaz adaptada desde 375 px de ancho
- [ ] objetivos tactiles suficientes y nada depende de hover
- [ ] ficha, HUD y marcadores usables en pantalla pequena
- [ ] verificado en Chrome Android y Safari iOS vigentes
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S7 (3 nov - 16 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** Alberto Aleman
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-38 Accesibilidad" \
  "M7: Experiencia final" \
  "S7,E4,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como visitante necesito poder leer y entender el contenido. Implementa RNF-006 y RNF-010.

## Requerimientos que implementa
- RNF-006
- RNF-010

## Tareas
- [ ] Auditoria de contraste y tamanos  _(Alberto Aleman)_
- [ ] Corregir la paleta donde no cumpla  _(Eybar Viasus)_
- [ ] Exponer las transcripciones en la interfaz  _(David Beltran)_

## Criterio de hecho
- [ ] contraste AA en todos los textos de las fichas
- [ ] toda narracion tiene transcripcion accesible
- [ ] tamanos de texto legibles en movil
- [ ] ningun dato se comunica solo por color
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S7 (3 nov - 16 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** Alberto Aleman
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-39 Consolidar el sistema de diseno" \
  "M7: Experiencia final" \
  "S7,E4,ui-ux" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo necesitamos una interfaz coherente. Implementa RNF-005 y RNF-010.

## Requerimientos que implementa
- RNF-005
- RNF-010

## Tareas
- [ ] Consolidar el sistema de diseno  _(Eybar Viasus)_
- [ ] Revisar textos y coherencia de tono  _(Alberto Aleman)_
- [ ] Aplicar el sistema en los componentes del motor  _(Alejandra Chambueta)_

## Criterio de hecho
- [ ] tokens de color, tipografia y espaciado aplicados en toda la interfaz
- [ ] componentes documentados y sin variantes sueltas
- [ ] textos revisados, todos en espanol y coherentes en tono
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** S7 (3 nov - 16 nov de 2026)
- **Epica:** E4 Capa de datos y experiencia de usuario
- **Responsable:** Eybar Viasus
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-40 Integracion final y pruebas cruzadas" \
  "M8: Integracion y entrega" \
  "E1,docs" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo necesitamos entregar el producto integrado y verificado. Implementa todos los RF y RNF.

## Requerimientos que implementa
- Trabajo de proceso o de gestion; ver el plan de trabajo.

## Tareas
- [ ] Integracion y resolucion de conflictos  _(Juan Urrego)_
- [ ] Verificar RNF de rendimiento y compatibilidad  _(Alejandra Chambueta)_
- [ ] Verificacion funcional de POIs y capa de datos  _(David Beltran)_
- [ ] Verificacion de accesibilidad y responsive  _(Alberto Aleman)_
- [ ] Revision visual final  _(Eybar Viasus)_
- [ ] Revision de contenido de todas las fichas  _(Felipe Acevedo)_

## Criterio de hecho
- [ ] todas las ramas de epica fusionadas en develop y de ahi a main
- [ ] recorrido completo de extremo a extremo sin errores
- [ ] probado en Chrome, Safari y Firefox, escritorio y movil
- [ ] los RNF medibles verificados uno por uno
- [ ] ningun RF entregado sin su CUS y su historia
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** Cierre (17 nov - 24 nov de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 13 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

create_issue "HU-41 Despliegue y entrega documental" \
  "M8: Integracion y entrega" \
  "E1,docs" \
  "" \
  "$(cat <<'BODY'
## Objetivo de la sesion
Como equipo necesitamos publicar el producto y cerrar la documentacion. Implementa RNF-014 y RNF-004.

## Requerimientos que implementa
- RNF-014
- RNF-004

## Tareas
- [ ] Desplegar y configurar el hosting  _(Juan Urrego)_
- [ ] Actualizacion final de la documentacion  _(Juan Urrego)_
- [ ] Revision final de la entrega por el equipo  _(Juan Urrego)_

## Criterio de hecho
- [ ] desplegado en hosting estatico con HTTPS
- [ ] assets con politica de cache adecuada
- [ ] documentacion actualizada: requerimientos, arquitectura, plan y ADRs
- [ ] docs/03-avances-tecnologia.md cerrado con los resultados reales de las 12 validaciones
- [ ] Revisada y aprobada por otra persona
- [ ] Probada en Chrome escritorio y en un celular real
- [ ] Fusionada a `develop`

## Planificacion
- **Sprint:** Cierre (17 nov - 24 nov de 2026)
- **Epica:** E1 Captura y reconstruccion del tramo
- **Responsable:** Juan Urrego
- **Estimacion:** 8 puntos de historia
- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`
BODY
  )"

echo ""
echo "==> Listo."
echo "    Repositorio: https://github.com/$OWNER/$REPO_NAME"
echo "    Milestones: 9 | Issues: 41 | Labels: 18"
echo ""
echo "    Pendiente manual:"
echo "      - Proteger las ramas main y develop (Settings > Branches)."
echo "      - Importar plan/backlog-jira.csv en Jira, proyecto SV."
