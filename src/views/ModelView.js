export class ModelView {

    constructor(container) {

        this.container = container;

        this.model = null;
    }


    async load(url) {

        /*
         * =====================================================
         * CARGAR MODEL-VIEWER
         * =====================================================
         */

        await this._loadModelViewer();


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
            }
        );


        return model;
    }


    /*
     * =========================================================
     * CARGAR LIBRERÍA MODEL-VIEWER
     * =========================================================
     */

    async _loadModelViewer() {

        /*
         * Si ya existe, no hacemos nada.
         */

        if (
            customElements.get(
                'model-viewer'
            )
        ) {

            return;
        }


        /*
         * Buscar si ya existe un script.
         */

        let script =
            document.querySelector(
                'script[data-model-viewer]'
            );


        /*
         * Crear script si no existe.
         */

        if (!script) {

            script =
                document.createElement(
                    'script'
                );


            script.type =
                'module';


            script.src =
                'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';


            script.dataset.modelViewer =
                'true';


            document.head.appendChild(
                script
            );


        }


        /*
         * Esperar a que el componente exista.
         */

        await customElements.whenDefined(
            'model-viewer'
        );


    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

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
