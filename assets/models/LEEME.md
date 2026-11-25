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

Los diez suman 25.146.564 bytes. Esos archivos de la raíz y sus copias con texturas a 512 de la carpeta `512/` se conservan tal como llegaron. La ficha de la app carga hoy las aves y los letreros de la carpeta `v3/`, y el puente, la banca y la silla de la carpeta `v2/`.

## La carpeta `v2/`: los objetos y la primera versión de las aves

`v2/` tiene veintitrés modelos: diez aves y trece objetos del sendero. Son versiones trabajadas en Blender a partir de los `.glb` de la carpeta compartida «Modelos glb» (subcarpetas «Aves» y «Puntos de interes»), que no se modificó. El proceso completo y sus decisiones están en `scripts/modelos/mejora/LEEME.md`.

Las aves conservan el esqueleto de cuarenta y cuatro huesos y los pesos de los originales. Sobre la malla original llevan plumas reales: remeras y coberteras en las dos caras del ala, timoneras en la cola y plumas de contorno en todo el cuerpo, entre 2.170 y 3.991 plumas por ave. Todas comparten un atlas de plumas de 1024 por 1024 en gris con alfa y su mapa de normales, y el color de cada pluma va en el color de vértice según el plumaje de la especie. Las plumas usan alfa en modo MASK, sin mezcla de transparencias. Cada ave pesa entre 1,87 y 2,62 MB y usa dos texturas, de modo que no necesita una copia más liviana para el celular.

La animación `Take 001` es la original, con un ajuste: el giro de codo, muñeca y dedos del ala quedó al 30 %. El aleteo se había hecho para un ala corta y, con remeras de largo real, en el punto bajo las alas se cruzaban bajo el cuerpo. El batido del hombro, la cabeza, las patas y la cola no cambiaron.

Los objetos conservan sus materiales y sus coordenadas de textura. La malla se soldó, porque el exportador de Maya entregaba cada triángulo con sus tres vértices propios y por eso se veían facetados; se biselaron las aristas vivas, se recalcularon las normales y se horneó oclusión ambiental en el color de vértice, que da la sombra de contacto entre tablas, postes y techos. Las texturas van a 512 por 512, como las de la carpeta `512/`, con el color más nítido y con el relieve de la veta sumado al mapa de normales. En el puente y en el edificio el piso se recogió alrededor del objeto.

La ficha reproduce sola y en bucle la animación de reposo de las aves (RF-029). El nombre del clip se declara en `config/pois.json`, en el campo `idleAnimation`, y `src/views/ModelView.js` lo pasa al visor.

