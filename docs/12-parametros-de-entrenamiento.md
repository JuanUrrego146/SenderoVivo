# Parámetros de entrenamiento 3DGS: lo medido en nuestra máquina

> Versión 1,0, 17/08/2026 · Responsable: Juan Urrego
> Todo lo que está aquí son **mediciones reales** del prototipo del parque, no
> estimaciones. Cierra las preguntas abiertas V2, V3 y V5 de
> [`03-avances-tecnologia.md`](03-avances-tecnologia.md) §8.

---

## 1. La receta recomendada

Si tienes que entrenar una escena hoy, usa esto:

```bash
brush_app.exe "ruta\al\dataset" --total-steps 30000 --max-resolution 1920 --max-splats 1500000 --export-every 10000 --export-path "ruta\salida" --export-name "escena_{iter}.ply"
```

**Por qué estos valores y no otros:** están explicados abajo, con el error que cometimos
en cada uno. Tiempo esperado: **1 a 2 horas**, contra las 19,5 h de nuestra primera
corrida "de máxima calidad", que resultó ser peor negocio.

---

## 2. El error que costó 14 horas

Nuestra corrida "definitiva" se lanzó con `--max-resolution 3840`, `--total-steps 60000`,
`--max-splats 5000000` y `--growth-grad-threshold 0.00002`. Duró **19 h 29 min**.

Los cuatro archivos exportados (pasos 15.000, 30.000, 45.000 y 60.000) pesan
**exactamente lo mismo: 1.125,3 MB**. Ese peso corresponde a 5.000.000 de gaussianas
justas, que era el techo que le pusimos.

**Traducción: el entrenamiento chocó contra el techo antes del paso 15.000 y las 14 horas
siguientes no crearon ni una sola gaussiana nueva.** Solo reacomodó las que ya tenía,
repartidas con estadísticas tempranas, que son las más ruidosas. El modelo nunca convergió:
topó.

### Por qué chocó

Dos errores que se multiplicaron:

1. **Bajamos el umbral de crecimiento a la mitad** (`0.00002` cuando el valor por defecto
   de la versión 0.3.0 es `0.00004`).
2. **Entrenamos a 3840 px cuando el umbral está calibrado para 1920 px.** En el código de
   Brush el peso de refinamiento se multiplica por el tamaño de la imagen, así que a 4K
   cada píxel pedía gaussianas con el doble de fuerza.

Combinados: **cuatro veces más agresivo que el valor por defecto**.

> **Regla que sacamos de esto:** si subes la resolución, el umbral de crecimiento hay que
> subirlo en la misma proporción, no bajarlo. O más simple: no toques el umbral.

---

## 3. Más gaussianas no es mejor

Es contraintuitivo, pero está medido:

- El propio Brush documenta **PSNR 29,01 con 1,65 M de gaussianas** de media, frente a
  ~28,95 con 3,25 M de las implementaciones de referencia. **Alcanza más calidad con la
  mitad de primitivas**: está diseñado así.
- Nuestros 5 M para 30 metros de parque son **el triple** de ese punto de operación.
- El valor por defecto de `--max-splats` en la versión 0.3.0 es **10.000.000**. Nuestro
  5 M no era un techo bajo: ya era una reducción.

Y hay una restricción que manda sobre todo lo demás: **PlayCanvas documenta un presupuesto
de 1 millón de gaussianas para móvil** y 3+ millones para escritorio. Con 5 M estábamos
cinco veces por encima de lo que un celular puede mover a 30 fps.

---

## 4. Tiempos medidos (RTX 3060 Ti, 8 GB)

Escena de prueba: ~30 m de parque, 9 pasadas de video 4K60.

| Etapa | Tiempo | Notas |
|---|---|---|
| Extracción de cuadros (ffmpeg) | 7 min | 1 de cada 30 → 1.110 imágenes |
| COLMAP: características | 7 min | GPU |
| COLMAP: emparejamiento exhaustivo | 83 min | GPU, 276 bloques |
| COLMAP: cálculo de poses (mapper) | 94 min | **Solo CPU**, la etapa más impredecible |
| **Subtotal COLMAP** | **3 h 24 min** | |
| Brush a 1920 px, 20.000 pasos | 20 min | 1,61 M gaussianas |
| Brush a 3840 px, 60.000 pasos | **19 h 29 min** | 5 M gaussianas (topó el techo) |
| Compresión a SOG | 2 min | |

**Consecuencia para el cronograma:** las tres escenas del sendero, con la receta corregida,
necesitan unas **15 horas de máquina en total** (3,5 h de COLMAP + 1,5 h de entrenamiento
por escena). Con la receta equivocada serían casi 70 horas. Hay que reservar esos días
en el Sprint 2.

---

## 5. Extracción de cuadros

- **1 de cada 30 cuadros** (video 4K60 caminando despacio) → 1.110 imágenes.
- COLMAP registró **987 en el modelo principal (89 %)** con error de reproyección de
  **1,01 px**, que es muy bueno.
- Las otras 121 quedaron en un **segundo modelo desconectado**, sin aprovechar.

> **Para el sendero real: extraer 1 de cada 20.** Más solape entre cuadros consecutivos
> hace más probable que todas las pasadas queden en un solo modelo. Recuperar cobertura
> perdida es imposible después; ningún parámetro de entrenamiento la compensa.

```bash
ffmpeg -i pasada.mov -vf "select=not(mod(n\,20))" -fps_mode vfr -q:v 2 frames/pasada_%04d.jpg
```

---

## 6. Peso y compresión

