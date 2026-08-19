/*
 * Cascarón de interfaz de Eybar Viasus montado sobre el visor real.
 * Origen: design/interfaz/original-tailwind/app.js (su diseño y su lógica de UI).
 * Adaptaciones de integración (Juan, 18/08):
 *   · Fuera el escenario falso de Three.js: el fondo ES el visor 3DGS real.
 *   · Los puntos de interés se anclan al TRAZADO real (distancia + lateral) y se
 *     proyectan con la cámara real del motor. Igual en COLMAP y en Luma: las dos
 *     técnicas comparten coordenadas.
 *   · Datos del catálogo real (docs/06 Parte A): nada inventado; lo no verificado
 *     va marcado [por verificar], que es la regla del proyecto.
 *   · Sin dependencias de CDN: Tailwind compilado a styles/tailwind.css,
 *     FontAwesome en assets/vendor/.
 *   · El sintetizador de sonido de Eybar se conserva: es Web Audio propio y solo
 *     suena con un toque explícito (RNF-008).
 */

/* ==========================================================================
   DATOS: catálogo real del proyecto (docs/06 Parte A)
   ========================================================================== */
const trailData = [
    {
        id: 'colibri_chillon',
        name: 'Colibrí chillón',
        scientific: 'Colibri coruscans',
        category: 'fauna',
        icon: 'fa-dove',
        color: '#4FA3A5',
        typeLabel: 'Avifauna · Verificado',
        image: null,
        shortDesc: 'El ave insignia del proyecto. POI confirmado del catálogo.',
        fullDesc: 'Colibrí de verde iridiscente con parche azul violeta en la garganta. Vive entre 1.700 y 3.500 msnm, el único rango de altitud ya verificado del catálogo. Verificado para los Cerros Orientales por la Fundación Cerros de Bogotá.',
        conservation: 'Verificado',
        curiosity: 'Su nombre viene del canto insistente y chillón que emite desde perchas altas, sobre todo al amanecer.',
        discovered: false,
        anchor: { d: 1.3, lat: -0.9, alt: 1.1 },
        audioFreq: 880
    },
    {
        id: 'helecho_arboreo',
        name: 'Helecho arborescente',
        scientific: 'Género Cyathea · [por verificar en V1]',
        category: 'flora',
        icon: 'fa-seedling',
        color: '#6FCF97',
        typeLabel: 'Flora · POI confirmado',
        image: null,
        shortDesc: 'POI confirmado. La especie exacta se confirma con la planta delante.',
        fullDesc: 'La fuente oficial del Acueducto lo cita como "helecho arborescente", que es un grupo y no una especie. En los Cerros suele corresponder al género Cyathea, pero la regla del proyecto es no publicar el binomio hasta verificarlo en campo, en la visita V1.',
        conservation: '[por verificar]',
        curiosity: 'Señalar la especie exacta exige verla: ningún dato del proyecto se publica sin fuente citable o medición propia.',
        discovered: false,
        anchor: { d: 2.4, lat: 1.0, alt: 0.8 },
        audioFreq: 600
    },
    {
        id: 'encenillo',
        name: 'Encenillo',
        scientific: 'Weinmannia tomentosa',
        category: 'flora',
        icon: 'fa-tree',
        color: '#6FCF97',
        typeLabel: 'Flora · Verificado',
        image: null,
        shortDesc: 'Especie estructural del bosque altoandino.',
        fullDesc: 'Verificada por el Acueducto de Bogotá para la Quebrada La Vieja. El encenillo arma la estructura del bosque altoandino: buena parte del dosel que se recorre en el sendero está sostenido por esta especie.',
        conservation: 'Verificado',
        curiosity: 'Aparece en la lista oficial de vegetación principal del sendero junto al cedro, el raque, el tíbar y el chuwacá.',
        discovered: false,
        anchor: { d: 3.6, lat: -1.1, alt: 0.9 },
        audioFreq: 520
    },
    {
        id: 'zorro_perro',
        name: 'Zorro perro',
        scientific: 'Cerdocyon thous',
        category: 'fauna',
        icon: 'fa-paw',
        color: '#4FA3A5',
        typeLabel: 'Mamífero · Verificado',
        image: null,
        shortDesc: 'El mamífero mejor documentado del sendero.',
        fullDesc: 'Reportado nominalmente para la Quebrada La Vieja por el Acueducto y el más registrado por cámaras trampa en los Cerros Orientales. Es candidato a sexto POI de fauna: entra si la visita V1 encuentra su rastro o lugar de paso dentro de los 200 m.',
        conservation: 'Verificado · candidato a POI',
        curiosity: 'Distinguirlo de un perro doméstico es parte del contenido: en las mismas cámaras trampa también aparecen perros.',
        discovered: false,
        anchor: { d: 4.8, lat: 0.9, alt: 0.6 },
        audioFreq: 220
    },
    {
        id: 'puente_madera',
        name: 'Puente de madera',
        scientific: 'Punto patrimonial',
        category: 'curiosidades',
        icon: 'fa-landmark',
        color: '#B9C1BC',
        typeLabel: 'Patrimonio · POI confirmado',
        image: null,
        shortDesc: 'No todo el contenido del sendero está vivo.',
        fullDesc: 'El puente de madera es el primer POI patrimonial confirmado del proyecto. Los datos históricos siguen la misma regla dura que la biología: sin fuente citable no se publica nada, se marca [por verificar] y la ficha muestra solo lo que sí se sabe.',
        conservation: '[por verificar] la historia',
        curiosity: 'Los Cerros Orientales guardan patrimonio de acueducto documentado: si aparece infraestructura análoga en la quebrada, hay dónde buscar fuente.',
        discovered: false,
        anchor: { d: 6.0, lat: -0.8, alt: 0.7 },
        audioFreq: 330
    },
    {
        id: 'retamo_espinoso',
        name: 'Retamo espinoso',
        scientific: '[binomio por verificar]',
        category: 'curiosidades',
        icon: 'fa-triangle-exclamation',
        color: '#B9C1BC',
        typeLabel: 'Especie invasora · Verificada',
        image: null,
        shortDesc: 'Una invasora contada es mejor que una invasora escondida.',
        fullDesc: 'El Acueducto verifica su presencia en el sendero. Explicar por qué está ahí, por qué es un problema para el bosque nativo y por qué no hay que salirse del camino sirve directamente al propósito ambiental del proyecto.',
        conservation: 'Invasora presente',
        curiosity: 'Es candidata a POI de flora: la decisión se toma en la visita V1, viendo si es visible desde el trazado.',
        discovered: false,
        anchor: { d: 7.2, lat: 1.0, alt: 0.6 },
        audioFreq: 440
    }
];

