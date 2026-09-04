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

> **Revisión del 26/08/2026 tras auditar el prototipo del parque.** Dos ajustes de esta
> sección resultaron ser causa directa de la baja calidad y quedan corregidos abajo:
> la **obturación de 1/125 s es demasiado lenta** para captura caminando (las guías de
> captura 3DGS de 2026 piden **mínimo 1/500 s, idealmente 1/1000 s**), y el **video no es
> el mejor soporte**: los fotogramas seleccionados de una cámara de fotos dan más nitidez
> porque no arrastran compresión de video ni desenfoque de movimiento. Ver §8.3.

| Ajuste | Nuestro valor | Qué recomienda PlayCanvas | Motivo |
|---|---|---|---|
| Resolución | 4K (2160p) | **4K mínimo**; 1080p no da detalle suficiente | — |
| Cuadros por segundo | 60 fps | **60 fps o más** | — |
| Obturación | **1/500 s mínimo, 1/1000 s ideal** (corregido 26/08; antes 1/125) | **mínimo 1/500 s, ideal 1/1000 s** | A 1/125 caminando el detalle fino sale movido y el entrenamiento no puede recuperarlo |
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

### 8.3 Fotos o video, y con qué cámara (revisión del 26/08/2026)

Las guías de captura 3DGS coinciden en que **las fotos ganan**: el fotógrafo controla el
instante del disparo, no hay compresión de video de por medio y se descartan las tomas
movidas una por una. El video es más cómodo y sirve, pero paga un precio en nitidez. La
regla que sí es transversal: **más fotos no es mejor calidad; fotos movidas hay que
borrarlas**, no alimentarlas al entrenamiento.

**Cuántas.** 120–140 imágenes bastan para una escena acotada; una escena grande al aire
libre puede pedir hasta ~600, y muy rara vez se necesitan más de 300 útiles. Solape
**60–80 %** entre cuadros contiguos.

**Con qué cámara.** Contra la intuición, una réflex o mirrorless *vieja* puede rendir mejor
que un celular moderno para esto, porque da lo que el celular no da fácil: control manual
real de obturación, diafragma, ISO, enfoque y balance de blancos, sensor grande y RAW. Las
guías recomiendan justamente réflex/mirrorless con **lente equivalente 16–50 mm** y
**diafragma f/8–f/11** para nitidez y profundidad de campo. La **Sony del equipo (~2012)**
cumple ese perfil: disparando fotos en manual a f/8 y 1/1000 s produce mejor material que un
video de celular. El celular queda como cámara de apoyo y para las pasadas donde el tamaño
importa (agachado, brazo en alto).

**Condiciones.** Día **nublado** (luz pareja, sin sombras duras) y **sin viento**. Y un
criterio de encuadre que aplica de lleno a la Quebrada: **que el dosel movido por el viento
no sea el anclaje visual principal**; el ancla debe ser lo que no se mueve — el piso, los
muros, las rejas, los troncos gruesos.

## 9. Las ocho pasadas

> **Versión imprimible para llevar al campo:**
> [`docs/protocolos/protocolo-de-campo-las-ocho-pasadas.pdf`](protocolos/protocolo-de-campo-las-ocho-pasadas.pdf).
> Resume esta sección y la §8 en una hoja, con tres diagramas: por qué mirar en diagonal
> reconstruye y mirar al frente no, los tres carriles vistos desde arriba, y las tres
> alturas de cámara vistas de lado. Se regenera desde su `.html`; ver
> [`docs/protocolos/LEEME.md`](protocolos/LEEME.md). **Si el PDF y este documento se
> contradicen, manda este documento.**

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
| P7 | Centro, ida | Ojos | Vegetación y troncos de la **izquierda**, en diagonal ~45° hacia adelante (no a 90°: ver la nota) |
| P8 | Centro, regreso | Ojos | Ídem hacia la **derecha**, diagonal ~45° |

> **Por qué las pasadas laterales son las que reconstruyen (y las frontales no).** El
> paralaje —lo que permite triangular la profundidad— nace de que la cámara **se traslada**
> respecto a lo que mira, no de que gire. Caminando paralelo a la vegetación y apuntándole,
> cada paso cambia mucho el ángulo hacia esos troncos: base amplia, triangulación buena. En
> cambio, avanzar de frente mirando de frente es la **dirección degenerada**: lo que está
> adelante crece de tamaño pero casi no se desplaza angularmente. Las pasadas frontales
> (P1–P4) son necesarias para la sensación de recorrido y para cubrir lo que el visitante
> verá, pero aportan poca geometría; las laterales y cruzadas (P5–P8) son las que sostienen
> la reconstrucción.
>
> **Corrección del 26/08/2026: apuntar a 45°, no a 90°.** A 90° exactos cada tronco entra y
> sale del encuadre demasiado rápido: pocos cuadros lo ven y se pierde solape. A ~45° se ve
> venir, se pasa y se deja atrás, así que más cuadros lo capturan desde ángulos que
> convergen sobre el mismo punto. Se conserva el paralaje y se gana solape.

