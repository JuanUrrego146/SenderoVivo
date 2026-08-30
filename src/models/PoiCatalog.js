const POIS_CONFIG_URL = 'config/pois.json';

export class PoiCatalog {

    constructor(configUrl = POIS_CONFIG_URL) {
        this.configUrl = configUrl;
        this.pois = [];
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

        this.pois =
            Array.isArray(config.pois)
                ? config.pois
                : [];

        return this.pois;
    }

    getAll() {
        return this.pois;
    }

    getById(id) {
        return this.pois.find(
            poi => poi.id === id
        ) || null;
    }
}