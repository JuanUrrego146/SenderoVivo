# De los videos a la página: la guía completa, paso a paso

> Este documento es la **ruta de máquina**: qué ejecutar, en qué orden, en qué carpeta y
> por qué, desde los `.MOV` de la cámara hasta la escena corriendo en
> https://senderovivo.pages.dev. La parte de **campo** (cómo grabar, las ocho pasadas, la
> cámara) vive en [05-produccion-de-escenas.md](05-produccion-de-escenas.md) §§8–11; las
> razones profundas de cada parámetro, en sus §§12–14. Aquí no hay teoría que no haga falta
> para ejecutar. Todos los números de esta guía están **medidos** en el prototipo
> (RTX 3060 Ti 8 GB, agosto/2026), no estimados.

---

## 0. El mapa del viaje

```
videos .MOV ──ffmpeg──► frames/ ──COLMAP──► dataset/ ──Brush──► out/*.ply
                                                                   │
              ┌────────────────────────────────────────────────────┘
              ▼
        medir.js ──► filtrar.js ──► limpio.ply ──splat-transform──► 3 empaques
                                                                   │
   ┌──────────────┬────────────────────────┬───────────────────────┘
   ▼              ▼                        ▼
 SOG clásico   SOG streaming (LODs)     poda móvil          ──► config/scenes.json
 (respaldo)    (escritorio)             (celular)           ──► git push a tu rama
                                                            ──► URL de tu rama → develop
```

Tiempos totales por escena: ~30 min de ffmpeg+organización, **3,4 h de COLMAP** (solo CPU,
puedes usar el PC), **~19,5 h de Brush** en receta de publicación (corre de noche), ~15 min
de limpieza y empaques, ~2 min de publicación.

---

## 1. La jerarquía de carpetas

