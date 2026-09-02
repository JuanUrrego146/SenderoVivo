import { ModelView } from './ModelView.js';

export class PoiCardView {
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
            '420px';

        card.style.maxWidth =
            '90vw';

        card.style.maxHeight =
            '85vh';

        card.style.overflowY =
            'auto';

        card.style.background =
            '#18251d';

        card.style.color =
            'white';

        card.style.borderRadius =
            '24px';

        card.style.padding =
            '30px';

        card.style.boxSizing =
            'border-box';

        card.style.fontFamily =
            'Arial, sans-serif';

        card.style.boxShadow =
            '0 20px 60px rgba(0,0,0,0.6)';

        card.style.border =
            '1px solid rgba(111,207,151,0.5)';

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
                    top:12px;
                    right:15px;
                    width:38px;
                    height:38px;
                    border:none;
                    border-radius:50%;
                    background:rgba(255,255,255,0.12);
                    color:white;
                    font-size:26px;
                    cursor:pointer;
                    z-index:10;
                "
            >
                ×
            </button>


            <!-- ========================================= -->
            <!-- VISOR 3D -->
            <!-- ========================================= -->

            <div
                id="poi-model"
                style="
                    width:100%;
                    height:220px;
                    margin-bottom:15px;
                    border-radius:16px;
                    overflow:hidden;
                    background:#101510;
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
                        color:#6fcf97;
                        font-size:14px;
                        z-index:2;
                    "
                >
                    Cargando modelo 3D...
                </div>

            </div>


            <!-- ========================================= -->
            <!-- NOMBRE -->
            <!-- ========================================= -->

            <h2
                style="
                    margin:0;
                    text-align:center;
                    font-size:30px;
                    color:#6fcf97;
                "
            >
                ${commonName}
            </h2>


            <p
                style="
                    text-align:center;
                    margin-top:8px;
                    color:#bdbdbd;
                    font-style:italic;
                "
            >
                ${scientificName}
            </p>


            <!-- ========================================= -->
            <!-- INFORMACIÓN -->
            <!-- ========================================= -->

            <div
                style="
                    margin-top:25px;
                    padding:15px;
                    background:rgba(255,255,255,0.07);
                    border-radius:14px;
                "
            >

                <p style="margin:6px 0;">
                    <strong>🦜 Tipo:</strong>
                    Fauna
                </p>

                <p style="margin:6px 0;">
                    <strong>⛰️ Altitud:</strong>
                    ${altitude}
                </p>

                <p style="margin:6px 0;">
                    <strong>📍 Lugar:</strong>
                    Cerros Orientales de Bogotá
                </p>

            </div>


            <!-- ========================================= -->
            <!-- DESCRIPCIÓN -->
            <!-- ========================================= -->

            <h3
                style="
                    margin-top:25px;
                    color:#6fcf97;
                "
            >
                Sobre esta especie
            </h3>


            <p
                style="
                    line-height:1.6;
                    color:#e5e5e5;
                "
            >
                La golondrina plomiza
                (<em>${scientificName}</em>)
                es una especie de ave que habita
                diferentes ecosistemas de montaña.
            </p>


            <p
                style="
                    line-height:1.6;
                    color:#e5e5e5;
                "
            >
                Su presencia forma parte de la
                biodiversidad que podemos encontrar
                en los Cerros Orientales de Bogotá.
            </p>


            <!-- ========================================= -->
            <!-- AUDIO -->
            <!-- ========================================= -->

            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                    margin-top:25px;
                "
            >

                <button
                    id="poi-canto"
                    type="button"
                    style="
                        padding:14px;
                        border:none;
                        border-radius:12px;
                        background:#6fcf97;
                        color:#102016;
                        font-weight:bold;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    🔊 Escuchar canto
                </button>


                <button
                    id="poi-narracion"
                    type="button"
                    style="
                        padding:14px;
                        border:1px solid #6fcf97;
                        border-radius:12px;
                        background:transparent;
                        color:#6fcf97;
                        font-weight:bold;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    🎧 Escuchar narración
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
                new ModelView(
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