# Ambientación sonora — Sendero Vivo

> Versión 1,0 — 11/08/2026 · Responsable: David Beltrán, con Alberto Alemán (contenido) y Felipe Acevedo (edición)
> Decisión de arquitectura asociada: [`decisiones/ADR-003-audio-binaural-espacial.md`](decisiones/ADR-003-audio-binaural-espacial.md)

---

## 1. El encargo

Ambientación sonora **durante todo el recorrido**, **binaural, con audio espacial 3D**. La experiencia no es solo visual e interactiva: también es auditiva.

Traducido a algo construible: el visitante que recorre el tramo con audífonos debe **oír la quebrada a su izquierda cuando la quebrada está a su izquierda**, y oírla quedar atrás cuando avanza. No una pista de fondo: un espacio.

---

## 2. Las dos capas de sonido

| Capa | Qué es | Espacializada | Ejemplo |
|---|---|---|---|
| **Lecho ambiente** (*ambience bed*) | Fondo continuo del bosque | No — estéreo fijo | Viento en el follaje, textura general del bosque |
| **Fuentes puntuales** | Sonidos anclados a un lugar del tramo | **Sí — HRTF** | El cauce en el metro 45, un canto en un árbol concreto |

El lecho da continuidad; las fuentes puntuales dan el espacio. Separarlas es lo que permite que el lecho suene siempre igual (barato) y que solo las tres o cuatro fuentes cercanas se procesen espacialmente (caro).

---

## 3. Cómo se implementa

PlayCanvas expone `SoundComponent` sobre la Web Audio API, y la espacialización binaural sale del `PannerNode` con modelo de paneo **HRTF** — que es, literalmente, la definición de audio binaural: filtrado por función de transferencia relacionada con la cabeza.

```javascript
// Fuente puntual anclada al cauce, en src/audio/
const source = new pc.Entity('stream-source');
source.addComponent('sound', {
  positional: true,
  distanceModel: 'linear',
  refDistance: 2,      // m — [por ajustar con el material real]
  maxDistance: 25,     // m — [por ajustar con el material real]
  rollOffFactor: 1
});
source.sound.addSlot('water', { asset: waterLoopAsset, loop: true, autoPlay: false });
source.setPosition(anchor.x, anchor.y, anchor.z);
```

**El oyente es la cámara.** PlayCanvas usa la `AudioListener` de la cámara activa, así que la espacialización se actualiza sola conforme `TourEngine` mueve y gira la cámara. Ningún módulo de audio toca la cámara — eso sigue siendo invariante de arquitectura.

### 3.1 Qué exige HRTF

El `panningModel: 'HRTF'` es más caro que `'equalpower'`. Por eso:

- **Máximo 4 fuentes espaciales sonando a la vez.** Las demás se apagan por distancia.
- El lecho ambiente **no** es posicional: es una pista estéreo, coste casi nulo.
- En el perfil de calidad móvil, si el rendimiento no cierra, la primera palanca es bajar a 2 fuentes simultáneas — **no** desactivar el audio.

Esto es el RNF-016 (§6).

---

## 4. El conflicto con RNF-008, y cómo se resuelve

**RNF-008 dice: el audio nunca se reproduce automáticamente.** Una ambientación "durante todo el recorrido" parece contradecirlo. No lo hace, si se define bien:

> El lecho ambiente y las fuentes espaciales **arrancan con el gesto explícito con el que el visitante inicia el recorrido**, y nunca antes. Ese gesto —el botón «Iniciar recorrido»— es una acción del usuario, que es exactamente lo que RNF-008 exige y lo que las políticas de autoplay del navegador requieren de todos modos.

Reglas que lo hacen verificable:

1. **Nada suena antes del primer gesto.** Ni en la carga, ni en el onboarding.
2. **El botón de inicio dice que va a sonar.** «Iniciar recorrido · con sonido» y una alternativa «Iniciar en silencio». El visitante elige, no se entera después.
3. **Control de silencio siempre visible** en el HUD, en cualquier punto del recorrido.
4. **La preferencia se recuerda.** Quien entró en silencio, vuelve a entrar en silencio.
5. **La narración y el canto de las fichas siguen la regla estricta de siempre**: solo con pulsación explícita, uno por uno. La ambientación no los arranca nunca.