El material bruto **nunca entra al repositorio** (invariante 8: gigas de video y PLY no
caben en git). Vive en un disco local con **respaldo en dos ubicaciones externas** y esta
estructura — la del prototipo fue `F:\EscaneoPrototipo\`, para el sendero real usa una
carpeta por tramo (`F:\Sendero\tramo-01\`, etc.):

```
F:\<Escaneo>\
├── *.MOV                  ← los videos tal cual salen de la cámara (NO se renombran:
│                            el nombre dice qué pasada es: Centro_Ida, Lateral_...)
├── frames\                ← cuadros extraídos por ffmpeg (jpg, se regeneran si hace falta)
├── db.db                  ← base de datos de features de COLMAP (intermedio)
├── sparse\                ← salida del mapper de COLMAP (0\, y OJALÁ no haya 1\)
├── dataset\               ← LO QUE COME BRUSH: carpeta autocontenida con
│   ├── images\            ←   los mismos cuadros de frames\ (o un enlace/copregión)
│   └── sparse\0\          ←   cameras.bin + images.bin + points3D.bin del mapper
├── out\                   ← exportes del entrenamiento (escena_5000.ply, ...)
└── final\                 ← lo que sobrevive: el PLY crudo final, el limpio y los LODs
```

Por qué así: `dataset\` con `images\` + `sparse\0\` es el formato COLMAP que Brush
autodetecta; separar `out\` de `final\` permite borrar los exportes intermedios sin miedo
(los intermedios de un entreno sano pesan gigas y NO se suben a ningún lado); y `frames\`
es regenerable, así que jamás se respalda.

En el repositorio solo entran los **empaques comprimidos** (§6) bajo `assets/scenes/`.

---

## 2. De videos a cuadros (ffmpeg)

**Un cuadro de cada 20** por video, calidad jpg alta:

```bash
ffmpeg -i Centro_Ida.MOV -vf "select=not(mod(n\,20))" -fps_mode vfr -q:v 2 frames/CI_%04d.jpg
```

Repite por cada video cambiando el prefijo (`CI_`, `CD_`, `LIA_`...) para saber de qué
pasada vino cada cuadro. Meta orientativa para 30 m de sendero: **500–1.500 imágenes** en
total.

- **Por qué 1/20 y no 1/30:** con 1/30 el prototipo alineó 987 de 1.110 imágenes y las
  otras 121 cayeron en un segundo modelo desconectado (pasadas sin suficiente solape).
  Más densidad de cuadros = más probabilidad de un solo modelo.
- **Por qué no más denso que 1/10:** cuadros casi idénticos no aportan paralaje, solo
  horas de COLMAP.
- Si un video vino movido/borroso, mejor excluirlo completo que meter ruido.

---

## 3. De cuadros a poses (COLMAP)

Tres comandos, en la carpeta del escaneo:

```bash
colmap feature_extractor  --database_path db.db --image_path frames --SiftExtraction.use_gpu 1
colmap exhaustive_matcher --database_path db.db --SiftMatching.use_gpu 1
colmap mapper             --database_path db.db --image_path frames --output_path sparse
```

Tiempo medido: **3,4 h** (el mapper es solo CPU; la GPU queda libre).

**Criterio de aceptación: UN solo modelo.** Mira `sparse\`: si solo existe `sparse\0\`,
perfecto. Si aparece `sparse\1\`, hay pasadas desconectadas — se arregla con más cuadros
(§2) o regrabando el hueco, **nunca** entrenando con el modelo partido.

Arma entonces el `dataset\`:

```
dataset\images\    ← copia (o mueve) los cuadros de frames\
dataset\sparse\0\  ← copia cameras.bin, images.bin, points3D.bin de sparse\0\
```

---

## 4. Entrenamiento (Brush)

El binario vive en `C:\Users\Juan\Tools\brush\brush_app.exe` (v0.3.0). Corre sin ventana,
así que déjalo de noche con la receta de publicación.

**Receta de publicación** (la que produjo la scene-01 vigente):

```powershell
brush_app.exe "F:\<Escaneo>\dataset" --total-steps 60000 --max-resolution 3840 --max-splats 5000000 --growth-grad-threshold 0.00002 --export-every 15000 --export-path "F:\<Escaneo>\out" --export-name "escena_{iter}.ply"
```

**Receta de borrador** (verificar el dataset en <1 h; JAMÁS se publica — sale filamentosa):

```powershell
brush_app.exe "F:\<Escaneo>\dataset" --total-steps 30000 --max-resolution 1920 --max-splats 1500000 --export-every 10000 --export-path "F:\<Escaneo>\out" --export-name "borrador_{iter}.ply"
```

### 4.1 Qué hace cada parámetro y qué puedes tocar

| Parámetro | Qué controla | ¿Modificarlo? |
|---|---|---|
| `--total-steps` | Pasos de optimización. El **crecimiento** de gaussianas solo ocurre hasta el paso 15.000 (`--growth-stop-iter`, default); TODO lo demás es refinamiento, y el refinamiento largo es lo que compra el acabado fino. | 60.000 para publicar, 30.000 para borrador. No recortes el refinamiento para "ahorrar": queda hilachento. |
| `--max-resolution` | Resolución máxima a la que carga las fotos. | 3840 en publicación, 1920 en borrador. |
| `--max-splats` | Techo de gaussianas. Con ~5 M hay presupuesto para TODO el campo visual (cielo y fondo incluidos). | 5 M publicación / 1,5 M borrador. Subirlo engorda todo sin mejorar (el default 10 M es una barbaridad). |
| `--growth-grad-threshold` | Umbral de gradiente para dividir gaussianas. **El parámetro más peligroso.** Doblarlo estranguló la densificación (mezcolanza borrosa, 18/08); está calibrado para 1920: a 3840 el peso efectivo ya se dobla solo. | Solo la pareja probada: 0.00002 con 3840. En borrador, ni tocarlo. |
| `--export-every` / `--export-path` / `--export-name` | Cada cuánto y dónde exporta un PLY. | Libre. `{iter}` se sustituye por el paso. |

### 4.2 Señales de un entrenamiento sano (o enfermo) SIN abrir nada

Mira los **tamaños de los exportes** en `out\`:

- **Sano:** crecen entre los primeros exportes y se estabilizan después del paso 15.000
  (los exportes ≥15.000 pesan idéntico: el conteo se congeló por diseño, y los pasos
  siguen refinando valores — el peso no cambia porque el número de filas no cambia).
- **Enfermo (topó):** TODOS los exportes pesan idéntico desde el primero = chocó contra
  `--max-splats` antes de terminar de crecer.
- **Enfermo (estrangulado):** los exportes finales pesan mucho menos que lo esperado
  (~236 bytes por gaussiana): creció poco. Revisa el umbral.

Al terminar, el archivo bueno es el **del último paso** (`escena_60000.ply`). Y antes de
juzgarlo con el ojo: **mídelo** (§5) — un PLY crudo siempre se ve horrible (niebla y
agujas incluidas); se evalúa después de limpiar, en el visor.

---

## 5. Limpieza (sin cajas, con umbrales medidos)

Desde la **raíz del repositorio** (los scripts están versionados en `scripts/escenas/`):

```bash
# 1) Radiografía: NaN, percentiles de escala, extensión por eje, "agujeza"
node scripts/escenas/medir.js "F:\<Escaneo>\out\escena_60000.ply"

