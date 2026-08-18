# Producción de escenas: del campo a la web

> Versión 2,0, 17/08/2026 · Responsable: Juan Urrego
> Unifica los antiguos «plan de visitas de campo» (07), «guía de captura en campo» (11)
> y «parámetros de entrenamiento» (12), más la parte de captura de
> [`decisiones/ADR-002`](decisiones/ADR-002-lod-por-proximidad.md) y la §3 del antiguo
> «avances de tecnología» (hoy [`07-tecnologia.md`](07-tecnologia.md)). **Es el único documento del pipeline de escenas.**
>
> Todo lo que lleva número medido viene de la escena de práctica del parque
> (9 pasadas, 4K60, RTX 3060 Ti). No hay estimaciones disfrazadas de mediciones.

---

## 0. El recorrido completo, de un vistazo

```
CAMPO                          MÁQUINA                              WEB
──────                         ────────                             ────
V1 reconocer  ──┐
V2 capturar   ──┼─► clips 4K60 ─► ffmpeg ─► COLMAP ─► Brush ─► splat-transform ─► SOG
V3 audio      ──┤                  §12.1     §12.2     §12.3     §12.4 · §16          │
V4 verificar  ◄─┘                                                                     │
                                                                        config/scenes.json
                                                                                      │
                                                                                el visor §19
```

Tiempo de máquina por escena, medido: **~5 h** (3,5 h de COLMAP + 1,5 h de entrenamiento).
Las tres escenas del sendero son **~15 h de máquina** que hay que reservar en el Sprint 2.

---

# PARTE I · CAMPO

## 1. Cuántas visitas y por qué cuatro

**Cuatro visitas de 5 h.** Es el mínimo que cubre las cuatro cosas distintas que hay que
hacer en campo sin que ninguna se contamine con otra:

| Visita | Qué resuelve | Por qué no se puede fusionar con otra |
|---|---|---|
| **V1 · Reconocimiento** | Decidir | Decidir y grabar a la vez es como se pierde una mañana buena: se graba sin saber qué se quiere |
| **V2 · Captura principal** | Grabar el tramo | Necesita condiciones concretas (nublado, sin viento, primera hora) que no se piden por anticipado |
| **V3 · Captura complementaria** | Audio, fauna, huecos | El audio binaural y los cantos necesitan **silencio**, y la captura de video necesita **luz**: son ventanas horarias distintas |
| **V4 · Verificación** | Comprobar | Solo tiene sentido **después** de ver la reconstrucción en pantalla |

**20 h de campo por persona que asista a las cuatro.** Con 12 h semanales por persona, una
visita de 5 h consume el 42 % de la semana de quien va.

### 1.1 Cuáles bloquean

```
V1 (reconocer) ── V2 (capturar) ── procesamiento ── M2
                        │
        V3 (audio y complemento) ···· S5 (fichas)     ← holgura
                        │
                       V4 (verificar) ····· S4        ← holgura
```

**Solo V1 y V2 están en el camino crítico.** Si V3 o V4 se caen por clima, el proyecto sigue.
Si V2 se cae, se activa la ventana de contingencia dentro de V3. Eso es lo que hace que
cuatro visitas sean más seguras que dos, no solo más caras.

El cronograma, las horas por persona y los hitos son propiedad de
[`../plan/plan_de_trabajo.md`](../plan/plan_de_trabajo.md). Aquí no se repiten.

---

## 2. V1 · Reconocimiento: **sin grabar**

| | |
|---|---|
| **Cuándo** | Semana 2: **18 – 24 de agosto de 2026**. Día exacto `[por confirmar con la reserva del Acueducto]` |
| **Quién** | **Todo el equipo**: Juan Urrego, Felipe Acevedo, Eybar Viasus, Alberto Alemán, Alejandra Chambueta, David Beltrán |
| **Duración** | 5 h |
| **Qué NO se hace** | **No se graba video de captura.** Nada de protocolo 4K60, nada de pasadas. Fotos de referencia y notas, sí |

### 2.1 Por qué no se graba

Porque no sabemos todavía qué queremos grabar. El protocolo exige exposición, foco y
balance de blancos bloqueados, ocho pasadas a distintas alturas y un día nublado sin
viento. Gastar esa combinación de condiciones antes de haber decidido dónde empiezan y
terminan los 200 m, dónde van los puntos de interés y qué se quiere que el visitante
sienta, es tirar la ventana.

