/*
 * TourEngine — el motor del recorrido guiado.
 *
 * Mueve la cámara dentro del CORREDOR del trazado (RF-004) y deja la mirada
 * libre en 360° (RF-005). El visitante avanza, retrocede y puede desplazarse
 * un poco a los lados para acercarse a mirar algo, pero nunca sale del camino
 * autorizado: el corredor es un margen, no una vía rígida.
 *
 * Navegación por puntos: se camina de PARADA en parada (step, goTo) o de forma
 * continua mientras se mantiene el avance; al soltar, el motor sigue hasta la
 * parada siguiente. Las paradas son los puntos del trazado donde la escena se
 * midió más nítida, así que el visitante solo se queda quieto donde se ve bien.
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
        // Navegación por puntos. El visitante se mueve por el trazado (RF-003, RF-004) pero solo
        // se queda quieto en las PARADAS: los puntos donde la escena se midió más nítida (campo
        // `stops` del trazado, de scripts/escenas/nube/paradas_recorrido.py). Si el trazado no
        // las trae se reparten cada stopSpacing unidades. Entre una parada y otra la cámara
        // pasa en movimiento, que es cuando menos se nota lo borroso de una reconstrucción.
        this.stopSpacing = options.stopSpacing ?? 3.2;
        this.cruiseSpeed = options.cruiseSpeed ?? this.speed * 1.8;   // marcha entre paradas
        this.acceleration = options.acceleration ?? 3.0;              // arranque y frenado suaves
        // La vista acompaña las curvas del camino mientras se camina (la mirada sigue libre).
        this.followPath = options.followPath ?? true;
        // Cortes: trechos del trazado que NO se recorren (campo `cuts` del trazado, pares
        // [desde, hasta] en distancia). Son los que se midieron borrosos frente a las fotos
        // reales del sitio. El visitante nunca camina ni se detiene dentro de uno: al llegar a
        // su borde pasa al otro lado con un fundido corto (evento 'tour:cut').
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
        this._meta = null;        // distancia a la que se viaja; null = quieto
        this._vel = 0;            // velocidad a lo largo del trazado (unidades/s, con signo)
        this._sentido = 1;        // último sentido de marcha (+1 adelante, -1 atrás)
        this._continuo = false;   // el visitante mantiene oprimido el avance
        this._porPasos = false;   // el viaje lo pidió un toque: al andar la vista se endereza
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
     * Navegación por puntos: camina hasta la parada siguiente en ese sentido y se detiene
     * ahí. Si ya iba en viaje, el destino pasa a la parada que sigue (toques encadenados).
     */
    step(direction) {
        const sentido = direction < 0 ? -1 : 1;
        if (sentido < 0 && this.forwardOnly) return false;
        const destino = this.nextStop(sentido);
        if (destino === null) return false;
        this._meta = destino;
        this._sentido = sentido;
        this._porPasos = true;
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
        this._sentido = destino >= this.state.distance ? 1 : -1;
        this._porPasos = true;
        return true;
    }

    /** Primera parada, en el sentido de marcha, en la que todavía se alcanza a frenar. */
    _paradaParaFrenar() {
        const frenado = (this._vel * this._vel) / (2 * this.acceleration);
        const desde = this.state.distance + this._sentido * 0.6 * frenado;
        const margen = 0.15;
        if (this._sentido > 0) {
            for (const d of this.stops) if (d >= desde - margen) return d;
            return this._fin;
        }
        for (let i = this.stops.length - 1; i >= 0; i--) {
            if (this.stops[i] <= desde + margen) return this.stops[i];
        }
        return this._inicio;
    }

    /**
     * Avanza hacia this._meta con arranque y frenado suaves: la velocidad nunca pasa de
     * `tope` ni de la que permite detenerse justo en el destino.
     */
    _viajar(dt, tope) {
        if (this._salto) {
            this._avanzarSalto(dt);
            return;
        }
        // Si entre aquí y el destino hay un corte, se camina hasta su borde y de ahí se pasa
        // al otro lado con el fundido; lo que queda del viaje sigue después.
        const destinoFinal = Math.max(this._inicio, Math.min(this._meta, this._fin));
        this._meta = destinoFinal;
        const corte = this._corteEntre(this.state.distance, destinoFinal);
        let meta = destinoFinal;
        if (corte) {
            const haciaAdelante = destinoFinal >= this.state.distance;
            const entrada = haciaAdelante ? corte[0] : corte[1];
            const salida = haciaAdelante ? corte[1] : corte[0];
            if (Math.abs(this.state.distance - entrada) < 0.05) {
                this._salto = { hasta: salida, t: 0, hecho: false };
                this._vel = 0;
                this.app.fire('tour:cut', { fase: 'salida', duracion: this.cutFade, desde: entrada, hasta: salida });
                return;
            }
            meta = entrada;
        }
        const falta = meta - this.state.distance;
        const distancia = Math.abs(falta);
        const sentido = falta >= 0 ? 1 : -1;
        // Salto largo entre paradas (un trecho flojo del trazado que se cruza sin detenerse):
        // la marcha sube hasta vez y media mientras falten más de 6 unidades y vuelve a la
        // normal al acercarse, para no pasar medio minuto caminando por lo que peor se ve.
        if (this._porPasos && distancia > 6) tope *= 1 + 0.5 * Math.min(1, (distancia - 6) / 6);
        const deseada = sentido * Math.min(tope, Math.sqrt(2 * this.acceleration * distancia));
        const cambio = this.acceleration * 1.6 * dt;
        this._vel += Math.max(-cambio, Math.min(cambio, deseada - this._vel));
        const paso = this._vel * dt;
        const llega = Math.abs(paso) >= distancia || (distancia < 0.03 && Math.abs(this._vel) < 0.25);
        if (llega && corte) {
            // Llegó al borde del corte: en el cuadro siguiente empieza el paso al otro lado.
            this.state.distance = meta;
            this._vel = 0;
        } else if (llega && !this._continuo) {
            this.state.distance = this._meta;
            this._meta = null;
            this._vel = 0;
            this._porPasos = false;
            this.app.fire('tour:stop', { distance: this.state.distance });
        } else {
            this.state.distance = Math.max(this._inicio, Math.min(this.state.distance + paso, this._fin));
            if (Math.abs(this._vel) > 0.05) this._sentido = this._vel > 0 ? 1 : -1;
        }
    }

    /**
     * Paso al otro lado de un corte: medio fundido de salida, cambio de sitio con la vista
     * girada lo mismo que giró el camino, y medio fundido de llegada.
     */
    _avanzarSalto(dt) {
        const s = this._salto;
        s.t += dt;
        if (!s.hecho && s.t >= this.cutFade) {
            const antes = this.state.distance;
            const haciaAdelante = s.hasta >= antes;
            // Rumbo del camino en el borde de salida y en el de llegada: la vista queda igual de
            // girada respecto al camino que antes del paso (quien miraba por el camino sigue
            // mirando por el camino; quien miraba a un lado, al mismo lado).
            const rumboAntes = this._rumboCamino(antes);
            const rumboDespues = this._rumboCamino(s.hasta);
            this.state.yaw += ((rumboDespues - rumboAntes) % 360 + 540) % 360 - 180;
            this.state.distance = s.hasta;
            this.lateral = 0;
            // Si mientras tanto el destino quedó del lado de donde se venía (se soltó el avance
            // durante el fundido), el viaje termina aquí: nada de devolverse por el corte.
            if (this._meta !== null && (haciaAdelante ? this._meta < s.hasta : this._meta > s.hasta)) this._meta = s.hasta;
            s.hecho = true;
            this._teletransporte = true;
            this.app.fire('tour:cut', { fase: 'llegada', duracion: this.cutFade, desde: antes, hasta: s.hasta });
        }
        if (s.hecho && s.t >= this.cutFade * 1.5) {
            this._salto = null;
            if (!this._continuo && this._meta !== null && Math.abs(this._meta - this.state.distance) < 0.05) {
                this.state.distance = this._meta;
                this._meta = null;
                this._porPasos = false;
                this.app.fire('tour:stop', { distance: this.state.distance });
            }
        }
    }

    /**
     * Rumbo del camino (grados, misma convención que state.yaw) promediado en una ventana
     * corta, para que la vista no salte en los vértices del trazado. `firmeza` va de 0 a 1:
     * cerca de 1 el camino sigue derecho; baja cuando el trazado se devuelve sobre sí mismo.
     */
    _rumboCamino(d, salida = null) {
        const largo = this.trailPath.totalLength();
        let x = 0;
        let z = 0;
        const ventana = [-0.9, -0.3, 0.3, 0.9];
        for (const k of ventana) {
            this.trailPath.directionAt(Math.max(0, Math.min(largo, d + k)), this._dir);
            const n = Math.hypot(this._dir.x, this._dir.z) || 1;
            x += this._dir.x / n;
            z += this._dir.z / n;
        }
        if (salida) salida.firmeza = Math.hypot(x, z) / ventana.length;
        return Math.atan2(-x, -z) / RAD;
    }

    /** La vista acompaña el giro que hizo el camino entre dos distancias. */
    _seguirCamino(antes, ahora, dt) {
        const a = {};
        const b = {};
        const rumboAntes = this._rumboCamino(antes, a);
        const rumboAhora = this._rumboCamino(ahora, b);
        // Donde el trazado se devuelve (el ramal del mirador) no hay un rumbo que seguir.
        if (a.firmeza > 0.7 && b.firmeza > 0.7) {
            const giro = ((rumboAhora - rumboAntes) % 360 + 540) % 360 - 180;
            const tope = 60 * Math.abs(ahora - antes);   // grados por unidad recorrida
            this.state.yaw += Math.max(-tope, Math.min(tope, giro));
        }
        if (this._porPasos && !this._looking) {
            // Viaje pedido con un toque: la vista se endereza hacia donde se camina y casi a
            // nivel, que es como mejor se ve la escena al llegar a la parada. El rumbo se toma
            // un poco más adelante para que no dude donde el trazado se devuelve.
            // Nunca más allá de la parada de destino: en el mirador el trazado se devuelve y
            // la vista debe llegar mirando hacia afuera, no girarse antes de tiempo.
            const largo = this.trailPath.totalLength();
            let adelante = ahora + this._sentido * 1.2;
            if (this._meta !== null) {
                // El rumbo se lee un poco ANTES de la parada (0,3): justo en ella, si es un
                // vértice, directionAt ya devuelve el tramo siguiente.
                const borde = this._meta - this._sentido * 0.3;
                adelante = this._sentido > 0 ? Math.min(adelante, borde) : Math.max(adelante, borde);
            }
            adelante = Math.max(0, Math.min(largo, adelante));
            this.trailPath.directionAt(adelante, this._dir);
            const frente = Math.atan2(-this._dir.x, -this._dir.z) / RAD + (this._sentido < 0 ? 180 : 0);
            const rel = ((this.state.yaw - frente) % 360 + 540) % 360 - 180;
            const k = Math.min(1, 2.4 * dt);
            this.state.yaw -= rel * k;
            const nivel = Math.max(-12, Math.min(4, this.state.pitch));
            this.state.pitch += (nivel - this.state.pitch) * k;
            this.lateral -= this.lateral * k;            // y vuelve al centro del camino
        }
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
        // Se vuelve al punto guardado y ahí se queda: sin viaje pendiente.
        this._meta = null;
        this._vel = 0;
        this._continuo = false;
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
        const antes = this.state.distance;
        let tope = this.cruiseSpeed;
        if (avance !== 0) {
            // El visitante mantiene el avance (tecla, joystick, flecha sostenida): camina hacia
            // el extremo del trazado en ese sentido, a la marcha normal o a la rápida (Mayús).
            this._continuo = true;
            this._porPasos = false;
            this._sentido = avance > 0 ? 1 : -1;
            this._meta = this._sentido > 0 ? this._fin : this._inicio;
            tope = (this._input.fast ? this.speed * this.fastMultiplier : this.cruiseSpeed) *
                Math.min(1, Math.abs(avance));
        } else if (this._continuo) {
            // Al soltar no se queda a mitad de camino: sigue hasta la primera parada en la que
            // alcanza a frenar. Así siempre se mira con calma desde un punto que se ve bien.
            this._continuo = false;
            this._meta = this._paradaParaFrenar();
        }
        if (this._meta !== null) {
            // SW-17: desacelerar únicamente al avanzar hacia un POI.
            // Si el usuario retrocede, conserva la velocidad normal.
            // En el viaje de parada a parada (un toque) no se aplica: ese viaje ya frena solo
            // al llegar, y con varios puntos seguidos la marcha subía y bajaba a tirones
            // (medido en el Tramo 1: tres frenadas en los primeros 4 m).
            if (this._sentido > 0 && !this._porPasos) tope *= this._getPoiSpeedMultiplier();
            this._viajar(dt, tope);
        }
        // En el cuadro del paso al otro lado de un corte el giro ya lo puso _avanzarSalto, y el
        // progreso se publica más abajo, con la cámara ya puesta en el sitio nuevo.
        if (this.state.distance !== antes && !this._teletransporte) {
            if (this.followPath) this._seguirCamino(antes, this.state.distance, dt);
            this._emitProgress();
        }
        if (lateral !== 0) {
            this.lateral += lateral * this.strafeSpeed * dt;
        }
        // El margen del corredor se aplica en cada cuadro: puede cambiar de ancho a lo largo
        // del trazado (corridorLeft / corridorRight) y al avanzar hay que quedar dentro.
        const corredor = this.trailPath.corridorAt(this.state.distance);
        this.lateral = Math.max(-corredor.left, Math.min(corredor.right, this.lateral));

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

        const cambioDeSitio = this._teletransporte;
        if (cambioDeSitio) {
            // Paso al otro lado de un corte: la cámara aparece allá, sin recorrer lo cortado.
            this._teletransporte = false;
            this._currentPos.copy(this._targetPos);
        }
        const t = Math.min(1, this.smoothing * dt);
        this._currentPos.lerp(this._currentPos, this._targetPos, t);
        this.camera.setPosition(this._currentPos);
        this.camera.setEulerAngles(this.state.pitch, this.state.yaw, 0);
        // Quien escucha el progreso (audio espacial, puntos de interés por cercanía, HUD) debe
        // recibir la posición del sitio nuevo, no la del borde del corte que se dejó atrás.
        if (cambioDeSitio) this._emitProgress();
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
        // Rumbo promediado: con el del segmento exacto la vista daba un tirón en cada vértice.
        const camino = this._rumboCamino(this.state.distance);
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
