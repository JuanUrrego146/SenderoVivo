# Modelos de señalización y mobiliario del sendero

Los diez modelos de esta carpeta son de Alberto Alemán, del equipo de Sendero Vivo. Salieron de la carpeta compartida «Texturas - Sendero Vivo», subcarpeta «Modelos glb», y se copiaron el 20/10/2026 sin tocar un solo byte: la tabla de abajo trae el sha256 de cada original para comprobarlo. Cada uno es un punto de interés de tipo `infraestructura` en `config/pois.json`.

Hay dos copias de cada modelo. El original queda en `assets/models/` y lo usa la ficha 3D, que carga uno a la vez. La versión ligera queda en `assets/models/mundo/` y es la que se coloca dentro de la escena, donde hay varios modelos a la vez.

| Nombre en el repositorio | Archivo en la carpeta compartida | Bytes del original | sha256 del original | Bytes del ligero |
|---|---|---|---|---|
| `tablero-informativo.glb` | Tablero informativo.glb | 5438420 | `2987b3d8458f5da6e95dae7352b0f25493dff1bedc951ab00176424f81041ed8` | 995756 |
| `letrero-indicaciones.glb` | Letrero Indicaciones.glb | 2355916 | `2afd7f6dfb34afd3f8b8256d6e1304f17728caa477d8a4eac8b33169bf5a60d1` | 490180 |
| `letrero-bosque-alto-andino.glb` | Letrero informativo (Bosque alto andino).glb | 1852484 | `a921f31d757d82f8dd97f42ad57b0c5e9b7eae830d2533f52d5873123bba5d55` | 339876 |
| `banca-vieja.glb` | Banca Vieja.glb | 3996888 | `c52abc5ed304a7dd9bc11d5fed276c4ad2efb3868a94e3b062e6dff5f3fc9e80` | 766408 |
| `letrero-observatorio-de-aves.glb` | Letrero Diagonal (Observatorio de aves).glb | 1499316 | `d8412371780d255f5fb104706023ca2f6baccea0ae4b9d923756be60a18d98e4` | 227848 |
| `letrero-prohibido-el-paso.glb` | Prohibido Pasar.glb | 618256 | `bd4967558e0c9bf0a57d68fb28faeb38c6489ea581c0fd2429261b385a2045fd` | 57092 |
| `letrero-bosque-andino-y-pinos.glb` | Letrero informativo (Bosque andino y bosque de pinos).glb | 1845296 | `5b68ae401fa7036cf09b954793b2abc3c454b424c9cb578d5f8666c978a47a06` | 338092 |
| `letrero-servicios-ambientales.glb` | Letrero Diagonal (Servicios Ambientales).glb | 1492728 | `0ffd176fdfcc339246f543f717bd6539716c1ff19f57172ed98cfe15d82efce5` | 227020 |
| `silla-rota.glb` | Silla Rota.glb | 4055464 | `d3375da2e27116f7dc8d7e3df7fecfebf5019c881d006bed1b8f3ab9abbd1a4c` | 276252 |
| `letrero-flecha.glb` | Letrero flecha.glb | 1991796 | `63d1016b9586a58011ae6909bd45de972d7f778a0badd025c6d71e69c71a6b09` | 174972 |

Los diez originales suman 25.146.564 bytes y los diez ligeros 3.893.496. Los seis que hoy se colocan en la escena pesan 15.761.280 bytes en su versión original y 2.877.160 en la ligera.

## Las texturas vienen completas, salvo Height

Los diez archivos son glTF 2.0 binario exportado con «Maya Ultimate GLB Exporter v2.0», sin Draco, sin KTX2, sin meshopt y sin ninguna extensión, así que el motor no necesita decodificadores. Todas las texturas están embebidas, sin ninguna URI externa: son PNG de 1024 por 1024, tres por material. El primero es el color base, el segundo la normal y el tercero un mapa combinado que lleva la oclusión en el canal R (vale 1 en todos los píxeles), la rugosidad en el G y el metal en el B. El metal vale 0 en toda la madera; solo son metálicos el material de tuercas (`Tuercas1`) y la placa de «Prohibido pasar», con 0,6. Ningún material usa transparencia.

