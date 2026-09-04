# Contenido de la experiencia: qué se ve, qué se lee y qué se oye

> Versión 2,0, 17/08/2026
> Unifica los antiguos «catálogo de fauna y flora» (05), «identidad visual» (06) y
> «ambientación sonora» (08), la parte normativa de
> [`decisiones/ADR-003`](decisiones/ADR-003-audio-binaural-espacial.md) y los POIs de
> patrimonio del antiguo «plan de visitas de campo» §5.
>
> **Tres partes, tres responsables.** Cada quien edita su parte:
>
> | Parte | Qué cubre | Responsable |
> |---|---|---|
> | **A** | Fauna, flora y patrimonio (el contenido que afirman las fichas) | Felipe Acevedo · patrimonio: Alberto Alemán |
> | **B** | Identidad visual (paleta, tipografía, ficha, marcadores) | Eybar Viasus, con Alberto Alemán |
> | **C** | Ambientación sonora (lecho, fuentes espaciales, reglas de audio) | David Beltrán |

---

# PARTE A · FAUNA, FLORA Y PATRIMONIO

> Responsable: Felipe Acevedo, con revisión de Juan Urrego. Patrimonio: Alberto Alemán.
> **Es la fuente de verdad del contenido que afirman las fichas.**
> Regla dura: **nada se publica sin fuente citable o medición propia.** Lo no verificado va
> marcado `[por verificar]` y **no** se rellena.

## A.1 Para qué sirve

Las fichas afirman nombres científicos, rangos de altitud y consejos de avistamiento. La
gente se los va a creer. Este catálogo existe para que ningún dato entre a `config/pois.json`
sin haber pasado por aquí primero.

Tres niveles de confianza, y se marcan siempre:

| Marca | Qué significa |
|---|---|
| **Verificado** | Aparece con nombre científico en al menos una de las fuentes citadas en §A.8 |
| **Por verificar** | El nombre común es de uso corriente en Bogotá, pero **no está confirmado** para este sendero en las fuentes consultadas |
| **Discrepancia** | Dos fuentes citables dan nombres científicos distintos. Se resuelve antes de publicar |

**Nada que esté en "por verificar" o "discrepancia" puede llegar a una ficha publicada sin
resolverse.**

## A.2 Qué hay realmente en Santa Ana - La Aguadora

El sendero está en la zona rural del barrio Santa Bárbara, localidad de Usaquén, dentro de la
**Reserva Forestal Protectora Bosque Oriental de Bogotá**. El recorrido es el **circuito Bosque
de Pinos, de 3,1 km**, que termina en el Mirador Santa Ana. Lo acompaña la **quebrada Santa
Bárbara**.

Hay **dos fuentes primarias**, y conviene saber qué aporta cada una porque no se solapan:

- **La ficha oficial del Acueducto** para este sendero describe los ecosistemas y la fauna y
  flora que se ve, pero **cita los nombres comunes sin binomio** y no publica una lista de
  especies. Sirve para saber qué hay; no sirve para publicar una ficha con nombre científico.
