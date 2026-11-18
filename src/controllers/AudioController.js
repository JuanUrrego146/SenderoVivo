import { Soundscape } from '../models/Soundscape.js';
import { SceneCatalog } from '../models/SceneCatalog.js';

const MUTE_STORAGE_KEY = 'sendero.audioMuted';

// Ganancia de las fuentes espaciales mientras suena un audio de ficha (igual que el lecho).
const DUCKED_GAIN = 0.25;
// Cada cuánto se refresca window.senderoAudioDiagnostics desde el cuadro (ms).
const DIAGNOSTICS_EVERY_MS = 250;

function isPosition(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
}

/** [min, max] en segundos de intervalSeconds, o null si la fuente suena en bucle continuo. */
function intervalOf(source) {
    const interval = source.intervalSeconds;
    if (!Array.isArray(interval) || interval.length !== 2) return null;
    const [min, max] = interval;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) return null;
    return [min, max];
}

export default class AudioController {
    constructor(app, camera, qualityProfile, soundscapePath = 'config/soundscape.json') {
        this.app = app;
        this.camera = camera;
        this.qualityProfile = qualityProfile;
        this.soundscapePath = soundscapePath;
        this.soundscape = null;
        this.ambienceUrl = null;
        this.ambienceNote = '';
        this.audioEl = null;
        this._audioContext = null;
        this.masterGain = null;
        this.ambienceGain = null;
        this.sources = [];
        this.activeClips = new Map();
        this.diagnostics = [];
        this._scenes = null;
        this._diagnosticsAt = 0;
        this.loaded = false;
        this.started = false;
        this.muted = this._readMuted();
        this._updateSources = this._updateSources.bind(this);
        this.app.on('update', this._updateSources);
    }

    async load() {
        this.soundscape = new Soundscape(this.soundscapePath);
        const config = await this.soundscape.load();
        this.ambienceUrl = this.soundscape.getAmbienceUrl();
        this.ambienceNote = this.soundscape.ambienceNote || '';
        const openTrackUrl = await this._openTrackCatalog();
        this.sources = this.soundscape.getSources()
            .filter(source => this._keepSource(source, openTrackUrl))
            .map(source => ({
                ...source,
                distance: Infinity,
                audio: null,
                panner: null,
                gain: null,
                loading: null,
                active: false,
                wanted: false,
                timer: null
            }));
        this.loaded = true;
        return config;
    }

    /**
     * Catálogo de escenas y trazado que abre el visor. Si config/scenes.json no se puede
     * leer, devuelve null y las fuentes con sceneId se conservan todas.
     */
    async _openTrackCatalog() {
        try {
            const scenes = new SceneCatalog();
            await scenes.load();
            this._scenes = scenes;
            return scenes.activeTrackUrl();
        } catch (error) {
            console.warn('No se pudo leer el catálogo de escenas; no se filtran las fuentes sonoras por escena:', error);
            this._scenes = null;
            return null;
        }
    }

    /**
     * Una fuente con poiId se conserva aunque no traiga anchor: su posición sale del
     * medallón del POI en la escena abierta. Una con sceneId y anchor se conserva solo si
     * esa escena usa el trazado abierto. Una sin poiId ni sceneId no sabe dónde suena.
     */
    _keepSource(source, openTrackUrl) {
        if (!source.url) return false;
        if (source.poiId) return true;
        if (source.sceneId && isPosition(source.anchor)) {
            return !this._scenes || !openTrackUrl ||
                this._scenes.trackUrlOf(source.sceneId) === openTrackUrl;
        }
        console.warn(`La fuente sonora ${source.id || source.url} no trae poiId ni sceneId con anchor; se descarta.`);
        return false;
    }

    /**
     * Posición de una fuente con poiId: el anchor del POI ya filtrado a la escena (con la
     * ubicación de su placements aplicada). window.senderoPoiManager nace después de este
     * controlador, por eso se busca aquí y no en load(). Si el POI no está en esta escena,
     * la fuente no suena.
     */
    _resolveAnchor(source) {
        if (isPosition(source.anchor)) return true;
        if (!source.poiId) return false;
        const poi = window.senderoPoiManager?.pois?.find(item => item.id === source.poiId);
        if (!poi || !isPosition(poi.anchor)) return false;
        source.anchor = { x: poi.anchor.x, y: poi.anchor.y, z: poi.anchor.z };
        return true;
    }

