// Poda por importancia de un PLY 3DGS para dispositivos moviles (estilo
// LightGaussian): cada gaussiana puntua por su contribucion visual aproximada
//   puntaje = alfa_lineal * area_proyectada  (alfa = sigmoide(opacity),
//   area ~ exp(escala_mayor + escala_media) en log-espacio)
// y se conservan las N de mayor puntaje. Las que se van son las que menos se
// ven: chiquitas y/o casi transparentes. NO mueve ni cambia ninguna gaussiana
// (mismo marco de coordenadas: sceneUp, track y POIs siguen validos).
//
// Dos pasadas en streaming: (1) muestrea ~400k puntajes para estimar el umbral
// del cuantil objetivo; (2) filtra con ese umbral, con tope duro de N filas.
//
// Uso: node scripts/escenas/muestrear.js entrada.ply salida.ply N_objetivo
// Ej. (la variante movil de scene-01, publicada 19/08):
//   node scripts/escenas/muestrear.js alcance_total.ply movil.ply 1200000
const fs = require('fs');

const [entrada, salida, nObjS] = process.argv.slice(2);
const N_OBJ = parseInt(nObjS, 10);
if (!entrada || !salida || !N_OBJ) {
    console.error('Uso: node muestrear.js entrada.ply salida.ply N_objetivo');
    process.exit(1);
}

const fd = fs.openSync(entrada, 'r');
const head = Buffer.alloc(8192);
fs.readSync(fd, head, 0, 8192, 0);
const text = head.toString('latin1');
const endTag = 'end_header\n';
const headerLen = text.indexOf(endTag) + endTag.length;
const headerText = text.slice(0, headerLen);
let n = 0; const props = [];
for (const line of headerText.split('\n')) {
    const m = line.match(/^element vertex (\d+)/); if (m) n = parseInt(m[1]);
    const p = line.match(/^property float (\w+)/); if (p) props.push(p[1]);
}
const stride = props.length * 4;
const idx = Object.fromEntries(props.map((p, i) => [p, i * 4]));

function puntaje(buf, base) {
    const s = [buf.readFloatLE(base + idx.scale_0), buf.readFloatLE(base + idx.scale_1), buf.readFloatLE(base + idx.scale_2)].sort((a, b) => b - a);
    const alfa = 1 / (1 + Math.exp(-buf.readFloatLE(base + idx.opacity)));
    return Math.log(alfa) + s[0] + s[1];   // log del puntaje: mismo orden, sin overflow
}

// Pasada 1: estimar el umbral del cuantil (1 - N/n) con ~400k muestras
const PASO = Math.max(1, Math.floor(n / 400000));
const fila = Buffer.alloc(stride);
const muestra = [];
for (let i = 0; i < n; i += PASO) {
    fs.readSync(fd, fila, 0, stride, headerLen + i * stride);
    const p = puntaje(fila, 0);
    if (isFinite(p)) muestra.push(p);
}
muestra.sort((a, b) => a - b);
const frac = Math.max(0, 1 - N_OBJ / n);
const umbral = muestra[Math.min(muestra.length - 1, Math.floor(muestra.length * frac))];
console.log(JSON.stringify({ gaussianas: n, objetivo: N_OBJ, umbralLogPuntaje: +umbral.toFixed(4) }));

// Pasada 2: filtrar (tope duro en N_OBJ por si el umbral estimado se queda corto)
const CH = 65536;
const inBuf = Buffer.alloc(CH * stride);
const outBuf = Buffer.alloc(CH * stride);
const tmp = salida + '.tmp';
const out = fs.openSync(tmp, 'w');
fs.writeSync(out, Buffer.from(headerText, 'latin1'));
let kept = 0, read = 0, pos = headerLen;
while (read < n && kept < N_OBJ) {
    const rows = Math.min(CH, n - read);
    fs.readSync(fd, inBuf, 0, rows * stride, pos);
    pos += rows * stride; read += rows;
    let o = 0;
    for (let r = 0; r < rows && kept + o / stride < N_OBJ; r++) {
        const base = r * stride;
        const p = puntaje(inBuf, base);
        if (!isFinite(p) || p < umbral) continue;
        inBuf.copy(outBuf, o, base, base + stride);
        o += stride;
    }
    if (o) { fs.writeSync(out, outBuf, 0, o); kept += o / stride; }
}
fs.closeSync(fd); fs.closeSync(out);

// Cabecera con el conteo real (relleno para no cambiar el largo en bytes)
const oldCount = String(n), newCount = String(kept);
if (newCount.length > oldCount.length) throw new Error('conteo nuevo mas largo');
const padded = ' '.repeat(oldCount.length - newCount.length) + newCount;
const fixed = headerText.replace(`element vertex ${oldCount}`, `element vertex ${padded}`);
if (Buffer.byteLength(fixed, 'latin1') !== headerLen) throw new Error('cabecera cambio de largo');
const f2 = fs.openSync(tmp, 'r+');
fs.writeSync(f2, Buffer.from(fixed, 'latin1'), 0, headerLen, 0);
fs.closeSync(f2);
fs.renameSync(tmp, salida);
console.log(JSON.stringify({ salida, conservadas: kept, pct: +(100 * kept / n).toFixed(1) }));
