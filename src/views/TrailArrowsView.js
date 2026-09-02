/*
 * TrailArrowsView
 *
 * Vista de las flechas de avance dentro de la escena 3D.
 *
 * RESPONSABILIDADES:
 * - Crear las flechas.
 * - Dibujarlas.
 * - Posicionarlas sobre el sendero.
 * - Mostrar / ocultar flechas.
 * - Detectar interacción del usuario.
 * - Emitir eventos de solicitud.
 *
 * NO RESPONSABILIDADES:
 * - Caminar.
 * - Modificar tour.distance.
 * - Ejecutar _walk().
 * - Decidir cómo se realiza el recorrido.
 */

import {
    Color,
    Entity,
    StandardMaterial,
    Vec3,
    BLEND_NORMAL,
    Texture,
    ADDRESS_CLAMP_TO_EDGE,
    FILTER_LINEAR,
    PIXELFORMAT_RGBA8
} from 'playcanvas';


/**
 * Obtiene un color hexadecimal desde los tokens CSS.
 *
 * Los colores de la aplicación deben definirse en:
 * styles/tokens.css
 */
function colorFromToken(tokenName) {

    const value =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue(tokenName)
            .trim();

    const hex =
        value.startsWith('#')
            ? value.slice(1)
            : value;

    const number =
        parseInt(hex, 16);

    if (Number.isNaN(number)) {
        throw new Error(
            `No se pudo leer el token de color ${tokenName}.`
        );
    }

    return new Color(
        ((number >> 16) & 255) / 255,
        ((number >> 8) & 255) / 255,
        (number & 255) / 255
    );
}


/**
 * Obtiene un valor CSS completo desde tokens.css.
 *
 * Se utiliza para valores como:
 * rgba(...)
 */
function cssToken(tokenName) {

    const value =
        getComputedStyle(
            document.documentElement
        )
            .getPropertyValue(tokenName)
            .trim();

    if (!value) {
        throw new Error(
            `No se pudo leer el token CSS ${tokenName}.`
        );
    }

    return value;
}


/**
 * Dibuja la flecha en un canvas y la convierte
 * en una textura de PlayCanvas.
 *
 * Los colores llegan desde styles/tokens.css.
 */
function createArrowTexture(
    device,
    fillColor,
    strokeColor
) {

    const size = 256;

    const canvas =
        document.createElement('canvas');

    canvas.width = size;
    canvas.height = size;

    const ctx =
        canvas.getContext('2d');

    if (!ctx) {
        throw new Error(
            'No se pudo crear el contexto 2D para las flechas.'
        );
    }

    ctx.clearRect(
        0,
        0,
        size,
        size
    );

    ctx.fillStyle =
        fillColor;

    ctx.strokeStyle =
        strokeColor;

    ctx.lineWidth =
        8;

    ctx.lineJoin =
        'round';


    /*
     * Punta hacia arriba del canvas.
     */

    ctx.beginPath();

    ctx.moveTo(
        size * 0.5,
        size * 0.12
    );

    ctx.lineTo(
        size * 0.86,
        size * 0.54
    );

    ctx.lineTo(
        size * 0.66,
        size * 0.54
    );

    ctx.lineTo(
        size * 0.66,
        size * 0.88
    );

    ctx.lineTo(
        size * 0.34,
        size * 0.88
    );

    ctx.lineTo(
        size * 0.34,
        size * 0.54
    );

    ctx.lineTo(
        size * 0.14,
        size * 0.54
    );

    ctx.closePath();

    ctx.fill();
    ctx.stroke();


    const texture =
        new Texture(
            device,
            {
                width: size,
                height: size,
                format: PIXELFORMAT_RGBA8,
                addressU: ADDRESS_CLAMP_TO_EDGE,
                addressV: ADDRESS_CLAMP_TO_EDGE,
                magFilter: FILTER_LINEAR,
                minFilter: FILTER_LINEAR,
                mipmaps: true
            }
        );

    texture.setSource(canvas);

    return texture;
}


