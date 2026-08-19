// Radiografia de un PLY 3DGS antes/despues de limpiar: conteo, NaN, percentiles
// de escala log (para fijar el tope de agujas en p99,7), opacidad, extension
// espacial por eje (para confirmar que NADIE recorto el alcance) y "agujeza"
// (max - medio de las escalas log: mide hilos, que es distinto de anisotropia
// plana tipo disco, que es sana).
//
// Uso: node scripts/escenas/medir.js escena1.ply [escena2.ply ...]
//
// Valores de referencia de la escena de PRODUCCION (final_60000.ply, la corrida
// de 60 mil pasos, medidos el 19/08/2026) para comparar cualquier entreno nuevo:
//   agujeza  p50 1,41 · p90 2,63 · p99 3,57   <- este es el liston de acabado
//   escalas  p99,7 = -1,56 (el tope de agujas que se uso al publicar)
// Un entreno cuya agujeza p50 se acerque al p97 de produccion (~3,2) va a verse
// velludo cerca de la camara y NO se arregla filtrando: le falto presupuesto de
// gaussianas o pasos de refinamiento (docs/05 par. 13, epilogo).
const fs = require('fs');

function medir(ruta) {
    const fd = fs.openSync(ruta, 'r');
    const head = Buffer.alloc(8192);
    fs.readSync(fd, head, 0, 8192, 0);
    const txt = head.toString('latin1');
    const endTag = 'end_header\n';
    const end = txt.indexOf(endTag);
    if (end < 0) throw new Error('sin end_header en 8KB: ' + ruta);
    const header = txt.slice(0, end);
    const dataStart = end + endTag.length;
    const props = [...header.matchAll(/property float (\S+)/g)].map(m => m[1]);
    const n = parseInt(header.match(/element vertex (\d+)/)[1], 10);
    const stride = props.length * 4;
    const idx = Object.fromEntries(props.map((p, i) => [p, i]));

    const escalas = [], agujeza = [], op = [];
    const ejes = { x: [], y: [], z: [] };
    let nan = 0, muestras = 0;
    const PASO = Math.max(1, Math.floor(n / 400000));   // ~400k muestras
    const buf = Buffer.alloc(stride);
    for (let i = 0; i < n; i += PASO) {
        fs.readSync(fd, buf, 0, stride, dataStart + i * stride);
        muestras++;
        const v = {};
        let malo = false;
        for (const w of ['scale_0', 'scale_1', 'scale_2', 'opacity', 'x', 'y', 'z']) {
            v[w] = buf.readFloatLE(idx[w] * 4);
            if (!isFinite(v[w])) malo = true;
        }
        if (malo) { nan++; continue; }
        const s = [v.scale_0, v.scale_1, v.scale_2].sort((a, b) => b - a);
        escalas.push(s[0], s[1], s[2]);
        agujeza.push(s[0] - s[1]);
        op.push(v.opacity);
        ejes.x.push(v.x); ejes.y.push(v.y); ejes.z.push(v.z);
    }
    fs.closeSync(fd);

    for (const a of [escalas, agujeza, op, ejes.x, ejes.y, ejes.z]) a.sort((p, q) => p - q);
    const q = (a, p) => +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(4);
    const eje = a => ({ min: q(a, 0), p1: q(a, 0.01), p50: q(a, 0.5), p99: q(a, 0.99), max: q(a, 0.9999) });
    return {
        gaussianas: n,
        nanEnMuestra: `${nan}/${muestras}`,
        escalasLog: { p50: q(escalas, 0.5), p99: q(escalas, 0.99), p995: q(escalas, 0.995), p997: q(escalas, 0.997), p999: q(escalas, 0.999) },
        agujeza: { p50: q(agujeza, 0.5), p90: q(agujeza, 0.9), p99: q(agujeza, 0.99) },
        opacidadLogit: { p50: q(op, 0.5), p90: q(op, 0.9) },
        extension: { x: eje(ejes.x), y: eje(ejes.y), z: eje(ejes.z) }
    };
}

for (const ruta of process.argv.slice(2)) {
    console.log('===', ruta);
    console.log(JSON.stringify(medir(ruta), null, 1));
}
