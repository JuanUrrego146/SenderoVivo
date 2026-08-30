/*
 * TrailModel — modelo geométrico del trazado autorizado.
 *
 * Guarda los puntos del camino y responde:
 *   ¿qué posición corresponde a la distancia D?       -> positionAt()
 *   ¿cuál es el punto más cercano a una posición?     -> clampToTrail()
 *   ¿está la posición dentro del corredor permitido? -> clampToCorridor()
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

        this._rebuild();
    }

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