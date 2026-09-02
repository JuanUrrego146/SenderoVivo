/*
 * HudView
 *
 * Vista del HUD del recorrido.
 *
 * RESPONSABILIDADES:
 * - Mostrar el progreso del sendero.
 * - Mostrar distancia recorrida.
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

        if (!element) {
            return;
        }

        element.innerText =
            text;

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