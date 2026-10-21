const SCENES_CONFIG_URL = 'config/scenes.json';
// Trazado de las escenas que no declaran trackUrl (el del parque de prueba).
const DEFAULT_TRACK_URL = 'config/track.json';

export class SceneCatalog {

    constructor(configUrl = SCENES_CONFIG_URL) {
        this.configUrl = configUrl;
        this.trail = null;
        this.scenes = [];
    }

    async load() {

        const response =
            await fetch(this.configUrl);

        if (!response.ok) {
            throw new Error(
                `No se pudo leer ${this.configUrl}`
            );
        }

        const config =
            await response.json();

        this.trail =
            config.trail || null;

        this.scenes =
            Array.isArray(config.scenes)
                ? config.scenes
                : [];

        return this.scenes;
    }

    getAll() {
        return this.scenes;
    }

    getById(id) {
        return this.scenes.find(
            scene => scene.id === id
        ) || null;
    }

    getTrail() {
        return this.trail;
    }

    /**
     * Trazado de una escena: el suyo (trackUrl) o el del parque de prueba.
     */
    trackUrlOf(id) {
        return this.getById(id)?.trackUrl || DEFAULT_TRACK_URL;
    }

    /**
     * Trazado que carga el visor para esta dirección.
     *
     * Replica el orden de resolveSceneUrl() en src/controllers/main.js: si esa
     * función cambia, esta cambia con ella.
     *   1. ?render= nombra una escena (la primera con ese render) que tiene sogUrl.
     *   2. ?sog= coincide con el sogUrl de una escena.
     *   3. En celular, la primera escena luma con sogUrl, por orden.
     *   4. El trazado por defecto.
     */
    activeTrackUrl(
        search = window.location.search,
        isMobile = window.matchMedia('(max-width: 640px)').matches
    ) {
        const params = new URLSearchParams(search);

        const render = params.get('render');
        if (render) {
            const match = this.scenes.find(scene => scene.render === render);
            if (match && match.sogUrl) {
                return match.trackUrl || DEFAULT_TRACK_URL;
            }
        }

        const override = params.get('sog');
        if (override) {
            const match = this.scenes.find(scene => scene.sogUrl === override);
            return match?.trackUrl || DEFAULT_TRACK_URL;
        }

        if (isMobile) {
            const light = [...this.scenes]
                .sort((a, b) => a.order - b.order)
                .find(scene => scene.render === 'luma' && scene.sogUrl);
            if (light) {
                return light.trackUrl || DEFAULT_TRACK_URL;
            }
        }

        return DEFAULT_TRACK_URL;
    }

    /**
     * Deja solo los POI cuya escena usa este trazado (RF-006: cada marcador se
     * mide sobre el trazado donde se ve). Las escenas con el mismo trazado
     * comparten POI, como scene-01 y su técnica alterna scene-01-luma.
     */
    filterPois(pois, trackUrl = this.activeTrackUrl()) {
        return pois.filter(poi => this.trackUrlOf(poi.sceneId) === trackUrl);
    }
}