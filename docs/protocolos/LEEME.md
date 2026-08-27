# Protocolos imprimibles

Documentos de una sola página pensados para **llevar al campo**, no para leer en pantalla.
Cada uno resume, en formato operativo, un procedimiento cuyo detalle completo vive en los
documentos numerados de `docs/`.

| Archivo | Qué es | Fuente del contenido |
|---|---|---|
| `protocolo-de-campo-las-ocho-pasadas.pdf` | El protocolo de captura de escenas: qué llevar, cómo configurar la cámara, las ocho pasadas con diagramas, el ritmo de disparo y qué no hacer | [`docs/05-produccion-de-escenas.md`](../05-produccion-de-escenas.md) §§8–11 |

## Cómo se regenera el PDF

El PDF **no se edita a mano**: se genera desde el `.html` que está al lado, para que el
documento impreso y su fuente no se desincronicen. Desde la raíz del repositorio, con
cualquier navegador basado en Chromium (Edge y Brave sirven; el comando es el mismo
cambiando el ejecutable):

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="docs/protocolos/protocolo-de-campo-las-ocho-pasadas.pdf" \
  "file:///RUTA/ABSOLUTA/docs/protocolos/protocolo-de-campo-las-ocho-pasadas.html"
```

El `.html` trae reglas `@media print` que quitan sombras y evitan que las figuras y las
tablas se partan entre páginas, así que el resultado sale limpio sin tocar nada.

## Al modificarlo

1. Se edita el `.html`.
2. Se regenera el `.pdf` con el comando de arriba.
3. **Se actualiza también `docs/05`** si el cambio afecta al procedimiento y no solo a la
   redacción: el documento numerado es la fuente de verdad, este PDF es su versión de
   bolsillo. Si los dos se contradicen, manda `docs/05`.

## Sobre los diagramas

Los tres diagramas son **SVG escrito a mano dentro del propio HTML**, sin librerías ni
imágenes externas: se ven igual en pantalla, impresos y en tema claro u oscuro. El
vocabulario visual es el mismo en los tres y conviene respetarlo si se añaden más:

- **Círculo con hombros** — la persona que captura, vista desde arriba.
- **Cono relleno** — lo que la cámara está viendo.
- **Línea a trazos con flecha** — por dónde se camina.
- **Línea de raya y punto** — el eje del sendero.
