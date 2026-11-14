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
    EnvLighting,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO,
    Quat,
    Texture,
    TEXTUREPROJECTION_EQUIRECT,
    PIXELFORMAT_SRGBA8,
    ADDRESS_REPEAT,
    ADDRESS_CLAMP_TO_EDGE,
    FILTER_LINEAR,
    FILTER_LINEAR_MIPMAP_LINEAR,
    Mesh,
    MeshInstance,
    StandardMaterial,
    CULLFACE_NONE,
    PRIMITIVE_TRIANGLES,
    Vec2,
    Vec3
} from 'playcanvas';
import { TrailModel } from '../models/TrailModel.js';
import { GpsTrack } from '../models/GpsTrack.js';
import { SceneCatalog } from '../models/SceneCatalog.js';
import { TourEngine } from './TourEngine.js';
import { TrailRecorder } from './TrailRecorder.js';
import { TrailArrowsView } from '../views/TrailArrowsView.js';
import { JoystickView } from '../views/JoystickView.js';
import { PoiManager } from './PoiManager.js';
import { PoiCardView } from '../views/PoiCardView.js';
import { ShellView } from '../views/ShellView.js';
import { HudView } from '../views/HudView.js';
import { DataController } from './DataController.js';
import AmbienceController from './AmbienceController.js';
import { detectFromDevice } from '../models/QualityProfile.js';

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
    if (bar) {
        bar.hidden = false;
        for (const btn of bar.querySelectorAll('button')) {
            btn.classList.toggle('activa', btn.dataset.render === active);
            btn.addEventListener('click', () => {
                if (btn.dataset.render === active) return;
                const params = new URLSearchParams(window.location.search);
                // Siempre explicito: sin parametro la resolucion es automatica
                // (escritorio -> COLMAP, celular -> Luma liviana), asi que borrar
                // ?render en celular convertia el boton COLMAP en un no-op.
                try {
                    sessionStorage.setItem('sv_exploring', 'true');
                } catch (e) {}
                params.set('render', btn.dataset.render);
                params.delete('sog');
                window.location.search = params.toString();
            });
        }
    }
    // Sincroniza los botones visibles en la barra superior (COLMAP / Luma)
    document.querySelectorAll('.render-btn[data-render]').forEach(btn => {
        btn.classList.toggle('activa', btn.dataset.render === active);
    });
}

