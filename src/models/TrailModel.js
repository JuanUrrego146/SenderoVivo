/*
 * TrailModel — modelo geométrico del trazado autorizado.
 *
 * Guarda los puntos del camino y responde:
 *   ¿qué posición corresponde a la distancia D?       -> positionAt()
 *   ¿cuál es el punto más cercano a una posición?     -> clampToTrail()
 *   ¿está la posición dentro del corredor permitido? -> clampToCorridor()
 *   ¿dónde va la cámara, sin los quiebres de la línea? -> smoothPositionAt(), headingAt(),
 *                                                         turnRadiusAt()
 *
 * El modelo no conoce la interfaz ni el DOM.
 * Vec3 se utiliza únicamente como herramienta matemática.
 */

import { Vec3 } from 'playcanvas';

export class TrailModel {

    /**
     * @param {{x:number,y:number,z:number}[]} waypoints
     * @param {number} corridorRadius
     */
    constructor(
        waypoints = [],
        corridorRadius = 1.5
    ) {
        this.waypoints =
            waypoints.map(
                p =>
                    new Vec3(
                        p.x,
                        p.y,
                        p.z
                    )
            );

        this.corridorRadius =
            corridorRadius;

        this.eyeHeight =
            0;

        this.segmentLengths =
            [];

        this.cumulative =
            [0];

        this._suave = null;

        this._rebuild();
    }

    /** Separación en metros de las muestras de la curva suave. */
    static PASO_SUAVE = 0.05;

    _rebuild() {

        this.segmentLengths.length =
            0;

        this.cumulative.length =
            1;

        for (
            let i = 1;
            i < this.waypoints.length;
            i++
        ) {

            const length =
                this.waypoints[i]
                    .distance(
                        this.waypoints[i - 1]
                    );

            this.segmentLengths.push(
                length
            );

            this.cumulative.push(
                this.cumulative[i - 1] +
                length
            );
        }

        this._construirCurvaSuave();
    }

