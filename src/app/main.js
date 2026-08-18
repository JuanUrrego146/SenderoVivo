/*
 * Visor prototipo de escenas SOG — Sendero Vivo.
 *
 * Sigue "Your First Splat App" (Engine API) de la documentación oficial:
 * https://developer.playcanvas.com/user-manual/gaussian-splatting/building/your-first-app/engine/
 *
 * Alcance: cargar una escena SOG y poder inspeccionarla con cámara orbital.
 * TourEngine, POIs, audio y HUD llegan en el Sprint 3 sobre esta misma base.
 */
import {
    Application,
    BoundingBox,
    Asset,
    AssetListLoader,
    Color,
    Entity,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Quat,
    Vec2,
    Vec3
} from 'playcanvas';
import { TrailPath } from '../engine/TrailPath.js';
import { TourEngine } from '../engine/TourEngine.js';
import { TrailRecorder } from '../engine/TrailRecorder.js';
import { TrailMarkers } from '../engine/TrailMarkers.js';

const CAMERA_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/playcanvas@2.21.3/scripts/esm/camera-controls.mjs';
const SCENES_CONFIG_URL = 'config/scenes.json';
const TRACK_CONFIG_URL = 'config/track.json';
// Escena de muestra de la documentación oficial de PlayCanvas, para probar el visor sin captura propia.
const SAMPLE_SOG_URL = 'https://developer.playcanvas.com/assets/toy-cat.sog';

const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlay-content');
const hint = document.getElementById('hint');

function showOverlay(html) {
    overlay.hidden = false;
    overlayContent.innerHTML = html;
}

function showLoading(sceneUrl) {
    showOverlay(`
        <div class="spinner"></div>
        <h1>Cargando escena…</h1>
        <p><code>${sceneUrl}</code></p>
        <p>La primera carga puede tardar unos segundos.</p>
    `);
}

function showPlaceholder(expectedUrl) {
    showOverlay(`
        <h1>Aún no hay ninguna escena capturada</h1>
        <p>Copia tu archivo SOG como <code>${expectedUrl}</code> y recarga esta página.</p>
        <p>El archivo sale del pipeline de captura:
           <code>splat-transform escena.ply scene-01.sog</code></p>
        <p>¿Quieres probar el visor mientras tanto?
           <a href="?sog=${SAMPLE_SOG_URL}">Abrir la escena de muestra de PlayCanvas</a>
           (requiere internet).</p>
    `);
}

/** Ayuda en pantalla, abajo a la izquierda. */
function showHint(html) {
    hint.innerHTML = html;
    hint.hidden = false;
}

function showError(message) {
    showOverlay(`
        <h1>⚠ No se pudo cargar la escena</h1>
        <p>${message}</p>
        <p><button id="retry">Reintentar</button></p>
    `);
    document.getElementById('retry').addEventListener('click', () => window.location.reload());
}

