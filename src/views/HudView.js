/*
 * HudView
 *
 * Vista del HUD del recorrido.
 *
 * RESPONSABILIDADES:
 * - Mostrar el progreso del sendero.
 * - Mostrar distancia recorrida.
 * - Mostrar distancia restante.
 * - Mostrar desnivel.
 * - Mostrar altitud.
 * - Mostrar pendiente.
 *
 * NO RESPONSABILIDADES:
 * - Escuchar eventos del recorrido.
 * - Calcular datos del recorrido.
 * - Modificar tour.distance.
 * - Leer JSON.
 * - Decidir cuándo actualizarse.
 *
 * El controlador prepara los datos y llama a esta View.
 */

export class HudView {

    constructor() {

        this.root =
            document.body;

    }


    /*
     * =========================================================
     * UTILIDADES
     * =========================================================
     */

    /**
     * Busca un elemento de la interfaz por su ID.
     */
    get(id) {

        return document.getElementById(id);

    }


    /*
     * =========================================================
     * PROGRESO
     * =========================================================
     */

    /**
     * Actualiza el porcentaje visual del recorrido.
     *
     * El porcentaje ya debe venir calculado.
     */
    setProgress(percent) {

        const element =
            this.get('progreso-pct');

        if (!element) {
            return;
        }

        element.innerText =
            `Progreso sendero · ${Math.round(percent)} %`;

        const bar = this.get('carga-barra-hud');
        if (bar) {
            bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        }
    }


    /*
     * =========================================================
     * DATOS DEL RECORRIDO
     * =========================================================
     */

    /**
     * Muestra la distancia recorrida.
     */
    setRecorrido(text) {
        const element =
            this.get('hud-recorrido');
        if (element) element.innerText = text;
        const mobile = this.get('hud-recorrido-m');
        if (mobile) mobile.innerText = text;
    }


    /**
     * Muestra la distancia restante.
     */
    setRestante(text) {
        const element = this.get('hud-restante');
        if (element) element.innerText = text;
        const mobile = this.get('hud-restante-m');
        if (mobile) mobile.innerText = text;
    }


    setEta(text, poiName = 'Próximo punto') {
        const element = this.get('hud-eta');
        if (element) element.innerText = text;
        const label = this.get('hud-eta-label');
        if (label) label.textContent = poiName;
    }


    /**
     * Muestra el desnivel.
     */
    setDesnivel(text) {

        const element =
            this.get('hud-desnivel');

        if (!element) {
            return;
        }

        element.innerText =
            text;

        const mobile = this.get('hud-desnivel-m');
        if (mobile) mobile.innerText = text;
    }


    /**
     * Muestra la altitud.
     */
    setAltitud(text) {

        const element =
            this.get('hud-altitud');

        if (!element) {
            return;
        }

        element.innerText =
            text;

        const top = this.get('hud-altitud-top');
        if (top) top.innerText = text;
        const mobile = this.get('hud-altitud-m');
        if (mobile) mobile.innerText = text;
    }


    /**
     * Muestra la pendiente.
     */
    setPendiente(text) {

        const element =
            this.get('hud-pendiente');

        if (!element) {
            return;
        }

        element.innerText =
            text;

        const mobile = this.get('hud-pendiente-m');
        if (mobile) mobile.innerText = text;
    }


    /*
     * =========================================================
     * ACTUALIZACIÓN COMPLETA
     * =========================================================
     */

    /**
     * Actualiza todos los valores del HUD.
     *
     * Los datos llegan ya preparados.
     */
    update(data = {}) {

        if (
            data.progress !== undefined
        ) {
            this.setProgress(
                data.progress
            );
        }


        if (
            data.recorrido !== undefined
        ) {
            this.setRecorrido(
                data.recorrido
            );
        }

        if (
            data.restante !== undefined
        ) {
            this.setRestante(
                data.restante
            );
        }

        if (data.eta !== undefined) {
            this.setEta(data.eta, data.nextPoi);
        }

        if (
            data.altitud !== undefined ||
            data.recorrido !== undefined ||
            data.restante !== undefined
        ) {
            const values = [
                data.altitud,
                data.recorrido,
                data.restante
            ].filter(value => value !== undefined);
            const mobile = this.get('hud-datos-mobile');
            if (mobile) mobile.innerText = values.join(' · ');
        }


        if (
            data.desnivel !== undefined
        ) {
            this.setDesnivel(
                data.desnivel
            );
        }


        if (
            data.altitud !== undefined
        ) {
            this.setAltitud(
                data.altitud
            );
        }


        if (
            data.pendiente !== undefined
        ) {
            this.setPendiente(
                data.pendiente
            );
        }

    }

}