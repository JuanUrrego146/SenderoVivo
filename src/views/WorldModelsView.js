/*
 * WorldModelsView
 *
 * Coloca dentro de la escena los modelos 3D de los POI que lo piden con
 * worldModel.visible = true en config/pois.json. Cada modelo queda de pie sobre
 * el suelo, a su altura real, junto al sendero y con la cara frontal (+Z del
 * modelo) mirando hacia el camino.
 *
 * RESPONSABILIDADES:
 * - Cargar el .glb ligero de cada POI y colgarlo del grupo "world-models".
 * - Escalar por altura real y apoyar por la caja envolvente, no por el origen.
 * - Alumbrar solo estos modelos, con luces de máscara propia.
 *
 * NO RESPONSABILIDADES:
 * - Leer pois.json (lo hace PoiCatalog; esta vista recibe los POI ya validados).
 * - Abrir fichas ni crear los medallones (PoiManager).
 * - Tocar app.scene.ambientLight: es global y cambiaría las flechas del recorrido.
 *
 * Convención de los modelos de Alberto: la cara con el texto mira hacia +Z.
 */

import { Asset, BoundingBox, Color, Entity, Vec3 } from 'playcanvas';

/*
 * Máscara de las luces y de los meshInstance de estos modelos. Las flechas y el
 * resto de la escena conservan la máscara por defecto del motor y no la ven.
 */
export const WORLD_MODELS_LIGHT_MASK = 1 << 3;

const GROUP_NAME = 'world-models';

/*
 * Rig de luces, medido desde la dirección general del trazado (azimut a, en
 * grados, con atan2(x, z)). Un letrero a la derecha del avance mira hacia a + 120
 * y uno a la izquierda hacia a - 120, así que cada lado recibe su propia luz
 * direccional. Una luz con yaw Y alumbra las superficies que miran hacia el
 * azimut Y, por eso los dos yaw salen de a + 90 y a - 90. Con el trazado de otra
 * escena, las luces se reorientan solas.
 */
const LIGHT_RIG = [
    { name: 'world-models-light-right', intensity: 1.2, pitch: 40, yawFromHeading: 90 },
    { name: 'world-models-light-left', intensity: 1.2, pitch: 40, yawFromHeading: -90 }
];

function isUsableNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

