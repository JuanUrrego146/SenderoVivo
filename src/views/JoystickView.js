/*
 * JoystickView — joystick en pantalla para caminar el sendero desde el celular.
 *
 * Vista pura: dibuja la base y la perilla, lee el pulgar y publica los ejes en
 * 'trail:joystick' ({ forward, strafe }, cada uno de -1 a 1). No toca la cámara ni
 * el motor: main.js conecta el evento con TourEngine.setStick, que aplica el
 * corredor y forwardOnly como con el teclado (RF-004).
 *
 * Arriba avanza, abajo retrocede, a los lados se corre dentro del corredor. Solo
 * se ve por debajo de 640 px (styles/glass.css) y se acomoda encima de la tarjeta
 * "Detalles del sendero", que crece hacia arriba al desplegarse.
 */
export class JoystickView {
    /**
     * @param {import('playcanvas').AppBase} app
     * @param {object} [opciones]
     * @param {number} [opciones.zonaMuerta] fracción del radio que no mueve (temblor del pulgar)
     */
    constructor(app, { zonaMuerta = 0.18 } = {}) {
        this.app = app;
        this.zonaMuerta = zonaMuerta;
        this._puntero = null;
        this._ultimo = { forward: 0, strafe: 0 };

        this.base = document.createElement('div');
        this.base.className = 'sv-joystick';
        this.base.setAttribute('role', 'application');
        this.base.setAttribute('aria-label', 'Joystick: arrastra hacia arriba para avanzar, hacia abajo para retroceder y a los lados para correrte');
        this.perilla = document.createElement('div');
        this.perilla.className = 'sv-joystick-perilla';
        this.base.appendChild(this.perilla);
        document.body.appendChild(this.base);

        this.base.addEventListener('pointerdown', (e) => this._empezar(e));
        this.base.addEventListener('pointermove', (e) => this._mover(e));
        this.base.addEventListener('pointerup', (e) => this._soltar(e));
        this.base.addEventListener('pointercancel', (e) => this._soltar(e));
        this.base.addEventListener('lostpointercapture', (e) => this._soltar(e));
        // Sin menú contextual ni selección al dejar el pulgar quieto.
        this.base.addEventListener('contextmenu', (e) => e.preventDefault());

        this._colocar = this._colocar.bind(this);
        window.addEventListener('resize', this._colocar);
        const tarjeta = document.getElementById('mobile-details-card');
        if (tarjeta && 'ResizeObserver' in window) new ResizeObserver(this._colocar).observe(tarjeta);
        this._colocar();
    }

    /** Pone el joystick 12 px encima de lo que haya abajo en celular. */
    _colocar() {
        const tarjeta = document.getElementById('mobile-details-card');
        const nav = document.getElementById('shell-nav-mobile');
        let tope = window.innerHeight;
        for (const el of [tarjeta, nav]) {
            if (!el || !el.offsetParent) continue;
            const r = el.getBoundingClientRect();
            if (r.height > 0) tope = Math.min(tope, r.top);
        }
        const abajo = tope < window.innerHeight ? window.innerHeight - tope + 12 : 84;
        this.base.style.bottom = Math.round(abajo) + 'px';
    }

    _empezar(e) {
        if (this._puntero !== null) return;
        e.preventDefault();
        this._puntero = e.pointerId;
        // Captura el pulgar aunque salga de la base; si el navegador no deja, sigue igual.
        try { this.base.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
        this.base.classList.add('activa');
        this._mover(e);
    }

    _mover(e) {
        if (e.pointerId !== this._puntero) return;
        e.preventDefault();
        const r = this.base.getBoundingClientRect();
        const radio = r.width / 2;
        let dx = e.clientX - (r.left + radio);
        let dy = e.clientY - (r.top + radio);
        const largo = Math.hypot(dx, dy);
        if (largo > radio) { dx *= radio / largo; dy *= radio / largo; }
        this.perilla.style.transform = `translate(${dx}px, ${dy}px)`;

        // Zona muerta y reescalado: fuera de ella el eje va de 0 a 1 sin salto.
        const m = Math.min(1, largo / radio);
        const util = m <= this.zonaMuerta ? 0 : (m - this.zonaMuerta) / (1 - this.zonaMuerta);
        const k = m > 0 ? util / m : 0;
        // Arriba en pantalla (dy negativo) es avanzar; a la derecha, correrse a la derecha.
        this._publicar((-dy / radio) * k, (dx / radio) * k);
    }

    _soltar(e) {
        if (e.pointerId !== this._puntero) return;
        this._puntero = null;
        this.base.classList.remove('activa');
        this.perilla.style.transform = '';
        this._publicar(0, 0);
    }

    _publicar(forward, strafe) {
        const f = Math.round(forward * 100) / 100;
        const s = Math.round(strafe * 100) / 100;
        if (f === this._ultimo.forward && s === this._ultimo.strafe) return;
        this._ultimo = { forward: f, strafe: s };
        this.app.fire('trail:joystick', { forward: f, strafe: s });
    }
}
