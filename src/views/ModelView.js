const MODEL_VIEWER_URL =
    'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';

/**
 * Inyecta el script de model-viewer y espera a que el componente exista.
 *
 * La app lo llama por adelantado, cuando la escena está lista, para que el primer
 * visor que se abra no espere la descarga de la librería; ModelView.load() lo llama
 * también, y si ya está pedido o definido no repite nada. Si el script falla, se
 * retira del documento para que el siguiente intento lo pida de nuevo.
 */
export async function precargarVisor() {

    if (customElements.get('model-viewer')) {
        return;
    }

    let script = document.querySelector('script[data-model-viewer]');

    let fallo = null;

    if (!script) {

        script = document.createElement('script');
        script.type = 'module';
        script.src = MODEL_VIEWER_URL;
        script.dataset.modelViewer = 'true';

        fallo = new Promise((_, rechazar) => {
            script.addEventListener('error', () => {
                script.remove();
                rechazar(new Error('No se pudo descargar la librería model-viewer.'));
            }, { once: true });
        });

        document.head.appendChild(script);
    }

    await Promise.race(
        [customElements.whenDefined('model-viewer'), fallo].filter(Boolean)
    );
}


export class ModelView {

    constructor(container) {

        this.container = container;

        this.model = null;

        this._destruido = false;
    }


    async load(url, opciones = {}) {

        /*
         * =====================================================
         * CARGAR MODEL-VIEWER
         * =====================================================
         */

        await this._loadModelViewer();

        // La ficha pudo cerrarse mientras bajaba la librería: no se monta nada ni se
        // pausa la escena.
        if (this._destruido) {
            return null;
        }


        /*
         * =====================================================
         * LIMPIAR CONTENEDOR
         * =====================================================
         */

        this.container.innerHTML = '';

        /*
         * Mientras la ficha 3D está abierta, la escena del sendero (PlayCanvas,
         * ~1 M de gaussianas) deja de dibujarse: en el iPhone las dos escenas a la
         * vez agotan la memoria gráfica y el visor del modelo queda en negro.
         * El recorrido sigue vivo; destroy() la reanuda.
         */
        const app = window.senderoApp;
        if (app && this._autoRenderPrevio === undefined) {
            this._autoRenderPrevio = app.autoRender;
            app.autoRender = false;
        }


        /*
         * =====================================================
         * CREAR MODEL-VIEWER
         * =====================================================
         */

        const model =
            document.createElement('model-viewer');


        this.model = model;


        /*
         * =====================================================
         * RUTA DEL MODELO
         * =====================================================
         */

        const modelUrl =
            new URL(
                url,
                window.location.href
            ).href;


        /*
         * =====================================================
         * CONFIGURACIÓN
         * =====================================================
         */

        model.setAttribute(
            'src',
            modelUrl
        );

        model.setAttribute(
            'alt',
            'Modelo 3D del punto de interés'
        );

        /*
         * Luz: entorno neutro explícito y exposición más alta. Varias texturas
         * (observatorio, servicios ambientales, banca, silla) tienen color base
         * medio de 0,12 a 0,26 y con exposición 1 sobre fondo casi negro se veían
         * negras en el celular.
         */
        model.setAttribute(
            'environment-image',
            'neutral'
        );

        model.setAttribute(
            'tone-mapping',
            'neutral'
        );

        model.setAttribute(
            'camera-controls',
            ''
        );

        model.setAttribute(
            'auto-rotate',
            ''
        );

        model.setAttribute(
            'interaction-prompt',
            'none'
        );

        model.setAttribute(
            'shadow-intensity',
            '1'
        );

        model.setAttribute(
            'exposure',
            '1.6'
        );

        model.setAttribute(
            'loading',
            'eager'
        );

        model.setAttribute(
            'reveal',
            'auto'
        );

        /*
         * Miniatura que se ve desde el primer cuadro mientras baja el modelo.
         */
        if (opciones.poster) {

            model.setAttribute(
                'poster',
                new URL(opciones.poster, window.location.href).href
            );
        }

        /*
         * Dentro de una hoja que se desplaza, un arrastre vertical sobre el visor
         * desplaza la hoja y uno horizontal gira el modelo.
         */
        if (opciones.toqueVertical) {

            model.setAttribute(
                'touch-action',
                'pan-y'
            );
        }

        /*
         * Animación de reposo (RF-029): se declara por configuración con el
         * nombre del clip que trae el propio modelo. Arranca sola y en bucle
         * al abrir la ficha; un modelo sin ese clip simplemente queda quieto.
         */
        if (opciones.animacion) {

            model.setAttribute(
                'animation-name',
                opciones.animacion
            );

            model.setAttribute(
                'autoplay',
                ''
            );
        }


        /*
         * =====================================================
         * ESTILOS
         * =====================================================
         */

        model.style.width =
            '100%';

        model.style.height =
            '100%';

        model.style.minHeight =
            '220px';

        model.style.display =
            'block';

        // Fondo claro de la paleta: los modelos de madera oscura se pierden en negro.
        model.style.background =
            'var(--sv-surface-inset-solid)';

        model.style.borderRadius =
            '16px';

        model.style.overflow =
            'hidden';


        /*
         * =====================================================
         * EVENTO LOAD
         * =====================================================
         */

        model.addEventListener(
            'load',
            () => {

            }
        );


        /*
         * =====================================================
         * EVENTO ERROR
         * =====================================================
         */

        model.addEventListener(
            'error',
            (event) => {

                console.error(
                    '================================='
                );

                console.error(
                    '❌ ERROR CARGANDO MODELO 3D'
                );

                console.error(
                    'URL:',
                    modelUrl
                );

                console.error(
                    event
                );

                console.error(
                    '================================='
                );

            }
        );


        /*
         * =====================================================
         * AGREGAR AL DOM
         * =====================================================
         */

        this.container.appendChild(
            model
        );


        /*
         * =====================================================
         * ESPERAR UN MOMENTO PARA QUE RENDERICE
         * =====================================================
         */

        await new Promise(
            (resolve, reject) => {

                let finished = false;

                const finish = (callback) => {

                    if (finished) {
                        return;
                    }

                    finished = true;
                    clearTimeout(timeout);
                    callback();
                };

                const timeout = setTimeout(
                    () => finish(() => reject(new Error('El modelo GLB tardó demasiado en cargar.'))),
                    20000
                );

                model.addEventListener(
                    'load',
                    () => finish(resolve),
                    { once: true }
                );

                model.addEventListener(
                    'error',
                    () => finish(() => reject(new Error('No se pudo cargar el modelo 3D: ' + modelUrl))),
                    { once: true }
                );

                // destroy() corta la espera sin error: la ficha ya se cerró.
                this._cancelarEspera = () => finish(resolve);
            }
        );


        // El entorno real (panorámica 360 del sendero) llega después del modelo: el visor ya
        // se puede girar y acercar mientras baja, y un fallo suyo no tumba la carga del modelo.
        if (opciones.entorno && !this._destruido) {
            this._ponerEntorno(model, opciones.entorno);
        }

        return model;
    }