Las once carpetas de «Texturas puntos de interes» son las exportaciones de Substance, con BaseColor, Height, Metalness, Normal y Roughness por cada parte. Cada parte tiene su material dentro del `.glb` correspondiente. Lo único que no viaja dentro es el mapa Height, porque glTF no tiene desplazamiento; es la misma decisión que se tomó con la golondrina. La carpeta «Letrero infomativo» del 13 de octubre no tiene `.glb`: es la versión genérica anterior a los dos letreros informativos con texto propio, y no se importó.

## Convención de frente y escala

En los diez modelos, la cara con el texto mira hacia +Z. La colocación en la escena (`src/views/WorldModelsView.js`) gira cada modelo para que ese +Z mire hacia el sendero, inclinado hacia quien llega.

Los modelos no están en metros: su caja envolvente mide entre 3,3 y 16,7 unidades de Maya, y el pivote no siempre está en la base. Por eso `config/pois.json` no guarda una escala sino la altura real del objeto en `worldModel.heightMeters`. La vista mide la caja envolvente a escala 1, calcula la escala que lleva el modelo a esa altura en unidades del motor (con `worldModelDefaults.metersPerUnit`, hoy 2,1 metros por unidad) y lo apoya sobre el suelo por su punto más bajo, no por su origen. Cambiar un modelo de tamaño es cambiar un número en el JSON, y recalibrar para otra escena es cambiar `worldModelDefaults`.

## Cómo se generan las versiones ligeras

El generador es `scripts/modelos/aligerar_glb.py` y solo necesita Pillow. Clasifica cada imagen por su uso en los materiales: el color base y la emisiva son de color, la normal es normal, y el mapa metal y rugosidad más la oclusión son el mapa combinado. Las de color se reducen a 512 píxeles de lado máximo y se guardan como JPEG de calidad 90 cuando no tienen transparencia; las demás se reducen a 256 y se guardan como PNG optimizado. Nunca agranda una imagen. Después quita los duplicados por hash de los bytes ya codificados, elimina las imágenes sin uso y reconstruye los `bufferViews` con cada índice traducido. La geometría no se toca, y la misma entrada da siempre los mismos bytes.

Para regenerar las diez, desde la raíz del repositorio:

```bash
for n in tablero-informativo letrero-indicaciones letrero-bosque-alto-andino banca-vieja letrero-observatorio-de-aves letrero-prohibido-el-paso letrero-bosque-andino-y-pinos letrero-servicios-ambientales silla-rota letrero-flecha; do python scripts/modelos/aligerar_glb.py assets/models/$n.glb assets/models/mundo/$n.glb --base 512 --resto 256 --calidad 90; done
```

Con esos parámetros, cada ligero conserva los mismos triángulos y la misma caja envolvente que su original, y las imágenes únicas por modelo son 26, 17, 11, 15, 6, 6, 11, 6, 3 y 8, en el orden de la tabla.

## Memoria de video medida

Seis modelos de 1024 píxeles suman 90 imágenes y unos 480 MiB (503 MB) de textura en la GPU, contando RGBA8 con la cadena de mipmaps. Con las versiones ligeras son 81 imágenes y 57,0 MiB (59,8 MB). Eso es lo que se midió en el visor: `graphicsDevice._vram.tex` pasó de 184.109.908 a 243.878.632 bytes al llegar los seis modelos, un aumento de 59.768.724 bytes, que coincide con el cálculo. La medición se hizo a 375 píxeles de ancho con el perfil de celular.

## Reglas para tocar estos archivos

Si un `.glb` cambia, va con nombre nuevo y nunca se sobrescribe, porque `_headers` cachea `/assets/models/*` durante una semana. Un modelo nuevo de la misma familia se añade en `config/pois.json` sin tocar código: se copia el original aquí, se genera su ligero y se declara el POI con su bloque `worldModel`. Para colocar uno de los cuatro que hoy esperan la escena nueva basta con cambiar su `worldModel.visible` a `true` y ajustar su `trailAnchor`.
