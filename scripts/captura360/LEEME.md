# Captura 360 a COLMAP

Convierte las panorámicas `.insp` de una Insta360 en un conjunto que COLMAP puede
alinear, **sin herramientas de pago y sin pasar por Insta360 Studio**.

## Por qué no se usa el equirectangular

Un `.insp` es un JPEG que guarda **los dos ojos de pez crudos, lado a lado**, tal como
los vieron los sensores. Insta360 Studio existe para coserlos en un equirectangular, y
esa costura deja una deformación en la unión que COLMAP interpreta como geometría real.

Aquí se hace lo contrario: el archivo se parte en sus dos círculos y se le entregan a
COLMAP con el modelo **`OPENCV_FISHEYE`**, que es exactamente lo que describe un círculo
de ojo de pez. COLMAP no tiene modelo equirectangular, así que darle el crudo no solo
evita la costura: le da una proyección que sabe modelar de forma nativa, sin ninguna
transformación intermedia.

## El flujo, en dos pasos

### 1. Partir y enmascarar

```bash
python scripts/captura360/preparar.py \
  --origen  "F:/Escaneo con Insta360" \
  --destino "F:/Sendero/ensayo-360" \
  --sesiones 125332 112015
```

Las sesiones se identifican por la hora de inicio que la cámara pone en el nombre del
archivo, `IMG_<fecha>_<hora>_00_<n>.insp`. Se pueden pasar varias y se mezclan en un solo
conjunto, que es lo que conviene cuando una pasada de ida y otra de vuelta cubren el
mismo tramo.

Deja la estructura que COLMAP espera:

```
<destino>/images/lente_a/IMG_....jpg
<destino>/images/lente_b/IMG_....jpg
<destino>/masks/lente_a/IMG_....jpg.png     ← negro = ignorar
<destino>/masks/lente_b/IMG_....jpg.png
```

### 2. Alinear

```bash
COLMAP="C:/Users/Juan/Tools/colmap/bin/colmap.exe"
cd "F:/Sendero/ensayo-360"

"$COLMAP" feature_extractor \
  --database_path db.db --image_path images --ImageReader.mask_path masks \
  --ImageReader.camera_model OPENCV_FISHEYE \
  --ImageReader.single_camera_per_folder 1 \
  --FeatureExtraction.max_image_size 3200 \
  --FeatureExtraction.use_gpu 1

"$COLMAP" exhaustive_matcher --database_path db.db --FeatureMatching.use_gpu 1

mkdir -p sparse
"$COLMAP" mapper --database_path db.db --image_path images --output_path sparse
```

De `sparse/0/` en adelante el procedimiento es el mismo de siempre, el de
[`docs/08-de-video-a-web.md`](../../docs/08-de-video-a-web.md): se arma `dataset/` con
`images/` y `sparse/0/`, y lo come Brush.

## Las máscaras

Quien captura sale en el **cien por ciento** de las panorámicas, siempre en el mismo
sitio del círculo. Sin enmascarar, la reconstrucción deja un flotador con forma de
persona siguiendo a la cámara por toda la escena.

Como la posición es fija, basta una máscara por lente replicada con el nombre de cada
imagen. El script tapa dos zonas: lo que queda **fuera del círculo**, que no es más que
negro y el borde blando donde la óptica se degrada, y una **elipse inferior** sobre el
operador y el palo.

Si en alguna jornada el operador sale más grande, por ejemplo con el palo corto, se
ajustan las constantes al principio de `preparar.py`:

| Constante | Qué controla | Valor actual |
|---|---|---|
| `OPERADOR_ANCHO` | ancho de la elipse, en fracción del círculo | 0.78 |
| `OPERADOR_ALTO` | cuánto sube desde el borde inferior | 0.46 |
| `MARGEN_CIRCULO` | recorte del borde del ojo de pez | 0.96 |

### Cuánto cuesta la máscara

Con los valores actuales se conserva el **69 % del círculo**; con unos más ajustados,
`OPERADOR_ANCHO 0.56` y `OPERADOR_ALTO 0.40`, se llegaría al **79 %**.

Se eligió la generosa a sabiendas. Lo que se tapa de más es el suelo a menos de metro y
medio de la cámara, y ese mismo tramo de sendero reaparece sin tapar en la zona media de
las panorámicas tomadas cuatro o cinco metros antes y después, así que se recupera. Una
máscara corta, en cambio, deja asomar al operador y eso sí siembra un flotador con forma
de persona que no se quita después.

**Si la reconstrucción sale con el piso del sendero blando o con huecos**, el primer
ajuste a probar es bajar a `0.56` y `0.40` y volver a alinear. Esa es la palanca.

La forma de comprobar la máscara es superponerla sobre una imagen real y mirar que no
asome la gorra. Vale la pena hacerlo una vez por jornada antes de lanzar COLMAP, porque
una máscara corta no se nota hasta que la escena ya está entrenada.

Mantener las máscaras **por imagen** y no una sola global tiene un motivo: permite tapar
después defectos que varían entre sesiones, como las gotas de lluvia pegadas al lente,
que quedan fijas en el cuadro y que el emparejador intenta tratar como si fueran algo
del mundo.

## Dos detalles de COLMAP 4.1.1 que cuestan tiempo

Las opciones **se renombraron**: ahora son `--FeatureExtraction.use_gpu` y
`--FeatureMatching.use_gpu`. Los nombres viejos `SiftExtraction` y `SiftMatching` ya no
se reconocen y el comando falla al arrancar.

Y `--FeatureExtraction.max_image_size` viene en **`-1`**, que significa no reducir. Con
ojos de pez de 5984 píxeles de lado eso son 35 MP por imagen y la extracción tarda días.
Para un ensayo conviene fijarlo en 3200; para la corrida definitiva se sube según el
tiempo disponible.