    /**
     * Pone la panorámica 360 como fondo del visor (skybox-image): el ave queda dentro de su
     * bosque y el fondo gira con ella. La luz se queda con el entorno neutro de siempre, para
     * que el modelo se vea con sus colores y no oscurecido por el bosque. En pantallas de menos
     * de 640 px se usa la versión de 2048 de ancho.
     */
    _ponerEntorno(model, url) {
        const liviana = window.innerWidth < 640 ? url.replace(/\.webp$/, '-2048.webp') : url;
        model.addEventListener('error', (evento) => {
            if (evento?.detail?.type === 'environment' || evento?.detail?.sourceError) {
                console.warn('No se pudo cargar el entorno 3D de la ficha:', liviana);
            }
        });
        model.setAttribute('skybox-image', new URL(liviana, window.location.href).href);
    }


    /*
     * =========================================================
     * CARGAR LIBRERÍA MODEL-VIEWER
     * =========================================================
     */

    async _loadModelViewer() {

        await precargarVisor();

    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        this._destruido = true;

        if (this._cancelarEspera) {
            this._cancelarEspera();
            this._cancelarEspera = null;
        }

        // La escena del sendero vuelve a dibujarse al cerrar la ficha.
        const app = window.senderoApp;
        if (app && this._autoRenderPrevio !== undefined) {
            app.autoRender = this._autoRenderPrevio;
            app.renderNextFrame = true;
            this._autoRenderPrevio = undefined;
        }

        if (
            this.model
        ) {

            this.model.remove();

            this.model =
                null;
        }


        if (
            this.container
        ) {

            this.container.innerHTML =
                '';
        }
    }
}
