export class PoiCard {
    constructor(app) {
        this.app = app;
        this.element = null;

        this._onOpen = this._onOpen.bind(this);
        this._onClose = this._onClose.bind(this);

        app.on('poi:open', this._onOpen);
        app.on('poi:close', this._onClose);

        console.log('PoiCard listo');
    }

    _onOpen(poi) {

        console.log('ABRIENDO FICHA:', poi);

        this._remove();

        // ==============================
        // OVERLAY
        // ==============================

        const overlay = document.createElement('div');

        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0, 0, 0, 0.65)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.pointerEvents = 'auto';

        // ==============================
        // TARJETA
        // ==============================

        const card = document.createElement('div');

        card.style.position = 'relative';
        card.style.width = '420px';
        card.style.maxWidth = '90vw';
        card.style.maxHeight = '85vh';
        card.style.overflowY = 'auto';
        card.style.background = '#18251d';
        card.style.color = 'white';
        card.style.borderRadius = '24px';
        card.style.padding = '30px';
        card.style.boxSizing = 'border-box';
        card.style.fontFamily = 'Arial, sans-serif';
        card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
        card.style.border = '1px solid rgba(111,207,151,0.5)';

        // ==============================
        // DATOS
        // ==============================

        const commonName =
            poi?.commonName || 'Colibrí chillón';

        const scientificName =
            poi?.scientificName || 'Colibri coruscans';

        const altitude =
            poi?.altitudeRange || '1.700 – 3.500 msnm';

        // ==============================
        // CONTENIDO
        // ==============================

        card.innerHTML = `

            <button
                id="poi-close-button"
                style="
                    position:absolute;
                    top:12px;
                    right:15px;
                    width:38px;
                    height:38px;
                    border:none;
                    border-radius:50%;
                    background:rgba(255,255,255,0.12);
                    color:white;
                    font-size:26px;
                    cursor:pointer;
                "
            >
                ×
            </button>

            <div
                style="
                    text-align:center;
                    font-size:70px;
                    margin-bottom:10px;
                "
            >
                🐦
            </div>

            <h2
                style="
                    margin:0;
                    text-align:center;
                    font-size:30px;
                    color:#6fcf97;
                "
            >
                ${commonName}
            </h2>

            <p
                style="
                    text-align:center;
                    margin-top:8px;
                    color:#bdbdbd;
                    font-style:italic;
                "
            >
                ${scientificName}
            </p>

            <div
                style="
                    margin-top:25px;
                    padding:15px;
                    background:rgba(255,255,255,0.07);
                    border-radius:14px;
                "
            >

                <p style="margin:6px 0;">
                    <strong>🦜 Tipo:</strong>
                    Fauna
                </p>

                <p style="margin:6px 0;">
                    <strong>⛰️ Altitud:</strong>
                    ${altitude}
                </p>

                <p style="margin:6px 0;">
                    <strong>📍 Lugar:</strong>
                    Cerros Orientales de Bogotá
                </p>

            </div>

            <h3
                style="
                    margin-top:25px;
                    color:#6fcf97;
                "
            >
                Sobre esta especie
            </h3>

            <p
                style="
                    line-height:1.6;
                    color:#e5e5e5;
                "
            >
                El colibrí chillón
                (<em>Colibri coruscans</em>)
                es una especie de colibrí característica
                de diferentes ecosistemas de montaña.
            </p>

            <p
                style="
                    line-height:1.6;
                    color:#e5e5e5;
                "
            >
                Se caracteriza por su comportamiento
                activo y por sus vocalizaciones fuertes,
                de donde proviene su nombre común.
            </p>

            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                    margin-top:25px;
                "
            >

                <button
                    id="poi-canto"
                    style="
                        padding:14px;
                        border:none;
                        border-radius:12px;
                        background:#6fcf97;
                        color:#102016;
                        font-weight:bold;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    🔊 Escuchar canto
                </button>

                <button
                    id="poi-narracion"
                    style="
                        padding:14px;
                        border:1px solid #6fcf97;
                        border-radius:12px;
                        background:transparent;
                        color:#6fcf97;
                        font-weight:bold;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    🎧 Escuchar narración
                </button>

            </div>
        `;

        // ==============================
        // AGREGAR A LA PÁGINA
        // ==============================

        overlay.appendChild(card);

        document.body.appendChild(overlay);

        this.element = overlay;

        console.log('FICHA INSERTADA EN EL DOM');

        // ==============================
        // BOTÓN CERRAR
        // ==============================

        const closeButton =
            card.querySelector('#poi-close-button');

        closeButton.addEventListener(
            'click',
            (event) => {

                event.stopPropagation();

                console.log('Cerrando ficha');

                this._onClose();
            }
        );

        // ==============================
        // CLIC FUERA DE LA TARJETA
        // ==============================

        overlay.addEventListener(
            'click',
            (event) => {

                if (event.target === overlay) {
                    this._onClose();
                }

            }
        );
    }

    _onClose() {

        console.log('FICHA CERRADA');

        this._remove();

        this.app.fire('poi:request-close');
    }

    _remove() {

        if (this.element) {

            this.element.remove();

            this.element = null;
        }
    }

    destroy() {

        this.app.off(
            'poi:open',
            this._onOpen
        );

        this.app.off(
            'poi:close',
            this._onClose
        );

        this._remove();
    }
}