| Archivo en `v2/` | Bytes | sha256 |
|---|---|---|
| `aguililla-de-swainson.glb` | 1921096 | `b87d60837838bbdb47779b66a1d153e1b68c736bd225665a94accaba31752190` |
| `atlapetes-nuquipalido.glb` | 2012300 | `09fc02a9cd318f7eef7d0e01e6de79d73faf3350933c962168ca4333a1ef226e` |
| `banca-vieja.glb` | 1430180 | `b84f3e5e7551ae719ab01908c7d3023f0cbb4952adf43753ce33e04a396f0fd1` |
| `colibri-chillon.glb` | 2045908 | `0aeb7e7a78e397a4c78adfd17a05068d845584d12fdc5cc769a3a4071b0b4251` |
| `copeton.glb` | 1922500 | `4e93fc9a7d48bbee7e150ee8209c58fd0810c94ce2896dcc5d085f197959fcea` |
| `cucarachero-rufo.glb` | 1870608 | `28025de8ad723e760738f4b084f8a25dc9ca7cf3e1f00323cef16459b8d1d840` |
| `edificio.glb` | 2393504 | `214bd3d5d79c2f9f849cd47bf27dfdc1906d45cbd2dfd2dd0ca67dcb3e016ea4` |
| `estructura-final.glb` | 1405436 | `3ecaf948699393b7a7a9151688157b41665dd3fc36a9f9c11f43bf1e81d44b71` |
| `golondrina-plomiza.glb` | 2314840 | `6b69f909953a76d8eb05e3e218069f119dde663f98660c6e6741c1affa07794e` |
| `letrero-bosque-alto-andino.glb` | 592636 | `a0af880437c019a336c7bd708aba55e0bec6042710119596d3afee6dfb8ce3ca` |
| `letrero-bosque-andino-y-pinos.glb` | 587536 | `9a73ca304b6b06bc47512ca700b8dddf08446e5638f19902d0319f2a774ba8a3` |
| `letrero-flecha.glb` | 357152 | `2db30e9f6c98941bc2b586e9fb2de8871a94bc2e7e8fcfbce65ab9a72e517c95` |
| `letrero-indicaciones.glb` | 890224 | `56e8b6b1ea6c6123d8cc6fcf290e73b5e90fdd8ecbe68c60f87cb2e36cd29419` |
| `letrero-observatorio-de-aves.glb` | 400032 | `97b0c1861dd9848b8a7471fa5c64ace4e30473e4735d586985a7f3c822ab746e` |
| `letrero-prohibido-el-paso.glb` | 114224 | `1d66795c30419fa2f6e31e8287c67448b5d112146adb751a980d9a9b939d2c00` |
| `letrero-servicios-ambientales.glb` | 397604 | `3711a7649a9d3d4b2850a5675708d47c70401733ac90bd17e6e506b61e6f319a` |
| `pibi-ahumado.glb` | 2622176 | `e066f475c8bc743a0c4fbf84978a10ea58891421ad79671f31bdbfbf1c927d75` |
| `puente-principal.glb` | 1051208 | `2a1cc88aaab5dd0228901459da47535021a399fa87419c2ceacb14047ac9d23c` |
| `saltapared-comun.glb` | 2015832 | `e9638a28deee93f4d63b55e9442c586384c80421ac7060254969663d5886a6ca` |
| `silla-rota.glb` | 524380 | `171a7c02ec305776e492fae42e2de07c8d3df77654a08d62705c59eaa99016f5` |
| `tablero-informativo.glb` | 1928660 | `2e2ed28ef5b11c403b71f97cc931a507051468256006813682545f77f1191865` |
| `tucan-andino.glb` | 2071452 | `41d19d16daa9f96fa2df6832cae80ef1dcad6782bea0ba622e8fa3d7cf5b9695` |
| `vireo-ojirrojo.glb` | 1994320 | `0d30d7ad874c60e4a7bc93bcce51b7b7d59f89a56656cd7d921d8397c77f8f22` |

Los veintitrés suman 32.863.808 bytes.

Veintiún modelos están enlazados a su punto de interés en `config/pois.json`. `atlapetes-nuquipalido.glb` es el modelo que en la carpeta compartida se llama «Nuca»: tiene forma de atlapetes y se pintó como *Atlapetes pallidinucha*, el de los cerros orientales de Bogotá, y su punto pasó a llamarse `poi-atlapetes-nuquipalido`. `puente-principal.glb` va en `poi-puente-madera`. `edificio.glb` y `estructura-final.glb` no tienen todavía un punto de interés que los use. El carpintero candela tiene punto de interés y canto, pero no tiene modelo. Las diez aves y los ocho letreros de esta carpeta ya no se cargan: sus puntos apuntan a la versión de `v3/`. Las miniaturas de `v2/miniaturas/` se sacaron de estos modelos y siguen en uso.

## La carpeta `v3/`: aves con el ala corregida y letreros legibles

`v3/` tiene las diez aves rehechas con el mismo proceso de `v2/` y un ala distinta, porque vista de frente se veía mal: las coberteras de encima se apilaban hasta casi una décima parte del largo del ala por encima del brazo y asomaban como una cresta dentada, el brazo del ala quedaba a la vista como un tubo liso y claro, y las coberteras de debajo se curvaban hacia afuera y parecían escamas.

Ahora el brazo tiene sección de perfil de ala, grueso adelante y fino atrás. Las coberteras se asientan sobre él y bajan en línea recta hasta quedar justo encima de las remeras, cada fila apenas un paso más alta que la de atrás; por debajo del ala dejan además el espacio que cuelgan las remeras, y las dos caras se curvan hacia el ala. El borde de ataque lleva seis filas de plumitas que lo envuelven y se tienden hacia la punta, como en un ave real. La animación, el esqueleto, los colores y el resto del plumaje son los de `v2/`. Cada ave pesa entre 2,00 y 2,78 MB.