export class WorldModelsView {

    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('../models/TrailModel.js').TrailModel} trailPath
     * @param {{metersPerUnit?:number, groundOffset?:number, facingTowardVisitorDegrees?:number}} defaults
     */
    constructor(app, trailPath, defaults = {}) {

        this.app = app;
        this.trailPath = trailPath;
        this.defaults = defaults || {};

        this.group = null;
        this.lights = [];
        this.assets = [];

        /** Un registro por modelo colocado: { id, url, entity, scale, heightUnits }. */
        this.placed = [];

        this._destroyed = false;
    }

    /**
     * Coloca los POI con worldModel.visible === true. Un fallo se avisa por
     * consola con el id del POI y no tumba a los demás.
     *
     * @param {object[]} pois
     */
    async load(pois = []) {

        if (!this.trailPath || !this.trailPath.isUsable) {
            console.warn('WorldModelsView: no hay un trazado utilizable; no se coloca ningún modelo.');
            return;
        }

        const wanted = pois.filter(poi => poi?.worldModel?.visible === true);
        if (!wanted.length) return;

        this._ensureGroup();

        const results = await Promise.allSettled(
            wanted.map(poi => this._place(poi))
        );

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (result.value) this.placed.push(result.value);
                return;
            }
            console.warn(
                `WorldModelsView: no se pudo colocar ${wanted[index].id}:`,
                result.reason
            );
        });
    }

    destroy() {

        this._destroyed = true;

        if (this.group) {
            this.group.destroy();
            this.group = null;
        }

        for (const asset of this.assets) {
            asset.unload();
            this.app.assets.remove(asset);
        }

        this.assets = [];
        this.lights = [];
        this.placed = [];
    }


    /*
     * =========================================================
     * GRUPO Y LUCES
     * =========================================================
     */

    _ensureGroup() {

        if (this.group) return;

        this.group = new Entity(GROUP_NAME);
        this.app.root.addChild(this.group);

        const heading = this._trailHeadingDegrees();

        for (const spec of LIGHT_RIG) {
            const light = new Entity(spec.name);
            light.addComponent('light', {
                type: 'directional',
                color: Color.WHITE,
                intensity: spec.intensity,
                castShadows: false,
                mask: WORLD_MODELS_LIGHT_MASK
            });
            // Si esta versión del motor no acepta la máscara al crear el componente.
            light.light.mask = WORLD_MODELS_LIGHT_MASK;
            light.setEulerAngles(spec.pitch, heading + spec.yawFromHeading, 0);
            this.group.addChild(light);
            this.lights.push(light);
        }
    }

    /** Azimut, en grados, de la dirección general del trazado (de su inicio a su final). */
    _trailHeadingDegrees() {

        const start = this.trailPath.positionAt(0);
        const end = this.trailPath.positionAt(this.trailPath.totalLength());
        const dx = end.x - start.x;
        const dz = end.z - start.z;

        if (Math.hypot(dx, dz) < 1e-6) return 0;
        return Math.atan2(dx, dz) * 180 / Math.PI;
    }


    /*
     * =========================================================
     * COLOCACIÓN DE UN POI
     * =========================================================
     */

    async _place(poi) {

        const worldModel = poi.worldModel;
        const anchor = poi.trailAnchor;
        const metersPerUnit = isUsableNumber(this.defaults.metersPerUnit) && this.defaults.metersPerUnit > 0
            ? this.defaults.metersPerUnit
            : 1;

        if (!anchor || !isUsableNumber(anchor.d) || !isUsableNumber(anchor.lat)) {
            throw new Error('trailAnchor sin d y lat numéricos');
        }
        if (typeof worldModel.url !== 'string' || !worldModel.url.trim()) {
            throw new Error('worldModel.url vacío');
        }
        if (!isUsableNumber(worldModel.heightMeters) || worldModel.heightMeters <= 0) {
            throw new Error('worldModel.heightMeters debe ser un número mayor que 0');
        }

        /* 1. Cargar e instanciar. */
        const asset = new Asset(`world-model-${poi.id}`, 'container', { url: worldModel.url });
        this.app.assets.add(asset);
        this.assets.push(asset);

        await new Promise((resolve, reject) => {
            asset.once('error', reject);
            asset.ready(resolve);
            this.app.assets.load(asset);
        });

        if (this._destroyed) return null;
        if (!asset.resource) {
            throw new Error(`no se pudo cargar ${worldModel.url}`);
        }

        const entity = asset.resource.instantiateRenderEntity();
        entity.name = `world-model-${poi.id}`;
        this.group.addChild(entity);

        /* 2. Solo las luces de este grupo alumbran estos modelos. */
        const meshInstances = this._meshInstances(entity);
        if (!meshInstances.length) {
            throw new Error(`${worldModel.url} no trae ninguna malla`);
        }
        for (const meshInstance of meshInstances) {
            meshInstance.mask = WORLD_MODELS_LIGHT_MASK;
        }

        /* 3. Altura a escala 1 y 4. escala para llegar a la altura real. */
        const unitHeight = this._unionAabb(meshInstances).halfExtents.y * 2;
        if (!(unitHeight > 0)) {
            throw new Error(`${worldModel.url} tiene altura cero`);
        }

        const heightUnits = worldModel.heightMeters / metersPerUnit;
        const scale = heightUnits / unitHeight;

        /* 5. Punto del trazado, avance aplanado y perpendicular. */
        const center = this.trailPath.positionAt(anchor.d);
        const dir = this.trailPath.directionAt(anchor.d);
        dir.y = 0;
        if (dir.length() < 1e-6) dir.set(0, 0, -1);
        dir.normalize();

        const perp = new Vec3(-dir.z, 0, dir.x);
        const position = new Vec3(
            center.x + perp.x * anchor.lat,
            0,
            center.z + perp.z * anchor.lat
        );

        /* 6. Orientación: el frente (+Z) mira al sendero, girado hacia quien llega. */
        const toward = anchor.lat === 0
            ? dir.clone().mulScalar(-1)
            : perp.clone().mulScalar(anchor.lat > 0 ? -1 : 1);

        const facingDegrees = isUsableNumber(this.defaults.facingTowardVisitorDegrees)
            ? this.defaults.facingTowardVisitorDegrees
            : 0;
        const facing = toward.clone()
            .sub(dir.clone().mulScalar(Math.tan(facingDegrees * Math.PI / 180)))
            .normalize();

        const yaw = Math.atan2(facing.x, facing.z) * 180 / Math.PI +
            (isUsableNumber(worldModel.yawOffsetDegrees) ? worldModel.yawOffsetDegrees : 0);

        /* 7. Escala y giro con la posición en el origen; se mide de nuevo y se desplaza. */
        entity.setLocalScale(scale, scale, scale);
        entity.setLocalEulerAngles(0, yaw, 0);
        entity.setLocalPosition(0, 0, 0);

        const box = this._unionAabb(meshInstances);
        const min = box.getMin();
        const boxCenter = box.center;

        const groundOffset = isUsableNumber(worldModel.groundOffset)
            ? worldModel.groundOffset
            : (isUsableNumber(this.defaults.groundOffset) ? this.defaults.groundOffset : 0);
        const groundY = center.y + groundOffset;

        entity.setLocalPosition(
            position.x - boxCenter.x,
            groundY - min.y,
            position.z - boxCenter.z
        );

        return { id: poi.id, url: worldModel.url, entity, scale, heightUnits };
    }

    _meshInstances(entity) {

        const meshInstances = [];
        for (const render of entity.findComponents('render')) {
            meshInstances.push(...(render.meshInstances || []));
        }
        return meshInstances;
    }

    /** Caja envolvente unida de todos los meshInstance, en espacio de mundo. */
    _unionAabb(meshInstances) {

        const box = new BoundingBox();
        box.copy(meshInstances[0].aabb);
        for (let i = 1; i < meshInstances.length; i++) {
            box.add(meshInstances[i].aabb);
        }
        return box;
    }
}
