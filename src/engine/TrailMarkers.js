/*
 * TrailMarkers
 *
 * Lógica de recorrido mediante las flechas.
 *
 * RESPONSABILIDADES:
 * - Recibir solicitudes de movimiento.
 * - Calcular el destino.
 * - Ejecutar el movimiento gradual.
 * - Ejecutar el movimiento sostenido.
 * - Modificar tour.distance.
 *
 * NO RESPONSABILIDADES:
 * - Crear flechas.
 * - Dibujar flechas.
 * - Posicionar flechas.
 * - Detectar clicks.
 * - Manipular elementos visuales.
 */

export class TrailMarkers {

    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('playcanvas').Entity} camera
     * @param {import('./TourEngine.js').TourEngine} tour
     * @param {object} [options]
     */
    constructor(app, camera, tour, options = {}) {

        this.app = app;

        /*
         * Se conserva camera en el constructor para no romper
         * todavía la integración existente.
         *
         * TrailMarkers ya no la utiliza.
         */
        this.camera = camera;

        this.tour = tour;
        this.trail = tour.trailPath;


        /*
         * Configuración del movimiento.
         */

        this.stepDistance =
            options.stepDistance ?? 2.5;

        this.walkSpeed =
            options.walkSpeed ?? 1.6;

        this.holdDelay =
            options.holdDelay ?? 260;


        /*
         * Estado del movimiento.
         */

        this.targetDistance =
            null;

        this.heldIndex =
            -1;

        /*
         * Dirección utilizada durante
         * el movimiento sostenido.
         *
         * 1  = adelante
         * -1 = atrás
         * 0  = detenido
         */

        this.heldDirection =
            0;

        this._holdTimer =
            null;


        /*
         * Bind.
         */

        this._onUpdate =
            this._update.bind(this);

        this._onWalkRequest =
            this._handleWalkRequest.bind(this);

        this._onStopRequest =
            this._handleStopRequest.bind(this);


        /*
         * Eventos.
         */

        this.app.on(
            'update',
            this._onUpdate
        );

        this.app.on(
            'trail:request-walk',
            this._onWalkRequest
        );

        this.app.on(
            'trail:request-stop',
            this._onStopRequest
        );
    }


    /*
     * =========================================================
     * SOLICITUD DE CAMINAR
     * =========================================================
     *
     * TrailArrowsView informa qué flecha se pulsó.
     *
     * La Vista NO modifica tour.distance.
     */

    _handleWalkRequest(data) {

        if (
            !data ||
            typeof data.direction !== 'number'
        ) {
            return;
        }


        const direction =
            data.direction;


        const index =
            data.index ?? -1;


        /*
         * Guardar estado de la flecha.
         */

        this.heldIndex =
            index;


        /*
         * Guardar dirección.
         *
         * Esta dirección se utilizará para
         * el movimiento sostenido.
         */

        this.heldDirection =
            direction;


        /*
         * =====================================================
         * DESTINO DEL TOQUE
         * =====================================================
         */

        const total =
            this.trail.totalLength();


        this.targetDistance =
            Math.max(
                0,
                Math.min(
                    this.tour.distance +
                    this.stepDistance *
                    direction,
                    total
                )
            );


        /*
         * =====================================================
         * MOVIMIENTO SOSTENIDO
         * =====================================================
         *
         * Después de holdDelay dejamos de perseguir
         * un destino fijo.
         *
         * _walk() continuará utilizando heldDirection.
         */

        clearTimeout(
            this._holdTimer
        );


        this._holdTimer =
            setTimeout(
                () => {

                    if (
                        this.heldIndex === index
                    ) {

                        this.targetDistance =
                            null;
                    }

                },
                this.holdDelay
            );
    }


    /*
     * =========================================================
     * SOLICITUD DE DETENER
     * =========================================================
     */

    _handleStopRequest() {

        clearTimeout(
            this._holdTimer
        );


        this._holdTimer =
            null;


        this.heldIndex =
            -1;


        this.heldDirection =
            0;


        this.targetDistance =
            null;
    }


    /*
     * =========================================================
     * CAMINAR
     * =========================================================
     *
     * Aquí sí se modifica tour.distance porque
     * esta clase contiene la lógica del recorrido.
     */

    _walk(dt) {

        const total =
            this.trail.totalLength();


        let objetivo =
            null;

        let sentido =
            0;


        /*
         * Movimiento hacia un destino concreto.
         */

        if (
            this.targetDistance !== null
        ) {

            objetivo =
                this.targetDistance;


            sentido =
                Math.sign(
                    objetivo -
                    this.tour.distance
                );


            /*
             * Llegamos al destino.
             */

            if (
                Math.abs(
                    objetivo -
                    this.tour.distance
                ) < 0.02
            ) {

                this.tour.distance =
                    objetivo;


                this.targetDistance =
                    null;


                this.tour._emitProgress();

                return;
            }
        }


        /*
         * Movimiento sostenido.
         */

        else if (
            this.heldIndex >= 0
        ) {

            sentido =
                this.heldDirection;
        }


        /*
         * No hay movimiento.
         */

        else {

            return;
        }


        /*
         * Seguridad.
         */

        if (
            sentido === 0
        ) {
            return;
        }


        /*
         * Movimiento gradual.
         */

        const paso =
            this.walkSpeed *
            dt *
            sentido;


        let nueva =
            this.tour.distance +
            paso;


        /*
         * No sobrepasar el destino
         * cuando existe uno.

         */

        if (
            objetivo !== null
        ) {

            nueva =
                sentido > 0
                    ? Math.min(
                        nueva,
                        objetivo
                    )
                    : Math.max(
                        nueva,
                        objetivo
                    );
        }


        /*
         * Mantener dentro del sendero.
         */

        this.tour.distance =
            Math.max(
                0,
                Math.min(
                    nueva,
                    total
                )
            );


        this.tour._emitProgress();
    }


    /*
     * =========================================================
     * UPDATE
     * =========================================================
     */

    _update(dt) {

        this._walk(
            dt || 0.016
        );
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        clearTimeout(
            this._holdTimer
        );


        this._holdTimer =
            null;


        this.heldIndex =
            -1;


        this.heldDirection =
            0;


        this.targetDistance =
            null;


        this.app.off(
            'update',
            this._onUpdate
        );


        this.app.off(
            'trail:request-walk',
            this._onWalkRequest
        );


        this.app.off(
            'trail:request-stop',
            this._onStopRequest
        );
    }
}