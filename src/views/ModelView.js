```js
export class ModelView {

    constructor(container) {

        this.container = container;

        this.model = null;
    }


    async load(url) {

        console.log('=================================');
        console.log('MODELO 3D');
        console.log('Cargando:', url);
        console.log('=================================');


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


        console.log(
            'GLB:',
            modelUrl
        );


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
            'Modelo 3D de la golondrina plomiza'
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
            '1'
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

        model.style.background =
            '#101510';

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

                console.log(
                    '================================='
                );

                console.log(
                    '✅ MODELO 3D VISIBLE'
                );

                console.log(
                    '================================='
                );

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
            resolve =>
                requestAnimationFrame(
                    () => resolve()
                )
        );


        console.log(
            'Elemento <model-viewer> agregado al DOM'
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

            console.log(
                'Model Viewer ya disponible'
            );

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


            console.log(
                'Cargando librería Model Viewer...'
            );
        }


        /*
         * Esperar a que el componente exista.
         */

        await customElements.whenDefined(
            'model-viewer'
        );


        console.log(
            '✅ Model Viewer listo'
        );
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

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
```
