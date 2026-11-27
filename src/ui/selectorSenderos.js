/*
 * Elegir sendero: los senderos de la EAAB en los Cerros Orientales, por sector (Norte, Centro,
 * Sur), con un mapa esquemático y una tarjeta por sendero.
 *
 * Se arma solo con config/senderos.json (RNF-009): agregar una entrada la muestra sin tocar
 * código. Los senderos «disponible» traen sus cifras y se pueden recorrer; los «proximamente»
 * salen apagados, con la nota de reserva y sin cifras, y no se pueden abrir (tocarlos solo los
 * selecciona, sin errores).
 *
 * El mapa es la imagen assets/ilustraciones/selector-mapa.webp (el hueco «selector-mapa», que
 * llena llenarHuecosDeIlustracion de shell.js) con un punto HTML por sendero, puesto con el
 * mapa.{x,y} de la entrada en porcentajes de la imagen. Sin esa imagen, los puntos quedan sobre
 * un fondo liso, en el mismo lugar.
 *
 * Es un script clásico que usa lo que define shell.js (cargarSenderos, textosDelSendero,
 * startTrailExploration, llenarHuecosDeIlustracion). El selector de zonas de dentro del recorrido (selectorSendero.js) no
 * tiene que ver con esto. Los estilos viven en styles/glass.css con los tokens de la dirección.
 */
