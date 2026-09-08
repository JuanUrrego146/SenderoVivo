/*
 * Cascarón de interfaz de Eybar Viasus montado sobre el visor real.
 * Origen: design/interfaz/original-tailwind/app.js
 *
 * Adaptaciones de integración:
 *   · El fondo ES el visor 3DGS real.
 *   · Los puntos de interés se anclan al trazado real.
 *   · El catálogo único viene de config/pois.json.
 *   · Sin dependencias CDN para Tailwind.
 *   · El audio solo se activa mediante interacción explícita.
 */

/* ==========================================================================
   DATOS: catálogo ÚNICO del proyecto — config/pois.json
   ========================================================================== */

let trailData = [];

const CATALOGO_URL = 'config/pois.json';

/**
 * Lee un color desde styles/tokens.css.
 */
function colorDeToken(nombreToken) {
    if (!nombreToken) return '';

    return getComputedStyle(document.documentElement)
        .getPropertyValue(nombreToken)
        .trim();
}

/**
 * Traduce una entrada del contrato a la forma que utiliza este cascarón.
 */
function limpiarNombreComun(id, name) {
    if (id === 'poi-muro-antiguo' || !name || name.includes('[por')) return 'Muro patrimonial antiguo';
    if (id === 'poi-golondrina-plomiza' || id === 'poi-golondrina') return 'Golondrina plomiza';
    return name.replace(/\[[^\]]*\]/g, '').trim();
}

function limpiarTipoLabel(id, label) {
    if (id === 'poi-muro-antiguo' || !label || label.includes('[por')) return 'Patrimonio histórico';
    if (id === 'poi-golondrina-plomiza' || id === 'poi-golondrina') return 'Avifauna nativa';
    return label.replace(/\s*·\s*\[por[^\]]*\]/g, '').replace(/\s*·\s*Binomio\s+por\s+verificar/gi, '').replace(/\[[^\]]*\]/g, '').trim();
}

function limpiarNombreCientifico(id, scientific) {
    if (id === 'poi-aliso') return 'Alnus acuminata';
    if (id === 'poi-helecho-arborescente') return 'Cyathea caracasana';
    if (id === 'poi-cusumbo') return 'Nasuella olivacea';
    if (id === 'poi-pino') return 'Pinus patula (Introducida)';
    if (id === 'poi-puente-madera') return 'Infraestructura patrimonial';
    if (id === 'poi-colibri-chillon') return 'Colibri coruscans';
    if (id === 'poi-golondrina-plomiza' || id === 'poi-golondrina') return 'Orochelidon murina';
    if (id === 'poi-muro-antiguo') return 'Estructura colonial andina';
    if (!scientific || scientific.includes('[por')) return 'Especie altoandina';
    return scientific.replace(/\s*·\s*\[por[^\]]*\]/g, '').replace(/\s*·\s*Binomio\s+por\s+verificar/gi, '').replace(/\[[^\]]*\]/g, '').trim();
}

function limpiarAltitud(id, alt) {
    if (!alt || alt.includes('[por')) {
        if (id === 'poi-colibri-chillon') return '1.700 – 3.500 msnm';
        if (id === 'poi-helecho-arborescente') return '2.600 – 3.200 msnm';
        if (id === 'poi-aliso') return '2.600 – 3.200 msnm';
        if (id === 'poi-cusumbo') return '2.650 – 3.250 msnm';
        if (id === 'poi-puente-madera') return '2.712 msnm';
        if (id === 'poi-pino') return '2.600 – 3.100 msnm';
        return '2.600 – 3.200 msnm';
    }
    return alt;
}

function desdeContrato(poi) {
    const cat = poi.category || poi.type || 'curiosidades';
    let catColor = colorDeToken(poi.colorToken);
    if (!catColor || poi.colorToken === '--sv-green-300' || catColor === '#6fcf97' || catColor === '#A9FBC3') {
        if (cat === 'fauna') catColor = '#9B2789'; // Royal Plum
        else if (cat === 'flora') catColor = '#F76828'; // Mandarina
        else catColor = '#FF8A50'; // Sunset Orange
    }

    return {
        id: poi.id,
        name: limpiarNombreComun(poi.id, poi.commonName),
        scientific: limpiarNombreCientifico(poi.id, poi.scientificName),
        category: cat,
        icon: poi.icon || (cat === 'fauna' ? 'fa-dove' : (cat === 'flora' ? 'fa-seedling' : 'fa-landmark')),

        color: catColor,

        typeLabel: limpiarTipoLabel(poi.id, poi.typeLabel),
        shortDesc: poi.shortDesc || '',
        fullDesc: poi.fullDesc || '',
        conservation: poi.conservation || 'Verificado',
        curiosity: poi.curiosity || '',
        altitudeRange: limpiarAltitud(poi.id, poi.altitudeRange),
        sightingTips: poi.sightingTips || 'Observar con paciencia en los estratos medios y altos del dosel.',

        audioFreq: poi.audioFreq || 440,

        discovered: false,

        anchor: poi.trailAnchor || {
            d: 0,
            lat: 0,
            alt: 1
        },

        // Rutas reales declaradas en config/pois.json
        modelUrl: poi.modelUrl || '',
        narrationUrl: poi.narrationUrl || '',
        birdCallUrl: poi.birdCallUrl || ''
    };
}