### 9.1 El ritmo: una foto cada dos pasos

La duda más frecuente en campo es *cada cuánto disparo*. Sale de la cuenta del solape, y
conviene entender de dónde viene para poder ajustarla en el sitio:

1. El objetivo es **60–80 % de solape** entre fotos seguidas: cada foto tiene que compartir
   la mayor parte de lo que ve con la anterior.
2. Con el 1× del celular (~26 mm equivalentes) el encuadre horizontal abarca unos **70°**.
   A los ~3 m a los que quedan los troncos del borde, eso es un ancho visible de ~4,2 m.
3. Para conservar ~70 % de solape hay que avanzar como mucho el 30 % de ese ancho: **1,2 m**.
4. Un paso normal mide ~0,6 m. Entonces: **una foto cada dos pasos, aproximadamente cada
   metro.**

**Cómo se ajusta si cambian las condiciones:** con lente más cerrado (2× del celular, o un
50 mm en la Sony) el encuadre es más angosto y hay que disparar **más seguido** — cada paso.
Si el sujeto está más lejos (una ladera al otro lado), el ancho visible crece y se puede
disparar cada tres pasos. Regla mental: *si al mirar la foto anterior no reconozco al menos
dos tercios de lo mismo, estoy disparando demasiado espaciado.*

### 9.2 Cómo se ejecuta una pasada, en concreto

Esto es lo que hace la persona que graba, en orden, sin adornos:

1. **Se ubica en el carril** que le toca a esa pasada: el eje del sendero, o pegada a un
   borde (a ~1 m del borde, no encima de la vegetación).
2. **Fija la altura** de la cámara según la pasada (a la altura de los ojos, a la cintura, o
   con el brazo estirado hacia arriba) y **no la cambia** durante toda la pasada.
3. **Fija la dirección de la mirada** según la pasada (al frente, cruzada, o en diagonal a
   45°) y **tampoco la cambia**. El cuerpo gira, la cámara mantiene su ángulo respecto al
   sendero. Es más fácil si se apunta con los hombros, no con las muñecas.
4. **Camina lento**, un paso por segundo, rodillas semiflexionadas para amortiguar el rebote,
   codos pegados al cuerpo y cámara con las dos manos.
5. **Dispara cada dos pasos** (§9.1). Cuenta mentalmente: *paso, paso, clic*.
6. **Al llegar al final del tramo, deja de disparar, se gira y vuelve a empezar** la pasada
   siguiente. Nunca se dispara mientras se gira.

**Un archivo por pasada.** Cada pasada va a su propia carpeta o a su propio clip, nombrada
con la convención del §11. Si una pasada sale mal se repite ella sola, sin contaminar las
demás y sin tener que rehacer la jornada.

### 9.3 Cuántas fotos salen y cómo se divide el sendero

Los 200 m no se capturan de una sola vez: se dividen en **tramos de ~30 m** (§3), y cada
tramo recibe sus ocho pasadas completas. La cuenta por tramo:

| | |
|---|---|
| Largo del tramo | 30 m |
| Fotos por pasada (una cada metro) | ~30 |
| Pasadas | 8 |
| **Fotos por tramo** | **~240** |
| Duración por pasada (un paso por segundo) | ~90 s |
| **Duración por tramo, con pausas** | **~20 min** |

Esas ~240 fotos por tramo caen dentro de lo que recomiendan las guías de captura para
escenas grandes al aire libre (hasta ~600 imágenes; rara vez son útiles más de 300 por
escena). **Más fotos no es más calidad**: una foto movida resta, no suma. Se borran en el
sitio, antes de bajar del cerro.

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

Hay **dos recetas** según para qué es la corrida. No son intercambiables: está medido
(19/08, ver §13 epílogo) que la rápida no alcanza acabado de publicación.

**Borrador rápido** — para verificar que el dataset cierra, probar cobertura e iterar:

```bash
brush_app.exe "ruta\al\dataset" --total-steps 30000 --max-resolution 1920 --max-splats 1500000 --export-every 10000 --export-path "ruta\salida" --export-name "escena_{iter}.ply"
```