# 2) Filtro: agujas al p99,7 DEL PROPIO ARCHIVO (lo imprime medir.js) + niebla alfa>0,05
node scripts/escenas/filtrar.js "F:\<Escaneo>\out\escena_60000.ply" "F:\<Escaneo>\final\limpio.ply" <p99,7> -2.944
```

Un filtrado sano quita **3–12 %**. Si quita más, sospecha del entrenamiento, no aprietes
más el filtro. **Prohibido `--filter-box`**: las cajas cortan en diagonal (el marco de
COLMAP sale torcido) y así se perdieron las rejas una vez. El detalle completo y el
checklist de verificación están en [05 §12.4](05-produccion-de-escenas.md).

---

## 6. Los tres empaques para la web

De un mismo `limpio.ply` salen **tres empaques**, todos al repositorio bajo
`assets/scenes/`. ¿Por qué tres? Porque escritorio y celular tienen presupuestos de
render distintos (PlayCanvas: ~1 M de gaussianas en móvil, 3 M+ en escritorio) y porque
el streaming necesita su propio formato:

**a) SOG clásico** — el empaque simple: toda la escena en 8 archivos. Hoy es el
respaldo y lo que carga `?sog=`:

```bash
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\limpio.ply" "assets\scenes\scene-XX\meta.json"
```

**b) SOG en streaming (escritorio)** — la optimización "solo lo que se ve": la escena se
decima en niveles de detalle (por **fusión** de gaussianas, no borrado) y se trocea en
chunks con un árbol espacial; el visor carga y ordena solo los chunks que la cámara ve,
con detalle pleno de cerca y menos gaussianas a lo lejos (quedan subpíxel: no se nota):

```bash
# Niveles decimados (50%, 25%, 10%)
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\limpio.ply" -d 50% "F:\<Escaneo>\final\lods\lod1.ply"
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\limpio.ply" -d 25% "F:\<Escaneo>\final\lods\lod2.ply"
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\limpio.ply" -d 10% "F:\<Escaneo>\final\lods\lod3.ply"

