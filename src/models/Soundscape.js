const SOUNDSCAPE_CONFIG_URL = 'config/soundscape.json';

export class Soundscape {

    constructor(configUrl = SOUNDSCAPE_CONFIG_URL) {
        this.configUrl = configUrl;

        this.version = null;
        this.note = null;
        this.ambienceUrl = null;
        this.ambienceNote = null;
        this.sources = [];
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

        this.version =
            config.version ?? null;

        this.note =
            config.note ?? null;

        this.ambienceUrl =
            config.ambienceUrl ?? null;

        this.ambienceNote =
            config.ambienceNote ?? null;

        this.sources =
            Array.isArray(config.sources)
                ? config.sources
                : [];

        return this;
    }

    getAmbienceUrl() {
        return this.ambienceUrl;
    }

    getSources() {
        return this.sources;
    }
}