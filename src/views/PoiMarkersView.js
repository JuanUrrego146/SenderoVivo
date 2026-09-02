/*
 * PoiMarkersView
 *
 * Vista de los puntos de interés sobre la escena 3D.
 *
 * RESPONSABILIDADES:
 * - Crear los hotspots visuales.
 * - Dibujar los hotspots.
 * - Posicionar los hotspots en pantalla.
 * - Mostrar / ocultar hotspots.
 * - Aplicar visualmente un filtro recibido.
 *
 * NO RESPONSABILIDADES:
 * - Leer JSON.
 * - Buscar POIs.
 * - Decidir qué POI seleccionar.
 * - Gestionar lógica del recorrido.
 * - Escuchar eventos del visor.
 * - Decidir cuándo actualizarse.
 * - Reproducir audio.
 * - Abrir modelos 3D.
 */

export class PoiMarkersView {

    /**
     * @param {import('playcanvas').Entity} camera
     */
    constructor(camera) {

        this.camera =
            camera;

        this.overlay =
            document.getElementById(
                'hotspots-overlay'
            );

        this.nodes = {};

        this.items = [];

        this.currentFilter =
            'all';

    }


    /*
     * =========================================================
     * DATOS
     * =========================================================
     */

    /**
     * Recibe los POIs ya preparados.
     *
     * La View no lee pois.json.
     */
    setItems(items = []) {

        this.items =
            Array.isArray(items)
                ? items
                : [];

        this.render();

    }


    /**
     * Recibe las posiciones de mundo
     * calculadas por el controlador.
     *
     * Formato esperado:
     *
     * {
     *     poiId: Vec3
     * }
     */
    setAnchors(anchors = {}) {

        this.anchors =
            anchors || {};

    }


    /*
     * =========================================================
     * FILTRO
     * =========================================================
     */

    /**
     * Aplica visualmente el filtro recibido.
     *
     * La decisión del filtro pertenece al controlador.
     */
    setFilter(category = 'all') {

        this.currentFilter =
            category;

    }


    /*
     * =========================================================
     * CREACIÓN
     * =========================================================
     */

    /**
     * Construye los hotspots.
     */
    render() {

        if (!this.overlay) {
            return;
        }

        this.overlay.innerHTML =
            '';

        this.nodes =
            {};

        for (
            const item of this.items
        ) {

            const element =
                this._createMarker(
                    item
                );

            if (!element) {
                continue;
            }

            this.overlay.appendChild(
                element
            );

            this.nodes[item.id] =
                element;
        }

    }


    /**
     * Crea un hotspot visual.
     *
     * No registra acciones de negocio.
     */
    _createMarker(item) {

        const element =
            document.createElement(
                'div'
            );

        element.className =
            'absolute pointer-events-auto cursor-pointer group z-30 touch-manipulation';

        element.style.cssText =
            'left:0; top:0; display:none; will-change:transform;';

        element.innerHTML = `
            <div class="relative w-10 h-10 -translate-x-1/2 -translate-y-1/2">

                <div class="hotspot-ring"></div>

                <div
                    class="absolute inset-0 rounded-2xl glass-panel border flex items-center justify-center text-sm transition-all duration-300 transform group-hover:scale-125 shadow-xl"
                    style="
                        border-color: ${item.color};
                        color: ${item.color};
                        background: var(--sv-scrim-850);
                    "
                >
                    <i class="fa-solid ${item.icon}"></i>
                </div>

                <div
                    class="absolute left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                >
                    <div
                        class="glass-panel px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-100 flex items-center gap-1.5 shadow-lg"
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full"
                            style="background-color: ${item.color}"
                        ></span>

                        ${item.name}
                    </div>
                </div>

            </div>
        `;

        /*
         * IMPORTANTE:
         *
         * La View NO ejecuta selectHotspot().
         *
         * El controlador podrá conectar la interacción
         * posteriormente.
         */

        return element;

    }


    /*
     * =========================================================
     * ACTUALIZACIÓN VISUAL
     * =========================================================
     */

    /**
     * Actualiza la posición de todos los hotspots.
     *
     * El controlador decide cuándo llamar este método.
     */
    update() {

        if (
            !this.camera ||
            !this.camera.camera ||
            !this.anchors
        ) {
            return;
        }

        const width =
            window.innerWidth;

        const height =
            window.innerHeight;

        const cameraPosition =
            this.camera.getPosition();

        const cameraForward =
            this.camera.forward;


        for (
            const item of this.items
        ) {

            const element =
                this.nodes[item.id];

            if (!element) {
                continue;
            }

            const world =
                this.anchors[item.id];


            /*
             * Sin posición disponible.
             */

            if (!world) {

                element.style.display =
                    'none';

                continue;

            }


            /*
             * Filtro visual.
             */

            if (
                this.currentFilter !== 'all' &&
                item.category !== this.currentFilter
            ) {

                element.style.display =
                    'none';

                continue;

            }


            /*
             * Vector cámara → POI.
             */

            const vx =
                world.x -
                cameraPosition.x;

            const vy =
                world.y -
                cameraPosition.y;

            const vz =
                world.z -
                cameraPosition.z;


            /*
             * Comprobamos si está delante.
             */

            const frente =
                cameraForward.x * vx +
                cameraForward.y * vy +
                cameraForward.z * vz;


            if (
                frente < 0.3
            ) {

                element.style.display =
                    'none';

                continue;

            }


            /*
             * Proyección mundo → pantalla.
             */

            const screen =
                this.camera.camera.worldToScreen(
                    world
                );


            if (
                screen.x < -60 ||
                screen.x > width + 60 ||
                screen.y < -60 ||
                screen.y > height + 60
            ) {

                element.style.display =
                    'none';

                continue;

            }


            /*
             * Mostrar hotspot.
             */

            element.style.display =
                'block';


            element.style.transform =
                `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`;

        }

    }


    /*
     * =========================================================
     * VISIBILIDAD
     * =========================================================
     */

    /**
     * Muestra u oculta un POI específico.
     */
    setVisible(
        id,
        visible
    ) {

        const element =
            this.nodes[id];

        if (!element) {
            return;
        }

        element.style.display =
            visible
                ? 'block'
                : 'none';

    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        if (this.overlay) {

            this.overlay.innerHTML =
                '';

        }

        this.nodes =
            {};

        this.items =
            [];

        this.anchors =
            {};

    }

}