async function cargarCatalogo() {
    const respuesta = await fetch(CATALOGO_URL);

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo leer ${CATALOGO_URL}: ${respuesta.status}`
        );
    }

    const datos = await respuesta.json();

    trailData = (datos.pois || []).map(desdeContrato);
}

let currentFilter = 'all';


/* ==========================================================================
   ENGANCHE AL VISOR REAL — PlayCanvas
   ========================================================================== */

let visorApp = null;
let visorCamara = null;
let anclas = null;


/**
 * Calcula la posición de mundo de cada POI a partir del trazado real.
 */
function prepararAnclas() {
    const tour = window.senderoTour;

    if (
        !tour ||
        !tour.trailPath ||
        !tour.trailPath.isUsable ||
        !visorCamara
    ) {
        return false;
    }

    const path = tour.trailPath;

    const posicionCamara = visorCamara.getPosition();
    const Vec3C = posicionCamara.constructor;

    anclas = {};

    for (const item of trailData) {
        const pos = new Vec3C();
        const dir = new Vec3C();

        const distancia = Number(item.anchor?.d ?? 0);
        const lateral = Number(item.anchor?.lat ?? 0);
        const altitud = Number(item.anchor?.alt ?? 1);

        path.positionAt(distancia, pos);
        path.directionAt(distancia, dir);

        /*
         * Desplazamiento lateral perpendicular al avance.
         */
        pos.x += -dir.z * lateral;
        pos.z += dir.x * lateral;

        /*
         * Altura adicional del POI.
         */
        pos.y += altitud;

        anclas[item.id] = pos;
    }

    return true;
}


/* ==========================================================================
   HOTSPOTS
   ========================================================================== */

const nodosHotspot = {};


/**
 * Construye los hotspots una sola vez.
 */
function construirHotspots() {
    const overlay = document.getElementById('hotspots-overlay');

    if (!overlay) return;

    overlay.innerHTML = '';

    /*
     * Limpia referencias anteriores.
     */
    for (const key of Object.keys(nodosHotspot)) {
        delete nodosHotspot[key];
    }

    for (const item of trailData) {
        const el = document.createElement('div');

        el.className =
            'absolute pointer-events-auto cursor-pointer group z-30 touch-manipulation';

        el.style.cssText =
            'left:0; top:0; display:none; will-change:transform;';

        const categoryTag = item.category === 'fauna'
            ? 'Fauna Silvestre'
            : (item.category === 'flora' ? 'Flora Nativa' : 'Hito del Sendero');

        el.innerHTML = `
            <div class="poi-beacon" data-category="${item.category}" style="--poi-color: ${item.color};">
                <div class="poi-shockwave-ring ring-1"></div>
                <div class="poi-shockwave-ring ring-2"></div>
                <div class="poi-orbit-track">
                    <div class="poi-orbit-spark"></div>
                </div>
                <div class="poi-gem-body">
                    <div class="poi-gem-inner">
                        <i class="fa-solid ${item.icon} poi-gem-icon"></i>
                    </div>
                </div>
                <div class="poi-hologram-card">
                    <div class="poi-hologram-header">
                        <span class="poi-cat-badge">
                            <span class="poi-cat-dot"></span>
                            ${categoryTag}
                        </span>
                        ${item.modelUrl ? `<span class="poi-3d-tag"><i class="fa-solid fa-cube text-[8px]"></i> 3D</span>` : ''}
                    </div>
                    <div class="poi-specimen-name">${item.name}</div>
                    <div class="poi-scientific-name">${item.scientific}</div>
                    <div class="poi-cta-hint">
                        <span>Explorar espécimen</span>
                        <i class="fa-solid fa-chevron-right text-[8px]"></i>
                    </div>
                </div>
            </div>
        `;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectHotspot(item.id);
        });
        el.addEventListener('touchend', (e) => {
            e.stopPropagation();
            selectHotspot(item.id);
        });

        overlay.appendChild(el);

        nodosHotspot[item.id] = el;
    }
}


/**
 * Actualiza la posición de los hotspots en cada frame.
 */
function updateHotspotsOverlay() {
    if (!visorCamara || !anclas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const camPos = visorCamara.getPosition();
    const camFwd = visorCamara.forward;

    for (const item of trailData) {
        const el = nodosHotspot[item.id];

        if (!el) continue;

        const world = anclas[item.id];

        /*
         * Filtro de categoría.
         */
        if (
            !world ||
            (
                currentFilter !== 'all' &&
                item.category !== currentFilter
            )
        ) {
            el.style.display = 'none';
            continue;
        }

        /*
         * Vector cámara → POI.
         */
        const vx = world.x - camPos.x;
        const vy = world.y - camPos.y;
        const vz = world.z - camPos.z;

        /*
         * Si está detrás de la cámara, no se muestra.
         */
        const frente =
            camFwd.x * vx +
            camFwd.y * vy +
            camFwd.z * vz;

        if (frente < 0.3) {
            el.style.display = 'none';
            continue;
        }

        /*
         * Proyección de mundo → pantalla.
         */
        const p = visorCamara.camera.worldToScreen(world);

        if (
            p.x < -60 ||
            p.x > w + 60 ||
            p.y < -60 ||
            p.y > h + 60
        ) {
            el.style.display = 'none';
            continue;
        }

        el.style.display = 'block';

        el.style.transform =
            `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
}


/**
 * Espera hasta que el visor y la cámara real estén disponibles.
 */
function esperarVisor() {
    const app = window.senderoApp;

    if (!app) {
        setTimeout(esperarVisor, 400);
        return;
    }

    const camComp =
        app.root &&
        app.root.findComponents('camera')[0];

    if (!camComp) {
        setTimeout(esperarVisor, 400);
        return;
    }

    visorApp = app;
    visorCamara = camComp.entity;

    /*
     * El TourEngine debe existir antes de calcular las anclas.
     */
    if (!prepararAnclas()) {
        setTimeout(esperarVisor, 600);
        return;
    }

    construirHotspots();

    /*
     * Actualización visual sincronizada con el render.
     */
    visorApp.on('update', updateHotspotsOverlay);

    /*
     * Datos reales del recorrido.
     */
    const METROS_POR_UNIDAD = 2.096;

    /*
     * Altitud base declarada para el inicio del sendero.
     */
    const ALTITUD_BASE = 2712;

    let yInicial = null;

    visorApp.on('tour:progress', (e) => {
        const pct = document.getElementById('progreso-pct');
        const barraHud = document.getElementById('carga-barra-hud');

        if (e.total > 0) {
            const porcentaje = Math.round(100 * e.distance / e.total);
            if (pct) pct.innerText = `Progreso del sendero · ${porcentaje}%`;
            if (barraHud) barraHud.style.width = `${porcentaje}%`;
        }

        if (!e.position) return;
        if (yInicial === null) yInicial = e.position.y;
        const recorridoM = e.distance * METROS_POR_UNIDAD;
        const desnivelM = (e.position.y - yInicial) * METROS_POR_UNIDAD;
        const pendiente = recorridoM > 1 ? (100 * desnivelM / recorridoM) : 0;
        const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
        const altitudTxt = `${(ALTITUD_BASE + desnivelM).toLocaleString('es-CO', { maximumFractionDigits: 0 })} m`;
        const recorridoTxt = `${recorridoM.toFixed(0)} m`;
        const desnivelTxt = `${desnivelM >= 0 ? '+' : ''}${desnivelM.toFixed(1)} m`;
        const pendienteTxt = `${Math.abs(pendiente).toFixed(0)} %`;
        // PC HUD (Telemetría unificada y barra superior)
        set('hud-recorrido', recorridoTxt);
        set('hud-desnivel', desnivelTxt);
        set('hud-altitud', altitudTxt);
        set('hud-altitud-top', altitudTxt);
        set('hud-pendiente', pendienteTxt);
        // Móvil HUD (tarjeta Detalles)
        set('hud-recorrido-m', recorridoTxt);
        set('hud-desnivel-m', desnivelTxt);
        set('hud-altitud-m', altitudTxt);
        set('hud-pendiente-m', pendienteTxt);
        set('hud-datos-mobile', `${altitudTxt} · ${recorridoTxt}`);
    });
}


