/*
 * Selector de zona del sendero (Cumbre, Tramo 1) y, cuando una zona tiene más de una,
 * de versión de la reconstrucción, para recorrer cada tramo y comparar las técnicas
 * en el mismo lugar.
 *
 * Se arma solo con los campos `zona` y `version` de config/scenes.json: agregar o
 * quitar una versión o una zona no toca código. Una escena sin esos campos no sale
 * (el parque de prueba, el Tramo 2, nuestras versiones COLMAP y las versiones de
 * Luma, Polycam y Mixta de la Cumbre y el Tramo 1: siguen abriéndose por ?render=).
 * El grupo de versiones aparece solo cuando la zona actual tiene más de una; hoy solo
 * las versiones propias de la Cumbre y del Tramo 1 llevan `zona` y `version`, así que
 * el selector ofrece las dos zonas y ningún grupo de versiones. Reemplaza al
 * conmutador COLMAP / Luma. Cambiar de zona conserva la versión si esa zona la tiene.
 */
const SCENES_CONFIG_URL = 'config/scenes.json';

function irA(render) {
    try {
        sessionStorage.setItem('sv_exploring', 'true');
    } catch (e) {}
    const params = new URLSearchParams(window.location.search);
    params.set('render', render);
    params.delete('sog');
    window.location.search = params.toString();
}

function grupo(etiqueta, opciones, activa, alElegir) {
    const deck = document.createElement('div');
    deck.className = 'render-toggle-deck selector-sendero-grupo';
    deck.setAttribute('role', 'group');
    deck.setAttribute('aria-label', etiqueta);
    for (const opcion of opciones) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'render-btn' + (opcion === activa ? ' activa' : '');
        btn.textContent = opcion;
        btn.setAttribute('aria-pressed', String(opcion === activa));
        btn.addEventListener('click', () => {
            if (opcion !== activa) alElegir(opcion);
        });
        deck.appendChild(btn);
    }
    return deck;
}

async function montarSelectorSendero() {
    // Sin ?render= la app abre el parque: COLMAP en escritorio y Luma en celular
    // (la misma regla que resolveSceneUrl en src/controllers/main.js).
    const params = new URLSearchParams(window.location.search);
    if (params.has('sog') || params.has('editor')) return;
    const esMovil = window.matchMedia('(max-width: 640px)').matches;
    const render = params.get('render') || (esMovil ? 'luma' : 'colmap');
    let escenas;
    try {
        escenas = (await (await fetch(SCENES_CONFIG_URL)).json()).scenes || [];
    } catch {
        return;
    }
    const delSendero = escenas.filter(s => s.zona && s.version && s.render && s.sogUrl)
        .sort((a, b) => a.order - b.order);
    const actual = delSendero.find(s => s.render === render);
    if (!actual) return;

    const zonas = [...new Set(delSendero.map(s => s.zona))];
    const versiones = delSendero.filter(s => s.zona === actual.zona).map(s => s.version);

    const armar = clase => {
        const contenedor = document.createElement('div');
        contenedor.className = 'selector-sendero ' + clase;
        contenedor.appendChild(grupo('Zona del sendero', zonas, actual.zona, zona => {
            const misma = delSendero.find(s => s.zona === zona && s.version === actual.version);
            irA((misma || delSendero.find(s => s.zona === zona)).render);
        }));
        // Con una sola versión por zona un grupo de un botón no deja elegir nada.
        if (versiones.length > 1) {
            contenedor.appendChild(grupo('Versión de la reconstrucción', versiones, actual.version, version => {
                irA(delSendero.find(s => s.zona === actual.zona && s.version === version).render);
            }));
        }
        return contenedor;
    };

    // PC: dentro de la barra superior, antes del conmutador de técnica.
    const barra = document.querySelector('.command-bar-right');
    if (barra) {
        const deckTecnica = barra.querySelector('.render-toggle-deck');
        // En el sendero, COLMAP / Luma del parque no aplican: se ocultan esos dos botones
        // y queda el de sonido ambiental.
        if (deckTecnica) {
            deckTecnica.querySelectorAll('.render-btn[data-render]').forEach(b => { b.hidden = true; });
        }
        barra.insertBefore(armar('selector-sendero-pc'), deckTecnica || barra.firstChild);
    }

    // Celular (menos de 640 px): la barra de PC se oculta entera, así que el selector
    // va también debajo de la píldora del título de la barra móvil.
    const barraMovil = document.getElementById('mobile-top-bar');
    if (barraMovil) {
        barraMovil.classList.add('con-selector-sendero');
        barraMovil.appendChild(armar('selector-sendero-movil'));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarSelectorSendero);
} else {
    montarSelectorSendero();
}
