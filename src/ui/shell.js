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
function desdeContrato(poi) {
    return {
        id: poi.id,
        name: poi.commonName,
        scientific: poi.scientificName || '',
        category: poi.category || poi.type || 'curiosidades',
        icon: poi.icon || 'fa-location-dot',

        color:
            colorDeToken(poi.colorToken) ||
            colorDeToken('--sv-green-300'),

        typeLabel: poi.typeLabel || '',
        shortDesc: poi.shortDesc || '',
        fullDesc: poi.fullDesc || '',
        conservation: poi.conservation || '',
        curiosity: poi.curiosity || '',

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

        el.innerHTML = `
            <div class="relative w-10 h-10 -translate-x-1/2 -translate-y-1/2">

                <div class="hotspot-ring"></div>

                <div
                    class="absolute inset-0 rounded-2xl glass-panel border flex items-center justify-center text-sm transition-all duration-300 transform group-hover:scale-125 shadow-xl"
                    style="
                        border-color: ${item.color};
                        color: ${item.color};
                        background: var(--sv-scrim-850);
                    "
                >
                    <i class="fa-solid ${item.icon}"></i>
                </div>

                <div
                    class="absolute left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                >
                    <div
                        class="glass-panel px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-100 flex items-center gap-1.5 shadow-lg"
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full"
                            style="background-color: ${item.color}"
                        ></span>

                        ${item.name}
                    </div>
                </div>

            </div>
        `;

        /*
         * Solo usamos click.
         *
         * Antes había onclick + ontouchstart, lo que podía provocar
         * doble ejecución en dispositivos táctiles.
         */
        el.addEventListener('click', () => {
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
        const pct =
            document.getElementById('progreso-pct');

        if (pct && e.total > 0) {
            pct.innerText =
                `Progreso sendero · ${Math.round(
                    100 * e.distance / e.total
                )} %`;
        }

        if (!e.position) return;

        if (yInicial === null) {
            yInicial = e.position.y;
        }

        const recorridoM =
            e.distance * METROS_POR_UNIDAD;

        const desnivelM =
            (e.position.y - yInicial) *
            METROS_POR_UNIDAD;

        const pendiente =
            recorridoM > 1
                ? 100 * desnivelM / recorridoM
                : 0;

        const set = (id, txt) => {
            const el = document.getElementById(id);

            if (el) {
                el.innerText = txt;
            }
        };

        set(
            'hud-recorrido',
            `${recorridoM.toFixed(0)} m`
        );

        set(
            'hud-desnivel',
            `${desnivelM >= 0 ? '+' : ''}${desnivelM.toFixed(1)} m`
        );

        set(
            'hud-altitud',
            `${(
                ALTITUD_BASE + desnivelM
            ).toLocaleString('es-CO', {
                maximumFractionDigits: 0
            })} m`
        );

        set(
            'hud-pendiente',
            `${Math.abs(pendiente).toFixed(0)} %`
        );
    });
}


/* ==========================================================================
   FICHA DESLIZANTE — BOTTOM SHEET
   ========================================================================== */

function medallonHTML(item, tam) {
    return `
        <div
            class="${tam} rounded-2xl border border-slate-700 shadow-md flex items-center justify-center flex-shrink-0"
            style="
                background: ${item.color}18;
                color: ${item.color};
            "
        >
            <i class="fa-solid ${item.icon} text-xl"></i>
        </div>
    `;
}


/**
 * Botones multimedia.
 */
function accionesMediaHTML(item) {
    const claseBoton =
        'flex-1 min-w-[7rem] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 touch-manipulation cursor-pointer';

    const botones = [];

    /*
     * Canto.
     */
    if (item.birdCallUrl) {
        botones.push(`
            <button
                onclick="sonarEspecie('${item.id}')"
                class="${claseBoton}"
            >
                <i class="fa-solid fa-volume-high text-emerald-400"></i>
                Escuchar canto
            </button>
        `);
    } else {
        botones.push(`
            <button
                onclick="playSpeciesSound(${item.audioFreq})"
                class="${claseBoton}"
            >
                <i class="fa-solid fa-wave-square text-slate-400"></i>
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
            >
                <i class="fa-solid fa-headphones text-emerald-400"></i>
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
            >
                <i class="fa-solid fa-cube text-emerald-400"></i>
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


/**
 * Abre la ficha del POI.
 */
function selectHotspot(id) {
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
        <div class="relative pt-2">

            <button
                onclick="closeBottomSheet()"
                class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition border border-slate-700 z-50 touch-manipulation cursor-pointer shadow-lg"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="flex items-start gap-3 mb-3 pr-6">

                ${medallonHTML(item, 'w-20 h-20')}

                <div class="flex-1">

                    <div class="flex items-center gap-2 mb-1">

                        <span
                            class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
                            style="
                                background:${item.color}15;
                                color:${item.color};
                                border-color:${item.color}40;
                            "
                        >
                            <i class="fa-solid ${item.icon}"></i>
                            ${item.typeLabel}
                        </span>

                    </div>

                    <h3 class="text-base font-bold text-slate-100 leading-snug">
                        ${item.name}
                    </h3>

                    <p class="text-[11px] text-slate-400 italic font-mono">
                        ${item.scientific}
                    </p>

                </div>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed mb-3">
                ${item.fullDesc}
            </p>

            <div class="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 mb-4">

                <h4 class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <i class="fa-solid fa-lightbulb"></i>
                    ¿Sabías que?
                </h4>

                <p class="text-[11px] text-slate-300">
                    ${item.curiosity}
                </p>

            </div>

            ${accionesMediaHTML(item)}

            <div class="flex gap-2">

                <button
                    onclick="markAsDiscovered('${item.id}')"
                    class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 touch-manipulation cursor-pointer"
                >
                    <i class="fa-solid fa-circle-check"></i>
                    ${item.discovered ? 'Visto' : 'Marcar visto'}
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
        const btn =
            document.getElementById(`filter-${c}`);

        if (!btn) return;

        if (c === cat) {
            btn.className =
                'glass-pill glass-pill-active py-1.5 px-1 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer touch-manipulation truncate';
        } else {
            btn.className =
                'glass-pill py-1.5 px-1 rounded-xl text-[11px] font-semibold text-slate-300 transition flex items-center justify-center gap-1 hover:text-emerald-300 cursor-pointer touch-manipulation truncate';
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
    const elem =
        document.getElementById('discovered-counter');

    if (!elem) return;

    const count =
        trailData.filter(x => x.discovered).length;

    elem.innerText =
        `${count} de ${trailData.length} puntos vistos`;
}


/* ==========================================================================
   PESTAÑAS
   ========================================================================== */

function switchTab(tab) {
    closeBottomSheet();

    const panel =
        document.getElementById('tab-panel-container');

    const content =
        document.getElementById('tab-panel-content');

    if (!panel || !content) return;

    [
        'trail',
        'catalog',
        'audio',
        'quest'
    ].forEach(t => {
        const btn =
            document.getElementById(`nav-${t}`);

        if (!btn) return;

        if (t === tab) {
            btn.className =
                'flex flex-col items-center gap-0.5 text-emerald-400 font-medium touch-manipulation cursor-pointer transition hover:text-emerald-300';
        } else {
            btn.className =
                'flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer';
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
       CATÁLOGO
       ---------------------------------------------------------------------- */

    if (tab === 'catalog') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-book-bookmark text-emerald-400"></i>
                Guía de puntos del sendero
            </h2>

            <p class="text-[11px] text-slate-400 mb-3">
                Catálogo real del proyecto (docs/06 Parte A).
                Lo marcado [por verificar] se resuelve en campo antes de publicarse.
            </p>

            <div class="space-y-3">

                ${trailData.map(item => `
                    <div
                        onclick="selectHotspot('${item.id}'); closeTabPanel();"
                        class="glass-panel rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-emerald-500/50 transition touch-manipulation"
                    >

                        ${medallonHTML(item, 'w-14 h-14')}

                        <div class="flex-1">

                            <span class="text-[9px] uppercase font-bold text-emerald-400 block">
                                ${item.typeLabel}
                            </span>

                            <h4 class="text-xs font-bold text-slate-100">
                                ${item.name}
                            </h4>

                            <p class="text-[10px] text-slate-400 line-clamp-1">
                                ${item.shortDesc}
                            </p>

                        </div>

                        <i class="fa-solid fa-chevron-right text-xs text-slate-500"></i>

                    </div>
                `).join('')}

            </div>
        `;
    }


    /* ----------------------------------------------------------------------
       AUDIO
       ---------------------------------------------------------------------- */

    else if (tab === 'audio') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-headphones text-emerald-400"></i>
                Sonidos del sendero
            </h2>

            <p class="text-[11px] text-slate-400 mb-3">
                Los sonidos definitivos se graban en el propio sendero
                (visita V3). Lo de abajo es provisional.
            </p>

            <div class="glass-panel rounded-2xl p-3 mb-4">

                <div class="flex items-center justify-between gap-3 mb-2">

                    <div class="flex items-center gap-2.5 min-w-0">

                        <i class="fa-solid fa-tree text-emerald-400 text-lg"></i>

                        <div class="min-w-0">

                            <h5 class="text-xs font-bold text-slate-200">
                                Ambiente del bosque
                            </h5>

                            <span
                                id="ambiente-estado"
                                class="text-[10px] text-slate-400"
                            >
                                ${ambienteEstadoTexto()}
                            </span>

                        </div>
                    </div>

                    <button
                        id="ambiente-toggle"
                        onclick="alternarAmbiente()"
                        class="shrink-0 py-2 px-3 rounded-xl glass-pill text-[11px] font-semibold text-slate-200 transition flex items-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                        ${ambienteBotonTexto()}
                    </button>

                </div>

                <p class="text-[10px] text-slate-500 leading-snug">
                    ${ambienteNotaTexto()}
                </p>

            </div>

            <h3 class="text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-2">
                Por especie
            </h3>

            <div class="space-y-2">

                ${trailData
                    .filter(x => x.category === 'fauna')
                    .map(item => `
                        <div
                            onclick="sonarEspecie('${item.id}')"
                            class="glass-panel p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 touch-manipulation"
                        >

                            <div class="flex items-center gap-2.5">

                                <i class="fa-solid fa-circle-play text-emerald-400 text-lg"></i>

                                <div>

                                    <h5 class="text-xs font-bold text-slate-200">
                                        ${item.name}
                                    </h5>

                                    <span class="text-[10px] text-slate-400 font-mono">
                                        ${item.scientific}
                                    </span>

                                </div>

                            </div>

                            <span class="text-[10px] font-mono text-emerald-400">
                                ${item.birdCallUrl ? 'grabado' : 'provisional'}
                            </span>

                        </div>
                    `)
                    .join('')}

            </div>
        `;
    }


    /* ----------------------------------------------------------------------
       QUEST / BITÁCORA
       ---------------------------------------------------------------------- */

    else if (tab === 'quest') {
        const discoveredCount =
            trailData.filter(x => x.discovered).length;

        const totalCount =
            trailData.length;

        /*
         * Evita NaN si todavía no hay POIs.
         */
        const progressPercent =
            totalCount > 0
                ? Math.round(
                    (discoveredCount / totalCount) * 100
                )
                : 0;

        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-trophy text-amber-400"></i>
                Bitácora del recorrido
            </h2>

            <div class="glass-panel rounded-2xl p-4 mb-4 border-amber-500/30">

                <div class="flex justify-between items-center mb-2">

                    <span class="text-xs font-bold text-slate-200">
                        Puntos del sendero vistos
                    </span>

                    <span class="text-xs font-bold text-amber-400">
                        ${discoveredCount} / ${totalCount}
                    </span>

                </div>

                <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-2">

                    <div
                        class="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all duration-500"
                        style="width: ${progressPercent}%"
                    ></div>

                </div>

                <p class="text-[10px] text-slate-400 text-right font-mono">
                    ${progressPercent}% recorrido
                </p>

            </div>

            <div class="space-y-2">

                ${trailData.map(item => `
                    <div class="glass-panel p-3 rounded-xl flex items-center justify-between">

                        <div class="flex items-center gap-3">

                            <div
                                class="w-8 h-8 rounded-lg ${
                                    item.discovered
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-slate-800 text-slate-600'
                                } flex items-center justify-center text-xs"
                            >
                                <i class="fa-solid ${
                                    item.discovered
                                        ? 'fa-check'
                                        : 'fa-eye-slash'
                                }"></i>
                            </div>

                            <div>

                                <h5
                                    class="text-xs font-bold ${
                                        item.discovered
                                            ? 'text-slate-100'
                                            : 'text-slate-500'
                                    }"
                                >
                                    ${item.name}
                                </h5>

                                <span class="text-[10px] text-slate-400">
                                    ${item.typeLabel}
                                </span>

                            </div>

                        </div>

                        <span
                            class="text-[10px] font-bold ${
                                item.discovered
                                    ? 'text-emerald-400'
                                    : 'text-slate-600'
                            }"
                        >
                            ${item.discovered ? 'Visto' : 'Pendiente'}
                        </span>

                    </div>
                `).join('')}

            </div>
        `;
    }
}


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
            <div class="text-center text-xs text-slate-500 py-4">
                No se encontraron puntos.
            </div>
        `;

        return;
    }

    results.innerHTML =
        filtered.map(item => `
            <div
                onclick="selectHotspot('${item.id}'); closeSearchModal();"
                class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 touch-manipulation"
            >

                <div>

                    <h4 class="text-xs font-bold text-slate-100">
                        ${item.name}
                    </h4>

                    <p class="text-[10px] text-slate-400 font-mono">
                        ${item.scientific}
                    </p>

                </div>

                <i class="fa-solid fa-arrow-right text-xs text-emerald-400"></i>

            </div>
        `).join('');
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
        esperarVisor();
    });