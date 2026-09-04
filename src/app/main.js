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
import { TrailModel } from '../models/TrailModel.js';
import { TourEngine } from '../engine/TourEngine.js';
import { TrailRecorder } from '../engine/TrailRecorder.js';
import { TrailArrowsView } from '../views/TrailArrowsView.js';
import { PoiManager } from '../poi/PoiManager.js';
import { PoiCard } from '../poi/PoiCard.js';
import { ShellView } from '../views/ShellView.js';
import AmbienceController from '../audio/AmbienceController.js';

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
            // Siempre explicito: sin parametro la resolucion es automatica
            // (escritorio -> COLMAP, celular -> Luma liviana), asi que borrar
            // ?render en celular convertia el boton COLMAP en un no-op.
            params.set('render', btn.dataset.render);
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
                // En celular, si la escena declara una variante podada
                // (movilSogUrl), se usa: misma escena y mismo marco, menos
                // gaussianas — la completa revienta el presupuesto del telefono.
                // En escritorio, si declara lodUrl (SOG en streaming con niveles
                // de detalle), se prefiere: el motor carga por chunks segun lo
                // que la camara ve y baja el detalle solo con la distancia.
                const esMovil = window.matchMedia('(max-width: 640px)').matches;
                const urlElegida = esMovil
                    ? (match.movilSogUrl || match.sogUrl)
                    : (match.lodUrl || match.sogUrl);
                return {
                    url: urlElegida, stream: !esMovil && !!match.lodUrl,
                    isOverride: false, renderTech: render,
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
    // Escritorio: si la escena principal declara lodUrl (SOG en streaming), se
    // prefiere — carga por chunks lo que la camara ve, detalle pleno de cerca.
    return {
        url: scenes[0].lodUrl || scenes[0].sogUrl, stream: !!scenes[0].lodUrl,
        isOverride: false, renderTech: 'colmap', sceneUp: scenes[0].sceneUp, forwardOnly: !!scenes[0].forwardOnly
    };
}

async function localFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Carga un GLB anclado a coordenadas de MUNDO (modulo de Alejandra, portado).
 * Va colgado del ROOT, no del splat: no hereda la nivelacion de la escena,
 * asi el mismo punto fisico coincide en ambas tecnicas (contrato de
 * coordenadas del registro, docs/03 par. 8 y CONTEXTO-EQUIPO par. 8bis).
 */
async function loadWorldModel(app, { url, position = new Vec3(0, 0, 0), rotation = new Vec3(0, 0, 0), scale = 1 } = {}) {
    const modelAsset = new Asset('world-model', 'container', { url });
    app.assets.add(modelAsset);
    await new Promise((resolve, reject) => {
        modelAsset.ready(resolve);
        modelAsset.on('error', reject);
        app.assets.load(modelAsset);
    });
    if (!modelAsset.loaded || !modelAsset.resource) {
        throw new Error(`No se pudo cargar el modelo 3D: ${url}`);
    }
    const model = modelAsset.resource.instantiateRenderEntity();
    model.setPosition(position.x, position.y, position.z);
    model.setEulerAngles(rotation.x, rotation.y, rotation.z);
    model.setLocalScale(scale, scale, scale);
    app.root.addChild(model);
    return { entity: model, asset: modelAsset };
}

