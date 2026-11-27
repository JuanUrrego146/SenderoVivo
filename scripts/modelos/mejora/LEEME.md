# Mejora de los modelos de las fichas

Con estos scripts se produjeron los modelos de `assets/models/v2/`, `v3/` y `v4/` a partir de los `.glb` de la carpeta compartida «Modelos glb». El trabajo se hizo entre el 17 y el 27 de noviembre de 2026 con Blender 4.5.1 LTS, manejado desde el conector de Blender de Claude. Los originales de la carpeta compartida no se modificaron.

## Qué hace cada archivo

`manifest.tsv` lista los veintitrés originales con el nombre que tienen en la carpeta compartida y el nombre local que usa el proceso. Se descargan de esa carpeta y se guardan en `E:\SenderoModelos\originales`, en las subcarpetas `aves` y `poi`. Esa carpeta de trabajo es la que el código llama `RAIZ` en `sv_lib.py`; quien repita el proceso en otro equipo cambia esa constante.

`puente_mcp.py` es un puente local para el conector. El conector espera un complemento dentro de Blender que no estaba instalado; este archivo habla el mismo protocolo en `127.0.0.1:9876`. Blender se abre con `blender --python puente_mcp.py` y desde ese momento el conector ejecuta código en esa ventana. Cada llamada corre en un espacio de nombres nuevo, así que el estado que debe sobrevivir se guarda en `sv_lib.ESTADO`.

`sv_lib.py` reúne lo común: limpiar la escena, importar un `.glb`, montar la luz de estudio con la misma exposición de la ficha, encuadrar la cámara, renderizar vistas y exportar con piel y animación.

`generar_atlas_plumas.py` dibuja el atlas de plumas que comparten todas las aves. Son veinticuatro celdas en gris con alfa, entre plumas de contorno, coberteras, remeras y timoneras, lisas o con estría, borde, barras o banda, y su mapa de normales. El gris multiplica el color de vértice de cada pluma, y por eso un solo atlas sirve para todas las especies. Las remeras tienen la punta redondeada y el ancho casi parejo en dos tercios del largo, y las plumas de contorno el borde poco deshilachado. `generar_atlas_plumas_v3.py` conserva el atlas con el que se hicieron `v2/` y `v3/`.

`sv_aves.py` lee el ave original. Reconstruye el eje del cuerpo con cortes perpendiculares a la recta que va de la cabeza a la punta de la cola y da a cada punto de la piel unas coordenadas de plumaje: `s` a lo largo del cuerpo, `theta` alrededor del eje, y en la cabeza `phi` y `lam` respecto al pico y al ojo. También contiene el generador de tarjetas de pluma y los materiales.

`sv_plumaje.py` monta el plumaje. Adelgaza la tabla original del ala hasta dejarla como brazo, pone remeras, coberteras de las dos caras y timoneras, y cubre el cuerpo con plumas de contorno repartidas con un muestreo de disco de Poisson y orientadas según el eje del cuerpo. Cada pluma hereda los pesos del vértice original más cercano, de modo que el esqueleto de cuarenta y cuatro huesos y la animación `Take 001` siguen moviendo todo sin cambios.

`sv_especies.py` describe el plumaje de cada especie por zonas, la fórmula alar, la cola y los colores de pico, patas e iris. La regla de Juan Urrego del 18 de noviembre es que las aves se rigen por las de los cerros orientales de Bogotá. El tucán es *Andigena nigrirostris*. El modelo que en la carpeta se llama «Nuca» tiene forma de atlapetes, se pintó como *Atlapetes pallidinucha* y sale como `atlapetes-nuquipalido.glb`.

`sv_tanda.py` arma un ave completa y la exporta: `hacer` con el proceso de `v3/` y `hacer_v4` con patas nuevas, plumaje del cuerpo fino y oclusión horneada. `sv_poi.py` hace lo propio con los puntos de interés: suelda la malla, reconstruye cuadriláteros, bisela las aristas vivas, recalcula normales, recoge el piso cuando es mucho mayor que el objeto y hornea oclusión ambiental en el color de vértice.

`optimizar_glb.py` deja los `.glb` listos para la web sin tocar la forma ni la animación. Reencoda las texturas, las limita a un lado máximo, realza la nitidez del color y suma al mapa de normales el relieve que sugiere el propio color, y pasa a enteros normalizados las coordenadas de textura, el color y los pesos, que glTF 2.0 permite sin extensiones. `inspeccionar_glb.py` y `extraer_texturas.py` sirven para revisar un `.glb` sin abrir Blender.

