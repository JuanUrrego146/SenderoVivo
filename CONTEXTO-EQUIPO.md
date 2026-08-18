# Contexto para el equipo de desarrollo

> **Léeme antes de escribir código.** Aquí está todo lo que necesitas para trabajar sin
> preguntar: qué existe hoy, cómo se levanta, qué archivo tocas, qué reglas no se rompen
> y cómo pruebas lo que hiciste.
>
> Actualizado: 17/08/2026 · Mantiene: Juan Urrego

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

---

## 3. Qué hay hecho y funcionando

| Pieza | Estado | Archivo |
|---|---|---|
| Carga de escenas Gaussian Splatting | ✅ funciona | `src/app/main.js` |
| Recorrido guiado sobre el trazado (RF-004) | ✅ funciona | `src/engine/TourEngine.js` |
| Trazado con corredor lateral | ✅ funciona | `src/engine/TrailPath.js` |
| Flechas de avance en el mundo 3D | ✅ funciona | `src/engine/TrailMarkers.js` |
| Editor para marcar el trazado | ✅ funciona | `src/engine/TrailRecorder.js` |
| Mirada libre 360° (RF-005) | ✅ funciona | `TourEngine` |
| Estados de carga y error sin pantalla negra | ✅ funciona | `src/app/main.js` |
| Escena de prueba (parque) | ✅ 3,89 M gaussianas | `assets/scenes/scene-01/` |
| **Puntos de interés** | ❌ por hacer | `src/poi/` |
| **Audio** | ❌ por hacer | `src/audio/` |
| **Capa de datos GPS** | ❌ por hacer | `src/data/` |
| **Sistema de diseño / tokens** | ❌ por hacer | `styles/` |

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

En el repositorio está la escena **lista para usar**: `assets/scenes/scene-01/`, en formato
SOG desempaquetado (56 MB). Es lo único que la web necesita, y ya está ahí.

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
[`docs/12-parametros-de-entrenamiento.md`](docs/12-parametros-de-entrenamiento.md), junto
con los parámetros de entrenamiento medidos y la receta recomendada.

### Probar otra escena sin tocar la configuración

```
http://localhost:3000/?sog=assets/scenes/otra-escena/meta.json
```

### Marcar un trazado nuevo

Abre `http://localhost:3000/?editor=1`, vuela con **W A S D** por el camino, pulsa **M**
en cada punto, **Z** deshace y **X** descarga el `track.json`. Lo reemplazas en `config/`.

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

- **Arquitectura, diagramas y contratos:** `docs/arquitectura.md`
- **Requerimientos (32 RF, 16 RNF, 15 CUS):** `docs/F_Analisis_de_Requerimientos_V1,0_SenderoVivo.md`
- **Guía de captura en campo:** `docs/11-guia-de-captura-en-campo.md`
- **Catálogo de fauna verificado:** `docs/05-catalogo-fauna-y-flora.md`
- **Ámbitos y fronteras entre módulos:** `docs/09-ambitos-de-los-tres-programadores.md`
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
`docs/arquitectura.md` → la issue que estás resolviendo (tiene una sección de ámbito con
los archivos exactos que tocas). Si después de eso sigue sin estar claro, escribe en la
issue: así queda registrado para el resto.