**V1 es la visita donde se toman las decisiones creativas.** Con todo el equipo delante del
sitio, no en una reunión.

### 2.2 Qué tiene que salir cerrado de V1

Es la definición de "hecho" de la visita:

- [ ] **El tramo exacto.** Punto de inicio marcado con GPS y punto de los 200 m marcado con GPS. Fotografiados ambos.
- [ ] **El corte por etapas.** Dónde termina cada una de las tres escenas (§3).
- [ ] **Los puntos de interés.** Cuáles, dónde exactamente y de qué tipo (fauna, flora, patrimonio). Con foto y coordenada de cada uno.
- [ ] **Dónde circulan las aves.** Es lo que decide dónde va cada marcador de fauna: el POI se ancla donde el ave está, no donde queda bonito.
- [ ] **La duración real.** Cuánto se tarda en recorrer 200 m a paso de captura, para calibrar el ritmo del recorrido virtual (HU-24).
- [ ] **El desnivel y la pendiente reales de los 200 m**, con GPS. Hoy están `[por medir en campo]`.
- [ ] **Los puntos de interés no vivos:** puertas derrumbadas, muros, monumentos, tramos de camino con historia. Ficha de contenido en [`06-contenido-de-la-experiencia.md`](06-contenido-de-la-experiencia.md) §A.5.
- [ ] **El mapa sonoro** (§5).
- [ ] **La paleta contra el lugar.** Eybar contrasta los verdes propuestos con el verde real del follaje (validación D1).
- [ ] **El objeto de escala.** Qué se va a usar y dónde se va a colocar en V2.
- [ ] **Las condiciones.** Hora de mejor luz, dónde pega el viento, dónde hay gente.
- [ ] **V14:** ¿la banda de alta densidad de 1 m lateral basta donde el sendero se ensancha?
- [ ] **A5:** ¿se cuela el ruido de la Circunvalar? Dónde y a qué hora.

### 2.3 Quién mira qué en V1

Cada quien va con un encargo, para que cinco horas rindan:

| Persona | Encargo en V1 |
|---|---|
| **Juan Urrego** | Marcar inicio, 200 m y cortes de escena con GPS. Medir desnivel y pendiente. Decidir el objeto de escala |
| **Felipe Acevedo** | Identificar especies visibles y sus lugares de paso. Fotos de referencia para modelado. Contrastar contra el catálogo ([`06-contenido-de-la-experiencia.md`](06-contenido-de-la-experiencia.md) §A) |
| **Alejandra Chambueta** | Evaluar riesgo de reconstrucción por zona: dónde hay elementos duros, dónde solo follaje, dónde el agua va a dar problemas |
| **David Beltrán** | Probar la grabación de GPS y de audio. Levantar el mapa sonoro. Verificar que el track tiene la precisión que la capa de datos necesita |
| **Eybar Viasus** | Paleta contra el sitio. Legibilidad de un marcador a contraluz. Dónde encuadra bien una ficha |
| **Alberto Alemán** | Bitácora de la visita. Puntos de interés patrimoniales e históricos. Recorrido desde los ojos de alguien que va por primera vez |

### 2.4 Qué se lleva

Celular con GPS · grabadora de audio · libreta · cinta métrica o distanciómetro · el
catálogo de fauna impreso · las propuestas de paleta impresas · **reserva confirmada por la
app del Acueducto para las seis personas**.

---

## 3. Las etapas del tramo

**Compromiso firme: 200 m desde el inicio del sendero**, en tres escenas encadenadas.

| Etapa | Escena | Metros | Estado |
|---|---|---|---|
| **Etapa 1** | `scene-01` | 0 – 70 m | Comprometida |
| **Etapa 2** | `scene-02` | 70 – 140 m | Comprometida |
| **Etapa 3** | `scene-03` | 140 – 200 m | Comprometida |
| Etapa 4 | `scene-04` | 200 – 260 m | **Opcional.** Solo si S2 cierra con holgura |

> **Ojo con el identificador `scene-01`.** Hoy, en `config/scenes.json`, `scene-01` es la
> **escena de práctica del parque**, no la Etapa 1 del sendero. Cuando llegue el material
> real hay que renombrar o reservar identificadores, o se pisan entre sí.