async function resolveSceneUrl() {
    // Una sola instancia, un solo fetch de config/scenes.json para todo el
    // arranque: las tres consultas de abajo (render, sog, por defecto) leen
    // de aqui en vez de volver a pedir el archivo cada una.
    const catalog = new SceneCatalog(SCENES_CONFIG_URL);
    let scenesLoadError = null;
    try {
        await catalog.load();
    } catch (err) {
        scenesLoadError = err;
    }

    const params = new URLSearchParams(window.location.search);
    // ?render=luma conmuta a la técnica alterna registrada en config/scenes.json.
    // Ambas técnicas comparten coordenadas y trazado: solo cambia la reconstrucción.
    const render = params.get('render');
    if (render && !scenesLoadError) {
        const match = catalog.getAll().find(s => s.render === render);
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
                pitchDownLimit: match.pitchDownLimit, baked: !!match.baked,
                yawLimit: match.yawLimit,
                clearColorToken: match.clearColorToken,
                skyboxUrl: match.skyboxUrl, skyboxYaw: match.skyboxYaw, domoUrl: match.domoUrl
            };
        }
    }
    const override = params.get('sog');
    if (override) {
        // Si la URL pedida coincide con una escena registrada, se usan su
        // nivelación y sus restricciones; si no, se carga tal cual (muestras remotas).
        if (!scenesLoadError) {
            const match = catalog.getAll().find(s => s.sogUrl === override);
            if (match) {
                return {
                    url: override, isOverride: true,
                    sceneUp: match.sceneUp, forwardOnly: !!match.forwardOnly,
                    eyeHeight: match.eyeHeight, trackUrl: match.trackUrl,
                    pitchDownLimit: match.pitchDownLimit, baked: !!match.baked,
                    yawLimit: match.yawLimit,
                    clearColorToken: match.clearColorToken,
                    skyboxUrl: match.skyboxUrl, skyboxYaw: match.skyboxYaw, domoUrl: match.domoUrl
                };
            }
        }
        return { url: override, isOverride: true };
    }
    if (scenesLoadError) {
        throw new Error(`No se pudo leer <code>${SCENES_CONFIG_URL}</code>.`);
    }
    const scenes = [...catalog.getAll()].sort((a, b) => a.order - b.order);
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
    let poiDiagnosticsVisible = false;
    const qualityProfile = detectFromDevice();
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    const app = new Application(canvas, {
        graphicsDeviceOptions: {
            antialias: qualityProfile.antialias,
            // En portatiles con dos GPU, pedir la dedicada (sin esto algunos navegadores
            // eligen la integrada y el visor va a tirones sin razon aparente).
            powerPreference: 'high-performance'
        }
        
    });
    const shellView = new ShellView();
    window.senderoShellView = shellView;
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.graphicsDevice.maxPixelRatio = qualityProfile.maxPixelRatio;
    app.resizeCanvas();
    app.start();
    // Expuesta para inspeccion y capturas desde la consola del navegador.
    window.senderoApp = app;
    window.senderoQualityProfile = qualityProfile;
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
        // Una escena puede pedir su propio fondo (clearColorToken en config/scenes.json):
        // en el sendero real los huecos del dosel deben verse como cielo, no como el beige de la UI.
        clearColor: colorFromToken(sceneOpts.clearColorToken || '--sv-black-900')
    });
    // El oyente del audio espacial es la cámara activa. Con este componente, cualquier
    // fuente posicional que cree src/audio/ se espacializa sola conforme TourEngine
    // mueve y gira la cámara: el módulo de audio no necesita tocarla (invariante 12).
    camera.addComponent('audiolistener');
    app.root.addChild(camera);
    // Campo de vision segun la orientacion de la pantalla. El sendero se grabo con el gran angular
    // del celular (101 grados de ancho, 68 de alto). Con los 45 grados en vertical que PlayCanvas
    // trae por omision la escena se ve ampliada 1,65 veces respecto a como se grabo (casi tres
    // veces en un celular en vertical) y cada gaussiana se nota como un brochazo. En horizontal se
    // abre a 58 grados (unos 89 de ancho en 16:9, lo habitual en primera persona: ampliacion 1,2)
    // y en pantallas verticales a 62 (unos 31 de ancho).
    const ajustarCampoDeVision = () => {
        const aspecto = window.innerWidth / Math.max(1, window.innerHeight);
        camera.camera.fov = aspecto < 1 ? 62 : 58;
    };
    ajustarCampoDeVision();
    window.addEventListener('resize', ajustarCampoDeVision);
    // Fondo de cielo real (skyboxUrl en config/scenes.json): el cielo de una panoramica de la
    // Insta360 tomada en la misma zona, en el marco de la escena con la orientacion que le dio
    // COLMAP. Donde la reconstruccion no tiene nada (claros del dosel) se ve ese cielo en lugar del
    // color plano de fondo. Solo cielo: el fondo esta en el infinito y un arbol quedaria quieto.
    if (sceneOpts.skyboxUrl) cargarFondo360(app, sceneOpts.skyboxUrl, sceneOpts.skyboxYaw || 0);
    // Fondo lejano fotografico (domoUrl): cielo y paisaje lejano reales de las panoramicas, a toda
    // resolucion, en una esfera que sigue a la camara. Las gaussianas quedan solo para lo cercano.
    if (sceneOpts.domoUrl) cargarDomoLejano(app, camera, sceneOpts.domoUrl);

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
        app.scene.gsplat.splatBudget = qualityProfile.splatBudget;
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
        const poiCard = new PoiCardView(app);
        const dataController = new DataController(app, window.senderoTour.gpsTrack, new HudView());
        window.senderoDataController = dataController;
        window.senderoPoiManager = poiManager;
        window.senderoPoiCard = poiCard;
        app.on('poi:request-close', () => poiManager.closePoi());
        try {
            await poiManager.load();
            dataController.setPois(poiManager.pois);
            if (poiManager.diagnostics.length) {
                poiDiagnosticsVisible = true;
                const errors = poiManager.diagnostics.filter(issue => issue.severity === 'error');
                const warnings = poiManager.diagnostics.filter(issue => issue.severity === 'warning');
                const lines = [...errors, ...warnings].map(issue =>
                    `<li><strong>${issue.poiId}</strong> · <code>${issue.field}</code>: ${issue.message}</li>`
                ).join('');
                showOverlay(`
                    <h1>Revisa config/pois.json</h1>
                    <p>${errors.length ? 'Hay POIs que no se cargaron por errores de validación.' : 'El catálogo cargó, pero hay referencias pendientes.'}</p>
                    <ul>${lines}</ul>
                    <p><button id="continue">Continuar</button></p>
                `);
                document.getElementById('continue').addEventListener('click', () => {
                    overlay.hidden = true;
                });
            }
        } catch (error) {
            showError(error.message);
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
    if (poiDiagnosticsVisible || document.getElementById('continue')) return;
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
        if (!response.ok) return { trail: new TrailModel([]), gpsTrack: new GpsTrack({}) };
        const cfg = await response.json();
        const path = new TrailModel(cfg.sceneWaypoints || [],cfg.corridorRadius ?? 1.5);
        path.eyeHeight = cfg.eyeHeight ?? 0;
        // Espacio libre medido a cada lado de cada punto (opcional): el corredor deja de ser
        // fijo y el visitante no puede meter la cabeza en los arbustos que invaden el camino.
        path.corridorLeft = Array.isArray(cfg.corridorLeft) ? cfg.corridorLeft : null;
        path.corridorRight = Array.isArray(cfg.corridorRight) ? cfg.corridorRight : null;
        // Punto de arranque sobre el trazado (metros desde su primer punto); 0 si no se declara.
        path.startDistance = Number.isFinite(cfg.startDistance) ? cfg.startDistance : 0;
        // Mismo cfg ya leido y parseado: un solo fetch de track.json, dos modelos.
        const gpsTrack = new GpsTrack(cfg);
        return { trail: path, gpsTrack };
    } catch {
        return { trail: new TrailModel([]), gpsTrack: new GpsTrack({}) };
    }
}

