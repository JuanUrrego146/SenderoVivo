import { Entity } from 'playcanvas';

const POIS_CONFIG_URL = 'config/pois.json';

export class PoiManager {

    constructor(app, camera, tour) {

        this.app = app;
        this.camera = camera;
        this.tour = tour;

        this.pois = [];
        this.markers = [];
        this.selectedPoi = null;
        this.savedState = null;

        this._onPointerDown =
            this._onPointerDown.bind(this);

        this._onUpdate =
            this._onUpdate.bind(this);

        /*
         * =====================================================
         * CLICK
         * =====================================================
         */

        app.graphicsDevice.canvas.addEventListener(
            'pointerdown',
            this._onPointerDown,
            true
        );

        /*
         * =====================================================
         * ACTUALIZAR POSICIÓN DE LOS BOTONES
         * =====================================================
         */

        app.on(
            'update',
            this._onUpdate
        );
    }


    /*
     * =========================================================
     * CARGAR POIs
     * =========================================================
     */

    async load() {

        const response =
            await fetch(POIS_CONFIG_URL);

        if (!response.ok) {

            throw new Error(
                `No se pudo leer ${POIS_CONFIG_URL}`
            );
        }

        const config =
            await response.json();

        this.pois =
            Array.isArray(config.pois)
                ? config.pois
                : [];

        /*
         * Crear todos los POIs.
         */

        this.pois.forEach(
            (poi, index) => {

                this._createMarker(
                    poi,
                    index
                );

            }
        );

        console.log(
            'POIs cargados:',
            this.markers
        );
    }


    /*
     * =========================================================
     * CREAR BOTÓN DEL POI
     * =========================================================
     */

