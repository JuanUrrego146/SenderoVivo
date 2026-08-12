#!/usr/bin/env bash
#
# setup_repo.sh - Sendero Vivo
#
# Prepara el remoto de GitHub: sube las ramas y sincroniza labels, milestones e
# issues desde plan/backlog-jira.csv.
#
# QUE CAMBIO RESPECTO A LA VERSION ANTERIOR
#   La version del 11/08/2026 traia las 41 issues escritas a mano dentro del propio
#   script (1.500 lineas). El backlog cambia, y mantener el mismo contenido en dos
#   sitios garantiza que se desincronicen. Ahora el CSV es la unica fuente de verdad
#   y scripts/sync-github.mjs lo lee: 4 epicas, 51 historias y 157 subtareas.
#
# USO:
#   bash setup_repo.sh                  # sube ramas y sincroniza GitHub
#   bash setup_repo.sh --dry-run        # solo muestra que haria en GitHub
#
# Es idempotente: labels y milestones se actualizan, las issues que ya existen se
# omiten por titulo.

set -uo pipefail

REPO_NAME="SenderoVivo"
BRANCHES=(develop epic/captura-reconstruccion epic/motor-recorrido epic/pois-fichas epic/datos-experiencia)

echo "==> 0. Comprobaciones previas"
command -v gh   >/dev/null || { echo 'ERROR: falta GitHub CLI (gh).'; exit 1; }
command -v node >/dev/null || { echo 'ERROR: falta Node.js.'; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'ERROR: gh no autenticado. Ejecuta: gh auth login'; exit 1; }
OWNER="$(gh api user --jq .login)" || { echo "ERROR: no hay conexion con la API de GitHub."; exit 1; }
echo "    Autenticado como: $OWNER"

echo "==> 1. Repositorio remoto"
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "    Ya existe: $OWNER/$REPO_NAME"
  git remote get-url origin >/dev/null 2>&1 \
    || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
else
  gh repo create "$REPO_NAME" --private \
    --description "Recorrido virtual 3D de 200 m del sendero Claro de Luna - Quebrada La Vieja, Cerros Orientales de Bogota, reconstruido con Gaussian Splats sobre PlayCanvas" \
    --source=. --remote=origin
fi

echo "==> 2. Subir las ramas"
#
# ATENCION - si este paso falla con "push declined due to email privacy restrictions":
#
#   La cuenta de GitHub tiene activada la opcion "Block command line pushes that
#   expose my email" y los commits llevan un correo personal. Hay dos salidas:
#
#   A) La rapida, sin reescribir historia. En https://github.com/settings/emails
#      desactivar "Block command line pushes that expose my email" y repetir.
#
#   B) Usar el correo noreply de GitHub. Reescribe los commits ya creados:
#        MAIL="$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"
#        git config user.email "$MAIL"
#        git rebase --root --exec "git commit --amend --no-edit --author=\"$OWNER <$MAIL>\""
#        for BR in develop epic/captura-reconstruccion epic/motor-recorrido \
#                  epic/pois-fichas epic/datos-experiencia; do
#          git branch -f "$BR" main
#        done
#      Es seguro mientras nadie haya clonado todavia el repositorio.
#
if ! git push -u origin main; then
  echo ""
  echo "    ERROR: el push de main fallo. Lee la nota que hay justo encima de esta"
  echo "           linea en el propio script, o la seccion 'Estado del repositorio'"
  echo "           del README."
  exit 1
fi

for BR in "${BRANCHES[@]}"; do
  git push origin "$BR" || echo "    aviso: no se pudo subir $BR"
done

gh repo edit "$OWNER/$REPO_NAME" --default-branch develop \
  || echo "    aviso: no se pudo fijar develop como rama por defecto"

echo "==> 3. Labels, milestones e issues desde plan/backlog-jira.csv"
node scripts/sync-github.mjs --repo "$OWNER/$REPO_NAME" "$@"

echo ""
echo "==> Listo."
echo "    Repositorio: https://github.com/$OWNER/$REPO_NAME"
echo ""
echo "    Pendiente manual:"
echo "      - Proteger las ramas main y develop (Settings > Branches)."
echo "      - Invitar a las cinco personas del equipo al repositorio."
echo "      - Asignar cada issue filtrando por su etiqueta resp-<persona>."
echo "      - Crear el proyecto SV en Jira e importar plan/backlog-jira.csv."