async function setUpNavigation(app, camera, sceneOpts = {}) {
    // Metadatos de la escena activa (config/scenes.json): restricciones y trazado propio.
    const { forwardOnly = false, eyeHeight: sceneEyeHeight, trackUrl: sceneTrackUrl, pitchDownLimit, yawLimit } = sceneOpts;
    const isEditor = new URLSearchParams(window.location.search).has('editor');
    // Extremo del trazado por el que llega quien viene de otra zona (src/ui/conexionesSendero.js).
    const llegada = new URLSearchParams(window.location.search).get('llegada');
    const { trail, gpsTrack } = await loadTrail(sceneTrackUrl ?? TRACK_CONFIG_URL);

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
        pitchDownLimit,
        // Tope del giro de la cabeza respecto al camino (tramos estrechos, config/scenes.json).
        yawLimit,
        // Algunos trazados no arrancan en su primer punto (config/track-*.json, startDistance).
        // Al llegar desde otra zona (src/ui/conexionesSendero.js, ?llegada=inicio|fin) se arranca
        // en ese extremo: el motor recorta la distancia al largo del trazado.
        startDistance: llegada === 'fin' ? Infinity : (llegada === 'inicio' ? 0 : (trail.startDistance ?? 0)),
        gpsTrack
    });
    tour.start();
    // Quien llega por el final del trazado viene de la zona siguiente: mira hacia el tramo, no
    // hacia el borde. Solo si la escena deja girar (sin forwardOnly ni tope de giro).
    if (llegada === 'fin' && !forwardOnly && !yawLimit) tour.state.yaw += 180;
    window.senderoTour = tour;
    // Joystick en pantalla para celular: la Vista solo publica los ejes y el motor mueve.
    new JoystickView(app);
    app.on('trail:joystick', ({ forward, strafe }) => tour.setStick(forward, strafe));
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

/**
 * Fondo lejano fotografico: un equirectangular (2:1, +Y arriba, SIN voltear: columna
 * u = 0,5 + atan2(x, z) / 2 pi, fila v = 0,5 - asin(y) / pi, en el marco de la escena) pegado por
 * dentro a una esfera que sigue a la camara, asi que queda en el infinito. Lo arma
 * scripts/escenas/nube/domo_lejos.py con el cielo y el paisaje lejano de las panoramicas 360; lo
 * cercano no va ahi porque quedaria quieto al caminar. A diferencia de skyboxUrl no pasa por el
 * cubemap del motor: la foto se ve a su resolucion y con sus colores en cualquier equipo. Se dibuja
 * antes que las gaussianas y no escribe profundidad, de modo que todo lo demas queda delante.
 */