Sin las cinco reglas, la ambientación **rompe** RNF-008. Con ellas, lo cumple. Está escrito aquí para que no se descubra en la revisión de S5.

---

## 5. Qué se graba y dónde

El mapa sonoro se levanta en **V1** y se graba en **V3** (ver [`07-plan-de-visitas-de-campo.md`](07-plan-de-visitas-de-campo.md) §6).

| Material | Cómo se graba | Uso |
|---|---|---|
| Lecho ambiente del bosque | Estéreo, 2–3 min en bucle limpio, sin eventos reconocibles | Capa continua |
| Cauce de la quebrada | Mono, cerca de la fuente, para poder espacializarlo | Fuente puntual |
| Cantos de aves | Mono, a primera hora | Fuente puntual **y** ficha (RF-012) |
| Silencio de referencia | 30 s | Para medir el ruido de fondo del equipo |

**Regla de grabación:** las fuentes que se van a espacializar se graban **en mono**. Una grabación estéreo ya trae su propia imagen espacial y, al pasarla por HRTF, suena mal. Esto es lo que más fácilmente se hace mal en V3, así que va escrito.

**Regla de contenido:** el audio es del sendero. No se descarga ambiente de banco de sonidos ni cantos de otra región. Si un canto no se logra grabar, la ficha lo dice y no suena. Es la misma regla de "nada inventado" aplicada al oído.

---

## 6. Requerimientos que esto crea

| ID | Requerimiento |
|---|---|
| **RF-028** | El sistema debe reproducir una ambientación sonora continua durante el recorrido, con fuentes espacializadas en 3D binaural ancladas a posiciones reales del tramo |
| **RNF-016** | La ambientación no debe superar **4 fuentes espaciales simultáneas** ni comprometer el objetivo de 30 fps del RNF-001. El lecho ambiente no es posicional |

Y refuerza los que ya existían: RNF-008 (nunca automático), RNF-006 (todo audio con alternativa textual), RNF-001 (rendimiento).

---

## 7. Quién construye qué

| Pieza | Carpeta | Dueño |
|---|---|---|
| `AmbienceController` — lecho continuo, arranque por gesto, silencio | `src/audio/` | **David Beltrán** |
| `SpatialAudioSource` — fuente puntual HRTF anclada al tramo | `src/audio/` | **David Beltrán** |
| `AudioPlayer` — narración y canto de la ficha | `src/audio/` | **David Beltrán** |
| Perfil de audio por dispositivo (nº de fuentes) | `src/engine/QualityProfile` | **Alejandra Chambueta** |
| Grabación y edición del material | `assets/audio/` | Felipe Acevedo (edición), David Beltrán (grabación) |
| Textos, transcripciones y el control de silencio en el HUD | — | Alberto Alemán (texto), Eybar Viasus (diseño) |

Ver [`09-ambitos-de-los-tres-programadores.md`](09-ambitos-de-los-tres-programadores.md).

---

## 8. Contrato de datos

Las fuentes espaciales se declaran, como todo lo demás, en configuración. Se añade `config/soundscape.json`:

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

> `anchor` y `distanceMeters` quedan en `[por medir en campo]` hasta V1. Igual que los POIs: **añadir una fuente sonora no toca código** (misma regla que RNF-009).

---

## 9. Qué queda abierto

| # | Pregunta | Dueño | Se cierra en |
|---|---|---|---|
| A1 | ¿Cuántas fuentes HRTF simultáneas aguanta el celular de referencia a 30 fps? | David Beltrán | S4 |
| A2 | ¿`distanceModel` lineal o exponencial? ¿Con qué `refDistance` real? | David Beltrán | S5 |
| A3 | ¿Safari iOS respeta el `panningModel: 'HRTF'` o cae a *equalpower*? | David Beltrán | S3 |
| A4 | ¿El lecho ambiente en bucle se nota? ¿Cuánta duración hace falta? | Felipe Acevedo | V3 |
| A5 | ¿Se cuela la Circunvalar en las grabaciones? | David Beltrán | V1 |

**A3 es el que puede cambiar el diseño**, y por eso se prueba en S3 y no en S5: si Safari no da HRTF real, la ambientación se degrada a paneo estéreo por distancia en iOS y hay que saberlo con tiempo, no en la semana 10.