Tiempo: **1 a 2 horas** (43 min medidos con techo 2,5 M en la RTX 3060 Ti). Advertencia
medida: con pocos pasos y pocas gaussianas, cada una se **estira** para cubrir su zona y el
resultado sale **filamentoso** — en la corrida del 18/08 (30 mil pasos, 2,5 M) la "agujeza"
mediana (ver `scripts/escenas/medir.js`) igualó el p97 de la escena de producción: vellos
por toda la cámara que ningún filtro quita sin destrozar la escena. **Un borrador no se
publica.**

**Calidad de publicación** — la corrida que produjo la scene-01 vigente:

```bash
brush_app.exe "ruta\al\dataset" --total-steps 60000 --max-resolution 3840 --max-splats 5000000 --growth-grad-threshold 0.00002 --export-every 15000 --export-path "ruta\salida" --export-name "escena_{iter}.ply"
```

Tiempo: **~19,5 h** en la RTX 3060 Ti. Esta configuración tiene una ineficiencia conocida
(§13: topa el techo de 5 M antes del paso 15.000), pero las horas restantes de
**refinamiento** son precisamente las que compran el acabado fino: gaussianas pequeñas y
redondas en vez de hilos. Es la única receta que ha producido calidad publicable.

> Candidata **por probar** para la próxima escena (aún sin evidencia): mismo presupuesto y
> pasos pero con umbral por defecto (`--total-steps 60000 --max-splats 5000000` sin tocar
> `--growth-grad-threshold`), que debería crecer orgánico sin topar y refinar igual de
> largo. Hasta no medirla contra esta, la receta oficial sigue siendo la de arriba.

**Sobre el alcance:** Brush **no tiene ningún flag espacial** — todo lo que las cámaras
vieron queda en el PLY (el nuestro llega a ±40 unidades, cielo incluido). El alcance solo
se pierde si la limpieza lo recorta; por eso la limpieza vigente **no usa cajas** (§12.4).

### 12.3.1 Los parámetros que atacan las agujas desde el entrenamiento

> Verificado el 26/08/2026 ejecutando `brush_app.exe --help` sobre nuestro propio binario
> (v0.3.0). Los valores por defecto que aparecen abajo son los que trae la herramienta.

**Por qué filtrar al final no alcanza.** Las gaussianas con forma de aguja no son basura que
se cuela: son el resultado de que al optimizador **le sale barato** estirar una gaussiana
para explicar una textura vista desde pocos ángulos. Filtrarlas después quita la astilla
pero deja el hueco, porque nunca se entrenó nada bueno en su lugar. La literatura lo
describe igual: las gaussianas alargadas se sobreajustan a las vistas de entrenamiento y
producen los picos que se ven al mover la cámara (Spectral-GS, 2024; Mip-Splatting, CVPR
2024). El arreglo real es que **durante** el entrenamiento salga caro ser una aguja.

**Lo que Brush ya tiene, y el hallazgo importante:**

| Parámetro | Por defecto | Qué hace | Lectura |
|---|---|---|---|
| `--scale-loss-weight` | `1e-8` | Penaliza gaussianas desproporcionadas | **Está prácticamente apagado.** Es la palanca directa contra las agujas y nunca la hemos usado |
| `--opac-loss-weight` | `1e-9` | Penaliza gaussianas casi transparentes | También apagado. Ataca la neblina y los flotantes en origen, no con filtro |
| `--mean-noise-weight` | `40` | Inyecta ruido en la posición de las gaussianas de baja opacidad | Ya activo. Es el mecanismo de las densificaciones tipo MCMC: en vez de acumular basura semitransparente, la sacude para que se reubique o muera |
| `--ssim-weight` | `0.2` | Peso del término SSIM frente a L1 | Estructura sobre color plano |
| `--lpips-loss-weight` | — | Pérdida perceptual | Sin explorar |

O sea: **la mitad del arsenal anti-agujas viene de fábrica desactivado.** Eso explica por qué
las astillas sobrevivían al entrenamiento y solo las veíamos al final.

**El experimento pendiente, y cómo se mide.** No hay que adivinar si sirve: ya tenemos la
métrica. `scripts/escenas/medir.js` calcula la **agujeza** (`max − medio` de las escalas
logarítmicas), y la referencia de producción está anotada ahí mismo: p50 1,41 · p90 2,63 ·
p99 3,57. El procedimiento:

1. Entrenar un tramo corto con los valores por defecto y medir su agujeza.
2. Repetir subiendo `--scale-loss-weight` **en potencias de 10** (`1e-7`, `1e-6`, `1e-5`…),
   una corrida por valor, todo lo demás igual.