async function startViewer(sceneUrl, sceneUp, sceneOpts = {}) {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const app = new Application(canvas, {
        graphicsDeviceOptions: {
            // El cuello de botella del splatting es el fill rate; el antialiasing lo multiplica.
            antialias: false,
            // En portatiles con dos GPU, pedir la dedicada (sin esto algunos navegadores
            // eligen la integrada y el visor va a tirones sin razon aparente).
            powerPreference: 'high-performance'
        }
        
    });
    const shellView = new ShellView();
    window.senderoShellView = shellView;
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
    if (sceneOpts.stream) {
        // SOG en streaming (lod-meta.json): el render unificado trocea la escena
        // en chunks con niveles de detalle — solo se carga y ordena lo que la
        // camara ve, con detalle pleno de cerca y menos gaussianas a lo lejos
        // (subpixel: no se nota). El presupuesto global es la garantia de fps;
        // el motor reparte el detalle para no pasarse.
        // OJO: NO se pasa ningun flag "unified": el streaming se activa solo por
        // cargar un lod-meta.json (asi lo hace el ejemplo oficial del motor;
        // pasar unified:true lo manda por otra ruta y no renderiza nada).
        app.scene.gsplat.splatBudget = window.matchMedia('(max-width: 640px)').matches ? 1000000 : 3500000;
        app.scene.gsplat.radialSorting = true;
        splat.addComponent('gsplat', { asset: sceneAsset });
        // Distancias de transicion en unidades de mundo (1 u ≈ 2,1 m):
        // detalle pleno hasta ~17 m, y cada nivel siguiente al triple.
        splat.gsplat.lodBaseDistance = 8;
        splat.gsplat.lodMultiplier = 3;
    } else {
        splat.addComponent('gsplat', { asset: sceneAsset });
        // El recorte por volumen descarta trozos de la escena cuando la cámara va
        // por dentro: se le da un volumen amplio para que no desaparezca nada.
        splat.gsplat.customAabb = new BoundingBox(new Vec3(0, 0, 0), new Vec3(60, 60, 60));
    }
    app.root.addChild(splat);

    // La escena solo se revela cuando ya se ve bien: nada de mostrarla borrosa.
    await waitForStableRender(app);
    await setUpNavigation(app, camera, sceneOpts);
    // ===== Integracion de Alejandra (dev/alejandra-chambueta): =====
    // modelo 3D anclado al mundo + sistema de POIs con ficha (src/poi/).
    try {
        const worldModel = await loadWorldModel(app, {
            url: 'assets/models/golondrina-plomiza.glb',
            // Ubicacion PROVISIONAL (origen del mundo): la definitiva la
            // decide Alejandra; solo hay que cambiar estas coordenadas.
            position: new Vec3(0, 0, 0),
            rotation: new Vec3(0, 0, 0),
            scale: 1
        });
        window.senderoWorldModel = worldModel.entity;
        window.senderoWorldModelAsset = worldModel.asset;
    } catch (error) {
        console.warn('Modelo 3D no cargado:', error);
    }
    if (window.senderoTour) {
        const poiManager = new PoiManager(app, camera, window.senderoTour);
        const poiCard = new PoiCard(app);
        window.senderoPoiManager = poiManager;
        window.senderoPoiCard = poiCard;
        app.on('poi:request-close', () => poiManager.closePoi());
        try {
            await poiManager.load();
        } catch (error) {
            console.warn('No se pudieron cargar los POIs:', error);
        }
    }
    // Ambientacion sonora (AmbienceController de David). Se instancia y se deja
    // expuesta, pero NO suena: load() solo lee config/soundscape.json y no crea
    // ni AudioContext ni elemento de audio. El arranque nace siempre de un toque
    // del visitante, desde la pestana «Sonidos» del cascaron (src/ui/shell.js).
    // RNF-008 e invariante 6.
    const ambience = new AmbienceController(app);
    window.senderoAmbience = ambience;
    try {
        await ambience.load();
    } catch (error) {
        console.warn('No se pudo leer el contrato de ambientacion:', error);
    }
    if (sceneOpts.stream) {
        // El sorter del render unificado solo dispara su PRIMER ordenamiento
        // cuando la camara SE MUEVE despues de que el mundo streamed esta listo
        // (medido: quieta queda en negro para siempre, 1 mm no supera el epsilon,
        // 2 cm si, y un empujon temprano se pierde porque los chunks aun no
        // llegaron). Se patea al frame:ready del motor y ademas con reintentos
        // durante los primeros segundos: 2 cm ida y vuelta, imperceptible.
        const patear = () => {
            const p = camera.getPosition(), px = p.x, py = p.y, pz = p.z;
            camera.setPosition(px + 0.02, py, pz);
            setTimeout(() => camera.setPosition(px, py, pz), 350);
        };
        app.once('frame:ready', patear);
        for (const ms of [700, 2000, 4000, 7000, 11000]) setTimeout(patear, ms);
        await new Promise(r => setTimeout(r, 1500));
    }
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
        if (!response.ok) return new TrailModel([]);
        const cfg = await response.json();
        const path = new TrailModel(cfg.sceneWaypoints || [],cfg.corridorRadius ?? 1.5);
        path.eyeHeight = cfg.eyeHeight ?? 0;
        return path;
    } catch {
        return new TrailModel([]);
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
   window.senderoMarkers = new TrailArrowsView(
    app,
    camera,
    tour,
    {
        stepDistance: 3.2,
        size: 1.1,
        groundOffset: -0.6,
        onlyVisible: true
    }
);
    // Las flechas solo emiten solicitudes; TourEngine ejecuta el movimiento.
    app.on('trail:request-walk', ({ direction }) => {
        tour.press(direction > 0 ? 'forward' : 'back');
    });

    app.on('trail:request-stop', () => {
        tour.release('forward');
        tour.release('back');
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