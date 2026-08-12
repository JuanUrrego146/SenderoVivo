# ADR-002 — Nivel de detalle por proximidad al recorrido

> Fecha: 11/08/2026 · Estado: **Aceptada** · Responsable: Juan Urrego, con Alejandra Chambueta
> Requerimiento que crea: **RF-027**

---

## Contexto

El equipo definió el nivel de detalle en dos formulaciones que dicen lo mismo desde dos sitios distintos.

**En la lluvia de ideas:** «un metro alrededor de la vista del usuario, súper detallado; un metro fuera de ese campo de visión, menos detallado».

**En el resumen de diseño entregado al curso:** «se capturarán con el mayor nivel de detalle los elementos que se encuentren por debajo del campo de visión de una persona y hasta aproximadamente un metro por encima de este; los elementos fuera de ese rango también serán incluidos, aunque con menor nivel de detalle».

Ambas describen la misma intención: **el detalle se gasta donde el visitante mira de cerca, y se ahorra en el contexto.** Pero "un metro alrededor de la vista" no es implementable tal cual: hay que decidir si es una regla de **captura** (cuánto material se recoge) o de **render** (cuánto se dibuja), y con qué números.

Además, el proyecto tiene un techo duro: ~1 millón de gaussianas en móvil, y el cuello de botella real es la tasa de relleno, no la memoria. Gastar densidad en la copa de los árboles es gastarla donde no se mira.

---

## Decisión

**Se interpreta como dos mecanismos distintos que se refuerzan, uno en captura y otro en render.** Ninguno de los dos cambia el stack ni el protocolo de captura de PlayCanvas.

### 1. En captura — banda de alta densidad

Se define una **banda de alta densidad** alrededor del eje del sendero:

| Dimensión | Rango de alta densidad | Fuera de la banda |
|---|---|---|
| **Vertical** | Desde el suelo hasta **≈ 1 m por encima de la altura de los ojos** (≈ 2,6 m sobre el suelo) | Copas, cielo y ladera alta: cobertura de contexto |
| **Lateral** | **≈ 1 m a cada lado** del eje del trazado | Se captura, con menos pasadas |

Esto **no toca ningún parámetro del protocolo documentado** —4K a 60 fps, obturación 1/125 o más rápida, ISO bajo, exposición, foco y balance de blancos manuales y bloqueados siguen exactamente igual—. Lo único que define es **cuántas pasadas y a qué altura**, que es precisamente lo que el protocolo dejaba abierto al decir "varias pasadas a distintas alturas".

En concreto: pasadas densas y cercanas dentro de la banda (a la altura de la rodilla, del pecho y por encima de la cabeza), y una única pasada de contexto por encima y hacia los lados.

> **La cuestión de la focal (1× vs 2×) no se toca aquí.** Sigue abierta como validación V1 y se resuelve con la prueba comparativa de HU-02, tal como estaba.

### 2. En render — LOD por distancia a la cámara

PlayCanvas ya expone LOD por distancia mediante `lodBaseDistance` y `lodMultiplier`, con progresión geométrica `lodBaseDistance * lodMultiplier^i`.

**El punto clave que hace que esto funcione en este proyecto:** la cámara no vuela libre. Va siempre sobre el trazado (RF-004, garantizado por `TrailPath.clampToTrail()`). Por lo tanto **distancia a la cámara ≡ distancia al recorrido**, y un LOD por distancia de cámara es exactamente el "detalle por proximidad al recorrido" que se pidió. No hace falta inventar nada.

```javascript
// src/engine/LodController.js
app.scene.gsplat.lodBaseDistance = 2.0;  // m — primer nivel cubre la banda de alta densidad
app.scene.gsplat.lodMultiplier   = 2.0;  // 2 m → 4 m → 8 m → 16 m …
```

`lodBaseDistance ≈ 2 m` para que el nivel de máximo detalle cubra la banda definida en captura. **Los valores finales están `[por medir]`** y se fijan en S4, junto con `splatBudget` (validación V8), sobre el dispositivo de referencia.

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **Densidad uniforme en todo el volumen** | Es lo que revienta el presupuesto en móvil. Gasta gaussianas en la copa de los árboles, que nadie mira de cerca |
| **LOD por campo de visión** (más detalle en el centro de la pantalla) | El visitante puede girar 360° en cualquier punto (RF-005). Un LOD que dependa de hacia dónde mira produciría parpadeo visible al rotar |
| **Recortar todo lo que esté fuera de la banda** | El contexto es parte de reconocer el lugar. Un bosque sin copas no es un bosque. Se reduce el detalle, no se elimina el contenido |
| **Streamed SOG desde el principio** | Añade complejidad de pipeline antes de saber si hace falta. Sigue reservado como plan de choque del riesgo R2 |

---

## Consecuencias

**Positivas**

- El presupuesto de gaussianas se gasta donde se mira. Es la palanca más directa contra el riesgo R2.
- No cambia el stack, no cambia el protocolo de captura, no añade dependencias. Es configuración del motor y disciplina de campo.
- Da un criterio verificable en V2: si una pasada no está dentro de la banda, sobra o falta.

**Negativas y riesgos**

- **La banda hay que medirla en campo.** "Un metro a cada lado del eje" en un sendero de ancho variable no es una instrucción automática. Se ajusta en V1.
- Un LOD mal calibrado produce **saltos visibles** al avanzar. Se mide en S4, no se estima.
- Más pasadas dentro de la banda significa **más material y más tiempo de entrenamiento** (validación V5). Se acepta: es donde está el valor.

**Qué queda por validar**

| # | Pregunta | Dueño | Sprint |
|---|---|---|---|
| V13 | ¿Qué `lodBaseDistance` y `lodMultiplier` reales sostienen 30 fps sin salto visible? | Alejandra Chambueta | S4 |
| V14 | ¿La banda de 1 m lateral es suficiente en las zonas donde el sendero se ensancha? | Juan Urrego | V1 |

---

## Trazabilidad

- Crea **RF-027** — Nivel de detalle por proximidad al recorrido.
- Refuerza **RNF-001** (30 fps) y **RF-022** (ajuste de calidad por dispositivo).
- Se implementa en `src/engine/LodController.js` — ámbito de **Alejandra Chambueta**.
- Historia asociada: **HU-22** (ajustar calidad según el dispositivo), ampliada.
