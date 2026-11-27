// Versión 2 de Sendero Santa Ana: recorrido de foto en foto con las panorámicas 360.
//
// Sin movimiento libre: se mira alrededor arrastrando (o con las flechas izquierda y derecha) y se
// avanza o se vuelve de una parada a la siguiente con las flechas del piso, los botones de abajo o
// las teclas arriba y abajo. Los puntos de interés (letreros, banca, tablero, plantas y aves) son
// marcadores que abren la misma ficha de la versión 1 (src/views/PoiCardView.js) con el mismo
// catálogo (config/pois.json); las aves suenan con los mismos cantos.
//
// Las paradas, sus flechas y dónde va cada punto salen de v2/datos/recorrido.json
// (scripts/v2-panoramas/armar_recorrido.py, con v2/inventario/ubicacion_puntos.csv).

import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { PoiCardView } from '../src/views/PoiCardView.js';
import { Sonido } from './audio.js';

const RAD = Math.PI / 180;
// En pantallas chicas o táctiles, la versión liviana (3072 x 1536); si no, la de escritorio (6144).
const LIVIANA = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const CARPETA = LIVIANA ? 'panoramas/celular/' : 'panoramas/escritorio/';

// Las rutas del catálogo son relativas a la raíz del sitio; la versión 2 vive en /v2/.
const RUTAS = ['modelUrl', 'previewUrl', 'birdCallUrl', 'narrationUrl', 'transcriptUrl'];
function desdeRaiz(url) {
    return url && !/^(https?:|\/|\.\.\/)/.test(url) ? `../${url}` : url;
}

// Emisor mínimo con la forma que espera la ficha (app.on / off / fire).
class Emisor {
    constructor() { this.h = new Map(); }
    on(n, f) { (this.h.get(n) || this.h.set(n, []).get(n)).push(f); }
    off(n, f) { this.h.set(n, (this.h.get(n) || []).filter(x => x !== f)); }
    fire(n, ...a) { (this.h.get(n) || []).slice().forEach(f => f(...a)); }
}

async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
}

const ICONO = { fauna: 'fa-dove', flora: 'fa-leaf', patrimonio: 'fa-signs-post' };

function marcador(poi, ubic) {
    const img = poi.previewUrl
        ? `<img src="${poi.previewUrl}" alt="" draggable="false">`
        : `<i class="fa-solid ${ICONO[poi.type] || 'fa-circle-info'}" aria-hidden="true"></i>`;
    return {
        id: poi.id,
        position: { yaw: ubic.rumbo * RAD, pitch: ubic.altura * RAD },
        html: `<button type="button" class="v2-ave" aria-label="Ver ficha: ${poi.commonName}">${img}</button>`,
        size: { width: 64, height: 64 },
        anchor: 'center center',
        tooltip: { content: poi.commonName, position: 'top center' },
        data: { poiId: poi.id },
    };
}