3. Medir cada resultado con `medir.js` y anotar agujeza y número de gaussianas.
4. Quedarse con el valor más alto que baje la agujeza **sin** empezar a borronear el detalle
   fino: pasado cierto punto, penalizar la escala aplana la vegetación. El punto de corte se
   ve en el visor, no en la métrica.
5. Registrar el valor elegido en este documento como parte de la receta.

Hasta no correr ese experimento, lo anterior es una hipótesis fundamentada, no un resultado
medido. Se documenta como pendiente, no como receta.

**Lo que Brush NO tiene.** No implementa el filtro anti-aliasing de Mip-Splatting (el filtro
3D de suavizado más el filtro 2D que sustituye la dilatación), que es la otra mitad del
arreglo descrito en la literatura. Si tras el experimento las agujas siguen molestando, el
siguiente paso ya no es tocar parámetros sino **cambiar de entrenador** por uno con
rasterización antialiaseada (Nerfstudio con el backend gsplat, o Postshot). Eso es un cambio
de herramienta, con su propio costo de aprendizaje: no se hace antes de agotar lo barato.

### 12.3.2 El cielo

El cielo es un caso aparte y conviene entenderlo antes de pelearlo: **está infinitamente
lejos, así que no tiene paralaje**. Por más fotos que se tomen, dos vistas separadas diez
metros ven el cielo exactamente igual, y sin paralaje no hay triangulación posible. Lo que
el entrenamiento produce ahí no es geometría: es una cáscara de gaussianas semitransparentes
puestas a cierta distancia arbitraria, que es justo lo que se ve como flotantes y manchas
cuando uno levanta la vista.

Hay dos caminos y conviene elegir a conciencia:

- **Reconstruirlo igual.** Requiere pasadas mirando hacia arriba (P4 ya pica hacia abajo; se
  necesitaría su simétrica) y aceptar que quedará borroso. Sirve si lo que se quiere es el
  dosel visto desde abajo, que **sí** tiene paralaje porque las ramas están a 10–15 m, no en
  el infinito. **Esto es lo que de verdad nos interesa de "capturar el cielo": el dosel.**
- **Sustituirlo en el visor.** El cielo propiamente dicho se resuelve mejor con un fondo
  sintético en PlayCanvas que intentando reconstruirlo. Queda limpio, pesa nada y no mete
  flotantes. Es una decisión de la capa de visor, no del entrenamiento.

Recomendación: **capturar bien el dosel** (es geometría real y da la sensación de bosque) y
**no pelear el cielo abierto**; ese se pone después en el visor.

### 12.3.3 ¿COLMAP sigue siendo lo correcto?

Sí, por ahora, con una salvedad. COLMAP es el estándar sobre el que se apoya prácticamente
todo el ecosistema de splatting, y su versión 4.1.0 (2025) trajo dos cosas relevantes para
nosotros: **ajuste de haces acelerado por GPU** y **reconstrucción nativa de panorámicas
360**, además del ejemplo `panorama_sfm.py` que convierte una equirectangular en caras
virtuales en perspectiva y las registra como *rig*. Eso último abre la puerta a usar una
cámara 360 sin cambiar de pipeline.

La salvedad es que nuestro cuello de botella **no ha sido COLMAP**: con 1/30 de los cuadros
alineó 987 de 1.110 imágenes con error de reproyección de 1,01 px, que es un buen resultado.
Lo que falló fue la captura (obturación lenta, cobertura angular pobre) y el entrenamiento
(regularizadores apagados). Cambiar de motor de poses antes de arreglar eso sería optimizar
la parte que ya funciona.

Si en algún momento COLMAP sí se vuelve el problema — reconstrucciones partidas en varios
modelos, o tiempos de horas que estorben la iteración — el reemplazo natural es **GLOMAP**,
del mismo grupo, que resuelve el mismo problema de forma global y mucho más rápida. Queda
anotado como salida, no como tarea.

### 12.4 Limpieza SIN caja de recorte (vigente desde el 19/08)

La regla suprema: **el alcance completo del entrenamiento se conserva**. Nada de cajas
espaciales — solo se quitan defectos medibles: NaN, agujas (gaussianas gigantes en algún
eje) y neblina (opacidad casi nula). Los umbrales **se miden en el propio archivo**, no se
inventan. Las herramientas viven versionadas en `scripts/escenas/`.

```bash
# 1) Radiografía: conteo, NaN, percentiles de escala, extensión por eje y "agujeza"
node scripts/escenas/medir.js entrenado.ply

# 2) Filtrar en log-espacio: tope de agujas = el p99,7 de ESE archivo (lo da medir.js);
#    niebla = alfa > 0,05 (logit -2,944). Sin cajas.
node scripts/escenas/filtrar.js entrenado.ply limpio.ply <p99,7 medido> -2.944

# 3) Comprimir a SOG desempaquetado (meta.json + .webp) directo a la carpeta de la escena
npx --yes @playcanvas/splat-transform -w limpio.ply assets/scenes/scene-01/meta.json
```

