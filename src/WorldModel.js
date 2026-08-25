import {
    Asset,
    AssetListLoader,
    Entity,
    Vec3
} from 'playcanvas';

/*
 * ============================================================
 * MODELO 3D ANCLADO AL MUNDO
 * Sendero Vivo
 *
 * Este módulo carga un GLB directamente dentro de la escena
 * principal, independiente de la ficha del POI.
 *
 * La posición se expresa en coordenadas del mundo:
 *
 *      X = izquierda / derecha
 *      Y = altura
 *      Z = profundidad
 *
 * Estas coordenadas son las que deben compartir las técnicas
 * COLMAP y Luma.
 * ============================================================
 */

const MODEL_URL =
    'assets/models/golondrina-plomiza.glb';


export class WorldModel {

    constructor(app) {

        this.app = app;

        this.asset = null;
        this.entity = null;

        /*
         * ====================================================
         * CONFIGURACIÓN DEL MODELO
         * ====================================================
         *
         * CAMBIA ESTOS VALORES PARA MOVER EL MODELO.
         *
         * x → izquierda / derecha
         * y → arriba / abajo
         * z → adelante / atrás
         */

        this.position = new Vec3(
            0,
            0,
            0
        );


        /*
         * Escala del modelo.
         *
         * Si aparece demasiado grande:
         *
         *     0.1
         *     0.05
         *     0.01
         *
         * Si aparece demasiado pequeño:
         *
         *     2
         *     5
         */

        this.scale = new Vec3(
            1,
            1,
            1
        );


        /*
         * Rotación inicial.
         *
         * X = inclinación
         * Y = giro horizontal
         * Z = inclinación lateral
         */

        this.rotation = new Vec3(
            0,
            0,
            0
        );
    }


    /*
     * =========================================================
     * CARGAR MODELO
     * =========================================================
     */

    async load() {

        console.log(
            '[WorldModel] Cargando:',
            MODEL_URL
        );


        /*
         * Crear Asset GLB.
         */

        this.asset =
            new Asset(
                'golondrina-plomiza-world',
                'container',
                {
                    url: MODEL_URL
                }
            );


        /*
         * Agregar el asset al AssetRegistry.
         */

        this.app.assets.add(
            this.asset
        );


        /*
         * Esperar a que cargue.
         */

        await new Promise(
            (resolve, reject) => {

                this.asset.ready(
                    resolve
                );

                this.asset.on(
                    'error',
                    reject
                );

                this.app.assets.load(
                    this.asset
                );
            }
        );


        console.log(
            '[WorldModel] GLB cargado correctamente'
        );


        /*
         * =====================================================
         * CREAR ENTIDAD
         * =====================================================
         */

        this.entity =
            this.asset.resource
                .instantiateRenderEntity();


        if (!this.entity) {

            throw new Error(
                '[WorldModel] No se pudo instanciar el GLB.'
            );
        }


        /*
         * =====================================================
         * TRANSFORMACIÓN
         * =====================================================
         */

        this.entity.setPosition(
            this.position
        );

        this.entity.setEulerAngles(
            this.rotation
        );

        this.entity.setLocalScale(
            this.scale
        );


        /*
         * =====================================================
         * AGREGAR AL MUNDO
         * =====================================================
         *
         * IMPORTANTE:
         *
         * El modelo se agrega directamente al root.
         *
         * NO lo hacemos hijo del Gaussian Splat.
         *
         * De esta manera su posición es una posición de mundo
         * independiente de la reconstrucción COLMAP/Luma.
         */

        this.app.root.addChild(
            this.entity
        );


        console.log(
            '[WorldModel] Modelo agregado a la escena'
        );

        console.log(
            '[WorldModel] Posición:',
            this.entity.getPosition()
        );

        console.log(
            '[WorldModel] Escala:',
            this.entity.getLocalScale()
        );

        return this.entity;
    }


    /*
     * =========================================================
     * CAMBIAR POSICIÓN
     * =========================================================
     */

    setPosition(
        x,
        y,
        z
    ) {

        this.position.set(
            x,
            y,
            z
        );


        if (this.entity) {

            this.entity.setPosition(
                this.position
            );
        }
    }


    /*
     * =========================================================
     * CAMBIAR ESCALA
     * =========================================================
     */

    setScale(
        x,
        y,
        z = x
    ) {

        this.scale.set(
            x,
            y,
            z
        );


        if (this.entity) {

            this.entity.setLocalScale(
                this.scale
            );
        }
    }


    /*
     * =========================================================
     * CAMBIAR ROTACIÓN
     * =========================================================
     */

    setRotation(
        x,
        y,
        z
    ) {

        this.rotation.set(
            x,
            y,
            z
        );


        if (this.entity) {

            this.entity.setEulerAngles(
                this.rotation
            );
        }
    }


    /*
     * =========================================================
     * OBTENER POSICIÓN ACTUAL
     * =========================================================
     */

    getPosition() {

        if (!this.entity) {

            return this.position.clone();
        }

        return this.entity
            .getPosition()
            .clone();
    }


    /*
     * =========================================================
     * DESTRUIR
     * =========================================================
     */

    destroy() {

        if (this.entity) {

            this.entity.destroy();

            this.entity = null;
        }


        if (
            this.asset &&
            this.app
        ) {

            this.app.assets.remove(
                this.asset
            );

            this.asset = null;
        }
    }
}