En los letreros de `v2/` el texto no se leía: las caras impresas habían bajado a 512 por 512 y el realce las tomó por madera, porque casi no tienen blanco, y les sumó un relieve que emborronaba las letras. En `v3/` cada cara impresa conserva su textura sin relieve, ampliada al doble con filtro Lanczos y con un enfoque suave, de modo que el texto aguanta el acercamiento del visor; la madera, los postes y los mapas de normales quedan a 512 con el mismo realce de `v2/`. Los materiales que se tratan como madera se eligen por nombre con la opción `--madera` de `scripts/modelos/mejora/optimizar_glb.py`. En el tablero informativo la cara impresa queda a 1024 sin ampliar: ya en el modelo original el texto pequeño ocupa unos pocos píxeles y no se puede leer, así que mejorarlo exige la imagen de origen del tablero o una foto de frente del tablero real. Cada letrero pesa entre 0,25 y 2,13 MB, menos que en `v2/` salvo el tablero.

| Archivo en `v3/` | Bytes | sha256 |
|---|---|---|
| `aguililla-de-swainson.glb` | 1997060 | `ad91e655ce64d4c8b262862d06fd6a8e37330f02b3974d15ecc683584d7c07c0` |
| `atlapetes-nuquipalido.glb` | 2159472 | `4f8bbbddaf2964cb464a9b1a0f2317ca49d49a57ee653036e2912bd3ca4defe1` |
| `colibri-chillon.glb` | 2374596 | `368cbe921d732ae5c8ca4a298552bdf759be3ae888ca6df3e14dde6149cf4183` |
| `copeton.glb` | 2030716 | `19f5ba32054db111c4a4bad6ee568047228fe5e311533cd16ebe8a783266ac4a` |
| `cucarachero-rufo.glb` | 2096048 | `55fa1b3d2ff00a7581962e34ad3df82cf467a42e070a818ffe198f6a1cee1983` |
| `golondrina-plomiza.glb` | 2434848 | `9b304a6ecd17d5ccfd04172d7e54e79cdbf6f9c39e7885dbb5217065a09682a9` |
| `letrero-bosque-alto-andino.glb` | 799028 | `1084013cda3e08e498bbf62a1546ffedd3b3df4d878dd0464c6dc5304d89ee77` |
| `letrero-bosque-andino-y-pinos.glb` | 776524 | `ba22d30a744c9679847a05518cbce29f537979d54ed36bc9022605aa729c1087` |
| `letrero-flecha.glb` | 668972 | `fb194b33965eeffa7baed863df64c41b5c713d5ec5e1a20f982d78538b816d90` |
| `letrero-indicaciones.glb` | 1297496 | `b0f011553a562bbac04f6fb8ecbfa6672cfffa3cd01a8b43163c1e26b5b22c9c` |
| `letrero-observatorio-de-aves.glb` | 589380 | `828f81fcb2d55bd5fa89beda669f621b764e5af1cce91c1eb5e6ff886e220991` |
| `letrero-prohibido-el-paso.glb` | 254696 | `144a9a43533eec09dd4682dcaaeabf2cf9faefa576cc81ebaac549d8d7ca7a50` |
| `letrero-servicios-ambientales.glb` | 579120 | `0899975395b9924205dcb3f76672b24a15433c0668633f1e0874741d2325c78d` |
| `pibi-ahumado.glb` | 2781944 | `c22b742fe759bcc1306723826efdb540e1b6b279dc13888746aeccba5bbf29ad` |
| `saltapared-comun.glb` | 2257492 | `a95cabbecdccd548c4e479b11f1882284412be80bb3e7db7147cf951606237c5` |
| `tablero-informativo.glb` | 2131788 | `390bc20b47d2da32fead622a536b86d94afbdf9f6e7b38352b3a5c2711b77e72` |
| `tucan-andino.glb` | 2289048 | `aedd8d6d80ca807f5251738c696e7de001ff98e57b8292c1b9ab01a5713e2364` |
| `vireo-ojirrojo.glb` | 2135584 | `9874a230b807f10f7022be9e1977d02aa34f1bc054941356036ca2d04d7ba332` |

