import { HudView } from '../views/HudView.js';

/**
 * Prepara las métricas del recorrido para el HUD.
 *
 * El controlador es deliberadamente independiente de PlayCanvas: solo escucha
 * el bus de eventos, consulta GpsTrack y entrega datos ya formateados a HudView.
 */
export class DataController {
    constructor(app, gpsTrack, hudView = new HudView(), pois = [], options = {}) {
        this.app = app;
        this.gpsTrack = gpsTrack;
        this.hudView = hudView;
        this.pois = pois;
        this.walkingSpeed = options.walkingSpeed ?? 1.2;
        this.climbingSpeed = options.climbingSpeed ?? (5 / 18);
        this.currentDistance = 0;
        this.sceneTotal = 0;
        this.nextPoi = null;

        this._onProgress = this._onProgress.bind(this);
        this._onPoiOpen = this._onPoiOpen.bind(this);
        app.on('tour:progress', this._onProgress);
        app.on('poi:open', this._onPoiOpen);
    }

    destroy() {
        this.app.off('tour:progress', this._onProgress);
        this.app.off('poi:open', this._onPoiOpen);
    }

    setPois(pois) {
        this.pois = Array.isArray(pois) ? pois : [];
        this.nextPoi = null;
        this._refreshNextPoi();
    }

    _onPoiOpen() {
        this._refreshNextPoi();
        this._renderEta();
    }

    _onProgress(progress = {}) {
        this.sceneTotal = Number.isFinite(progress.total) ? progress.total : 0;
        this.currentDistance = Number.isFinite(progress.distanceMeters)
            ? progress.distanceMeters
            : this._sceneToTrackDistance(progress.distance);

        this._refreshNextPoi();
        this.hudView.update({
            progress: this._percentage(progress.distance, progress.total),
            recorrido: this._formatMeters(progress.distanceMeters),
            restante: this._formatMeters(progress.distanceRemainingMeters),
            desnivel: this._formatElevation(progress.elevationGainMeters),
            altitud: this._formatAltitude(progress.altitudeMeters),
            pendiente: this._formatSlope(progress.slopePercent),
            eta: this._formatDuration(this._estimateToNextPoi()),
            nextPoi: this.nextPoi?.commonName || 'Próximo punto'
        });
    }

    _sceneToTrackDistance(distance) {
        const total = this.gpsTrack?.totalDistance?.() ?? 0;
        if (!Number.isFinite(distance) || this.sceneTotal <= 0 || total <= 0) return null;
        return (distance / this.sceneTotal) * total;
    }

    _percentage(distance, total) {
        return total > 0 && Number.isFinite(distance)
            ? Math.max(0, Math.min(100, 100 * distance / total))
            : 0;
    }

    _poiDistance(poi) {
        if (Number.isFinite(poi?.distanceMeters) && poi.distanceMeters > 0) {
            return poi.distanceMeters;
        }
        const sceneDistance = poi?.trailAnchor?.d;
        const trackTotal = this.gpsTrack?.totalDistance?.() ?? 0;
        if (Number.isFinite(sceneDistance) && this.sceneTotal > 0 && trackTotal > 0) {
            return (sceneDistance / this.sceneTotal) * trackTotal;
        }
        return Number.isFinite(poi?.distanceMeters) ? poi.distanceMeters : null;
    }

    _refreshNextPoi() {
        const candidates = this.pois
            .map(poi => ({ poi, distance: this._poiDistance(poi) }))
            .filter(item => Number.isFinite(item.distance) && item.distance > this.currentDistance + 0.01)
            .sort((a, b) => a.distance - b.distance);
        this.nextPoi = candidates[0]?.poi || null;
        this._nextPoiDistance = candidates[0]?.distance ?? null;
    }

    _estimateToNextPoi() {
        if (!this.nextPoi || !Number.isFinite(this._nextPoiDistance)) return null;
        const start = Math.max(0, this.currentDistance);
        const end = Math.min(this.gpsTrack.totalDistance(), this._nextPoiDistance);
        if (end <= start) return 0;

        const segments = 10;
        const segmentLength = (end - start) / segments;
        let seconds = 0;
        for (let i = 0; i < segments; i++) {
            const midpoint = start + segmentLength * (i + 0.5);
            const slope = this.gpsTrack.slopeAt(midpoint, segmentLength / 2) ?? 0;
            const uphillSeconds = segmentLength * Math.max(0, slope / 100) / this.climbingSpeed;
            seconds += segmentLength / this.walkingSpeed + uphillSeconds;
        }
        return seconds;
    }

    _renderEta() {
        this.hudView.update({
            eta: this._formatDuration(this._estimateToNextPoi()),
            nextPoi: this.nextPoi?.commonName || 'Próximo punto'
        });
    }

    _formatMeters(value) {
        return Number.isFinite(value) ? `${value.toFixed(0)} m` : '—';
    }

    _formatElevation(value) {
        return Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(1)} m` : '—';
    }

    _formatAltitude(value) {
        return Number.isFinite(value)
            ? `${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })} m`
            : '—';
    }

    _formatSlope(value) {
        return Number.isFinite(value) ? `${Math.abs(value).toFixed(0)} %` : '—';
    }

    _formatDuration(seconds) {
        if (!Number.isFinite(seconds)) return '—';
        const roundedMinutes = Math.max(1, Math.ceil(seconds / 60));
        if (roundedMinutes < 60) return `${roundedMinutes} min`;
        const hours = Math.floor(roundedMinutes / 60);
        const minutes = roundedMinutes % 60;
        return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
    }
}

