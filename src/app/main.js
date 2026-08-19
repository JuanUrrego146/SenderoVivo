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

import { PoiManager } from '../poi/PoiManager.js';
import { PoiCard } from '../poi/PoiCard.js';

import { colorFromToken, cssFromToken } from '../ui/tokens.js';

import {
    showLoading,
    setLoadingProgress,
    showPlaceholder,
    showError,
    showHint,
    hideOverlay
} from '../ui/overlay.js';

const CAMERA_CONTROLS_URL =
    'https://cdn.jsdelivr.net/npm/playcanvas@2.21.3/scripts/esm/camera-controls.mjs';

const SCENES_CONFIG_URL = 'config/scenes.json';
const TRACK_CONFIG_URL = 'config/track.json';

// Escena de muestra de la documentación oficial, para probar el visor sin captura propia.
const SAMPLE_SOG_URL =
    'https://developer.playcanvas.com/assets/toy-cat.sog';

function isRemoteUrl(url) {
    return /^https?:\/\//i.test(url);
}

async function resolveSceneUrl() {
    const override =
        new URLSearchParams(window.location.search).get('sog');

    if (override) {
        return {
            url: override,
            isOverride: true
        };
    }

    const response = await fetch(SCENES_CONFIG_URL);

    if (!response.ok) {
        throw new Error(
            `No se pudo leer <code>${SCENES_CONFIG_URL}</code> (HTTP ${response.status}).`
        );
    }

    const config = await response.json();

    const scenes = Array.isArray(config.scenes)
        ? [...config.scenes].sort((a, b) => a.order - b.order)
        : [];

    if (!scenes.length || !scenes[0].sogUrl) {
        throw new Error(
            `<code>${SCENES_CONFIG_URL}</code> no define ninguna escena con <code>sogUrl</code>.`
        );
    }

    return {
        url: scenes[0].sogUrl,
        isOverride: false,
        sceneUp: scenes[0].sceneUp
    };
}

async function localFileExists(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD'
        });

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
            // El cuello de botella del splatting es el fill rate;
            // el antialiasing lo multiplica.
            antialias: false
        }
    });

    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.start();

    window.addEventListener(
        'resize',
        () => app.resizeCanvas()
    );

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

    // El oyente del audio espacial es la cámara activa.
    camera.addComponent('audiolistener');

    app.root.addChild(camera);

    return camera;
}

async function startViewer(sceneUrl, sceneUp) {
    const app = createApp();
    const camera = createCamera(app);

    const loader = new SceneLoader(app);

    await loader.load({
        url: sceneUrl,
        sceneUp,
        controlsUrl: CAMERA_CONTROLS_URL,

        onProgress: (recibido, total) => {
            if (total > 0) {
                const mb =
                    (recibido / 1048576).toFixed(0);

                const totalMb =
                    (total / 1048576).toFixed(0);

                setLoadingProgress(
                    (recibido / total) * 85,
                    `Descargando la escena · ${mb} de ${totalMb} MB`
                );
            }
        }
    });

    // La escena solo se revela cuando ya se ve bien.
    await loader.waitForStableRender({
        onProgress: (avance) =>
            setLoadingProgress(
                90 + 10 * avance,
                'Afinando la escena'
            )
    });

    await setUpNavigation(app, camera);

    setLoadingProgress(100, 'Listo');

    hideOverlay();
}

/**
 * Vuelo libre:
 * solo para marcar el trazado o mientras no exista uno.
 */
function enableFreeFlight(camera) {
    camera.addComponent('script');

    const controls =
        camera.script.create('cameraControls');

    if (controls) {
        controls.enableFly = true;
        controls.enableOrbit = true;
        controls.enablePan = true;

        controls.moveSpeed = 2;
        controls.moveFastSpeed = 6;
        controls.moveSlowSpeed = 0.5;

        controls.focusPoint =
            new Vec3(0, 0, 0);

        controls.pitchRange =
            new Vec2(-90, 90);
    }

    return controls;
}

async function loadTrail() {
    try {
        const response =
            await fetch(TRACK_CONFIG_URL);

        if (!response.ok) {
            return new TrailPath([]);
        }

        const cfg =
            await response.json();

        const path = new TrailPath(
            cfg.sceneWaypoints || [],
            cfg.corridorRadius ?? 1.5
        );

        path.eyeHeight =
            cfg.eyeHeight ?? 0;

        return path;

    } catch {
        return new TrailPath([]);
    }
}

