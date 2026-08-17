/*
 * TrailPath — el trazado autorizado del sendero.
 *
 * Guarda los puntos del camino y responde dos preguntas:
 *   ¿qué posición corresponde a la distancia D del recorrido?  -> positionAt()
 *   ¿cuál es el punto del camino más cercano a esta posición?  -> clampToTrail()
 *
 * Invariante 2 del proyecto (RF-004): ninguna posición llega a la cámara sin
 * pasar por clampToTrail(). El sendero está dentro de una reserva protegida:
 * el producto no puede insinuar salirse del camino.
 *
 * Los puntos vienen de config/track.json: cambiar el trazado no toca código.
 */
import { Vec3 } from 'playcanvas';

export class TrailPath {
    /** @param {{x:number,y:number,z:number}[]} waypoints puntos en el orden del recorrido */
    constructor(waypoints = []) {
        this.waypoints = waypoints.map(p => new Vec3(p.x, p.y, p.z));
        this.segmentLengths = [];
        this.cumulative = [0];
        this._rebuild();
    }

    _rebuild() {
        this.segmentLengths.length = 0;
        this.cumulative.length = 1;
        for (let i = 1; i < this.waypoints.length; i++) {
            const len = this.waypoints[i].distance(this.waypoints[i - 1]);
            this.segmentLengths.push(len);
            this.cumulative.push(this.cumulative[i - 1] + len);
        }
    }

    /** Longitud total del trazado, en unidades de la escena. */
    totalLength() {
        return this.cumulative.length ? this.cumulative[this.cumulative.length - 1] : 0;
    }

    get isUsable() {
        return this.waypoints.length >= 2 && this.totalLength() > 0;
    }

    /**
     * Posición sobre el trazado a la distancia indicada desde el inicio.
     * Se recorta a los extremos: no se puede salir del tramo por delante ni por detrás.
     */
    positionAt(distance, out = new Vec3()) {
        if (!this.isUsable) return out.copy(this.waypoints[0] || Vec3.ZERO);

        const d = Math.max(0, Math.min(distance, this.totalLength()));
        let i = 1;
        while (i < this.cumulative.length - 1 && this.cumulative[i] < d) i++;

        const segStart = this.cumulative[i - 1];
        const segLen = this.segmentLengths[i - 1] || 1;
        const t = (d - segStart) / segLen;
        return out.lerp(this.waypoints[i - 1], this.waypoints[i], t);
    }

    /** Dirección de avance del trazado en esa distancia (normalizada). */
    directionAt(distance, out = new Vec3()) {
        if (!this.isUsable) return out.set(0, 0, -1);
        const d = Math.max(0, Math.min(distance, this.totalLength()));
        let i = 1;
        while (i < this.cumulative.length - 1 && this.cumulative[i] < d) i++;
        return out.sub2(this.waypoints[i], this.waypoints[i - 1]).normalize();
    }

    /**
     * Distancia sobre el trazado del punto más cercano a la posición dada.
     * Es la garantía de RF-004: cualquier posición se devuelve al camino.
     */
    clampToTrail(position) {
        if (!this.isUsable) return 0;

        let best = { distance: 0, sqDist: Infinity };
        const ab = new Vec3();
        const ap = new Vec3();
        const proj = new Vec3();

        for (let i = 1; i < this.waypoints.length; i++) {
            const a = this.waypoints[i - 1];
            const b = this.waypoints[i];
            ab.sub2(b, a);
            const abLenSq = ab.lengthSq();
            if (abLenSq === 0) continue;

            ap.sub2(position, a);
            const t = Math.max(0, Math.min(1, ap.dot(ab) / abLenSq));
            proj.copy(a).addScaled(ab, t);

            const sqDist = proj.distance(position) ** 2;
            if (sqDist < best.sqDist) {
                best = { distance: this.cumulative[i - 1] + t * this.segmentLengths[i - 1], sqDist };
            }
        }
        return best.distance;
    }
}