Los cortes de 70 m y 140 m son **provisionales**: se ajustan en V1 a puntos naturales del
sendero (un giro, un puente, un cambio de pendiente), porque una transición entre escenas
se disimula mucho mejor donde el visitante ya está girando la cabeza.

**Sobre ampliar el tramo:** si al cerrar S2 las tres escenas están dentro de presupuesto y
el equipo tiene margen, se añade la Etapa 4. **No al revés.** Si hay que recortar, el orden
de sacrificio está en [`../plan/plan_de_trabajo.md`](../plan/plan_de_trabajo.md) §11.

> Las cifras de desnivel y pendiente del tramo de 200 m están **`[por medir en campo]`** y se
> cierran en V1. Las cifras de **340 m / 62 m / 9 %** que aparecen en documentos anteriores
> corresponden al **tramo de referencia evaluado en ADR-001, no al tramo comprometido**. No
> se reutilizan. La altitud de inicio, **2.712 msnm**, procede del registro GPS público del
> sendero y se confirma en V1.

---

## 4. V2, V3 y V4

### V2 · Captura principal

| | |
|---|---|
| **Cuándo** | Semana 3: **25 – 31 de agosto de 2026**, lo antes posible dentro de la semana |
| **Quién** | Juan Urrego (captura), David Beltrán (GPS y audio), Alejandra Chambueta (verificación en sitio), Felipe Acevedo (fotos de referencia) |
| **Duración** | 5 h |
| **Condiciones** | Día nublado, sin viento, a primera hora. **No negociable** |

Se ejecuta la Parte II de este documento **exactamente como está escrita**, sobre el tramo y
las etapas decididas en V1, con el objeto de escala presente.

**Criterio de hecho:** material respaldado en **dos ubicaciones distintas antes de terminar
el día** (riesgo R8).

### V3 · Captura complementaria y contingencia

| | |
|---|---|
| **Cuándo** | Semana 4: **1 – 7 de septiembre de 2026** |
| **Quién** | David Beltrán (audio), Felipe Acevedo (referencias), Alberto Alemán (bitácora y patrimonio), + Juan si hay que recapturar |
| **Duración** | 5 h |

Doble función, y se decide cuál al terminar V2:

- **Si V2 salió bien:** lo que V2 no puede dar — **grabación de audio ambiente binaural** en
  las posiciones del mapa sonoro (§5), cantos de aves a primera hora, fotos de detalle para
  modelado, y el registro fotográfico de los POIs patrimoniales.
- **Si V2 falló** (clima, material inservible): es la **ventana de contingencia** y se repite
  la captura completa.

### V4 · Verificación en campo

| | |
|---|---|
| **Cuándo** | Semana 6: **15 – 21 de septiembre de 2026** |
| **Quién** | Juan Urrego, Alejandra Chambueta, Felipe Acevedo |
| **Duración** | 5 h |

Se va **con la reconstrucción cargada en un celular** y se compara contra el sitio:

- [ ] ¿Se reconoce el lugar? Es la promesa central del producto y hasta aquí nadie la ha comprobado.
- [ ] ¿Los anclajes de los POIs caen donde deben?
- [ ] ¿La escala y la altitud del track corresponden con la realidad? (cierra la validación V9)
- [ ] ¿Qué zonas quedaron mal reconstruidas y se pueden recapturar en el sitio, ahí mismo?

Es la visita más barata de todas y la única que puede evitar descubrir en la semana 13 que
el tramo no se parece al sendero.

---

## 5. El mapa sonoro

La ambientación es **binaural, con audio espacial 3D**, y eso empieza en campo. V1 levanta
el mapa; V3 graba. Lo que hay que anotar en V1, con coordenada y foto:

- [ ] **Dónde suena la quebrada** y con qué intensidad. Es la fuente sonora ancla del recorrido.
- [ ] **Dónde hay silencio** o solo viento. El contraste es lo que hace que el agua signifique algo.
- [ ] **Dónde canta qué**, y a qué hora.
- [ ] **Dónde se cuela la ciudad** (tráfico de la Circunvalar). Para no grabar ahí y para no sorprenderse después (validación A5).
- [ ] **La altura de la fuente** respecto al oído: el cauce suele ir por debajo, y en audio espacial eso se nota.

