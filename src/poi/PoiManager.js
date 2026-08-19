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

        /*
         * =====================================================
         * ESTADO DE LA FICHA
         * =====================================================
         */

        this.poiCardOpen = false;


        /*
         * =====================================================
         * BIND
         * =====================================================
         */

        this._onPointerDown =
            this._onPointerDown.bind(this);

        this._onUpdate =
            this._onUpdate.bind(this);

        this._onPoiOpen =
            this._onPoiOpen.bind(this);

        this._onPoiClose =
            this._onPoiClose.bind(this);


        /*
         * =====================================================
         * CLICK SOBRE CANVAS
         * =====================================================
         */

        app.graphicsDevice.canvas.addEventListener(
            'pointerdown',
            this._onPointerDown,
            true
        );


        /*
         * =====================================================
         * ACTUALIZACIÓN
         * =====================================================
         */

        app.on(
            'update',
            this._onUpdate
        );


        /*
         * =====================================================
         * EVENTOS DE LA FICHA
         * =====================================================
         */

        app.on(
            'poi:open',
            this._onPoiOpen
        );

        app.on(
            'poi:close',
            this._onPoiClose
        );


        console.log(
            'PoiManager listo'
        );
    }


    /*
     * =========================================================
     * CUANDO SE ABRE UNA FICHA
     * =========================================================
     */

    _onPoiOpen(poi) {

        console.log(
            'PoiManager: ficha abierta',
            poi?.id
        );

        this.poiCardOpen = true;

        this._hideAllMarkers();
    }


    /*
     * =========================================================
     * CUANDO SE CIERRA UNA FICHA
     * =========================================================
     */

    _onPoiClose() {

        console.log(
            'PoiManager: ficha cerrada'
        );

        this.poiCardOpen = false;

        this._showAllMarkers();
    }


    /*
     * =========================================================
     * OCULTAR POI
     * =========================================================
     */

    _hideAllMarkers() {

        for (const marker of this.markers) {

            if (
                !marker ||
                !marker.element
            ) {
                continue;
            }

            marker.element.style.display =
                'none';

            marker.element.style.visibility =
                'hidden';

            marker.element.style.pointerEvents =
                'none';
        }
    }


    /*
     * =========================================================
     * MOSTRAR POI
     * =========================================================
     */

    _showAllMarkers() {

        for (const marker of this.markers) {

            if (
                !marker ||
                !marker.element
            ) {
                continue;
            }

            marker.element.style.visibility =
                'visible';

            marker.element.style.pointerEvents =
                'auto';
        }
    }


    /*
     * =========================================================
     * CARGAR POIs
     * =========================================================
     */

    async load() {

        const response =
            await fetch(
                POIS_CONFIG_URL
            );

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
         * Por seguridad, limpiar marcadores
         * anteriores si load() se llama otra vez.
         */

        this.markers.forEach(
            marker => {

                if (
                    marker.element
                ) {
                    marker.element.remove();
                }

            }
        );

        this.markers = [];


        /*
         * Crear POIs
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
     * RESOLVER POSICIÓN DEL POI
     * =========================================================
     *
     * PRIORIDAD:
     *
     * 1. anchor
     * 2. distanceMeters
     * 3. posición 0,0,0
     *
     * Esto permite que posteriormente podamos colocar
     * cada modelo exactamente en coordenadas del mundo.
     */

    _resolveWorldPosition(poi) {

        /*
         * =====================================================
         * OPCIÓN 1: COORDENADAS DEL MUNDO
         * =====================================================
         */

        if (
            poi.anchor &&
            typeof poi.anchor.x === 'number' &&
            typeof poi.anchor.y === 'number' &&
            typeof poi.anchor.z === 'number'
        ) {

            console.log(
                `POI ${poi.id} usando anchor:`,
                poi.anchor
            );

            return {
                x: poi.anchor.x,
                y: poi.anchor.y,
                z: poi.anchor.z
            };
        }


        /*
         * =====================================================
         * OPCIÓN 2: DISTANCIA SOBRE EL SENDERO
         * =====================================================
         */

        const distanceMeters =
            Number(
                poi.distanceMeters
            );


        const trail =
            this.tour?.trailPath;


        if (
            trail &&
            trail.isUsable &&
            Number.isFinite(distanceMeters)
        ) {

            const total =
                trail.totalLength();


            const distance =
                Math.max(
                    0,
                    Math.min(
                        distanceMeters,
                        total
                    )
                );


            const position =
                trail.positionAt(
                    distance
                );


            console.log(
                `POI ${poi.id} usando distanceMeters:`,
                distance
            );


            return {
                x: position.x,
                y: position.y,
                z: position.z
            };
        }


        /*
         * =====================================================
         * OPCIÓN 3: RESPALDO
         * =====================================================
         */

        console.warn(
            `POI ${poi.id} no tiene posición válida. ` +
            `Usando 0,0,0.`
        );


        return {
            x: 0,
            y: 0,
            z: 0
        };
    }


    /*
     * =========================================================
     * CREAR BOTÓN DEL POI
     * =========================================================
     */

    _createMarker(poi, index) {

        /*
         * =====================================================
         * POSICIÓN 3D REAL
         * =====================================================
         */

        const position =
            this._resolveWorldPosition(
                poi
            );


        /*
         * Levantar ligeramente el marcador
         * respecto al suelo.
         *
         * IMPORTANTE:
         * Esta pequeña elevación solo afecta al botón.
         * El anchor original permanece intacto.
         */

        const worldPosition = {

            x: position.x,

            y: position.y + 0.12,

            z: position.z
        };


        /*
         * =====================================================
         * CREAR BOTÓN
         * =====================================================
         */

        const button =
            document.createElement(
                'button'
            );


        /*
         * =====================================================
         * IDENTIFICACIÓN
         * =====================================================
         */

        button.className =
            'sendero-vivo-poi-marker';

        button.dataset.poiId =
            poi.id ||
            `poi-${index}`;

        button.dataset.poiMarker =
            'true';


        /*
         * =====================================================
         * ESTILO
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
         * INFORMACIÓN
         * =====================================================
         */

        button.title =
            poi.commonName ||
            'Punto de interés';


        /*
         * =====================================================
         * HOVER
         * =====================================================
         */

        button.addEventListener(
            'mouseenter',
            () => {

                if (
                    this.poiCardOpen
                ) {
                    return;
                }

                button.style.transform =
                    'translate(-50%, -50%) scale(1.12)';

                button.style.boxShadow =
                    '0 6px 18px rgba(0,0,0,0.55)';
            }
        );


        button.addEventListener(
            'mouseleave',
            () => {

                button.style.transform =
                    'translate(-50%, -50%) scale(1)';

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


                if (
                    this.poiCardOpen
                ) {
                    return;
                }


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
         * AGREGAR AL DOM
         * =====================================================
         */

        document.body.appendChild(
            button
        );


        /*
         * =====================================================
         * GUARDAR MARKER
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

            /*
             * Posición original sin offset.
             * Esta es la que utilizaremos para
             * anclar el modelo 3D.
             */

            anchorPosition: {

                x: position.x,

                y: position.y,

                z: position.z
            },

            enabled:
                true,

            /*
             * Referencia futura al modelo 3D.
             */

            modelEntity:
                null
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
            `POI ${index + 1}:`,
            poi.commonName
        );

        console.log(
            'ID:',
            poi.id
        );

        console.log(
            'Anchor:',
            poi.anchor
        );

        console.log(
            'Distancia:',
            poi.distanceMeters
        );

        console.log(
            'World position:',
            marker.anchorPosition
        );

        console.log(
            'Modelo:',
            poi.modelUrl
        );

        console.log(
            'Animación:',
            poi.idleAnimation
        );

        console.log(
            '================================'
        );
    }


    /*
     * =========================================================
     * ACTUALIZAR POSICIÓN EN PANTALLA
     * =========================================================
     */

    _onUpdate() {

        if (
            !this.camera ||
            !this.camera.camera
        ) {
            return;
        }


        /*
         * Si hay una ficha abierta,
         * no actualizar marcadores.
         */

        if (
            this.poiCardOpen
        ) {

            this._hideAllMarkers();

            return;
        }


        const canvas =
            this.app.graphicsDevice.canvas;

        const rect =
            canvas.getBoundingClientRect();


        /*
         * =====================================================
         * PROYECTAR POIS
         * =====================================================
         */

        for (
            const marker of this.markers
        ) {

            if (
                !marker ||
                !marker.enabled ||
                !marker.element
            ) {
                continue;
            }


            const screen =
                this.camera.camera.worldToScreen(
                    marker.worldPosition
                );


            /*
             * Detrás de la cámara
             */

            if (
                screen.z <= 0
            ) {

                marker.element.style.display =
                    'none';

                continue;
            }


            /*
             * Coordenadas de pantalla
             */

            const screenX =
                rect.left +
                screen.x;

            const screenY =
                rect.top +
                screen.y;


            /*
             * Fuera de pantalla
             */

            if (
                screenX < -60 ||
                screenX >
                    window.innerWidth + 60 ||
                screenY < -60 ||
                screenY >
                    window.innerHeight + 60
            ) {

                marker.element.style.display =
                    'none';

                continue;
            }


            /*
             * Mostrar
             */

            marker.element.style.display =
                'flex';

            marker.element.style.visibility =
                'visible';

            marker.element.style.pointerEvents =
                'auto';


            /*
             * Posición
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
     */

    _onPointerDown(event) {

        if (
            this.poiCardOpen
        ) {
            return;
        }


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


        let closest =
            null;

        let closestDistance =
            Infinity;


        for (
            const marker of this.markers
        ) {

            if (
                !marker ||
                !marker.enabled
            ) {
                continue;
            }


            const screen =
                this.camera.camera.worldToScreen(
                    marker.worldPosition
                );


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
     * ABRIR POI
     * =========================================================
     */

    openPoi(poi) {

        if (
            this.poiCardOpen
        ) {
            return;
        }


        /*
         * Guardar posición del recorrido.
         */

        this.savedState =
            this.tour.saveState();


        this.selectedPoi =
            poi;


        /*
         * Ocultar botones.
         */

        this.poiCardOpen =
            true;

        this._hideAllMarkers();


        /*
         * Abrir ficha.
         */

        this.app.fire(
            'poi:open',
            poi
        );
    }


    /*
     * =========================================================
     * CERRAR POI
     * =========================================================
     */

    closePoi() {

        /*
         * Cerrar ficha.
         */

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


        this.savedState =
            null;

        this.selectedPoi =
            null;


        /*
         * Restaurar botones.
         */

        this.poiCardOpen =
            false;

        this._showAllMarkers();
    }


    /*
     * =========================================================
     * OBTENER POSICIÓN DE UN POI
     * =========================================================
     *
     * Esta función nos servirá después para cargar el GLB
     * directamente en la escena.
     *
     * Ejemplo:
     *
     * const pos =
     *     poiManager.getPoiWorldPosition(
     *         'poi-colibri-chillon'
     *     );
     */

    getPoiWorldPosition(poiId) {

        const marker =
            this.markers.find(
                m =>
                    m.id === poiId
            );


        if (
            !marker
        ) {

            console.warn(
                `No existe el POI ${poiId}`
            );

            return null;
        }


        return {

            x:
                marker.anchorPosition.x,

            y:
                marker.anchorPosition.y,

            z:
                marker.anchorPosition.z
        };
    }


    /*
     * =========================================================
     * OBTENER MARKER
     * =========================================================
     */

    getMarker(poiId) {

        return this.markers.find(
            marker =>
                marker.id === poiId
        ) || null;
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        const canvas =
            this.app.graphicsDevice.canvas;


        /*
         * Quitar listener del canvas.
         */

        canvas.removeEventListener(
            'pointerdown',
            this._onPointerDown,
            true
        );


        /*
         * Quitar update.
         */

        this.app.off(
            'update',
            this._onUpdate
        );


        /*
         * Quitar eventos.
         */

        this.app.off(
            'poi:open',
            this._onPoiOpen
        );

        this.app.off(
            'poi:close',
            this._onPoiClose
        );


        /*
         * Eliminar botones.
         */

        this.markers.forEach(
            (marker) => {

                if (
                    marker.element
                ) {

                    marker.element.remove();
                }


                /*
                 * Si posteriormente hay un modelo
                 * 3D cargado, también lo destruimos.
                 */

                if (
                    marker.modelEntity
                ) {

                    marker.modelEntity.destroy();

                    marker.modelEntity =
                        null;
                }

            }
        );


        this.markers = [];

        this.poiCardOpen =
            false;
    }
}