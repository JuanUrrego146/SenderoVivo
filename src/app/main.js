/*
 * Punto de entrada del visor — Sendero Vivo.
 *
 * Orquesta y nada más: resuelve qué escena cargar, levanta la aplicación,
 * delega la carga en SceneLoader, el recorrido en TourEngine y la interfaz
 * en src/ui/. La regla de reparto vive en docs/03-arquitectura.md.
 *
 * Basado en "Your First Splat App" (Engine API) de la documentación oficial:
 * https://developer.playcanvas.com/user-manual/gaussian-splatting/building/your-first-app/engine/
 */
import {
    Application,
    Entity,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Vec2,
    Vec3
} from 'playcanvas';
import { SceneLoader } from '../engine/SceneLoader.js';
import { TrailPath } from '../engine/TrailPath.js';
import { TourEngine } from '../engine/TourEngine.js';
import { TrailRecorder } from '../engine/TrailRecorder.js';
import { TrailMarkers } from '../engine/TrailMarkers.js';
import { colorFromToken, cssFromToken } from '../ui/tokens.js';
import AmbienceController from '../audio/AmbienceController.js';
import {
    showLoading, setLoadingProgress, showPlaceholder, showError, showHint, hideOverlay
} from '../ui/overlay.js';

const CAMERA_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/playcanvas@2.21.3/scripts/esm/camera-controls.mjs';
const SCENES_CONFIG_URL = 'config/scenes.json';
const TRACK_CONFIG_URL = 'config/track.json';
// Escena de muestra de la documentación oficial, para probar el visor sin captura propia.
const SAMPLE_SOG_URL = 'https://developer.playcanvas.com/assets/toy-cat.sog';

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

function createApp() {
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
    // Expuesta para inspección y capturas desde la consola del navegador.
    window.senderoApp = app;
    return app;
}

function createCamera(app) {
    const camera = new Entity('camera');
    camera.setPosition(0, 0, 2.5);
    camera.addComponent('camera', {
        clearColor: colorFromToken('--sv-black-900')
    });
    // El oyente del audio espacial es la cámara activa. Con este componente,
    // cualquier fuente posicional que cree src/audio/ se espacializa sola conforme
    // TourEngine mueve y gira la cámara: el módulo de audio no la toca (invariante 12).
    camera.addComponent('audiolistener');
    app.root.addChild(camera);
    return camera;
}

async function startViewer(sceneUrl, sceneUp) {
    const app = createApp();
    const camera = createCamera(app);
    const loader = new SceneLoader(app);

    // Ambience controller: load config but do NOT autoplay sound (RNF-008)
    const ambience = new AmbienceController(app, 'config/soundscape.json');

    // Load soundscape config so the UI can reflect provisional status and the route.
    let soundscapeCfg = {};
    try {
        const resp = await fetch('config/soundscape.json');
        if (resp.ok) soundscapeCfg = await resp.json();
    } catch (e) {
        console.warn('Failed to fetch soundscape config for UI:', e);
    }

    // Create the UI toggle button always visible. UI will show "En silencio" when no audio configured.
    createAudioToggleButton(ambience, soundscapeCfg);

    ambience.load().catch((err) => {
        // Loading failed: log only. The button remains visible and will show "En silencio" when appropriate.
        console.warn('Ambience load failed:', err);
    });

    await loader.load({
        url: sceneUrl,
        sceneUp,
        controlsUrl: CAMERA_CONTROLS_URL,
        onProgress: (recibido, total) => {
            if (total > 0) {
                const mb = (recibido / 1048576).toFixed(0);
                const totalMb = (total / 1048576).toFixed(0);
                setLoadingProgress((recibido / total) * 85, `Descargando la escena · ${mb} de ${totalMb} MB`);
            }
        }
    });

    // La escena solo se revela cuando ya se ve bien: nada de mostrarla borrosa.
    await loader.waitForStableRender({
        onProgress: (avance) => setLoadingProgress(90 + 10 * avance, 'Afinando la escena')
    });
    await setUpNavigation(app, camera);
    setLoadingProgress(100, 'Listo');
    hideOverlay();
}

function createAudioToggleButton(ambienceController, soundscapeCfg = {}) {
    const id = 'audio-toggle-btn';
    let btn = document.getElementById(id);
    if (btn) return btn;

    btn = document.createElement('button');
    btn.id = id;
    btn.setAttribute('aria-label', 'Control de ambiente');
    btn.style.position = 'fixed';
    btn.style.right = '16px';
    btn.style.bottom = '16px';
    btn.style.zIndex = '10000';
    btn.style.padding = '10px 14px';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    // Colors must come from tokens (no literals in JS)
    btn.style.background = cssFromToken('--sv-scrim-550',);
    btn.style.color = cssFromToken('--sv-gray-050',);
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = 'none';
    btn.style.display = 'block';

    let visibleInterval = null;

    // provisional badge when audio is placeholder
    const noteText = soundscapeCfg?.ambienceNote || '';
    const hasAmbienceUrl = Boolean(soundscapeCfg?.ambienceUrl);

    const badge = document.createElement('div');
    badge.id = 'audio-provisional-badge';
    badge.style.display = 'inline-block';
    badge.style.marginLeft = '10px';
    badge.style.padding = '6px 8px';
    badge.style.borderRadius = '6px';
    badge.style.fontSize = '12px';
    badge.style.verticalAlign = 'middle';
    badge.style.background = cssFromToken('--sv-badge-green', 'rgba(31,93,58,0.9)');
    badge.style.color = cssFromToken('--sv-gray-050', '#EDF1EF');
    badge.style.display = 'none';

    const update = () => {
        if (!ambienceController) return;

        // If there is no ambience URL configured, show En silencio and the provisional badge
        if (!hasAmbienceUrl) {
            btn.textContent = 'En silencio (prototipo)';
            badge.textContent = noteText || 'Audio provisional';
            badge.style.display = 'inline-block';
            return;
        }

        // If URL exists but controller not yet loaded, show loading state
        if (!ambienceController.loaded) {
            btn.textContent = 'Cargando audio…';
            badge.style.display = 'none';
            return;
        }

        // When loaded, reflect play state
        const playing = typeof ambienceController.isPlaying === 'function' ? ambienceController.isPlaying() : false;
        btn.textContent = (playing ? 'Silenciar' : 'Iniciar con sonido') + ' (prototipo)';
        badge.style.display = 'none';
    };

    btn.addEventListener('click', (e) => {
        // This click is the required user gesture for unlocking audio per RNF-008
        // If no audio configured, do nothing but keep the control usable for feedback.
        if (!hasAmbienceUrl) return;
        if (!ambienceController.loaded) return;
        ambienceController.toggle();
        // Small timeout to wait for play() effect
        setTimeout(update, 100);
    });

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.right = '16px';
    wrapper.style.bottom = '16px';
    wrapper.style.zIndex = '10000';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.appendChild(btn);
    wrapper.appendChild(badge);

    document.body.appendChild(wrapper);

    // Poll to update state (sound API doesn't emit DOM events here)
    visibleInterval = setInterval(update, 500);

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        if (visibleInterval) clearInterval(visibleInterval);
    });

    return btn;
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
    window.senderoMarkers = new TrailMarkers(app, camera, tour, {
        stepDistance: 3.2,
        groundOffset: -0.6,
        color: cssFromToken('--sv-green-300', '#6FCF97')
    });

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
                showPlaceholder(url, SAMPLE_SOG_URL);
            }
            return;
        }
        showLoading();
        await startViewer(url, sceneUp);
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

main();