Diseño técnico completo: [`06-contenido-de-la-experiencia.md`](06-contenido-de-la-experiencia.md) §C.

---

## 6. Reglas de campo: no negociables

Aplican a las cuatro visitas.

1. **Reserva previa obligatoria** por la app del Acueducto, para cada persona y cada salida.
2. **No se sale del trazado autorizado.** Ni por un mejor ángulo de cámara. El sendero está dentro de una reserva protegida.
3. **No se manipula fauna ni flora.** Nada se recoge, nada se mueve, nada se toca para que salga mejor en la foto.
4. **Nada de datos inventados.** Lo que no se mide se marca `[por medir en campo]`.
5. **El material se respalda en dos ubicaciones el mismo día.**

---

# PARTE II · CAPTURA

## 7. Antes de salir

- [ ] Día **nublado, sin viento, a primera hora**. Si hay viento, se aplaza: el follaje en movimiento es la primera causa de flotantes.
- [ ] Celular cargado y con espacio libre suficiente (**~2 GB por cada 10 minutos de 4K60**).
- [ ] Lente limpio (pasarle un paño antes de configurar).
- [ ] **Objeto de escala**: algo de tamaño conocido (regla, hoja A4, metro extendido) visible al inicio del tramo. Es lo que después permite convertir unidades del entrenamiento a metros reales.
- [ ] Reserva previa por la app del Acueducto (§6).

## 8. Configuración de la cámara

Video 4K a 60 fps con exposición, foco y balance de blancos **manuales y bloqueados**. La
cámara nativa del iPhone no permite fijar obturación e ISO en video; una app gratuita que sí
lo permite es **Blackmagic Camera** (sugerencia operativa, no requisito del protocolo).

| Ajuste | Nuestro valor | Qué recomienda PlayCanvas | Motivo |
|---|---|---|---|
| Resolución | 4K (2160p) | **4K mínimo**; 1080p no da detalle suficiente | — |
| Cuadros por segundo | 60 fps | **60 fps o más** | — |
| Obturación | 1/125 s fija (1/250 con buena luz) | **mínimo 1/125 s** a pulso | Congela el detalle a pulso |
| ISO | Fijo, el más bajo con exposición correcta (bajo árboles, 400 es normal) | 100–400 (200–400 en día nublado) | Se prefiere grano a desenfoque: subir ISO antes que bajar obturación |
| Exposición | Bloqueada en manual | **Bloqueada en manual**, evita parpadeo entre cuadros | Es el ajuste crítico |
| Balance de blancos | Fijo (nublado, ~6500 K) | Fijo | Consistencia entre cuadros |
| Enfoque | Manual, fijado a ~2 m, sin tocarlo más | **Manual, muy preferible** | El autofoco variable arruina la reconstrucción |
| Lente | 1x (principal). No usar la 0.5x | Focal equivalente 35–85 mm; desaconseja **< 24 mm** | Ver §8.1 |
| Estabilización | Apagada | — | La estabilización electrónica deforma cada cuadro de manera distinta |
| Solapamiento | Ocho pasadas caminando despacio | 70–80 % entre vistas contiguas | `[por validar en campo]` |
| Dispositivo | iPhone 13 o equivalente | iPhone 13 Pro+, Pixel 7+, Galaxy S22+ | Alineado |
| Qué evitar | — | Superficies reflectantes, objetos en movimiento, cambios de exposición | El agua del cauce y el follaje al viento son exactamente eso |

**Regla de oro:** se configura **una sola vez** al llegar, con la luz del sitio, y no se toca
nada hasta terminar todas las pasadas. Verificar antes de empezar que ningún valor cambia
solo al mover la cámara.

### 8.1 El hallazgo de la focal (validación V1, abierta)

PlayCanvas recomienda 35–85 mm equivalentes y desaconseja el ultra gran angular (< 24 mm).
En un iPhone 13, el **1x equivale a ~26 mm**: justo por debajo del rango recomendado.

**No se cambia el stack ni el dispositivo.** Entra como prueba explícita: un segmento corto
con 1x y otro con 2x, y se decide con evidencia. El 1x da más contexto por cuadro y menos
pasadas; el 2x se acerca al rango recomendado pero exige muchas más pasadas para cubrir el
mismo tramo. La decisión queda registrada en la issue de HU-02.

### 8.2 Qué más se registra en campo

