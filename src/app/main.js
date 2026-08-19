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

function showLoading() {
    showOverlay(`
        <div class="spinner"></div>
        <h1>Preparando el recorrido…</h1>
        <p id="carga-detalle">Descargando la escena</p>
        <div class="barra"><div class="barra-fill" id="carga-barra"></div></div>
        <p class="nota">La escena pesa 56 MB. La primera visita tarda; después queda en caché.</p>
    `);
}

/** Actualiza la barra de progreso de la descarga. */
function setLoadingProgress(porcentaje, texto) {
    const barra = document.getElementById('carga-barra');
    const detalle = document.getElementById('carga-detalle');
    if (barra) barra.style.width = Math.max(2, Math.min(100, porcentaje)) + '%';
    if (detalle && texto) detalle.textContent = texto;
}

/**
 * Espera a que el splat esté realmente presentable.
 * Al cargar, el motor ordena millones de gaussianas por profundidad durante los
 * primeros cuadros: si se muestra antes, se ve borroso. Se esperan varios cuadros
 * renderizados y recién ahí se revela la escena.
 */
function waitForStableRender(app, { frames = 200, minMs = 2800 } = {}) {
    return new Promise((resolve) => {
        const inicio = Date.now();
        let contados = 0;
        const listo = () => {
            app.off('frameend', contar);
            resolve();
        };
        const contar = () => {
            contados++;
            const porCuadros = contados / frames;
            const porTiempo = (Date.now() - inicio) / minMs;
            setLoadingProgress(90 + 10 * Math.min(porCuadros, porTiempo), 'Afinando la escena');
            // Hacen falta las dos condiciones: suficientes cuadros Y suficiente tiempo.
            // El ordenamiento por profundidad de millones de gaussianas corre en segundo
            // plano; revelar antes muestra la escena emborronada.
            if (contados >= frames && Date.now() - inicio >= minMs) listo();
        };
        app.on('frameend', contar);
        setTimeout(listo, 12000);   // salvavidas
    });
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

/** Marca el botón activo del conmutador de técnica y engancha los clics. */
function setUpTechSwitch(active) {
    const bar = document.getElementById('tecnica');
    if (!bar) return;
    bar.hidden = false;
    for (const btn of bar.querySelectorAll('button')) {
        btn.classList.toggle('activa', btn.dataset.render === active);
        btn.addEventListener('click', () => {
            if (btn.dataset.render === active) return;
            const params = new URLSearchParams(window.location.search);
            if (btn.dataset.render === 'colmap') params.delete('render');
            else params.set('render', btn.dataset.render);
            params.delete('sog');
            window.location.search = params.toString();
        });
    }
}

async function resolveSceneUrl() {
    const params = new URLSearchParams(window.location.search);
    // ?render=luma conmuta a la técnica alterna registrada en config/scenes.json.
    // Ambas técnicas comparten coordenadas y trazado: solo cambia la reconstrucción.
    const render = params.get('render');
    if (render) {
        const response = await fetch(SCENES_CONFIG_URL);
        if (response.ok) {
            const config = await response.json();
            const match = (config.scenes || []).find(s => s.render === render);
            if (match && match.sogUrl) {
                return {
                    url: match.sogUrl, isOverride: false, renderTech: render,
                    sceneUp: match.sceneUp, forwardOnly: !!match.forwardOnly,
                    eyeHeight: match.eyeHeight, trackUrl: match.trackUrl,
                    pitchDownLimit: match.pitchDownLimit, baked: !!match.baked
                };
            }
        }
    }
    const override = params.get('sog');
    if (override) {
        // Si la URL pedida coincide con una escena registrada, se usan su
        // nivelación y sus restricciones; si no, se carga tal cual (muestras remotas).
        try {
            const response = await fetch(SCENES_CONFIG_URL);
            if (response.ok) {
                const config = await response.json();
                const match = (config.scenes || []).find(s => s.sogUrl === override);
                if (match) {
                    return {
                        url: override, isOverride: true,
                        sceneUp: match.sceneUp, forwardOnly: !!match.forwardOnly,
                        eyeHeight: match.eyeHeight, trackUrl: match.trackUrl,
                        pitchDownLimit: match.pitchDownLimit, baked: !!match.baked
                    };
                }
            }
        } catch { /* sin config no hay metadatos, pero la escena igual se abre */ }
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
    // En celular la técnica por defecto es la LIVIANA: la COLMAP de ~4 M de
    // gaussianas revienta el presupuesto móvil de render (~1 M según PlayCanvas).
    // El switch sigue permitiendo forzar la otra.
    if (window.matchMedia('(max-width: 640px)').matches) {
        const liviana = scenes.find(s => s.render === 'luma' && s.sogUrl);
        if (liviana) {
            return {
                url: liviana.sogUrl, isOverride: false, renderTech: 'luma',
                sceneUp: liviana.sceneUp, forwardOnly: !!liviana.forwardOnly,
                eyeHeight: liviana.eyeHeight, trackUrl: liviana.trackUrl,
                pitchDownLimit: liviana.pitchDownLimit, baked: !!liviana.baked
            };
        }
    }
    return { url: scenes[0].sogUrl, isOverride: false, renderTech: 'colmap', sceneUp: scenes[0].sceneUp, forwardOnly: !!scenes[0].forwardOnly };
}

async function localFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

async function startViewer(sceneUrl, sceneUp, sceneOpts = {}) {
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
    // En celular el render por defecto sale borroso (1 píxel de canvas por punto
    // CSS con densidades de 3x). Se sube la nitidez a 2x, que la escena liviana
    // aguanta; en escritorio se respeta el ajuste actual, que ya se ve bien.
    if (window.matchMedia('(max-width: 640px)').matches) {
        app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        app.resizeCanvas();   // sin esto el ratio nuevo solo aplicaria tras girar el telefono
    }
    app.start();
    // Expuesta para inspeccion y capturas desde la consola del navegador.
    window.senderoApp = app;
    window.addEventListener('resize', () => app.resizeCanvas());

    const assets = [
        new Asset('camera-controls', 'script', { url: CAMERA_CONTROLS_URL }),
        new Asset('scene', 'gsplat', { url: sceneUrl })
    ];
    // Progreso real de la descarga del splat.
    assets[1].on('progress', (recibido, total) => {
        if (total > 0) {
            const mb = (recibido / 1048576).toFixed(0);
            const totalMb = (total / 1048576).toFixed(0);
            setLoadingProgress((recibido / total) * 85, `Descargando la escena · ${mb} de ${totalMb} MB`);
        }
    });

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
    // El oyente del audio espacial es la cámara activa. Con este componente, cualquier
    // fuente posicional que cree src/audio/ se espacializa sola conforme TourEngine
    // mueve y gira la cámara: el módulo de audio no necesita tocarla (invariante 12).
    camera.addComponent('audiolistener');
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
    } else if (!sceneOpts.baked) {
        splat.setEulerAngles(0, 0, 180);   // convención del ejemplo oficial, sin nivelar
    }
    // Si la escena viene "baked" (nivelación y registro horneados en el archivo,
    // como scene-01-luma), la entidad queda en identidad: el archivo YA está en
    // las coordenadas del mundo y cualquier rotación extra la rompería.
    splat.addComponent('gsplat', { asset: sceneAsset });
    // El recorte por volumen descarta trozos de la escena cuando la cámara va
    // por dentro: se le da un volumen amplio para que no desaparezca nada.
    splat.gsplat.customAabb = new BoundingBox(new Vec3(0, 0, 0), new Vec3(60, 60, 60));
    app.root.addChild(splat);

    // La escena solo se revela cuando ya se ve bien: nada de mostrarla borrosa.
    await waitForStableRender(app);
    await setUpNavigation(app, camera, sceneOpts);
    setLoadingProgress(100, 'Listo');
    overlay.classList.add('desvanecer');
    setTimeout(() => { overlay.hidden = true; overlay.classList.remove('desvanecer'); }, 420);
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

async function loadTrail(trackUrl = TRACK_CONFIG_URL) {
    try {
        const response = await fetch(trackUrl);
        if (!response.ok) return new TrailPath([]);
        const cfg = await response.json();
        const path = new TrailPath(cfg.sceneWaypoints || [], cfg.corridorRadius ?? 1.5);
        path.eyeHeight = cfg.eyeHeight ?? 0;
        return path;
    } catch {
        return new TrailPath([]);
    }
}

async function setUpNavigation(app, camera, sceneOpts = {}) {
    // Metadatos de la escena activa (config/scenes.json): restricciones y trazado propio.
    const { forwardOnly = false, eyeHeight: sceneEyeHeight, trackUrl: sceneTrackUrl, pitchDownLimit } = sceneOpts;
    const isEditor = new URLSearchParams(window.location.search).has('editor');
    const trail = await loadTrail(sceneTrackUrl ?? TRACK_CONFIG_URL);

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
        // La escena activa puede traer su propia altura de ojos (config/scenes.json):
        // el trazado se marcó en el marco de otra reconstrucción.
        eyeHeight: sceneEyeHeight ?? trail.eyeHeight,
        // Algunas reconstrucciones solo aguantan vistas hacia adelante (config/scenes.json).
        forwardOnly,
        // Tope del picado hacia abajo: evita meter la camara donde el splat se ve mal.
        pitchDownLimit
    });
    tour.start();
    window.senderoTour = tour;
    // Flechas dentro de la escena, sobre el camino: se tocan para avanzar.
    window.senderoMarkers = new TrailMarkers(app, camera, tour, { stepDistance: 3.2, groundOffset: -0.6 });

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
        const scene = await resolveSceneUrl();
        const { url, isOverride, sceneUp } = scene;
        if (!isRemoteUrl(url) && !(await localFileExists(url))) {
            if (isOverride) {
                showError(`No existe el archivo <code>${url}</code> en el servidor.`);
            } else {
                showPlaceholder(url);
            }
            return;
        }
        showLoading();
        if (scene.renderTech) setUpTechSwitch(scene.renderTech);
        await startViewer(url, sceneUp, scene);
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

main();
