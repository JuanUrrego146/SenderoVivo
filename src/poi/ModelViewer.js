export class ModelViewer {

    constructor(container) {

        this.container = container;
        this.model = null;

    }


    async load(url) {

        console.log('=================================');
        console.log('MODEL VIEWER');
        console.log('Cargando modelo:', url);
        console.log('=================================');


        // Cargar la librería
        await this._loadModelViewer();


        // Limpiar contenedor
        this.container.innerHTML = '';


        // Crear visor
        const model =
            document.createElement('model-viewer');


        this.model = model;


        // =========================================
        // MODELO
        // =========================================

        model.src = url;


        // =========================================
        // ESTILO
        // =========================================

        model.style.width = '100%';
        model.style.height = '100%';
        model.style.display = 'block';
        model.style.background = '#101510';


        // =========================================
        // CONTROLES
        // =========================================

        model.setAttribute(
            'camera-controls',
            ''
        );


        // =========================================
        // CÁMARA
        // =========================================

        model.setAttribute(
            'camera-orbit',
            '0deg 75deg 2.5m'
        );


        model.setAttribute(
            'field-of-view',
            '35deg'
        );


        // =========================================
        // ILUMINACIÓN
        // =========================================

        model.setAttribute(
            'exposure',
            '1'
        );


        model.setAttribute(
            'shadow-intensity',
            '1'
        );


        model.setAttribute(
            'shadow-softness',
            '0.8'
        );


        // =========================================
        // INTERACCIÓN
        // =========================================

        model.setAttribute(
            'interaction-prompt',
            'none'
        );


        // =========================================
        // AGREGAR
        // =========================================

        this.container.appendChild(
            model
        );


        // =========================================
        // ESPERAR CARGA
        // =========================================

        await new Promise(
            (resolve, reject) => {

                let terminado = false;


                const timeout =
                    setTimeout(
                        () => {

                            if (terminado) {
                                return;
                            }

                            terminado = true;

                            reject(
                                new Error(
                                    'El modelo tardó demasiado en cargar.'
                                )
                            );

                        },
                        20000
                    );


                model.addEventListener(
                    'load',
                    () => {

                        if (terminado) {
                            return;
                        }

                        terminado = true;

                        clearTimeout(
                            timeout
                        );


                        console.log(
                            '================================='
                        );

                        console.log(
                            'MODELO 3D VISIBLE'
                        );

                        console.log(
                            '================================='
                        );


                        resolve();

                    },
                    {
                        once: true
                    }
                );


                model.addEventListener(
                    'error',
                    (event) => {

                        if (terminado) {
                            return;
                        }

                        terminado = true;

                        clearTimeout(
                            timeout
                        );


                        console.error(
                            'ERROR CARGANDO MODELO 3D:',
                            event
                        );


                        reject(
                            new Error(
                                'No se pudo cargar el archivo GLB.'
                            )
                        );

                    },
                    {
                        once: true
                    }
                );

            }
        );


        console.log(
            'Modelo 3D cargado correctamente.'
        );


        return model;
    }


    async _loadModelViewer() {

        // Si ya existe, no hacemos nada
        if (
            customElements.get(
                'model-viewer'
            )
        ) {

            return;
        }


        // Buscar script existente
        let script =
            document.querySelector(
                'script[data-model-viewer]'
            );


        // Crear script si no existe
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


        // Esperar a que la librería esté lista
        await customElements.whenDefined(
            'model-viewer'
        );


        console.log(
            'Model Viewer disponible.'
        );
    }


    destroy() {

        if (this.model) {

            this.model.remove();

            this.model = null;
        }


        if (this.container) {

            this.container.innerHTML = '';
        }
    }
}