Además del video: **track GPS** del recorrido, **audio ambiente y cantos**, **una foto por
POI**, y **el objeto de tamaño conocido** dentro de la escena. Lo último es lo que permite
que la capa de datos (altitud, distancia, desnivel) se corresponda con la geometría
reconstruida y no con unidades arbitrarias del entrenamiento.

## 9. Las ocho pasadas

Caminar **lento** (un paso por segundo, rodillas semiflexionadas, codos pegados al cuerpo,
cámara con las dos manos). En un tramo de 30 m cada pasada toma ~90 segundos. **Un clip por
pasada**: si una sale mal se repite sola, sin contaminar las demás. Al final de cada pasada
se corta la grabación, se gira y se arranca el clip siguiente; los giros grabados producen
cuadros borrosos inservibles.

```
        <- ~1 m ->   eje del sendero   <- ~1 m ->
   P5 ->  -----------------------------------  <- P6
                 P1 -> (ida)
                 <- P2 (regreso)
                 P3 -> (agachado)
                 <- P4 (brazo en alto)
```

| # | Recorrido | Altura | La cámara apunta a |
|---|---|---|---|
| P1 | Centro, ida | Ojos | Adelante, inclinada 10 a 15 grados hacia abajo |
| P2 | Centro, regreso | Ojos | Adelante (cubre la vista de quien mira hacia atrás) |
| P3 | Centro, ida | Agachado (cintura) | Adelante y ligeramente abajo: es la pasada del piso |
| P4 | Centro, regreso | Brazo en alto | Picada hacia abajo ~30 grados |
| P5 | Borde izquierdo, ida | Ojos | Cruzada hacia el centro y la derecha (30 a 45 grados) |
| P6 | Borde derecho, regreso | Ojos | Cruzada hacia el centro y la izquierda |
| P7 | Centro, ida | Ojos | Lateral izquierda: vegetación y troncos de ese lado |
| P8 | Centro, regreso | Ojos | Lateral derecha |

Las ocho pasadas **materializan la banda de alta densidad del ADR-002**: desde el suelo hasta
≈ 1 m por encima de la altura de los ojos (≈ 2,6 m sobre el suelo), y ≈ 1 m a cada lado del
eje del trazado. Fuera de la banda (copas, cielo, ladera alta) se captura cobertura de
contexto, con menos pasadas: se reduce el detalle, **no se elimina el contenido**.

Si sobra tiempo, dar una media órbita lenta (180 grados) a uno o dos elementos duros
importantes (tronco grueso, piedra, baranda): los elementos duros son el ancla geométrica de
la escena.

## 10. Qué no hacer

- **No apuntar al cielo.** No tiene rasgos que la reconstrucción pueda emparejar, quema la exposición y las nubes se mueven. El cielo que se cuele entre las copas es suficiente.
- **No grabar con viento**, ni gente, perros o vehículos cruzando el cuadro.
- **No dejar entrar la propia sombra ni los pies** al encuadre.
- **No confiar en superficies de agua o reflejos**: se reconstruyen mal y es una limitación esperada, no un error de captura.
- **No cambiar ningún ajuste a mitad de sesión.** Si la luz cambia de forma drástica (se abre el sol), es mejor pausar y esperar.
- **No usar zoom digital** para la captura principal.

## 11. Al terminar, el mismo día

1. **Respaldar el material en dos ubicaciones distintas antes de terminar el día** (riesgo R8). No es opcional y no espera al día siguiente.
2. Pasar los clips al PC y arrancar la Parte III.

---

# PARTE III · PROCESAMIENTO

> Todo lo de esta parte está **medido** sobre la escena de práctica del parque: 9 pasadas de
> video 4K60, ~30 m, en una **RTX 3060 Ti de 8 GB**.

## 12. La receta recomendada

Si tienes que producir una escena hoy, esto es lo que hay que ejecutar, en orden.

### 12.1 Extracción de cuadros

**1 de cada 20.** Con 1 de cada 30 (que es lo que hicimos) COLMAP registró **987 de 1.110
imágenes, el 89 %**, con error de reproyección de **1,01 px** — que es muy bueno — pero las
otras 121 quedaron en un **segundo modelo desconectado**, sin aprovechar. Más solape entre
cuadros consecutivos hace más probable que todas las pasadas caigan en un solo modelo.

