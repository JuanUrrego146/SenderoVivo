import {
    BoundingBox,
    Entity,
    Vec3,
    Quat
} from 'playcanvas';

export class SceneView {
    constructor(app, options = {}) {
        this.app = app;

        this.sceneAsset = options.sceneAsset ?? null;
        this.sceneUp = options.sceneUp ?? null;
        this.stream = !!options.stream;
        this.baked = !!options.baked;

        this.splatBudget = options.splatBudget ?? 3500000;

        this.splat = null;
    }

    render() {
        if (!this.sceneAsset) {
            throw new Error('SceneView necesita un asset SOG.');
        }

        this.splat = new Entity('scene');

        /*
         * Nivelación de la reconstrucción.
         *
         * Si sceneUp existe, orientamos la escena para que
         * el eje indicado quede alineado con el arriba del mundo.
         */
        if (this.sceneUp) {
            const up = new Vec3(
                this.sceneUp.x,
                this.sceneUp.y,
                this.sceneUp.z
            ).normalize();

            const levelling = new Quat()
                .setFromDirections(up, Vec3.UP);

            this.splat.setRotation(levelling);
        } else if (!this.baked) {
            /*
             * Convención utilizada por la escena de muestra.
             */
            this.splat.setEulerAngles(0, 0, 180);
        }

        /*
         * Escena SOG con streaming/L.O.D.
         */
        if (this.stream) {
            this.app.scene.gsplat.splatBudget = this.splatBudget;
            this.app.scene.gsplat.radialSorting = true;

            this.splat.addComponent('gsplat', {
                asset: this.sceneAsset
            });

            this.splat.gsplat.lodBaseDistance = 8;
            this.splat.gsplat.lodMultiplier = 3;
        } else {
            /*
             * Escena SOG normal.
             */
            this.splat.addComponent('gsplat', {
                asset: this.sceneAsset
            });

            this.splat.gsplat.customAabb =
                new BoundingBox(
                    new Vec3(0, 0, 0),
                    new Vec3(60, 60, 60)
                );
        }

        this.app.root.addChild(this.splat);

        return this.splat;
    }

    getEntity() {
        return this.splat;
    }

    destroy() {
        if (this.splat) {
            this.splat.destroy();
            this.splat = null;
        }
    }
}