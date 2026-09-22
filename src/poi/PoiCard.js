import { ModelViewer } from './ModelViewer.js';


export class PoiCard {

    constructor(app) {

        this.app = app;

        this.element = null;

        this.modelViewer = null;

        this.cantoAudio = null;
        this.narracionAudio = null;

        /*
         * Guardamos los botones de POI que ocultamos
         * mientras la ficha está abierta.
         */

        this.hiddenPoiMarkers = [];


        /*
         * Bind
         */

        this._onOpen =
            this._onOpen.bind(this);

        this._onClose =
            this._onClose.bind(this);


        /*
         * Eventos
         */

        app.on(
            'poi:open',
            this._onOpen
        );

        app.on(
            'poi:close',
            this._onClose
        );


        console.log(
            'PoiCard listo'
        );
    }


    /*
     * =========================================================
     * OCULTAR BOTONES POI
     * =========================================================
     *
     * Los botones creados por PoiManager son hijos directos
     * de document.body.
     *
     * Por eso NO vamos a depender del z-index.
     *
     * Los ocultamos directamente.
     */

    _hidePoiMarkers() {

        this.hiddenPoiMarkers = [];


        /*
         * Buscar botones hijos directos del body.
         *
         * Los POI son creados por PoiManager directamente
         * con document.body.appendChild(button).
         */

        const bodyChildren =
            Array.from(
                document.body.children
            );


        for (
            const element of bodyChildren
        ) {

            /*
             * No tocar la ficha.
             */

            if (
                element === this.element
            ) {
                continue;
            }


            /*
             * Solo botones.
             */

            if (
                element.tagName !== 'BUTTON'
            ) {
                continue;
            }


            /*
             * Guardar su display original.
             */

            this.hiddenPoiMarkers.push({

                element:
                    element,

                display:
                    element.style.display,

                visibility:
                    element.style.visibility,

                pointerEvents:
                    element.style.pointerEvents

            });


            /*
             * Ocultarlo completamente.
             */

            element.style.setProperty(
                'display',
                'none',
                'important'
            );

            element.style.setProperty(
                'visibility',
                'hidden',
                'important'
            );

            element.style.setProperty(
                'pointer-events',
                'none',
                'important'
            );
        }


        console.log(
            'POI ocultos:',
            this.hiddenPoiMarkers.length
        );
    }


    /*
     * =========================================================
     * MOSTRAR BOTONES POI
     * =========================================================
     */

    _showPoiMarkers() {

        for (
            const marker of this.hiddenPoiMarkers
        ) {

            if (
                !marker.element ||
                !marker.element.isConnected
            ) {
                continue;
            }


            /*
             * Restaurar valores originales.
             */

            if (
                marker.display
            ) {

                marker.element.style.display =
                    marker.display;

            } else {

                marker.element.style.removeProperty(
                    'display'
                );
            }


            if (
                marker.visibility
            ) {

                marker.element.style.visibility =
                    marker.visibility;

            } else {

                marker.element.style.removeProperty(
                    'visibility'
                );
            }


            if (
                marker.pointerEvents
            ) {

                marker.element.style.pointerEvents =
                    marker.pointerEvents;

            } else {

                marker.element.style.removeProperty(
                    'pointer-events'
                );
            }
        }


        this.hiddenPoiMarkers = [];


        console.log(
            'POI mostrados nuevamente'
        );
    }


    /*
     * =========================================================
     * ABRIR FICHA
     * =========================================================
     */

