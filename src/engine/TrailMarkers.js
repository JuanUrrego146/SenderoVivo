/*
 * TrailMarkers — flechas de avance dentro de la escena 3D.
 *
 * Como en un visor de calles: la flecha está en el suelo del sendero, delante
 * del visitante, y al tocarla se avanza hasta ella. No es un mando sobrepuesto:
 * son objetos del mundo, anclados al trazado, que se mueven con el recorrido.
 *
 * Solo indican direcciones permitidas: mientras la flecha exista, se puede ir.
 * Al llegar al final del tramo, la flecha de avance desaparece sola.
 */
import { Color, Entity, StandardMaterial, Vec3, BLEND_NORMAL, Texture, ADDRESS_CLAMP_TO_EDGE, FILTER_LINEAR, PIXELFORMAT_RGBA8 } from 'playcanvas';

/** Dibuja la flecha en un canvas y la sube como textura. */
function createArrowTexture(device, cssColor) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = cssColor;
    ctx.strokeStyle = 'rgba(14, 18, 16, 0.55)';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';

    // Punta hacia arriba del canvas (que será "hacia adelante" en el suelo).
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.12);
    ctx.lineTo(size * 0.86, size * 0.54);
    ctx.lineTo(size * 0.66, size * 0.54);
    ctx.lineTo(size * 0.66, size * 0.88);
    ctx.lineTo(size * 0.34, size * 0.88);
    ctx.lineTo(size * 0.34, size * 0.54);
    ctx.lineTo(size * 0.14, size * 0.54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const texture = new Texture(device, {
        width: size,
        height: size,
        format: PIXELFORMAT_RGBA8,
        addressU: ADDRESS_CLAMP_TO_EDGE,
        addressV: ADDRESS_CLAMP_TO_EDGE,
        magFilter: FILTER_LINEAR,
        minFilter: FILTER_LINEAR,
        mipmaps: true
    });
    texture.setSource(canvas);
    return texture;
}

export class TrailMarkers {
    /**
     * @param {import('playcanvas').AppBase} app
     * @param {import('playcanvas').Entity} camera
     * @param {import('./TourEngine.js').TourEngine} tour
     * @param {object} [options]
     */
    constructor(app, camera, tour, options = {}) {
        this.app = app;
        this.camera = camera;
        this.tour = tour;
        this.trail = tour.trailPath;

        this.stepDistance = options.stepDistance ?? 2.5;   // cuánto avanza cada toque
        this.size = options.size ?? 0.9;                   // tamaño de la flecha
        this.groundOffset = options.groundOffset ?? -1.4;  // altura respecto a la cámara
        this.hoverIndex = -1;

        const green = getComputedStyle(document.documentElement)
            .getPropertyValue('--sv-green-300').trim() || '#6FCF97';
        this.texture = createArrowTexture(app.graphicsDevice, green);

        this.markers = [
            this._createMarker('marker-forward', 1),
            this._createMarker('marker-back', -1)
        ];

        this._onUpdate = this._update.bind(this);
        this._bindPicking();
        app.on('update', this._onUpdate);
    }

    _createMarker(name, direction) {
        const material = new StandardMaterial();
        material.diffuse = new Color(1, 1, 1);
        material.emissive = new Color(1, 1, 1);
        material.emissiveMap = this.texture;
        material.opacityMap = this.texture;
        material.blendType = BLEND_NORMAL;
        material.opacity = 0.85;
        material.depthTest = false;   // se ve siempre, aunque el splat la tape
        material.depthWrite = false;
        material.cull = 0;            // visible por ambas caras
        material.update();

        const entity = new Entity(name);
        entity.addComponent('render', { type: 'plane', material });
        entity.setLocalScale(this.size, 1, this.size);
        entity.direction = direction;
        entity.baseMaterial = material;
        this.app.root.addChild(entity);
        return entity;
    }

    _bindPicking() {
        const canvas = this.app.graphicsDevice.canvas;

        this._pointerDown = (e) => {
            const hit = this._pick(e.clientX, e.clientY);
            if (hit === null) return;
            e.preventDefault();
            e.stopPropagation();
            this._advance(hit);
        };
        // Se registra en captura para adelantarse al "mirar" de TourEngine.
        canvas.addEventListener('pointerdown', this._pointerDown, true);

        this._pointerMove = (e) => {
            this.hoverIndex = this._pick(e.clientX, e.clientY) ?? -1;
            canvas.style.cursor = this.hoverIndex >= 0 ? 'pointer' : '';
        };
        canvas.addEventListener('pointermove', this._pointerMove);
    }

    /** Devuelve el índice del marcador tocado, o null. */
    _pick(clientX, clientY) {
        const canvas = this.app.graphicsDevice.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const camPos = this.camera.getPosition();

        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < this.markers.length; i++) {
            const m = this.markers[i];
            if (!m.enabled) continue;
            const screen = this.camera.camera.worldToScreen(m.getPosition());
            if (screen.z <= 0) continue;   // detrás de la cámara

            // Radio en pantalla proporcional a la distancia.
            const dist = camPos.distance(m.getPosition());
            const radius = Math.max(28, (this.size * 260) / Math.max(dist, 0.5));
            const d = Math.hypot(screen.x - x, screen.y - y);
            if (d < radius && d < bestDist) {
                best = i;
                bestDist = d;
            }
        }
        return best;
    }

    _advance(index) {
        const marker = this.markers[index];
        const step = this.stepDistance * marker.direction;
        this.tour.distance = Math.max(0, Math.min(
            this.tour.distance + step,
            this.trail.totalLength()
        ));
        this.tour._emitProgress();
    }

    _update() {
        const total = this.trail.totalLength();
        const d = this.tour.distance;
        const dir = new Vec3();
        const pos = new Vec3();

        for (let i = 0; i < this.markers.length; i++) {
            const m = this.markers[i];
            const target = d + this.stepDistance * m.direction;

            // Sin camino por delante (o por detrás), la flecha desaparece.
            const outOfRange = m.direction > 0 ? d >= total - 0.05 : d <= 0.05;
            m.enabled = !outOfRange;
            if (outOfRange) continue;

            const clamped = Math.max(0, Math.min(target, total));
            this.trail.positionAt(clamped, pos);
            this.trail.directionAt(clamped, dir);

            pos.y += this.groundOffset;
            m.setPosition(pos);

            // El plano nace horizontal: girarlo para que la punta siga el camino.
            const yaw = Math.atan2(dir.x * m.direction, dir.z * m.direction) * 180 / Math.PI;
            m.setEulerAngles(0, yaw, 0);

            const resaltada = this.hoverIndex === i;
            m.baseMaterial.opacity = resaltada ? 1 : 0.85;
            m.baseMaterial.update();
            m.setLocalScale(this.size * (resaltada ? 1.12 : 1), 1, this.size * (resaltada ? 1.12 : 1));
        }
    }

    destroy() {
        this.app.off('update', this._onUpdate);
        const canvas = this.app.graphicsDevice.canvas;
        canvas.removeEventListener('pointerdown', this._pointerDown, true);
        canvas.removeEventListener('pointermove', this._pointerMove);
        this.markers.forEach(m => m.destroy());
    }
}
