# Prototipo del visor SOG

Visor mínimo de Sendero Vivo: carga **una escena Gaussian Splatting en formato SOG** y la muestra en el navegador con **cámara orbital**, para inspeccionar una captura desde todos los ángulos. Sigue el patrón oficial de la documentación de PlayCanvas ([Your First Splat App, Engine API](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/your-first-app/engine/)).

No es el recorrido guiado. TourEngine, POIs, audio y HUD llegan en el Sprint 3 sobre esta misma estructura.

---

## 1. Levantarlo en local

Requisitos: **Node 24** (viene con `npx`) y **conexión a internet** (el motor se descarga del CDN).

Desde la raíz del repositorio:

```bash
npx serve .
```

La primera vez, `npx` pregunta si instala `serve`: responde `y`. Luego abre en el navegador la dirección que imprime (normalmente `http://localhost:3000`).

Eso es todo. No hay build, no hay dependencias que instalar.

---

## 2. Ver tu archivo `.sog`

1. Copia tu archivo a la carpeta de escenas con este nombre exacto:

   ```
   assets/scenes/scene-01.sog
   ```

2. Recarga la página. La escena aparece y se controla así:

   | Gesto | Acción |
   |---|---|
   | Arrastrar (un dedo / clic izquierdo) | Orbitar |
   | Rueda del ratón / pellizco | Acercar y alejar |
   | Clic derecho / dos dedos | Desplazar |

Si todavía no hay archivo, la página lo dice en pantalla y explica dónde ponerlo: no se rompe.

### ¿No tienes un `.sog` todavía?

- **Probar el visor ya:** abre la página y toca el enlace "Abrir la escena de muestra de PlayCanvas", o entra directo a:

  ```
  http://localhost:3000/?sog=https://developer.playcanvas.com/assets/toy-cat.sog
  ```

- **Generar el tuyo:** desde el PLY que sale del entrenamiento (y de limpiar en SuperSplat):

  ```bash
  npx @playcanvas/splat-transform escena.ply scene-01.sog
  ```

### Ver otro archivo sin renombrar nada

El parámetro `?sog=` acepta cualquier ruta o URL:

```
http://localhost:3000/?sog=assets/scenes/prueba-cuarto.sog
```

---

## 3. Qué archivo carga y por qué

El visor lee `config/scenes.json` y carga la escena con `order` más bajo (hoy, `scene-01`). Cambiar qué se carga es editar ese JSON, no el código: es el mismo contrato de datos de la app final (ver `context-for-vibe-coding.md` §4).

## 4. Contrato de datos de los POIs

Está materializado en `config/pois.json`, con dos ejemplos válidos (fauna y patrimonio). Campos de un POI de fauna:

| Campo | Qué es |
|---|---|
| `id`, `type` | Identificador único y tipo: `fauna`, `flora`, `elemento`, `patrimonio` |
| `commonName`, `scientificName` | Nombre común y científico |
| `sceneId`, `anchor`, `distanceMeters` | Escena, coordenadas del marcador y distancia sobre el track |
| `modelUrl`, `idleAnimation` | Modelo `.glb` en `assets/models/` y clip de animación idle |
| `narrationUrl`, `transcriptUrl` | Narración y su transcripción (obligatoria si hay narración) |
| `birdCallUrl` | Canto del ave (solo `fauna`) |
| `altitudeRange`, `fieldIdTips`, `sightingTips` | Información y consejos de avistamiento |

Los POIs de `patrimonio` cambian los campos de fauna por `historicalNote`, `period` y `sourceUrl` (obligatorio si la nota afirma algo). La definición completa y sus reglas están en `context-for-vibe-coding.md` §4; el visor de hoy aún no pinta marcadores.

## 5. Estructura que deja preparada

```
index.html            Página del visor (tokens de color de docs/06 inline, temporal)
src/app/main.js       Carga de config, escena SOG, cámara orbital, estados de error
config/scenes.json    Contrato de escenas (3 escenas del tramo)
config/pois.json      Contrato de POIs con ejemplos válidos
assets/scenes/        Aquí van los .sog (ignorados por Git, regla dura del proyecto)
assets/models/        Modelos .glb de las fichas
assets/audio/         Narraciones y cantos
assets/text/          Transcripciones
```

## 6. Supuestos y limitaciones de este prototipo

- **Motor por CDN, versión fija 2.21.3** (`cdn.jsdelivr.net`, vía import map), igual que la documentación oficial. Sin internet no arranca; en el Sprint 3 se decidirá si el engine se sirve local.
- **Renderiza con WebGL** (la ruta simple documentada, `new Application(...)`). El WebGPU con repliegue automático queda para `QualityProfile` en el Sprint 3.
- **La escena se gira 180° sobre Z** al cargar, igual que en el ejemplo oficial: los PLY/SOG de entrenamiento traen el eje Y hacia abajo. Si tu captura se ve invertida, se corrige la orientación en SuperSplat, no en código.
- La cámara arranca en `(0, 0, 2.5)` mirando al origen. Si la captura queda descentrada, usa la cámara orbital para encuadrarla; el encuadre definitivo por escena es trabajo del TourEngine.
- El antialiasing va desactivado a propósito: el cuello de botella del splatting es el fill rate (ver `context-for-vibe-coding.md` §6).