- **eBird**, para las aves, sí da la lista completa con binomios: el punto de registro
  [`L9738611` «Club La Aguadora / Sendero Santa Ana»](https://ebird.org/hotspot/L9738611)
  acumula **121 especies** de todos los años.

**Ecosistemas presentes:** bosque altoandino, subpáramo y **bosque de pinos introducido**. Ese
mosaico de tres ecosistemas en un circuito corto es una ventaja para el proyecto: más variedad
visual en 200 metros de la que ofrecería un tramo homogéneo.

**Lectura para el proyecto:** hay muchísimo más contenido del que cabe en 5–6 fichas. El
catálogo de abajo no es «lo que hay»: es **la lista candidata de la que se eligen los POIs**, y
la elección definitiva se toma en la visita de reconocimiento, en función de qué se ve
realmente en los 200 m del tramo.

## A.3 Aves

Son el eje del proyecto: cada ave del sendero visible desde el recorrido lleva su modelo 3D,
su ficha, su canto y su animación de aleteo (RF-029).

**Todas las de esta tabla están registradas en el propio sendero**, no en los Cerros Orientales
en general. Es la primera vez que el catálogo tiene esa precisión.

| Nombre común | Nombre científico | Estado | POI candidato |
|---|---|---|---|
| Colibrí chillón | *Colibri coruscans* | Verificado | **Confirmado** |
| Colibrí inca (Inca de Bogotá) | *Coeligena bonapartei* | Verificado | Sí |
| Trogón enmascarado | *Trogon personatus* | Verificado | Sí |
| Tángara ventriescarlata | *Anisognathus igniventris* | Verificado | Sí, **recomendada** por contraste de color |
| Colibrí picoespada | *Ensifera ensifera* | Verificado | Sí, silueta inconfundible |
| Tororoí compadre | *Grallaria ruficapilla* | Verificado | Sí |
| Mirla patinaranja (Mirlo grande) | *Turdus fuscater* | Verificado | Sí |
| Copetón (Gorrión chingolo) | *Zonotrichia capensis* | Verificado | Sí |
| Pava andina | *Penelope montagnii* | Verificado | Sí |
| Tucán de montaña / terlaque | *Andigena nigrirostris* | Verificado | Sí, baja probabilidad de avistamiento |
| Golondrina ventriparda | *Orochelidon murina* | Verificado | Candidata |
| Golondrina albiazul | *Pygochelidon cyanoleuca* | Verificado | Candidata |
| Autillo chóliba | *Megascops choliba* | Verificado | No, nocturno |

Fuente de toda la tabla: eBird, punto `L9738611`. Lista completa e imprimible con las 121
especies: <https://ebird.org/printableList?regionCode=L9738611&yr=all&m=>

**Dos cosas que esta lista resolvió:**

1. **La pava andina deja de tener discrepancia.** El registro del sendero es *Penelope
   montagnii*, no *P. obscura*.
2. **La mirla y el copetón dejan de estar «por verificar».** Estaban fuera del catálogo por
   falta de fuente para el sendero concreto; ahora la tienen.

**El periquito de alas amarillas (*Pyrrhura calliptera*) no está registrado en este sendero** y
por eso no aparece en la tabla. El único loro del punto es la cotorrita de anteojos
(*Forpus conspicillatus*).

### A.3.1 Las cuatro aves del catálogo base

Tres están cerradas y la cuarta espera decisión:

1. **Colibrí chillón** · *Colibri coruscans*
2. **Colibrí inca** · *Coeligena bonapartei*
3. **Trogón enmascarado** · *Trogon personatus*
4. `[por decidir]` — la recomendación es la **tángara ventriescarlata** (*Anisognathus
   igniventris*), porque con dos colibríes y un trogón el catálogo 3D se lee monótono y su
   vientre rojo con azul rompe esa monotonía. Alternativas igualmente verificadas: colibrí
   picoespada o tororoí compadre.

Las cuatro se modelan con nombre científico impreso desde el principio: **todas tienen fuente
citable para este sendero**, así que ninguna ficha nace con marca de pendiente.

### A.3.2 Rangos de altitud

| Especie | Rango | Fuente |
|---|---|---|
| *Colibri coruscans* | 1.700 – 3.500 msnm | Ya consignado en la especificación del proyecto |
| Resto de especies | `[por verificar]` | |

## A.4 Mamíferos

La ficha del Acueducto para este sendero cita la fauna que se observa, **con nombre común y sin
binomio**. Los binomios de abajo vienen del catálogo regional de los Cerros Orientales y quedan
`[por confirmar para este sendero]`.

| Nombre común | Nombre científico | Estado | Nota |
|---|---|---|---|
| **Cusumbo andino / coatí de montaña** | *Nasuella olivacea* `[por confirmar]` | Citado por el Acueducto para este sendero | El Acueducto lo nombra explícitamente |
| **Zarigüeya / chucha / runcho** | *Didelphis pernigra* `[por confirmar]` | Citada por el Acueducto para este sendero | |
| **Ardilla** | *Sciurus granatensis* `[por confirmar]` | Citada por el Acueducto para este sendero | La más fácil de avistar de día |

**El zorro perro no consta** en la documentación de este sendero y por tanto no es candidato a
POI. Si la visita encuentra rastro, se añade con la evidencia; sin ella, no se publica.

### A.4.1 Sobre los mamíferos como POI

Los tres citados son de avistamiento posible pero no garantizado. Sirven como POI **solo si la
visita de reconocimiento encuentra rastro, madriguera o punto de paso** dentro de los 200 m.
Una ficha de fauna anclada a un punto donde el animal no pasa nunca es una promesa que el
recorrido no cumple.

## A.5 Anfibios y reptiles

La ficha del Acueducto para este sendero cita la presencia de **reptiles y anfibios** sin
detallar especies. **No hay lista con binomios**, y la regla del proyecto impide publicar una
ficha sin fuente citable.

`[por verificar]` — Consultar el inventario de la Secretaría de Ambiente o del Jardín Botánico
para los Cerros Orientales, sector Usaquén, y contrastarlo en la visita.

## A.6 Flora

Igual que con los mamíferos: el Acueducto publica **nombres comunes sin binomio**. Los binomios
quedan pendientes de una fuente botánica citable.

### A.6.1 Vegetación nativa citada para este sendero

| Nombre común | Nombre científico | Estado |
|---|---|---|
| **Helechos** | `[por verificar]` | Citados por el Acueducto · **el helecho arborescente sigue siendo POI candidato** |
| **Trompeto** | `[por verificar]` | Citado por el Acueducto |
| **Aliso** | `[por verificar]` | Citado por el Acueducto |
| **Gaque** | `[por verificar]` | Citado por el Acueducto |
| **Frailejones pequeños** | `[por verificar]` | Citados por el Acueducto · marcan la transición a subpáramo |
| **Uva camarona** | `[por verificar]` | Citada por el Acueducto |

**El encenillo no consta** en la documentación de este sendero. El papel de árbol estructural del
bosque altoandino lo ocupan aquí el **aliso**, el **gaque** y el **trompeto**.

### A.6.2 Vegetación introducida presente

| Nombre común | Nombre científico | Estado |
|---|---|---|
| **Pino** | `[por verificar]` | El circuito atraviesa un bosque de pinos: es el rasgo que da nombre al recorrido |
| **Eucalipto** | `[por verificar]` | Citado por el Acueducto |
| **Urapán** | `[por verificar]` | Citado por el Acueducto |
| **Acacia** | `[por verificar]` | Citada por el Acueducto |

**El retamo espinoso no consta** en la documentación de este sendero. La vegetación introducida
documentada aquí tiene un ángulo narrativo propio: **el bosque
de pinos es introducido y a la vez es el rasgo que da identidad al recorrido**, lo que permite
contar la tensión entre paisaje plantado y bosque nativo sin recurrir a una especie invasora.

## A.7 Patrimonio: los puntos de interés que no están vivos

El sendero tiene contexto histórico documentado: por el valle del Teusacá pasaban **rutas de
intercambio muiscas** que conectaban comunidades distantes, y la ficha del Acueducto lo señala
como parte de la historia del lugar.

`[por identificar en la visita]` — Qué elementos construidos hay dentro de los 200 m del tramo:
muros, canalizaciones, señalización antigua o infraestructura del acueducto.

**La regla dura del patrimonio no cambia:** un dato histórico sin fuente citable no se publica.
Si no hay fuente, la ficha describe lo que se ve y marca la historia como `[por verificar]`, sin
inventarla. El campo `sourceUrl` es obligatorio en los POIs de tipo patrimonio.

## A.8 Fuentes consultadas

- [Acueducto de Bogotá, Sendero Santa Ana - La Aguadora](https://www.acueducto.com.co/wps/portal/EAB2/Home/ambiente/senderos/santa_ana_la_aguadora) — **fuente primaria**, es el administrador del sendero. Describe ecosistemas, fauna y flora con **nombre común y sin binomio**
- [eBird, punto `L9738611` «Club La Aguadora / Sendero Santa Ana»](https://ebird.org/hotspot/L9738611) — **fuente primaria de las aves**, 121 especies registradas con binomio. Lista imprimible: <https://ebird.org/printableList?regionCode=L9738611&yr=all&m=>
- [Guía de aves de los Cerros Orientales, Secretaría de Ambiente](https://oab.ambientebogota.gov.co/guia-de-aves-camino-guadalupe-aguanoso/) — elaborada por Edward Martín López (SDA) y María Fernanda Barón (Jardín Botánico). Cubre explícitamente este sendero
- [Visit Bogotá, ruta Santa Ana la Aguadora](https://visitbogota.co/es/rutas-turisticas/-ruta-turistica-santa-ana-la-aguadora-4235) — datos de acceso y recorrido
- [Bogotá.gov.co, apertura del sendero Santa Ana La Aguadora](https://bogota.gov.co/mi-ciudad/habitat/senderos-ecologicos-de-bogota-apertura-sendero-santa-ana-la-aguadora) — datos distritales
- [Fundación Cerros de Bogotá, Fauna](https://cerrosdebogota.org/index.php/fauna/) — catálogo regional de los Cerros Orientales, sirve de pista para binomios que luego hay que confirmar para este sendero

### Fuentes pendientes de consultar (para cerrar los «por verificar»)

- **Binomios de la flora:** el Acueducto publica los nombres comunes sin nombre científico. Hay que cerrarlos con el **Jardín Botánico de Bogotá** o el **SiB Colombia**: helechos, trompeto, aliso, gaque, frailejones, uva camarona, y las cuatro introducidas.
- **Anfibios y reptiles:** el Acueducto los cita sin especies. Buscar el inventario de la Secretaría de Ambiente o del Jardín Botánico para los Cerros Orientales, sector Usaquén.
- **Binomios de mamíferos confirmados para este sendero:** los de cusumbo, zarigüeya y ardilla vienen del catálogo regional y hay que confirmarlos aquí.
- **Guía de aviturismo de Bogotá (Instituto Distrital de Turismo):** nombres comunes de uso local.

Responsable: Felipe Acevedo. Es criterio de «hecho» de ART-06.

## A.9 Qué se decide en la visita de reconocimiento (V1)

Este catálogo es la lista **candidata**. Lo que V1 tiene que cerrar:

- [ ] Qué especies se ven u oyen realmente en los 200 m del tramo, y **dónde** circulan
- [ ] Cuáles de esas tienen un lugar de paso identificable donde anclar el POI
- [ ] Si el cusumbo, la zarigüeya o la ardilla tienen rastro o lugar de paso plausible en el tramo
- [ ] Qué helecho arbóreo concreto hay, para poder verificar la especie
- [ ] Qué se ve del bosque de pinos desde el trazado, y si da para POI de flora introducida
- [ ] Qué anfibios y reptiles se identifican, que la ficha del Acueducto cita sin especies
- [ ] Qué elementos de patrimonio hay y dónde (§A.7)

Procedimiento de la visita: [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §2.
Contrato de datos de los POIs: [`03-arquitectura.md`](03-arquitectura.md).
Historias de modelado y verificación: [`04-backlog.md`](04-backlog.md), bloque ART.

---

# PARTE B · IDENTIDAD VISUAL

> Responsable: Eybar Viasus, con Alberto Alemán.
> **Estado: paleta y tokens definidos y en uso.** Los diez hex de §B.2 ya están implementados
> en el visor. Lo que sigue abierto es la tipografía concreta (D2), el modo claro (D3) y la
> validación contra el sitio real (D1, D4). La auditoría formal de accesibilidad es HU-38, en S7.

## B.1 El encargo

Paleta de **grises, negros y verdes**, resaltando **la quebrada y la fauna** del tramo. La
interfaz aparece sobre todo en las interacciones de ver cada especie en su punto de interés,
es decir, **la ficha es la pantalla que más importa**.

De ahí salen tres reglas de partida:

1. **El fondo no compite.** Grises y negros sostienen la imagen; la escena capturada es lo que se mira. Ningún elemento de interfaz introduce un color que no esté en el bosque.
2. **El verde es del contenido, no del cromo.** Los verdes marcan lo vivo: el marcador de una especie, el nombre científico, el estado activo. No se usan para bordes, separadores ni fondos decorativos.
3. **Un solo acento distinto al verde: el agua.** La quebrada es lo que da nombre al lugar. Se reserva un verde-azulado único para todo lo relacionado con el cauce y con los datos del recorrido.

## B.2 Tokens de color

Nombres en inglés (convención de código); descripción en español.

| Token | Hex | Para qué |
|---|---|---|
| `--sv-black-900` | `#0E1210` | Fondo base de ficha y de HUD sobre escena oscura |
| `--sv-gray-800` | `#1B211E` | Superficie elevada: panel de ficha, tarjetas |
| `--sv-gray-600` | `#3A423E` | Bordes, separadores, estados deshabilitados |
| `--sv-gray-400` | `#6E7873` | Texto secundario **solo sobre fondo claro** |
| `--sv-gray-200` | `#B9C1BC` | Texto secundario sobre fondo oscuro |
| `--sv-gray-050` | `#EDF1EF` | Texto principal sobre fondo oscuro; fondo de modo claro |
| `--sv-green-700` | `#1F5D3A` | Verde bosque. Texto de énfasis **sobre fondo claro** |
| `--sv-green-500` | `#2E8B57` | Verde señal. Marcador de fauna y flora, estado activo |
| `--sv-green-300` | `#6FCF97` | Acento **sobre fondo oscuro**: nombre científico, enlaces |
| `--sv-water-400` | `#4FA3A5` | Acento único de la quebrada: HUD de datos, marcador de agua |

### B.2.1 Contraste verificado

Calculado según WCAG 2.1 sobre `--sv-black-900` (`#0E1210`) y sobre `--sv-gray-050` (`#EDF1EF`).

| Combinación | Ratio | AA texto normal (4,5:1) | AA texto grande / UI (3:1) |
|---|---|---|---|
| `gray-050` sobre `black-900` | **≈ 16,6 : 1** | Cumple | Cumple |
| `gray-200` sobre `black-900` | **≈ 10,2 : 1** | Cumple | Cumple |
| `green-300` sobre `black-900` | **≈ 9,9 : 1** | Cumple | Cumple |
| `water-400` sobre `black-900` | **≈ 6,5 : 1** | Cumple | Cumple |
| `green-700` sobre `gray-050` | **≈ 6,9 : 1** | Cumple | Cumple |
| `green-500` sobre `gray-050` | **≈ 3,7 : 1** | **NO cumple** | Cumple |

**Regla que sale de la tabla:** `--sv-green-500` es un color de **marcador y de componente de
interfaz**, nunca de texto corrido sobre fondo claro. Para texto sobre claro se usa
`--sv-green-700`.

> Los ratios están calculados, no estimados. La auditoría formal contra la interfaz construida
> sigue siendo **HU-38**, en S7.

### B.2.2 Lo que la paleta prohíbe

- Rojo, naranja o amarillo como color de interfaz. No hay nada de eso en el bosque y rompería la lectura de la escena. (Excepción única y obligatoria: los estados de error de RNF-007, que usan `--sv-gray-050` sobre `--sv-black-900` con un icono, **nunca solo color**, lo exige RNF-006.)
- Degradados sobre la escena capturada.
- Comunicar cualquier dato **solo** por color. Siempre hay texto o forma acompañando (RNF-006).

## B.3 Tipografía

| Uso | Familia | Peso | Tamaño móvil | Nota |
|---|---|---|---|---|
| Nombre común de la especie | Sans humanista | 600 | 22 px | Lo primero que se lee en la ficha |
| Nombre científico | Sans humanista, **cursiva** | 400 | 15 px | Cursiva por convención taxonómica, no por estilo |
| Cuerpo de la ficha y narración | Sans humanista | 400 | 16 px | Nunca por debajo de 16 px en móvil |
| Datos del HUD | Sans, cifras **tabulares** | 500 | 18 px | Las cifras tabulares evitan que el número "salte" al actualizarse |
| Etiqueta del HUD | Sans, versalitas | 500 | 12 px | ALTITUD · RECORRIDO · DESNIVEL · PENDIENTE |

**Familia concreta:** `[por decidir en S7]`. El criterio es cerrado aunque la familia no lo
esté: una sans humanista de licencia libre, con cursiva real (no oblicua sintética, porque el
nombre científico la necesita) y con cifras tabulares. La decisión se toma junto con el sistema
de diseño en HU-39 y se registra ahí.

## B.4 La ficha de punto de interés

Es la pantalla donde vive la interfaz. Jerarquía de arriba abajo:

```
┌──────────────────────────────────┐
│   [ visor 3D, fondo black-900 ]  │  ← el modelo ocupa la mitad superior
│      modelo girable + zoom       │     animación idle de aleteo activa
├──────────────────────────────────┤
│  Colibrí chillón                 │  ← gray-050, 600, 22 px
│  Colibri coruscans               │  ← green-300, cursiva, 15 px
│                                  │
│   Escuchar narración      0:48   │  ← control de audio, nunca automático
│   Escuchar el canto              │  ← solo si type = "fauna"
│   Ver transcripción              │  ← obligatorio si hay narración
│                                  │
│  Vive entre 1.700 y 3.500 msnm   │  ← gray-200, 16 px
│  Cómo identificarlo en campo…    │
│  Consejos para avistarlo…        │
└──────────────────────────────────┘
```

**Reglas de la ficha:**

- El modelo 3D entra ya encuadrado y **con la animación idle corriendo** (RF-029). El visitante no tiene que hacer nada para que el ave se vea viva.
- El nombre científico va en cursiva y en `green-300`. Es el único texto en color de la ficha.
- Los tres controles de audio se ven **apagados** al abrir. Ninguno suena solo (RNF-008).
- Ancho mínimo de trabajo: **375 px**. La ficha se diseña primero a ese ancho, no después.

## B.5 El marcador en la escena

Tres estados, diferenciados **por forma y por tamaño además de por color** (RNF-006):

| Estado | Color | Forma | Cuándo |
|---|---|---|---|
| Reposo | `--sv-gray-200` al 60 % | Círculo pequeño con anillo | El POI está lejos |
| Cercano | `--sv-green-500` | Círculo mayor + etiqueta con el nombre común | El visitante está en rango |
| Activo | `--sv-green-300` | Círculo relleno + anillo exterior | La ficha está abierta |

Los marcadores de **agua y de datos del recorrido** usan `--sv-water-400` en lugar del verde.
Los de **patrimonio** (§A.7) usan `--sv-gray-050` sobre relleno `--sv-gray-800`: son grises
deliberadamente, porque no están vivos y la paleta lo dice.

## B.6 Cómo se implementa

Los tokens son la **única** fuente de color de la aplicación.

```css
:root {
  --sv-black-900: #0E1210;
  --sv-gray-800:  #1B211E;
  --sv-gray-600:  #3A423E;
  --sv-gray-400:  #6E7873;
  --sv-gray-200:  #B9C1BC;
  --sv-gray-050:  #EDF1EF;
  --sv-green-700: #1F5D3A;
  --sv-green-500: #2E8B57;
  --sv-green-300: #6FCF97;
  --sv-water-400: #4FA3A5;
}
```

> **Estado real hoy:** el prototipo declara estos tokens **en línea, dentro de `index.html`**,
> porque todavía no existe `styles/tokens.css`. Cuando Eybar cree la hoja de estilos, hay que
> mover el bloque y dejar `index.html` importándola — no duplicarlo en los dos sitios.

**Invariante:** ningún archivo `.js` ni ningún componente escribe un color literal. El código
lee el token (en el visor, con `colorFromToken()`). Si hace falta un color que no está aquí,
se añade aquí primero, y se le calcula el contraste antes de usarlo.

**Dueños:** `styles/` es de **Eybar Viasus y Alberto Alemán**. Los tres programadores consumen
los tokens; no los definen. Ver [`03-arquitectura.md`](03-arquitectura.md).

## B.7 Qué queda abierto

| # | Pregunta | Dueño | Se cierra en |
|---|---|---|---|
| D1 | ¿La paleta funciona sobre la escena capturada real, o el verde se pierde contra el follaje? | Eybar Viasus | V1 (reconocimiento) + S5 |
| D2 | ¿Qué familia tipográfica concreta? | Eybar Viasus | S7 (HU-39) |
| D3 | ¿Hace falta modo claro, o el recorrido siempre va sobre fondo oscuro? | Alberto Alemán | S7 |
| D4 | ¿El marcador se lee a contraluz, con el cielo detrás? | Eybar Viasus | S5 (HU-25) |

**D1 y D4 son los importantes**, y los dos se responden mirando el sitio, no la pantalla. Por
eso Eybar va a la visita de reconocimiento.

---

# PARTE C · AMBIENTACIÓN SONORA

> Responsable: David Beltrán, con Alberto Alemán (contenido) y Felipe Acevedo (edición).
> Decisión de arquitectura: [`decisiones/ADR-003`](decisiones/ADR-003-audio-binaural-espacial.md).
> **Este documento es la especificación vigente.** Si el ADR y esta parte discrepan, manda esta.

## C.1 El encargo

Ambientación sonora **durante todo el recorrido**, **binaural, con audio espacial 3D**. La
experiencia no es solo visual e interactiva: también es auditiva.

Traducido a algo construible: el visitante que recorre el tramo con audífonos debe **oír la
quebrada a su izquierda cuando la quebrada está a su izquierda**, y oírla quedar atrás cuando
avanza. No una pista de fondo: un espacio.

## C.2 Las dos capas de sonido

| Capa | Qué es | Espacializada | Ejemplo |
|---|---|---|---|
| **Lecho ambiente** (*ambience bed*) | Fondo continuo del bosque | No, estéreo fijo | Viento en el follaje, textura general del bosque |
| **Fuentes puntuales** | Sonidos anclados a un lugar del tramo | **Sí, HRTF** | El cauce en el metro 45, un canto en un árbol concreto |

El lecho da continuidad; las fuentes puntuales dan el espacio. Separarlas es lo que permite que
el lecho suene siempre igual (barato) y que solo las fuentes cercanas se procesen espacialmente
(caro).

## C.3 Cómo se implementa

PlayCanvas expone `SoundComponent` sobre la Web Audio API, y la espacialización binaural sale
del `PannerNode` con modelo de paneo **HRTF**, que es, literalmente, la definición de audio
binaural: filtrado por función de transferencia relacionada con la cabeza.

```javascript
// Fuente puntual anclada al cauce, en src/audio/
const source = new pc.Entity('stream-source');
source.addComponent('sound', {
  positional: true,
  distanceModel: 'linear',
  refDistance: 2,      // m, [por ajustar con el material real]
  maxDistance: 25,     // m, [por ajustar con el material real]
  rollOffFactor: 1
});
source.sound.addSlot('water', { asset: waterLoopAsset, loop: true, autoPlay: false });
source.setPosition(anchor.x, anchor.y, anchor.z);
```

**El oyente es la cámara.** PlayCanvas usa la `AudioListener` de la cámara activa, así que la
espacialización se actualiza sola conforme `TourEngine` mueve y gira la cámara. Ningún módulo
de audio toca la cámara: eso sigue siendo invariante de arquitectura.

> **Ya está hecho el prerrequisito.** La cámara del visor lleva el componente `audiolistener`
> añadido, y `TourEngine` publica en cada `tour:progress` la `position`, el `yaw` y el `pitch`.
> Con eso basta para espacializar sin leer la cámara. Ver
> [`../CONTEXTO-EQUIPO.md`](../CONTEXTO-EQUIPO.md) para el código exacto.

### C.3.1 Qué exige HRTF

El `panningModel: 'HRTF'` es más caro que `'equalpower'`. Por eso:

- **Presupuesto (RNF-016): máximo 4 fuentes espaciales simultáneas en escritorio y 2 en móvil**, `[valores por medir en S4]`. Las demás se apagan por distancia.
- El lecho ambiente **no** es posicional: es una pista estéreo, coste casi nulo.
- Si el rendimiento no cierra, la primera palanca es **reducir fuentes simultáneas**, nunca desactivar el audio: es parte del producto.

## C.4 El conflicto con RNF-008, y cómo se resuelve

**RNF-008 dice: el audio nunca se reproduce automáticamente.** Una ambientación "durante todo
el recorrido" parece contradecirlo. No lo hace, si se define bien:

> El lecho ambiente y las fuentes espaciales **arrancan con el gesto explícito con el que el
> visitante inicia el recorrido**, y nunca antes. Ese gesto —el botón «Iniciar recorrido»— es
> una acción del usuario, que es exactamente lo que RNF-008 exige y lo que las políticas de
> autoplay del navegador requieren de todos modos.

Cinco reglas lo hacen verificable. **Son criterios de aceptación, no adorno:**

1. **Nada suena antes del primer gesto.** Ni en la carga, ni en el onboarding.
2. **El botón de inicio dice que va a sonar.** Los textos literales son **«Iniciar recorrido · con sonido»** y **«Iniciar en silencio»**. El visitante elige, no se entera después.
3. **Control de silencio siempre visible** en el HUD, en cualquier punto del recorrido.
4. **La preferencia se recuerda.** Quien entró en silencio, vuelve a entrar en silencio.
5. **La narración y el canto de las fichas siguen la regla estricta de siempre:** solo con pulsación explícita, uno por uno. La ambientación no los arranca nunca.

Sin las cinco reglas, la ambientación **rompe** RNF-008. Con ellas, lo cumple.

## C.5 Qué se graba y dónde

El mapa sonoro se levanta en **V1** y se graba en **V3**
(ver [`05-produccion-de-escenas.md`](05-produccion-de-escenas.md) §5).

| Material | Cómo se graba | Uso |
|---|---|---|
| Lecho ambiente del bosque | Estéreo, **2–3 min en bucle limpio, sin eventos reconocibles** | Capa continua |
| Cauce de la quebrada | **Mono**, cerca de la fuente, para poder espacializarlo | Fuente puntual |
| Cantos de aves | **Mono**, a primera hora | Fuente puntual **y** ficha (RF-012) |
| Silencio de referencia | **30 s** | Para medir el ruido de fondo del equipo |

**Regla de grabación:** las fuentes que se van a espacializar se graban **en mono**. Una
grabación estéreo ya trae su propia imagen espacial y, al pasarla por HRTF, suena mal. Esto es
lo que más fácilmente se hace mal en V3, así que va escrito.

**Regla de contenido:** el audio es del sendero. No se descarga ambiente de banco de sonidos ni
cantos de otra región. Si un canto no se logra grabar, la ficha lo dice y no suena. Es la misma
regla de "nada inventado" aplicada al oído.

## C.6 Requerimientos que esto crea

| ID | Requerimiento |
|---|---|
| **RF-028** | El sistema debe reproducir una ambientación sonora continua durante el recorrido, con fuentes espacializadas en 3D binaural ancladas a posiciones reales del tramo |
| **RNF-016** | La ambientación no debe superar **4 fuentes espaciales simultáneas en escritorio ni 2 en móvil**, ni comprometer el objetivo de 30 fps del RNF-001. El lecho ambiente no es posicional |

Y refuerza los que ya existían: RNF-008 (nunca automático), RNF-006 (todo audio con alternativa
textual), RNF-001 (rendimiento).

## C.7 Quién construye qué

| Pieza | Carpeta | Dueño |
|---|---|---|
| `AmbienceController`, lecho continuo, arranque por gesto, silencio | `src/audio/` | **David Beltrán** |
| `SpatialAudioSource`, fuente puntual HRTF anclada al tramo | `src/audio/` | **David Beltrán** |
| `AudioPlayer`, narración y canto de la ficha | `src/audio/` | **David Beltrán** |
| Perfil de audio por dispositivo (nº de fuentes) | `src/engine/QualityProfile` | **Alejandra Chambueta** |
| Grabación y edición del material | `assets/audio/` | Felipe Acevedo (edición), David Beltrán (grabación) |
| Textos, transcripciones y el control de silencio en el HUD | — | Alberto Alemán (texto), Eybar Viasus (diseño) |

## C.8 Contrato de datos

Las fuentes espaciales se declaran, como todo lo demás, en configuración: `config/soundscape.json`.
El contrato canónico vive en [`03-arquitectura.md`](03-arquitectura.md); esta es la forma de
referencia:

```json
{
  "version": 1,
  "ambienceUrl": "assets/audio/ambience-bed.mp3",
  "sources": [
    {
      "id": "sound-stream-45",
      "label": "Cauce de la quebrada",
      "url": "assets/audio/stream-loop.mp3",
      "sceneId": "scene-01",
      "distanceMeters": 45,
      "anchor": { "x": 0, "y": 0, "z": 0 },
      "refDistanceMeters": 2,
      "maxDistanceMeters": 25,
      "loop": true
    }
  ]
}
```

> `anchor` y `distanceMeters` quedan en `[por medir en campo]` hasta V1. Igual que los POIs:
> **añadir una fuente sonora no toca código** (misma regla que RNF-009).

## C.9 Qué queda abierto

| # | Pregunta | Dueño | Se cierra en |
|---|---|---|---|
| A1 | ¿Cuántas fuentes HRTF simultáneas aguanta el celular de referencia a 30 fps? | David Beltrán | S4 |
| A2 | ¿`distanceModel` lineal o exponencial? ¿Con qué `refDistance` real? | David Beltrán | S5 |
| A3 | ¿Safari iOS respeta el `panningModel: 'HRTF'` o cae a *equalpower*? | David Beltrán | **S3** |
| A4 | ¿El lecho ambiente en bucle se nota? ¿Cuánta duración hace falta? | Felipe Acevedo | V3 |
| A5 | ¿Se cuela la Circunvalar en las grabaciones? | David Beltrán | V1 |

**A3 es el que puede cambiar el diseño**, y por eso se prueba en S3 y no en S5: si Safari no da
HRTF real, la ambientación se degrada a paneo estéreo por distancia en iOS y hay que saberlo con
tiempo, no en la semana 10.
