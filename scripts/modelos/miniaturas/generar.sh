#!/usr/bin/env bash
# Genera las miniaturas WebP de los POI que tienen modelo 3D en assets/models/v2/.
#
# Uso: scripts/modelos/miniaturas/generar.sh
# Variables opcionales:
#   PUERTO   puerto del servidor estatico (3491)
#   ESPERA   milisegundos de tiempo virtual que Edge espera a que cargue el .glb (20000)
#   PARALELO capturas simultaneas (4)
#   ORBITA_OBJETOS  camara de los objetos (30deg 72deg auto, la misma con la que abre la ficha)
#   ORBITA_AVES     camara de las aves (60deg 72deg auto): con las alas abiertas de la pose de
#                   reposo, a 30 grados el ave sale como una franja y a 60 se lee de perfil
#   EDGE     ruta de msedge.exe
#   HOJA     donde guardar la hoja de contactos (por defecto, miniaturas-hoja.jpg en la carpeta
#            temporal del sistema; no se versiona)
#
# Para cada POI de config/pois.json cuyo modelUrl esta en assets/models/v2/ saca una captura
# de 512 px con fondo transparente de miniatura.html (model-viewer 4.0.0 con los mismos
# ajustes que la ficha 3D) y procesar.py la recorta, la lleva a 256 por 256 y la guarda en
# assets/models/v2/miniaturas/<nombre del .glb>.webp. Hace falta python con Pillow y Edge.
# Edge sin ventana necesita la pagina por HTTP (el .glb no carga desde file://).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AQUI="$RAIZ/scripts/modelos/miniaturas"
PUERTO="${PUERTO:-3491}"
ESPERA="${ESPERA:-20000}"
PARALELO="${PARALELO:-4}"
ORBITA_OBJETOS="${ORBITA_OBJETOS:-30deg 72deg auto}"
ORBITA_AVES="${ORBITA_AVES:-60deg 72deg auto}"
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
DESTINO="$RAIZ/assets/models/v2/miniaturas"
TMP="$(mktemp -d)"
HOJA="${HOJA:-$(dirname "$TMP")/miniaturas-hoja.jpg}"

# Alto de la ventana: 512 de captura mas la franja que Edge deja arriba (procesar.py la quita).
ANCHO=512
ALTO=522

python -I -c "import PIL" 2>/dev/null || { echo "Falta Pillow (pip install pillow)"; exit 1; }
[ -x "$EDGE" ] || { echo "No encuentro Edge en: $EDGE"; exit 1; }

python -m http.server "$PUERTO" --bind 127.0.0.1 --directory "$RAIZ" > "$TMP/servidor.log" 2>&1 &
SERVIDOR=$!
limpiar() {
    kill "$SERVIDOR" 2>/dev/null || true
    wait "$SERVIDOR" 2>/dev/null || true
    rm -rf "$TMP"
}
trap limpiar EXIT
for _ in $(seq 1 20); do
    curl -s -o /dev/null "http://127.0.0.1:$PUERTO/" && break
    sleep 0.5
done

# Rutas de los modelos de v2 declarados en pois.json (una por POI).
mapfile -t MODELOS < <(python -I -c "
import json, sys
for p in json.load(open(sys.argv[1], encoding='utf-8'))['pois']:
    m = p.get('modelUrl', '')
    if m.startswith('assets/models/v2/'):
        sys.stdout.buffer.write((m + '|' + p['type'] + chr(10)).encode())
" "$RAIZ/config/pois.json" | tr -d '\015' | sort -u)
echo "Modelos con miniatura: ${#MODELOS[@]}"

capturar() {
    local entrada="$1" modelo tipo orbita nombre salida captura perfil espera
    modelo="${entrada%%|*}"
    tipo="${entrada##*|}"
    orbita="$ORBITA_OBJETOS"
    [ "$tipo" = "fauna" ] && orbita="$ORBITA_AVES"
    nombre="$(basename "$modelo" .glb)"
    salida="$DESTINO/$nombre.webp"
    captura="$TMP/$nombre.png"
    perfil="$TMP/perfil-$nombre"
    for espera in "$ESPERA" "$((ESPERA * 2))"; do
        rm -f "$captura"
        "$EDGE" --headless=new --no-first-run --disable-extensions --user-data-dir="$perfil" \
            --window-size="$ANCHO,$ALTO" --hide-scrollbars --force-device-scale-factor=1 \
            --default-background-color=00000000 --virtual-time-budget="$espera" \
            --screenshot="$captura" \
            "http://127.0.0.1:$PUERTO/scripts/modelos/miniaturas/miniatura.html?modelo=$modelo&orbita=${orbita// /%20}" \
            > /dev/null 2>&1 || true
        if [ -s "$captura" ] && python -I "$AQUI/procesar.py" miniatura "$captura" "$salida" 2> "$TMP/$nombre.err"; then
            echo "ok     $nombre"
            return 0
        fi
        echo "reintento $nombre ($(cat "$TMP/$nombre.err" 2>/dev/null))"
    done
    echo "FALLO  $nombre"
    return 1
}

mkdir -p "$DESTINO"
PIDS=()
for modelo in "${MODELOS[@]}"; do
    while [ "$(jobs -rp | grep -vc "^$SERVIDOR$")" -ge "$PARALELO" ]; do sleep 1; done
    capturar "$modelo" &
    PIDS+=($!)
done
for pid in "${PIDS[@]}"; do wait "$pid" || true; done

N="$(ls "$DESTINO"/*.webp 2>/dev/null | wc -l)"
echo "Miniaturas en $DESTINO: $N de ${#MODELOS[@]}"
[ "$N" -eq "${#MODELOS[@]}" ] || { echo "Faltan miniaturas"; exit 1; }

python -I "$AQUI/procesar.py" hoja "$DESTINO" "$HOJA"
echo "Hoja de contactos: $HOJA"
