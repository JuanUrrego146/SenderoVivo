#!/usr/bin/env bash
# Captura sin ventana de la pagina de prueba con model-viewer (la misma libreria y ajustes de la app).
# Uso: captura.sh salida.png "consulta" [ancho] [alto] [espera_ms]
SALIDA="$1"; CONSULTA="$2"; ANCHO="${3:-1600}"; ALTO="${4:-1000}"; ESPERA="${5:-20000}"
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --no-first-run --disable-extensions \
  --user-data-dir="E:/SenderoModelos/trabajo/perfil_headless" --window-size="$ANCHO,$ALTO" --hide-scrollbars \
  --force-device-scale-factor=1 --virtual-time-budget="$ESPERA" --screenshot="$SALIDA" \
  "http://localhost:3477/visor/index.html?$CONSULTA" > /dev/null 2>&1
ls -la "$SALIDA" 2>/dev/null | awk '{print $5, $9}'
