/**
 * GpsTrack — modelo de datos del recorrido GPS.
 *
 * Lee config/track.json y ofrece consultas sobre altitud, distancia, desnivel y pendiente
 * en cualquier punto del recorrido. Independiente de PlayCanvas: es la frontera 2 del
 * proyecto y puede probarse sin abrir un navegador.
 *
 * Contrato:
 *  - Si track.points tiene datos, usa esos (altitud real en msnm, distancia en m)
 *  - Si track.points está vacío, devuelve null para altitud y usa sceneWaypoints
 *    como aproximación hasta que llegue el track GPS real (CAM-02, V1).
 *
 * USO:
 *  const gps = new GpsTrack(trackJsonObject);
 *  gps.altitudeAt(50);              // msnm en distancia 50m (o null si no hay datos)
 *  gps.distanceTraveled(50);        // 50
 *  gps.distanceRemaining(50);       // totalDistance - 50
 *  gps.cumulativeElevation(50);     // desnivel positivo acumulado hasta 50m
 *  gps.slopeAt(50);                 // pendiente en % alrededor de 50m (o null)
 *  gps.totalDistance();             // distancia total en metros
 */

export class GpsTrack {
    /**
     * @param {object} trackJson - el objeto parseado de config/track.json
     */
    constructor(trackJson) {
        this.trackJson = trackJson;
        this.points = trackJson.points || [];
        this.sceneWaypoints = trackJson.sceneWaypoints || [];
        this.eyeHeight = trackJson.eyeHeight || 0;
        this.corridorRadius = trackJson.corridorRadius || 1.5;

        // Construir índices para búsqueda O(log n)
        this._buildIndices();
    }

