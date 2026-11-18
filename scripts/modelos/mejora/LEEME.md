# Mejora de los modelos de las fichas

Con estos scripts se produjeron los veintitrés modelos de `assets/models/v2/` a partir de los `.glb` de la carpeta compartida «Modelos glb». El trabajo se hizo el 17 y el 18 de noviembre de 2026 con Blender 4.5.1 LTS, manejado desde el conector de Blender de Claude. Los originales de la carpeta compartida no se modificaron.

## Qué hace cada archivo

`manifest.tsv` lista los veintitrés originales con el nombre que tienen en la carpeta compartida y el nombre local que usa el proceso. Se descargan de esa carpeta y se guardan en `E:\SenderoModelos\originales`, en las subcarpetas `aves` y `poi`. Esa carpeta de trabajo es la que el código llama `RAIZ` en `sv_lib.py`; quien repita el proceso en otro equipo cambia esa constante.

`puente_mcp.py` es un puente local para el conector. El conector espera un complemento dentro de Blender que no estaba instalado; este archivo habla el mismo protocolo en `127.0.0.1:9876`. Blender se abre con `blender --python puente_mcp.py` y desde ese momento el conector ejecuta código en esa ventana. Cada llamada corre en un espacio de nombres nuevo, así que el estado que debe sobrevivir se guarda en `sv_lib.ESTADO`.

`sv_lib.py` reúne lo común: limpiar la escena, importar un `.glb`, montar la luz de estudio con la misma exposición de la ficha, encuadrar la cámara, renderizar vistas y exportar con piel y animación.

`generar_atlas_plumas.py` dibuja el atlas de plumas que comparten todas las aves. Son veinticuatro celdas en gris con alfa, entre plumas de contorno, coberteras, remeras y timoneras, lisas o con estría, borde, barras o banda, y su mapa de normales. El gris multiplica el color de vértice de cada pluma, y por eso un solo atlas sirve para todas las especies.

`sv_aves.py` lee el ave original. Reconstruye el eje del cuerpo con cortes perpendiculares a la recta que va de la cabeza a la punta de la cola y da a cada punto de la piel unas coordenadas de plumaje: `s` a lo largo del cuerpo, `theta` alrededor del eje, y en la cabeza `phi` y `lam` respecto al pico y al ojo. También contiene el generador de tarjetas de pluma y los materiales.

`sv_plumaje.py` monta el plumaje. Adelgaza la tabla original del ala hasta dejarla como brazo, pone remeras, coberteras de las dos caras y timoneras, y cubre el cuerpo con plumas de contorno repartidas con un muestreo de disco de Poisson y orientadas según el eje del cuerpo. Cada pluma hereda los pesos del vértice original más cercano, de modo que el esqueleto de cuarenta y cuatro huesos y la animación `Take 001` siguen moviendo todo sin cambios.

`sv_especies.py` describe el plumaje de cada especie por zonas, la fórmula alar, la cola y los colores de pico, patas e iris. La regla de Juan Urrego del 18 de noviembre es que las aves se rigen por las de los cerros orientales de Bogotá. El tucán es *Andigena nigrirostris*. El modelo que en la carpeta se llama «Nuca» tiene forma de atlapetes, se pintó como *Atlapetes pallidinucha* y sale como `atlapetes-nuquipalido.glb`.

`sv_tanda.py` arma un ave completa, saca vistas de revisión y la exporta. `sv_poi.py` hace lo propio con los puntos de interés: suelda la malla, reconstruye cuadriláteros, bisela las aristas vivas, recalcula normales, recoge el piso cuando es mucho mayor que el objeto y hornea oclusión ambiental en el color de vértice.

`optimizar_glb.py` deja los `.glb` listos para la web sin tocar la forma ni la animación. Reencoda las texturas, las limita a un lado máximo, realza la nitidez del color y suma al mapa de normales el relieve que sugiere el propio color, y pasa a enteros normalizados las coordenadas de textura, el color y los pesos, que glTF 2.0 permite sin extensiones. `inspeccionar_glb.py` y `extraer_texturas.py` sirven para revisar un `.glb` sin abrir Blender.

`visor.html` y `captura.sh` son la prueba visual. La página carga los modelos con model-viewer 4.0.0 y los mismos atributos de `src/views/ModelView.js`, y `captura.sh` la fotografía con Edge sin ventana. El parámetro `t` fija el momento de la animación, con lo que se revisa el aleteo cuadro por cuadro.

## Decisiones que conviene conocer

Los colores de las aves se escriben multiplicados por 1 entre 1,6 porque la ficha muestra los modelos con exposición 1,6. Así se ven en la app con el tono con el que se pintaron; en otro visor se verán algo más oscuros.

Los materiales de plumas no llevan capa de seda y tienen el reflejo especular bajo. Con la luz pareja del visor, esas dos cosas velaban de gris los negros y los azules oscuros.

Las alas llevan la envergadura de cada especie medida en unidades del cuerpo del propio modelo, entre 1,08 para el tucán y 2,10 para el aguililla y la golondrina. Las tablas originales eran mucho más cortas.

Las plumas usan alfa en modo MASK con corte en 0,42 y materiales de dos caras. No hay mezcla de transparencias, así que el orden de dibujo no produce defectos.

La animación `Take 001` se conserva con un solo ajuste, que hace `suavizar_aleteo` en `sv_plumaje.py`: el giro de codo, muñeca y dedos del ala queda al 30 %. En el original cada articulación gira unos 34 grados y la punta del ala se enrosca más de 130; con remeras de largo real, en el punto bajo las alas se cruzaban bajo el cuerpo. El batido del hombro y de la escápula, la cabeza, las patas y la cola no se tocan. El valor se cambia por especie con `aleteo_k`.

## Cómo repetirlo

Se abre Blender con el puente, se generan las texturas del atlas con `python generar_atlas_plumas.py E:\SenderoModelos\trabajo\atlas 1024` y, desde el conector, se llama `sv_tanda.hacer("copeton", carpeta_de_renders)` para un ave o `sv_poi.mejorar("banca-vieja")` seguido de `sv_poi.exportar("banca-vieja")` para un punto de interés. Conviene construir dos o tres aves por llamada, porque el conector corta las llamadas que pasan de un minuto largo. Después se optimiza cada archivo con `python optimizar_glb.py entrada.glb salida.glb --max 1024 --cuantizar` en las aves y con `--max 512 --realce 1.0` en los puntos de interés.
