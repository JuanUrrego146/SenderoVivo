# Identidad visual — Sendero Vivo

> Versión 1,0 — 11/08/2026 · Responsable: Eybar Viasus, con Alberto Alemán
> **Paleta inicial**, no definitiva. Se contrasta contra el lugar en la visita de reconocimiento (V1) y se cierra en S7 con la auditoría de accesibilidad (RNF-006).

---

## 1. El encargo

Paleta de **grises, negros y verdes**, resaltando **la quebrada y la fauna** del tramo. La interfaz aparece sobre todo en las interacciones de ver cada especie en su punto de interés — es decir, **la ficha es la pantalla que más importa**.

De ahí salen tres reglas de partida:

1. **El fondo no compite.** Grises y negros sostienen la imagen; la escena capturada es lo que se mira. Ningún elemento de interfaz introduce un color que no esté en el bosque.
2. **El verde es del contenido, no del cromo.** Los verdes marcan lo vivo: el marcador de una especie, el nombre científico, el estado activo. No se usan para bordes, separadores ni fondos decorativos.
3. **Un solo acento distinto al verde: el agua.** La quebrada es lo que da nombre al lugar. Se reserva un verde-azulado único para todo lo relacionado con el cauce y con los datos del recorrido.

---

## 2. Tokens de color

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

### 2.1 Contraste verificado

Calculado según WCAG 2.1 sobre `--sv-black-900` (`#0E1210`) y sobre `--sv-gray-050` (`#EDF1EF`).

| Combinación | Ratio | AA texto normal (4,5:1) | AA texto grande / UI (3:1) |
|---|---|---|---|
| `gray-050` sobre `black-900` | **≈ 16,6 : 1** | ✅ | ✅ |
| `gray-200` sobre `black-900` | **≈ 10,2 : 1** | ✅ | ✅ |
| `green-300` sobre `black-900` | **≈ 9,9 : 1** | ✅ | ✅ |
| `water-400` sobre `black-900` | **≈ 6,5 : 1** | ✅ | ✅ |
| `green-700` sobre `gray-050` | **≈ 6,9 : 1** | ✅ | ✅ |
| `green-500` sobre `gray-050` | **≈ 3,7 : 1** | ❌ **No** | ✅ |

**Regla que sale de la tabla:** `--sv-green-500` es un color de **marcador y de componente de interfaz**, nunca de texto corrido sobre fondo claro. Para texto sobre claro se usa `--sv-green-700`.

> Los ratios están calculados, no estimados. La auditoría formal contra la interfaz construida sigue siendo **HU-38**, en S7.

### 2.2 Lo que la paleta prohíbe

- ❌ Rojo, naranja o amarillo como color de interfaz. No hay nada de eso en el bosque y rompería la lectura de la escena. (Excepción única y obligatoria: los estados de error de RNF-007, que usan `--sv-gray-050` sobre `--sv-black-900` con un icono, **nunca solo color** — lo exige RNF-006.)
- ❌ Degradados sobre la escena capturada.
- ❌ Comunicar cualquier dato **solo** por color. Siempre hay texto o forma acompañando (RNF-006).

---

## 3. Tipografía

| Uso | Familia | Peso | Tamaño móvil | Nota |
|---|---|---|---|---|
| Nombre común de la especie | Sans humanista | 600 | 22 px | Lo primero que se lee en la ficha |
| Nombre científico | Sans humanista, **cursiva** | 400 | 15 px | Cursiva por convención taxonómica, no por estilo |
| Cuerpo de la ficha y narración | Sans humanista | 400 | 16 px | Nunca por debajo de 16 px en móvil |
| Datos del HUD | Sans, cifras **tabulares** | 500 | 18 px | Las cifras tabulares evitan que el número "salte" al actualizarse |
| Etiqueta del HUD | Sans, versalitas | 500 | 12 px | ALTITUD · RECORRIDO · DESNIVEL · PENDIENTE |

**Familia concreta:** `[por decidir en S7]`. El criterio es cerrado aunque la familia no lo esté: una sans humanista de licencia libre, con cursiva real (no oblicua sintética, porque el nombre científico la necesita) y con cifras tabulares. La decisión se toma junto con el sistema de diseño en HU-39 y se registra ahí.

---

## 4. La ficha de punto de interés

Es la pantalla donde vive la interfaz. Jerarquía de arriba abajo:

```
┌──────────────────────────────────┐
│  [ visor 3D — fondo black-900 ]  │  ← el modelo ocupa la mitad superior
│      modelo girable + zoom       │     animación idle de aleteo activa
├──────────────────────────────────┤
│  Colibrí chillón                 │  ← gray-050, 600, 22 px
│  Colibri coruscans               │  ← green-300, cursiva, 15 px
│                                  │
│  ▸ Escuchar narración   0:48     │  ← control de audio, nunca automático
│  ▸ Escuchar el canto             │  ← solo si type = "fauna"
│  ▸ Ver transcripción             │  ← obligatorio si hay narración
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

---

## 5. El marcador en la escena

Tres estados, diferenciados **por forma y por tamaño además de por color** (RNF-006):

| Estado | Color | Forma | Cuándo |
|---|---|---|---|
| Reposo | `--sv-gray-200` al 60 % | Círculo pequeño con anillo | El POI está lejos |
| Cercano | `--sv-green-500` | Círculo mayor + etiqueta con el nombre común | El visitante está en rango |
| Activo | `--sv-green-300` | Círculo relleno + anillo exterior | La ficha está abierta |

Los marcadores de **agua y de datos del recorrido** usan `--sv-water-400` en lugar del verde. Los de **patrimonio** (puertas, muros, monumentos) usan `--sv-gray-050` sobre relleno `--sv-gray-800`: son grises deliberadamente, porque no están vivos y la paleta lo dice.

---

## 6. Cómo se implementa

Los tokens viven en `styles/tokens.css` como variables CSS y son la **única** fuente de color de la aplicación.

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

**Invariante:** ningún archivo `.js` ni ningún componente escribe un color literal. Si hace falta un color que no está aquí, se añade aquí primero — y se le calcula el contraste antes de usarlo.

**Dueños:** `styles/` es de **Eybar Viasus y Alberto Alemán**. Los tres programadores consumen los tokens; no los definen. Ver [`09-ambitos-de-los-tres-programadores.md`](09-ambitos-de-los-tres-programadores.md).

---

## 7. Qué queda abierto

| # | Pregunta | Dueño | Se cierra en |
|---|---|---|---|
| D1 | ¿La paleta funciona sobre la escena capturada real, o el verde se pierde contra el follaje? | Eybar Viasus | V1 (reconocimiento) + S5 |
| D2 | ¿Qué familia tipográfica concreta? | Eybar Viasus | S7 (HU-39) |
| D3 | ¿Hace falta modo claro, o el recorrido siempre va sobre fondo oscuro? | Alberto Alemán | S7 |
| D4 | ¿El marcador se lee a contraluz, con el cielo detrás? | Eybar Viasus | S5 (HU-25) |

**D1 y D4 son los importantes**, y los dos se responden mirando el sitio, no la pantalla. Por eso Eybar va a la visita de reconocimiento.