    /*
     * CURVA SUAVE DEL TRAZADO
     *
     * El trazado es una línea quebrada (un punto cada 1,5 m). positionAt() interpola en recta
     * y en cada vértice cambian de golpe el rumbo y la pendiente: caminar pegado a ella da un
     * saltito de altura en cada punto. La cámara camina sobre una Catmull-Rom centrípeta
     * (alfa 0,5) que pasa por los mismos puntos, muestreada cada PASO_SUAVE metros de la
     * distancia de siempre: las paradas, los POI y los cortes quedan en las mismas distancias.
     * positionAt() y directionAt() no cambian (los usan los POI, las flechas y el audio).
     */
    _construirCurvaSuave() {
        this._suave = null;
        if (!this.isUsable) return;

        const PASO = TrailModel.PASO_SUAVE;
        const P = this.waypoints;
        const n = P.length;
        const largo = this.totalLength();
        const muestras = Math.floor(largo / PASO) + 2;
        const xs = new Float64Array(muestras);
        const ys = new Float64Array(muestras);
        const zs = new Float64Array(muestras);

        // En los extremos se refleja el punto que falta.
        const punto = (k) => {
            if (k >= 0 && k < n) return P[k];
            const [a, b] = k < 0 ? [P[0], P[1]] : [P[n - 1], P[n - 2]];
            return { x: 2 * a.x - b.x, y: 2 * a.y - b.y, z: 2 * a.z - b.z };
        };
        const nudo = (a, b) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)), 1e-4);
        const mezcla = (a, b, ta, tb, t) => {
            const k = (t - ta) / (tb - ta);
            return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
        };

        let i = 1;
        for (let s = 0; s < muestras; s++) {
            const d = Math.min(s * PASO, largo);
            while (i < this.cumulative.length - 1 && this.cumulative[i] < d) i++;
            const tramo = this.segmentLengths[i - 1];
            const u = tramo > 0 ? (d - this.cumulative[i - 1]) / tramo : 0;
            const p0 = punto(i - 2), p1 = P[i - 1], p2 = P[i], p3 = punto(i + 1);
            const t0 = 0;
            const t1 = t0 + nudo(p0, p1);
            const t2 = t1 + nudo(p1, p2);
            const t3 = t2 + nudo(p2, p3);
            const t = t1 + u * (t2 - t1);
            const a1 = mezcla(p0, p1, t0, t1, t);
            const a2 = mezcla(p1, p2, t1, t2, t);
            const a3 = mezcla(p2, p3, t2, t3, t);
            const b1 = mezcla(a1, a2, t0, t2, t);
            const b2 = mezcla(a2, a3, t1, t3, t);
            const c = mezcla(b1, b2, t1, t2, t);
            xs[s] = c.x;
            ys[s] = c.y;
            zs[s] = c.z;
        }

        // Rumbo de la cuerda entre la curva a 1 m antes y 1 m después, en grados con la
        // convención de state.yaw (atan2(-x, -z)) y desenrollado: dos rumbos se pueden restar
        // sin saltos de 360.
        const rumbos = new Float64Array(muestras);
        const indice = (d) => Math.round(Math.max(0, Math.min(d, largo)) / PASO);
        for (let s = 0; s < muestras; s++) {
            const d = s * PASO;
            const a = indice(d - 1);
            const b = indice(d + 1);
            const dx = xs[b] - xs[a];
            const dz = zs[b] - zs[a];
            let h = s > 0 ? rumbos[s - 1] : 0;
            if (dx !== 0 || dz !== 0) {
                const crudo = Math.atan2(-dx, -dz) / (Math.PI / 180);
                h = s > 0 ? rumbos[s - 1] + ((crudo - rumbos[s - 1]) % 360 + 540) % 360 - 180 : crudo;
            }
            rumbos[s] = h;
        }

        this._suave = { xs, ys, zs, rumbos, largo };
    }

    _leerSuave(tabla, distance) {
        const S = this._suave;
        const f = Math.max(0, Math.min(distance, S.largo)) / TrailModel.PASO_SUAVE;
        const a = Math.min(Math.floor(f), tabla.length - 1);
        const b = Math.min(a + 1, tabla.length - 1);
        return tabla[a] + (tabla[b] - tabla[a]) * (f - a);
    }

    /** Posición sobre la curva suave a una distancia del trazado. */
    smoothPositionAt(distance, out = new Vec3()) {
        if (!this._suave) return this.positionAt(distance, out);
        const S = this._suave;
        return out.set(
            this._leerSuave(S.xs, distance),
            this._leerSuave(S.ys, distance),
            this._leerSuave(S.zs, distance)
        );
    }

    /** Rumbo suave del camino (grados, convención de state.yaw, desenrollado). */
    headingAt(distance) {
        if (!this._suave) return 0;
        return this._leerSuave(this._suave.rumbos, distance);
    }

    /** Radio de giro del camino en metros (grande en las rectas, chico en las curvas cerradas). */
    turnRadiusAt(distance) {
        if (!this._suave) return Infinity;
        const largo = this._suave.largo;
        const a = Math.max(0, distance - 0.15);
        const b = Math.min(largo, distance + 0.15);
        if (!(b > a)) return Infinity;
        const giro = Math.abs(this.headingAt(b) - this.headingAt(a)) / (b - a);
        return 57.3 / Math.max(giro, 1e-6);
    }

    /**
     * Longitud total del trazado.
     */
    totalLength() {

        return this.cumulative.length
            ? this.cumulative[
                this.cumulative.length - 1
            ]
            : 0;
    }

    /**
     * Indica si existe un trazado utilizable.
     */
    get isUsable() {

        return (
            this.waypoints.length >= 2 &&
            this.totalLength() > 0
        );
    }

    /**
     * Posición sobre el trazado
     * a una distancia determinada.
     */
    positionAt(
        distance,
        out = new Vec3()
    ) {

        if (!this.isUsable) {

            return out.copy(
                this.waypoints[0] ||
                Vec3.ZERO
            );
        }

        const d =
            Math.max(
                0,
                Math.min(
                    distance,
                    this.totalLength()
                )
            );

        let i = 1;

        while (
            i <
                this.cumulative.length - 1 &&
            this.cumulative[i] < d
        ) {
            i++;
        }

        const segmentStart =
            this.cumulative[i - 1];

        const segmentLength =
            this.segmentLengths[i - 1] ||
            1;

        const t =
            (d - segmentStart) /
            segmentLength;

        return out.lerp(
            this.waypoints[i - 1],
            this.waypoints[i],
            t
        );
    }

    /**
     * Dirección de avance del trazado
     * en una distancia determinada.
     */
    directionAt(
        distance,
        out = new Vec3()
    ) {

        if (!this.isUsable) {

            return out.set(
                0,
                0,
                -1
            );
        }

        const d =
            Math.max(
                0,
                Math.min(
                    distance,
                    this.totalLength()
                )
            );

        let i = 1;

        while (
            i <
                this.cumulative.length - 1 &&
            this.cumulative[i] < d
        ) {
            i++;
        }

        return out
            .sub2(
                this.waypoints[i],
                this.waypoints[i - 1]
            )
            .normalize();
    }

    /**
     * Margen lateral permitido en una distancia: { left, right } en metros.
     * Si el trazado trae corridorLeft / corridorRight (un valor por punto, medido como el
     * espacio libre a la altura de la cabeza), se interpolan entre puntos; si no, los dos
     * lados valen corridorRadius.
     */
    corridorAt(distance) {
        const izq = this.corridorLeft;
        const der = this.corridorRight;
        if (
            !this.isUsable ||
            !Array.isArray(izq) || !Array.isArray(der) ||
            izq.length !== this.waypoints.length ||
            der.length !== this.waypoints.length
        ) {
            return { left: this.corridorRadius, right: this.corridorRadius };
        }
        const d = Math.max(0, Math.min(distance, this.totalLength()));
        let i = 1;
        while (i < this.cumulative.length - 1 && this.cumulative[i] < d) i++;
        const largo = this.cumulative[i] - this.cumulative[i - 1];
        const t = largo > 0 ? (d - this.cumulative[i - 1]) / largo : 0;
        return {
            left: izq[i - 1] + (izq[i] - izq[i - 1]) * t,
            right: der[i - 1] + (der[i] - der[i - 1]) * t
        };
    }

    /**
     * Calcula la distancia sobre el trazado
     * correspondiente al punto más cercano.
     */
    clampToTrail(position) {

        if (!this.isUsable) {
            return 0;
        }

        let best = {
            distance: 0,
            sqDist: Infinity
        };

        const ab =
            new Vec3();

        const ap =
            new Vec3();

        const projection =
            new Vec3();

        for (
            let i = 1;
            i < this.waypoints.length;
            i++
        ) {

            const a =
                this.waypoints[i - 1];

            const b =
                this.waypoints[i];

            ab.sub2(
                b,
                a
            );

            const abLengthSq =
                ab.lengthSq();

            if (
                abLengthSq === 0
            ) {
                continue;
            }

            ap.sub2(
                position,
                a
            );

            const t =
                Math.max(
                    0,
                    Math.min(
                        1,
                        ap.dot(ab) /
                        abLengthSq
                    )
                );

            projection
                .copy(a)
                .addScaled(
                    ab,
                    t
                );

            const sqDist =
                projection.distance(
                    position
                ) ** 2;

            if (
                sqDist <
                best.sqDist
            ) {

                best = {
                    distance:
                        this.cumulative[i - 1] +
                        t *
                        this.segmentLengths[i - 1],

                    sqDist
                };
            }
        }

        return best.distance;
    }

    /**
     * Mantiene una posición dentro
     * del corredor autorizado.
     */
    clampToCorridor(
        position,
        out = new Vec3()
    ) {

        if (!this.isUsable) {

            return out.copy(
                position
            );
        }

        const onTrail =
            this.positionAt(
                this.clampToTrail(
                    position
                )
            );

        const offset =
            new Vec3()
                .sub2(
                    position,
                    onTrail
                );

        const distance =
            offset.length();

        if (
            distance <=
            this.corridorRadius
        ) {

            return out.copy(
                position
            );
        }

        return out
            .copy(onTrail)
            .addScaled(
                offset.mulScalar(
                    1 / distance
                ),
                this.corridorRadius
            );
    }
}