let currentFilter = 'all';

/* ==========================================================================
   ENGANCHE AL VISOR REAL (PlayCanvas): proyección de los puntos anclados
   ========================================================================== */
let visorApp = null;
let visorCamara = null;
let anclas = null;   // posiciones de mundo precalculadas por punto

function prepararAnclas() {
    const tour = window.senderoTour;
    if (!tour || !tour.trailPath || !tour.trailPath.isUsable) return false;
    const path = tour.trailPath;
    const Vec3C = visorCamara.getPosition().constructor;
    anclas = {};
    for (const item of trailData) {
        const pos = new Vec3C();
        const dir = new Vec3C();
        path.positionAt(item.anchor.d, pos);
        path.directionAt(item.anchor.d, dir);
        // lateral: perpendicular horizontal al avance (misma convención del motor)
        pos.x += -dir.z * item.anchor.lat;
        pos.z += dir.x * item.anchor.lat;
        pos.y += item.anchor.alt;
        anclas[item.id] = pos;
    }
    return true;
}

/*
 * Los hotspots son nodos PERSISTENTES: se crean una sola vez y en cada
 * fotograma del motor solo se actualiza su transform. Así no parpadean (no se
 * reconstruye el DOM), el pulso no se reinicia y quedan clavados al mundo:
 * la proyección corre a la velocidad del render, no a 8 veces por segundo.
 */
const nodosHotspot = {};

