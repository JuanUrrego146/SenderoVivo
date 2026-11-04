/*
 * Selector del sendero real: zona (Cumbre, Tramo 1, Tramo 2) y versión de la
 * reconstrucción (Nuestra, Luma, Polycam), para recorrer cada tramo y comparar
 * las técnicas en el mismo lugar.
 *
 * Se arma solo con los campos `zona` y `version` de config/scenes.json: agregar
 * una versión o una zona no toca código. Aparece únicamente cuando ?render= abre
 * una escena del sendero; en el parque de prueba sigue el conmutador COLMAP / Luma.
 * Cambiar de zona conserva la versión si esa zona la tiene.
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
    const render = new URLSearchParams(window.location.search).get('render');
    if (!render) return;
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

    const contenedor = document.createElement('div');
    contenedor.className = 'selector-sendero';
    contenedor.appendChild(grupo('Zona del sendero', zonas, actual.zona, zona => {
        const misma = delSendero.find(s => s.zona === zona && s.version === actual.version);
        irA((misma || delSendero.find(s => s.zona === zona)).render);
    }));
    contenedor.appendChild(grupo('Versión de la reconstrucción', versiones, actual.version, version => {
        irA(delSendero.find(s => s.zona === actual.zona && s.version === version).render);
    }));

    const barra = document.querySelector('.command-bar-right');
    const deckTecnica = barra && barra.querySelector('.render-toggle-deck');
    if (!barra) return;
    // En el sendero, COLMAP / Luma del parque no aplican: se ocultan esos dos botones
    // y queda el de sonido ambiental.
    if (deckTecnica) {
        deckTecnica.querySelectorAll('.render-btn[data-render]').forEach(b => { b.hidden = true; });
    }
    barra.insertBefore(contenedor, deckTecnica || barra.firstChild);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarSelectorSendero);
} else {
    montarSelectorSendero();
}