# Empaquetado streamed (el nombre lod-meta.json es OBLIGATORIO)
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\limpio.ply" -l 0 "...\lod1.ply" -l 1 "...\lod2.ply" -l 2 "...\lod3.ply" -l 3 "assets\scenes\scene-XX-stream\lod-meta.json" --filter-nan
```

**c) Poda móvil (celular, técnica COLMAP)** — la misma escena podada por importancia
(estilo LightGaussian: puntaje = alfa × área proyectada; se quedan las que más se ven) a
~1,2 M para caber en el presupuesto móvil:

```bash
node scripts/escenas/muestrear.js "F:\<Escaneo>\final\limpio.ply" "F:\<Escaneo>\final\movil.ply" 1200000
npx --yes @playcanvas/splat-transform -w "F:\<Escaneo>\final\movil.ply" "assets\scenes\scene-XX-movil\meta.json"
```

Ningún empaque mueve ni reescala nada: **los tres comparten el marco de coordenadas**, así
que `sceneUp`, el trazado y los POIs sirven igual para todos.

---

## 7. Declararla en `config/scenes.json`

El visor no conoce rutas: **todo sale de la configuración**. Campos de una escena COLMAP:

```jsonc
{
  "id": "scene-XX",
  "order": 1,                                   // la de order más bajo es la principal
  "render": "colmap",                           // para el switch de técnica
  "sogUrl":      "assets/scenes/scene-XX/meta.json",         // clásico (respaldo/?sog=)
  "lodUrl":      "assets/scenes/scene-XX-stream/lod-meta.json", // streaming (escritorio)
  "movilSogUrl": "assets/scenes/scene-XX-movil/meta.json",   // poda (celular + COLMAP)
  "sceneUp": { "x": -0.204, "y": -0.879, "z": -0.431 }       // "arriba" real medido
}
```

Cómo elige el visor (`resolveSceneUrl` en `src/app/main.js`): escritorio → `lodUrl` si
existe, si no `sogUrl`; celular → escena Luma liviana por defecto, y `movilSogUrl` si el
usuario fuerza COLMAP con el switch. `?sog=<ruta>` fuerza un archivo concreto.

- **`sceneUp`** se mide de las poses de COLMAP (promedio del "arriba" de las cámaras) y
  nivela el horizonte; se recalcula por escena — el procedimiento está en
  [05 §16](05-produccion-de-escenas.md) y el histórico en `config/scenes.json` mismo.
- Si la escena es de una **técnica alterna** (p. ej. Luma), antes de declararla hay que
  **registrarla al marco de la principal** (misma posición física = mismas coordenadas):
  contrato completo en [CONTEXTO-EQUIPO.md](../CONTEXTO-EQUIPO.md) §8bis.

---

## 8. Subirla a la página: dónde, cómo y por qué

**Dónde.** Los empaques van **versionados en git** dentro de `assets/scenes/<id>/`
(excepción deliberada del 14/08 en `.gitignore`: las escenas comprimidas SÍ entran al
repo, el material bruto jamás). No hay servidor de archivos aparte, ni S3, ni CDN manual.

**Por qué así.** La página es **Cloudflare Pages sirviendo el repositorio TAL CUAL** —
sin paso de build. Lo que está en la rama, está en la web; lo que no, no existe. De ahí
las dos reglas de peso: ningún archivo individual puede superar **25 MiB** (límite duro de
Pages — por eso el SOG desempaquetado en varios archivos, no el `.sog` de 70 MB) y no se
suben PLY (gigas). El streaming además reparte la descarga: el visor pide solo los chunks
que necesita.

> **Regla del caché (importante).** `_headers` sirve `assets/scenes/*` como inmutable por
> un año (así la segunda visita no re-descarga nada). La contrapartida: **los archivos de
> una carpeta de escena ya publicada NUNCA se sobrescriben** — quien la tenga cacheada
> seguiría viendo la vieja hasta un año. Una versión nueva de una escena va en una
> **carpeta nueva** (`scene-01-v2/`, `scene-01-stream/`, ...) y se apunta desde
> `config/scenes.json` (que sí es de caché corto y refresca en ≤60 s).

**Cómo** (desde tu rama, SIN pull requests — este repo trabaja con push directo):

```bash
git add assets/scenes/scene-XX assets/scenes/scene-XX-stream assets/scenes/scene-XX-movil config/scenes.json
git commit -m "feat(escena): scene-XX ..."
git push origin dev/<tu-nombre>
```

En **1–2 minutos** Cloudflare publica tu rama en su URL propia:
`https://dev-<nombre>.senderovivo.pages.dev` (la de esta rama:
`https://dev-juan-urrego.senderovivo.pages.dev`). Ahí la ves tú y la ve el equipo, sin
tocar producción.

**A producción** (https://senderovivo.pages.dev, que sirve `develop`): se fusiona tu rama
a `develop` y se propaga al resto de ramas para que nadie quede atrás — ese flujo con sus
comandos exactos está en [CONTEXTO-EQUIPO.md](../CONTEXTO-EQUIPO.md) §2bis. La rama de
David no se toca (integración manual pendiente).

**Verificación después del deploy** (no des nada por publicado sin esto):

```bash
# ¿Cloudflare ya sirve el archivo nuevo? (compara los bytes con tu archivo local)
curl -s -o /dev/null -w "%{size_download}" https://senderovivo.pages.dev/assets/scenes/scene-XX/means_l.webp
```

y en el navegador: la escena carga, los **bordes** se ven (rejas, fondo, cielo), el
recorrido se puede andar completo, y en un celular real (o emulación ≤640 px) la UI se
compacta y el switch COLMAP/Luma funciona.

---

## 9. Problemas típicos y su lectura

| Síntoma | Qué significa | Qué hacer |
|---|---|---|
| `sparse\1\` existe tras COLMAP | Pasadas desconectadas | Más cuadros (1/10) o regrabar el hueco. No entrenar así. |
| Todos los exportes de Brush pesan igual desde el 1.º | Topó `--max-splats` en plena fase de crecimiento | Revisar umbral/resolución; ver §4.2. |
| Escena "de pelusa", hilos junto a la cámara | Gaussianas filamentosas: faltó presupuesto o refinamiento | No se filtra: se reentrena con la receta de publicación. |
| Mezcolanza borrosa, "no se ve ni el camino" (PLY crudo) | Normal ANTES de limpiar; anormal después | Limpiar (§5) y juzgar en el visor, nunca el PLY crudo. |
| `medir.js` muestra min/max clavados en ±15 (u otro número redondo) | Alguien pasó una caja de recorte | Rehacer la limpieza sin caja desde el PLY crudo. |
| `No Gaussians to write` en splat-transform | `--filter-value` no acepta negativos (espacio lineal) | Usar `scripts/escenas/filtrar.js` para topes log. |
| Cloudflare rechaza el deploy o falta un archivo | Algún archivo >25 MiB | Verificar con `ls -la`; re-empacar (más chunks o menos SH). |
| En celular no aparece la escena COLMAP | El switch la carga podada; si no hay `movilSogUrl`, cae a `sogUrl` completa (lenta) | Generar la poda (§6c) y declararla. |
| La escena sale torcida | `sceneUp` ausente o de otra escena | Medirlo para ESTA escena (05 §16). |
| Todo negro con la consola limpia | Suele ser descarga aún en curso (68 MB tardan) | Esperar la barra; ver pestaña Red. |
| Streaming en negro con cámara quieta | El sorter unificado solo dispara su PRIMER orden cuando la cámara se mueve ≥2 cm DESPUÉS de que el mundo está listo | El visor ya "patea" la cámara solo (main.js); si reaparece, mover la cámara un paso. En frío el contenido aparece cuando llegan los chunks: es normal, no es fallo. |
| Todo congelado y sin avanzar con W | La pestaña o la ventana del navegador está oculta: Chrome congela el render (rAF) en segundo plano | Traer la ventana al frente; no es un bug del visor. |

---

*Guía escrita el 19/08/2026 con los números del prototipo del parque. Cuando el sendero
real reemplace al parque, los comandos son los mismos: cambian las carpetas y los `id`.*