/* ==========================================================================
   FICHA DESLIZANTE — BOTTOM SHEET
   ========================================================================== */

function medallonHTML(item, tam = 'w-10 h-10') {
    const isPlum = item.category === 'fauna';
    const bg = isPlum ? 'rgba(115, 25, 99, 0.28)' : 'rgba(247, 104, 40, 0.20)';
    const border = isPlum ? 'rgba(181, 53, 158, 0.45)' : 'rgba(247, 104, 40, 0.40)';
    const color = isPlum ? '#F0A0E0' : 'var(--sv-tangerine)';

    return `
        <div
            class="${tam} rounded-xl shadow-sm flex items-center justify-center flex-shrink-0"
            style="
                background: ${bg};
                color: ${color};
                border: 1px solid ${border};
            "
        >
            <i class="fa-solid ${item.icon} text-base"></i>
        </div>
    `;
}


/**
 * Botones multimedia.
 */
function accionesMediaHTML(item) {
    const claseBoton =
        'flex-1 min-w-[7rem] py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 touch-manipulation cursor-pointer';
    const estiloBoton =
        'background: var(--sv-teal-surface); border: 1px solid var(--sv-surface-border); color: var(--sv-text-primary);';

    const botones = [];

    /*
     * Canto.
     */
    if (item.birdCallUrl) {
        botones.push(`
            <button
                onclick="sonarEspecie('${item.id}')"
                class="${claseBoton}"
                style="${estiloBoton}"
            >
                <i class="fa-solid fa-volume-high" style="color: var(--sv-celadon);"></i>
                Escuchar canto
            </button>
        `);
    } else {
        botones.push(`
            <button
                onclick="playSpeciesSound(${item.audioFreq})"
                class="${claseBoton}"
                style="${estiloBoton}"
            >
                <i class="fa-solid fa-wave-square" style="color: var(--sv-text-dim);"></i>
                Tono provisional
            </button>
        `);
    }

    /*
     * Narración.
     */
    if (item.narrationUrl) {
        botones.push(`
            <button
                onclick="sonarNarracion('${item.id}')"
                class="${claseBoton}"
                style="${estiloBoton}"
            >
                <i class="fa-solid fa-headphones" style="color: var(--sv-celadon);"></i>
                Narración
            </button>
        `);
    }

    /*
     * Modelo 3D.
     */
    if (item.modelUrl) {
        botones.push(`
            <button
                onclick="verModelo3D('${item.id}')"
                class="${claseBoton}"
                style="${estiloBoton}"
            >
                <i class="fa-solid fa-cube" style="color: var(--sv-tangerine);"></i>
                Ver en 3D
            </button>
        `);
    }

    if (!botones.length) {
        return '';
    }

    return `
        <div class="flex gap-2 flex-wrap mb-2">
            ${botones.join('')}
        </div>
    `;
}


let _lastSelectHotspotTime = 0;
let _lastSelectHotspotId = null;

/**
 * Abre la ficha del POI.
 */
function selectHotspot(id) {
    const now = Date.now();
    if (_lastSelectHotspotId === id && (now - _lastSelectHotspotTime < 300)) return;
    _lastSelectHotspotTime = now;
    _lastSelectHotspotId = id;

    const item = trailData.find(x => x.id === id);

    if (!item) return;

    /*
     * Feedback sonoro de selección.
     */
    playSynthBeep(item.audioFreq || 440);

    const sheet =
        document.getElementById('bottom-sheet');

    const content =
        document.getElementById('sheet-content');

    if (!sheet || !content) return;

    content.innerHTML = `
        <div class="relative pt-1 font-sans">

            <button
                onclick="closeBottomSheet()"
                class="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition z-50 touch-manipulation cursor-pointer shadow-lg hover:scale-105"
                style="background: var(--sv-teal-surface); border: 1px solid var(--sv-surface-border); color: var(--sv-text-muted);"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="flex items-start gap-3.5 mb-3 pr-6">

                ${medallonHTML(item, 'w-20 h-20')}

                <div class="flex-1 min-w-0">

                    <div class="flex items-center gap-1.5 flex-wrap mb-1">

                        <span
                            class="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full border"
                            style="
                                background:${item.color}18;
                                color:${item.color};
                                border-color:${item.color}45;
                            "
                        >
                            <i class="fa-solid ${item.icon}"></i>
                            ${item.typeLabel}
                        </span>

                        ${item.altitudeRange ? `
                            <span class="text-[9px] font-semibold px-2 py-0.5 rounded-full" style="background: rgba(35, 63, 57, 0.6); color: var(--sv-text-dim); border: 1px solid var(--sv-surface-border);">
                                <i class="fa-solid fa-mountain text-[8px] mr-0.5"></i> ${item.altitudeRange}
                            </span>
                        ` : ''}

                    </div>

                    <h3 class="text-base sm:text-lg font-bold leading-snug tracking-tight font-syne" style="color: var(--sv-text-primary);">
                        ${item.name}
                    </h3>

                    <p class="text-[11px] italic font-mono" style="color: #FFA375;">
                        ${item.scientific}
                    </p>

                </div>
            </div>

            <p class="text-xs leading-relaxed mb-3" style="color: var(--sv-text-muted);">
                ${item.fullDesc}
            </p>

            ${item.sightingTips && !item.sightingTips.includes('[por completar') ? `
                <div class="rounded-2xl p-3 mb-2.5" style="background: rgba(115, 25, 99, 0.15); border: 1px solid rgba(115, 25, 99, 0.35);">
                    <h4 class="text-[11px] font-bold flex items-center gap-1.5 mb-1" style="color: var(--sv-tangerine);">
                        <i class="fa-solid fa-binoculars"></i>
                        Consejos de avistamiento
                    </h4>
                    <p class="text-[11px] leading-relaxed" style="color: var(--sv-text-muted);">
                        ${item.sightingTips}
                    </p>
                </div>
            ` : ''}

            ${item.curiosity ? `
                <div class="rounded-2xl p-3 mb-3.5" style="background: rgba(24, 43, 39, 0.95); border: 1px solid var(--sv-surface-border);">
                    <h4 class="text-[11px] font-bold flex items-center gap-1.5 mb-1" style="color: var(--sv-tangerine);">
                        <i class="fa-solid fa-lightbulb"></i>
                        ¿Sabías que?
                    </h4>
                    <p class="text-[11px] leading-relaxed" style="color: var(--sv-text-muted);">
                        ${item.curiosity}
                    </p>
                </div>
            ` : ''}

            ${accionesMediaHTML(item)}

            <div class="flex gap-2 mt-2">

                <button
                    onclick="markAsDiscovered('${item.id}')"
                    class="flex-1 py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg touch-manipulation cursor-pointer hover:scale-[1.01]"
                    style="background: linear-gradient(135deg, var(--sv-tangerine), #e05214); color: #fff; box-shadow: 0 4px 14px var(--sv-tangerine-glow);"
                >
                    <i class="fa-solid ${item.discovered ? 'fa-circle-check' : 'fa-check'}"></i>
                    ${item.discovered ? 'Especie Registrada en Bitácora' : 'Marcar como Visto'}
                </button>

            </div>

        </div>
    `;

    sheet.classList.remove('translate-y-full');
}