function colorFromToken(tokenName) {
    // Invariante del proyecto: ningún color literal en JS; se leen los tokens CSS.
    const hex = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
    const value = parseInt(hex.slice(1), 16);
    return new Color(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function isRemoteUrl(url) {
    return /^https?:\/\//i.test(url);
}

async function resolveSceneUrl() {
    const override = new URLSearchParams(window.location.search).get('sog');
    if (override) {
        return { url: override, isOverride: true };
    }
    const response = await fetch(SCENES_CONFIG_URL);
    if (!response.ok) {
        throw new Error(`No se pudo leer <code>${SCENES_CONFIG_URL}</code> (HTTP ${response.status}).`);
    }
    const config = await response.json();
    const scenes = Array.isArray(config.scenes) ? [...config.scenes].sort((a, b) => a.order - b.order) : [];
    if (!scenes.length || !scenes[0].sogUrl) {
        throw new Error(`<code>${SCENES_CONFIG_URL}</code> no define ninguna escena con <code>sogUrl</code>.`);
    }
    return { url: scenes[0].sogUrl, isOverride: false, sceneUp: scenes[0].sceneUp };
}

async function localFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function startViewer(sceneUrl, sceneUp) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const app = new Application(canvas, {
        graphicsDeviceOptions: {
            // El cuello de botella del splatting es el fill rate; el antialiasing lo multiplica.
            antialias: false
        }
    });
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.start();
    // Expuesta para inspeccion y capturas desde la consola del navegador.
    window.senderoApp = app;
    window.addEventListener('resize', () => app.resizeCanvas());

    const assets = [
        new Asset('camera-controls', 'script', { url: CAMERA_CONTROLS_URL }),
        new Asset('scene', 'gsplat', { url: sceneUrl })
    ];
    const loader = new AssetListLoader(assets, app.assets);
    await new Promise(resolve => loader.load(resolve));

    const [controlsAsset, sceneAsset] = assets;
    if (!controlsAsset.loaded) {
        throw new Error('No se pudo descargar el control de cámara desde el CDN. Revisa la conexión a internet.');
    }
    if (!sceneAsset.loaded) {
        throw new Error(`El archivo <code>${sceneUrl}</code> existe pero no se pudo cargar. Revisa que sea un SOG válido.`);
    }

    const camera = new Entity('camera');
    camera.setPosition(0, 0, 2.5);
    camera.addComponent('camera', {
        clearColor: colorFromToken('--sv-black-900')
    });
    app.root.addChild(camera);

    const splat = new Entity('scene');
    // Nivelación: la reconstrucción sale en orientación arbitraria porque COLMAP no
    // sabe dónde está el suelo. sceneUp (config/scenes.json) es el "arriba" real medido
    // en las poses de cámara; con él se calcula la rotación que deja el horizonte
    // horizontal. Sin esto la escena se ve torcida.
    if (sceneUp) {
        const up = new Vec3(sceneUp.x, sceneUp.y, sceneUp.z).normalize();
        const levelling = new Quat().setFromDirections(up, Vec3.UP);
        splat.setRotation(levelling);
    } else {
        splat.setEulerAngles(0, 0, 180);   // convención del ejemplo oficial, sin nivelar
    }
    splat.addComponent('gsplat', { asset: sceneAsset });
    // El recorte por volumen descarta trozos de la escena cuando la cámara va
    // por dentro: se le da un volumen amplio para que no desaparezca nada.
    splat.gsplat.customAabb = new BoundingBox(new Vec3(0, 0, 0), new Vec3(60, 60, 60));
    app.root.addChild(splat);

    overlay.hidden = true;
    await setUpNavigation(app, camera);
}

/** Vuelo libre: solo para marcar el trazado o mientras no exista uno. */
function enableFreeFlight(camera) {
    camera.addComponent('script');
    const controls = camera.script.create('cameraControls');
    if (controls) {
        controls.enableFly = true;
        controls.enableOrbit = true;
        controls.enablePan = true;
        controls.moveSpeed = 2;
        controls.moveFastSpeed = 6;
        controls.moveSlowSpeed = 0.5;
        controls.focusPoint = new Vec3(0, 0, 0);
        controls.pitchRange = new Vec2(-90, 90);
    }
    return controls;
}

async function loadTrail() {
    try {
        const response = await fetch(TRACK_CONFIG_URL);
        if (!response.ok) return new TrailPath([]);
        const cfg = await response.json();
        const path = new TrailPath(cfg.sceneWaypoints || [], cfg.corridorRadius ?? 1.5);
        path.eyeHeight = cfg.eyeHeight ?? 0;
        return path;
    } catch {
        return new TrailPath([]);
    }
}

async function setUpNavigation(app, camera) {
    const isEditor = new URLSearchParams(window.location.search).has('editor');
    const trail = await loadTrail();

    if (isEditor) {
        enableFreeFlight(camera);
        const pintar = (n) => showHint(
            '<strong>EDITOR DEL TRAZADO</strong> · ' + n + ' punto(s) marcados<br>' +
            '<strong>M</strong> marcar aquí · <strong>Z</strong> deshacer · <strong>X</strong> descargar track.json<br>' +
            'Vuela con <strong>W A S D</strong> por el camino y ve marcando, de principio a fin.'
        );
        window.senderoRecorder = new TrailRecorder(app, camera, points => pintar(points.length));
        pintar(0);
        return;
    }

    if (!trail.isUsable) {
        enableFreeFlight(camera);
        showHint(
            '<strong>Sin trazado definido:</strong> vuelo libre. ' +
            '<strong>W A S D</strong> moverse · <strong>Q E</strong> bajar y subir · arrastrar para mirar.<br>' +
            'Para marcar el camino del sendero abre ' +
            '<a href="?editor=1" style="color:var(--sv-green-300)">el editor del trazado</a>.'
        );
        return;
    }

    // Recorrido guiado: la cámara se mueve dentro del corredor del trazado (RF-004).
    // eyeHeight sube la cámara sobre el trazado: los puntos se marcan volando y
    // suelen quedar a ras de suelo. Se lee de config/track.json para ajustarlo
    // sin tocar código.
    const tour = new TourEngine(app, camera, trail, {
        speed: 1.2,
        eyeHeight: trail.eyeHeight
    });
    tour.start();
    window.senderoTour = tour;
    // Flechas dentro de la escena, sobre el camino: se tocan para avanzar.
    window.senderoMarkers = new TrailMarkers(app, camera, tour, { stepDistance: 3.2, groundOffset: -0.15 });

    showHint(
        'Toca las <strong>flechas del camino</strong> para avanzar · también <strong>W A S D</strong><br>' +
        '<strong>R</strong> subir la vista · <strong>F</strong> bajarla · arrastra para mirar en 360°<br>' +
        '<span id="hud-progress">0 % del recorrido</span> · ' +
        'altura <span id="hud-eye">' + (trail.eyeHeight ?? 0).toFixed(2) + '</span>'
    );

    app.on('tour:progress', ({ distance, total }) => {
        const hud = document.getElementById('hud-progress');
        if (hud && total > 0) hud.textContent = Math.round(100 * distance / total) + ' % del recorrido';
    });
    app.on('tour:eyeheight', (v) => {
        const hud = document.getElementById('hud-eye');
        if (hud) hud.textContent = v.toFixed(2);
    });
}

async function main() {
    try {
        const { url, isOverride, sceneUp } = await resolveSceneUrl();
        if (!isRemoteUrl(url) && !(await localFileExists(url))) {
            if (isOverride) {
                showError(`No existe el archivo <code>${url}</code> en el servidor.`);
            } else {
                showPlaceholder(url);
            }
            return;
        }
        showLoading(url);
        await startViewer(url, sceneUp);
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

main();
