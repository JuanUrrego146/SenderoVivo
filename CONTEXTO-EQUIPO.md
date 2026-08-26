# Contexto para el equipo de desarrollo

> **Léeme antes de escribir código.** Aquí está todo lo que necesitas para trabajar sin
> preguntar: qué existe hoy, cómo se levanta, qué archivo tocas, qué reglas no se rompen
> y cómo pruebas lo que hiciste.
>
> Actualizado: 26/08/2026 · Mantiene: Juan Urrego

---

> ⛔ **src/ congelado desde el 26/08/2026**
> Nadie abre PR que toque `src/` mientras dure el traslado a MVC (SW-02, SW-03,
> SW-04). Excepción: quien tenga asignada una de esas tres historias.
> Lo que ya esté empezado se termina y se avisa antes de fusionar.
> Ver [docs/03-arquitectura.md §3.1](docs/03-arquitectura.md#31-las-tres-capas-modelo-vista-y-controlador).

---

## 1. Qué es esto en una frase

Una web que permite recorrer un sendero real reconstruido en 3D a partir de video, con
fichas de fauna, audio ambiental y datos del recorrido. Sin backend, sin instalación:
archivos estáticos servidos por HTTPS.

**Hoy tenemos un prototipo funcionando** con un escaneo de prueba (un parque, no el
sendero). El sendero real se captura en la salida de campo.

---

## 2. Levantar el proyecto: 3 comandos

```bash
git clone https://github.com/JuanUrrego146/SenderoVivo.git
cd SenderoVivo
git checkout dev/tu-nombre
```

Y para verlo:

```bash
npx serve .
```

Abre `http://localhost:3000`. **No hay build, no hay `npm install`, no hay bundler.**
El motor PlayCanvas se carga desde un CDN con un *import map* en `index.html`.

**Requisitos:** Node 24, un navegador vigente y conexión a internet (por el CDN).

> **Importante:** ábrelo en Chrome, Firefox o Safari de verdad. Los paneles de vista previa
> embebidos (los de VS Code o los asistentes de IA) renderizan mal los splats y te van a
> hacer perder tiempo persiguiendo problemas que no existen.

---

## 2 bis. Tu trabajo se publica solo en una web

**Producción (rama `develop`): https://senderovivo.pages.dev**

Y **cada quien tiene su propia web con sus cambios**. Al hacer `git push` a tu rama,
Cloudflare la despliega automáticamente en una dirección propia:

```
https://dev-alejandra-chambueta.senderovivo.pages.dev
https://dev-david-beltran.senderovivo.pages.dev
https://dev-felipe-acevedo.senderovivo.pages.dev
https://dev-eybar-viasus.senderovivo.pages.dev
https://dev-alberto-aleman.senderovivo.pages.dev
https://dev-juan-urrego.senderovivo.pages.dev
```

(La barra de `dev/tu-nombre` se convierte en guion.)

**No hay que hacer nada más que `git push`.** Ni configurar, ni pedir permiso, ni avisar.
El despliegue tarda entre uno y tres minutos; después recargas tu URL y ahí está tu
trabajo, funcionando en internet, en cualquier dispositivo.

Esto sirve para dos cosas: probar en un celular real sin montar servidor, y enseñarle a
otro lo que hiciste mandándole un enlace en vez de explicárselo.

### Probar tus cambios en la web publicada

Todo lo que tu parte necesita ya está versionado, así que basta con subirlo:

| Si trabajas en… | Sube a tu rama | Y lo ves en tu URL |
|---|---|---|
| **Audio** | tu código en `src/audio/`, el `.mp3` en `assets/audio/` y la ruta en `config/soundscape.json` | El botón de sonido y el ambiente funcionando |
| **Puntos de interés** | tu código en `src/poi/`, el `.glb` en `assets/models/` y los datos en `config/pois.json` | El marcador, la ficha y el modelo girable |
| **Interfaz** | tu CSS en `styles/` y el marcado que toque | La interfaz sobre la escena real |

Los archivos de audio y los modelos `.glb` **sí van al repositorio**: pesan poco. Lo único
que no cabe es el PLY de la escena, y para programar encima no hace falta (§8 bis).

### El flujo completo, en tres comandos y sin ventanas secundarias

```bash
git add -A
git commit -m "feat(audio): lo que hiciste, en una frase"
git push
```

Eso es TODO. Uno a tres minutos después, recarga tu URL de arriba (con
Ctrl+Shift+R si el navegador se aferra al caché) y tus cambios están en internet.
Sin pull requests, sin aprobaciones, sin pestañas de configuración: tu rama ES tu
entorno de pruebas publicado. Cuando algo esté listo para todos, avísale a Juan y
él lo integra a `develop` (producción).

### La interfaz del visor: cómo está armada (desde el 18/08)

La página principal es el **visor 3DGS con el cascarón de interfaz de Eybar**
encima (header de vidrio, filtros, hoja de ficha, pestañas y navegación):

| Pieza | Archivo | Nota |
|---|---|---|
| Marcado del cascarón | `index.html` (bloque CASCARÓN) | Los overlays flotan sobre el canvas del visor |
| Lógica de la interfaz | `src/ui/shell.js` | Datos del catálogo, fichas, pestañas, búsqueda, hotspots |
| Tokens de color | `styles/tokens.css` | LA única fuente de color (docs/06 §B.2) |
| Utilidades Tailwind | `styles/tailwind.css` | **Compilado estático**, no CDN |
| Vidrio (glassmorphism) | `styles/glass.css` | Paneles y píldoras |
| Iconos | `assets/vendor/fontawesome/` | Empaquetados, no CDN |

**Regla de oro: nada de CDN en tiempo de ejecución.** El `tailwind is not defined`
que sufrimos venía de ahí. Si añades clases de Tailwind nuevas en `index.html` o
`src/ui/shell.js`, recompila el CSS antes del push:

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind.in.css -o styles/tailwind.css --minify
```

(Si solo tocas CSS propio, tokens o contenido, no hace falta recompilar nada.)

Los **hotspots** de la interfaz están anclados a coordenadas del MUNDO (distancia
sobre el trazado + desplazamiento lateral, en `src/ui/shell.js`) y se proyectan con
la cámara real en cada fotograma: si anclas algo en (x, y, z), se ve en el mismo
punto físico en la técnica COLMAP y en la Luma.

### La línea de diseño (léela ANTES de tocar la interfaz — vale para humanos y para IAs)

Si le pasas esta interfaz a una IA para que la extienda, dale esta sección como
contexto: es el contrato visual completo.

**La idea central: la escena capturada es la protagonista; la interfaz es vidrio
oscuro discreto que flota encima y nunca compite con ella.**

1. **Lenguaje visual = glassmorphism del bosque.** Paneles `glass-panel`
   (fondo `rgba(14,18,16,0.62)` + blur 16px + borde `rgba(237,241,239,0.12)`),
   píldoras `glass-pill`, y estado activo SIEMPRE con el verde del proyecto
   (`rgba(111,207,151,…)`), definidos en `styles/glass.css`.
2. **Los colores tienen significado y son SOLO estos** (docs/06 §B.2):
   - Fondos y cromo: `#0E1210` (black-900), `#1B211E` (gray-800), `#3A423E` (gray-600).
   - Texto: `#EDF1EF` (principal sobre oscuro), `#B9C1BC` (secundario).
   - **Verde = lo vivo** (marcadores de especies, estados activos, acentos):
     `#6FCF97` sobre oscuro, `#2E8B57` para señal, `#1F5D3A` para superficies de énfasis.
   - **Agua `#4FA3A5` = los DATOS del recorrido** (HUD, fauna acuática, GPS).
   - **Gris = patrimonio** (lo no vivo va deliberadamente en gris, no en verde).
   - PROHIBIDOS: rojo, naranja, amarillo y rosa como colores de interfaz.
3. **Las clases de Tailwind ya hablan esta paleta**: `tailwind.config.js` remapea
   slate→grises del proyecto, emerald→verdes, teal/sky→agua, amber→gris. Escribe
   `text-emerald-400` con confianza: sale `#6FCF97`. NO escribas hex sueltos en
   marcado ni JS; si necesitas un color nuevo, nace en `styles/tokens.css` con su
   contraste calculado.
4. **Tipografía**: Plus Jakarta Sans (Google Fonts con caída a system-ui). Nombres
   científicos SIEMPRE en cursiva. Cifras que cambian (HUD, duraciones) SIEMPRE
   con `font-variant-numeric: tabular-nums` para que no salten.
5. **Nada se comunica solo por color (RNF-006)**: cada estado lleva además forma,
   icono o texto (los marcadores cambian de tamaño y forma, no solo de tono).
   Todo botón tiene `:focus-visible` verde. `prefers-reduced-motion` apaga pulsos.
6. **El audio jamás arranca solo (RNF-008)**: cualquier control de sonido nace
   apagado y suena únicamente con un toque explícito del usuario.
7. **Contenido: solo el catálogo real** (docs/06 Parte A). Lo no verificado se
   muestra con su marca `[por verificar]` — la honestidad es parte del diseño.
8. **Ventanas**: la ficha de un punto es hoja deslizante inferior (`#bottom-sheet`,
   max-w-lg centrada); las secciones (Especies/Sonidos/Bitácora) son TARJETA
   FLOTANTE centrada (`#tab-panel-container`) con la escena visible y desenfocada
   alrededor — nunca una pantalla opaca que tape el fondo.
9. **Puestos fijos en pantalla**: encabezado + filtros arriba-izquierda · switch
   COLMAP/Luma arriba-derecha · HUD de datos y banner de progreso abajo-izquierda ·
   navegación centrada abajo · ayuda abajo-derecha. En celular (<640px) el switch
   baja bajo los filtros y la ayuda sube sobre la navegación. Un solo inquilino
   por esquina.
10. **Hotspots**: nodos DOM persistentes (no reconstruir con innerHTML: parpadea),
    reposicionados en cada frame con `worldToScreen`. Para añadir un punto de
    interés basta una entrada en `trailData` (shell.js) con
    `anchor: { d: distancia, lat: lateral, alt: altura }` — el resto sale solo.
11. **Trampa de CSS conocida**: el reset de botones usa `:where()` para tener
    especificidad CERO. Si escribes CSS nuevo para el cascarón, cuida no pisar
    las clases de utilidad con selectores de ID.

---

## 3. Qué hay hecho y funcionando

| Pieza | Estado | Archivo |
|---|---|---|
| Carga de escenas Gaussian Splatting (nivelación `sceneUp`, AABB, espera de render estable) | ✅ funciona | `src/engine/SceneLoader.js` |
| Orquestación de la aplicación | ✅ funciona | `src/app/main.js` (solo cablea; la lógica vive en los módulos) |
| Recorrido guiado sobre el trazado (RF-004) | ✅ funciona | `src/engine/TourEngine.js` (API pública: `moveTo`, `advance`, `saveState`, `restoreState`) |
| Trazado con corredor lateral | ✅ funciona | `src/engine/TrailPath.js` |
| Flechas de avance en el mundo 3D | ✅ funciona | `src/engine/TrailMarkers.js` |
| Editor para marcar el trazado | ✅ funciona | `src/engine/TrailRecorder.js` |
| Mirada libre 360° (RF-005) | ✅ funciona | `TourEngine` |
| Estados de carga y error sin pantalla negra (RNF-007) | ✅ funciona | `src/ui/overlay.js` |
| Tokens de color como hoja de estilos | ✅ funciona | `styles/tokens.css` (única fuente de color) + `styles/app.css` + `src/ui/tokens.js` |
| Escena de prueba (parque) | ✅ 3,89 M gaussianas | `assets/scenes/scene-01/` |
| Contrato de audio | ✅ esqueleto | `config/soundscape.json` (con `sources` vacío, listo para V3) |
| Modelo de Felipe (fuente Maya + texturas) | ✅ en el repo, sin integrar | `assets/models/golondrina-plomiza-fuente/` |
| **Puntos de interés** | ❌ por hacer | `src/poi/` |
| **Audio** | ❌ por hacer | `src/audio/` |
| **Capa de datos GPS** | ❌ por hacer | `src/data/` |
| **Componentes de diseño** (ficha, HUD definitivo) | ❌ por hacer | `styles/` + `src/ui/` |

---

## 4. Cómo se mueve la cámara (léelo antes de tocar nada)

Este es el punto donde más fácil se rompe el proyecto.

- **Solo `TourEngine` mueve la cámara.** Ningún otro módulo escribe posición ni rotación.
- La posición **siempre** sale del trazado: `TrailPath.positionAt(distancia)`.
- Hay un **corredor** de 1,5 unidades a cada lado para acercarse a mirar algo, pero no
  se puede salir de ahí. El sendero real está en una reserva protegida y el producto no
  puede insinuar salirse del camino (RF-004).
- Si tu módulo necesita saber dónde está el visitante, **no leas la cámara**: escucha el
  evento `tour:progress`.

```javascript
app.on('tour:progress', ({ distance, total, distanceMeters }) => {
    // distance y total están en unidades del motor
    // distanceMeters lo llenará TrailDataLayer cuando exista el track GPS real
});
```

- Para abrir una ficha sin perder la posición: `tour.saveState()` y `tour.restoreState(estado)`.

El evento trae todo lo que necesitas saber del visitante:

```javascript
app.on('tour:progress', ({ distance, total, position, yaw, pitch }) => {
    // distance / total : avance sobre el trazado, en unidades del motor
    // position         : {x, y, z} dónde está exactamente
    // yaw / pitch      : hacia dónde mira, en grados
});
```

### Cargar un modelo 3D en la escena

Los `.glb` se cargan como asset de tipo `container`:

```javascript
const asset = new pc.Asset('colibri', 'container', {
    url: poi.modelUrl              // sale de config/pois.json
});
app.assets.add(asset);
app.assets.load(asset);

asset.once('load', () => {
    const modelo = asset.resource.instantiateRenderEntity();
    modelo.setLocalScale(1, 1, 1);
    app.root.addChild(modelo);

    // Animación idle, si el .glb la trae (RF-029)
    if (asset.resource.animations?.length) {
        modelo.addComponent('anim');
        modelo.anim.assignAnimation('idle', asset.resource.animations[0].resource);
    }
});
```

**Para que el modelo se vea por encima del splat** hay que ponerlo en la capa que se
dibuja al final; si no, las gaussianas lo tapan aunque esté delante. Mira cómo lo resuelve
`src/engine/TrailMarkers.js`: usa la capa `UI` y desactiva la prueba de profundidad.

Mientras llega el modelo definitivo hay uno provisional para no bloquearse:
`assets/models/marcador-provisional.glb` (un ave esquemática, 1 KB). **No es el modelo
del proyecto**: sirve para montar la ficha y comprobar que carga, y se reemplaza por el
de Felipe cuando esté.

### Audio espacial: lo que ya está resuelto

**La cámara ya tiene el oyente** (`audiolistener`). Eso significa que cualquier fuente
posicional que crees se espacializa **sola** conforme el visitante avanza y gira: no
tienes que calcular nada ni leer la cámara.

```javascript
const fuente = new pc.Entity('cauce');
fuente.addComponent('sound', {
    positional: true,          // esto activa la espacialización
    distanceModel: 'linear',
    refDistance: 2,
    maxDistance: 25
});
fuente.setPosition(x, y, z);   // la posición sale de config/soundscape.json (anchor)
fuente.sound.addSlot('agua', { asset: assetAudio, loop: true, autoPlay: false });
app.root.addChild(fuente);
```

Lo binaural de verdad lo da `panningModel: 'HRTF'` en el nodo de la Web Audio API. Cuesta
CPU, y por eso RNF-016 limita cuántas fuentes suenan a la vez (4 en escritorio, 2 en móvil).
Usa `tour:progress` para activar y desactivar fuentes según la distancia.

**`autoPlay: false` siempre**: nada suena sin un gesto del usuario (RNF-008).

---

## 5. Los archivos de configuración mandan

Cambiar contenido **no debe tocar código**. Todo vive en `config/`:

### `config/scenes.json`
Las escenas y su nivelación.

```json
{
  "id": "scene-01",
  "sogUrl": "assets/scenes/scene-01/meta.json",
  "sceneUp": { "x": -0.204, "y": -0.879, "z": -0.431 }
}
```

`sceneUp` es el vector "arriba" real de la escena, medido de las poses de cámara. Sin él
la escena sale torcida, porque la reconstrucción no sabe dónde está el suelo.

### `config/track.json`
El trazado del recorrido, marcado sobre la escena.

```json
{
  "sceneWaypoints": [ { "x": 2.9, "y": -0.5, "z": -2.2 }, ... ],
  "eyeHeight": 0,
  "corridorRadius": 1.5
}
```

**¿Cómo se marca un trazado nuevo?** Abre `http://localhost:3000/?editor=1`, vuela con
**W A S D** por el camino, pulsa **M** en cada punto, **Z** deshace y **X** descarga el
`track.json`. Lo reemplazas en `config/` y listo.

### `config/pois.json`
Los puntos de interés. **Añadir un POI no debe tocar código** (RNF-009): si para agregar
uno hay que editar un `.js`, está mal resuelto.

Campos por tipo:
- **fauna**: `commonName`, `scientificName`, `modelUrl`, `idleAnimation`, `narrationUrl`,
  `transcriptUrl`, `birdCallUrl`, `altitudeRange`, `fieldIdTips`, `sightingTips`
- **patrimonio**: `historicalNote`, `period`, `sourceUrl` (**obligatorio** si la nota afirma algo)

### `config/soundscape.json`
El paisaje sonoro: `ambienceUrl` (lecho estéreo, no posicional) y `sources` (puntos
espacializados con HRTF, grabados en mono).

---

## 6. Reglas que no se rompen

1. **Solo `TourEngine` mueve la cámara.**
2. **Ninguna posición llega a la cámara sin pasar por el trazado** (RF-004).
3. **`TrailDataLayer` no importa nada de PlayCanvas.** Recibe números, devuelve números.
4. **Añadir un POI o un sonido no toca código.** Solo JSON.
5. **El audio nunca arranca solo.** Toda reproducción nace de un gesto del usuario (RNF-008).
6. **Ningún estado deja la pantalla en negro.** Siempre progreso, error en español, o reintento.
7. **Todo texto visible en español; todo identificador en inglés.**
8. **Ningún `.js` escribe un color literal.** Los colores salen de tokens CSS.
9. **Nada de datos inventados.** Sin fuente verificada va `[por verificar]`.
10. **Ninguna funcionalidad sin RF.** Si no traza a un requerimiento, sobra.

---

## 7. Quién toca qué carpeta

| Carpeta | Dueño | Contenido |
|---|---|---|
| `src/engine/` | Alejandra | Motor de recorrido, cámara, carga de escenas, LOD |
| `src/poi/` | David | Marcadores, fichas, visor de modelos |
| `src/data/` | David | Capa de datos del track GPS |
| `src/audio/` | David | Ambiente, fuentes espaciales, reproductor |
| `src/app/` | Juan | Arranque y cableado |
| `src/ui/` | Juan (implementa) | HUD y shell, con diseño de Eybar y Alberto |
| `styles/` | Eybar + Alberto | Tokens y componentes |
| `assets/models/`, `assets/audio/` | Felipe | Modelos `.glb`, cantos |
| `config/` | Juan | Los contratos de datos |

Si necesitas tocar la carpeta de otro, **avísalo en la issue antes de empezar**.

---

## 8. Cómo probar lo que hiciste

No hay pruebas automáticas todavía. La verificación es manual y directa:

1. `npx serve .` y abre en Chrome.
2. Abre la consola del navegador (F12): **no debe haber errores en rojo**.
3. Comprueba tu caso concreto.
4. Pruébalo también en un celular real, en la misma red: `http://<ip-de-tu-pc>:3000`
   (si no carga, tu red debe estar marcada como "privada" en Windows).

Objetos útiles expuestos en la consola para depurar:

```javascript
window.senderoApp      // la aplicación de PlayCanvas
window.senderoTour     // el motor del recorrido
window.senderoMarkers  // las flechas del camino
```

Por ejemplo, para saltar al 50% del recorrido:

```javascript
senderoTour.distance = senderoTour.trailPath.totalLength() * 0.5;
```

---

## 8 bis. Trabajar con las escenas

> **La guía completa de máquina** — de los videos de la cámara hasta la escena publicada,
> con jerarquía de carpetas, ffmpeg, COLMAP, parámetros de Brush, limpieza, los tres
> empaques (clásico/streaming/móvil) y la publicación — es
> [docs/08-de-video-a-web.md](docs/08-de-video-a-web.md). Esta sección es el resumen operativo.

En el repositorio está la escena **lista para usar** en tres empaques: `assets/scenes/scene-01/`
(SOG clásico, respaldo), `scene-01-stream/` (streaming LOD — lo que carga escritorio) y
`scene-01-movil/` (poda de 1,2 M — lo que carga un celular si fuerza COLMAP). Es lo único
que la web necesita, y ya está ahí.

**Los archivos intermedios no están en Git ni pueden estarlo.** El PLY que sale del
entrenamiento pesa más de 1 GB y GitHub rechaza archivos de más de 100 MB. Si necesitas
el PLY, los cuadros del video o la salida de COLMAP para reeditar algo, **pídeselos a
Juan**: se pasan por disco o enlace.

### Poner una escena nueva

Desde un PLY ya limpio:

```bash
splat-transform limpio.ply assets/scenes/scene-01/meta.json
```

Se versiona la **carpeta desempaquetada** (`meta.json` + los `.webp`), nunca el `.sog`
empaquetado: el hosting rechaza archivos de más de 25 MB y un `.sog` entero los supera.

Después hay dos datos que van a `config/scenes.json`: la ruta al `meta.json` y el
**`sceneUp`** de esa escena (sin él sale torcida). Cómo se calcula está en
[`docs/05-produccion-de-escenas.md`](docs/05-produccion-de-escenas.md), junto
con los parámetros de entrenamiento medidos y la receta recomendada.

### Probar otra escena sin tocar la configuración

```
http://localhost:3000/?sog=assets/scenes/otra-escena/meta.json
```

### Marcar un trazado nuevo

Abre `http://localhost:3000/?editor=1`, vuela con **W A S D** por el camino, pulsa **M**
en cada punto, **Z** deshace y **X** descarga el `track.json`. Lo reemplazas en `config/`.

### Las DOS técnicas de reconstrucción y el contrato de coordenadas

El visor tiene **dos reconstrucciones del mismo parque**, conmutables con el switch de
arriba a la derecha (o con `?render=luma` en la URL):

| Técnica | Escena | Gaussianas | Peso | Notas |
|---|---|---|---|---|
| **COLMAP + Brush** (por defecto) | `assets/scenes/scene-01/` | 3,97 M | 57 MB | Más resolución |
| **Luma AI** | `assets/scenes/scene-01-luma/` | 0,93 M | 16 MB | Más liviana; solo se avanza (en reversa se ve mal) |

**El contrato que te importa: ambas escenas viven en LAS MISMAS coordenadas de mundo.**
La escena Luma fue registrada automáticamente sobre el marco de la COLMAP (escala, giro y
posición horneados en el archivo; sesgo medido: ~1 cm). Comparten `config/track.json`.
Si anclas un POI, una fuente de sonido espacial o cualquier cosa en una posición
(x, y, z), **cae en el mismo punto físico del parque en las dos técnicas** — programa
contra el mundo, no contra una escena.

Reglas para no romperlo:

- La entrada de `scenes.json` de la escena Luma lleva **`"baked": true`**: significa que
  el archivo YA está en coordenadas de mundo y el visor no debe aplicarle ninguna
  rotación. No le agregues `sceneUp` ni la "endereces": la romperías.
- Ojo con el visor: a las escenas **sin** `sceneUp` y **sin** `baked` les aplica un giro
  de 180° en Z (la convención de los PLY de 3DGS). Por eso una escena nueva sin registrar
  se ve al revés hasta que le mides su `sceneUp`.
- Si se reemplaza cualquiera de las dos escenas, hay que **re-registrar** la otra
  (los guiones están en la máquina de Juan; pedírselo a él).

---

## 9. Cosas que ya nos costaron tiempo (no las repitas)

- **La escena se ve torcida:** falta `sceneUp` en `scenes.json`. Se calcula de las poses
  de cámara de COLMAP, no a ojo.
- **Algo desaparece al moverse:** es el recorte por volumen. Ya está resuelto con un
  volumen amplio en `main.js`; no lo quites.
- **Un objeto 3D no se ve aunque esté delante:** el splat se dibuja encima. Hay que
  ponerlo en la capa que se pinta al final (mira cómo lo hace `TrailMarkers`).
- **Todo se ve borroso y feo:** probablemente estás mirando desde un ángulo donde nunca
  hubo cámara, o desde un panel embebido. Baja al camino, a la altura de los ojos.
- **Los archivos `.sog` empaquetados no se suben:** se versiona la carpeta desempaquetada
  (`meta.json` + `.webp`), porque el hosting rechaza archivos de más de 25 MB.
- **La escena se ve emborronada al abrir:** el motor ordena millones de gaussianas por
  profundidad durante los primeros segundos. Por eso el visor espera 200 cuadros y 2,8 s
  antes de revelarla, detrás de la pantalla de carga. Si tocas esa pantalla, no quites
  la espera: sin ella el prototipo se ve mal justo cuando alguien lo abre.

---

## 10. Documentación de referencia

- **Arquitectura, diagramas y contratos:** `docs/03-arquitectura.md`
- **Requerimientos (32 RF, 16 RNF, 15 CUS):** `docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md`
- **Guía de captura en campo:** `docs/05-produccion-de-escenas.md`
- **Catálogo de fauna verificado:** `docs/06-contenido-de-la-experiencia.md`
- **Ámbitos y fronteras entre módulos:** `docs/03-arquitectura.md`
- **Documentación oficial de PlayCanvas:** https://developer.playcanvas.com/user-manual/gaussian-splatting/

---

## 11. Convenciones

| Aspecto | Regla |
|---|---|
| Idioma del código | Inglés (variables, funciones, clases, ramas) |
| Idioma visible | Español |
| Nombres | `camelCase` variables, `PascalCase` clases, `kebab-case` archivos |
| Ramas | Una por persona: `dev/<nombre>` |
| Commits | Tipo en inglés, descripción en español, citando el RF: `feat(poi): abrir ficha al tocar el marcador (RF-006)` |
| Unidades | Métricas. Altitud en msnm, distancia en m |

---

## 12. Si algo no está aquí

Antes de preguntar, mira en este orden: este documento →
`docs/03-arquitectura.md` → la issue que estás resolviendo (tiene una sección de ámbito con
los archivos exactos que tocas). Si después de eso sigue sin estar claro, escribe en la
issue: así queda registrado para el resto.