    async _onOpen(poi) {

        console.log(
            '================================='
        );

        console.log(
            'ABRIENDO FICHA:',
            poi
        );

        console.log(
            '================================='
        );


        /*
         * Limpiar ficha anterior.
         */

        this._remove();


        /*
         * =====================================================
         * OVERLAY
         * =====================================================
         */

        const overlay =
            document.createElement(
                'div'
            );


        overlay.id =
            'sendero-vivo-poi-overlay';


        overlay.style.position =
            'fixed';

        overlay.style.inset =
            '0';

        overlay.style.width =
            '100vw';

        overlay.style.height =
            '100vh';

        overlay.style.background =
            'rgba(0, 0, 0, 0.65)';

        overlay.style.display =
            'flex';

        overlay.style.alignItems =
            'center';

        overlay.style.justifyContent =
            'center';

        /*
         * Z-index altísimo.
         */

        overlay.style.zIndex =
            '2147483647';

        overlay.style.pointerEvents =
            'auto';

        overlay.style.boxSizing =
            'border-box';


        /*
         * =====================================================
         * TARJETA
         * =====================================================
         */

        const card =
            document.createElement(
                'div'
            );


        card.style.position =
            'relative';

        card.style.width =
            '440px';

        card.style.maxWidth =
            '92vw';

        card.style.maxHeight =
            '88vh';

        card.style.overflowY =
            'auto';

        card.style.background =
            'var(--sv-surface-solid, #E9D8C4)';

        card.style.color =
            'var(--sv-text-primary, #1F2E22)';

        card.style.borderRadius =
            '28px';

        card.style.padding =
            '26px';

        card.style.boxSizing =
            'border-box';

        card.style.fontFamily =
            "'Quicksand', system-ui, sans-serif";

        card.style.boxShadow =
            'var(--sv-surface-shadow-lg, 0 24px 60px rgba(40, 26, 15, 0.28))';

        card.style.border =
            '1px solid var(--sv-surface-border, rgba(184, 150, 118, 0.42))';

        card.style.zIndex =
            '2147483647';


        /*
         * =====================================================
         * DATOS
         * =====================================================
         */

        const commonName =
            poi?.commonName ||
            'Golondrina plomiza';


        const scientificName =
            poi?.scientificName ||
            'Notiochelidon murina';


        const altitude =
            poi?.altitudeRange ||
            '1.700 – 3.500 msnm';


        /*
         * =====================================================
         * CONTENIDO
         * =====================================================
         */

        card.innerHTML = `

            <button
                id="poi-close-button"
                type="button"
                style="
                    position:absolute;
                    top:14px;
                    right:14px;
                    width:36px;
                    height:36px;
                    border:1px solid var(--sv-surface-border, rgba(184,150,118,0.42));
                    border-radius:50%;
                    background:var(--sv-surface-solid-warm, #E4C7A8);
                    color:var(--sv-text-primary, #1F2E22);
                    font-size:20px;
                    cursor:pointer;
                    z-index:10;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    transition:all 0.2s;
                "
                onmouseenter="this.style.color='var(--sv-primary, #386641)'; this.style.borderColor='var(--sv-primary, #386641)';"
                onmouseleave="this.style.color='var(--sv-text-primary, #1F2E22)'; this.style.borderColor='var(--sv-surface-border, rgba(184,150,118,0.42))';"
            >
                ✕
            </button>


            <!-- ========================================= -->
            <!-- VISOR 3D -->
            <!-- ========================================= -->

            <div
                id="poi-model"
                style="
                    width:100%;
                    height:230px;
                    margin-bottom:18px;
                    border-radius:20px;
                    overflow:hidden;
                    background:var(--sv-surface-inset, rgba(228, 199, 168, 0.65));
                    border:1px solid var(--sv-surface-border, rgba(184, 150, 118, 0.42));
                    position:relative;
                "
            >

                <div
                    id="poi-model-loading"
                    style="
                        position:absolute;
                        inset:0;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:var(--sv-primary, #386641);
                        font-size:13px;
                        font-weight:600;
                        z-index:2;
                    "
                >
                    <i class="fa-solid fa-cube fa-spin mr-2"></i> Cargando modelo 3D...
                </div>

            </div>


            <!-- ========================================= -->
            <!-- NOMBRE -->
            <!-- ========================================= -->

            <div style="text-align:center; margin-bottom:16px;">
                <span style="display:inline-block; font-size:10px; text-transform:uppercase; font-weight:700; letter-spacing:0.06em; padding:3px 10px; border-radius:999px; background:var(--sv-primary-surface, rgba(56,102,65,0.12)); border:1px solid var(--sv-primary-border, rgba(56,102,65,0.30)); color:var(--sv-primary, #386641); margin-bottom:6px;">
                    Modelo 3D Interactivo
                </span>
                <h2
                    style="
                        margin:0;
                        font-family:'Syne', sans-serif;
                        font-size:24px;
                        font-weight:700;
                        color:var(--sv-text-primary, #1F2E22);
                    "
                >
                    ${commonName}
                </h2>

                <p
                    style="
                        margin:4px 0 0 0;
                        color:var(--sv-primary, #386641);
                        font-style:italic;
                        font-family:monospace;
                        font-size:12px;
                    "
                >
                    ${scientificName}
                </p>
            </div>


            <!-- ========================================= -->
            <!-- INFORMACIÓN -->
            <!-- ========================================= -->

            <div
                style="
                    margin-bottom:16px;
                    padding:12px 16px;
                    background:var(--sv-surface-solid-warm, #E4C7A8);
                    border:1px solid var(--sv-surface-border, rgba(184,150,118,0.42));
                    border-radius:16px;
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:8px;
                    font-size:12px;
                "
            >

                <div>
                    <span style="display:block; font-size:10px; color:var(--sv-text-dim, #6E7E72); text-transform:uppercase; font-weight:600;">Altitud</span>
                    <strong style="color:var(--sv-text-primary, #1F2E22);">${altitude}</strong>
                </div>

                <div>
                    <span style="display:block; font-size:10px; color:var(--sv-text-dim, #6E7E72); text-transform:uppercase; font-weight:600;">Ubicación</span>
                    <strong style="color:var(--sv-text-primary, #1F2E22);">Cerros Orientales</strong>
                </div>

            </div>


            <!-- ========================================= -->
            <!-- DESCRIPCIÓN -->
            <!-- ========================================= -->

            <p
                style="
                    font-size:13px;
                    line-height:1.6;
                    color:var(--sv-text-muted, #495A4D);
                    margin:0 0 16px 0;
                "
            >
                La golondrina plomiza (<em>${scientificName}</em>) habita los estratos abiertos y bordes de bosque altoandino. Puedes interactuar arrastrando el modelo 3D arriba para rotarlo en cualquier eje.
            </p>


            <!-- ========================================= -->
            <!-- AUDIO -->
            <!-- ========================================= -->

            <div
                style="
                    display:flex;
                    gap:8px;
                "
            >

                <button
                    id="poi-canto"
                    type="button"
                    style="
                        flex:1;
                        padding:12px;
                        border:none;
                        border-radius:14px;
                        background:linear-gradient(135deg, var(--sv-primary, #386641), var(--sv-primary-hover, #6A994E));
                        color:var(--sv-text-inverse, #FFFFFF);
                        font-weight:700;
                        font-size:13px;
                        cursor:pointer;
                        box-shadow:0 4px 14px var(--sv-primary-glow, rgba(106,153,78,0.35));
                        transition:all 0.2s;
                    "
                >
                    🔊 Escuchar canto
                </button>


                <button
                    id="poi-narracion"
                    type="button"
                    style="
                        flex:1;
                        padding:12px;
                        border:1px solid var(--sv-secondary, #E7A84E);
                        border-radius:14px;
                        background:var(--sv-surface-solid-warm, #E4C7A8);
                        color:var(--sv-text-primary, #1F2E22);
                        font-weight:700;
                        font-size:13px;
                        cursor:pointer;
                        box-shadow:0 4px 12px rgba(231,168,78,0.20);
                        transition:all 0.2s;
                    "
                >
                    🎧 Narración
                </button>

            </div>

        `;


        /*
         * =====================================================
         * AGREGAR AL DOM
         * =====================================================
         */

        overlay.appendChild(
            card
        );

        document.body.appendChild(
            overlay
        );


        this.element =
            overlay;


        /*
         * =====================================================
         * AHORA SÍ:
         * OCULTAR LOS POI
         * =====================================================
         *
         * Se hace DESPUÉS de agregar el overlay.
         */

        this._hidePoiMarkers();


        /*
         * =====================================================
         * BOTÓN CERRAR
         * ===================================================== */

        const closeButton =
            card.querySelector(
                '#poi-close-button'
            );


        closeButton.addEventListener(
            'click',
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                this.app.fire(
                    'poi:request-close'
                );
            }
        );


