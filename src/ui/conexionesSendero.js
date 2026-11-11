/*
 * Paso de una zona del sendero a la siguiente (Tramo 2, Tramo 1, Cumbre), para recorrerlo
 * completo sin usar el selector.
 *
 * Las conexiones se declaran en config/scenes.json, en `trail.conexiones`, por zona:
 *   "Tramo 1": [{ "en": "fin", "zona": "Cumbre", "llegada": "fin", "texto": "Subir a la Cumbre" }]
 * `en` es el extremo del trazado donde aparece el botón ("inicio" o "fin"), `zona` a dónde
 * lleva y `llegada` el extremo de esa zona donde arranca el visitante. Al cambiar se conserva
 * la versión de la reconstrucción si la zona de destino la tiene. Si la escena de destino solo
 * admite caminar hacia adelante (forwardOnly), la llegada se pasa a su inicio.
 *
 * Solo lee el estado del recorrido (window.senderoTour): no mueve la cámara ni toca el motor.
 */
const SCENES_CONFIG_URL = 'config/scenes.json';
const CERCA_M = 1.5;          // a esta distancia del extremo aparece el botón

async function montarConexiones() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('sog') || params.has('editor')) return;
    const render = params.get('render');
    if (!render) return;
    let config;
    try {
        config = await (await fetch(SCENES_CONFIG_URL)).json();
    } catch {
        return;
    }
    const escenas = (config.scenes || []).filter(s => s.zona && s.version && s.render && s.sogUrl)
        .sort((a, b) => a.order - b.order);
    const actual = escenas.find(s => s.render === render);
    const conexiones = actual && config.trail?.conexiones?.[actual.zona];
    if (!conexiones || !conexiones.length) return;

    // Version preferida: la ultima que el visitante vio y que no fue un reemplazo. Si una zona no
    // la tiene (se cae a otra), al volver a una zona que si la tiene se recupera.
    let preferida = actual.version;
    try {
        const guardada = sessionStorage.getItem('sv_version_preferida');
        const fueReemplazo = sessionStorage.getItem('sv_version_reemplazo') === actual.render;
        if (guardada && fueReemplazo) preferida = guardada;
        else sessionStorage.setItem('sv_version_preferida', actual.version);
        sessionStorage.removeItem('sv_version_reemplazo');
    } catch (e) {}

    const destinoDe = conexion => {
        const escena = escenas.find(s => s.zona === conexion.zona && s.version === preferida)
            || escenas.find(s => s.zona === conexion.zona);
        if (!escena) return null;
        const llegada = escena.forwardOnly ? 'inicio' : (conexion.llegada || 'inicio');
        return { escena, llegada };
    };

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'conexion-sendero';
    boton.hidden = true;
    document.body.appendChild(boton);
    let vigente = null;
    boton.addEventListener('click', () => {
        if (!vigente) return;
        try {
            sessionStorage.setItem('sv_exploring', 'true');
            sessionStorage.setItem('sv_version_preferida', preferida);
            if (vigente.escena.version !== preferida) sessionStorage.setItem('sv_version_reemplazo', vigente.escena.render);
        } catch (e) {}
        const p = new URLSearchParams(window.location.search);
        p.set('render', vigente.escena.render);
        p.set('llegada', vigente.llegada);
        p.delete('sog');
        window.location.search = p.toString();
    });

    // Quien acaba de llegar por un extremo no ve ahi el boton de regreso hasta que se aleja y vuelve.
    let extremoDeLlegada = params.get('llegada');

    setInterval(() => {
        const tour = window.senderoTour;
        const largo = tour?.trailPath?.isUsable ? tour.trailPath.totalLength() : 0;
        const lobby = document.getElementById('trail-lobby');
        const explorando = !lobby || lobby.classList.contains('lobby-hidden');
        let mostrar = null;
        if (largo > 0 && explorando) {
            const d = tour.state.distance;
            const extremo = d >= largo - CERCA_M ? 'fin' : (d <= CERCA_M ? 'inicio' : null);
            if (extremo !== extremoDeLlegada) extremoDeLlegada = null;
            const conexion = extremo && !extremoDeLlegada && conexiones.find(c => c.en === extremo);
            const destino = conexion && destinoDe(conexion);
            if (destino) mostrar = { ...destino, texto: conexion.texto || ('Ir a ' + conexion.zona) };
        }
        vigente = mostrar;
        if (mostrar) {
            if (boton.textContent !== mostrar.texto) boton.textContent = mostrar.texto;
            boton.hidden = false;
        } else {
            boton.hidden = true;
        }
    }, 400);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarConexiones);
} else {
    montarConexiones();
}
