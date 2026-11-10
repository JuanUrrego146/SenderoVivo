import { Soundscape } from '../models/Soundscape.js';

const MUTE_STORAGE_KEY = 'sendero.audioMuted';

function isPosition(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
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
        this.ambienceGain = null;
        this.sources = [];
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
        this.sources = this.soundscape.getSources()
            .filter(source => isPosition(source.anchor) && source.url)
            .map(source => ({
                ...source,
                distance: Infinity,
                audio: null,
                panner: null,
                gain: null,
                loading: null,
                active: false
            }));
        this.loaded = true;
        return config;
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
        context.createMediaElementSource(audio).connect(this.ambienceGain).connect(context.destination);
    }

    audioElContext() {
        if (!this._audioContext) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) throw new Error('El navegador no soporta Web Audio API.');
            this._audioContext = new Context();
        }
        return this._audioContext;
    }

    async _ensureSource(source) {
        if (source.audio) return;
        const audio = new Audio(source.url);
        audio.loop = source.loop !== false;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        const context = this.audioElContext();
        const panner = context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = source.distanceModel || 'inverse';
        panner.refDistance = Number.isFinite(source.refDistance) ? source.refDistance : 2;
        panner.maxDistance = Number.isFinite(source.maxDistance) ? source.maxDistance : 25;
        panner.rolloffFactor = Number.isFinite(source.rolloffFactor) ? source.rolloffFactor : 1;
        panner.positionX.value = source.anchor.x;
        panner.positionY.value = source.anchor.y;
        panner.positionZ.value = source.anchor.z;
        const gain = context.createGain();
        context.createMediaElementSource(audio).connect(panner).connect(gain).connect(context.destination);
        source.audio = audio;
        source.panner = panner;
        source.gain = gain;
    }

    _updateSources() {
        if (!this.started || this.muted || !this.camera || !this.sources.length) return;
        this._updateListener();
        const cameraPosition = this.camera.getPosition();
        this.sources.forEach(source => {
            source.distance = Math.hypot(
                cameraPosition.x - source.anchor.x,
                cameraPosition.y - source.anchor.y,
                cameraPosition.z - source.anchor.z
            );
        });
        const limit = this.qualityProfile?.maxSpatialAudioSources ?? 0;
        const active = this.sources
            .filter(source => source.distance <= (source.maxDistance ?? 25))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
        const activeSet = new Set(active);
        this.sources.forEach(source => {
            if (!source.audio) return;
            if (!activeSet.has(source) && source.active) {
                source.audio.pause();
                source.active = false;
            }
        });
        active.forEach(source => {
            if (source.loading) return;
            source.loading = this._ensureSource(source)
                .then(() => {
                    if (!this.started || this.muted || !activeSet.has(source)) return;
                    source.audio.play().then(() => { source.active = true; }).catch(error => {
                        console.warn(`No se pudo reproducir la fuente ${source.id || source.url}:`, error);
                    });
                })
                .catch(error => console.warn(`No se pudo preparar la fuente ${source.id || source.url}:`, error))
                .finally(() => { source.loading = null; });
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
            if (source.audio) {
                source.audio.pause();
                source.audio.currentTime = 0;
                source.active = false;
            }
        });
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
}