        /*
         * =====================================================
         * CLIC FUERA
         * =====================================================
         */

        overlay.addEventListener(
            'click',
            (event) => {

                if (
                    event.target === overlay
                ) {

                    this.app.fire(
                        'poi:request-close'
                    );
                }
            }
        );


        /*
         * =====================================================
         * AUDIO
         * =====================================================
         */

        this._setupAudio(
            card,
            poi
        );


        /*
         * =====================================================
         * MODELO 3D
         * =====================================================
         */

        await this._loadModel(
            card
        );
    }


    /*
     * =========================================================
     * CARGAR MODELO 3D
     * =========================================================
     */

    async _loadModel(card) {

        const container =
            card.querySelector(
                '#poi-model'
            );


        const loading =
            card.querySelector(
                '#poi-model-loading'
            );


        try {

            this.modelViewer =
                new ModelViewer(
                    container
                );


            await this.modelViewer.load(
                'assets/models/golondrina-plomiza.glb'
            );


            if (
                loading
            ) {

                loading.remove();
            }


            console.log(
                'Modelo 3D cargado correctamente'
            );


        } catch (error) {

            console.error(
                'Error cargando modelo 3D:',
                error
            );


            if (
                loading
            ) {

                loading.textContent =
                    'No se pudo cargar el modelo 3D';

                loading.style.color =
                    '#ff8888';
            }
        }
    }


    /*
     * =========================================================
     * AUDIO
     * =========================================================
     */

    _setupAudio(card, poi) {

        /*
         * Las rutas salen del CONTRATO (config/pois.json), no escritas a mano.
         * Antes estaban fijas a la golondrina y las tres fichas reproducian su
         * canto, incluida la del colibri: medido en produccion el 25/08.
         * Invariante 3: anadir un POI no toca codigo.
         */

        const cantoUrl =
            (poi && poi.birdCallUrl) ||
            '';

        const narracionUrl =
            (poi && poi.narrationUrl) ||
            '';


        const cantoButton =
            card.querySelector(
                '#poi-canto'
            );


        const narracionButton =
            card.querySelector(
                '#poi-narracion'
            );


        /*
         * Sin grabacion declarada no se ofrece el boton: mas vale que no este
         * a que prometa un audio que no existe o suene el de otra especie.
         */

        if (!cantoUrl) {

            if (cantoButton) {
                cantoButton.style.display =
                    'none';
            }
        }

        if (!narracionUrl) {

            if (narracionButton) {
                narracionButton.style.display =
                    'none';
            }
        }

        if (
            !cantoUrl &&
            !narracionUrl
        ) {
            this.cantoAudio = null;
            this.narracionAudio = null;
            return;
        }


        this.cantoAudio =
            cantoUrl
                ? new Audio(cantoUrl)
                : null;


        this.narracionAudio =
            narracionUrl
                ? new Audio(narracionUrl)
                : null;


        if (this.cantoAudio) {
            this.cantoAudio.preload =
                'auto';
        }

        if (this.narracionAudio) {
            this.narracionAudio.preload =
                'auto';
        }


        /*
         * CANTO — solo se engancha si este POI declara canto en el contrato.
         */

        if (cantoButton && this.cantoAudio) cantoButton.addEventListener(
            'click',
            async (event) => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    this.narracionAudio
                ) {

                    this.narracionAudio.pause();

                    this.narracionAudio.currentTime =
                        0;
                }


                if (
                    !this.cantoAudio.paused
                ) {

                    this.cantoAudio.pause();

                    this.cantoAudio.currentTime =
                        0;

                    cantoButton.textContent =
                        '🔊 Escuchar canto';

                    return;
                }


                try {

                    await this.cantoAudio.play();

                    cantoButton.textContent =
                        '⏸ Detener canto';

                    if (narracionButton) {
                        narracionButton.textContent =
                            '🎧 Escuchar narración';
                    }

                } catch (error) {

                    console.error(
                        'No se pudo reproducir el canto:',
                        error
                    );
                }
            }
        );


        /*
         * NARRACIÓN — solo si este POI declara narración en el contrato.
         */

        if (narracionButton && this.narracionAudio) narracionButton.addEventListener(
            'click',
            async (event) => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    this.cantoAudio
                ) {

                    this.cantoAudio.pause();

                    this.cantoAudio.currentTime =
                        0;
                }


                if (
                    !this.narracionAudio.paused
                ) {

                    this.narracionAudio.pause();

                    this.narracionAudio.currentTime =
                        0;

                    narracionButton.textContent =
                        '🎧 Escuchar narración';

                    return;
                }


                try {

                    await this.narracionAudio.play();

                    narracionButton.textContent =
                        '⏸ Detener narración';

                    if (cantoButton) {
                        cantoButton.textContent =
                            '🔊 Escuchar canto';
                    }

                } catch (error) {

                    console.error(
                        'No se pudo reproducir la narración:',
                        error
                    );
                }
            }
        );


        /*
         * AUDIO TERMINADO
         */

        if (this.cantoAudio) this.cantoAudio.addEventListener(
            'ended',
            () => {

                if (
                    cantoButton
                ) {

                    cantoButton.textContent =
                        '🔊 Escuchar canto';
                }
            }
        );


        if (this.narracionAudio) this.narracionAudio.addEventListener(
            'ended',
            () => {

                if (
                    narracionButton
                ) {

                    narracionButton.textContent =
                        '🎧 Escuchar narración';
                }
            }
        );
    }


    /*
     * =========================================================
     * CERRAR FICHA
     * =========================================================
     */

    _onClose() {

        console.log(
            'FICHA CERRADA'
        );


        /*
         * Detener audios.
         */

        if (
            this.cantoAudio
        ) {

            this.cantoAudio.pause();

            this.cantoAudio.currentTime =
                0;
        }


        if (
            this.narracionAudio
        ) {

            this.narracionAudio.pause();

            this.narracionAudio.currentTime =
                0;
        }


        /*
         * Destruir visor 3D.
         */

        if (
            this.modelViewer
        ) {

            this.modelViewer.destroy();

            this.modelViewer =
                null;
        }


        this.cantoAudio =
            null;

        this.narracionAudio =
            null;


        /*
         * Eliminar ficha.
         */

        if (
            this.element
        ) {

            this.element.remove();

            this.element =
                null;
        }


        /*
         * =====================================================
         * MOSTRAR NUEVAMENTE LOS POI
         * =====================================================
         */

        this._showPoiMarkers();
    }


    /*
     * =========================================================
     * ELIMINAR FICHA
     * =========================================================
     */

    _remove() {

        if (
            this.modelViewer
        ) {

            this.modelViewer.destroy();

            this.modelViewer =
                null;
        }


        if (
            this.cantoAudio
        ) {

            this.cantoAudio.pause();

            this.cantoAudio.currentTime =
                0;

            this.cantoAudio =
                null;
        }


        if (
            this.narracionAudio
        ) {

            this.narracionAudio.pause();

            this.narracionAudio.currentTime =
                0;

            this.narracionAudio =
                null;
        }


        if (
            this.element
        ) {

            this.element.remove();

            this.element =
                null;
        }
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        this.app.off(
            'poi:open',
            this._onOpen
        );


        this.app.off(
            'poi:close',
            this._onClose
        );


        this._showPoiMarkers();


        this._remove();
    }
}