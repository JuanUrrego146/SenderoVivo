// Barrido de un recorrido EN LA APP: abre la app en Edge sin ventana (con la tarjeta gráfica), camina por el trazado
// como lo hace el visitante y guarda una captura de lo que se ve en cada punto. Sirve para decidir con la imagen real,
// y no con un dibujo aparte, qué trechos se quitan del recorrido (campo `cuts` del trazado) y dónde van las paradas.
//
// modo=tramo    quita los cortes y las paradas en la página (no toca ningún archivo) y se detiene cada PASO unidades
//               llegando con un toque, que es como la vista queda enderezada hacia el camino. Oculta la interfaz, los
//               marcadores de los puntos de interés y las flechas del camino para medir solo la escena.
// modo=paradas  deja el recorrido como está publicado y avanza de parada en parada con «un toque» (cruza los cortes
//               con su fundido). Es la comprobación final de lo que ve el visitante.
//
// Se puede cortar y volver a lanzar: lee barrido.json de la carpeta de salida y sigue desde la primera captura que
// falte. El perfil temporal del navegador se crea dentro de la carpeta de salida y se borra al terminar.
// Sale con 0 si terminó, con 3 si el navegador se cerró a medias (volver a lanzar para seguir).
//
// uso: node barrido_app.mjs <url> <carpeta_salida> [modo=tramo] [paso=1] [desde=0] [hasta=fin] [ancho=1280] [alto=720]
//      [espera_ms=2000] [interfaz=0]
// La medida y las hojas para revisar salen de barrido_hoja.py sobre la misma carpeta.
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';

const [url, salida, ...resto] = process.argv.slice(2);
if (!url || !salida) {
    console.log('uso: node barrido_app.mjs <url> <carpeta_salida> [modo=tramo|paradas] [paso=1] [desde=0] [hasta=fin] [ancho=1280] [alto=720] [espera_ms=2000] [interfaz=0]');
    process.exit(2);
}
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const MODO = opc.modo ?? 'tramo';
const PASO = Number(opc.paso ?? 1);
const ANCHO = Number(opc.ancho ?? 1280);
const ALTO = Number(opc.alto ?? 720);
const ESPERA = Number(opc.espera_ms ?? 2000);
const INTERFAZ = opc.interfaz === '1';
const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

mkdirSync(salida, { recursive: true });
const archivoRegistro = join(salida, 'barrido.json');
const registro = existsSync(archivoRegistro) ? JSON.parse(readFileSync(archivoRegistro, 'utf8')) : [];
const guardar = () => writeFileSync(archivoRegistro, JSON.stringify(registro));

