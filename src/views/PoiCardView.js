import { ModelView } from './ModelView.js';

export class PoiCardView {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.modelViewer = null;
        this.cantoAudio = null;
        this.narracionAudio = null;
        this._onKeyDown = this._onKeyDown.bind(this);

        this._onOpen = this._onOpen.bind(this);
        this._onClose = this._onClose.bind(this);

        app.on('poi:open', this._onOpen);
        app.on('poi:close', this._onClose);

        console.log('PoiCardView listo con tokens unificados');
    }

    _onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.app.fire('poi:request-close');
        }
    }

    async _onOpen(poi) {
        console.log('ABRIENDO FICHA POI:', poi);

        // Limpiar ficha anterior si existía
        this._remove();

        // 1. Overlay accesible (Scrim con desenfoque de Atlas Botánico)
        const overlay = document.createElement('div');
        overlay.id = 'sendero-vivo-poi-overlay';
        overlay.className = 'sv-poi-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'poi-card-title');

        // 2. Tarjeta con tokens y bordes suaves
        const card = document.createElement('div');
        card.className = 'sv-poi-card pointer-events-auto';

        const commonName = poi?.commonName || poi?.name || 'Especie nativa';
        const scientificName = poi?.scientificName || poi?.scientific || 'Biodiversidad altoandina';
        const altitude = poi?.altitudeRange || poi?.altitude || '2.600 – 3.200 msnm';
        const modelPath = poi?.modelUrl || 'assets/models/golondrina-plomiza.glb';
        const description = poi?.fullDesc || poi?.shortDesc || poi?.desc || 'Especie representativa de los ecosistemas de alta montaña en los Cerros Orientales de Bogotá.';

        card.innerHTML = `
            <button
                id="poi-close-button"
                type="button"
                class="sv-poi-close-btn"
                title="Cerrar ficha (Esc)"
                aria-label="Cerrar ficha de especie"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <!-- VISOR 3D -->
            <div
                id="poi-model"
                style="
                    width: 100%;
                    height: 230px;
                    margin-bottom: 16px;
                    border-radius: var(--sv-radius-lg, 20px);
                    overflow: hidden;
                    background: var(--sv-surface-inset);
                    border: 1px solid var(--sv-surface-border);
                    position: relative;
                "
            >
                <div
                    id="poi-model-loading"
                    style="
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--sv-primary);
                        font-size: 13px;
                        font-weight: 600;
                        z-index: 2;
                        gap: 8px;
                    "
                >
                    <i class="fa-solid fa-cube fa-spin"></i>
                    <span>Cargando modelo 3D...</span>
                </div>
            </div>

            <!-- ENCABEZADO Y TAXONOMÍA -->
            <div style="text-align: center; margin-bottom: 20px;">
                <span
                    style="
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 11px;
                        text-transform: uppercase;
                        font-weight: 700;
                        letter-spacing: 0.05em;
                        color: var(--sv-primary);
                        margin-bottom: 8px;
                    "
                >
                    <i class="fa-solid fa-cube"></i> Modelo 3D Interactivo
                </span>
                <h2
                    id="poi-card-title"
                    style="
                        margin: 0;
                        font-family: var(--sv-font-title, 'Syne', sans-serif);
                        font-size: clamp(20px, 3.5vw, 24px);
                        font-weight: 700;
                        color: var(--sv-text-primary);
                        letter-spacing: -0.01em;
                    "
                >
                    ${commonName}
                </h2>
                <p
                    style="
                        margin: 4px 0 0 0;
                        color: var(--sv-primary);
                        font-style: italic;
                        font-family: monospace;
                        font-size: 12.5px;
                    "
                >
                    ${scientificName}
                </p>
            </div>

            <!-- DATOS TÉCNICOS DE HÁBITAT (LIMPIOS SIN RECUADRO DE BOTÓN) -->
            <div
                style="
                    margin-bottom: 20px;
                    padding: 10px 0;
                    border-top: 1px solid var(--sv-surface-border-subtle);
                    border-bottom: 1px solid var(--sv-surface-border-subtle);
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    font-size: 12px;
                "
            >
                <div>
                    <span style="display: block; font-size: 11px; color: var(--sv-text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 2px;">Altitud</span>
                    <strong style="color: var(--sv-text-primary); font-size: 13.5px;">${altitude}</strong>
                </div>
                <div>
                    <span style="display: block; font-size: 11px; color: var(--sv-text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 2px;">Ubicación</span>
                    <strong style="color: var(--sv-text-primary); font-size: 13.5px;">Cerros Orientales</strong>
                </div>
            </div>

            <!-- DESCRIPCIÓN ECOLÓGICA -->
            <p
                style="
                    font-size: 13px;
                    line-height: 1.6;
                    color: var(--sv-text-muted);
                    margin: 0 0 18px 0;
                "
            >
                ${description}
            </p>

            <!-- CONTROLES DE AUDIO BIOFÓNICO -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="poi-canto" type="button" class="sv-poi-audio-btn sv-poi-audio-primary" style="flex: 1; min-width: 140px;">
                    <i class="fa-solid fa-volume-high"></i>
                    <span>Escuchar canto</span>
                </button>
                <button id="poi-narracion" type="button" class="sv-poi-audio-btn sv-poi-audio-secondary" style="flex: 1; min-width: 140px;">
                    <i class="fa-solid fa-headphones"></i>
                    <span>Escuchar narración</span>
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        this.element = overlay;

        // Listener teclado Escape
        window.addEventListener('keydown', this._onKeyDown);

        // Botón cerrar
        const closeButton = card.querySelector('#poi-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.app.fire('poi:request-close');
            });
        }

        // Clic en overlay fuera de tarjeta
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.app.fire('poi:request-close');
            }
        });

        // Configurar audios y modelo 3D
        this._setupAudio(card, poi);
        await this._loadModel(card, modelPath);
    }

    async _loadModel(card, modelPath) {
        const container = card.querySelector('#poi-model');
        const loading = card.querySelector('#poi-model-loading');

        try {
            this.modelViewer = new ModelView(container);
            await this.modelViewer.load(modelPath || 'assets/models/golondrina-plomiza.glb');
            if (loading) loading.remove();
        } catch (error) {
            console.warn('Modelo 3D no disponible, mostrando estado alternativo:', error);
            if (loading) {
                loading.innerHTML = '<i class="fa-solid fa-cube mr-2"></i><span>Vista 3D disponible en recorrido</span>';
                loading.style.color = 'var(--sv-text-muted)';
            }
        }
    }

    _setupAudio(card, poi) {
        const cantoUrl = (poi && poi.birdCallUrl) || '';
        const narracionUrl = (poi && poi.narrationUrl) || '';

        const cantoButton = card.querySelector('#poi-canto');
        const narracionButton = card.querySelector('#poi-narracion');

        if (!cantoUrl && cantoButton) {
            cantoButton.style.display = 'none';
        }
        if (!narracionUrl && narracionButton) {
            narracionButton.style.display = 'none';
        }

        if (!cantoUrl && !narracionUrl) {
            this.cantoAudio = null;
            this.narracionAudio = null;
            return;
        }

        this.cantoAudio = cantoUrl ? new Audio(cantoUrl) : null;
        this.narracionAudio = narracionUrl ? new Audio(narracionUrl) : null;

        if (this.cantoAudio) this.cantoAudio.preload = 'auto';
        if (this.narracionAudio) this.narracionAudio.preload = 'auto';

        if (cantoButton && this.cantoAudio) {
            cantoButton.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (this.narracionAudio) {
                    this.narracionAudio.pause();
                    this.narracionAudio.currentTime = 0;
                    if (narracionButton) {
                        narracionButton.innerHTML = '<i class="fa-solid fa-headphones"></i> <span>Escuchar narración</span>';
                    }
                }

                if (!this.cantoAudio.paused) {
                    this.cantoAudio.pause();
                    this.cantoAudio.currentTime = 0;
                    cantoButton.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Escuchar canto</span>';
                    return;
                }

                try {
                    await this.cantoAudio.play();
                    cantoButton.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pausar canto</span>';
                } catch (error) {
                    console.error('No se pudo reproducir canto:', error);
                }
            });

            this.cantoAudio.addEventListener('ended', () => {
                if (cantoButton) {
                    cantoButton.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Escuchar canto</span>';
                }
            });
        }

        if (narracionButton && this.narracionAudio) {
            narracionButton.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (this.cantoAudio) {
                    this.cantoAudio.pause();
                    this.cantoAudio.currentTime = 0;
                    if (cantoButton) {
                        cantoButton.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Escuchar canto</span>';
                    }
                }

                if (!this.narracionAudio.paused) {
                    this.narracionAudio.pause();
                    this.narracionAudio.currentTime = 0;
                    narracionButton.innerHTML = '<i class="fa-solid fa-headphones"></i> <span>Escuchar narración</span>';
                    return;
                }

                try {
                    await this.narracionAudio.play();
                    narracionButton.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pausar narración</span>';
                } catch (error) {
                    console.error('No se pudo reproducir narración:', error);
                }
            });

            this.narracionAudio.addEventListener('ended', () => {
                if (narracionButton) {
                    narracionButton.innerHTML = '<i class="fa-solid fa-headphones"></i> <span>Escuchar narración</span>';
                }
            });
        }
    }

    _onClose() {
        console.log('FICHA POI CERRADA');
        window.removeEventListener('keydown', this._onKeyDown);
        this._remove();
    }

    _remove() {
        window.removeEventListener('keydown', this._onKeyDown);

        if (this.modelViewer) {
            this.modelViewer.destroy();
            this.modelViewer = null;
        }

        if (this.cantoAudio) {
            this.cantoAudio.pause();
            this.cantoAudio.currentTime = 0;
            this.cantoAudio = null;
        }

        if (this.narracionAudio) {
            this.narracionAudio.pause();
            this.narracionAudio.currentTime = 0;
            this.narracionAudio = null;
        }

        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    destroy() {
        this.app.off('poi:open', this._onOpen);
        this.app.off('poi:close', this._onClose);
        this._remove();
    }
}