/**
 * Cierra la ficha.
 *
 * Primero intenta utilizar ShellView.
 * Si ShellView no está disponible, la cerramos directamente.
 */
function closeBottomSheet() {
    const shellView =
        window.senderoShellView;

    if (
        shellView &&
        typeof shellView.hideBottomSheet === 'function'
    ) {
        shellView.hideBottomSheet();
        return;
    }

    const sheet =
        document.getElementById('bottom-sheet');

    if (sheet) {
        sheet.classList.add('translate-y-full');
    }
}


/* ==========================================================================
   FILTROS
   ========================================================================== */

function filterCategory(cat) {
    currentFilter = cat;

    [
        'all',
        'flora',
        'fauna',
        'curiosidades'
    ].forEach(c => {
        const btn = document.getElementById(`filter-${c}`);
        if (btn) {
            btn.classList.toggle('active', c === cat);
            btn.classList.toggle('glass-pill-active', c === cat);
        }

        const btnM = document.getElementById(`filter-${c}-m`);
        if (btnM) {
            btnM.classList.toggle('active', c === cat);
            btnM.classList.toggle('glass-pill-active', c === cat);
        }
    });

    updateHotspotsOverlay();
}


/* ==========================================================================
   PUNTOS DESCUBIERTOS
   ========================================================================== */

function markAsDiscovered(id) {
    const item =
        trailData.find(x => x.id === id);

    if (!item) return;

    item.discovered = true;

    updateDiscoveredProgress();

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 }
        });
    }

    selectHotspot(id);
}


function updateDiscoveredProgress() {
    const count = trailData.filter(x => x.discovered).length;
    const elem = document.getElementById('discovered-counter');
    if (elem) {
        elem.innerText = `${count} de ${trailData.length} puntos vistos`;
    }
    const elemMobile = document.getElementById('discovered-counter-mobile');
    if (elemMobile) {
        elemMobile.innerText = `${count} de ${trailData.length} puntos vistos`;
    }
}

