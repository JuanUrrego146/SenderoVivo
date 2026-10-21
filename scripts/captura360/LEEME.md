# Captura 360 a COLMAP

Convierte las panorámicas `.insp` de una Insta360 en un conjunto que COLMAP puede
alinear, sin herramientas de pago y sin pasar por Insta360 Studio.

## Qué se le entrega a COLMAP y por qué

Un `.insp` es un JPEG que guarda los dos ojos de pez crudos, lado a lado, tal como los
vieron los sensores. Ninguna de las dos formas obvias de dárselo a COLMAP funciona.

El equirectangular que cose Insta360 Studio deja una deformación en la unión de las
lentes que COLMAP interpreta como geometría real. El ojo de pez crudo, con el modelo
`OPENCV_FISHEYE`, evita la costura pero no empareja: un mismo árbol cambia tanto de forma
entre el centro y el borde del círculo que SIFT no lo reconoce, y sobre la tanda del 7 de
octubre de 2026 registra 37 de 1310 imágenes.

Lo que sí funciona es reproyectar cada lente a vistas rectilíneas, como las de una cámara
normal. Cada lente se abre en cuatro vistas de 90 grados: tres horizontales, levemente
inclinadas hacia el suelo, que cubren las paredes y el sendero, y una hacia el dosel. Cada
vista sale de una sola lente, así que no hay costura, y la reproyección es exacta porque
usa la calibración que el propio COLMAP refinó sobre estas imágenes. Con eso los pares de
panorámicas que antes daban cero correspondencias pasan a dar decenas.

Las ocho vistas de una panorámica salen del mismo punto y entre ellas no hay base para
triangular. Por eso se declaran como un rig: COLMAP no las compara entre sí y mueve cada
panorámica como un bloque rígido. Sin el rig, el mapper intenta arrancar con dos vistas
de la misma panorámica y fracasa una y otra vez.

## El flujo

### 1. Vistas, máscaras y rig

```bash
python scripts/captura360/vistas.py \
  --origen  "F:/Escaneo con Insta360" \
  --destino "F:/Sendero/vistas-mixto" \
  --sesiones 125332 --prefijo p
```

Las sesiones se identifican por la hora de inicio que la cámara pone en el nombre del
archivo, `IMG_<fecha>_<hora>_00_<n>.insp`. El orden de captura se toma de la fecha del
archivo y no de su número, porque la cámara reinicia la cuenta al cambiar de carpeta.

Cuando se van a juntar dos sesiones en un mismo conjunto, cada una se genera con una letra
distinta en `--prefijo`, por ejemplo `p` para la subida y `l` para la bajada, en el mismo
`--destino`.

El resultado tiene una carpeta por vista, `images/a0/` a `images/b3/`, con el mismo nombre
de archivo en las ocho para la misma panorámica, las máscaras en `masks/` con la misma
estructura, y un `rig.json` con la orientación fija de cada vista.

### 2. Puntos

```bash
COLMAP="C:/Users/Juan/Tools/colmap/bin/colmap.exe"
cd "F:/Sendero/vistas-mixto"

"$COLMAP" feature_extractor \
  --database_path db.db --image_path images --ImageReader.mask_path masks \
  --ImageReader.camera_model PINHOLE --ImageReader.single_camera_per_folder 1 \
  --ImageReader.camera_params 1200,1200,1200,1200 \
  --FeatureExtraction.use_gpu 0 --FeatureExtraction.max_image_size 2400 \
  --SiftExtraction.estimate_affine_shape 1 --SiftExtraction.domain_size_pooling 1 \
  --SiftExtraction.max_num_features 12000

"$COLMAP" rig_configurator --database_path db.db --rig_config_path rig.json
```

La extracción va en CPU a propósito. La forma afín y el agrupamiento por escala, las dos
opciones `SiftExtraction` que la activan, solo existen en CPU, y son las que permiten
reconocer una misma hoja vista desde dos posiciones separadas varios metros. En un tramo
de 40 panorámicas de la subida con sol, las correspondencias entre panorámicas seguidas
pasaron de una mediana de 107 con la extracción por GPU a 765 con esta, y entre
panorámicas a dos de distancia, de 18 a 97. Cuesta unos tres segundos por vista en este
equipo.