function construirHotspots() {
    const overlay = document.getElementById('hotspots-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    for (const item of trailData) {
        const el = document.createElement('div');
        el.className = 'absolute pointer-events-auto cursor-pointer group z-30 touch-manipulation';
        el.style.cssText = 'left:0; top:0; display:none; will-change:transform;';
        el.innerHTML = `
            <div class="relative w-10 h-10 -translate-x-1/2 -translate-y-1/2">
                <div class="hotspot-ring"></div>
                <div class="absolute inset-0 rounded-2xl glass-panel border flex items-center justify-center text-sm transition-all duration-300 transform group-hover:scale-125 shadow-xl"
                     style="border-color: ${item.color}; color: ${item.color}; background: rgba(14, 18, 16, 0.85);">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div class="absolute left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    <div class="glass-panel px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-100 flex items-center gap-1.5 shadow-lg">
                        <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${item.color}"></span>
                        ${item.name}
                    </div>
                </div>
            </div>
        `;
        el.addEventListener('click', () => selectHotspot(item.id));
        overlay.appendChild(el);
        nodosHotspot[item.id] = el;
    }
}

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
        if (!world || (currentFilter !== 'all' && item.category !== currentFilter)) {
            el.style.display = 'none';
            continue;
        }
        // descarta lo que queda detrás de la cámara
        const vx = world.x - camPos.x, vy = world.y - camPos.y, vz = world.z - camPos.z;
        if (camFwd.x * vx + camFwd.y * vy + camFwd.z * vz < 0.3) {
            el.style.display = 'none';
            continue;
        }
        const p = visorCamara.camera.worldToScreen(world);
        if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) {
            el.style.display = 'none';
            continue;
        }
        el.style.display = 'block';
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
}

function esperarVisor() {
    const app = window.senderoApp;
    if (!app) { setTimeout(esperarVisor, 400); return; }
    const camComp = app.root && app.root.findComponents('camera')[0];
    if (!camComp) { setTimeout(esperarVisor, 400); return; }
    visorApp = app;
    visorCamara = camComp.entity;

    if (!prepararAnclas()) { setTimeout(esperarVisor, 600); return; }

    // los nodos se crean una vez y se reposicionan en CADA fotograma del motor:
    // quedan clavados al mundo, sin parpadeo ni arrastre respecto a la escena
    construirHotspots();
    visorApp.on('update', updateHotspotsOverlay);

    // progreso y datos reales del recorrido (tour:progress del motor)
    // Escala medida del parque de práctica: 14,31 unidades ≈ 30 m caminados.
    const METROS_POR_UNIDAD = 2.096;
    const ALTITUD_BASE = 2712;   // msnm del inicio del sendero real (config/scenes.json)
    let yInicial = null;
    visorApp.on('tour:progress', (e) => {
        const pct = document.getElementById('progreso-pct');
        if (pct && e.total > 0) {
            pct.innerText = `Progreso sendero · ${Math.round(100 * e.distance / e.total)} %`;
        }
        if (!e.position) return;
        if (yInicial === null) yInicial = e.position.y;
        const recorridoM = e.distance * METROS_POR_UNIDAD;
        const desnivelM = (e.position.y - yInicial) * METROS_POR_UNIDAD;
        const pendiente = recorridoM > 1 ? (100 * desnivelM / recorridoM) : 0;
        const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
        set('hud-recorrido', `${recorridoM.toFixed(0)} m`);
        set('hud-desnivel', `${desnivelM >= 0 ? '+' : ''}${desnivelM.toFixed(1)} m`);
        set('hud-altitud', `${(ALTITUD_BASE + desnivelM).toLocaleString('es-CO', { maximumFractionDigits: 0 })} m`);
        set('hud-pendiente', `${Math.abs(pendiente).toFixed(0)} %`);
    });
}

/* ==========================================================================
   FICHA DESLIZANTE (bottom sheet) — plantilla de Eybar con medallón de icono
   ========================================================================== */
function medallonHTML(item, tam) {
    return `
        <div class="${tam} rounded-2xl border border-slate-700 shadow-md flex items-center justify-center flex-shrink-0"
             style="background: ${item.color}18; color: ${item.color};">
            <i class="fa-solid ${item.icon} text-xl"></i>
        </div>
    `;
}

