// Filtro de filas de un PLY 3DGS en streaming: quita agujas (escala log por
// encima del tope en cualquier eje) y opcionalmente neblina (opacidad logit) y
// quemados (f_dc_0). No toca ningun valor: solo decide que filas quedan.
// SIN caja de recorte a proposito: el alcance completo de la escena se conserva
// (docs/05-produccion-de-escenas.md par. 12.4). Los umbrales NO se inventan:
// se miden con scripts/escenas/medir.js (el tope de agujas es el p99,7 de las
// escalas log del propio archivo; la niebla, alfa > 0,05 = logit -2,944).
// Por que no splat-transform --filter-value: compara en espacio LINEAL/activado
// (sigma, alfa) y rechaza valores negativos, asi que no sirve para topes en
// log-espacio como el p99,7.
// Uso: node scripts/escenas/filtrar.js entrada.ply salida.ply scaleCap [opacityMin] [fdcMax]
// Ej. (la escena publicada el 19/08):
//   node scripts/escenas/filtrar.js final_60000.ply alcance_total.ply -1.5607 -2.944
const fs = require('fs');
const [entrada, salida, scaleCapS, opMinS, fdcMaxS] = process.argv.slice(2);
const scaleCap = parseFloat(scaleCapS);
const opMin = opMinS !== undefined ? parseFloat(opMinS) : null;
const fdcMax = fdcMaxS !== undefined ? parseFloat(fdcMaxS) : null;

const fd = fs.openSync(entrada, 'r');
const head = Buffer.alloc(8192);
fs.readSync(fd, head, 0, 8192, 0);
const text = head.toString('ascii');
const endTag = 'end_header\n';
const headerLen = text.indexOf(endTag) + endTag.length;
const headerText = text.slice(0, headerLen);
let n = 0; const props = [];
for (const line of headerText.split('\n')) {
    const m = line.match(/^element vertex (\d+)/); if (m) n = parseInt(m[1]);
    const p = line.match(/^property float (\w+)/); if (p) props.push(p[1]);
}
const stride = props.length * 4;
const iS = ['scale_0', 'scale_1', 'scale_2'].map(k => props.indexOf(k) * 4);
const iOp = props.indexOf('opacity') * 4;
const iFdc = props.indexOf('f_dc_0') * 4;

const CH = 65536; // filas por lote
const inBuf = Buffer.alloc(CH * stride);
const outBuf = Buffer.alloc(CH * stride);
const tmp = entrada + '.filtrado.tmp';
const out = fs.openSync(tmp, 'w');
// cabecera provisional (mismo largo despues de ajustar el conteo con relleno)
fs.writeSync(out, Buffer.from(headerText, 'ascii'));

let kept = 0, read = 0, pos = headerLen;
while (read < n) {
    const rows = Math.min(CH, n - read);
    fs.readSync(fd, inBuf, 0, rows * stride, pos);
    pos += rows * stride; read += rows;
    let o = 0;
    for (let r = 0; r < rows; r++) {
        const base = r * stride;
        const s0 = inBuf.readFloatLE(base + iS[0]);
        const s1 = inBuf.readFloatLE(base + iS[1]);
        const s2 = inBuf.readFloatLE(base + iS[2]);
        if (s0 >= scaleCap || s1 >= scaleCap || s2 >= scaleCap) continue;
        if (opMin !== null && inBuf.readFloatLE(base + iOp) <= opMin) continue;
        if (fdcMax !== null && inBuf.readFloatLE(base + iFdc) >= fdcMax) continue;
        inBuf.copy(outBuf, o, base, base + stride);
        o += stride;
    }
    if (o) { fs.writeSync(out, outBuf, 0, o); kept += o / stride; }
}
fs.closeSync(fd); fs.closeSync(out);

// reescribir la cabecera con el conteo correcto (mismo numero de bytes: se
// rellena el conteo con espacios a la izquierda del ancho original)
const oldCount = String(n), newCount = String(kept);
if (newCount.length > oldCount.length) throw new Error('conteo nuevo mas largo');
const padded = ' '.repeat(oldCount.length - newCount.length) + newCount;
const fixed = headerText.replace(`element vertex ${oldCount}`, `element vertex ${padded}`);
if (Buffer.byteLength(fixed) !== headerLen) throw new Error('cabecera cambio de largo');
const f2 = fs.openSync(tmp, 'r+');
fs.writeSync(f2, Buffer.from(fixed, 'ascii'), 0, headerLen, 0);
fs.closeSync(f2);
fs.renameSync(tmp, salida);
console.log(JSON.stringify({ entrada, salida, antes: n, despues: kept, quitadas: n - kept, pct: +(100 * (n - kept) / n).toFixed(2) }));