**Por qué `filtrar.js` y no `--filter-value` de splat-transform:** medimos (18/08) que
`--filter-value` compara en espacio **lineal/activado** (sigma, alfa) y **rechaza valores
negativos** ("No Gaussians to write"), así que no puede aplicar topes en log-espacio como
el p99,7. El filtro propio lee el PLY en streaming y solo decide qué filas quedan.

**La escena publicada (19/08) salió exactamente así:** `final_60000.ply` (5 M) →
p99,7 = −1,5607 y alfa > 0,05 → quitó solo el **3,65 %** → 4,82 M de gaussianas → SOG de
68 MB (archivo mayor 15 MB, bajo el límite de 25 MiB por archivo de Cloudflare Pages).

**Checklist antes de dar una limpieza por buena:**

1. `medir.js` del resultado: extensión por eje SIN "clavos" en un valor redondo (un
   mín/máx clavado en ±15 delata una caja — así se detectó el recorte histórico), NaN en
   cero, agujeza cerca de la referencia de producción (p50 1,41 · p90 2,63 · p99 3,57).
2. En el visor: los **BORDES** de la escena (rejas, fondo de la alameda, cielo), no solo
   el centro, y el recorrido andado completo.
3. Peso: ningún archivo del SOG por encima de 25 MiB.

> **Por qué quedó prohibida la caja (lección del 18/08).** `--filter-box` se aplica en el
> marco de coordenadas de COLMAP, que sale con orientación arbitraria (el nuestro estaba
> 151,5° torcido): una caja alineada a esos ejes rebana el mundo en diagonal. Con ±15 —y
> peor, con una segunda caja vertical para "recortar cielo"— desaparecieron las rejas del
> costado izquierdo y el fondo entero de la escena. La neblina y el cielo se controlan con
> `opacity`; lo lejano no molesta: pesa poco y da profundidad real.

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

### Epílogo (19/08): las 14 horas no estaban perdidas

El diagnóstico de arriba sigue siendo cierto — el crecimiento estaba mal configurado y topó
temprano — pero la conclusión de "peor negocio" resultó **falsa**. Dos descubrimientos con
evidencia:

1. **Las horas de refinamiento compraron el acabado.** Del paso 15.000 al 60.000 no nació
   ninguna gaussiana, pero las 5 M existentes se volvieron finas y redondas. Métrica
   "agujeza" (`max − medio` de las escalas log, con `scripts/escenas/medir.js`):

   | Corrida | Gaussianas | Pasos | Agujeza p50 / p90 / p99 |
   |---|---|---|---|
   | 19,5 h (producción) | 5 M | 60.000 | **1,41 / 2,63 / 3,57** |
   | Receta rápida (18/08) | 2,5 M | 30.000 | 2,10 / 5,23 / 8,31 |

   La rápida tiene su **mediana** al nivel del p97 de producción: hilos de 180:1 visibles
   como vellos junto a la cámara, imposibles de filtrar sin destrozar la escena.

2. **El "recorte" de la escena vieja nunca fue del entrenamiento.** El PLY crudo de esta
   corrida siempre tuvo el alcance completo (±40 unidades, cielo incluido); la caja ±15 se
   aplicó en la limpieza. Re-limpiado SIN caja (§12.4) es la scene-01 publicada el 19/08.

> **Regla revisada:** el intento fallido se juzga por su MECÁNICA (aquí: creció mal), pero
> el archivo exportado se juzga con métricas y el visor antes de tirarlo. Y la calidad de
> publicación necesita **presupuesto** (≈5 M) y **pasos de refinamiento** (≈60 mil): ni el
> umbral doblado (mata el crecimiento, 18/08 tarde) ni la receta corta (deja hilos, 18/08
> noche) llegan.

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

> **Matiz medido el 19/08:** "más gaussianas no es mejor" aplica al PSNR por primitiva,
> pero el ACABADO (gaussianas finas en vez de hilos, ver §13 epílogo) sí necesita
> presupuesto: la scene-01 publicada usa 4,82 M y se ve mejor que cualquier intento con
> menos. La contradicción con el presupuesto móvil se resolvió por otra vía: **en celular
> el visor sirve por defecto la escena Luma liviana** (933 mil gaussianas, decidido en
> `src/app/main.js`), así que los 4,82 M solo los paga el escritorio.

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