    _createMarker(poi, index) {

        /*
         * =====================================================
         * OBTENER SENDERO
         * =====================================================
         */

        const trail =
            this.tour.trailPath;

        let position;


        if (
            trail &&
            trail.isUsable
        ) {

            const total =
                trail.totalLength();

            /*
             * POI ubicado cerca del inicio,
             * pero no pegado a la cámara.
             *
             * 18% del recorrido.
             */

            const distance =
                total * 0.18;

            position =
                trail.positionAt(
                    distance
                );

        } else {

            /*
             * Posición de respaldo.
             */

            position = {
                x: 0,
                y: 0,
                z: 0
            };
        }


        /*
         * =====================================================
         * POSICIÓN DEL POI
         * =====================================================
         *
         * Solo lo levantamos un poquito del suelo.
         *
         * NO usamos +0.5 ni +1.5 porque eso hacía
         * que pareciera flotando demasiado.
         */

        const worldPosition = {
            x: position.x,
            y: position.y + 0.12,
            z: position.z
        };


        /*
         * =====================================================
         * CREAR BOTÓN HTML
         * =====================================================
         */

        const button =
            document.createElement('button');


        /*
         * =====================================================
         * ESTILO DEL BOTÓN
         * =====================================================
         */

        button.style.position =
            'fixed';

        button.style.width =
            '48px';

        button.style.height =
            '48px';

        button.style.border =
            '2px solid rgba(255,255,255,0.85)';

        button.style.borderRadius =
            '50%';

        button.style.background =
            'rgba(24, 37, 29, 0.88)';

        button.style.color =
            '#6fcf97';

        button.style.fontSize =
            '23px';

        button.style.display =
            'flex';

        button.style.alignItems =
            'center';

        button.style.justifyContent =
            'center';

        button.style.padding =
            '0';

        button.style.margin =
            '0';

        button.style.cursor =
            'pointer';

        button.style.zIndex =
            '500';

        button.style.boxSizing =
            'border-box';

        button.style.boxShadow =
            '0 4px 14px rgba(0,0,0,0.45)';

        button.style.transition =
            'transform 0.15s ease, box-shadow 0.15s ease';

        button.style.pointerEvents =
            'auto';

        /*
         * Evita estilos por defecto del navegador.
         */

        button.style.outline =
            'none';


        /*
         * =====================================================
         * ICONO
         * =====================================================
         */

        button.innerHTML =
            '🐦';


        /*
         * =====================================================
         * INFORMACIÓN DEL POI
         * =====================================================
         */

        button.title =
            poi.commonName ||
            'Fauna';


        /*
         * =====================================================
         * EFECTO HOVER
         * =====================================================
         */

        button.addEventListener(
            'mouseenter',
            () => {

                button.style.transform =
                    'scale(1.12)';

                button.style.boxShadow =
                    '0 6px 18px rgba(0,0,0,0.55)';
            }
        );


        button.addEventListener(
            'mouseleave',
            () => {

                button.style.transform =
                    'scale(1)';

                button.style.boxShadow =
                    '0 4px 14px rgba(0,0,0,0.45)';
            }
        );


        /*
         * =====================================================
         * CLICK DEL BOTÓN
         * =====================================================
         */

        button.addEventListener(
            'click',
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    'POI seleccionado:',
                    poi
                );

                this.openPoi(
                    poi
                );
            }
        );


        /*
         * =====================================================
         * AGREGAR BOTÓN A LA PÁGINA
         * =====================================================
         */

        document.body.appendChild(
            button
        );


        /*
         * =====================================================
         * GUARDAR INFORMACIÓN
         * =====================================================
         */

        const marker = {

            id:
                poi.id,

            poiData:
                poi,

            element:
                button,

            worldPosition:
                worldPosition,

            enabled:
                true
        };


        this.markers.push(
            marker
        );


        /*
         * =====================================================
         * DEBUG
         * =====================================================
         */

        console.log(
            '================================'
        );

        console.log(
            `POI ${index + 1} creado:`,
            poi.commonName
        );

        console.log(
            'Posición:',
            worldPosition
        );

        console.log(
            'Tipo:',
            'Botón HTML'
        );

        console.log(
            'Tamaño:',
            '48px'
        );

        console.log(
            'Distancia:',
            '18% del recorrido'
        );

        console.log(
            '================================'
        );
    }


    /*
     * =========================================================
     * ACTUALIZAR BOTONES EN PANTALLA
     * =========================================================
     */

    _onUpdate() {

        if (
            !this.camera ||
            !this.camera.camera
        ) {
            return;
        }


        const canvas =
            this.app.graphicsDevice.canvas;

        const rect =
            canvas.getBoundingClientRect();


        /*
         * Revisar todos los POIs.
         */

        for (
            const marker of this.markers
        ) {

            if (
                !marker.enabled ||
                !marker.element
            ) {
                continue;
            }


            /*
             * Convertir posición 3D
             * a posición de pantalla.
             */

            const screen =
                this.camera.camera.worldToScreen(
                    marker.worldPosition
                );


            /*
             * Si está detrás de la cámara,
             * ocultamos el botón.
             */

            if (
                screen.z <= 0
            ) {

                marker.element.style.display =
                    'none';

                continue;
            }


            /*
             * Coordenadas dentro del canvas.
             */

            const screenX =
                rect.left +
                screen.x;

            const screenY =
                rect.top +
                screen.y;


            /*
             * Si está demasiado fuera de la pantalla,
             * también lo ocultamos.
             */

            if (
                screenX < -60 ||
                screenX > window.innerWidth + 60 ||
                screenY < -60 ||
                screenY > window.innerHeight + 60
            ) {

                marker.element.style.display =
                    'none';

                continue;
            }


            /*
             * Mostrar botón.
             */

            marker.element.style.display =
                'flex';


            /*
             * Centrar el botón exactamente
             * sobre el punto 3D.
             */

            marker.element.style.left =
                `${screenX}px`;

            marker.element.style.top =
                `${screenY}px`;

            marker.element.style.transform =
                'translate(-50%, -50%)';
        }
    }


    /*
     * =========================================================
     * CLICK SOBRE EL CANVAS
     * =========================================================
     *
     * Lo mantenemos como respaldo.
     * El botón HTML ya tiene su propio click.
     */

    _onPointerDown(event) {

        const canvas =
            this.app.graphicsDevice.canvas;

        const rect =
            canvas.getBoundingClientRect();

        const x =
            event.clientX -
            rect.left;

        const y =
            event.clientY -
            rect.top;


        let closest = null;

        let closestDistance =
            Infinity;


        /*
         * Revisar todos los POIs.
         */

        for (
            const marker of this.markers
        ) {

            if (
                !marker.enabled
            ) {
                continue;
            }


            const screen =
                this.camera.camera.worldToScreen(
                    marker.worldPosition
                );


            /*
             * Detrás de la cámara.
             */

            if (
                screen.z <= 0
            ) {
                continue;
            }


            const distance =
                Math.hypot(
                    screen.x - x,
                    screen.y - y
                );


            /*
             * Área de selección.
             */

            if (
                distance < 35 &&
                distance < closestDistance
            ) {

                closest =
                    marker;

                closestDistance =
                    distance;
            }
        }


        if (
            !closest
        ) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        console.log(
            'POI seleccionado:',
            closest.poiData
        );


        this.openPoi(
            closest.poiData
        );
    }


    /*
     * =========================================================
     * ABRIR FICHA
     * =========================================================
     */

    openPoi(poi) {

        /*
         * Guardar posición actual.
         */

        this.savedState =
            this.tour.saveState();

        this.selectedPoi =
            poi;


        /*
         * Abrir la ficha.
         */

        this.app.fire(
            'poi:open',
            poi
        );
    }


    /*
     * =========================================================
     * CERRAR FICHA
     * =========================================================
     */

    closePoi() {

        this.app.fire(
            'poi:close'
        );


        /*
         * Restaurar recorrido.
         */

        if (
            this.savedState
        ) {

            this.tour.restoreState(
                this.savedState
            );
        }


        this.savedState = null;

        this.selectedPoi = null;
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        const canvas =
            this.app.graphicsDevice.canvas;


        canvas.removeEventListener(
            'pointerdown',
            this._onPointerDown,
            true
        );


        this.app.off(
            'update',
            this._onUpdate
        );


        /*
         * Eliminar botones HTML.
         */

        this.markers.forEach(
            (marker) => {

                if (
                    marker.element
                ) {

                    marker.element.remove();
                }

            }
        );


        this.markers = [];
    }
}