export class TrailArrowsView {

    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('playcanvas').Entity} camera
     * @param {import('../engine/TourEngine.js').TourEngine} tour
     * @param {object} [options]
     */
    constructor(
        app,
        camera,
        tour,
        options = {}
    ) {

        this.app = app;
        this.camera = camera;
        this.tour = tour;
        this.trail = tour.trailPath;


        /*
         * =====================================================
         * CONFIGURACIÓN VISUAL
         * =====================================================
         */

        this.stepDistance =
            options.stepDistance ?? 2.5;

        this.size =
            options.size ?? 1.1;

        this.groundOffset =
            options.groundOffset ?? -1.0;

        this.onlyVisible =
            options.onlyVisible ?? true;


        /*
         * Índice de la flecha sobre la que está el cursor.
         */

        this.hoverIndex =
            -1;


        /*
         * =====================================================
         * COLORES
         * =====================================================
         *
         * Ningún color se define directamente en esta Vista.
         * Todo viene de styles/tokens.css.
         */

        const arrowFill =
            cssToken(
                '--sv-green-300'
            );

        const arrowStroke =
            cssToken(
                '--sv-scrim-550'
            );

        const materialColor =
            colorFromToken(
                '--sv-gray-050'
            );


        /*
         * =====================================================
         * TEXTURA
         * =====================================================
         */

        this.texture =
            createArrowTexture(
                app.graphicsDevice,
                arrowFill,
                arrowStroke
            );


        /*
         * =====================================================
         * CAPA UI
         * =====================================================
         */

        this.layer =
            app.scene.layers.getLayerByName(
                'UI'
            );


        if (
            this.layer &&
            !camera.camera.layers.includes(
                this.layer.id
            )
        ) {

            camera.camera.layers = [
                ...camera.camera.layers,
                this.layer.id
            ];
        }


        /*
         * =====================================================
         * FLECHAS
         * =====================================================
         */

        this.markers = [

            this._createMarker(
                'marker-forward',
                1,
                materialColor
            ),

            this._createMarker(
                'marker-back',
                -1,
                materialColor
            )

        ];


        /*
         * =====================================================
         * VECTORES REUTILIZABLES
         * =====================================================
         *
         * Evita crear nuevos Vec3 en cada frame.
         */

        this._direction =
            new Vec3();

        this._position =
            new Vec3();

        this._forward =
            new Vec3();

        this._cameraPosition =
            new Vec3();

        this._towardMarker =
            new Vec3();


        /*
         * =====================================================
         * BIND
         * =====================================================
         */

        this._onUpdate =
            this._update.bind(this);

        this._pointerDown =
            this._handlePointerDown.bind(this);

        this._pointerUp =
            this._handlePointerUp.bind(this);

        this._pointerMove =
            this._handlePointerMove.bind(this);


        /*
         * =====================================================
         * EVENTOS
         * =====================================================
         */

        this.app.on(
            'update',
            this._onUpdate
        );

        this._bindPicking();
    }


    /*
     * =========================================================
     * CREAR FLECHA
     * =========================================================
     */

    _createMarker(
        name,
        direction,
        materialColor
    ) {

        const material =
            new StandardMaterial();


        /*
         * El color base proviene de tokens.css.
         */

        material.diffuse =
            materialColor.clone();

        material.emissive =
            materialColor.clone();


        /*
         * La textura contiene la forma de la flecha.
         */

        material.emissiveMap =
            this.texture;

        material.opacityMap =
            this.texture;


        /*
         * Configuración de transparencia.
         */

        material.blendType =
            BLEND_NORMAL;

        material.opacity =
            0.85;


        /*
         * Las flechas funcionan como elementos
         * de interfaz sobre la escena.
         */

        material.depthTest =
            false;

        material.depthWrite =
            false;

        material.cull =
            0;


        material.update();


        /*
         * Entidad de la flecha.
         */

        const entity =
            new Entity(name);


        const layers =
            this.layer
                ? [this.layer.id]
                : undefined;


        entity.addComponent(
            'render',
            layers
                ? {
                    type: 'plane',
                    material,
                    layers
                }
                : {
                    type: 'plane',
                    material
                }
        );


        /*
         * Escala inicial.
         */

        entity.setLocalScale(
            this.size,
            1,
            this.size
        );


        /*
         * Metadatos visuales.
         *
         * direction:
         *  1  = adelante
         * -1  = atrás
         */

        entity.direction =
            direction;

        entity.baseMaterial =
            material;


        /*
         * Las flechas permanecen ocultas
         * hasta que _update() determine
         * que deben mostrarse.
         */

        entity.enabled =
            false;


        this.app.root.addChild(
            entity
        );


        return entity;
    }


    /*
     * =========================================================
     * INTERACCIÓN
     * =========================================================
     */

    _bindPicking() {

        const canvas =
            this.app.graphicsDevice.canvas;


        /*
         * pointerdown en captura para que la Vista
         * pueda interceptar la interacción con la flecha.
         */

        canvas.addEventListener(
            'pointerdown',
            this._pointerDown,
            true
        );


        window.addEventListener(
            'pointerup',
            this._pointerUp
        );


        window.addEventListener(
            'pointercancel',
            this._pointerUp
        );


        canvas.addEventListener(
            'pointermove',
            this._pointerMove
        );
    }


    /*
     * =========================================================
     * POINTER DOWN
     * =========================================================
     */

    _handlePointerDown(event) {

        const hit =
            this._pick(
                event.clientX,
                event.clientY
            );


        if (hit === null) {
            return;
        }


        event.preventDefault();
        event.stopPropagation();


        /*
         * =====================================================
         * IMPORTANTE MVC
         * =====================================================
         *
         * La Vista NO mueve la cámara.
         *
         * La Vista NO modifica tour.distance.
         *
         * La Vista NO llama tour.press().
         *
         * Únicamente comunica una intención.
         */

        this.app.fire(
            'trail:request-walk',
            {
                index: hit,
                direction:
                    this.markers[hit].direction
            }
        );
    }


    /*
     * =========================================================
     * POINTER UP
     * =========================================================
     */

    _handlePointerUp() {

        /*
         * La Vista solamente solicita detener
         * la acción iniciada anteriormente.
         */

        this.app.fire(
            'trail:request-stop'
        );
    }


    /*
     * =========================================================
     * POINTER MOVE
     * =========================================================
     */

    _handlePointerMove(event) {

        const canvas =
            this.app.graphicsDevice.canvas;


        this.hoverIndex =
            this._pick(
                event.clientX,
                event.clientY
            ) ?? -1;


        /*
         * El cursor es parte de la presentación
         * de la Vista, no de la lógica del recorrido.
         */

        canvas.style.cursor =
            this.hoverIndex >= 0
                ? 'pointer'
                : '';
    }


    /*
     * =========================================================
     * PICK
     * =========================================================
     *
     * Detecta qué flecha está debajo del puntero.
     *
     * No modifica el estado del recorrido.
     */

    _pick(
        clientX,
        clientY
    ) {

        const canvas =
            this.app.graphicsDevice.canvas;


        const rect =
            canvas.getBoundingClientRect();


        /*
         * Coordenadas del puntero dentro del canvas.
         */

        const x =
            clientX - rect.left;

        const y =
            clientY - rect.top;


        this._cameraPosition.copy(
            this.camera.getPosition()
        );


        let best =
            null;


        let bestDist =
            Infinity;


        for (
            let i = 0;
            i < this.markers.length;
            i++
        ) {

            const marker =
                this.markers[i];


            if (
                !marker.enabled
            ) {
                continue;
            }


            /*
             * Convertir posición 3D a posición 2D.
             */

            const screen =
                this.camera.camera.worldToScreen(
                    marker.getPosition()
                );


            if (
                screen.z <= 0
            ) {
                continue;
            }


            /*
             * Distancia de la cámara
             * a la flecha.
             */

            const distanceFromCamera =
                this._cameraPosition.distance(
                    marker.getPosition()
                );


            /*
             * Radio de interacción.
             */

            const radius =
                Math.max(
                    28,
                    (
                        this.size * 260
                    ) /
                    Math.max(
                        distanceFromCamera,
                        0.5
                    )
                );


            const pointerDistance =
                Math.hypot(
                    screen.x - x,
                    screen.y - y
                );


            if (
                pointerDistance < radius &&
                pointerDistance < bestDist
            ) {

                best =
                    i;

                bestDist =
                    pointerDistance;
            }
        }


        return best;
    }


    /*
     * =========================================================
     * ACTUALIZACIÓN VISUAL
     * =========================================================
     *
     * IMPORTANTE:
     *
     * Esta Vista SOLAMENTE lee tour.distance.
     *
     * Nunca modifica:
     *
     * tour.distance
     *
     * El movimiento pertenece al controlador/lógica
     * del recorrido.
     */

    _update() {

        if (
            !this.trail ||
            !this.camera
        ) {
            return;
        }


        const total =
            this.trail.totalLength();


        const distance =
            this.tour.distance;


        /*
         * Dirección y posición reutilizables.
         */

        const dir =
            this._direction;

        const pos =
            this._position;


        for (
            let i = 0;
            i < this.markers.length;
            i++
        ) {

            const marker =
                this.markers[i];


            /*
             * Posición futura de la flecha.
             */

            const target =
                distance +
                this.stepDistance *
                marker.direction;


            /*
             * Determinar si la flecha
             * está fuera del recorrido.
             */

            const outOfRange =
                marker.direction > 0
                    ? distance >= total - 0.05
                    : distance <= 0.05;


            marker.enabled =
                !outOfRange;


            if (
                outOfRange
            ) {
                continue;
            }


            /*
             * Mantener el destino dentro
             * de los límites del sendero.
             */

            const clamped =
                Math.max(
                    0,
                    Math.min(
                        target,
                        total
                    )
                );


            /*
             * Obtener posición sobre el sendero.
             */

            this.trail.positionAt(
                clamped,
                pos
            );


            /*
             * Obtener dirección del sendero.
             */

            this.trail.directionAt(
                clamped,
                dir
            );


            /*
             * Separar la flecha verticalmente
             * respecto al trazado.
             */

            pos.y +=
                this.groundOffset;


            marker.setPosition(
                pos
            );


            /*
             * =================================================
             * ORIENTACIÓN
             * =================================================
             */

            const avance =
                this._forward;


            avance.set(
                dir.x *
                    marker.direction,

                0,

                dir.z *
                    marker.direction
            );


            /*
             * Evitar normalizar un vector prácticamente cero.
             */

            if (
                avance.lengthSq() > 0.000001
            ) {

                avance.normalize();


                const yaw =
                    Math.atan2(
                        -avance.x,
                        -avance.z
                    ) *
                    180 /
                    Math.PI;


                marker.setEulerAngles(
                    0,
                    yaw,
                    0
                );
            }


            /*
             * =================================================
             * VISIBILIDAD SEGÚN DIRECCIÓN DE LA CÁMARA
             * =================================================
             */

            if (
                this.onlyVisible
            ) {

                const haciaLaFlecha =
                    this._towardMarker;


                haciaLaFlecha.sub2(
                    pos,
                    this.camera.getPosition()
                );


                if (
                    haciaLaFlecha.lengthSq() > 0.000001
                ) {

                    haciaLaFlecha.normalize();


                    const mirada =
                        this.camera.forward;


                    if (
                        haciaLaFlecha.dot(
                            mirada
                        ) < 0.15
                    ) {

                        marker.enabled =
                            false;

                        continue;
                    }
                }
            }


            /*
             * =================================================
             * HOVER
             * =================================================
             */

            const resaltada =
                this.hoverIndex === i;


            marker.baseMaterial.opacity =
                resaltada
                    ? 1
                    : 0.85;


            marker.baseMaterial.update();


            /*
             * Escala visual de hover.
             */

            const escala =
                resaltada
                    ? this.size * 1.12
                    : this.size;


            marker.setLocalScale(
                escala,
                1,
                escala
            );
        }
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        /*
         * Quitar actualización.
         */

        this.app.off(
            'update',
            this._onUpdate
        );


        /*
         * Quitar eventos del canvas.
         */

        const canvas =
            this.app.graphicsDevice.canvas;


        canvas.removeEventListener(
            'pointerdown',
            this._pointerDown,
            true
        );


        window.removeEventListener(
            'pointerup',
            this._pointerUp
        );


        window.removeEventListener(
            'pointercancel',
            this._pointerUp
        );


        canvas.removeEventListener(
            'pointermove',
            this._pointerMove
        );


        /*
         * Limpiar cursor.
         */

        canvas.style.cursor =
            '';


        /*
         * Destruir las entidades.
         */

        this.markers.forEach(
            marker => {

                if (marker) {
                    marker.destroy();
                }

            }
        );


        this.markers =
            [];


        /*
         * Liberar la textura.
         */

        if (this.texture) {
            this.texture.destroy();
            this.texture = null;
        }


        /*
         * Limpiar referencias.
         */

        this.trail =
            null;

        this.tour =
            null;

        this.camera =
            null;
    }
}