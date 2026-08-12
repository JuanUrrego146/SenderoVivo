# ADR-003 — Ambientación sonora binaural con audio espacial 3D

> Fecha: 11/08/2026 · Estado: **Aceptada** · Responsable: David Beltrán, con Juan Urrego
> Requerimientos que crea: **RF-028**, **RNF-016**

---

## Contexto

La experiencia se definió como no solo visual e interactiva, sino también **auditiva**: ambientación sonora durante todo el recorrido, **binaural, con audio espacial 3D**.

Hasta ahora el proyecto solo contemplaba audio **dentro de la ficha** —narración y canto del ave (RF-011, RF-012)—, siempre disparado por el usuario y sujeto a RNF-008: *el audio no se reproduce automáticamente en ningún caso*.

Una ambientación continua entra en tensión directa con ese requerimiento. Y añade coste de CPU en un proyecto cuyo margen de rendimiento en móvil ya está comprometido (RNF-001, riesgo R2).

---

## Decisión

**Se adopta ambientación sonora espacial en dos capas, con arranque por gesto explícito y presupuesto acotado de fuentes.**

### 1. Dos capas, no una

| Capa | Espacializada | Coste |
|---|---|---|
| **Lecho ambiente** — fondo continuo del bosque | No. Estéreo fijo | Casi nulo |
| **Fuentes puntuales** — cauce, cantos, ancladas a coordenadas reales | **Sí. HRTF** | Alto, y por eso acotado |

Separarlas es lo que permite tener continuidad sonora barata y espacialidad solo donde aporta.

### 2. Binaural = `panningModel: 'HRTF'`

Se implementa con el `SoundComponent` de PlayCanvas sobre la Web Audio API, con fuentes `positional: true` y modelo de paneo HRTF, que es la definición operativa de audio binaural. **El oyente es la cámara activa**, que ya la mueve `TourEngine`: el audio no toca la cámara y el invariante de arquitectura se mantiene intacto.

### 3. RNF-008 se cumple, y se cumple explícitamente

La ambientación arranca **con el gesto con el que el visitante inicia el recorrido**, nunca antes. Cinco reglas lo hacen verificable:

1. Nada suena antes del primer gesto — ni en carga ni en onboarding.
2. El botón de inicio anuncia el sonido y ofrece «Iniciar en silencio».
3. Control de silencio siempre visible en el HUD.
4. La preferencia se recuerda entre visitas.
5. Narración y canto de ficha siguen requiriendo pulsación individual. La ambientación no los dispara.

Sin las cinco, la decisión rompe RNF-008. Con ellas, lo respeta.

### 4. Presupuesto acotado — RNF-016

**Máximo 4 fuentes HRTF simultáneas** en escritorio, **2 en móvil** `[valores por medir en S4]`. Las demás se apagan por distancia. Si el rendimiento no cierra, la primera palanca es reducir fuentes simultáneas — **nunca** desactivar el audio, porque es parte del producto.

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **Pista estéreo de fondo, sin espacialización** | Barata y cumple "hay sonido", pero no cumple lo pedido. Oír la quebrada quedarse atrás al avanzar es la mitad de la sensación de estar ahí |
| **Ambisónica de primer orden** | Da un campo sonoro completo, pero exige grabación con micrófono ambisónico que el equipo no tiene, y decodificación más cara. Fuera de presupuesto y de stack |
| **Espacializar también el lecho ambiente** | Multiplica el coste sin ganancia perceptible: un fondo difuso no tiene dirección que percibir |
| **Arrancar el audio al cargar la página** | Rompe RNF-008 y además lo bloquean las políticas de autoplay de todos los navegadores vigentes |
| **Sonido descargado de bancos de audio** | Rompe el principio P1 y la regla de "nada inventado" aplicada al oído. El sonido es del sendero o no está |

---

## Consecuencias

**Positivas**

- Cierra la tercera dimensión de la experiencia con un coste acotado y medible.
- El material se graba en las visitas que ya estaban planificadas (V1 mapea, V3 graba). No añade salidas.
- Las fuentes se declaran en `config/soundscape.json`: **añadir una fuente sonora no toca código**, igual que un POI (RNF-009).

**Negativas y riesgos**

- **HRTF cuesta CPU** en un proyecto con el rendimiento móvil ya ajustado. Mitigado por el presupuesto de RNF-016 y por medirlo en S4, no al final.
- **Safari iOS puede no dar HRTF real.** Es la validación A3 y se prueba en **S3**, con tiempo para degradar a paneo estéreo por distancia si hace falta.
- Las fuentes a espacializar **hay que grabarlas en mono**. Una grabación estéreo pasada por HRTF suena mal. Es el error más probable de V3 y va escrito en el plan de campo.
- Aumenta el peso descargado. Se acota con audio comprimido y bucles cortos.

**Qué queda por validar**

| # | Pregunta | Dueño | Sprint |
|---|---|---|---|
| A1 | ¿Cuántas fuentes HRTF aguanta el dispositivo de referencia a 30 fps? | David Beltrán | S4 |
| A3 | ¿Safari iOS respeta HRTF o cae a *equalpower*? | David Beltrán | **S3** |

---

## Trazabilidad

- Crea **RF-028** (ambientación sonora espacial) y **RNF-016** (presupuesto de audio).
- Refuerza **RNF-008** (nunca automático) y **RNF-006** (alternativa textual).
- Tensiona **RNF-001** (30 fps): por eso RNF-016 existe.
- Se implementa en `src/audio/` — ámbito de **David Beltrán**.
- Diseño completo: [`../08-ambientacion-sonora.md`](../08-ambientacion-sonora.md).