```bash
ffmpeg -i P1.mov -vf "select=not(mod(n\,20))" -fps_mode vfr -q:v 2 frames/P1_%04d.jpg
```

Meta orientativa para 30 m: entre 500 y 1.500 imágenes en total. Si la alineación sale con
huecos, bajar a 1 de cada 10.

> Recuperar cobertura perdida es imposible después. **Ningún parámetro de entrenamiento
> compensa lo que no se grabó.**

### 12.2 Alineación (SfM) con COLMAP

```bash
colmap feature_extractor  --database_path db.db --image_path frames --SiftExtraction.use_gpu 1
colmap exhaustive_matcher --database_path db.db --SiftMatching.use_gpu 1
colmap mapper             --database_path db.db --image_path frames --output_path sparse
```

**Criterio de aceptación: un solo modelo.** Si `sparse/` sale con `0/` y `1/`, hay cobertura
perdida — se resuelve extrayendo más cuadros, no reentrenando.

### 12.3 Entrenamiento con Brush

```bash
brush_app.exe "ruta\al\dataset" --total-steps 30000 --max-resolution 1920 --max-splats 1500000 --export-every 10000 --export-path "ruta\salida" --export-name "escena_{iter}.ply"
```

Tiempo esperado: **1 a 2 horas**, contra las 19,5 h de nuestra primera corrida "de máxima
calidad", que resultó ser peor negocio (§13).

### 12.4 Limpieza, en dos pasadas separadas

```bash
# 1) Acotar: quita gigantes, lejanas y casi invisibles. Caja AMPLIA (±30): ver la advertencia
splat-transform entrada.ply --filter-nan --filter-value scale_0,lt,0.5 --filter-value scale_1,lt,0.5 --filter-value scale_2,lt,0.5 --filter-box -30,-30,-30,30,30,30 --filter-value opacity,gt,0.05 acotado.ply

# 2) Ahora sí, flotantes (la escena ya tiene un volumen sano)
splat-transform acotado.ply --filter-floaters limpio.ply

# 3) Neblina fuera y compresión a SOG desempaquetado (meta.json + varios .webp)
splat-transform limpio.ply --filter-value opacity,gt,0.15 assets/scenes/scene-01/meta.json
```

> **La caja de recorte corta en diagonal (lección del 18/08).** `--filter-box` se aplica en
> el marco de coordenadas de COLMAP, que sale con orientación arbitraria (el nuestro estaba
> 151,5° torcido): una caja alineada a esos ejes rebana el mundo en diagonal. Con ±15 —y
> peor, con una segunda caja vertical para "recortar cielo"— desaparecieron las rejas del
> costado izquierdo de la escena. **Regla: caja única y generosa (±30) solo para descartar
> lo lejano; la neblina y el cielo se controlan con `opacity`, nunca con un recorte
> espacial; y antes de dar una limpieza por buena se verifican los BORDES de la escena en
> el visor, no solo el centro.**

### 12.5 Nivelación y publicación

Medir el `sceneUp` (§16), anotarlo en `config/scenes.json`, verificar en el visor local y
después en la URL de la rama (§19).

---

## 13. El error que costó 14 horas

Nuestra corrida "definitiva" se lanzó con `--max-resolution 3840`, `--total-steps 60000`,
`--max-splats 5000000` y `--growth-grad-threshold 0.00002`. Duró **19 h 29 min**.

Los cuatro archivos exportados (pasos 15.000, 30.000, 45.000 y 60.000) pesan **exactamente
lo mismo: 1.125,3 MB**. Ese peso corresponde a 5.000.000 de gaussianas justas, que era el
techo que le pusimos.

**Traducción: el entrenamiento chocó contra el techo antes del paso 15.000 y las 14 horas
siguientes no crearon ni una sola gaussiana nueva.** Solo reacomodó las que ya tenía,
repartidas con estadísticas tempranas, que son las más ruidosas. El modelo nunca convergió:
topó.

### Por qué chocó

Dos errores que se multiplicaron:

1. **Bajamos el umbral de crecimiento a la mitad** (`0.00002` cuando el valor por defecto de
   la versión 0.3.0 es `0.00004`).
2. **Entrenamos a 3840 px cuando el umbral está calibrado para 1920 px.** En el código de
   Brush el peso de refinamiento se multiplica por el tamaño de la imagen, así que a 4K cada
   píxel pedía gaussianas con el doble de fuerza.

