# Inventario de las fotos 360 y elección del tramo para la versión 2

Versión 2 de Sendero Santa Ana: recorrido de foto en foto con las panorámicas de la Insta360 X3 del 07/10/2026 (`E:/Escaneo con Insta360`, 1.055 fotos `.insp`). Este documento dice qué se midió en cada foto, con qué método, qué se eligió y por qué. Las cifras por foto están en `inventario_completo.csv` y la lista final, con la razón de cada descarte, en `eleccion.csv`. Los scripts están en `scripts/v2-panoramas/`.

## Las cuatro sesiones

La cámara pone en el nombre de cada archivo la hora en que empezó la sesión, y dentro de cada una las fotos se ordenan por la hora del EXIF. Así salen cuatro recorridos: la subida de las 10:39 (343 fotos, de 10:39 a 11:07), la bajada de las 11:20 (346 fotos, empieza en el mirador de la Cumbre), la segunda subida de las 12:53 (309 fotos, de la planta del Acueducto a la Cumbre, de 12:53 a 13:23) y un tramo corto de las 13:43 (57 fotos). Entre una foto y la siguiente pasan 5 o 6 segundos de caminata.

## Qué se midió y cómo

**Gotas en el lente.** Una gota se queda pegada en el mismo punto del lente mientras el paisaje cambia de una foto a la siguiente. Por eso cada foto se compara con la anterior y con la siguiente: se filtran los bordes del tamaño de una gota y se calcula, punto por punto, cuánto se parecen a los de las dos vecinas. El paisaje ya se movió y no se parece; una gota está en el mismo sitio en las tres. La medida es el porcentaje del lente donde los bordes coinciden con las dos vecinas (`gotas_pct`), sin contar el anillo exterior ni la parte de abajo, donde va el operador. Se comprobó dibujando esas zonas sobre fotos: caen sobre las gotas que se ven en la subida de las 10:39, y en fotos limpias quedan por debajo de 0,15 %. Las fotos con gotas visibles dan 0,35 % o más.

Antes se probaron otras dos formas que no sirvieron y se dejan anotadas para no repetirlas. Medir la nitidez de cada zona contra su nitidez habitual marcaba sobre todo el desenfoque por movimiento de las fotos oscuras del bosque, no las gotas; esa cifra se conserva como `borrosidad`. Tomar la mediana de 7 fotos seguidas tampoco separaba, porque la textura del bosque no alcanza a cancelarse en 7 fotos.

**Borrosidad.** Cada lente se parte en cuadros y se compara la nitidez de cada cuadro con la mediana de ese mismo cuadro en las 1.055 fotos. La cifra es el porcentaje de cuadros con menos del 30 % de su nitidez habitual. Sube en las fotos movidas, que son las del bosque cerrado, donde la cámara alarga la exposición.

**Luz.** Del EXIF sale el valor de exposición a ISO 100, EV = log2(N² / t) − log2(ISO / 100), que mide la luz de la escena sin el ajuste automático de la cámara. El brillo medio de la imagen no sirve para esto porque la cámara lo empareja.

**Dónde aparece quien lleva la cámara.** Juan va en todas las tomas. Cada lente se pasa por un detector de personas con silueta (YOLO11x-seg), y cada punto de la silueta se convierte en elevación sobre el horizonte y rumbo con la calibración de la lente y la vertical del acelerómetro. La cifra por foto es la elevación de lo más alto de su silueta (`op_elev_max`). El detector lo encontró en 1.050 de las 1.055 fotos. En las 5 restantes, todas de la subida de las 12:53, se revisaron las fotos: él está, visto desde arriba, y solo asoma la gorra en la parte de abajo. Por eso la revisión final se hace mirando cada panorama y no solo con esta cifra. Estas elevaciones se midieron antes de fijar el signo del eje lateral del sensor y pueden estar corridas hasta unos 6 grados; sirvieron para elegir. El disco que tapa a la persona en los panoramas publicados se ajustó con una medición nueva sobre el panorama ya nivelado (ver `v2/LEEME.md`).

**Vertical para nivelar.** El EXIF trae la lectura del acelerómetro solo en 3 de las 1.055 fotos. Cada `.insp` lleva al final un bloque de Insta360 con la serie del acelerómetro y del giroscopio de unos 2 segundos alrededor de la toma; su promedio da la vertical. En las 3 fotos que traen las dos, coinciden con 2 a 7 grados de diferencia, que es el balanceo de la caminata. Con eso cada panorama se endereza; la inclinación que hay que corregir tiene una mediana de 7 grados y llega a 18.

## Cifras por sesión

| Sesión | Fotos | Gotas, mediana | Fotos con gotas (más de 0,30 %) | Borrosidad, mediana | EV100, mediana | Operador, elevación máxima mediana | Fotos con el operador por encima de −10° |
|---|---|---|---|---|---|---|---|
| 10:39 subida | 343 | 0,56 % | 229 | 18,6 % | 8,4 | −55,6° | 3 |
| 11:20 bajada | 346 | 0,19 % | 107 | 13,9 % | 10,2 | −51,7° | 4 |
| 12:53 subida | 309 | 0,04 % | 13 | 11,6 % | 8,5 | −47,0° | 2 |
| 13:43 tramo corto | 57 | 0,09 % | 16 | 33,5 % | 7,8 | −13,7° | 15 |

La subida de las 12:53 es la única sin gotas de punta a punta: su mediana es 14 veces menor que la de la subida de la mañana y casi 5 veces menor que la de la bajada, y solo 13 de sus 309 fotos pasan el umbral, 11 de ellas entre las 12:59 y las 13:01. También es la menos movida. En la luz, en cambio, las sesiones no se distinguen: la mediana de EV va de 7,8 a 10,2 y lo que más la mueve es si la foto está bajo el dosel o en un claro, no la hora. La parte soleada que pidió Juan se reconoce entonces por las gotas y no por la luz medida. Los claros de la subida de las 12:53 sí dan los valores más altos de la sesión, de 11 a 12,3 junto a la planta.

El tramo corto de las 13:43 queda fuera aunque tenga pocas gotas: la cámara iba baja y el operador llega hasta 23 grados por encima del horizonte, además de ser la más movida.

## Elección

Se usa la subida de las 12:53, de la planta del Acueducto a la Cumbre, en el sentido en que se camina. Una foto se descarta si cumple cualquiera de estas condiciones, con umbrales sacados de las fotos de control: gotas por encima de 0,30 %, borrosidad por encima de 35 %, operador por encima de −10 grados (entraría en la franja del horizonte) u otra persona en la foto.

Quedan **269 fotos elegidas de 309**. Se descartan 40: 26 por movidas, 13 por gotas (algunas por las dos), 2 por el operador en el horizonte y 1 por otra persona. Los descartes dejan 13 saltos en el camino; el mayor es de 11 fotos seguidas, de las 13:20:08 a las 13:21:08, en el bosque más cerrado antes de la Cumbre, alrededor de un minuto de caminata. Los otros son de 7 fotos (las gotas de las 12:59) o menos.

En las 269 elegidas el operador aparece solo por debajo del horizonte: lo más alto de su silueta queda, en la mediana, a −47 grados, en el 90 % de las fotos por debajo de −36 y en la peor a −24. Por eso todas van con el caso del parche en el suelo. A esa hora el sol estaba a entre 63 y 70 grados de altura (calculada con la fecha, la hora y la latitud de Bogotá), así que la sombra de una persona de 1,70 m mide entre 0,6 y 0,9 m y cae debajo de la cámara, dentro de la zona del parche, cuando hay sol directo; igual se revisa en cada panorama.
