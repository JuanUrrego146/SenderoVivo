const MOBILE_QUERY = '(max-width: 640px)';
const MOBILE_SPLAT_BUDGET = 1_000_000;
const DESKTOP_SPLAT_BUDGET = 3_500_000;
const MOBILE_AUDIO_SOURCES = 2;
const DESKTOP_AUDIO_SOURCES = 4;
const MOBILE_MAX_PIXEL_RATIO = 2;

/**
 * Comprueba si el navegador puede solicitar un adaptador WebGPU.
 * La creación del dispositivo real sigue teniendo WebGL como fallback:
 * un adaptador puede existir y aun así fallar al inicializarse.
 */
export async function detectWebGPU(environment = globalThis) {
    const gpu = environment.navigator?.gpu;
    if (!gpu || typeof gpu.requestAdapter !== 'function') {
        return false;
    }

    try {
        return Boolean(await gpu.requestAdapter());
    } catch (error) {
        console.warn('WebGPU no está disponible; se usará WebGL:', error);
        return false;
    }
}

/**
 * Detecta los límites de calidad sin crear opciones de interfaz.
 * `environment` se puede sustituir en pruebas para simular un dispositivo.
 */
export function detectFromDevice(environment = globalThis) {
    const isMobile = environment.matchMedia?.(MOBILE_QUERY).matches ?? false;
    const devicePixelRatio = environment.devicePixelRatio || 1;

    return {
        splatBudget: isMobile ? MOBILE_SPLAT_BUDGET : DESKTOP_SPLAT_BUDGET,
        antialias: false,
        maxPixelRatio: isMobile
            ? Math.min(devicePixelRatio, MOBILE_MAX_PIXEL_RATIO)
            : devicePixelRatio,
        maxSpatialAudioSources: isMobile
            ? MOBILE_AUDIO_SOURCES
            : DESKTOP_AUDIO_SOURCES
    };
}

export class QualityProfile {
    static detectFromDevice(environment = globalThis) {
        return detectFromDevice(environment);
    }

    static detectWebGPU(environment = globalThis) {
        return detectWebGPU(environment);
    }
}