function selectHotspot(id) {
    const item = trailData.find(x => x.id === id);
    if (!item) return;

    playSynthBeep(item.audioFreq || 440);

    const sheet = document.getElementById('bottom-sheet');
    const content = document.getElementById('sheet-content');
    if (!sheet || !content) return;

    content.innerHTML = `
        <div class="relative pt-2">
            <button onclick="closeBottomSheet()" ontouchstart="closeBottomSheet(); event.preventDefault();"
                    class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition border border-slate-700 z-50 touch-manipulation cursor-pointer shadow-lg">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="flex items-start gap-3 mb-3 pr-6">
                ${medallonHTML(item, 'w-20 h-20')}
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border" style="background:${item.color}15; color:${item.color}; border-color:${item.color}40;">
                            <i class="fa-solid ${item.icon}"></i> ${item.typeLabel}
                        </span>
                    </div>
                    <h3 class="text-base font-bold text-slate-100 leading-snug">${item.name}</h3>
                    <p class="text-[11px] text-slate-400 italic font-mono">${item.scientific}</p>
                </div>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed mb-3">${item.fullDesc}</p>

            <div class="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 mb-4">
                <h4 class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <i class="fa-solid fa-lightbulb"></i> ¿Sabías que?
                </h4>
                <p class="text-[11px] text-slate-300">${item.curiosity}</p>
            </div>

            <div class="flex gap-2">
                <button onclick="playSpeciesSound(${item.audioFreq})" ontouchstart="playSpeciesSound(${item.audioFreq}); event.preventDefault();"
                        class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 touch-manipulation cursor-pointer">
                    <i class="fa-solid fa-volume-high text-emerald-400"></i> Escuchar (provisional)
                </button>
                <button onclick="markAsDiscovered('${item.id}')" ontouchstart="markAsDiscovered('${item.id}'); event.preventDefault();"
                        class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 touch-manipulation cursor-pointer">
                    <i class="fa-solid fa-circle-check"></i> ${item.discovered ? 'Visto' : 'Marcar visto'}
                </button>
            </div>
        </div>
    `;

    sheet.classList.remove('translate-y-full');
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.add('translate-y-full');
}

/* ==========================================================================
   FILTROS, PROGRESO Y PESTAÑAS — lógica de Eybar
   ========================================================================== */
function filterCategory(cat) {
    currentFilter = cat;
    ['all', 'flora', 'fauna', 'curiosidades'].forEach(c => {
        const btn = document.getElementById(`filter-${c}`);
        if (btn) {
            if (c === cat) {
                btn.className = 'glass-pill glass-pill-active py-1.5 px-1 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer touch-manipulation truncate';
            } else {
                btn.className = 'glass-pill py-1.5 px-1 rounded-xl text-[11px] font-semibold text-slate-300 transition flex items-center justify-center gap-1 hover:text-emerald-300 cursor-pointer touch-manipulation truncate';
            }
        }
    });
    updateHotspotsOverlay();
}

function markAsDiscovered(id) {
    const item = trailData.find(x => x.id === id);
    if (!item) return;
    item.discovered = true;
    updateDiscoveredProgress();
    if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }
    selectHotspot(id);
}

function updateDiscoveredProgress() {
    const elem = document.getElementById('discovered-counter');
    if (elem) {
        const count = trailData.filter(x => x.discovered).length;
        elem.innerText = `${count} de ${trailData.length} puntos vistos`;
    }
}

