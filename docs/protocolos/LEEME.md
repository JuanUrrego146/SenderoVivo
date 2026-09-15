# Protocolos imprimibles

Documentos de una sola página pensados para **llevar al campo**, no para leer en pantalla.
Cada uno resume, en formato operativo, un procedimiento cuyo detalle completo vive en los
documentos numerados de `docs/`.

| Archivo | Qué es | Fuente del contenido |
|---|---|---|
| `protocolo-de-campo-las-ocho-pasadas.pdf` | El protocolo de captura de escenas: qué llevar, cómo configurar la cámara, el corredor y sus cuatro superficies, las ocho pasadas con diagramas, el ritmo de disparo, los cinco metros de sobrante en los extremos y qué no hacer | [`docs/05-produccion-de-escenas.md`](../05-produccion-de-escenas.md) §§8–11 |

Va por la **v3**. Lo que entró en esta versión: el modelo del corredor como cuatro
superficies, el diagrama de la ida y la vuelta como media órbita, el de los cinco metros
de sobrante, la tabla para distinguir deriva de trayectoria de caída de paralaje, y el
cambio de P4, que en la v2 apuntaba hacia abajo y dejaba el dosel sin ninguna pasada.

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
- **Círculo numerado sobre un cono** — a qué ida y vuelta corresponde esa mirada.
- **Punto pequeño sobre una línea** — una posición de disparo. Verde si está en los
  cinco metros de sobrante, gris si está dentro del tramo útil.

En la v3 el corte transversal introduce una vista nueva: se mira *por dentro* del corredor,
no desde arriba. Se distingue porque la persona aparece de frente y no como círculo.

## Dos trampas de maquetación ya resueltas

Quedan anotadas porque cuestan mucho de diagnosticar y el PDF se regenera a mano:

1. **El contenido de cada `<li>` va envuelto en un `<span>`.** Las listas usan
   `display: grid`, y sin ese envoltorio el `<b>` y el texto suelto son dos items
   distintos de la rejilla: el segundo cae en la columna de 30 px y sale en columna de
   una palabra por línea. El defecto estaba en la v2 publicada.
2. **Las secciones sí pueden partirse entre páginas.** Forzar `break-inside: avoid`
   sobre `section` dejaba media página en blanco cada vez que una no cabía entera. Lo
   que no se parte es la figura, la tabla, el bloque de regla y cada item de lista.
