/*
 * TourEngine — el motor del recorrido guiado.
 *
 * Mueve la cámara dentro del CORREDOR del trazado (RF-004) y deja la mirada
 * libre en 360° (RF-005). El visitante avanza, retrocede y puede desplazarse
 * un poco a los lados para acercarse a mirar algo, pero nunca sale del camino
 * autorizado: el corredor es un margen, no una vía rígida.
 *
 * Invariante 1 del proyecto: la cámara la mueve únicamente este módulo.
 * Invariante 13: publica el evento 'tour:progress' con distanceMeters; los
 * demás módulos escuchan ese evento en vez de leer la cámara.
 */
import { Vec3 } from 'playcanvas';

const RAD = Math.PI / 180;

export class TourEngine {
    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('playcanvas').Entity} camera
     * @param {import('./TrailPath.js').TrailPath} trailPath
     * @param {object} [options]
     */
    constructor(app, camera, trailPath, options = {}) {
        this.app = app;
        this.camera = camera;
        this.trailPath = trailPath;

        this.speed = options.speed ?? 1.2;          // unidades por segundo
        this.fastMultiplier = options.fastMultiplier ?? 3;
        this.eyeHeight = options.eyeHeight ?? 0;    // desplazamiento vertical sobre el trazado
        this.lookSensitivity = options.lookSensitivity ?? 0.2;
        this.pitchLimit = options.pitchLimit ?? 85;
        this.smoothing = options.smoothing ?? 12;

        this.distance = 0;
        this.yaw = 0;
        this.pitch = 0;

        this._input = { forward: 0, strafe: 0, fast: false };
        /** Desplazamiento lateral actual dentro del corredor. */
        this.lateral = 0;
        this.strafeSpeed = options.strafeSpeed ?? 0.8;
        this._looking = false;
        this._targetPos = new Vec3();
        this._currentPos = new Vec3();
        this._dir = new Vec3();
        this._enabled = false;

        this._onUpdate = this._update.bind(this);
    }

    start() {
        if (this._enabled || !this.trailPath.isUsable) return false;
        this._enabled = true;

        // Orientación inicial: mirando hacia donde avanza el sendero.
        this.trailPath.directionAt(0, this._dir);
        this.yaw = Math.atan2(-this._dir.x, -this._dir.z) / RAD;

        this.trailPath.positionAt(this.distance, this._currentPos);
        this._currentPos.y += this.eyeHeight;
        this.camera.setPosition(this._currentPos);

        this._bindInput();
        this.app.on('update', this._onUpdate);
        this._emitProgress();
        return true;
    }

    stop() {
        if (!this._enabled) return;
        this._enabled = false;
        this.app.off('update', this._onUpdate);
        this._unbindInput();
    }

    /** Ajusta la altura de los ojos y lo publica para el HUD. */
    setEyeHeight(value) {
        this.eyeHeight = Math.round(value * 100) / 100;
        this.app.fire('tour:eyeheight', this.eyeHeight);
    }

    /** Guarda el estado para restaurarlo al cerrar una ficha (RF-018). */
    saveState() {
        return { distance: this.distance, yaw: this.yaw, pitch: this.pitch };
    }

    restoreState(state) {
        if (!state) return;
        this.distance = state.distance;
        this.yaw = state.yaw;
        this.pitch = state.pitch;
    }

    _bindInput() {
        const canvas = this.app.graphicsDevice.canvas;

        this._keyDown = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') this._input.forward = 1;
            if (k === 's' || k === 'arrowdown') this._input.forward = -1;
            if (k === 'a' || k === 'arrowleft') this._input.strafe = -1;
            if (k === 'd' || k === 'arrowright') this._input.strafe = 1;
            if (e.shiftKey) this._input.fast = true;
            // Calibrar la altura de los ojos en vivo: la escala de cada escena
            // es distinta y hay que verla para acertar.
            if (k === 'r') this.setEyeHeight(this.eyeHeight + 0.15);
            if (k === 'f') this.setEyeHeight(this.eyeHeight - 0.15);
        };
        this._keyUp = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup' || k === 's' || k === 'arrowdown') this._input.forward = 0;
            if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') this._input.strafe = 0;
            if (!e.shiftKey) this._input.fast = false;
        };
        this._pointerDown = () => { this._looking = true; };
        this._pointerUp = () => { this._looking = false; };
        this._pointerMove = (e) => {
            if (!this._looking) return;
            this.yaw -= e.movementX * this.lookSensitivity;
            this.pitch -= e.movementY * this.lookSensitivity;
            this.pitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.pitch));
        };
        // Táctil: un dedo mira, dos dedos avanzan.
        this._touchStart = (e) => {
            if (e.touches.length === 1) { this._looking = true; this._lastTouch = e.touches[0]; }
            if (e.touches.length === 2) this._input.forward = 1;
        };
        this._touchMove = (e) => {
            if (!this._looking || e.touches.length !== 1) return;
            const t = e.touches[0];
            if (this._lastTouch) {
                this.yaw -= (t.clientX - this._lastTouch.clientX) * this.lookSensitivity;
                this.pitch -= (t.clientY - this._lastTouch.clientY) * this.lookSensitivity;
                this.pitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.pitch));
            }
            this._lastTouch = { clientX: t.clientX, clientY: t.clientY };
        };
        this._touchEnd = () => { this._looking = false; this._lastTouch = null; this._input.forward = 0; };

        window.addEventListener('keydown', this._keyDown);
        window.addEventListener('keyup', this._keyUp);
        canvas.addEventListener('pointerdown', this._pointerDown);
        window.addEventListener('pointerup', this._pointerUp);
        window.addEventListener('pointermove', this._pointerMove);
        canvas.addEventListener('touchstart', this._touchStart, { passive: true });
        canvas.addEventListener('touchmove', this._touchMove, { passive: true });
        canvas.addEventListener('touchend', this._touchEnd, { passive: true });
    }

    _unbindInput() {
        const canvas = this.app.graphicsDevice.canvas;
        window.removeEventListener('keydown', this._keyDown);
        window.removeEventListener('keyup', this._keyUp);
        canvas.removeEventListener('pointerdown', this._pointerDown);
        window.removeEventListener('pointerup', this._pointerUp);
        window.removeEventListener('pointermove', this._pointerMove);
        canvas.removeEventListener('touchstart', this._touchStart);
        canvas.removeEventListener('touchmove', this._touchMove);
        canvas.removeEventListener('touchend', this._touchEnd);
    }

    _update(dt) {
        if (this._input.forward !== 0) {
            const speed = this.speed * (this._input.fast ? this.fastMultiplier : 1);
            this.distance += this._input.forward * speed * dt;
            // El recorte a los extremos lo hace positionAt: no se sale del tramo.
            this.distance = Math.max(0, Math.min(this.distance, this.trailPath.totalLength()));
            this._emitProgress();
        }
        if (this._input.strafe !== 0) {
            const r = this.trailPath.corridorRadius;
            this.lateral += this._input.strafe * this.strafeSpeed * dt;
            this.lateral = Math.max(-r, Math.min(r, this.lateral));   // el margen del corredor
        }

        // La posición SIEMPRE sale del trazado más el margen lateral permitido: es RF-004.
        this.trailPath.positionAt(this.distance, this._targetPos);
        if (this.lateral !== 0) {
            this.trailPath.directionAt(this.distance, this._dir);
            // Perpendicular horizontal al avance.
            this._targetPos.x += -this._dir.z * this.lateral;
            this._targetPos.z += this._dir.x * this.lateral;
        }
        this._targetPos.y += this.eyeHeight;

        const t = Math.min(1, this.smoothing * dt);
        this._currentPos.lerp(this._currentPos, this._targetPos, t);
        this.camera.setPosition(this._currentPos);
        this.camera.setEulerAngles(this.pitch, this.yaw, 0);
    }

    /** Control desde los botones en pantalla: 'forward'|'back'|'left'|'right'. */
    press(action) {
        if (action === 'forward') this._input.forward = 1;
        if (action === 'back') this._input.forward = -1;
        if (action === 'left') this._input.strafe = -1;
        if (action === 'right') this._input.strafe = 1;
    }

    release(action) {
        if (action === 'forward' || action === 'back') this._input.forward = 0;
        if (action === 'left' || action === 'right') this._input.strafe = 0;
    }

    _emitProgress() {
        const pos = this.camera.getPosition();
        this.app.fire('tour:progress', {
            distance: this.distance,
            total: this.trailPath.totalLength(),
            // distanceMeters lo completará TrailDataLayer cuando exista la escala real.
            distanceMeters: null,
            // Posición y orientación para quien las necesite: audio espacial, POIs por
            // cercanía, HUD. Se publican aquí para que ningún otro módulo tenga que leer
            // la cámara, que es lo que prohíbe el invariante 13.
            position: { x: pos.x, y: pos.y, z: pos.z },
            yaw: this.yaw,
            pitch: this.pitch
        });
    }
}