function switchTab(tab) {
    closeBottomSheet();
    const panel = document.getElementById('tab-panel-container');
    const content = document.getElementById('tab-panel-content');
    if (!panel || !content) return;

    ['trail', 'catalog', 'audio', 'quest'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'flex flex-col items-center gap-0.5 text-emerald-400 font-medium touch-manipulation cursor-pointer transition hover:text-emerald-300';
            } else {
                btn.className = 'flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer';
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

    if (tab === 'catalog') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-book-bookmark text-emerald-400"></i> Guía de puntos del sendero
            </h2>
            <p class="text-[11px] text-slate-400 mb-3">Catálogo real del proyecto (docs/06 Parte A). Lo marcado [por verificar] se resuelve en campo antes de publicarse.</p>
            <div class="space-y-3">
                ${trailData.map(item => `
                    <div onclick="selectHotspot('${item.id}'); closeTabPanel();" ontouchstart="selectHotspot('${item.id}'); closeTabPanel();"
                         class="glass-panel rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-emerald-500/50 transition touch-manipulation">
                        ${medallonHTML(item, 'w-14 h-14')}
                        <div class="flex-1">
                            <span class="text-[9px] uppercase font-bold text-emerald-400 block">${item.typeLabel}</span>
                            <h4 class="text-xs font-bold text-slate-100">${item.name}</h4>
                            <p class="text-[10px] text-slate-400 line-clamp-1">${item.shortDesc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right text-xs text-slate-500"></i>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'audio') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-headphones text-emerald-400"></i> Sonidos del sendero
            </h2>
            <p class="text-[11px] text-slate-400 mb-3">Los sonidos definitivos se graban en el propio sendero (visita V3): la regla del proyecto es no usar audio de banco. Estos son tonos provisionales del prototipo.</p>
            <div class="space-y-2">
                ${trailData.filter(x => x.category === 'fauna').map(item => `
                    <div onclick="playSpeciesSound(${item.audioFreq})" ontouchstart="playSpeciesSound(${item.audioFreq})"
                         class="glass-panel p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 touch-manipulation">
                        <div class="flex items-center gap-2.5">
                            <i class="fa-solid fa-circle-play text-emerald-400 text-lg"></i>
                            <div>
                                <h5 class="text-xs font-bold text-slate-200">${item.name}</h5>
                                <span class="text-[10px] text-slate-400 font-mono">${item.scientific}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-mono text-emerald-400">provisional</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'quest') {
        const discoveredCount = trailData.filter(x => x.discovered).length;
        const totalCount = trailData.length;
        const progressPercent = Math.round((discoveredCount / totalCount) * 100);

        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-trophy text-amber-400"></i> Bitácora del recorrido
            </h2>
            <div class="glass-panel rounded-2xl p-4 mb-4 border-amber-500/30">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-200">Puntos del sendero vistos</span>
                    <span class="text-xs font-bold text-amber-400">${discoveredCount} / ${totalCount}</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-2">
                    <div class="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                </div>
                <p class="text-[10px] text-slate-400 text-right font-mono">${progressPercent}% recorrido</p>
            </div>
            <div class="space-y-2">
                ${trailData.map(item => `
                    <div class="glass-panel p-3 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg ${item.discovered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-600'} flex items-center justify-center text-xs">
                                <i class="fa-solid ${item.discovered ? 'fa-check' : 'fa-eye-slash'}"></i>
                            </div>
                            <div>
                                <h5 class="text-xs font-bold ${item.discovered ? 'text-slate-100' : 'text-slate-500'}">${item.name}</h5>
                                <span class="text-[10px] text-slate-400">${item.typeLabel}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold ${item.discovered ? 'text-emerald-400' : 'text-slate-600'}">
                            ${item.discovered ? 'Visto' : 'Pendiente'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function closeTabPanel() {
    const panel = document.getElementById('tab-panel-container');
    if (panel) panel.classList.add('hidden');
    switchTab('trail');
}

/* ==========================================================================
   SINTETIZADOR (de Eybar, Web Audio propio; solo suena con toque explícito)
   ========================================================================== */
let audioCtx;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSynthBeep(freq = 440) {
    try {
        initAudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.28);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch { /* sin audio no se rompe nada */ }
}

function playSpeciesSound(freq = 440) {
    try {
        initAudioContext();
        // trino simple: tres pulsos descendentes (provisional hasta grabar en V3)
        [0, 0.18, 0.36].forEach((t, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * (1 + 0.12 * (2 - i)), audioCtx.currentTime + t);
            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.16);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + t);
            osc.stop(audioCtx.currentTime + t + 0.18);
        });
    } catch { /* sin audio no se rompe nada */ }
}

/* ==========================================================================
   BÚSQUEDA — lógica de Eybar
   ========================================================================== */
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
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
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    const query = input.value.toLowerCase();
    const filtered = trailData.filter(x => x.name.toLowerCase().includes(query) || x.scientific.toLowerCase().includes(query));

    results.innerHTML = filtered.map(item => `
        <div onclick="selectHotspot('${item.id}'); closeSearchModal();" ontouchstart="selectHotspot('${item.id}'); closeSearchModal();"
             class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 touch-manipulation">
            <div>
                <h4 class="text-xs font-bold text-slate-100">${item.name}</h4>
                <p class="text-[10px] text-slate-400 font-mono">${item.scientific}</p>
            </div>
            <i class="fa-solid fa-arrow-right text-xs text-emerald-400"></i>
        </div>
    `).join('');
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */
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

updateDiscoveredProgress();
esperarVisor();