async function iniciar() {
    const [recorrido, catalogo, paisaje] = await Promise.all([
        json('datos/recorrido.json'), json('../config/pois.json'), json('../config/soundscape.json'),
    ]);
    const pois = new Map(catalogo.pois.map(p => {
        const q = { ...p };
        RUTAS.forEach(k => { q[k] = desdeRaiz(q[k]); });
        return [p.id, q];
    }));
    const paradas = recorrido.paradas;
    const indice = new Map(paradas.map((p, i) => [p.id, i]));
    const puntos = recorrido.puntos.filter(u => pois.has(u.poiId));
    const aves = puntos.filter(u => pois.get(u.poiId).type === 'fauna');
    const puntosPorParada = new Map();
    for (const u of puntos) {
        if (!puntosPorParada.has(u.nodo)) puntosPorParada.set(u.nodo, []);
        puntosPorParada.get(u.nodo).push(u);
    }

    const sonido = new Sonido(
        paisaje.sources.map(s => ({ poiId: s.poiId, url: desdeRaiz(s.url), intervalSeconds: s.intervalSeconds })),
        desdeRaiz(paisaje.ambienceUrl),
    );
    window.senderoV2Sonido = sonido;

    const nodos = paradas.map((p, i) => ({
        id: p.id,
        panorama: CARPETA + p.id + '.webp',
        name: `Parada ${i + 1} de ${paradas.length}`,
        links: [
            p.siguiente && { nodeId: p.siguiente, position: { yaw: p.rumbo * RAD, pitch: 0 } },
            p.anterior && { nodeId: p.anterior, position: { yaw: (p.rumbo + 180) * RAD, pitch: 0 } },
        ].filter(Boolean),
        markers: (puntosPorParada.get(p.id) || []).map(u => marcador(pois.get(u.poiId), u)),
        data: { indice: i },
    }));

    const viewer = new Viewer({
        container: 'visor',
        navbar: false,
        defaultYaw: 0,
        defaultPitch: -0.05,
        defaultZoomLvl: LIVIANA ? 0 : 40,
        moveInertia: true,
        mousewheel: true,
        keyboard: 'always',
        keyboardActions: { ArrowLeft: 'ROTATE_LEFT', ArrowRight: 'ROTATE_RIGHT', '+': 'ZOOM_IN', '-': 'ZOOM_OUT' },
        loadingTxt: 'Cargando la foto…',
        lang: { loadError: 'No se pudo cargar esta foto.' },
        plugins: [
            MarkersPlugin,
            [VirtualTourPlugin, {
                nodes: nodos,
                startNodeId: paradas[0].id,
                positionMode: 'manual',
                renderMode: '3d',
                preload: true,
                transitionOptions: { showLoader: false, speed: 600, effect: 'fade', rotation: false },
                arrowsPosition: { linkOverlapAngle: Math.PI / 8 },
                getLinkTooltip: (_c, link) => {
                    const i = indice.get(link.nodeId);
                    const actual = indice.get(tour.getCurrentNode()?.id);
                    return i > actual ? 'Avanzar' : 'Volver';
                },
            }],
        ],
    });
    const tour = viewer.getPlugin(VirtualTourPlugin);
    const marcadores = viewer.getPlugin(MarkersPlugin);
    window.senderoV2 = { viewer, tour, marcadores };

    // ----- Ficha: la misma de la versión 1 -----
    const app = new Emisor();
    // La ficha compartida no debe cerrar por sí misma; pide cerrar y aquí se cierra.
    new PoiCardView(app, sonido);
    app.on('poi:request-close', () => { app.fire('poi:close'); });
    app.on('poi:open', () => sonido.fichaAbierta(true));
    app.on('poi:close', () => sonido.fichaAbierta(false));
    marcadores.addEventListener('select-marker', ({ marker }) => {
        const poi = pois.get(marker.data?.poiId);
        if (!poi) return;
        sonido.despertar();
        app.fire('poi:open', poi);
    });

    // ----- Controles: volver, parada, avanzar y sonido -----
    const bVolver = document.getElementById('volver');
    const bAvanzar = document.getElementById('avanzar');
    const cuenta = document.getElementById('cuenta');
    const bSonido = document.getElementById('sonido');
    // Mientras una parada carga se ignoran los demas pedidos: si no, uno anula al otro.
    let enCurso = null;
    const ir = (paso) => {
        if (enCurso) return;
        const p = paradas[indice.get(tour.getCurrentNode().id)];
        const destino = paso > 0 ? p.siguiente : p.anterior;
        if (destino) enCurso = tour.setCurrentNode(destino).finally(() => { enCurso = null; });
    };
    bVolver.addEventListener('click', () => ir(-1));
    bAvanzar.addEventListener('click', () => ir(1));
    window.addEventListener('keydown', (e) => {
        if (document.getElementById('sendero-vivo-poi-overlay')) return;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); ir(1); }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); ir(-1); }
    });
    const pintarSonido = (mudo) => {
        bSonido.setAttribute('aria-pressed', String(!mudo));
        bSonido.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar');
        bSonido.innerHTML = `<i class="fa-solid ${mudo ? 'fa-volume-xmark' : 'fa-volume-high'}" aria-hidden="true"></i>`;
    };
    pintarSonido(sonido.mudo);
    bSonido.addEventListener('click', () => { sonido.despertar(); pintarSonido(sonido.alternarMudo()); });
    // Cualquier primer gesto despierta el sonido (el navegador no deja antes).
    const despertar = () => { sonido.despertar(); };
    window.addEventListener('pointerdown', despertar, { once: true });
    window.addEventListener('keydown', despertar, { once: true });

    // ----- Al cambiar de parada -----
    const alCambiar = (id) => {
        const i = indice.get(id);
        const p = paradas[i];
        cuenta.textContent = `Parada ${i + 1} de ${paradas.length}`;
        bVolver.disabled = !p.anterior;
        bAvanzar.disabled = !p.siguiente;
        // Aves que suenan: la de esta parada desde su lugar; las de hasta dos paradas adelante, desde
        // el frente; las de hasta dos atrás, desde atrás.
        const cerca = [];
        for (const u of aves) {
            const j = indice.get(u.nodo);
            const d = j - i;
            if (Math.abs(d) > 2) continue;
            const rumbo = d === 0 ? u.rumbo * RAD : (d > 0 ? p.rumbo * RAD : (p.rumbo + 180) * RAD);
            cerca.push({ poiId: u.poiId, rumbo, distancia: Math.abs(d) });
        }
        sonido.ponerCercanas(cerca);
        const aqui = puntosPorParada.get(id) || [];
        document.getElementById('aviso').textContent = aqui.length
            ? `Para ver aquí: ${aqui.map(u => pois.get(u.poiId).commonName).join(', ')}. Mira alrededor.`
            : '';
    };
    tour.addEventListener('node-changed', ({ node }) => alCambiar(node.id));
    viewer.addEventListener('position-updated', ({ position }) => sonido.mirarHacia(position.yaw));
    viewer.addEventListener('ready', () => {
        document.body.classList.add('listo');
        const n = tour.getCurrentNode();
        if (n) alCambiar(n.id);
    }, { once: true });
}

iniciar().catch((e) => {
    console.error(e);
    document.getElementById('aviso').textContent = 'No se pudo abrir el recorrido. Recarga la página.';
});
