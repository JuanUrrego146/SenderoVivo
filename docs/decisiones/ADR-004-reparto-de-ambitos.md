# ADR-004 — Reparto de ámbitos entre los tres programadores

> Fecha: 11/08/2026 · Estado: **Aceptada** · Responsable: Juan Urrego

---

## Contexto

El equipo tiene **tres programadores** —Juan Urrego, Alejandra Chambueta y David Beltrán— además del artista 3D y los dos diseñadores de UI/UX. Hasta ahora el reparto estaba definido por **épica** (E1 Juan, E2 Alejandra, E3/E4 David), no por **archivo**.

Repartir por épica funciona mientras las épicas van en serie. Deja de funcionar en cuanto dos épicas se solapan —y aquí se solapan: S2b corre en paralelo con S2, y S5 y S6 comparten módulos con S3 y S4—. Además aparecen tres piezas nuevas sin dueño: `LodController` (RF-027), `src/audio/` (RF-028) y la implementación del HUD.

El síntoma que se quiere evitar es concreto: dos personas editando el mismo archivo la misma semana, y el conflicto apareciendo en el merge del viernes.

---

## Decisión

**El ámbito de cada programador es una carpeta, no un tema.**

| Programador | Carpetas |
|---|---|
| **Alejandra Chambueta** | `src/engine/` |
| **David Beltrán** | `src/poi/` · `src/data/` · `src/audio/` |
| **Juan Urrego** | `src/app/` · `src/ui/` · `config/` |

Se crean tres carpetas nuevas: **`src/app/`** (arranque y cableado), **`src/audio/`** (ambientación y reproducción) y **`styles/`** (tokens de diseño, propiedad de Eybar y Alberto).

Se definen **exactamente tres fronteras** entre ámbitos, cada una con su contrato:

1. **Motor → Datos y POIs**: `TourEngine` publica el evento `tour:progress`. Nadie lee la cámara.
2. **POIs → Motor**: `PoiCard` llama a `saveCameraState()` / `restoreCameraState()`. No toca la cámara.
3. **Motor → Audio**: `QualityProfile` expone `maxSpatialAudioSources`. El audio no configura el motor.

Detalle completo en [`../09-ambitos-de-los-tres-programadores.md`](../09-ambitos-de-los-tres-programadores.md).

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **Seguir repartiendo por épica** | Es lo que hay hoy y no dice quién escribe `LodController` ni `src/audio/`. Deja huecos justo donde aparecen las funcionalidades nuevas |
| **Propiedad colectiva del código** | Funciona en equipos con experiencia compartida en el stack. Aquí los tres son primerizos en PlayCanvas: sin dueño, nadie construye criterio sobre ninguna parte |
| **Un programador por capa horizontal** (uno hace toda la lógica, otro toda la vista) | Obliga a los tres a tocar todas las historias. Multiplica la coordinación en lugar de reducirla |
| **Repartir `src/audio/` entre Alejandra (espacialización) y David (reproducción)** | Es la misma pieza cortada por la mitad. La espacialización *es* la reproducción cuando el oyente es la cámara |

---

## Consecuencias

**Positivas**

- Un conflicto de merge entre programadores pasa a ser una señal visible, no un accidente.
- La revisión cruzada tiene un criterio automático: **revisa el dueño de la carpeta**.
- Cada uno acumula criterio sobre una parte concreta del stack en lugar de conocimiento superficial de todo.
- Los picos de carga no coinciden (Juan S1–S2, Alejandra S3–S4, David S5–S6), así que el dueño de una carpeta casi siempre está disponible para revisar.

**Negativas y riesgos**

- **Riesgo de silo.** Se mitiga con la revisión cruzada obligatoria y con el principio P3 (nadie se bloquea más de un día en silencio).
- **Riesgo de cuello de botella si alguien falta.** Se mitiga con el procedimiento de `01-principios-de-trabajo.md` §8: se empareja antes de reasignar.
- **Juan concentra integración y `config/`.** Es el mismo desequilibrio ya identificado en el plan de trabajo §7; por eso no es además revisor único de nada.

---

## Trazabilidad

- Modifica la tabla de revisores de [`../01-principios-de-trabajo.md`](../01-principios-de-trabajo.md) §4.
- Modifica la estructura de carpetas de [`../arquitectura.md`](../arquitectura.md) §9.
- Habilita la implementación de **RF-027** (LOD) y **RF-028** (audio espacial), que hasta ahora no tenían dueño.