async function setUpNavigation(app, camera) {
    const isEditor =
        new URLSearchParams(
            window.location.search
        ).has('editor');

    const trail =
        await loadTrail();

    if (isEditor) {
        enableFreeFlight(camera);

        const pintar = (n) =>
            showHint(
                '<strong>EDITOR DEL TRAZADO</strong> · ' +
                n +
                ' punto(s) marcados<br>' +

                '<strong>M</strong> marcar aquí · ' +
                '<strong>Z</strong> deshacer · ' +
                '<strong>X</strong> descargar track.json<br>' +

                'Vuela con <strong>W A S D</strong> ' +
                'por el camino y ve marcando, de principio a fin.'
            );

        window.senderoRecorder =
            new TrailRecorder(
                app,
                camera,
                points => pintar(points.length)
            );

        pintar(0);

        return;
    }

    if (!trail.isUsable) {
        enableFreeFlight(camera);

        showHint(
            '<strong>Sin trazado definido:</strong> vuelo libre. ' +

            '<strong>W A S D</strong> moverse · ' +
            '<strong>Q E</strong> bajar y subir · ' +
            'arrastrar para mirar.<br>' +

            'Para marcar el camino del sendero abre ' +

            '<a href="?editor=1" ' +
            'style="color:var(--sv-green-300)">' +
            'el editor del trazado</a>.'
        );

        return;
    }

    /*
     * Recorrido guiado:
     * la cámara se mueve dentro del corredor del trazado.
     */
    const tour = new TourEngine(
        app,
        camera,
        trail,
        {
            speed: 1.2,
            eyeHeight: trail.eyeHeight
        }
    );

    tour.start();

    window.senderoTour = tour;

    /*
     * Flechas dentro de la escena,
     * sobre el camino: se tocan para avanzar.
     */
    window.senderoMarkers =
        new TrailMarkers(
            app,
            camera,
            tour,
            {
                stepDistance: 3.2,
                groundOffset: -0.6,
                color: cssFromToken(
                    '--sv-green-300',
                    '#6FCF97'
                )
            }
        );

    /*
     * ==========================================
     * PUNTOS DE INTERÉS
     * ==========================================
     */

    const poiManager =
        new PoiManager(
            app,
            camera,
            tour
        );

    const poiCard =
        new PoiCard(app);

    window.senderoPoiManager =
        poiManager;

    window.senderoPoiCard =
        poiCard;

    /*
     * Cuando se cierra la tarjeta,
     * PoiCard solicita que PoiManager
     * restaure el recorrido.
     */
    app.on(
        'poi:request-close',
        () => poiManager.closePoi()
    );

    try {
        await poiManager.load();
    } catch (error) {
        console.warn(
            'No se pudieron cargar los puntos de interés:',
            error
        );
    }

    showHint(
        'Toca las <strong>flechas del camino</strong> para avanzar · ' +
        'también <strong>W A S D</strong><br>' +

        '<strong>R</strong> subir la vista · ' +
        '<strong>F</strong> bajarla · ' +
        'arrastra para mirar en 360°<br>' +

        '<span id="hud-progress">' +
        '0 % del recorrido' +
        '</span> · ' +

        'altura ' +

        '<span id="hud-eye">' +
        (trail.eyeHeight ?? 0).toFixed(2) +
        '</span>'
    );

    app.on(
        'tour:progress',
        ({ distance, total }) => {
            const hud =
                document.getElementById(
                    'hud-progress'
                );

            if (hud && total > 0) {
                hud.textContent =
                    Math.round(
                        100 * distance / total
                    ) +
                    ' % del recorrido';
            }
        }
    );

    app.on(
        'tour:eyeheight',
        (v) => {
            const hud =
                document.getElementById(
                    'hud-eye'
                );

            if (hud) {
                hud.textContent =
                    v.toFixed(2);
            }
        }
    );
}

async function main() {
    try {
        const {
            url,
            isOverride,
            sceneUp
        } = await resolveSceneUrl();

        if (
            !isRemoteUrl(url) &&
            !(await localFileExists(url))
        ) {
            if (isOverride) {
                showError(
                    `No existe el archivo <code>${url}</code> en el servidor.`
                );
            } else {
                showPlaceholder(
                    url,
                    SAMPLE_SOG_URL
                );
            }

            return;
        }

        showLoading();

        await startViewer(
            url,
            sceneUp
        );

    } catch (error) {
        console.error(error);

        showError(
            error.message
        );
    }
}

main();