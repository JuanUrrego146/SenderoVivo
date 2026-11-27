// Sonido de la versión 2: el canto de la ficha, los cantos de las aves cerca de la parada y el
// ambiente del sendero, con los mismos archivos de la versión 1 (config/soundscape.json).
//
// Ofrece lo que la ficha compartida (src/views/PoiCardView.js) le pide al controlador de audio:
// playClip, isClipPlaying, stopClip y stopOwner.
//
// Cantos: cada ave suena a ratos (intervalSeconds de su fuente) cuando la parada actual está a dos
// paradas o menos de la suya, más fuerte cuanto más cerca, y se oye del lado en que está respecto a
// hacia dónde se mira (panorámica estéreo). Con la ficha abierta, los cantos y el ambiente bajan.
//
// ?silencio=1 en la dirección deja todo mudo desde que carga (para probar sin molestar a nadie).

const CLAVE_MUDO = 'sendero.v2.mudo';
const VOLUMEN_AMBIENTE = 0.25;

export class Sonido {
    constructor(fuentes, ambienteUrl) {
        this.fuentes = fuentes;            // [{poiId, url, intervalSeconds}]
        this.ambienteUrl = ambienteUrl;
        this.forzadoMudo = new URLSearchParams(location.search).has('silencio');
        this.mudo = this.forzadoMudo || localStorage.getItem(CLAVE_MUDO) === '1';
        this.ctx = null;
        this.clips = new Map();            // clave -> {audio, owner}
        this.cercanas = [];                // [{fuente, rumbo, ganancia}]
        this.mirada = 0;                   // rumbo de la vista, en radianes
        this.temporizadores = new Map();
        this.ficha = false;
    }

    // El navegador solo deja sonar después de un gesto de la persona.
    async despertar() {
        if (this.forzadoMudo) return;
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.maestro = this.ctx.createGain();
            this.maestro.gain.value = this.mudo ? 0 : 1;
            this.maestro.connect(this.ctx.destination);
            this.fondo = this.ctx.createGain();
            this.fondo.connect(this.maestro);
            this._iniciarAmbiente();
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();
    }

    alternarMudo() {
        if (this.forzadoMudo) return true;
        this.mudo = !this.mudo;
        localStorage.setItem(CLAVE_MUDO, this.mudo ? '1' : '0');
        if (this.maestro) this.maestro.gain.setTargetAtTime(this.mudo ? 0 : 1, this.ctx.currentTime, 0.1);
        return this.mudo;
    }

    _iniciarAmbiente() {
        if (!this.ambienteUrl) return;
        const audio = new Audio(this.ambienteUrl);
        audio.loop = true;
        const g = this.ctx.createGain();
        g.gain.value = VOLUMEN_AMBIENTE;
        this.ctx.createMediaElementSource(audio).connect(g).connect(this.fondo);
        audio.play().catch(() => {});
        this.ambiente = audio;
    }

    // ----- Lo que usa la ficha -----
    async playClip(key, url, { owner = 'global', onEnded = null } = {}) {
        if (!url || this.forzadoMudo) return false;
        await this.despertar();
        this.stopClip(key);
        const audio = new Audio(url);
        this.ctx.createMediaElementSource(audio).connect(this.maestro);
        const clip = { audio, owner };
        this.clips.set(key, clip);
        audio.addEventListener('ended', () => {
            if (this.clips.get(key) === clip) this.clips.delete(key);
            if (onEnded) onEnded();
        }, { once: true });
        await audio.play();
        return true;
    }

    isClipPlaying(key) {
        const c = this.clips.get(key);
        return Boolean(c && !c.audio.paused);
    }

    stopClip(key) {
        const c = this.clips.get(key);
        if (!c) return;
        c.audio.pause();
        this.clips.delete(key);
    }

    stopOwner(owner) {
        for (const [k, c] of this.clips) if (c.owner === owner) this.stopClip(k);
    }

    // ----- Ficha abierta: baja cantos y ambiente -----
    fichaAbierta(abierta) {
        this.ficha = abierta;
        if (this.fondo) this.fondo.gain.setTargetAtTime(abierta ? 0.15 : 1, this.ctx.currentTime, 0.2);
    }

    // ----- Cantos espaciales -----
    // cercanas: [{poiId, rumbo (rad, en el panorama actual), distancia (paradas)}]
    ponerCercanas(cercanas) {
        const activas = new Set(cercanas.map(c => c.poiId));
        for (const [id, t] of this.temporizadores) {
            if (!activas.has(id)) { clearTimeout(t); this.temporizadores.delete(id); }
        }
        this.cercanas = cercanas.map(c => ({ ...c, fuente: this.fuentes.find(f => f.poiId === c.poiId) }))
            .filter(c => c.fuente);
        for (const c of this.cercanas) {
            if (!this.temporizadores.has(c.poiId)) this._programar(c.poiId, true);
        }
    }

    mirarHacia(yaw) {
        this.mirada = yaw;
    }

    _programar(poiId, primero) {
        const c = this.cercanas.find(x => x.poiId === poiId);
        if (!c) return;
        const [a, b] = c.fuente.intervalSeconds || [10, 25];
        const espera = (primero ? 1.5 + Math.random() * 3 : a + Math.random() * (b - a)) * 1000;
        this.temporizadores.set(poiId, setTimeout(() => {
            this._cantar(poiId);
            this._programar(poiId, false);
        }, espera));
    }

    _cantar(poiId) {
        if (!this.ctx || this.mudo || this.forzadoMudo || document.hidden) return;
        const c = this.cercanas.find(x => x.poiId === poiId);
        if (!c) return;
        const audio = new Audio(c.fuente.url);
        const g = this.ctx.createGain();
        g.gain.value = [1, 0.5, 0.25][Math.min(2, c.distancia)];
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, Math.sin(c.rumbo - this.mirada)));
        this.ctx.createMediaElementSource(audio).connect(g).connect(p).connect(this.fondo);
        audio.play().catch(() => {});
    }
}