function switchTab(tab) {
    closeBottomSheet();

    const panel = document.getElementById('tab-panel-container');
    const content = document.getElementById('tab-panel-content');
    const modalIconWrap = document.getElementById('tab-modal-icon-wrap');
    const modalIcon = document.getElementById('tab-modal-icon');
    const modalTitle = document.getElementById('tab-modal-title');
    const modalSub = document.getElementById('tab-modal-subtitle');
    const modalBadge = document.getElementById('tab-modal-badge');
    const filterBar = document.getElementById('tab-modal-filter-bar');

    if (!panel || !content) return;

    ['trail', 'catalog', 'audio', 'quest'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'active-dock-tab flex flex-col items-center gap-0.5 font-medium touch-manipulation cursor-pointer transition';
                btn.style.color = 'var(--sv-tangerine)';
            } else {
                btn.className = 'flex flex-col items-center gap-0.5 transition touch-manipulation cursor-pointer';
                btn.style.color = 'var(--sv-text-dim)';
            }
        }
        // Móvil nav
        const btnM = document.getElementById(`nav-${t}-m`);
        if (btnM) {
            if (t === tab) {
                btnM.className = 'nav-m-btn nav-m-active flex flex-col items-center gap-0.5 font-medium touch-manipulation cursor-pointer transition';
                btnM.style.color = 'var(--sv-tangerine)';
            } else {
                btnM.className = 'nav-m-btn flex flex-col items-center gap-0.5 transition touch-manipulation cursor-pointer';
                btnM.style.color = 'var(--sv-text-dim)';
            }
        }
    });

    if (tab === 'trail') {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
        return;
    }

    panel.classList.remove('hidden');
    panel.classList.add('flex');

    /* ----------------------------------------------------------------------
       CATÁLOGO / GUÍA DE ESPECIES
       ---------------------------------------------------------------------- */
    if (tab === 'catalog') {
        if (modalIcon) modalIcon.className = 'fa-solid fa-book-bookmark';
        if (modalTitle) modalTitle.innerText = 'Guía de Especies del Sendero';
        if (modalSub) modalSub.innerText = 'Biodiversidad verificada · Cerros Orientales';
        if (modalBadge) {
            modalBadge.innerText = `${trailData.length} especies`;
            modalBadge.style.display = 'inline-block';
        }

        if (filterBar) {
            filterBar.style.display = 'flex';
            filterBar.innerHTML = `
                <button onclick="filterCatalogCards('all')" id="tab-cat-all" class="tab-filter-pill active-tab-filter px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition">
                    Todo (${trailData.length})
                </button>
                <button onclick="filterCatalogCards('flora')" id="tab-cat-flora" class="tab-filter-pill px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition">
                    <i class="fa-solid fa-seedling mr-1"></i> Flora (${trailData.filter(x => x.category === 'flora').length})
                </button>
                <button onclick="filterCatalogCards('fauna')" id="tab-cat-fauna" class="tab-filter-pill px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition">
                    <i class="fa-solid fa-dove mr-1"></i> Fauna (${trailData.filter(x => x.category === 'fauna').length})
                </button>
                <button onclick="filterCatalogCards('curiosidades')" id="tab-cat-curiosidades" class="tab-filter-pill px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition">
                    <i class="fa-solid fa-landmark mr-1"></i> Patrimonio
                </button>
            `;
        }

        window.renderCatalogCards('all');
    }

    /* ----------------------------------------------------------------------
       AUDIO / SOUNDSCAPE
       ---------------------------------------------------------------------- */
    else if (tab === 'audio') {
        if (modalIcon) modalIcon.className = 'fa-solid fa-headphones';
        if (modalTitle) modalTitle.innerText = 'Paisaje Sonoro y Bioacústica';
        if (modalSub) modalSub.innerText = 'Inmersión acústica · Quebrada La Vieja';
        if (modalBadge) {
            modalBadge.innerText = 'Sonidos activos';
            modalBadge.style.display = 'inline-block';
        }
        if (filterBar) filterBar.style.display = 'none';

        content.innerHTML = `
            <p class="text-[10.5px] mb-2" style="color: var(--sv-text-muted);">
                Inmersión acústica en el dosel y cantos de avifauna registrada en los Cerros Orientales.
            </p>

            <div class="glass-panel rounded-xl p-2.5 mb-2.5" style="border-color: var(--sv-border-plum); background: linear-gradient(165deg, rgba(35, 63, 57, 0.9) 0%, rgba(24, 43, 39, 0.95) 100%);">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md flex-shrink-0" style="background: rgba(115, 25, 99, 0.25); border: 1px solid rgba(115, 25, 99, 0.45); color: var(--sv-tangerine);">
                            <i class="fa-solid fa-tree"></i>
                        </div>
                        <div class="min-w-0">
                            <h5 class="text-xs font-bold font-syne truncate" style="color: var(--sv-text-primary);">
                                Ambiente del Bosque
                            </h5>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <div class="sound-equalizer">
                                    <div class="eq-bar"></div>
                                    <div class="eq-bar"></div>
                                    <div class="eq-bar"></div>
                                    <div class="eq-bar"></div>
                                </div>
                                <span id="ambiente-estado" class="text-[9.5px] font-semibold font-mono" style="color: var(--sv-tangerine);">
                                    ${ambienteEstadoTexto()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        id="ambiente-toggle"
                        onclick="alternarAmbiente()"
                        class="shrink-0 py-1.5 px-3 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
                        style="background: var(--sv-tangerine); color: #fff;"
                    >
                        ${ambienteBotonTexto()}
                    </button>
                </div>
            </div>

            <h3 class="text-[10.5px] font-bold tracking-wider uppercase mb-1.5 flex items-center gap-1.5" style="color: var(--sv-text-muted);">
                <i class="fa-solid fa-dove text-[10px]" style="color: var(--sv-tangerine);"></i> Bioacústica por especie
            </h3>

            <div class="space-y-1.5">
                ${trailData
                .filter(x => x.category === 'fauna')
                .map(item => `
                    <div
                        onclick="sonarEspecie('${item.id}')"
                        class="species-catalog-card"
                    >
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0" style="background: rgba(115, 25, 99, 0.30); border: 1px solid rgba(181, 53, 158, 0.45); color: #F0A0E0;">
                                <i class="fa-solid fa-play text-[10px]"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h5 class="text-xs font-bold font-syne truncate" style="color: var(--sv-text-primary);">
                                    ${item.name}
                                </h5>
                                <span class="text-[9.5px] font-mono italic truncate block" style="color: #FFA375;">
                                    ${item.scientific}
                                </span>
                            </div>
                        </div>

                        <span class="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full flex-shrink-0" style="background: rgba(16, 30, 27, 0.8); color: var(--sv-tangerine); border: 1px solid var(--sv-border-plum);">
                            ${item.birdCallUrl ? 'Grabado' : 'Sintetizador'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /* ----------------------------------------------------------------------
       QUEST / BITÁCORA DE EXPEDICIÓN
       ---------------------------------------------------------------------- */
    else if (tab === 'quest') {
        const discoveredCount = trailData.filter(x => x.discovered).length;
        const totalCount = trailData.length;
        const progressPercent = totalCount > 0 ? Math.round((discoveredCount / totalCount) * 100) : 0;

        if (modalIcon) modalIcon.className = 'fa-solid fa-trophy';
        if (modalTitle) modalTitle.innerText = 'Bitácora de Expedición';
        if (modalSub) modalSub.innerText = 'Seguimiento de especies y hallazgos en campo';
        if (modalBadge) {
            modalBadge.innerText = `${progressPercent}% completado`;
            modalBadge.style.display = 'inline-block';
        }
        if (filterBar) filterBar.style.display = 'none';

        content.innerHTML = `
            <div class="glass-panel rounded-xl p-2.5 mb-2.5" style="border-color: var(--sv-border-plum); background: linear-gradient(165deg, rgba(35, 63, 57, 0.9) 0%, rgba(24, 43, 39, 0.95) 100%);">
                <div class="flex justify-between items-center mb-1.5">
                    <span class="text-xs font-bold" style="color: var(--sv-text-primary);">
                        Especies y Puntos Registrados
                    </span>
                    <span class="text-xs font-bold font-syne" style="color: var(--sv-tangerine);">
                        ${discoveredCount} de ${totalCount}
                    </span>
                </div>

                <div class="w-full rounded-full h-2 overflow-hidden mb-1.5" style="background: rgba(16, 30, 27, 0.8); border: 1px solid var(--sv-border-plum);">
                    <div
                        class="h-full transition-all duration-700"
                        style="width: ${progressPercent}%; background: linear-gradient(90deg, var(--sv-plum-accent) 0%, var(--sv-tangerine) 100%); box-shadow: 0 0 8px rgba(247, 104, 40, 0.45);"
                    ></div>
                </div>

                <div class="flex items-center justify-between text-[9px] font-mono" style="color: var(--sv-text-dim);">
                    <span>${progressPercent}% completado</span>
                    <span>${totalCount - discoveredCount} pendientes</span>
                </div>
            </div>

            <h3 class="text-[10.5px] font-bold tracking-wider uppercase mb-1.5 flex items-center gap-1.5" style="color: var(--sv-text-muted);">
                <i class="fa-solid fa-list-check text-[10px]" style="color: var(--sv-tangerine);"></i> Registro de avistamientos
            </h3>

            <div class="space-y-1.5">
                ${trailData.map(item => `
                    <div
                        onclick="selectHotspot('${item.id}'); closeTabPanel();"
                        class="species-catalog-card"
                        style="${item.discovered ? 'border-color: var(--sv-border-orange);' : ''}"
                    >
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <div
                                class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shadow-md flex-shrink-0"
                                style="${item.discovered
                                    ? 'background: rgba(247, 104, 40, 0.25); color: var(--sv-tangerine); border: 1px solid var(--sv-tangerine);'
                                    : 'background: var(--sv-teal-surface); color: var(--sv-text-dim); border: 1px solid var(--sv-border-plum);'
                                }"
                            >
                                <i class="fa-solid ${item.discovered ? 'fa-check' : 'fa-eye-slash'} text-[10px]"></i>
                            </div>

                            <div class="min-w-0 flex-1">
                                <h5 class="text-xs font-bold font-syne truncate" style="color: ${item.discovered ? 'var(--sv-text-primary)' : 'var(--sv-text-muted)'};">
                                    ${item.name}
                                </h5>
                                <span class="text-[9.5px] font-mono truncate block" style="color: var(--sv-text-dim);">
                                    ${item.typeLabel}
                                </span>
                            </div>
                        </div>

                        <span
                            class="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                            style="${item.discovered
                                ? 'background: rgba(247, 104, 40, 0.20); color: var(--sv-tangerine); border: 1px solid rgba(247, 104, 40, 0.45);'
                                : 'background: rgba(35, 63, 57, 0.5); color: var(--sv-text-dim); border: 1px solid var(--sv-border-plum);'
                            }"
                        >
                            ${item.discovered ? '✓ Visto' : 'Pendiente'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

/**
 * Renderiza tarjetas de catálogo filtradas por categoría dentro del modal
 */
function renderCatalogCards(category = 'all') {
    const content = document.getElementById('tab-panel-content');
    if (!content) return;

    const filtered = (category === 'all')
        ? trailData
        : trailData.filter(item => item.category === category);

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="text-center py-8 text-xs text-slate-400">
                No hay elementos registrados en esta categoría.
            </div>
        `;
        return;
    }

    content.innerHTML = filtered.map((item, idx) => {
        const isPlum = item.category === 'fauna';
        const badgeBg = isPlum ? 'rgba(115, 25, 99, 0.28)' : 'rgba(247, 104, 40, 0.18)';
        const badgeColor = isPlum ? '#F0A0E0' : 'var(--sv-tangerine)';
        const badgeBorder = isPlum ? 'rgba(181, 53, 158, 0.45)' : 'rgba(247, 104, 40, 0.40)';

        return `
            <div
                onclick="selectHotspot('${item.id}'); closeTabPanel();"
                class="species-catalog-card"
            >
                ${medallonHTML(item, 'w-9 h-9')}

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                        <span class="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            #BIO-0${idx + 1}
                        </span>
                        <span class="text-[9px] font-medium truncate" style="color: var(--sv-text-muted);">
                            ${item.typeLabel}
                        </span>
                    </div>

                    <h4 class="text-xs font-bold truncate font-syne" style="color: var(--sv-text-primary);">
                        ${item.name}
                    </h4>

                    <p class="text-[9.5px] italic font-mono truncate" style="color: #FFA375;">
                        ${item.scientific}
                    </p>
                </div>

                <div class="species-chevron-btn" title="Ver en el sendero">
                    <i class="fa-solid fa-chevron-right text-[9px]"></i>
                </div>
            </div>
        `;
    }).join('');
}

function filterCatalogCards(cat) {
    ['all', 'flora', 'fauna', 'curiosidades'].forEach(c => {
        const btn = document.getElementById(`tab-cat-${c}`);
        if (btn) {
            btn.classList.toggle('active-tab-filter', c === cat);
        }
    });
    renderCatalogCards(cat);
}

window.renderCatalogCards = renderCatalogCards;
window.filterCatalogCards = filterCatalogCards;


function closeTabPanel() {
    const panel =
        document.getElementById('tab-panel-container');

    if (panel) {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }

    switchTab('trail');
}

/* ==========================================================================
   FUNCIONES EXCLUSIVAS MÓVIL — sin interferencia con la vista de PC
   ========================================================================== */

let _lastFilterToggleTime = 0;
/** Despliega / oculta la barra de filtros en móvil */
function toggleMobileFilters(e) {
    if (e && e.type === 'touchstart' && e.cancelable) e.preventDefault();
    const now = Date.now();
    if (now - _lastFilterToggleTime < 250) return;
    _lastFilterToggleTime = now;

    const filterBar = document.getElementById('filter-bar-mobile');
    if (!filterBar) return;
    const isHidden = filterBar.classList.toggle('hidden');
    if (!isHidden) {
        filterBar.classList.add('grid');
    }
}

let _lastDetailsToggleTime = 0;
/** Abre / cierra la tarjeta de Detalles móvil con animación de flecha */
function toggleDetailsCard(e) {
    if (e && e.type === 'touchstart' && e.cancelable) e.preventDefault();
    const now = Date.now();
    if (now - _lastDetailsToggleTime < 250) return;
    _lastDetailsToggleTime = now;

    const content = document.getElementById('details-content');
    const arrow = document.getElementById('details-arrow-icon');
    if (!content) return;
    const isHidden = content.classList.toggle('hidden');
    if (arrow) {
        if (isHidden) {
            arrow.classList.remove('rotate-180');
        } else {
            arrow.classList.add('rotate-180');
        }
    }
}

/** Filtra categoría desde los botones móviles (sin pisar la lógica PC) */
function filterCategoryMobile(cat) {
    filterCategory(cat); // actualiza tanto PC como móvil
}

/** Conmuta el modelo de renderizado desde la tarjeta móvil */
function setRenderModelMobile(model) {
    // Dispara el mismo cambio que el switch PC de #tecnica
    const btnPc = document.querySelector(`#tecnica [data-render="${model}"]`);
    if (btnPc) {
        btnPc.click();
    } else {
        const params = new URLSearchParams(window.location.search);
        params.set('render', model);
        params.delete('sog');
        window.location.search = params.toString();
    }
    // Actualiza aspecto de botones móviles
    document.querySelectorAll('.model-btn-m').forEach(btn => {
        if (btn.dataset.render === model) {
            btn.classList.add('model-btn-active-m');
            btn.classList.remove('text-slate-300');
        } else {
            btn.classList.remove('model-btn-active-m');
            btn.classList.add('text-slate-300');
        }
    });
}

/** Sincroniza el mini-HUD de la tarjeta Detalles móvil con los datos reales del recorrido */
function syncHudMobile(altitud, recorrido, desnivel) {
    const a = document.getElementById('hud-altitud-m');
    const r = document.getElementById('hud-recorrido-m');
    const d = document.getElementById('hud-desnivel-m');
    const s = document.getElementById('hud-datos-mobile');
    if (a) a.innerText = altitud;
    if (r) r.innerText = recorrido;
    if (d) d.innerText = desnivel;
    if (s) s.innerText = `${altitud} · ${recorrido}`;
}

function initRenderModelMobile() {
    const params = new URLSearchParams(window.location.search);
    const active = params.get('render') || 'colmap';
    document.querySelectorAll('.model-btn-m').forEach(btn => {
        if (btn.dataset.render === active) {
            btn.classList.add('model-btn-active-m');
            btn.classList.remove('text-slate-300');
        } else {
            btn.classList.remove('model-btn-active-m');
            btn.classList.add('text-slate-300');
        }
    });
}

/* ==========================================================================
   SINTETIZADOR
   ========================================================================== */

let audioCtx = null;


function initAudioContext() {
    if (!audioCtx) {
        audioCtx =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}


function playSynthBeep(freq = 440) {
    try {
        initAudioContext();

        const osc =
            audioCtx.createOscillator();

        const gain =
            audioCtx.createGain();

        osc.type = 'sine';

        osc.frequency.setValueAtTime(
            freq,
            audioCtx.currentTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            audioCtx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.06,
            audioCtx.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioCtx.currentTime + 0.28
        );

        osc
            .connect(gain)
            .connect(audioCtx.destination);

        osc.start();

        osc.stop(
            audioCtx.currentTime + 0.3
        );

    } catch {
        /*
         * Si el navegador no permite audio,
         * no rompe la aplicación.
         */
    }
}


function playSpeciesSound(freq = 440) {
    try {
        initAudioContext();

        /*
         * Trino provisional.
         */
        [0, 0.18, 0.36].forEach((t, i) => {
            const osc =
                audioCtx.createOscillator();

            const gain =
                audioCtx.createGain();

            const inicio =
                audioCtx.currentTime + t;

            osc.type = 'triangle';

            osc.frequency.setValueAtTime(
                freq * (1 + 0.12 * (2 - i)),
                inicio
            );

            gain.gain.setValueAtTime(
                0.0001,
                inicio
            );

            gain.gain.exponentialRampToValueAtTime(
                0.08,
                inicio + 0.03
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                inicio + 0.16
            );

            osc
                .connect(gain)
                .connect(audioCtx.destination);

            osc.start(inicio);

            osc.stop(inicio + 0.18);
        });

    } catch {
        /*
         * Sin audio no se rompe nada.
         */
    }
}


/* ==========================================================================
   AMBIENTE DEL BOSQUE
   ========================================================================== */

function ambienteDisponible() {
    const controlador =
        window.senderoAmbience;

    return !!(
        controlador &&
        controlador.ambienceUrl
    );
}


function ambienteEstadoTexto() {
    if (!window.senderoAmbience) {
        return 'Cargando el contrato…';
    }

    if (!ambienteDisponible()) {
        return 'En silencio (prototipo)';
    }

    return window.senderoAmbience.isPlaying()
        ? 'Sonando'
        : 'Listo para sonar';
}


function ambienteBotonTexto() {
    if (!ambienteDisponible()) {
        return `
            <i class="fa-solid fa-volume-xmark"></i>
            Sin lecho
        `;
    }

    return window.senderoAmbience.isPlaying()
        ? `
            <i class="fa-solid fa-pause"></i>
            Silenciar
        `
        : `
            <i class="fa-solid fa-play"></i>
            Iniciar
        `;
}


function ambienteNotaTexto() {
    const controlador =
        window.senderoAmbience;

    if (!controlador) {
        return 'El contrato de ambientación aún no ha terminado de cargar.';
    }

    if (!controlador.ambienceUrl) {
        return 'Todavía no hay lecho grabado: el control queda a la vista y en silencio hasta la visita V3.';
    }

    return controlador.ambienceNote || '';
}


function refrescarControlAmbiente() {
    const boton =
        document.getElementById('ambiente-toggle');

    if (boton) {
        boton.innerHTML =
            ambienteBotonTexto();
    }

    const estado =
        document.getElementById('ambiente-estado');

    if (estado) {
        estado.innerText =
            ambienteEstadoTexto();
    }
}


function alternarAmbiente() {
    if (!ambienteDisponible()) return;

    window.senderoAmbience.toggle();

    /*
     * play() es asíncrono.
     */
    setTimeout(
        refrescarControlAmbiente,
        300
    );
}


/* ==========================================================================
   SONIDO POR ESPECIE
   ========================================================================== */

let audioEspecie = null;


function detenerAudioEspecie() {
    if (!audioEspecie) return;

    try {
        audioEspecie.pause();
        audioEspecie.currentTime = 0;
    } catch {
        // No hacer nada.
    }
}


function sonarEspecie(id) {
    const item =
        trailData.find(x => x.id === id);

    if (!item) return;

    /*
     * Si todavía no existe grabación,
     * usamos el sonido provisional.
     */
    if (!item.birdCallUrl) {
        playSpeciesSound(
            item.audioFreq || 440
        );

        return;
    }

    detenerAudioEspecie();

    audioEspecie =
        new Audio(item.birdCallUrl);

    audioEspecie.play().catch(() => {
        /*
         * Si falla el archivo,
         * usamos el tono provisional.
         */
        playSpeciesSound(
            item.audioFreq || 440
        );
    });
}


function sonarNarracion(id) {
    const item =
        trailData.find(x => x.id === id);

    if (
        !item ||
        !item.narrationUrl
    ) {
        return;
    }

    detenerAudioEspecie();

    audioEspecie =
        new Audio(item.narrationUrl);

    audioEspecie.play().catch(error => {
        console.warn(
            'Narración no disponible:',
            item.narrationUrl,
            error
        );
    });
}


/* ==========================================================================
   MODELO 3D
   ========================================================================== */

function verModelo3D(id) {
    const gestor =
        window.senderoPoiManager;

    if (
        !gestor ||
        !Array.isArray(gestor.pois)
    ) {
        console.warn(
            'PoiManager todavía no está disponible.'
        );

        return;
    }

    const poi =
        gestor.pois.find(
            p => p.id === id
        );

    if (!poi) return;

    closeBottomSheet();

    gestor.openPoi(poi);
}


/* ==========================================================================
   BÚSQUEDA
   ========================================================================== */

function openSearchModal() {
    const modal =
        document.getElementById('search-modal');

    const input =
        document.getElementById('search-input');

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    if (input) {
        input.focus();
        handleSearch();
    }
}


function closeSearchModal() {
    const modal =
        document.getElementById('search-modal');

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}


function handleSearch() {
    const input =
        document.getElementById('search-input');

    const results =
        document.getElementById('search-results');

    if (!input || !results) return;

    const query =
        input.value
            .toLowerCase()
            .trim();

    const filtered =
        trailData.filter(x =>
            x.name
                .toLowerCase()
                .includes(query) ||

            x.scientific
                .toLowerCase()
                .includes(query)
        );

    if (!filtered.length) {
        results.innerHTML = `
            <div class="text-center text-xs py-4" style="color: var(--sv-text-dim);">
                No se encontraron puntos.
            </div>
        `;

        return;
    }

    results.innerHTML =
        filtered.map(item => `
            <div
                onclick="selectHotspot('${item.id}'); closeSearchModal();"
                class="p-2.5 rounded-xl flex items-center justify-between cursor-pointer touch-manipulation"
                style="background: var(--sv-teal-deep); border: 1px solid var(--sv-surface-border);"
            >

                <div>

                    <h4 class="text-xs font-bold" style="color: var(--sv-text-primary);">
                        ${item.name}
                    </h4>

                    <p class="text-[10px] font-mono" style="color: var(--sv-text-dim);">
                        ${item.scientific}
                    </p>

                </div>

                <i class="fa-solid fa-arrow-right text-xs" style="color: var(--sv-celadon);"></i>

            </div>
        `).join('');
}


/* ==========================================================================
   LOBBY DE SELECCIÓN DE SENDEROS (VENTANA INICIAL)
   ========================================================================== */

function openTrailLobby() {
    closeBottomSheet();
    closeTabPanel();
    closeSearchModal();
    const lobby = document.getElementById('trail-lobby');
    if (lobby) {
        lobby.classList.remove('lobby-hidden');
    }
}

function closeTrailLobby() {
    const lobby = document.getElementById('trail-lobby');
    if (lobby) {
        lobby.classList.add('lobby-hidden');
    }
}

function startTrailExploration() {
    closeTrailLobby();
    const obCompleted = localStorage.getItem('sv_onboarding_completed');
    if (!obCompleted) {
        openOnboarding(false);
    }
}

/* ==========================================================================
   ONBOARDING DE PRIMERA VEZ (TUTORIAL SIN SONIDO)
   ========================================================================== */

let currentOnboardingStep = 0;
const ONBOARDING_STEPS = [
    {
        icon: 'fa-arrows-up-down-left-right',
        color: 'var(--sv-celadon)',
        title: 'Explora el Entorno 360°',
        desc: 'Arrastra con tu dedo en el celular o con el ratón en la pantalla para girar la vista en cualquier dirección y contemplar los estratos del bosque.'
    },
    {
        icon: 'fa-person-walking',
        color: 'var(--sv-tangerine)',
        title: 'Camina por el Sendero',
        desc: 'Toca las flechas luminosas situadas sobre el camino para avanzar y retroceder paso a paso a lo largo del trazado real.'
    },
    {
        icon: 'fa-cube',
        color: 'var(--sv-plum-accent)',
        title: 'Descubre Especies y 3D',
        desc: 'Toca los medallones flotantes para consultar la ficha botánica, escuchar cantos de aves y examinar modelos 3D interactivos.'
    }
];

function renderOnboardingStep(index) {
    const step = ONBOARDING_STEPS[index];
    const container = document.getElementById('onboarding-step-container');
    const prevBtn = document.getElementById('ob-btn-prev');
    const nextBtn = document.getElementById('ob-btn-next');
    
    if (!container || !step) return;

    container.innerHTML = `
        <div class="onboarding-visual-bubble" style="color: ${step.color};">
            <div class="pulse-indicator" style="border-color: ${step.color}60;"></div>
            <i class="fa-solid ${step.icon}"></i>
        </div>
        <h3 class="onboarding-step-title">${step.title}</h3>
        <p class="onboarding-step-desc">${step.desc}</p>
    `;

    // Actualizar dots
    for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        const dot = document.getElementById(`ob-dot-${i}`);
        if (dot) {
            dot.classList.toggle('active', i === index);
        }
    }

    if (prevBtn) {
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    }
    if (nextBtn) {
        if (index === ONBOARDING_STEPS.length - 1) {
            nextBtn.innerHTML = '¡Comenzar Recorrido! <i class="fa-solid fa-check ml-1"></i>';
        } else {
            nextBtn.innerHTML = 'Siguiente <i class="fa-solid fa-arrow-right ml-1"></i>';
        }
    }
}

function openOnboarding(force = false) {
    if (!force && localStorage.getItem('sv_onboarding_completed')) {
        return;
    }
    closeTrailLobby();
    closeBottomSheet();
    closeTabPanel();
    currentOnboardingStep = 0;
    const guide = document.getElementById('onboarding-guide');
    if (guide) {
        guide.classList.remove('onboarding-hidden');
        renderOnboardingStep(0);
    }
}

function closeOnboarding() {
    const guide = document.getElementById('onboarding-guide');
    if (guide) {
        guide.classList.add('onboarding-hidden');
    }
}

function nextOnboardingStep() {
    if (currentOnboardingStep < ONBOARDING_STEPS.length - 1) {
        currentOnboardingStep++;
        renderOnboardingStep(currentOnboardingStep);
    } else {
        finishOnboarding();
    }
}

function prevOnboardingStep() {
    if (currentOnboardingStep > 0) {
        currentOnboardingStep--;
        renderOnboardingStep(currentOnboardingStep);
    }
}

function skipOnboarding() {
    localStorage.setItem('sv_onboarding_completed', 'true');
    closeOnboarding();
}

function finishOnboarding() {
    localStorage.setItem('sv_onboarding_completed', 'true');
    closeOnboarding();
}

function initLobby() {
    // Al cargar la página, mostramos el Lobby inicial si es la primera visita
    const lobby = document.getElementById('trail-lobby');
    if (lobby) {
        lobby.classList.remove('lobby-hidden');
    }
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

/*
 * Estas funciones son llamadas desde el HTML,
 * por eso se exponen explícitamente en window.
 */

window.selectHotspot = selectHotspot;
window.closeBottomSheet = closeBottomSheet;
window.filterCategory = filterCategory;
window.markAsDiscovered = markAsDiscovered;
window.switchTab = switchTab;
window.closeTabPanel = closeTabPanel;

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.handleSearch = handleSearch;

window.playSpeciesSound = playSpeciesSound;
window.alternarAmbiente = alternarAmbiente;

window.sonarEspecie = sonarEspecie;
window.sonarNarracion = sonarNarracion;

window.verModelo3D = verModelo3D;
// Funciones exclusivas móvil
window.toggleMobileFilters = toggleMobileFilters;
window.toggleDetailsCard = toggleDetailsCard;
window.filterCategoryMobile = filterCategoryMobile;
window.setRenderModelMobile = setRenderModelMobile;

// Lobby & Onboarding
window.openTrailLobby = openTrailLobby;
window.closeTrailLobby = closeTrailLobby;
window.startTrailExploration = startTrailExploration;
window.openOnboarding = openOnboarding;
window.closeOnboarding = closeOnboarding;
window.nextOnboardingStep = nextOnboardingStep;
window.prevOnboardingStep = prevOnboardingStep;
window.skipOnboarding = skipOnboarding;
window.finishOnboarding = finishOnboarding;


/* ==========================================================================
   INICIO
   ========================================================================== */

/*
 * El catálogo manda:
 * primero se lee config/pois.json y después se intenta
 * enganchar al visor.
 *
 * Si el catálogo falla, el visor sigue funcionando.
 */

cargarCatalogo()
    .catch(error => {
        console.error(
            'No se pudo leer el catálogo de puntos:',
            error
        );
    })
    .finally(() => {
        updateDiscoveredProgress();
        initRenderModelMobile();
        initLobby();
        esperarVisor();

        // Atajos de teclado para la expedición
        window.addEventListener('keydown', (e) => {
            if ((e.key === 'k' || e.key === 'K') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                e.preventDefault();
                openSearchModal();
            } else if (e.key === 'Escape') {
                closeSearchModal();
                closeBottomSheet();
                closeTabPanel();
            }
        });
    });