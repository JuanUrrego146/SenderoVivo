/*
 * TourEngine — el motor del recorrido.
 *
 * Movimiento libre, como un juego en primera persona: W camina hacia donde se mira, S hacia
 * atrás, A y D de lado, y en diagonal se combinan. El ratón (arrastrar) y un dedo miran, y la
 * vista solo la mueve el visitante: el motor nunca la gira ni la endereza (RF-005). El
 * espacio para caminar es el CORREDOR del trazado (RF-004): dentro de él se camina libre y
 * contra su borde se resbala, sin salir del sendero.
 *
 * La posición se guarda como una distancia sobre el trazado (state.distance) más un
 * desplazamiento lateral, para que el corredor, el progreso, los POI, el audio y los
 * extremos sigan funcionando. La cámara va a la altura de los ojos sobre la curva suave del
 * trazado (TrailModel.smoothPositionAt), sin los saltitos de la línea quebrada.
 *
 * Las flechas del camino y el botón «Siguiente punto» son una ayuda opcional: llevan hasta
 * la PARADA siguiente (step) sin girar la vista; cualquier tecla o el joystick cancelan ese
 * viaje y mandan ellos.
 *
 * Invariante 1 del proyecto: la cámara la mueve únicamente este módulo.
 * Invariante 13: publica el evento 'tour:progress' con distanceMeters; los
 * demás módulos escuchan ese evento en vez de leer la cámara.
 */
import { Vec3 } from 'playcanvas';
import { TourState } from '../models/TourState.js';

const RAD = Math.PI / 180;
const envolver = (a) => ((a % 360) + 540) % 360 - 180;
const suave = (x) => {
    const t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
};