    _readMuted() {
        try {
            return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
        } catch (error) {
            console.warn('No se pudo leer la preferencia de audio:', error);
            return false;
        }
    }

    _writeMuted() {
        try {
            window.localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted));
        } catch (error) {
            console.warn('No se pudo guardar la preferencia de audio:', error);
        }
    }

    async _ensureAmbience() {
        if (this.audioEl || !this.ambienceUrl) return;
        const audio = new Audio(this.ambienceUrl);
        audio.loop = true;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        this.audioEl = audio;
        const context = this.audioElContext();
        this.ambienceGain = context.createGain();
        context.createMediaElementSource(audio).connect(this.ambienceGain).connect(this.masterGain);
    }

    audioElContext() {
        if (!this._audioContext) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) throw new Error('El navegador no soporta Web Audio API.');
            this._audioContext = new Context();
            this.masterGain = this._audioContext.createGain();
            this.masterGain.connect(this._audioContext.destination);
        }
        return this._audioContext;
    }

    async _ensureSource(source) {
        if (source.audio) return;
        const audio = new Audio(source.url);
        // Una fuente con intervalSeconds canta a ratos: va sin bucle y _scheduleSong decide cuándo.
        audio.loop = !intervalOf(source) && source.loop !== false;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        const context = this.audioElContext();
        const panner = context.createPanner();
        // HRTF espacializa un canal: el audio entra en mono (docs/06 §C.5).
        panner.channelCount = 1;
        panner.channelCountMode = 'explicit';
        panner.channelInterpretation = 'speakers';
        panner.panningModel = 'HRTF';
        panner.distanceModel = source.distanceModel || 'inverse';
        panner.refDistance = Number.isFinite(source.refDistance) ? source.refDistance : 2;
        panner.maxDistance = Number.isFinite(source.maxDistance) ? source.maxDistance : 25;
        panner.rolloffFactor = Number.isFinite(source.rolloffFactor) ? source.rolloffFactor : 1;
        panner.positionX.value = source.anchor.x;
        panner.positionY.value = source.anchor.y;
        panner.positionZ.value = source.anchor.z;
        const gain = context.createGain();
        // Si ya suena un audio de ficha, la fuente nace atenuada.
        gain.gain.value = this.activeClips.size ? DUCKED_GAIN : 1;
        context.createMediaElementSource(audio).connect(panner).connect(gain).connect(this.masterGain);
        if (intervalOf(source)) {
            audio.addEventListener('ended', () => {
                if (source.active) this._scheduleSong(source, false);
            });
        }
        source.audio = audio;
        source.panner = panner;
        source.gain = gain;
    }

    _updateSources() {
        if (!this.started || this.muted || !this.camera || !this.sources.length) return;
        // Solo suenan las fuentes cuyo POI está en la escena abierta (anchor resuelto).
        const placed = this.sources.filter(source => this._resolveAnchor(source));
        if (!placed.length) return;
        this._updateListener();
        const cameraPosition = this.camera.getPosition();
        placed.forEach(source => {
            source.distance = Math.hypot(
                cameraPosition.x - source.anchor.x,
                cameraPosition.y - source.anchor.y,
                cameraPosition.z - source.anchor.z
            );
        });
        // RNF-016 limita las fuentes espaciales: ni el lecho ni los audios de la ficha, que
        // no son espaciales, descuentan del límite.
        const active = placed
            .filter(source => source.distance <= (source.maxDistance ?? 25))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, this._sourceLimit());
        const activeSet = new Set(active);
        this.sources.forEach(source => {
            source.wanted = activeSet.has(source);
            if (!source.wanted && source.active) this._deactivateSource(source);
        });
        active.forEach(source => {
            if (source.active || source.loading) return;
            source.loading = this._ensureSource(source)
                .then(() => {
                    if (!this.started || this.muted || !source.wanted) return;
                    this._activateSource(source);
                })
                .catch(error => console.warn(`No se pudo preparar la fuente ${source.id || source.url}:`, error))
                .finally(() => { source.loading = null; });
        });
        this._publishDiagnostics();
    }

    /**
     * La fuente entra en el conjunto activo. En bucle continuo suena de inmediato; con
     * intervalSeconds el primer canto sale tras un retardo al azar entre 0 y max.
     */
    _activateSource(source) {
        source.active = true;
        if (intervalOf(source)) {
            this._scheduleSong(source, true);
        } else {
            this._playSource(source);
        }
    }

    /** La fuente sale del conjunto activo: se cancela su temporizador y se pausa. */
    _deactivateSource(source) {
        clearTimeout(source.timer);
        source.timer = null;
        source.active = false;
        if (source.audio) {
            source.audio.pause();
        }
    }

    /**
     * Programa el siguiente canto: el primero entre 0 y max segundos; los demás, después de
     * terminar el anterior, entre min y max.
     */
    _scheduleSong(source, first) {
        const [min, max] = intervalOf(source);
        clearTimeout(source.timer);
        const seconds = first ? Math.random() * max : min + Math.random() * (max - min);
        source.timer = setTimeout(() => {
            source.timer = null;
            if (!source.active || !this.started || this.muted) return;
            this._playSource(source);
        }, seconds * 1000);
    }

    _playSource(source) {
        source.audio.currentTime = 0;
        source.audio.play().catch(error => {
            console.warn(`No se pudo reproducir la fuente ${source.id || source.url}:`, error);
        });
    }

    _updateListener() {
        if (!this._audioContext || !this.camera) return;
        const listener = this._audioContext.listener;
        const position = this.camera.getPosition();
        const forward = this.camera.forward;
        const up = this.camera.up;
        if (listener.positionX) {
            listener.positionX.value = position.x;
            listener.positionY.value = position.y;
            listener.positionZ.value = position.z;
            listener.forwardX.value = forward.x;
            listener.forwardY.value = forward.y;
            listener.forwardZ.value = forward.z;
            listener.upX.value = up.x;
            listener.upY.value = up.y;
            listener.upZ.value = up.z;
        } else {
            listener.setPosition(position.x, position.y, position.z);
            listener.setOrientation(
                forward.x, forward.y, forward.z,
                up.x, up.y, up.z
            );
        }
    }

    async resume() {
        if (!this.loaded) await this.load();
        if (this.muted) return;
        this.started = true;
        const context = this.audioElContext();
        if (context.state === 'suspended') await context.resume();
        await this._ensureAmbience();
        if (this.audioEl) await this.audioEl.play();
        this._updateSources();
        this._updateDucking();
    }

    async play() {
        return this.resume();
    }

    stop() {
        this.started = false;
        if (this.audioEl) {
            this.audioEl.pause();
            this.audioEl.currentTime = 0;
        }
        this.sources.forEach(source => {
            this._deactivateSource(source);
            source.wanted = false;
            if (source.audio) source.audio.currentTime = 0;
        });
        this.stopOwner();
    }

    toggle() {
        if (this.isPlaying()) {
            this.muted = true;
            this._writeMuted();
            this.stop();
            return;
        }
        this.muted = false;
        this._writeMuted();
        return this.resume();
    }

    isPlaying() {
        return !!(this.started && !this.muted && this.audioEl && !this.audioEl.paused && !this.audioEl.ended);
    }

    isMuted() {
        return this.muted;
    }

    _sourceLimit() {
        return Math.max(0, this.qualityProfile?.maxSpatialAudioSources ?? 0);
    }

    /**
     * Mientras suena un audio de ficha, el lecho y cada fuente espacial bajan a 0,25 para
     * que la voz se entienda; al terminar, vuelven a 1.
     */
    _updateDucking() {
        if (!this._audioContext) return;
        const target = this.activeClips.size ? DUCKED_GAIN : 1;
        const now = this._audioContext.currentTime;
        if (this.ambienceGain) {
            this.ambienceGain.gain.setTargetAtTime(target, now, 0.04);
        }
        this.sources.forEach(source => {
            if (source.gain) source.gain.gain.setTargetAtTime(target, now, 0.04);
        });
        this._publishDiagnostics(true);
    }

    _recordDiagnostic(message) {
        this.diagnostics.push({
            message,
            activeSources: this._activeSourceCount(),
            limit: this._sourceLimit()
        });
        if (this.diagnostics.length > 20) this.diagnostics.shift();
        this._publishDiagnostics(true);
    }

    /** Deja el diagnóstico en window.senderoAudioDiagnostics; desde el cuadro, a lo más cada 250 ms. */
    _publishDiagnostics(force = false) {
        if (typeof window === 'undefined') return;
        const now = performance.now();
        if (!force && now - this._diagnosticsAt < DIAGNOSTICS_EVERY_MS) return;
        this._diagnosticsAt = now;
        window.senderoAudioDiagnostics = this.getDiagnostics();
    }

    _stopClip(key) {
        const clip = this.activeClips.get(key);
        if (!clip) return;
        if (clip.audio) {
            clip.audio.pause();
            clip.audio.currentTime = 0;
        } else {
            try { clip.oscillator.stop(); } catch (error) {}
        }
        this.activeClips.delete(key);
        this._updateDucking();
    }

    _makeRoom(priority) {
        const limit = this._sourceLimit();
        const current = this._activeSourceCount();
        if (current < limit) return true;

        const candidates = [...this.activeClips.values()]
            .sort((a, b) => a.priority - b.priority);
        const candidate = candidates[0];
        if (candidate && candidate.priority <= priority) {
            this._stopClip(candidate.key);
            this._recordDiagnostic(`Fuente desplazada por ${candidate.key}.`);
            return true;
        }
        const spatial = this.sources.find(source => source.active);
        if (!candidate && spatial && priority > 1) {
            spatial.audio.pause();
            spatial.active = false;
            this._recordDiagnostic(`Fuente espacial desplazada por una fuente de prioridad ${priority}.`);
            return true;
        }
        if (!candidate || candidate.priority > priority) {
            this._recordDiagnostic('Fuente descartada por superar el límite de calidad.');
            return false;
        }
    }

    async playClip(key, url, {
        owner = 'global',
        priority = 2,
        loop = false,
        onEnded = null
    } = {}) {
        if (!url || this.muted) return false;
        if (!this.loaded) await this.load();
        if (!this.started) await this.resume();
        if (this.activeClips.has(key)) this._stopClip(key);
        if (!this._makeRoom(priority)) return false;

        const audio = new Audio(url);
        audio.loop = loop;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        const context = this.audioElContext();
        const gain = context.createGain();
        context.createMediaElementSource(audio).connect(gain).connect(this.masterGain);
        const clip = { key, owner, priority, audio };
        this.activeClips.set(key, clip);
        this._updateDucking();
        audio.addEventListener('ended', () => {
            if (this.activeClips.get(key) === clip) {
                this.activeClips.delete(key);
                this._updateDucking();
            }
            if (onEnded) onEnded();
        }, { once: true });

        try {
            await audio.play();
            return true;
        } catch (error) {
            this._stopClip(key);
            throw error;
        }
    }

    async playTone(key, frequency = 440, { owner = 'global', priority = 2 } = {}) {
        if (this.muted) return false;
        if (!this.started) await this.resume();
        if (this.activeClips.has(key)) this._stopClip(key);
        if (!this._makeRoom(priority)) return false;
        const context = this.audioElContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
        oscillator.connect(gain).connect(this.masterGain);
        const clip = { key, owner, priority, oscillator, audio: null };
        this.activeClips.set(key, clip);
        this._updateDucking();
        oscillator.addEventListener('ended', () => {
            if (this.activeClips.get(key) === clip) {
                this.activeClips.delete(key);
                this._updateDucking();
            }
        }, { once: true });
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
        return true;
    }

    stopClip(key) {
        this._stopClip(key);
    }

    stopOwner(owner) {
        for (const [key, clip] of this.activeClips) {
            if (!owner || clip.owner === owner) this._stopClip(key);
        }
    }

    isClipPlaying(key) {
        return this.activeClips.has(key);
    }

    getDiagnostics() {
        return {
            limit: this._sourceLimit(),
            active: this._activeSourceCount(),
            events: [...this.diagnostics],
            // Fuentes espaciales de la escena abierta (las que ya tienen posición).
            spatial: this.sources
                .filter(source => this._resolveAnchor(source))
                .map(source => ({
                    id: source.id,
                    poiId: source.poiId || null,
                    active: source.active,
                    distance: Number.isFinite(source.distance) ? Math.round(source.distance * 10) / 10 : null
                }))
        };
    }

    _activeSourceCount() {
        return this.activeClips.size
            + (this.audioEl && !this.audioEl.paused ? 1 : 0)
            + this.sources.filter(source => source.active).length;
    }
}
