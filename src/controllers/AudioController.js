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
        this._audioContext = null;
        this.masterGain = null;
        this.ambienceGain = null;
        this.sources = [];
        this.activeClips = new Map();
        this.diagnostics = [];
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
        context.createMediaElementSource(audio).connect(panner).connect(gain).connect(this.masterGain);
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
        const limit = this._sourceLimit();
        const active = this.sources
            .filter(source => source.distance <= (source.maxDistance ?? 25))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, Math.max(0, limit - this.activeClips.size - (this.audioEl && !this.audioEl.paused ? 1 : 0)));
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
            if (source.audio) {
                source.audio.pause();
                source.audio.currentTime = 0;
                source.active = false;
            }
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

    _updateDucking() {
        if (!this.ambienceGain || !this._audioContext) return;
        const target = this.activeClips.size ? 0.25 : 1;
        this.ambienceGain.gain.setTargetAtTime(target, this._audioContext.currentTime, 0.04);
        if (typeof window !== 'undefined') {
            window.senderoAudioDiagnostics = this.getDiagnostics();
        }
    }

    _recordDiagnostic(message) {
        this.diagnostics.push({
            message,
            activeSources: this._activeSourceCount(),
            limit: this._sourceLimit()
        });
        if (this.diagnostics.length > 20) this.diagnostics.shift();
        if (typeof window !== 'undefined') {
            window.senderoAudioDiagnostics = this.getDiagnostics();
        }
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
            events: [...this.diagnostics]
        };
    }

    _activeSourceCount() {
        return this.activeClips.size
            + (this.audioEl && !this.audioEl.paused ? 1 : 0)
            + this.sources.filter(source => source.active).length;
    }
}