export class TourEngine {
    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('playcanvas').Entity} camera
     * @param {import('../models/TrailModel.js').TrailModel} trailPath
     * @param {object} [options]
     */
    constructor(app, camera, trailPath, options = {}) {
        this.app = app;
        this.camera = camera;
        this.trailPath = trailPath;

        this.speed = options.speed ?? 1.2;
        // Marcha de paseo y la rápida con Mayús.
        this.walkSpeed = options.walkSpeed ?? 1.4;
        this.fastMultiplier = options.fastMultiplier ?? 2;
        // Cambio de velocidad por segundo: suave al arrancar y más firme al soltar, para que
        // la cámara se detenga en menos de 0,3 m.
        this.acceleration = options.acceleration ?? 3;
        this.braking = options.braking ?? 6;
        // En las escaleras (pendientes de hasta 52 % en el Tramo 1) acelerar o frenar por el
        // camino también acelera la cámara en vertical: el cambio de marcha se limita para que
        // eso no pase de verticalAccel, y la marcha baja lo justo para seguir deteniéndose en
        // stopDistance (contando el suavizado final de la cámara).
        this.verticalAccel = options.verticalAccel ?? 1.2;
        this.stopDistance = options.stopDistance ?? 0.29;
        this.lookSensitivity = options.lookSensitivity ?? 0.2;
        // Tope de la mirada hacia arriba. Una escena puede pedir el suyo (pitchUpLimit en
        // config/scenes.json): por encima de lo que vieron las fotos no hay nada bien reconstruido.
        this.pitchLimit = options.pitchUpLimit ?? options.pitchLimit ?? 85;
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
        // SW-17: la marcha baja hasta el 60 % al pasar junto a un punto de interés.
        this.poiSlowdownDistance = options.poiSlowdownDistance ?? 1.5;
        this.poiMinimumSpeedMultiplier = options.poiMinimumSpeedMultiplier ?? 0.6;
        this.poiAnchors = [];

        // distance, yaw, pitch y eyeHeight (desplazamiento vertical sobre el
        // trazado) viven en TourState (src/models/TourState.js).
        this.state = new TourState({ eyeHeight: options.eyeHeight ?? 0 });

        // Fuente opcional de métricas GPS. La distancia de escena se convierte
        // proporcionalmente a metros antes de consultar este modelo.
        this.gpsTrack = options.gpsTrack ?? null;

        // Botones en pantalla (press/release), teclado (W A S D, flechas, dos dedos) y joystick:
        // los tres dan `adelante` y `lado` en el marco de la vista y se suman.
        this._input = { forward: 0, strafe: 0, fast: false };
        // Joystick en pantalla (celular): aparte, para que soltar el dedo que mira (touchend
        // del canvas) no apague el avance del pulgar.
        this._stick = { forward: 0, strafe: 0 };
        this._teclas = { forward: 0, strafe: 0 };
        this._lookPointer = null;
        // Punto de arranque sobre el trazado, recortado a su largo.
        const largo = this.trailPath.isUsable ? this.trailPath.totalLength() : 0;
        this.state.distance = Math.max(0, Math.min(Number(options.startDistance) || 0, largo));
        // Paradas: los puntos del trazado donde la escena se midió más nítida (campo `stops`
        // del trazado, de scripts/escenas/nube/paradas_recorrido.py). Las usan las flechas y
        // «Siguiente punto». Si el trazado no las trae se reparten cada stopSpacing unidades.
        this.stopSpacing = options.stopSpacing ?? 3.2;
        // Cortes: trechos del trazado que NO se recorren (campo `cuts` del trazado, pares
        // [desde, hasta] en distancia). Son los que se midieron borrosos frente a las fotos
        // reales del sitio. El visitante nunca camina ni se detiene dentro de uno: al entrar
        // pasa al otro lado con un fundido corto (evento 'tour:cut').
        this.cutFade = options.cutFade ?? 0.28;                    // segundos de cada mitad del fundido
        this.cuts = this._armarCortes(options.cuts ?? this.trailPath.cuts, largo);
        this.state.distance = this._fueraDeCorte(this.state.distance, 1);
        // Extremos del recorrido útil: si el trazado empieza o termina en un corte, el recorrido
        // empieza o termina en el borde de ese corte (no hay «otro lado» al que pasar).
        this._inicio = this._fueraDeCorte(0, 1);
        this._fin = this._fueraDeCorte(largo, -1);
        this._salto = null;        // paso en curso al otro lado de un corte
        this._teletransporte = false;
        this.stops = this._armarParadas(options.stops ?? this.trailPath.stops, largo);
        this._meta = null;        // parada a la que lleva una flecha; null = sin viaje
        this._vel = 0;            // velocidad de ese viaje a lo largo del trazado (con signo)
        // Velocidad horizontal de la cámara en el mundo (m/s), en el marco del mundo.
        this._v = { x: 0, z: 0 };
        /** Desplazamiento lateral actual dentro del corredor. */
        this.lateral = 0;
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

    /**
     * SW-17: la marcha baja de forma continua al pasar junto a un punto de interés, hasta
     * poiMinimumSpeedMultiplier justo al lado, y vuelve a subir sin tirones al alejarse.
     */
    _frenoPoi(d) {
        if (this.poiAnchors.length === 0) return 1;
        let cerca = Infinity;
        for (const p of this.poiAnchors) cerca = Math.min(cerca, Math.abs(d - p));
        const minimo = this.poiMinimumSpeedMultiplier;
        return minimo + (1 - minimo) * suave(cerca / this.poiSlowdownDistance);
    }


    /** Distancia actual sobre el trazado (la leen las Vistas, p. ej. las flechas del camino). */
    get distance() {
        return this.state.distance;
    }

    /**
     * Extremos del recorrido útil (los lee src/ui/conexionesSendero.js para saber cuándo el
     * visitante llegó al principio o al final). Si el trazado empieza o termina en un corte,
     * el extremo es el borde de ese corte.
     */
    get pathStart() {
        return this._inicio;
    }

    get pathEnd() {
        return this._fin;
    }

    /**
     * Deja la lista de paradas ordenada, dentro del trazado y sin paradas pegadas.
     * Los dos extremos siempre son parada; el punto de arranque lo es si no hay otra cerca.
     */
    _armarParadas(lista, largo) {
        if (!(largo > 0)) return [0];
        let paradas = Array.isArray(lista)
            ? lista.map(Number).filter((d) => Number.isFinite(d) && d > 0.8 && d < largo - 0.8)
            : [];
        if (!Array.isArray(lista) || lista.length < 2) {
            const n = Math.max(1, Math.round(largo / this.stopSpacing));
            paradas = Array.from({ length: n - 1 }, (_, i) => ((i + 1) * largo) / n);
        }
        const inicio = this._inicio;
        const fin = this._fin;
        // Dentro de un corte no hay paradas, y los bordes de cada corte sí lo son.
        paradas = paradas.filter((d) => d > inicio + 0.8 && d < fin - 0.8 && !this._enCorte(d));
        for (const [a, b] of this.cuts) {
            if (a > inicio + 0.01) paradas.push(a);
            if (b < fin - 0.01) paradas.push(b);
        }
        paradas.sort((a, b) => a - b);
        const esBorde = (d) => this.cuts.some(([a, b]) => Math.abs(d - a) < 1e-6 || Math.abs(d - b) < 1e-6);
        const limpias = [inicio];
        for (const d of paradas) {
            const ultima = limpias[limpias.length - 1];
            if (d - ultima >= 0.8) limpias.push(d);
            else if (esBorde(d) && limpias.length > 1 && !esBorde(ultima)) limpias[limpias.length - 1] = d;   // manda el borde
        }
        if (fin - limpias[limpias.length - 1] >= 0.8 || limpias.length === 1) limpias.push(fin);
        else limpias[limpias.length - 1] = fin;
        // El punto de arranque es donde el visitante se para por primera vez: es parada. Si ya
        // hay una a menos de 0,8 (que no sea un extremo), esa se corre al arranque; así el
        // primer paso hacia atrás no es un saltito de medio metro.
        const arranque = this.state.distance;
        let cerca = -1;
        for (let i = 0; i < limpias.length; i++) {
            if (Math.abs(limpias[i] - arranque) < 0.8 &&
                (cerca < 0 || Math.abs(limpias[i] - arranque) < Math.abs(limpias[cerca] - arranque))) cerca = i;
        }
        if (cerca < 0) {
            limpias.push(arranque);
            limpias.sort((a, b) => a - b);
        } else if (cerca > 0 && cerca < limpias.length - 1) {
            limpias[cerca] = arranque;
        }
        return limpias;
    }

    /** Deja los cortes como pares [desde, hasta] dentro del trazado, ordenados y sin solaparse. */
    _armarCortes(lista, largo) {
        if (!Array.isArray(lista) || !(largo > 0)) return [];
        const pares = lista
            .filter((c) => Array.isArray(c) && c.length >= 2)
            .map((c) => [Math.max(0, Number(c[0])), Math.min(largo, Number(c[1]))])
            .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b - a > 0.5)
            .sort((x, y) => x[0] - y[0]);
        const unidos = [];
        for (const p of pares) {
            const ult = unidos[unidos.length - 1];
            if (ult && p[0] <= ult[1]) ult[1] = Math.max(ult[1], p[1]);
            else unidos.push(p);
        }
        return unidos;
    }

    /** ¿La distancia cae dentro de un corte? Los bordes no cuentan, salvo en los extremos del trazado. */
    _enCorte(d) {
        const largo = this.trailPath.totalLength();
        return this.cuts.some(([a, b]) => (d > a + 1e-6 || a <= 1e-6) && (d < b - 1e-6 || b >= largo - 1e-6) && d >= a && d <= b);
    }

    /** Saca una distancia de un corte: al borde de adelante (sentido +1) o al de atrás (-1). */
    _fueraDeCorte(d, sentido) {
        const largo = this.trailPath.totalLength();
        for (const [a, b] of this.cuts) {
            const dentro = (d > a + 1e-6 || a <= 1e-6) && (d < b - 1e-6 || b >= largo - 1e-6) && d >= a && d <= b;
            if (!dentro) continue;
            if (a <= 1e-6) return b;                 // el trazado empieza en un corte
            if (b >= largo - 1e-6) return a;         // o termina en uno
            return sentido >= 0 ? b : a;
        }
        return d;
    }

    /** Primer corte que queda entre dos distancias (en el orden en que se cruza), o null. */
    _corteEntre(desde, hasta) {
        const menor = Math.min(desde, hasta);
        const mayor = Math.max(desde, hasta);
        const cruzados = this.cuts.filter(([a, b]) => menor < b - 1e-6 && mayor > a + 1e-6);
        if (!cruzados.length) return null;
        return hasta >= desde ? cruzados[0] : cruzados[cruzados.length - 1];
    }

    /** Para las Vistas: ¿entre esas dos distancias hay un corte? (la flecha no se dibuja al otro lado). */
    crossesCut(desde, hasta) {
        return this._corteEntre(desde, hasta) !== null;
    }

    /**
     * Parada siguiente en un sentido (+1 adelante, -1 atrás) contando desde `desde`
     * (por omisión, desde la parada a la que ya se viaja o desde la posición actual).
     * Devuelve su distancia sobre el trazado o null si ya no hay más.
     */
    nextStop(direction, desde = this._meta ?? this.state.distance) {
        const margen = 0.15;
        if (direction > 0) {
            for (const d of this.stops) if (d > desde + margen) return d;
            return null;
        }
        for (let i = this.stops.length - 1; i >= 0; i--) {
            if (this.stops[i] < desde - margen) return this.stops[i];
        }
        return null;
    }

    /**
     * Ayuda de las flechas y de «Siguiente punto»: camina hasta la parada siguiente en ese
     * sentido y se detiene ahí, sin girar la vista ni mover el lateral. Si ya iba en viaje,
     * el destino pasa a la parada que sigue (toques encadenados).
     */
    step(direction) {
        const sentido = direction < 0 ? -1 : 1;
        if (sentido < 0 && this.forwardOnly) return false;
        const destino = this.nextStop(sentido);
        if (destino === null) return false;
        this._meta = destino;
        return true;
    }

    /** Camina hasta una distancia dada del trazado (recortada a sus extremos). */
    goTo(distance) {
        const largo = this.trailPath.totalLength();
        let destino = Math.max(0, Math.min(Number(distance) || 0, largo));
        destino = this._fueraDeCorte(destino, destino >= this.state.distance ? 1 : -1);
        destino = Math.max(this._inicio, Math.min(destino, this._fin));
        if (this.forwardOnly && destino < this.state.distance) return false;
        this._meta = destino;
        return true;
    }

    /**
     * Viaje de una flecha: avanza por el trazado hacia this._meta con arranque y frenada
     * suaves, a la marcha de paseo como máximo. Devuelve el paso dado.
     */
    _viajar(dt) {
        // Si entre aquí y el destino hay un corte, se camina hasta su borde y de ahí se pasa
        // al otro lado con el fundido; lo que queda del viaje sigue después.
        const destinoFinal = Math.max(this._inicio, Math.min(this._meta, this._fin));
        this._meta = destinoFinal;
        const corte = this._corteEntre(this.state.distance, destinoFinal);
        let meta = destinoFinal;
        if (corte) {
            const haciaAdelante = destinoFinal >= this.state.distance;
            const entrada = haciaAdelante ? corte[0] : corte[1];
            if (Math.abs(this.state.distance - entrada) < 0.05) {
                this._empezarSalto(entrada, haciaAdelante ? corte[1] : corte[0]);
                return 0;
            }
            meta = entrada;
        }
        const falta = meta - this.state.distance;
        const distancia = Math.abs(falta);
        const sentido = falta >= 0 ? 1 : -1;
        // Salto largo entre paradas (un trecho flojo del trazado que se cruza sin detenerse):
        // la marcha sube hasta vez y media mientras falten más de 6 unidades y vuelve a la
        // normal al acercarse, para no pasar medio minuto caminando por lo que peor se ve.
        let tope = this.walkSpeed;
        if (distancia > 6) tope *= 1 + 0.5 * Math.min(1, (distancia - 6) / 6);
        const deseada = sentido * Math.min(tope, Math.sqrt(2 * this.acceleration * distancia));
        const cambio = this.acceleration * dt;
        this._vel += Math.max(-cambio, Math.min(cambio, deseada - this._vel));
        const paso = this._vel * dt;
        if (Math.abs(paso) >= distancia || (distancia < 0.03 && Math.abs(this._vel) < 0.25)) {
            this._vel = 0;
            // Llegó al borde de un corte: en el cuadro siguiente empieza el paso al otro lado.
            if (corte) return falta;
            this._meta = null;
            this.app.fire('tour:stop', { distance: meta });
            return falta;
        }
        return paso;
    }

    /** Empieza el paso al otro lado de un corte: la cámara queda quieta en el borde de entrada. */
    _empezarSalto(entrada, salida) {
        this.state.distance = entrada;
        this._salto = { hasta: salida, t: 0, hecho: false };
        this._vel = 0;
        this._v.x = 0;
        this._v.z = 0;
        this.app.fire('tour:cut', { fase: 'salida', duracion: this.cutFade, desde: entrada, hasta: salida });
    }

    /**
     * Paso al otro lado de un corte: medio fundido de salida, cambio de sitio y medio fundido de
     * llegada. Mientras dura no se lee la entrada. Al llegar se conserva el lateral (recortado al
     * corredor de allá) y la vista gira lo mismo que giró el rumbo suave del camino entre los dos
     * bordes: quien miraba por el camino sigue mirando por el camino; quien miraba a un lado, al
     * mismo lado.
     */
    _avanzarSalto(dt) {
        const s = this._salto;
        s.t += dt;
        if (!s.hecho && s.t >= this.cutFade) {
            const antes = this.state.distance;
            const haciaAdelante = s.hasta >= antes;
            this.state.yaw += this.trailPath.headingAt(s.hasta) - this.trailPath.headingAt(antes);
            this.state.distance = s.hasta;
            const corredor = this.trailPath.corridorAt(s.hasta);
            this.lateral = Math.max(-corredor.left, Math.min(corredor.right, this.lateral));
            // Si el destino de una flecha quedó del lado de donde se venía, el viaje termina aquí:
            // nada de devolverse por el corte.
            if (this._meta !== null && (haciaAdelante ? this._meta < s.hasta : this._meta > s.hasta)) this._meta = s.hasta;
            s.hecho = true;
            this._teletransporte = true;
            this.app.fire('tour:cut', { fase: 'llegada', duracion: this.cutFade, desde: antes, hasta: s.hasta });
        }
        if (s.hecho && s.t >= this.cutFade * 1.5) {
            this._salto = null;
            if (this._meta !== null && Math.abs(this._meta - this.state.distance) < 0.05) {
                this.state.distance = this._meta;
                this._meta = null;
                this.app.fire('tour:stop', { distance: this.state.distance });
            }
        }
    }

    start() {
        if (this._enabled || !this.trailPath.isUsable) return false;
        this._enabled = true;

        // Orientación inicial: mirando hacia donde avanza el sendero en el punto de arranque.
        this.state.yaw = this.trailPath.headingAt(this.state.distance);

        this.trailPath.smoothPositionAt(this.state.distance, this._currentPos);
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
     * Guarda el estado para restaurarlo al cerrar una ficha (RF-018): distancia, lateral,
     * yaw y pitch. eyeHeight no viaja aqui porque PoiManager no detiene el tour al abrir una
     * ficha, y los atajos de teclado que la cambian (r/f) siguen activos con la ficha abierta.
     */
    saveState() {
        const { distance, yaw, pitch } = this.state.getState();
        return { distance, yaw, pitch, lateral: this.lateral };
    }

    restoreState(state) {
        if (!state) return;
        this.state.distance = state.distance;
        this.state.yaw = state.yaw;
        this.state.pitch = state.pitch;
        if (Number.isFinite(state.lateral)) this.lateral = state.lateral;
        // Se vuelve al punto guardado y ahí se queda: quieto y sin viaje pendiente.
        this._meta = null;
        this._vel = 0;
        this._v.x = 0;
        this._v.z = 0;
        this._salto = null;
        this._teletransporte = false;
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

    /** Pendiente de la curva suave en d (subida sobre avance horizontal, sin signo). */
    _pendiente(d) {
        const largo = this.trailPath.totalLength();
        const a = this.trailPath.smoothPositionAt(Math.max(0, d - 0.3), this._pendA || (this._pendA = new Vec3()));
        const b = this.trailPath.smoothPositionAt(Math.min(largo, d + 0.3), this._pendB || (this._pendB = new Vec3()));
        const horizontal = Math.hypot(b.x - a.x, b.z - a.z);
        return horizontal > 1e-3 ? Math.abs(b.y - a.y) / horizontal : 0;
    }

    /** Giro del camino con signo, en radianes por metro (positivo hacia donde crece yaw). */
    _giroDelCamino(d) {
        const largo = this.trailPath.totalLength();
        const a = Math.max(0, d - 0.15);
        const b = Math.min(largo, d + 0.15);
        if (!(b > a)) return 0;
        return ((this.trailPath.headingAt(b) - this.trailPath.headingAt(a)) / (b - a)) * RAD;
    }

    _update(dt) {
        if (!(dt > 0)) return;
        // Un cuadro muy largo (pestaña en segundo plano) no debe dar un salto.
        dt = Math.min(dt, 0.1);
        const largo = this.trailPath.totalLength();
        const antesD = this.state.distance;
        const antesLateral = this.lateral;

        if (this._salto) {
            // Paso al otro lado de un corte: no se lee la entrada y la cámara queda quieta.
            this._v.x = 0;
            this._v.z = 0;
            this._avanzarSalto(dt);
        } else {
            this._moverse(dt, largo, antesD, antesLateral);
        }

        // En el cuadro del paso al otro lado de un corte el progreso se publica más abajo, con la
        // cámara ya puesta en el sitio nuevo.
        const cambioDeSitio = this._teletransporte;
        if (!cambioDeSitio && (this.state.distance !== antesD || this.lateral !== antesLateral)) this._emitProgress();

        // 5. La cámara: curva suave más el lateral, perpendicular al rumbo, a la altura de los ojos.
        this._posicionEn(this.state.distance, this.lateral, this._targetPos);
        this._targetPos.y += this.state.eyeHeight;

        // 6. La vista solo la mueve el visitante; el tope yawLimit se mide contra el camino.
        if (this.yawLimit !== null) this._recortarGiro();

        if (cambioDeSitio) {
            // La cámara aparece allá, sin recorrer lo cortado.
            this._teletransporte = false;
            this._currentPos.copy(this._targetPos);
        }
        const t = Math.min(1, this.smoothing * dt);
        this._currentPos.lerp(this._currentPos, this._targetPos, t);
        this.camera.setPosition(this._currentPos);
        this.camera.setEulerAngles(this.state.pitch, this.state.yaw, 0);
        // Quien escucha el progreso (audio espacial, puntos de interés por cercanía, HUD) recibe la
        // posición del sitio nuevo, no la del borde del corte que se dejó atrás.
        if (cambioDeSitio) this._emitProgress();
    }

    /** Un cuadro de marcha: la de una flecha o la libre de las teclas, el joystick y los dedos. */
    _moverse(dt, largo, antesD, antesLateral) {
        const recortar = (v) => Math.max(-1, Math.min(1, v));
        // 1. Entrada en el marco de la vista: botones, teclado (o dos dedos) y joystick.
        const adelante = recortar(this._input.forward + this._teclas.forward + this._stick.forward);
        const lado = recortar(this._input.strafe + this._teclas.strafe + this._stick.strafe);
        const hayEntrada = adelante !== 0 || lado !== 0;
        // Cualquier tecla o el joystick cancelan el viaje de una flecha y mandan ellos.
        if (hayEntrada) {
            this._meta = null;
            this._vel = 0;
        }

        // Marco del camino en el punto actual: tangente T y normal N (la misma perpendicular
        // horizontal de siempre: N = (-T.z, T.x)).
        const h = this.trailPath.headingAt(this.state.distance) * RAD;
        const tx = -Math.sin(h), tz = -Math.cos(h);
        const nx = -tz, nz = tx;

        let dd = 0;
        let dl = 0;
        if (this._meta !== null) {
            // 2a. Viaje de una flecha: por el trazado, sin tocar la vista ni el lateral.
            dd = this._viajar(dt);
            this._v.x = tx * this._vel;
            this._v.z = tz * this._vel;
        } else {
            // 2b. Movimiento libre: el deseo es horizontal y sale de la vista.
            const y = this.state.yaw * RAD;
            let mx = adelante * -Math.sin(y) + lado * Math.cos(y);
            let mz = adelante * -Math.cos(y) + lado * -Math.sin(y);
            const norma = Math.hypot(mx, mz);
            if (norma > 1) { mx /= norma; mz /= norma; }
            // Pendiente del camino: limita el cambio de marcha y, con él, la marcha misma.
            const limiteV = this.verticalAccel / Math.max(this._pendiente(this.state.distance), 1e-3);
            const aSubir = Math.min(this.acceleration, limiteV);
            const aFrenar = Math.min(this.braking, limiteV);
            // Marcha con la que se frena en stopDistance: v²/(2a) + v/suavizado = stopDistance.
            const k = 1 / this.smoothing;
            const conFrenada = aFrenar * (-k + Math.sqrt(k * k + (2 * this.stopDistance) / aFrenar));
            const marcha = Math.min(this.walkSpeed * (this._input.fast ? this.fastMultiplier : 1),
                this._input.fast ? Infinity : conFrenada) * this._frenoPoi(this.state.distance);
            const ox = mx * marcha, oz = mz * marcha;
            // La velocidad se acerca a la deseada con un tope de cambio por segundo.
            const tope = (ox === 0 && oz === 0 ? aFrenar : aSubir) * dt;
            let cx = ox - this._v.x, cz = oz - this._v.z;
            const cambio = Math.hypot(cx, cz);
            if (cambio > tope) { cx *= tope / cambio; cz *= tope / cambio; }
            this._v.x += cx;
            this._v.z += cz;
            if (Math.hypot(this._v.x, this._v.z) < 1e-3 && !hayEntrada) { this._v.x = 0; this._v.z = 0; }

            // 3. Del mundo al camino. En una curva, un punto corrido hacia afuera recorre más
            // que la curva central: se compensa para que la velocidad real sea la pedida.
            const alo = this._v.x * tx + this._v.z * tz;
            const lat = this._v.x * nx + this._v.z * nz;
            const factor = Math.max(0.2, 1 + this.lateral * this._giroDelCamino(this.state.distance));
            dd = (alo * dt) / factor;
            dl = lat * dt;
        }

        // 4. Extremos, forwardOnly y corredor. Donde el camino gira muy cerrado (la punta del
        // mirador) el tope del corredor puede arrastrar la cámara de lado más rápido de lo que
        // camina el visitante: si el paso real del cuadro supera el pedido, se acorta.
        const pedido = Math.max(Math.hypot(this._v.x, this._v.z), Math.abs(this._vel)) * dt;
        let escala = 1;
        for (let intento = 0; intento < 3; intento++) {
            this._colocar(antesD, antesLateral, dd * escala, dl * escala, tx, tz, nx, nz, largo);
            const real = this._pasoHorizontal(antesD, antesLateral, this.state.distance, this.lateral);
            if (real <= pedido * 1.02 + 1e-5) break;
            escala *= Math.max(0.05, (pedido / real) * 0.98);
        }

        // Si la marcha libre entra en un corte, se pasa al borde de enfrente con el fundido.
        if (this._meta === null) {
            const corte = this._corteEntre(antesD, this.state.distance);
            if (corte) {
                const haciaAdelante = this.state.distance >= antesD;
                this._empezarSalto(haciaAdelante ? corte[0] : corte[1], haciaAdelante ? corte[1] : corte[0]);
            }
        }
    }

    /**
     * Aplica un paso (dd a lo largo del trazado, dl de lado) desde (d0, lat0): extremos del
     * trazado, forwardOnly y corredor. El lateral no sale del margen medido y, del lado de
     * adentro de una curva, tampoco del 80 % del radio de giro (en la punta del mirador y en el
     * cruce, más adentro la posición se doblaría sobre sí misma). Contra un borde o un extremo
     * se anula la parte de la velocidad que empuja hacia afuera: así se resbala por el borde en
     * vez de trabarse. `d` se recorta a los extremos del recorrido útil (pathStart, pathEnd).
     */
    _colocar(d0, lat0, dd, dl, tx, tz, nx, nz, largo) {
        let d = d0 + dd;
        if (this.forwardOnly && d < d0) d = d0;
        if (d < this._inicio || d > this._fin || (this.forwardOnly && dd < 0)) {
            d = Math.max(this._inicio, Math.min(d, this._fin));
            const alo = this._v.x * tx + this._v.z * tz;
            if ((alo > 0 && d >= this._fin) || (alo < 0 && (d <= this._inicio || this.forwardOnly))) {
                this._v.x -= tx * alo;
                this._v.z -= tz * alo;
            }
        }
        this.state.distance = d;

        // La posición solo puede doblarse sobre sí misma del lado de adentro de la curva (donde
        // está el centro de giro): el tope del radio va solo de ese lado.
        const corredor = this.trailPath.corridorAt(d);
        const radio = 0.8 * this.trailPath.turnRadiusAt(d);
        const giro = this._giroDelCamino(d);
        const izq = Math.min(corredor.left, giro > 0 ? radio : Infinity);
        const der = Math.min(corredor.right, giro < 0 ? radio : Infinity);
        let lateral = lat0 + dl;
        if (lateral > der || lateral < -izq) {
            lateral = Math.max(-izq, Math.min(der, lateral));
            const lat = this._v.x * nx + this._v.z * nz;
            if ((lat > 0 && lateral >= der) || (lat < 0 && lateral <= -izq)) {
                this._v.x -= nx * lat;
                this._v.z -= nz * lat;
            }
        }
        this.lateral = lateral;
    }

    /** Punto de la cámara (sin la altura de los ojos) para una distancia y un lateral. */
    _posicionEn(d, lateral, out) {
        const h = this.trailPath.headingAt(d) * RAD;
        this.trailPath.smoothPositionAt(d, out);
        out.x += Math.cos(h) * lateral;
        out.z += -Math.sin(h) * lateral;
        return out;
    }

    _pasoHorizontal(d0, lat0, d1, lat1) {
        const a = this._posicionEn(d0, lat0, this._pasoA || (this._pasoA = new Vec3()));
        const b = this._posicionEn(d1, lat1, this._pasoB || (this._pasoB = new Vec3()));
        return Math.hypot(b.x - a.x, b.z - a.z);
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

    /**
     * Deja la vista a ±yawLimit grados del rumbo suave del camino en el punto actual. El rumbo
     * suave no salta en los vértices, así que el tope se mueve parejo con el camino.
     */
    _recortarGiro() {
        const camino = this.trailPath.headingAt(this.state.distance);
        const rel = envolver(this.state.yaw - camino);
        const tope = this.yawLimit;
        if (rel > tope) this.state.yaw -= rel - tope;
        else if (rel < -tope) this.state.yaw -= rel + tope;
    }

    /**
     * Joystick en pantalla: ejes analógicos de -1 a 1 en el marco de la vista
     * (forward = hacia donde se mira, strafe = a la derecha de la vista).
     * Hace lo mismo que W A S D; el corredor y forwardOnly se aplican en _update.
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