    _buildIndices() {
        // Asegurar que points está ordenado por distancia
        if (this.points.length > 0) {
            this.points.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
    }

    /**
     * Distancia total del recorrido en metros.
     * Si hay datos GPS, la última entrada.
     * Si no, aproximación basada en sceneWaypoints.
     */
    totalDistance() {
        if (this.points.length > 0) {
            const last = this.points[this.points.length - 1];
            return last.distance || 0;
        }

        // Aproximación sin datos reales: sumar distancias euclidianas en escena
        let total = 0;
        for (let i = 1; i < this.sceneWaypoints.length; i++) {
            const p0 = this.sceneWaypoints[i - 1];
            const p1 = this.sceneWaypoints[i];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const dz = p1.z - p0.z;
            total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return total;
    }

    /**
     * Altitud en msnm en la distancia dada.
     * @param {number} distance - distancia en metros desde el inicio
     * @returns {number|null} altitud en msnm, o null si no hay datos GPS aún
     */
    altitudeAt(distance) {
        if (this.points.length === 0) {
            return null; // Sin datos GPS, no podemos saber la altitud real
        }

        const clamped = Math.max(0, Math.min(distance, this.totalDistance()));
        const point = this._findPointAt(clamped);

        if (!point) return null;
        return point.altitude || null;
    }

    /**
     * Distancia recorrida desde el inicio.
     * @param {number} distance - distancia en metros
     * @returns {number} la distancia clampeada a [0, totalDistance]
     */
    distanceTraveled(distance) {
        return Math.max(0, Math.min(distance, this.totalDistance()));
    }

    /**
     * Distancia restante hasta el final del recorrido.
     * @param {number} distance - distancia en metros
     * @returns {number} metros restantes
     */
    distanceRemaining(distance) {
        const traveled = this.distanceTraveled(distance);
        return this.totalDistance() - traveled;
    }

    /**
     * Desnivel positivo acumulado hasta la distancia dada (en metros).
     * @param {number} distance - distancia en metros
     * @returns {number|null} desnivel acumulado en metros, o null si no hay datos
     */
    cumulativeElevation(distance) {
        if (this.points.length === 0) {
            return null;
        }

        const clamped = Math.max(0, Math.min(distance, this.totalDistance()));
        let elevation = 0;

        for (let i = 0; i < this.points.length - 1; i++) {
            const current = this.points[i];
            const next = this.points[i + 1];

            const currentDist = current.distance || 0;
            const nextDist = next.distance || 0;

            if (nextDist <= clamped) {
                // El tramo entero está antes de la distancia: sumarlo completo
                const alt0 = current.altitude || 0;
                const alt1 = next.altitude || 0;
                if (alt1 > alt0) {
                    elevation += alt1 - alt0;
                }
            } else if (currentDist < clamped) {
                // El tramo se corta en la distancia: interpolar proporcionalmente
                const alt0 = current.altitude || 0;
                const alt1 = next.altitude || 0;
                const t = (clamped - currentDist) / (nextDist - currentDist);

                if (alt1 > alt0) {
                    const partialGain = (alt1 - alt0) * t;
                    elevation += partialGain;
                }
                break;
            } else {
                // Aún no hemos llegado a este tramo
                break;
            }
        }

        return elevation;
    }

    /**
     * Pendiente en % (desnivel / distancia * 100) alrededor de la distancia dada.
     * Calcula en una ventana de ±5m para suavizar.
     *
     * @param {number} distance - distancia en metros
     * @param {number} window - ventana de cálculo en metros (por defecto 5)
     * @returns {number|null} pendiente en %, o null si no hay datos
     */
    slopeAt(distance, window = 5) {
        if (this.points.length < 2) {
            return null;
        }

        const before = Math.max(0, distance - window);
        const after = Math.min(this.totalDistance(), distance + window);

        const altBefore = this.altitudeAt(before);
        const altAfter = this.altitudeAt(after);

        if (altBefore === null || altAfter === null) {
            return null;
        }

        const horizontalDist = after - before;
        if (horizontalDist === 0) return null;

        const elevationDiff = altAfter - altBefore;
        return (elevationDiff / horizontalDist) * 100;
    }

    /**
     * Punto de datos GPS interpolado en la distancia dada.
     * Búsqueda binaria + interpolación lineal entre dos puntos.
     *
     * @private
     * @param {number} distance
     * @returns {object|null} punto interpolado con {distance, altitude, lat, lon, ...}
     */
    _findPointAt(distance) {
        if (this.points.length === 0) return null;

        // Búsqueda binaria del segmento
        let left = 0;
        let right = this.points.length - 1;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if ((this.points[mid].distance || 0) < distance) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        // Si estamos exactamente en un punto, devolverlo
        if ((this.points[left].distance || 0) === distance) {
            return this.points[left];
        }

        // Si estamos antes del primer punto
        if (left === 0 && distance < (this.points[0].distance || 0)) {
            return this.points[0];
        }

        // Si estamos después del último punto
        if (left >= this.points.length) {
            return this.points[this.points.length - 1];
        }

        // Interpolar entre points[left-1] y points[left]
        if (left > 0) {
            const p0 = this.points[left - 1];
            const p1 = this.points[left];
            const d0 = p0.distance || 0;
            const d1 = p1.distance || 0;

            if (d0 < distance && distance < d1) {
                const t = (distance - d0) / (d1 - d0);
                return this._interpolatePoints(p0, p1, t);
            } else {
                return p0;
            }
        }

        return this.points[left];
    }

    /**
     * Interpola linealmente entre dos puntos GPS.
     *
     * @private
     */
    _interpolatePoints(p0, p1, t) {
        const alt0 = p0.altitude || 0;
        const alt1 = p1.altitude || 0;
        const lat0 = p0.lat;
        const lat1 = p1.lat;
        const lon0 = p0.lon;
        const lon1 = p1.lon;

        return {
            distance: p0.distance + t * ((p1.distance || 0) - (p0.distance || 0)),
            altitude: alt0 + t * (alt1 - alt0),
            lat: lat0 !== undefined && lat1 !== undefined ? lat0 + t * (lat1 - lat0) : undefined,
            lon: lon0 !== undefined && lon1 !== undefined ? lon0 + t * (lon1 - lon0) : undefined
        };
    }
}