Los dieciocho suman 29.653.812 bytes.

## Las texturas vienen completas, salvo Height

Los diez archivos son glTF 2.0 binario exportado con «Maya Ultimate GLB Exporter v2.0», sin Draco, sin KTX2, sin meshopt y sin ninguna extensión, así que el visor no necesita decodificadores. Todas las texturas están embebidas, sin ninguna URI externa: son PNG de 1024 por 1024, tres por material. El primero es el color base, el segundo la normal y el tercero un mapa combinado que lleva la oclusión en el canal R (vale 1 en todos los píxeles), la rugosidad en el G y el metal en el B. El metal vale 0 en toda la madera; solo son metálicos el material de tuercas (`Tuercas1`) y la placa de «Prohibido pasar», con 0,6. Ningún material usa transparencia.

Las once carpetas de «Texturas puntos de interes» son las exportaciones de Substance, con BaseColor, Height, Metalness, Normal y Roughness por cada parte. Cada parte tiene su material dentro del `.glb` correspondiente. Lo único que no viaja dentro es el mapa Height, porque glTF no tiene desplazamiento; es la misma decisión que se tomó con la golondrina. La carpeta «Letrero infomativo» del 13 de octubre no tiene `.glb`: es la versión genérica anterior a los dos letreros informativos con texto propio, y no se importó.

## Orientación y escala

En los diez modelos, la cara con el texto mira hacia +Z. Es la vista con la que abre el visor de la ficha, de modo que el letrero aparece de frente y legible antes de que el visitante lo gire.

Los modelos no están en metros: su caja envolvente mide entre 3,3 y 16,7 unidades de Maya y el pivote no siempre está en la base. El visor encuadra cada modelo por su caja envolvente, así que la escala original no estorba. Si algún día se coloca un modelo dentro de una escena, hay que medirlo y llevarlo a su altura real antes.

## Dónde está cada uno en el sendero

Revisado el 21/10/2026 en las pasadas centrales de los tres tramos grabados con celular. La silla rota está en el Tramo 2, en la curva que se ve hacia el segundo 31 de `t2_CentroCentro_Ida` (cuadros 92 a 98 de la extracción a 3 fps); su POI vive en la escena `sendero-02` y el medallón flota sobre ella. La banca vieja y el letrero del observatorio de aves están al final del Tramo 1, donde empalma con el Tramo 2 (hacia el segundo 130 de `t1_CentroCentro_Ida`, cuadros 519 a 528 de la extracción a 4 fps), y el tablero informativo está en la Cumbre, junto a la plataforma del mirador (`c_Plataforma_VistaTramo1` y `c_OrbitacionPlataforma`): los tres viven en la escena `sendero-01` (Cumbre y Tramo 1). Los otros seis letreros no aparecen en ninguno de los tres tramos grabados y siguen como ejemplos en la escena del parque.

## Reglas para tocar estos archivos

Si un `.glb` cambia, va con nombre nuevo y nunca se sobrescribe, porque `_headers` cachea `/assets/models/*` durante una semana. Por eso las versiones trabajadas están en `v2/`, las aves corregidas y los letreros legibles en `v3/` y una versión posterior irá en `v4/`. Un modelo nuevo de la misma familia se declara en `config/pois.json` sin tocar código: se copia aquí y se añade su POI de tipo `patrimonio` con `modelUrl`, dejando la historia en `[por verificar]` mientras no haya fuente citable.

Cada modelo de `v2/` tiene su miniatura en `v2/miniaturas/<nombre del .glb>.webp` (256 por 256 px, fondo transparente), que el medallón del punto muestra en lugar del icono. Se genera con `scripts/modelos/miniaturas/generar.sh` y se declara en `previewUrl` de `config/pois.json`. Si un modelo cambia y va a una carpeta nueva por la caché de una semana, su miniatura se vuelve a generar y va en esa misma carpeta nueva.
