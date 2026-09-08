// Minimal AmbienceController
// - Loads config/soundscape.json
// - Uses an HTMLAudioElement for the ambient stereo bed (non-positional)
// - Exposes load(), play(), stop(), toggle(), isPlaying()

export default class AmbienceController {
    constructor(app, soundscapePath = 'config/soundscape.json') {
        this.app = app; // kept for potential future use
        this.soundscapePath = soundscapePath;
        this.ambienceUrl = null;
        this.ambienceNote = '';
        this.audioEl = null;
        this.loaded = false; // true when ambienceUrl is known
    }

    async load() {
        // Only fetch the config and record the URL/note. Do NOT create audio or AudioContext here.
        const res = await fetch(this.soundscapePath);
        if (!res.ok) throw new Error(`Failed to fetch ${this.soundscapePath}: ${res.status}`);
        const cfg = await res.json();

        this.ambienceUrl = cfg?.ambienceUrl || null;
        this.ambienceNote = cfg?.ambienceNote || '';
        this.loaded = true;
        return cfg;
    }

    async _ensureAudioElement() {
        if (this.audioEl || !this.ambienceUrl) return;
        const audio = new Audio();
        audio.src = this.ambienceUrl;
        audio.loop = true;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        this.audioEl = audio;
    }

    async play() {
        if (!this.loaded) await this.load();
        if (!this.ambienceUrl) return;
        try {
            await this._ensureAudioElement();
            await this.audioEl.play();
        } catch (e) {
            console.warn('AmbienceController.play() failed:', e);
        }
    }

    stop() {
        if (this.audioEl) {
            try {
                this.audioEl.pause();
                this.audioEl.currentTime = 0;
            } catch (e) {
                console.warn('AmbienceController.stop() failed:', e);
            }
        }
    }

    toggle() {
        if (this.isPlaying()) this.stop(); else this.play();
    }

    isPlaying() {
        return !!(this.audioEl && !this.audioEl.paused && !this.audioEl.ended);
    }

}
