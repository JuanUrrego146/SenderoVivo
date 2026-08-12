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
    Asset,
    AssetListLoader,
    Color,
    Entity,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO
} from 'playcanvas';

const CAMERA_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/playcanvas@2.21.3/scripts/esm/camera-controls.mjs';
const SCENES_CONFIG_URL = 'config/scenes.json';
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
    return { url: scenes[0].sogUrl, isOverride: false };
}

async function localFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function startViewer(sceneUrl) {
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
    camera.addComponent('script');
    camera.script.create('cameraControls');
    app.root.addChild(camera);

    const splat = new Entity('scene');
    // Los PLY/SOG de entrenamiento traen el eje Y hacia abajo; la documentación aplica este mismo giro.
    splat.setEulerAngles(0, 0, 180);
    splat.addComponent('gsplat', { asset: sceneAsset });
    app.root.addChild(splat);

    overlay.hidden = true;
    hint.hidden = false;
}

async function main() {
    try {
        const { url, isOverride } = await resolveSceneUrl();
        if (!isRemoteUrl(url) && !(await localFileExists(url))) {
            if (isOverride) {
                showError(`No existe el archivo <code>${url}</code> en el servidor.`);
            } else {
                showPlaceholder(url);
            }
            return;
        }
        showLoading(url);
        await startViewer(url);
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

main();