### 3. Emparejar

```bash
"$COLMAP" sequential_matcher --database_path db.db \
  --FeatureMatching.use_gpu 1 --FeatureMatching.guided_matching 1 \
  --FeatureMatching.skip_image_pairs_in_same_frame 1 \
  --SiftMatching.max_ratio 0.85 --SequentialMatching.overlap 6
```

Dentro de una sesión basta el emparejador secuencial, porque las panorámicas vecinas en
el tiempo son vecinas en el espacio. Con una toma cada cinco segundos, más allá de dos
panorámicas de distancia ya no quedan correspondencias, así que una ventana de seis es
holgada.

Si hay una segunda sesión que recorre el mismo sendero en sentido contrario, se empareja
aparte con una lista de pares:

```bash
python scripts/captura360/pares.py --subida p 299 --bajada l 346 \
  --carpetas images --salida pares-entre-sesiones.txt

"$COLMAP" matches_importer --database_path db.db \
  --match_list_path pares-entre-sesiones.txt --match_type pairs \
  --FeatureMatching.use_gpu 1 --FeatureMatching.guided_matching 1 \
  --SiftMatching.max_ratio 0.85
```

Las fotos de la segunda sesión caen entre las de la primera, y eso acorta la distancia
entre tomas que es justo lo que limita la cadena. El script explica cómo elige los pares.

### 4. Alinear

```bash
mkdir -p sparse
"$COLMAP" mapper --database_path db.db --image_path images --output_path sparse \
  --Mapper.ba_refine_focal_length 0 --Mapper.ba_refine_principal_point 0 \
  --Mapper.ba_refine_extra_params 0
```

La calibración de las vistas es exacta por construcción, así que no se deja refinar. De
`sparse/0/` en adelante el procedimiento es el mismo de siempre, el de
[`docs/08-de-video-a-web.md`](../../docs/08-de-video-a-web.md).

## La máscara del operador

Quien captura va debajo de la cámara, pero con el palo inclinado solo una lente lo ve de
lleno. En la tanda del 7 de octubre, la gorra asoma en la lente a hasta unos 40 grados
por debajo del horizonte, y en la lente b apenas aparecen las manos en el borde. La
máscara tapa por elevación del rayo, no por zona de la imagen, con un umbral por lente:
38 grados para la a y 55 para la b. Así la lente b conserva entre el 92 y el 97 por ciento
de cada vista horizontal, y la a entre el 72 y el 77.

Los umbrales están en `UMBRAL_OPERADOR`, al principio de `vistas.py`. La forma de
comprobarlos es oscurecer lo enmascarado sobre unas cuantas vistas reales y mirar que no
asome la gorra. Vale la pena hacerlo una vez por jornada antes de lanzar COLMAP, porque
una máscara corta no se nota hasta que la escena ya está entrenada y deja un flotador con
forma de persona siguiendo a la cámara. Si en otra jornada la cámara iba al revés, los
dos valores se intercambian.

Si la reconstrucción sale con el piso del sendero blando o con huecos cerca de la cámara,
la palanca es subir el umbral de la lente a, a costa de arriesgar que asome el operador.

## Detalles de COLMAP 4.1.1 que cuestan tiempo

Las opciones de GPU se llaman `--FeatureExtraction.use_gpu` y `--FeatureMatching.use_gpu`.
Los nombres `SiftExtraction.use_gpu` y `SiftMatching.use_gpu` ya no se reconocen y el
comando falla al arrancar.

`--FeatureExtraction.max_image_size` viene en `-1`, que significa no reducir. Las vistas
de este flujo miden 2400 píxeles, así que conviene fijarlo en ese valor de forma explícita.

En `rig.json` la vista de referencia tiene que ir primera en la lista; si no,
`rig_configurator` se detiene con `The reference sensor needs to be added first`.
`vistas.py` ya la escribe en ese orden.