(() => {
    const SECTORES = [
        ['norte', 'Norte'],
        ['centro', 'Centro'],
        ['sur', 'Sur']
    ];
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const ILUSTRACIONES = 'assets/ilustraciones/';

    let pantalla = null;
    let datos = null;
    let seleccionado = null;

    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function icono(nombre) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'ic');
        svg.setAttribute('aria-hidden', 'true');
        const uso = document.createElementNS(SVG_NS, 'use');
        uso.setAttribute('href', `${ILUSTRACIONES}iconos.svg#${nombre}`);
        svg.appendChild(uso);
        return svg;
    }

    function nombreDelSector(clave) {
        return (SECTORES.find(([k]) => k === clave) || [clave, clave])[1];
    }

    function disponible(sendero) {
        return sendero.estado === 'disponible';
    }

    function seleccionar(id, enfocar = false) {
        seleccionado = id;
        const elegido = (datos?.senderos || []).find((s) => s.id === id);
        const pie = pantalla.querySelector('.senderos-mapa-pie');
        if (pie && elegido) pie.textContent = `${elegido.nombre} · Sector ${nombreDelSector(elegido.sector)}${disponible(elegido) ? '' : ' · Próximamente'}`;
        pantalla.querySelectorAll('[data-sendero]').forEach((el) => {
            const activo = el.dataset.sendero === id;
            el.classList.toggle('seleccionado', activo);
            if (el.classList.contains('senderos-punto')) el.setAttribute('aria-pressed', String(activo));
        });
        if (enfocar) {
            const tarjeta = pantalla.querySelector(`.sendero-tarjeta[data-sendero="${CSS.escape(id)}"]`);
            if (tarjeta) tarjeta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function tarjeta(sendero, sectorNombre) {
        const activo = disponible(sendero);
        const el = crear('article', 'sendero-tarjeta' + (activo ? '' : ' sendero-tarjeta--apagado'));
        el.dataset.sendero = sendero.id;
        el.tabIndex = 0;
        if (!activo) el.setAttribute('aria-disabled', 'true');
        el.append(crear('h4', 'sendero-nombre', sendero.nombre));
        el.append(crear('p', 'sendero-sector', activo
            ? `Sector ${sectorNombre} · Cerros Orientales · Bogotá`
            : `Sector ${sectorNombre}`));

        if (activo) {
            const textos = typeof textosDelSendero === 'function' ? textosDelSendero(sendero.datos) : null;
            if (textos) {
                const lista = crear('ul', 'sendero-cifras');
                for (const texto of [textos.recorrido, textos.subida, textos.altitud, textos.visita]) {
                    lista.append(crear('li', '', texto));
                }
                el.append(lista);
            }
            const entrar = crear('button', 'sendero-entrar');
            entrar.type = 'button';
            entrar.append(icono('sigue'), crear('span', '', 'Entrar al recorrido'));
            entrar.addEventListener('click', (evento) => {
                evento.stopPropagation();
                entrarAlRecorrido(sendero);
            });
            el.append(entrar);
        } else {
            el.append(crear('span', 'sendero-etiqueta', 'Próximamente'));
            el.append(crear('p', 'sendero-nota', sendero.nota || datos.reservaNota || ''));
        }
        el.addEventListener('click', () => seleccionar(sendero.id));
        el.addEventListener('keydown', (evento) => {
            if (evento.target === el && (evento.key === 'Enter' || evento.key === ' ')) {
                evento.preventDefault();
                seleccionar(sendero.id);
            }
        });
        return el;
    }

    /** El mapa es la ilustración selector-mapa con un punto HTML por sendero, en porcentajes de la imagen. */
    function mapa(senderos) {
        const figura = crear('figure', 'senderos-mapa');
        figura.setAttribute('role', 'group');
        figura.setAttribute('aria-label', 'Mapa esquemático de los senderos, sin escala');
        const dibujo = crear('div', 'senderos-mapa-dibujo');
        const hueco = crear('div', 'hueco-ilustracion');
        hueco.dataset.ilustracion = 'selector-mapa';
        dibujo.append(hueco);
        for (const sendero of senderos) {
            const x = Number(sendero.mapa?.x);
            const y = Number(sendero.mapa?.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            const punto = crear('button', 'senderos-punto' + (disponible(sendero) ? '' : ' senderos-punto--apagado'));
            punto.type = 'button';
            punto.dataset.sendero = sendero.id;
            punto.style.left = `${(Math.max(0, Math.min(1, x)) * 100).toFixed(1)}%`;
            punto.style.top = `${(Math.max(0, Math.min(1, y)) * 100).toFixed(1)}%`;
            punto.setAttribute('aria-label', disponible(sendero) ? sendero.nombre : `${sendero.nombre}, próximamente`);
            punto.setAttribute('aria-pressed', 'false');
            punto.title = sendero.nombre;
            punto.addEventListener('click', () => seleccionar(sendero.id, true));
            dibujo.append(punto);
        }
        figura.append(dibujo);
        figura.append(crear('figcaption', 'senderos-mapa-pie', ''));
        return figura;
    }

    function armar() {
        const senderos = Array.isArray(datos.senderos) ? datos.senderos : [];
        pantalla.replaceChildren();

        const cabecera = crear('header', 'senderos-cabecera');
        const titulos = crear('div', 'senderos-titulos');
        const titulo = crear('h2', 'senderos-titulo', 'Elegir sendero');
        titulo.id = 'senderos-titulo';
        titulos.append(titulo, crear('p', 'senderos-subtitulo', 'Los senderos del Acueducto en los Cerros Orientales de Bogotá'));
        const volver = crear('button', 'senderos-cerrar');
        volver.type = 'button';
        volver.setAttribute('aria-label', 'Volver');
        volver.append(icono('cerrar'), crear('span', '', 'Volver'));
        volver.addEventListener('click', cerrar);
        cabecera.append(titulos, volver);

        const cuerpo = crear('div', 'senderos-cuerpo');
        cuerpo.append(mapa(senderos));

        const sectores = crear('div', 'senderos-sectores');
        for (const [clave, nombre] of SECTORES) {
            const delSector = senderos.filter((s) => s.sector === clave);
            if (!delSector.length) continue;
            const grupo = crear('section', 'senderos-sector');
            grupo.append(crear('h3', 'senderos-sector-nombre', `Sector ${nombre}`));
            const tarjetas = crear('div', 'senderos-tarjetas');
            for (const sendero of delSector) tarjetas.append(tarjeta(sendero, nombre));
            grupo.append(tarjetas);
            sectores.append(grupo);
        }
        cuerpo.append(sectores);

        const pie = crear('p', 'senderos-pie', datos.reservaNota
            ? `${datos.reservaNota}. Los senderos que aún no están en la app se muestran apagados.`
            : '');
        pantalla.append(cabecera, cuerpo, pie);
        if (typeof llenarHuecosDeIlustracion === 'function') llenarHuecosDeIlustracion(pantalla);
        const primero = senderos.find(disponible) || senderos[0];
        if (primero) seleccionar(primero.id);
    }

    async function abrir() {
        pantalla = pantalla || document.getElementById('senderos-lista');
        if (!pantalla) return;
        try {
            datos = datos || await cargarSenderos();
        } catch (error) {
            console.warn('No se pudieron leer los senderos (config/senderos.json):', error);
            return;
        }
        // Se arma en cada apertura: una entrada agregada a la lista cargada aparece sin tocar código.
        armar();
        pantalla.hidden = false;
        // Un cuadro después, para que la transición de entrada se vea.
        requestAnimationFrame(() => pantalla.classList.add('senderos--visible'));
        const volver = pantalla.querySelector('.senderos-cerrar');
        if (volver) volver.focus({ preventScroll: true });
    }

    function cerrar() {
        if (!pantalla || pantalla.hidden) return;
        pantalla.classList.remove('senderos--visible');
        setTimeout(() => { pantalla.hidden = true; }, 320);
    }

    function entrarAlRecorrido(sendero) {
        if (!disponible(sendero)) return;
        // Desde la portada empieza el recorrido como siempre; desde dentro del recorrido se
        // vuelve a la escena que ya está cargada, sin recargarla.
        const lobby = document.getElementById('trail-lobby');
        const portadaVisible = Boolean(lobby && !lobby.classList.contains('lobby-hidden'));
        cerrar();
        if (portadaVisible && typeof startTrailExploration === 'function') startTrailExploration(false);
    }

    window.mostrarSenderos = abrir;
    window.abrirSenderos = () => {
        if (typeof closeBottomSheet === 'function') closeBottomSheet();
        if (typeof closeTabPanel === 'function') closeTabPanel();
        if (typeof closeBiodiversityAlbum === 'function') closeBiodiversityAlbum();
        return abrir();
    };

    window.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && pantalla && !pantalla.hidden) cerrar();
    });
})();
