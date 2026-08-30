const TRACK_CONFIG_URL = 'config/track.json';

export class GpsTrack {

    constructor(configUrl = TRACK_CONFIG_URL) {
        this.configUrl = configUrl;

        this.version = null;
        this.capturedOn = null;
        this.note = null;
        this.sceneWaypoints = [];
        this.points = [];
        this.eyeHeight = 0;
        this.corridorRadius = 1.5;
        this.eyeHeightNote = null;
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

        this.capturedOn =
            config.capturedOn ?? null;

        this.note =
            config.note ?? null;

        this.sceneWaypoints =
            Array.isArray(config.sceneWaypoints)
                ? config.sceneWaypoints
                : [];

        this.points =
            Array.isArray(config.points)
                ? config.points
                : [];

        this.eyeHeight =
            config.eyeHeight ?? 0;

        this.corridorRadius =
            config.corridorRadius ?? 1.5;

        this.eyeHeightNote =
            config.eyeHeightNote ?? null;

        return this;
    }

    getWaypoints() {
        return this.sceneWaypoints;
    }

    getPoints() {
        return this.points;
    }
}