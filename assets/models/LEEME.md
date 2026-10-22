# Modelos de señalización y mobiliario del sendero

Los diez modelos de esta carpeta son de Alberto Alemán, del equipo de Sendero Vivo. Salieron de la carpeta compartida «Texturas - Sendero Vivo», subcarpeta «Modelos glb», y se copiaron el 20/10/2026 sin tocar un solo byte: la tabla de abajo trae el sha256 de cada uno para comprobarlo.

Se ven en el visor 3D de la ficha, no en la escena. Cada uno es un punto de interés en `config/pois.json`: el visitante toca su medallón, se abre la ficha con la transcripción del letrero o la descripción del objeto, y el botón «Ver en 3D» muestra el modelo, que se puede girar y acercar (RF-009 y CUS-005). Ningún requerimiento coloca los modelos de los POI dentro de la escena. Son POI de tipo `patrimonio` porque RF-030 incluye la señalización entre los elementos patrimoniales: la ficha describe lo que se ve y, mientras no haya fuente citable, deja `historicalNote` en `[por verificar]` y omite la sección histórica.

| Nombre en el repositorio | Archivo en la carpeta compartida | Bytes | sha256 |
|---|---|---|---|
| `tablero-informativo.glb` | Tablero informativo.glb | 5438420 | `2987b3d8458f5da6e95dae7352b0f25493dff1bedc951ab00176424f81041ed8` |
| `letrero-indicaciones.glb` | Letrero Indicaciones.glb | 2355916 | `2afd7f6dfb34afd3f8b8256d6e1304f17728caa477d8a4eac8b33169bf5a60d1` |
| `letrero-bosque-alto-andino.glb` | Letrero informativo (Bosque alto andino).glb | 1852484 | `a921f31d757d82f8dd97f42ad57b0c5e9b7eae830d2533f52d5873123bba5d55` |
| `banca-vieja.glb` | Banca Vieja.glb | 3996888 | `c52abc5ed304a7dd9bc11d5fed276c4ad2efb3868a94e3b062e6dff5f3fc9e80` |
| `letrero-observatorio-de-aves.glb` | Letrero Diagonal (Observatorio de aves).glb | 1499316 | `d8412371780d255f5fb104706023ca2f6baccea0ae4b9d923756be60a18d98e4` |
| `letrero-prohibido-el-paso.glb` | Prohibido Pasar.glb | 618256 | `bd4967558e0c9bf0a57d68fb28faeb38c6489ea581c0fd2429261b385a2045fd` |
| `letrero-bosque-andino-y-pinos.glb` | Letrero informativo (Bosque andino y bosque de pinos).glb | 1845296 | `5b68ae401fa7036cf09b954793b2abc3c454b424c9cb578d5f8666c978a47a06` |
| `letrero-servicios-ambientales.glb` | Letrero Diagonal (Servicios Ambientales).glb | 1492728 | `0ffd176fdfcc339246f543f717bd6539716c1ff19f57172ed98cfe15d82efce5` |
| `silla-rota.glb` | Silla Rota.glb | 4055464 | `d3375da2e27116f7dc8d7e3df7fecfebf5019c881d006bed1b8f3ab9abbd1a4c` |
| `letrero-flecha.glb` | Letrero flecha.glb | 1991796 | `63d1016b9586a58011ae6909bd45de972d7f778a0badd025c6d71e69c71a6b09` |

Los diez suman 25.146.564 bytes. El visor de la ficha carga uno a la vez, así que no hace falta una versión más liviana.

## Las texturas vienen completas, salvo Height

Los diez archivos son glTF 2.0 binario exportado con «Maya Ultimate GLB Exporter v2.0», sin Draco, sin KTX2, sin meshopt y sin ninguna extensión, así que el visor no necesita decodificadores. Todas las texturas están embebidas, sin ninguna URI externa: son PNG de 1024 por 1024, tres por material. El primero es el color base, el segundo la normal y el tercero un mapa combinado que lleva la oclusión en el canal R (vale 1 en todos los píxeles), la rugosidad en el G y el metal en el B. El metal vale 0 en toda la madera; solo son metálicos el material de tuercas (`Tuercas1`) y la placa de «Prohibido pasar», con 0,6. Ningún material usa transparencia.

Las once carpetas de «Texturas puntos de interes» son las exportaciones de Substance, con BaseColor, Height, Metalness, Normal y Roughness por cada parte. Cada parte tiene su material dentro del `.glb` correspondiente. Lo único que no viaja dentro es el mapa Height, porque glTF no tiene desplazamiento; es la misma decisión que se tomó con la golondrina. La carpeta «Letrero infomativo» del 13 de octubre no tiene `.glb`: es la versión genérica anterior a los dos letreros informativos con texto propio, y no se importó.

## Orientación y escala

En los diez modelos, la cara con el texto mira hacia +Z. Es la vista con la que abre el visor de la ficha, de modo que el letrero aparece de frente y legible antes de que el visitante lo gire.

Los modelos no están en metros: su caja envolvente mide entre 3,3 y 16,7 unidades de Maya y el pivote no siempre está en la base. El visor encuadra cada modelo por su caja envolvente, así que la escala original no estorba. Si algún día se coloca un modelo dentro de una escena, hay que medirlo y llevarlo a su altura real antes.

## Dónde está cada uno en el sendero

Revisado el 21/10/2026 en las pasadas centrales de los tres tramos grabados con celular. La silla rota está en el Tramo 2, en la curva que se ve hacia el segundo 31 de `t2_CentroCentro_Ida` (cuadros 92 a 98 de la extracción a 3 fps); su POI vive en la escena `sendero-02` y el medallón flota sobre ella. La banca vieja y el letrero del observatorio de aves están al final del Tramo 1, donde empalma con el Tramo 2 (hacia el segundo 130 de `t1_CentroCentro_Ida`, cuadros 519 a 528 de la extracción a 4 fps), y el tablero informativo está en la Cumbre, junto a la plataforma del mirador (`c_Plataforma_VistaTramo1` y `c_OrbitacionPlataforma`): los tres viven en la escena `sendero-01` (Cumbre y Tramo 1). Los otros seis letreros no aparecen en ninguno de los tres tramos grabados y siguen como ejemplos en la escena del parque.

## Reglas para tocar estos archivos

Si un `.glb` cambia, va con nombre nuevo y nunca se sobrescribe, porque `_headers` cachea `/assets/models/*` durante una semana. Un modelo nuevo de la misma familia se declara en `config/pois.json` sin tocar código: se copia aquí y se añade su POI de tipo `patrimonio` con `modelUrl`, dejando la historia en `[por verificar]` mientras no haya fuente citable.