Combinados: **cuatro veces más agresivo que el valor por defecto**.

> **Regla que sacamos de esto:** si subes la resolución, el umbral de crecimiento hay que
> subirlo en la misma proporción, no bajarlo. O más simple: **no toques el umbral.**

---

## 14. Más gaussianas no es mejor

Es contraintuitivo, pero está medido:

- Brush documenta **PSNR 29,01 con 1,65 M de gaussianas** de media, frente a ~28,95 con
  3,25 M de las implementaciones de referencia. **Alcanza más calidad con la mitad de
  primitivas**: está diseñado así.
- Nuestros 5 M para 30 metros de parque son **el triple** de ese punto de operación.
- El valor por defecto de `--max-splats` en la versión 0.3.0 es **10.000.000**. Nuestro 5 M
  no era un techo bajo: ya era una reducción.

Y hay una restricción que manda sobre todo lo demás: **PlayCanvas documenta un presupuesto de
1 millón de gaussianas para móvil** y 3+ millones para escritorio. Con 5 M estábamos cinco
veces por encima de lo que un celular puede mover a 30 fps.

### 14.1 Peso y descarga

| | |
|---|---|
| PLY entrenado (5 M gaussianas, SH grado 3) | 1.125 MB |
| SOG comprimido | 70 MB (**16×** menos) |
| Tiempo de descarga a 10 Mbps | **58,7 s** |
| Objetivo del proyecto (RNF-002) | **menos de 10 s** |

**Estamos casi 6 veces fuera del objetivo.** Y el peso del SOG lo fija el **número de
gaussianas**, no los armónicos esféricos: en el formato SOG los armónicos se guardan en una
paleta compartida y cada gaussiana solo apunta a ella con 2 bytes. Quitar bandas de armónicos
ahorra un 2 % del archivo; reducir el conteo de gaussianas es lo único que lo baja de verdad.

> **Objetivo práctico: 1,5 M de gaussianas por escena.** Eso da unos 21 MB, que se descargan
> en 17 s a 10 Mbps y caben en el presupuesto de render móvil.

---

## 15. Tiempos medidos (RTX 3060 Ti, 8 GB)

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
necesitan unas **15 horas de máquina en total** (3,5 h de COLMAP + 1,5 h de entrenamiento por
escena). Con la receta equivocada serían casi 70 horas. Hay que reservar esos días en el
Sprint 2.

---

## 16. Nivelación de la escena

La reconstrucción sale en orientación arbitraria: COLMAP no sabe dónde está el suelo. La
nuestra salía **151,5° torcida**.

**Se corrige midiendo el "arriba" real en las poses de cámara.** Como se camina sosteniendo el
teléfono más o menos derecho, el promedio del eje −Y de todas las cámaras *es* la vertical de
la escena.

```bash
colmap model_converter --input_path sparse/0 --output_path sparse/0_txt --output_type TXT
```

Después se promedia el eje −Y de cada pose (las líneas de 10 campos que terminan en el nombre
del archivo) y el resultado va a `config/scenes.json` como `sceneUp`. El visor calcula con él
la rotación, con `Quat().setFromDirections(up, Vec3.UP)`. Verificado: **0,00° de desviación**
tras aplicarlo.

> **No conviertas esa rotación a ángulos de Euler a mano.** Las convenciones no coinciden y
> nos dio 65° de error. Deja que el motor la calcule desde el vector.

---

## 17. Los filtros: qué arreglan y qué no

**Lo que NO arreglan:** los **rayones blancos brillantes**. Probamos filtrar por brillo del
color base (`f_dc_0,lt,2.2`) y siguen ahí, porque su luminosidad viene de los armónicos
esféricos, no del color plano. **Esos se borran a mano en SuperSplat**, con el lazo, y toma
diez minutos.

### Trampas de `splat-transform`

**El filtro de flotantes calcula el volumen del archivo de ENTRADA, no del ya filtrado.** Si
la escena tiene gaussianas gigantes o lejanas, cree que mide kilómetros y muere intentando
crear billones de vóxeles. Error real que vimos:

```
scene: 7.42km x 8.05km x 5.89km, grid: 148384 x 160984 x 117788 voxels (2810T) @ 5cm
```

