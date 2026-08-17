/*
 * TrailRecorder — herramienta para marcar el trazado sobre la escena.
 *
 * Solo se usa en desarrollo: se recorre la escena en vuelo libre y se van
 * marcando los puntos por donde pasa el camino. Al terminar, exporta el JSON
 * que consume TrailPath. Así el trazado se define viendo la escena real, sin
 * adivinar coordenadas y sin tocar código.
 *
 * Se activa con ?editor=1 en la URL.
 */
export class TrailRecorder {
    constructor(app, camera, onChange) {
        this.app = app;
        this.camera = camera;
        this.onChange = onChange;
        this.points = [];
        this._bind();
    }

    _bind() {
        this._onKey = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'm') this.mark();
            if (k === 'z' && !e.ctrlKey) this.undo();
            if (k === 'x') this.exportJson();
        };
        window.addEventListener('keydown', this._onKey);
    }

    destroy() {
        window.removeEventListener('keydown', this._onKey);
    }

    mark() {
        const p = this.camera.getPosition();
        this.points.push({
            x: Number(p.x.toFixed(3)),
            y: Number(p.y.toFixed(3)),
            z: Number(p.z.toFixed(3))
        });
        this.onChange?.(this.points);
    }

    undo() {
        this.points.pop();
        this.onChange?.(this.points);
    }

    /** Descarga config/track.json con los puntos marcados. */
    exportJson() {
        if (!this.points.length) return;
        const data = {
            version: 1,
            capturedOn: '[pendiente: fecha real de la salida de campo]',
            note: 'Trazado marcado sobre la escena con el editor del prototipo. Las coordenadas están en unidades del motor, no en metros.',
            sceneWaypoints: this.points,
            points: []
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'track.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
