/*
 * SceneLoader — carga de la escena gaussiana (SOG) y su puesta en escena.
 *
 * Responsable de que la escena llegue al motor bien orientada y completa:
 *   1. Descarga el asset 'gsplat' informando el progreso real (RNF-007).
 *   2. Nivela la escena con el vector sceneUp medido en las poses de cámara
 *      (config/scenes.json): COLMAP entrega la reconstrucción en orientación
 *      arbitraria y sin esto se ve torcida.
 *   3. Da un volumen de recorte generoso: el frustum culling calcula con el
 *      AABB y, con la cámara dentro de la escena, un volumen ajustado hace
 *      desaparecer trozos al moverse.
 *   4. Espera a que el render sea estable antes de revelar: el motor ordena
 *      millones de gaussianas por profundidad en los primeros cuadros y
 *      mostrarla antes se ve borrosa.
 */
import { Asset, AssetListLoader, BoundingBox, Entity, Quat, Vec3 } from 'playcanvas';

export class SceneLoader {
    /** @param {import('playcanvas').AppBase} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Descarga los assets y devuelve la entidad del splat ya en escena.
     *
     * @param {object} options
     * @param {string} options.url URL del SOG (meta.json de la carpeta desempaquetada, o .sog)
     * @param {{x:number,y:number,z:number}} [options.sceneUp] vector "arriba" real de la escena
     * @param {string} [options.controlsUrl] script de cámara orbital (solo lo usa el modo editor)
     * @param {(recibido:number, total:number) => void} [options.onProgress]
     * @returns {Promise<Entity>}
     */
    async load({ url, sceneUp, controlsUrl, onProgress }) {
        const assets = [new Asset('scene', 'gsplat', { url })];
        if (controlsUrl) {
            assets.push(new Asset('camera-controls', 'script', { url: controlsUrl }));
        }
        if (onProgress) {
            assets[0].on('progress', onProgress);
        }

        const loader = new AssetListLoader(assets, this.app.assets);
        await new Promise(resolve => loader.load(resolve));

        const [sceneAsset, controlsAsset] = assets;
        if (controlsUrl && !controlsAsset.loaded) {
            throw new Error('No se pudo descargar el control de cámara desde el CDN. Revisa la conexión a internet.');
        }
        if (!sceneAsset.loaded) {
            throw new Error(`El archivo <code>${url}</code> existe pero no se pudo cargar. Revisa que sea un SOG válido.`);
        }

        return this._createSplatEntity(sceneAsset, sceneUp);
    }

    _createSplatEntity(sceneAsset, sceneUp) {
        const splat = new Entity('scene');

        // Nivelación: sceneUp es el "arriba" real medido en las poses de cámara.
        // La rotación se calcula desde el vector; convertirla a ángulos de Euler
        // a mano ya nos costó 65° de error (docs/05 §16).
        if (sceneUp) {
            const up = new Vec3(sceneUp.x, sceneUp.y, sceneUp.z).normalize();
            splat.setRotation(new Quat().setFromDirections(up, Vec3.UP));
        } else {
            splat.setEulerAngles(0, 0, 180);   // convención del ejemplo oficial, sin nivelar
        }

        splat.addComponent('gsplat', { asset: sceneAsset });
        // El recorte por volumen descarta trozos de la escena cuando la cámara va
        // por dentro: se le da un volumen amplio para que no desaparezca nada.
        splat.gsplat.customAabb = new BoundingBox(new Vec3(0, 0, 0), new Vec3(60, 60, 60));
        this.app.root.addChild(splat);
        return splat;
    }

    /**
     * Se resuelve cuando el splat ya se ve bien: suficientes cuadros renderizados
     * Y suficiente tiempo. El ordenamiento por profundidad corre en segundo plano;
     * revelar antes muestra la escena emborronada.
     *
     * @param {object} [options]
     * @param {number} [options.frames] cuadros mínimos renderizados
     * @param {number} [options.minMs] tiempo mínimo en pantalla
     * @param {(avance:number) => void} [options.onProgress] avance 0..1 del afinado
     */
    waitForStableRender({ frames = 200, minMs = 2800, onProgress } = {}) {
        return new Promise((resolve) => {
            const inicio = Date.now();
            let contados = 0;
            const listo = () => {
                this.app.off('frameend', contar);
                resolve();
            };
            const contar = () => {
                contados++;
                onProgress?.(Math.min(contados / frames, (Date.now() - inicio) / minMs));
                if (contados >= frames && Date.now() - inicio >= minMs) listo();
            };
            this.app.on('frameend', contar);
            setTimeout(listo, 12000);   // salvavidas: nunca dejar la carga colgada
        });
    }
}