const perfil = mkdtempSync(join(salida, '.perfil-'));
const puerto = 9300 + Math.floor(Math.random() * 400);
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${ANCHO},${ALTO}`,
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let ws = null;
let cerrado = false;
const cerrar = () => {
    try { ws?.close(); } catch { }
    // Solo el navegador que lanzó este script (su árbol de procesos), nunca otros Edge abiertos.
    try { execSync(`taskkill /PID ${edge.pid} /T /F`, { stdio: 'ignore' }); } catch { }
    for (let i = 0; i < 8; i++) {
        try { rmSync(perfil, { recursive: true, force: true }); break; } catch { execSync('powershell -NoProfile -Command "Start-Sleep -Milliseconds 800"'); }
    }
};

let codigo = 0;
try {
    let info = null;
    for (let i = 0; i < 80 && !info; i++) {
        try {
            const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
            info = lista.find((t) => t.type === 'page') ?? null;
        } catch { }
        if (!info) await espera(300);
    }
    if (!info) throw new Error('el navegador no abrió el puerto de depuración');
    ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((ok, mal) => { ws.addEventListener('open', ok); ws.addEventListener('error', mal); });
    let id = 0;
    const pendientes = new Map();
    ws.addEventListener('close', () => {
        cerrado = true;
        for (const [, p] of pendientes) p.mal(new Error('el navegador se cerró'));
        pendientes.clear();
    });
    ws.addEventListener('message', (m) => {
        const dato = JSON.parse(m.data);
        if (dato.id && pendientes.has(dato.id)) { pendientes.get(dato.id).ok(dato); pendientes.delete(dato.id); }
        if (dato.method === 'Runtime.exceptionThrown') console.log('excepción en la página:', JSON.stringify(dato.params.exceptionDetails).slice(0, 300));
    });
    const cdp = (method, params = {}) => new Promise((ok, mal) => {
        if (cerrado) { mal(new Error('el navegador se cerró')); return; }
        const i = ++id;
        const reloj = setTimeout(() => { pendientes.delete(i); mal(new Error('sin respuesta a ' + method)); }, 90000);
        pendientes.set(i, { ok: (v) => { clearTimeout(reloj); ok(v); }, mal: (e) => { clearTimeout(reloj); mal(e); } });
        ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cdp('Page.navigate', { url });
    let listo = false;
    for (let i = 0; i < 180 && !listo; i++) { await espera(1000); listo = await ev('!!window.senderoTour'); }
    if (!listo) throw new Error('la app no terminó de cargar el recorrido');
    await ev("(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/Explorar el sendero/i.test(x.textContent)); if(b) b.click(); return !!b})()");
    await espera(1500);
    await ev("(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/Saltar tutorial/i.test(x.textContent)&&x.offsetParent!==null); if(b) b.click(); return !!b})()");
    if (!INTERFAZ) {
        await ev("(()=>{const s=document.createElement('style');s.textContent='#shell,#bottom-sheet,#hint,#tecnica,.sendero-vivo-poi-marker,.conexion-sendero,.parada-fuera,.sv-joystick,#onboarding-guide,#trail-lobby{display:none!important}';document.head.appendChild(s);return true})()");
    }
    let fin = await ev('window.senderoTour.trailPath.totalLength()');
    if (MODO === 'tramo') {
        fin = await ev("(()=>{const t=window.senderoTour;t.cuts=[];t._inicio=0;t._fin=t.trailPath.totalLength();t.stops=[0,t._fin];try{window.senderoMarkers.destroy()}catch(e){};return t._fin})()");
    }
    // El cartel de carga se quita cuando la escena ya está presentable.
    for (let i = 0; i < 240; i++) {
        if (await ev("(()=>{const o=document.getElementById('overlay');return !o||o.hidden})()")) break;
        await espera(1000);
    }
    await espera(4000);
    const cuadros = await ev('new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;performance.now()-t0<2000?requestAnimationFrame(f):r(n)};requestAnimationFrame(f)})');
    console.log(`app lista | modo ${MODO} | largo ${fin.toFixed(2)} | cuadros en 2 s: ${cuadros} | ya capturados: ${registro.length}`);

    const quieto = async (maxSeg = 90) => {
        for (let i = 0; i < maxSeg * 5; i++) { await espera(200); if (await ev('window.senderoTour._meta === null')) return true; }
        return false;
    };
    // La escena llega por niveles de detalle: una captura vale cuando dos seguidas pesan casi lo mismo, es decir,
    // cuando ya no están entrando trozos más finos. Si no se asienta en 20 s se guarda la última.
    const fotoAsentada = async () => {
        let previa = null;
        for (let i = 0; i < 16; i++) {
            const foto = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
            const peso = foto.result.data.length;
            if (previa !== null && Math.abs(peso - previa) / previa < 0.015) return foto;
            previa = peso;
            await espera(1200);
        }
        return cdp('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    };
    const capturar = async (pedida) => {
        await espera(ESPERA);
        const e = JSON.parse(await ev("(()=>{const t=window.senderoTour;return JSON.stringify({d:+t.distance.toFixed(2),yaw:+t.state.yaw.toFixed(1),pitch:+t.state.pitch.toFixed(1),rel:+((((t.state.yaw-t._rumboCamino(t.distance))%360+540)%360)-180).toFixed(1)})})()"));
        const foto = await fotoAsentada();
        const archivo = 'd' + e.d.toFixed(1).padStart(6, '0') + '.jpg';
        writeFileSync(join(salida, archivo), Buffer.from(foto.result.data, 'base64'));
        registro.push({ ...e, pedida, archivo });
        guardar();
    };

    if (MODO === 'tramo') {
        const desde = Number(opc.desde ?? 0);
        const hasta = opc.hasta === undefined || opc.hasta === 'fin' ? fin : Math.min(fin, Number(opc.hasta));
        const puntos = [];
        for (let d = desde; d < hasta - 1e-6; d += PASO) puntos.push(+d.toFixed(3));
        puntos.push(+hasta.toFixed(3));
        const hechos = new Set(registro.map((r) => r.pedida));
        const faltan = puntos.filter((d) => !hechos.has(d));
        let primera = true;
        for (const d of faltan) {
            if (primera && d > 0.01) {
                // Para seguir a medias (o empezar más adelante): se coloca un paso antes, mirando por el camino.
                const antes = Math.max(0, d - Math.max(PASO, 2));
                await ev(`(()=>{const t=window.senderoTour;t._meta=null;t._vel=0;t.state.distance=${antes};t.state.yaw=t._rumboCamino(${antes});t.state.pitch=0;t.lateral=0;t._teletransporte=true;return true})()`);
                await espera(2500);
            }
            primera = false;
            if (d > 0.01) {
                await ev(`window.senderoTour.goTo(${d})`);
                if (!(await quieto())) throw new Error('no llegó a ' + d);
            }
            await capturar(d);
            if (registro.length % 10 === 0) console.log(`  ${registro.length} capturas, voy en ${d}`);
        }
    } else {
        // De parada en parada, como el visitante. Para seguir a medias se llega caminando hasta la última capturada.
        const ultima = registro.length ? registro[registro.length - 1].d : -1;
        if (ultima < 0) await capturar(await ev('window.senderoTour.distance'));
        for (let n = 0; n < 400; n++) {
            if (!(await ev('window.senderoTour.step(1)'))) break;
            if (!(await quieto())) throw new Error('no llegó a la parada siguiente');
            const d = await ev('window.senderoTour.distance');
            if (d > ultima + 0.01) await capturar(d);
        }
    }
    console.log(`listo: ${registro.length} capturas en ${salida}`);
} catch (e) {
    console.log('se cortó:', e.message ?? e);
    codigo = 3;
} finally {
    guardar();
    cerrar();
}
process.exit(codigo);