function cargarDomoLejano(app, camera, url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const device = app.graphicsDevice;
        const esMovil = window.matchMedia('(max-width: 640px)').matches;
        const tope = Math.min(device.maxTextureSize || 4096, esMovil ? 4096 : 8192);
        let fuente = img;
        let ancho = img.width;
        let alto = img.height;
        if (ancho > tope) {
            alto = Math.round(alto * tope / ancho);
            ancho = tope;
            const lienzo = document.createElement('canvas');
            lienzo.width = ancho;
            lienzo.height = alto;
            lienzo.getContext('2d').drawImage(img, 0, 0, ancho, alto);
            fuente = lienzo;
        }
        const textura = new Texture(device, {
            name: 'domo-lejano', width: ancho, height: alto, format: PIXELFORMAT_SRGBA8,
            mipmaps: true, flipY: false, anisotropy: 4,
            addressU: ADDRESS_REPEAT, addressV: ADDRESS_CLAMP_TO_EDGE,
            minFilter: FILTER_LINEAR_MIPMAP_LINEAR, magFilter: FILTER_LINEAR
        });
        textura.setSource(fuente);

        const columnas = 96;
        const filas = 48;
        const radio = 400;
        const posiciones = [];
        const uvs = [];
        const indices = [];
        for (let i = 0; i <= filas; i++) {
            const v = i / filas;
            const lat = (0.5 - v) * Math.PI;
            for (let j = 0; j <= columnas; j++) {
                const u = j / columnas;
                const lon = (u - 0.5) * 2 * Math.PI;
                posiciones.push(
                    radio * Math.cos(lat) * Math.sin(lon),
                    radio * Math.sin(lat),
                    radio * Math.cos(lat) * Math.cos(lon)
                );
                uvs.push(u, v);
            }
        }
        for (let i = 0; i < filas; i++) {
            for (let j = 0; j < columnas; j++) {
                const a = i * (columnas + 1) + j;
                const b = a + columnas + 1;
                indices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
        const malla = new Mesh(device);
        malla.setPositions(posiciones);
        malla.setUvs(0, uvs);
        malla.setIndices(indices);
        malla.update(PRIMITIVE_TRIANGLES);

        const material = new StandardMaterial();
        material.diffuse = new Color(0, 0, 0);
        material.emissive = new Color(1, 1, 1);
        material.emissiveMap = textura;
        material.useLighting = false;
        material.useSkybox = false;
        material.useFog = false;
        material.cull = CULLFACE_NONE;
        material.depthWrite = false;
        material.update();

        const instancia = new MeshInstance(malla, material);
        instancia.cull = false;
        const domo = new Entity('domo-lejano');
        domo.addComponent('render', { meshInstances: [instancia], castShadows: false, receiveShadows: false });
        app.root.addChild(domo);
        app.on('update', () => domo.setPosition(camera.getPosition()));
        window.senderoDomoLejano = { url, ancho, alto };
    };
    img.onerror = () => console.warn('No se pudo cargar el fondo lejano', url);
    img.src = url;
}

/**
 * Carga un equirectangular (2:1, +Y arriba) como fondo de la escena. La textura se convierte a
 * cubemap una sola vez y se libera; el giro (grados) corrige la convencion de longitud si hace falta.
 */
function cargarFondo360(app, url, giro) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const fuente = new Texture(app.graphicsDevice, {
            name: 'fondo360', width: img.width, height: img.height, format: PIXELFORMAT_SRGBA8,
            mipmaps: false, projection: TEXTUREPROJECTION_EQUIRECT,
            addressU: ADDRESS_REPEAT, addressV: ADDRESS_CLAMP_TO_EDGE,
            minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR
        });
        fuente.setSource(img);
        app.scene.skybox = EnvLighting.generateSkyboxCubemap(fuente, 1024);
        app.scene.skyboxMip = 0;
        app.scene.skyboxRotation = new Quat().setFromEulerAngles(0, giro, 0);
        fuente.destroy();
        window.senderoFondo360 = { url, giro };
    };
    img.onerror = () => console.warn('No se pudo cargar el fondo 360', url);
    img.src = url;
}
