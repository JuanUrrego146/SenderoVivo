const POIS_CONFIG_URL = 'config/pois.json';
const POI_TYPES = new Set(['fauna', 'flora', 'patrimonio']);
const RESOURCE_FIELDS = ['modelUrl', 'narrationUrl', 'birdCallUrl'];

const COMMON_FIELDS = {
    id: 'texto',
    type: 'tipo de POI',
    commonName: 'texto',
    sceneId: 'texto',
    anchor: 'objeto con x, y, z numéricos',
    trailAnchor: 'objeto con d, lat, alt numéricos'
};

const TYPE_FIELDS = {
    fauna: {
        scientificName: 'texto',
        modelUrl: 'texto',
        altitudeRange: 'texto',
        fieldIdTips: 'texto',
        sightingTips: 'texto'
    },
    flora: {
        scientificName: 'texto'
    },
    patrimonio: {
        historicalNote: 'texto',
        period: 'texto',
        sourceUrl: 'texto'
    }
};

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasField(poi, field) {
    return Object.prototype.hasOwnProperty.call(poi, field);
}

function isValidField(value, expected) {
    if (expected === 'objeto con x, y, z numéricos') {
        return value && typeof value === 'object' &&
            ['x', 'y', 'z'].every(key => Number.isFinite(value[key]));
    }
    if (expected === 'objeto con d, lat, alt numéricos') {
        return value && typeof value === 'object' &&
            ['d', 'lat', 'alt'].every(key => Number.isFinite(value[key]));
    }
    return typeof value === 'string';
}

function validatePoi(poi) {
    const issues = [];

    if (!poi || typeof poi !== 'object' || Array.isArray(poi)) {
        return [{ poiId: '(desconocido)', field: 'poi', message: 'debe ser un objeto', severity: 'error' }];
    }

    const poiId = isNonEmptyString(poi.id) ? poi.id : '(sin id)';
    for (const [field, expected] of Object.entries(COMMON_FIELDS)) {
        if (!hasField(poi, field) || !isValidField(poi[field], expected) ||
            (expected === 'texto' && !isNonEmptyString(poi[field]))) {
            issues.push({ poiId, field, message: `debe ser ${expected}`, severity: 'error' });
        }
    }

    if (hasField(poi, 'type') && !POI_TYPES.has(poi.type)) {
        issues.push({ poiId, field: 'type', message: 'debe ser fauna, flora o patrimonio', severity: 'error' });
    }

    const typeFields = TYPE_FIELDS[poi.type] || {};
    for (const [field, expected] of Object.entries(typeFields)) {
        if (!hasField(poi, field) || !isValidField(poi[field], expected)) {
            issues.push({ poiId, field, message: `es obligatorio y debe ser ${expected}`, severity: 'error' });
        }
    }

    if (poi.type === 'patrimonio' && isNonEmptyString(poi.historicalNote) &&
        poi.historicalNote !== '[por verificar]' && !isNonEmptyString(poi.sourceUrl)) {
        issues.push({
            poiId,
            field: 'sourceUrl',
            message: 'es obligatorio cuando historicalNote afirma un dato histórico',
            severity: 'error'
        });
    }

    return issues;
}

export class PoiCatalog {

    constructor(configUrl = POIS_CONFIG_URL) {
        this.configUrl = configUrl;
        this.pois = [];
        this.diagnostics = [];
    }

    async load() {

        const response =
            await fetch(this.configUrl);

        if (!response.ok) {
            throw new Error(
                `No se pudo leer ${this.configUrl}`
            );
        }

        let config;
        try {
            config = await response.json();
        } catch {
            throw new Error(`No se pudo interpretar ${this.configUrl}: revisa la sintaxis JSON.`);
        }

        if (!config || !Array.isArray(config.pois)) {
            throw new Error(`${this.configUrl}: el campo "pois" es obligatorio y debe ser un arreglo.`);
        }

        this.diagnostics = config.pois.flatMap(validatePoi);
        this.pois = config.pois.filter(poi =>
            !this.diagnostics.some(issue => issue.poiId === poi?.id && issue.severity === 'error')
        );

        const resourceWarnings = await this._checkResources(this.pois);
        this.diagnostics.push(...resourceWarnings);

        return this.pois;
    }

    async _checkResources(pois) {
        const warnings = [];
        for (const poi of pois) {
            for (const field of RESOURCE_FIELDS) {
                const url = poi[field];
                if (!isNonEmptyString(url)) continue;
                let response;
                try {
                    response = await fetch(url, { method: 'HEAD' });
                    if (response.status === 405 || response.status === 501) {
                        response = await fetch(url);
                    }
                } catch {
                    response = null;
                }
                if (!response || !response.ok) {
                    warnings.push({
                        poiId: poi.id,
                        field,
                        message: `apunta a un archivo que no existe: ${url}`,
                        severity: 'warning'
                    });
                }
            }
        }
        return warnings;
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