| | |
|---|---|
| PLY entrenado (5 M gaussianas, SH grado 3) | 1.125 MB |
| SOG comprimido | 70 MB (**16×** menos) |
| Tiempo de descarga a 10 Mbps | **58,7 s** |
| Objetivo del proyecto (RNF-002) | **menos de 10 s** |

**Estamos casi 6 veces fuera del objetivo.** Y el peso del SOG lo fija el **número de
gaussianas**, no los armónicos esféricos: en el formato SOG los armónicos se guardan en
una paleta compartida y cada gaussiana solo apunta a ella con 2 bytes. Quitar bandas de
armónicos ahorra un 2 % del archivo; reducir el conteo de gaussianas es lo único que lo
baja de verdad.

> **Objetivo práctico: 1,5 M de gaussianas por escena.** Eso da unos 21 MB, que se
> descargan en 17 s a 10 Mbps y caben en el presupuesto de render móvil.

---

## 7. Filtros de limpieza: cómo se usan bien

Los aprendimos a golpes. `splat-transform` tiene estas trampas:

**El filtro de flotantes calcula el volumen del archivo de ENTRADA, no del ya filtrado.**
Si la escena tiene gaussianas gigantes o lejanas, cree que mide kilómetros y muere
intentando crear billones de vóxeles. Error real que vimos:

```
scene: 7.42km x 8.05km x 5.89km, grid: 148384 x 160984 x 117788 voxels (2810T) @ 5cm
```

**Hay que filtrar los TRES ejes de escala, no solo uno.** Filtramos `scale_0` y seguía
fallando porque quedaban gaussianas con `scale_1` de 1.346 (la mediana es 0,0015).

**La receta que funciona, en dos pasadas separadas:**

```bash
# 1) Acotar: quita gigantes, lejanas y casi invisibles
splat-transform entrada.ply --filter-nan --filter-value scale_0,lt,0.5 --filter-value scale_1,lt,0.5 --filter-value scale_2,lt,0.5 --filter-box -15,-15,-15,15,15,15 --filter-value opacity,gt,0.05 acotado.ply

# 2) Ahora sí, flotantes (la escena ya tiene un volumen sano)
splat-transform acotado.ply --filter-floaters limpio.ply

# 3) Comprimir a SOG desempaquetado
splat-transform limpio.ply salida/meta.json
```

Resultado medido: de 5 M a 4,74 M de gaussianas en **2 minutos**, sin pérdida visible.

**Lo que los filtros NO arreglan:** los rayones blancos brillantes. Probamos filtrar por
brillo del color base (`f_dc_0,lt,2.2`) y siguen ahí, porque su luminosidad viene de los
armónicos esféricos, no del color plano. **Esos se borran a mano en SuperSplat**, con el
lazo, y toma diez minutos.

---

## 8. Nivelación de la escena

La reconstrucción sale en orientación arbitraria: COLMAP no sabe dónde está el suelo. La
nuestra salía **151,5° torcida**.

**Se corrige midiendo el "arriba" real en las poses de cámara.** Como se camina sosteniendo
el teléfono más o menos derecho, el promedio del eje −Y de todas las cámaras *es* la
vertical de la escena.

```bash
colmap model_converter --input_path sparse/0 --output_path sparse/0_txt --output_type TXT
```

Después se promedia el eje −Y de cada pose (las líneas de 10 campos que terminan en el
nombre del archivo) y el resultado va a `config/scenes.json` como `sceneUp`. El visor
calcula con él la rotación. Verificado: **0,00° de desviación** tras aplicarlo.

> No conviertas esa rotación a ángulos de Euler a mano: las convenciones no coinciden y
> nos dio 65° de error. Deja que el motor la calcule desde el vector.

---

## 9. Cosas de Brush que conviene saber

- **`mip-splatting` no está disponible** en la versión publicada (v0.3.0, septiembre de
  2025). Existe en el código de desarrollo, pero usarlo exige compilar desde el fuente.
  Corrige aliasing en follaje, así que puede valer la pena más adelante.
- **Si actualizas Brush, no arrastres los parámetros.** El valor por defecto de
  `growth-grad-threshold` cambió de `0.00004` a `0.0025` entre versiones: un factor de
  62,5. Arrastrar el valor viejo provoca crecimiento desbocado y agotamiento de memoria.
- **El entrenamiento no publica el número de paso en ningún archivo**, solo en su consola.
  Para seguir el avance, lo que sirve son los archivos exportados (`--export-every`).
- **Memoria:** 5 M de gaussianas a 3840 px consumieron 7,7 GB de los 8 GB de VRAM y
  12,8 GB de RAM del sistema. Es el límite de la 3060 Ti; con 1,5 M sobra margen.

---

## 10. Resumen para el Sprint 2

Al capturar y reconstruir las tres escenas del sendero:

- [ ] Extraer **1 de cada 20** cuadros.
- [ ] Verificar que COLMAP produzca **un solo modelo**. Si salen dos, hay cobertura perdida.
- [ ] Entrenar con **valores por defecto**: 1920 px, 30.000 pasos, sin tocar el umbral.
- [ ] Techo de **1,5 M de gaussianas** por escena (presupuesto móvil y peso de descarga).
- [ ] Medir el **`sceneUp`** de cada escena y anotarlo en `config/scenes.json`.
- [ ] Limpiar en **dos pasadas** (acotar y luego flotantes) y rematar a mano en SuperSplat.
- [ ] Reservar **~5 horas de máquina por escena**, unas 15 h en total.