`sv_patas.py` reemplaza las patas originales, que eran tubos lisos que colgaban durante el aleteo. Hunde la pata original dentro del cuerpo, quita las curvas de animación de la pierna y construye una pata nueva pegada al hueso de la cadera: tarso con escudetes, cuatro dedos con almohadillas y uñas curvas. En vuelo la deja recogida bajo el vientre con los dedos cerrados; en el pibí, posado, los dedos abrazan la rama. La tabla `PATAS` fija por especie el grosor, el largo de dedos y uñas, el color de las uñas y si los dedos son zigodáctilos, como en el tucán. Mide la pata en la geometría y no en los huesos, porque según el modelo el tarso visible cuelga de la cadera o de la rodilla.

`sv_ao.py` hornea la oclusión ambiental en el color de vértice del ave: lanza 24 rayos desde cada vértice, en la pose de reposo, contra toda el ave, y oscurece lo tapado. El visor de la app no calcula esas sombras de contacto.

`ajustar_pbr.py` cambia la rugosidad y el metal de los materiales de un `.glb`, elegidos por nombre, sin tocar color, texto ni normales. Con él la madera de los letreros pasó de aspecto de barniz plástico a madera a la intemperie.

`visor.html` y `captura.sh` son la prueba visual. La página carga los modelos con model-viewer 4.0.0 y los mismos atributos de `src/views/ModelView.js` (la luz se elige con el parámetro `env`; la de la app es `hdri/bosque-512.hdr`), y `captura.sh` la fotografía con Edge sin ventana. El parámetro `t` fija el momento de la animación, con lo que se revisa el aleteo cuadro por cuadro.

## Decisiones que conviene conocer

Los colores de las aves se escriben multiplicados por 1 entre 1,6 porque la ficha muestra los modelos con exposición 1,6. Así se ven en la app con el tono con el que se pintaron; en otro visor se verán algo más oscuros.

Los materiales de plumas no llevan capa de seda y tienen el reflejo especular bajo. Con la luz del visor esas dos cosas velaban de gris los negros y los azules oscuros.

Las alas llevan la envergadura de cada especie medida en unidades del cuerpo del propio modelo, entre 1,08 para el tucán y 2,10 para el aguililla y la golondrina. Las tablas originales eran mucho más cortas.

Las plumas usan alfa en modo MASK con corte en 0,42 y materiales de dos caras. No hay mezcla de transparencias, así que el orden de dibujo no produce defectos.

La animación `Take 001` se conserva con un solo ajuste, que hace `suavizar_aleteo` en `sv_plumaje.py`: el giro de codo, muñeca y dedos del ala queda al 30 %. En el original cada articulación gira unos 34 grados y la punta del ala se enrosca más de 130; con remeras de largo real, en el punto bajo las alas se cruzaban bajo el cuerpo. El batido del hombro y de la escápula, la cabeza y la cola no se tocan. El valor se cambia por especie con `aleteo_k`. En `v4/` las curvas de la pierna se quitan, porque la pata nueva va quieta en su pose recogida o posada.

## Cómo repetirlo

Se abre Blender con el puente, se generan las texturas del atlas con `python -I generar_atlas_plumas.py E:\SenderoModelos\trabajo\atlas_v4 1024` y, desde el conector, se llama `sv_tanda.hacer_v4("copeton")` para un ave o `sv_poi.mejorar("banca-vieja")` seguido de `sv_poi.exportar("banca-vieja")` para un punto de interés. Se construye un ave por llamada y sin llamadas en paralelo: cada una tarda entre 25 y 45 segundos y, si se encolan, el conector corta por tiempo. Después se optimiza cada ave con `python optimizar_glb.py entrada.glb salida.glb --max 1024 --cuantizar`, cada punto de interés con `--max 512 --realce 1.0` y, en los letreros, la opción `--madera` que nombra sus materiales de madera. La rugosidad de los letreros de `v4/` se ajustó con `ajustar_pbr.py` y estas reglas, en este orden: `Tablero_Info:0.6:1:0`, `Letrero_Columna:0.6:1:0`, `Tuercas:1:0.5:0.55`, `Flecha_:0.5:1:0`, `Columna:0.4:1:0`, `Tablas_Techo:0.4:1:0`, `Arriba_del_Techo:0.4:1:0`, `Techo:0.4:1:0`, `Bordes:0.4:1:0`, `Tablero_Inferior:0.4:1:0`, `Tablero_Arriba:0.4:1:0`, `_Letrero1:0.4:1:0`, `Tablero1:0.6:1:0`, `Tabla1:0.7:1:0`, `aiStandardSurface1SG:0.6:1:0`, `aiStandardSurface2SG:0.7:1:0` y `aiStandardSurface3SG:0.7:1:0`. El letrero de prohibido el paso no se ajustó.
