/*
 * PoiPositioner — Herramienta para ubicar los puntos de interés (POIs) sobre la escena (SW-30).
 *
 * Permite recorrer la escena en vuelo libre, apuntar con la cámara o hacer clic
 * para calcular automáticamente d, lat, alt respecto al trazado y las coordenadas del mundo anchor (x, y, z).
 * Genera el JSON formateado listo para copiar en config/pois.json.
 */
import { Vec3 } from 'playcanvas';

export class PoiPositioner {
    constructor(app, camera, trailModel, sceneId = 'la-cumbre') {
        this.app = app;
        this.camera = camera;
        this.trailModel = trailModel;
        this.sceneId = sceneId;
        this.lastCalculation = null;

        this._createUi();
        this._bindEvents();
    }

    _createUi() {
        this.container = document.createElement('div');
        this.container.id = 'poi-positioner-hud';
        this.container.style.position = 'fixed';
        this.container.style.bottom = '20px';
        this.container.style.right = '20px';
        this.container.style.zIndex = '9999';
        this.container.style.backgroundColor = 'var(--sv-black-900, rgba(15, 23, 42, 0.9))';
        this.container.style.color = 'var(--sv-white, #ffffff)';
        this.container.style.padding = '16px';
        this.container.style.borderRadius = '8px';
        this.container.style.fontFamily = 'sans-serif';
        this.container.style.fontSize = '13px';
        this.container.style.maxWidth = '360px';
        this.container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        this.container.style.border = '1px solid var(--sv-green-300, #4ade80)';

        this.container.innerHTML = `
            <h3 style="margin: 0 0 8px 0; font-size: 15px; color: var(--sv-green-300, #4ade80);">Ubicar Punto de Interés (POI)</h3>
            <p style="margin: 0 0 10px 0; font-size: 12px;">Apunta con la cámara o haz clic en la escena y presiona <strong>"Marcar punto"</strong> (o tecla <strong>P</strong>).</p>
            <div style="margin-bottom: 10px;">
                <button id="poi-mark-btn" style="background: var(--sv-green-300, #4ade80); color: #000; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-right: 6px;">Marcar punto (P)</button>
                <button id="poi-copy-json-btn" style="background: #334155; color: #fff; border: 1px solid #64748b; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Copiar JSON</button>
            </div>
            <div id="poi-coords-output" style="background: #0f172a; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 11px; max-height: 160px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">Sin datos capturados.</div>
            <div id="poi-status-msg" style="margin-top: 6px; font-size: 11px; color: var(--sv-green-300, #4ade80); min-height: 14px;"></div>
        `;

        document.body.appendChild(this.container);

        this.markBtn = this.container.querySelector('#poi-mark-btn');
        this.copyBtn = this.container.querySelector('#poi-copy-json-btn');
        this.outputEl = this.container.querySelector('#poi-coords-output');
        this.statusEl = this.container.querySelector('#poi-status-msg');

        this.markBtn.addEventListener('click', () => this.markCurrentPosition());
        this.copyBtn.addEventListener('click', () => this.copyJson());
    }

    _bindEvents() {
        this._onKey = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'p') {
                this.markCurrentPosition();
            }
        };
        window.addEventListener('keydown', this._onKey);

        this._onPointerDown = (e) => {
            if (e.target.tagName && e.target.tagName.toLowerCase() === 'canvas') {
                this.markCurrentPosition();
            }
        };
        window.addEventListener('pointerdown', this._onPointerDown);
    }

    destroy() {
        window.removeEventListener('keydown', this._onKey);
        window.removeEventListener('pointerdown', this._onPointerDown);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    markCurrentPosition() {
        const cameraPos = this.camera.getPosition();
        const worldX = Number(cameraPos.x.toFixed(3));
        const worldY = Number(cameraPos.y.toFixed(3));
        const worldZ = Number(cameraPos.z.toFixed(3));

        let d = 0;
        let lat = 0;
        let alt = 0;

        if (this.trailModel && this.trailModel.isUsable) {
            d = this.trailModel.clampToTrail(cameraPos);
            const pointOnTrail = this.trailModel.positionAt(d);
            const fwd = this.trailModel.directionAt(d);

            // Vector del punto en el trazado hacia la cámara/marcador
            const diff = new Vec3().sub2(cameraPos, pointOnTrail);
            
            // Altura relativa
            alt = diff.y;

            // Desplazamiento lateral (producto cruz con vector UP para obtener la derecha)
            const right = new Vec3().cross(fwd, Vec3.UP).normalize();
            lat = diff.dot(right);
        }

        const snippet = {
            id: "poi-nuevo",
            sceneId: this.sceneId,
            trailAnchor: {
                d: Number(d.toFixed(2)),
                lat: Number(lat.toFixed(2)),
                alt: Number(alt.toFixed(2))
            },
            anchor: {
                x: worldX,
                y: worldY,
                z: worldZ
            }
        };

        this.lastCalculation = snippet;
        const jsonStr = JSON.stringify(snippet, null, 2);
        this.outputEl.textContent = jsonStr;
        this.showStatus('Punto capturado correctamente.');
    }

    copyJson() {
        if (!this.lastCalculation) {
            this.showStatus('Primero debes marcar un punto.');
            return;
        }
        const jsonStr = JSON.stringify(this.lastCalculation, null, 2);
        navigator.clipboard.writeText(jsonStr)
            .then(() => this.showStatus('¡JSON copiado al portapapeles!'))
            .catch(() => this.showStatus('Error al copiar al portapapeles.'));
    }

    showStatus(msg) {
        if (this.statusEl) {
            this.statusEl.textContent = msg;
            setTimeout(() => {
                if (this.statusEl && this.statusEl.textContent === msg) {
                    this.statusEl.textContent = '';
                }
            }, 3000);
        }
    }
}