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
import { TourState } from '../models/TourState.js';

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
        this.lookSensitivity = options.lookSensitivity ?? 0.2;
        this.pitchLimit = options.pitchLimit ?? 85;
        this.smoothing = options.smoothing ?? 12;
        // La escena activa puede no aguantar vistas en reversa; entonces solo se avanza.
        this.forwardOnly = options.forwardOnly ?? false;
        // Tope propio del picado hacia abajo: muy cerca del suelo el splatting se ve
        // como brochazos, y algunas escenas piden no dejar meter la camara ahi.
        this.pitchDownLimit = options.pitchDownLimit ?? this.pitchLimit;
        // Tope del giro de la cabeza respecto a la dirección del camino en el punto actual
        // (grados a cada lado). En tramos estrechos la reconstrucción solo vio el camino de
        // frente: girar más allá muestra la vegetación pegada al costado como agujas.
        this.yawLimit = Number.isFinite(options.yawLimit) ? options.yawLimit : null;
                // SW-17: desaceleración al acercarse a un punto de interés.
        this.poiSlowdownDistance = options.poiSlowdownDistance ?? 1.2;
        this.poiMinimumSpeedMultiplier =
            options.poiMinimumSpeedMultiplier ?? 0.35;
        this.poiAnchors = [];

        // distance, yaw, pitch y eyeHeight (desplazamiento vertical sobre el
        // trazado) viven en TourState (src/models/TourState.js).
        this.state = new TourState({ eyeHeight: options.eyeHeight ?? 0 });

        // Fuente opcional de métricas GPS. La distancia de escena se convierte
        // proporcionalmente a metros antes de consultar este modelo.
        this.gpsTrack = options.gpsTrack ?? null;

        this._input = { forward: 0, strafe: 0, fast: false };
        // Joystick en pantalla (celular): ejes analógicos de -1 a 1, aparte de _input para
        // que soltar el dedo que mira (touchend del canvas) no apague el avance del pulgar.
        this._stick = { forward: 0, strafe: 0 };
        // Teclado (W A S D, flechas) y dos dedos: también relativos a la vista.
        this._teclas = { forward: 0, strafe: 0 };
        this._lookPointer = null;
        // Punto de arranque sobre el trazado, recortado a su largo.
        const largo = this.trailPath.isUsable ? this.trailPath.totalLength() : 0;
        this.state.distance = Math.max(0, Math.min(Number(options.startDistance) || 0, largo));
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

    setPoiAnchors(pois = []) {
        if (!Array.isArray(pois)) {
            this.poiAnchors = [];
            return;
        }

        this.poiAnchors = pois
            .map((poi) => Number(poi?.trailAnchor?.d))
            .filter(
                (distance) =>
                    Number.isFinite(distance) && distance >= 0
            )
            .sort((a, b) => a - b);
    }

    _getPoiSpeedMultiplier() {
        if (this.poiAnchors.length === 0) return 1;

        const currentDistance = this.state.distance;

        const nextPoiDistance = this.poiAnchors.find(
            (distance) => distance >= currentDistance
        );

        if (!Number.isFinite(nextPoiDistance)) return 1;

        const distanceToPoi =
            nextPoiDistance - currentDistance;

        if (distanceToPoi >= this.poiSlowdownDistance) {
            return 1;
        }

        const progress = Math.max(
            0,
            Math.min(
                1,
                distanceToPoi / this.poiSlowdownDistance
            )
        );

        return (
            this.poiMinimumSpeedMultiplier +
            (1 - this.poiMinimumSpeedMultiplier) * progress
        );
    }


    start() {
        if (this._enabled || !this.trailPath.isUsable) return false;
        this._enabled = true;

        // Orientación inicial: mirando hacia donde avanza el sendero en el punto de arranque.
        this.trailPath.directionAt(this.state.distance, this._dir);
        this.state.yaw = Math.atan2(-this._dir.x, -this._dir.z) / RAD;

        this.trailPath.positionAt(this.state.distance, this._currentPos);
        this._currentPos.y += this.state.eyeHeight;
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
        this.state.eyeHeight = Math.round(value * 100) / 100;
        this.app.fire('tour:eyeheight', this.state.eyeHeight);
    }

    /**
     * Guarda el estado para restaurarlo al cerrar una ficha (RF-018).
     * Solo distance/yaw/pitch, igual que antes de pasar por TourState: eyeHeight
     * no viaja aqui porque PoiManager no detiene el tour al abrir una ficha, y
     * los atajos de teclado que la cambian (r/f) siguen activos con la ficha
     * abierta. Restaurarla tambien seria un cambio de comportamiento nuevo.
     */
    saveState() {
        const { distance, yaw, pitch } = this.state.getState();
        return { distance, yaw, pitch };
    }

    restoreState(state) {
        if (!state) return;
        this.state.distance = state.distance;
        this.state.yaw = state.yaw;
        this.state.pitch = state.pitch;
    }

    _bindInput() {
        const canvas = this.app.graphicsDevice.canvas;

        // Teclado: relativo a la vista, igual que el joystick (W hacia donde se mira).
        this._keyDown = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') this._teclas.forward = 1;
            if (k === 's' || k === 'arrowdown') this._teclas.forward = -1;
            if (k === 'a' || k === 'arrowleft') this._teclas.strafe = -1;
            if (k === 'd' || k === 'arrowright') this._teclas.strafe = 1;
            if (e.shiftKey) this._input.fast = true;
            // Calibrar la altura de los ojos en vivo: la escala de cada escena
            // es distinta y hay que verla para acertar.
            if (k === 'r') this.setEyeHeight(this.state.eyeHeight + 0.15);
            if (k === 'f') this.setEyeHeight(this.state.eyeHeight - 0.15);
        };
        this._keyUp = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup' || k === 's' || k === 'arrowdown') this._teclas.forward = 0;
            if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') this._teclas.strafe = 0;
            if (!e.shiftKey) this._input.fast = false;
        };
        // Solo mira el puntero que se apoyó en la escena: el pulgar sobre el joystick
        // también genera pointermove en window y no debe girar la vista.
        this._pointerDown = (e) => { this._looking = true; this._lookPointer = e.pointerId; };
        this._pointerUp = (e) => {
            if (e.pointerId !== this._lookPointer) return;
            this._looking = false;
            this._lookPointer = null;
        };
        this._pointerMove = (e) => {
            if (!this._looking || e.pointerId !== this._lookPointer) return;
            this.state.yaw -= e.movementX * this.lookSensitivity;
            this.state.pitch -= e.movementY * this.lookSensitivity;
            this.state.pitch = Math.max(-this.pitchDownLimit, Math.min(this.pitchLimit, this.state.pitch));
        };
        // Táctil: un dedo mira, dos dedos avanzan. Se cuentan solo los dedos sobre la
        // escena (targetTouches): el pulgar del joystick no suma un segundo dedo.
        this._touchStart = (e) => {
            const dedos = e.targetTouches;
            if (dedos.length === 1) { this._looking = true; this._lastTouch = dedos[0]; }
            if (dedos.length === 2) this._teclas.forward = 1;   // dos dedos: hacia donde se mira
        };
        this._touchMove = (e) => {
            const dedos = e.targetTouches;
            if (!this._looking || dedos.length !== 1) return;
            const t = dedos[0];
            if (this._lastTouch) {
                this.state.yaw -= (t.clientX - this._lastTouch.clientX) * this.lookSensitivity;
                this.state.pitch -= (t.clientY - this._lastTouch.clientY) * this.lookSensitivity;
                this.state.pitch = Math.max(-this.pitchDownLimit, Math.min(this.pitchLimit, this.state.pitch));
            }
            this._lastTouch = { clientX: t.clientX, clientY: t.clientY };
        };
        this._touchEnd = () => { this._looking = false; this._lastTouch = null; this._teclas.forward = 0; };

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
        // Cinturón extra para cualquier entrada (táctil incluida) cuando no hay reversa.
        if (this.forwardOnly && this._input.forward < 0) this._input.forward = 0;
        // Las flechas del camino (press) mandan y son relativas al sendero. Si no hay,
        // el teclado (o dos dedos) y si tampoco, el joystick: los dos relativos a la vista.
        let avance = this._input.forward;
        let lateral = this._input.strafe;
        if (!avance && !lateral) {
            const v = (this._teclas.forward || this._teclas.strafe) ? this._teclas : this._stick;
            if (v.forward || v.strafe) ({ avance, lateral } = this._haciaLaVista(v.forward, v.strafe));
        }
        if (this.forwardOnly && avance < 0) avance = 0;
        if (avance !== 0) {
            const baseSpeed =
    this.speed * (this._input.fast ? this.fastMultiplier : 1);

// SW-17: desacelerar únicamente al avanzar hacia un POI.
// Si el usuario retrocede, conserva la velocidad normal.
const poiMultiplier =
    avance > 0
        ? this._getPoiSpeedMultiplier()
        : 1;

const speed = baseSpeed * poiMultiplier;

this.state.distance += avance * speed * dt;
            // El recorte a los extremos lo hace positionAt: no se sale del tramo.
            this.state.distance = Math.max(0, Math.min(this.state.distance, this.trailPath.totalLength()));
            this._emitProgress();
        }
        if (lateral !== 0) {
            const r = this.trailPath.corridorRadius;
            this.lateral += lateral * this.strafeSpeed * dt;
            this.lateral = Math.max(-r, Math.min(r, this.lateral));   // el margen del corredor
        }

        // La posición SIEMPRE sale del trazado más el margen lateral permitido: es RF-004.
        this.trailPath.positionAt(this.state.distance, this._targetPos);
        if (this.lateral !== 0) {
            this.trailPath.directionAt(this.state.distance, this._dir);
            // Perpendicular horizontal al avance.
            this._targetPos.x += -this._dir.z * this.lateral;
            this._targetPos.z += this._dir.x * this.lateral;
        }
        this._targetPos.y += this.state.eyeHeight;

        if (this.yawLimit !== null) this._recortarGiro();

        const t = Math.min(1, this.smoothing * dt);
        this._currentPos.lerp(this._currentPos, this._targetPos, t);
        this.camera.setPosition(this._currentPos);
        this.camera.setEulerAngles(this.state.pitch, this.state.yaw, 0);
    }

    /** Control desde los botones en pantalla: 'forward'|'back'|'left'|'right'. */
    press(action) {
        if (action === 'forward') this._input.forward = 1;
        if (action === 'back') this._input.forward = this.forwardOnly ? 0 : -1;
        if (action === 'left') this._input.strafe = -1;
        if (action === 'right') this._input.strafe = 1;
    }

    release(action) {
        if (action === 'forward' || action === 'back') this._input.forward = 0;
        if (action === 'left' || action === 'right') this._input.strafe = 0;
    }

    /** Deja la vista a ±yawLimit grados de la dirección del camino en el punto actual. */
    _recortarGiro() {
        this.trailPath.directionAt(this.state.distance, this._dir);
        const camino = Math.atan2(-this._dir.x, -this._dir.z) / RAD;
        const rel = ((this.state.yaw - camino) % 360 + 540) % 360 - 180;   // de -180 a 180
        const tope = this.yawLimit;
        if (rel > tope) this.state.yaw = camino + tope;
        else if (rel < -tope) this.state.yaw = camino - tope;
    }

    /**
     * Teclado y joystick mueven hacia donde mira el visitante: adelante es la
     * dirección de la vista y los lados su derecha e izquierda. Como la posición
     * siempre sale del trazado (RF-004), ese movimiento se lleva al camino:
     *   - avance: a velocidad completa por el sendero, en el sentido hacia el que
     *     se mira (de regreso si se mira hacia atrás). Solo cuando la vista queda
     *     casi de través al camino (a menos de ~17 grados de la perpendicular) baja
     *     de forma continua hasta 0, para no saltar de un sentido al otro.
     *   - lateral: la parte de lado de la mirada, que _update recorta al corredor.
     */
    _haciaLaVista(adelante, derecha) {
        const y = this.state.yaw * RAD;
        // Vista y derecha horizontales de la cámara (misma convención que start()).
        const fx = -Math.sin(y), fz = -Math.cos(y);
        const rx = Math.cos(y), rz = -Math.sin(y);
        let mx = adelante * fx + derecha * rx;
        let mz = adelante * fz + derecha * rz;
        const norma = Math.hypot(mx, mz);
        if (norma === 0) return { avance: 0, lateral: 0 };
        const fuerza = Math.min(1, norma);
        mx /= norma; mz /= norma;
        this.trailPath.directionAt(this.state.distance, this._dir);
        const largo = Math.hypot(this._dir.x, this._dir.z) || 1;
        const tx = this._dir.x / largo, tz = this._dir.z / largo;
        const along = mx * tx + mz * tz;             // coseno con el camino
        const side = mx * -tz + mz * tx;             // derecha del avance, la perpendicular de _update
        const pleno = Math.min(1, Math.abs(along) / 0.3);
        return { avance: Math.sign(along) * fuerza * pleno, lateral: side * fuerza };
    }

    /**
     * Joystick en pantalla: ejes analógicos de -1 a 1 en el marco de la vista
     * (forward = hacia donde se mira, strafe = a la derecha de la vista).
     * El corredor y forwardOnly se aplican en _update igual que con el teclado.
     */
    setStick(forward = 0, strafe = 0) {
        const recortar = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
        this._stick.forward = recortar(forward);
        this._stick.strafe = recortar(strafe);
    }

    _emitProgress() {
        const pos = this.camera.getPosition();
        const sceneTotal = this.trailPath.totalLength();
        const gpsTotal = this.gpsTrack?.totalDistance() ?? 0;
        const gpsDistance =
            sceneTotal > 0
                ? (this.state.distance / sceneTotal) * gpsTotal
                : 0;
        const distanceMeters =
            this.gpsTrack?.points.length
                ? this.gpsTrack.distanceTraveled(gpsDistance)
                : null;
        const totalDistanceMeters =
            this.gpsTrack?.points.length
                ? gpsTotal
                : null;
        const distanceRemainingMeters =
            distanceMeters === null
                ? null
                : this.gpsTrack.distanceRemaining(distanceMeters);
        const altitudeMeters =
            distanceMeters === null
                ? null
                : this.gpsTrack.altitudeAt(distanceMeters);
        const elevationGainMeters =
            distanceMeters === null
                ? null
                : this.gpsTrack.cumulativeElevation(distanceMeters);
        const slopePercent =
            distanceMeters === null
                ? null
                : this.gpsTrack.slopeAt(distanceMeters);
        this.app.fire('tour:progress', {
            distance: this.state.distance,
            total: sceneTotal,
            distanceMeters,
            totalDistanceMeters,
            distanceRemainingMeters,
            altitudeMeters,
            elevationGainMeters,
            slopePercent,
            // Posición y orientación para quien las necesite: audio espacial, POIs por
            // cercanía, HUD. Se publican aquí para que ningún otro módulo tenga que leer
            // la cámara, que es lo que prohíbe el invariante 13.
            position: { x: pos.x, y: pos.y, z: pos.z },
            yaw: this.state.yaw,
            pitch: this.state.pitch
        });
    }
}
