// Saca de la propia escena de la app las seis caras de un cubo (fov 90, 1:1) desde un punto del
// recorrido, para unirlas en una panorámica 360 con equirectangular_desde_caras.py. La panorámica
// va como skybox-image del visor 3D de la ficha: el ave queda dentro del mismo bosque que se
// recorre y el fondo gira con ella.
//
// Uso:
//   node scripts/escenas/panoramica_desde_app.mjs BASE_URL RENDER DISTANCIA CARPETA [LADO]
//   python scripts/escenas/equirectangular_desde_caras.py CARPETA assets/fondos/entorno-ave-<zona>
//
//   BASE_URL   la app servida (por ejemplo http://127.0.0.1:3344)
//   RENDER     la escena: sendero-propia, sendero-t1-propia o sendero-t2-propia
//   DISTANCIA  metros del trazado donde se pone la cámara (sin tocar TourEngine: restoreState)
//   CARPETA    donde guardar las seis caras (cara-adelante.png, ...)
//   LADO       lado de cada cara en pixeles (1536)
//
// Los puntos elegidos: Cumbre 6,5 m (en el bosque, no en el mirador), Tramo 1 a 30 m y Tramo 2 a
// 64 m (las escaleras nitidas).
//
// Corre Edge sin ventana y silenciado, por el protocolo de depuracion. La camara se pone a mano,
// por encima de los topes de la mirada: se frena el motor del recorrido (stop) y se le dan
// posicion y giro directos. Cada cara se captura cuando la carga por niveles asienta (dos fotos
// seguidas iguales).
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, render, distancia, carpeta, ladoTexto = '1536'] = process.argv.slice(2);
if (!base || !render || !distancia || !carpeta) {
    console.error('Uso: node panoramica_desde_app.mjs BASE_URL RENDER DISTANCIA CARPETA [LADO]');
    process.exit(1);
}
const LADO = Number(ladoTexto);
const EDGE = process.env.EDGE_WIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// Giro de la camara de PlayCanvas (cabeceo, guinada) para cada cara.
const CARAS = [
    ['adelante', 0, 0],
    ['derecha', 0, -90],
    ['atras', 0, 180],
    ['izquierda', 0, 90],
    ['arriba', 90, 0],
    ['abajo', -90, 0]
];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(carpeta, { recursive: true });

const perfil = mkdtempSync(join(tmpdir(), 'panoramica-'));
const puerto = 9300 + Math.floor(Math.random() * 600);
const edge = spawn(EDGE, ['--headless=new', '--mute-audio', '--no-first-run', '--disable-extensions', '--hide-scrollbars',
    `--user-data-dir=${perfil}`, `--remote-debugging-port=${puerto}`, `--window-size=${LADO},${LADO}`, 'about:blank'], { stdio: 'ignore' });

let codigo = 1;
try {
    let pagina = null;
    for (let i = 0; i < 80 && !pagina; i++) {
        try { pagina = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* Edge arrancando */ }
        if (!pagina) await pausa(250);
    }
    if (!pagina) throw new Error('Edge no abrio el puerto de depuracion');
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((ok) => { ws.onopen = ok; });
    let n = 0;
    const pend = new Map();
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.mal(new Error(m.error.message)) : p.ok(m.result); }
    };
    const enviar = (method, params = {}) => new Promise((ok, mal) => { const id = ++n; pend.set(id, { ok, mal }); ws.send(JSON.stringify({ id, method, params })); });
    const evaluar = async (expresion) => {
        const r = await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
        return r.result.value;
    };

    await enviar('Page.enable');
    await enviar('Emulation.setDeviceMetricsOverride', { width: LADO, height: LADO, deviceScaleFactor: 1, mobile: false });
    await enviar('Page.navigate', { url: `${base}/?render=${render}&debug` });
    await evaluar(`(async () => { for (let i = 0; i < 400 && !(window.senderoTour && window.senderoApp); i++) await new Promise(r => setTimeout(r, 500)); if (!window.senderoTour) throw new Error('no hay window.senderoTour'); })()`);
    await pausa(2000);

    // Punto del recorrido, motor frenado, cámara a 90 grados de campo y sin nada encima.
    const punto = await evaluar(`(async () => {
        const t = window.senderoTour;
        t.start();
        t.restoreState({ distance: ${Number(distancia)}, yaw: t.trailPath.headingAt(${Number(distancia)}), pitch: 0, lateral: 0 });
        for (let i = 0; i < 120; i++) t._update(1 / 60);
        t.stop();
        // Las flechas del camino se dibujan dentro de la escena: no deben salir en la panoramica.
        if (window.senderoMarkers && typeof window.senderoMarkers.destroy === 'function') window.senderoMarkers.destroy();
        const cam = t.camera.camera;
        cam.fov = 90;
        const p = t.camera.getPosition();
        const estilo = document.createElement('style');
        estilo.textContent = 'body *:not(canvas) { visibility: hidden !important; } canvas { visibility: visible !important; }';
        document.head.appendChild(estilo);
        return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), d: t.state.distance };
    })()`);
    console.log('punto', JSON.stringify(punto));

    for (const [nombre, cabeceo, guinada] of CARAS) {
        await evaluar(`(() => { const t = window.senderoTour; t.camera.setEulerAngles(${cabeceo}, ${guinada}, 0); window.senderoApp.renderNextFrame = true; })()`);
        let ultima = '';
        let datos = null;
        for (let intento = 0; intento < 30; intento++) {
            await pausa(2000);
            await evaluar('window.senderoApp.renderNextFrame = true');
            const foto = await enviar('Page.captureScreenshot', { format: 'png' });
            const huella = createHash('sha1').update(foto.data).digest('hex');
            datos = foto.data;
            if (huella === ultima) break;
            ultima = huella;
        }
        writeFileSync(join(carpeta, `cara-${nombre}.png`), Buffer.from(datos, 'base64'));
        console.log('cara', nombre);
    }
    ws.close();
    codigo = 0;
} catch (error) {
    console.error(error.message);
} finally {
    edge.kill();
    await pausa(800);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* Edge aun lo suelta */ }
}
process.exit(codigo);