**Hay que filtrar los TRES ejes de escala, no solo uno.** Filtramos `scale_0` y seguía fallando
porque quedaban gaussianas con `scale_1` de 1.346 (la mediana es 0,0015). Por eso la receta de
§12.4 va en **dos pasadas separadas**.

Resultado medido con la receta correcta: de 5 M a 4,74 M de gaussianas en **2 minutos**, sin
pérdida visible.

---

## 18. Cosas de Brush que conviene saber

- **`mip-splatting` no está disponible** en la versión publicada (v0.3.0, septiembre de 2025).
  Existe en el código de desarrollo, pero usarlo exige compilar desde el fuente. Corrige
  aliasing en follaje, así que puede valer la pena más adelante.
- **Si actualizas Brush, no arrastres los parámetros.** El valor por defecto de
  `growth-grad-threshold` cambió de `0.00004` a `0.0025` entre versiones: un factor de 62,5.
  Arrastrar el valor viejo provoca crecimiento desbocado y agotamiento de memoria.
- **El entrenamiento no publica el número de paso en ningún archivo**, solo en su consola. Para
  seguir el avance, lo que sirve son los archivos exportados (`--export-every`).
- **Memoria:** 5 M de gaussianas a 3840 px consumieron 7,7 GB de los 8 GB de VRAM y 12,8 GB de
  RAM del sistema. Es el límite de la 3060 Ti; con 1,5 M sobra margen.

### 18.1 Alternativas sin GPU propia

**Luma AI** (subir el video, procesado en la nube) sirve para tener algo rápido, pero da menos
control y más limpieza posterior. **RealityScan** hace la alineación SfM y es gratuito para uso
individual. Usamos **COLMAP** porque produce las poses en el formato que Brush lee directamente
y porque su salida es la que permite medir el `sceneUp` (§16).

---

## 19. Publicar la escena en el visor

1. La carpeta de salida va a `assets/scenes/<id>/` (`meta.json` + los `.webp`).
2. **Límite de Cloudflare Pages: 25 MiB por archivo.** El formato desempaquetado reparte el
   peso en varios `.webp`, así que cabe; un `.sog` empaquetado de 70 MB **no**. Por eso el
   proyecto versiona la carpeta desempaquetada y no el `.sog`.
3. Registrar la escena en `config/scenes.json` con su `sogUrl` y su `sceneUp`.
4. Verificar en local y luego en la **URL de la rama** (ver [`../CONTEXTO-EQUIPO.md`](../CONTEXTO-EQUIPO.md)).

---

## 20. Checklist del Sprint 2

- [ ] Extraer **1 de cada 20** cuadros.
- [ ] Verificar que COLMAP produzca **un solo modelo**. Si salen dos, hay cobertura perdida.
- [ ] Entrenar con **valores por defecto**: 1920 px, 30.000 pasos, sin tocar el umbral.
- [ ] Techo de **1,5 M de gaussianas** por escena (presupuesto móvil y peso de descarga).
- [ ] Medir el **`sceneUp`** de cada escena y anotarlo en `config/scenes.json`.
- [ ] Limpiar en **dos pasadas** (acotar y luego flotantes) y rematar a mano en SuperSplat.
- [ ] Reservar **~5 horas de máquina por escena**, unas 15 h en total.
- [ ] Cerrar **V4** (peso real de una escena nuestra en SOG → fija RNF-003).

---

## 21. Referencias

- Decisión de nivel de detalle: [`decisiones/ADR-002`](decisiones/ADR-002-lod-por-proximidad.md)
- Elección del sendero: [`decisiones/ADR-001`](decisiones/ADR-001-eleccion-de-sendero.md)
- Herramientas y por qué estas: [`07-tecnologia.md`](07-tecnologia.md)
- Contratos de `config/`: [`03-arquitectura.md`](03-arquitectura.md)
- Historias asociadas: [`04-backlog.md`](04-backlog.md) — HU-02, HU-03, HU-04, HU-06, HU-07, HU-42
- Cómo levantar y probar el visor: [`../CONTEXTO-EQUIPO.md`](../CONTEXTO-EQUIPO.md)
- Guía oficial de captura: [Taking Photos, PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/taking-photos/)
- Herramientas recomendadas: [Recommended Tools, PlayCanvas](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/recommended-tools/)
