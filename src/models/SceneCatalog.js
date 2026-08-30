const SCENES_CONFIG_URL = 'config/scenes.json';

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
}