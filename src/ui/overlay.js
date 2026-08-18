/*
 * Overlay de carga, error y ayuda del visor.
 *
 * Es la garantía visible de RNF-007: nunca una pantalla en negro. Todo estado
 * (cargando, error, sin escena) informa qué pasa y qué hacer. La escena solo
 * se revela cuando ya se ve bien.
 *
 * Módulo de interfaz: no sabe nada del motor. Solo toca el DOM.
 */

const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlay-content');
const hint = document.getElementById('hint');

function showOverlay(html) {
    overlay.hidden = false;
    overlayContent.innerHTML = html;
}

export function showLoading() {
    showOverlay(`
        <div class="spinner"></div>
        <h1>Preparando el recorrido…</h1>
        <p id="carga-detalle">Descargando la escena</p>
        <div class="barra"><div class="barra-fill" id="carga-barra"></div></div>
        <p class="nota">La primera visita descarga la escena completa; después queda en caché.</p>
    `);
}

/** Actualiza la barra de progreso de la descarga (0 a 100). */
export function setLoadingProgress(porcentaje, texto) {
    const barra = document.getElementById('carga-barra');
    const detalle = document.getElementById('carga-detalle');
    if (barra) barra.style.width = Math.max(2, Math.min(100, porcentaje)) + '%';
    if (detalle && texto) detalle.textContent = texto;
}

export function showPlaceholder(expectedUrl, sampleUrl) {
    showOverlay(`
        <h1>Aún no hay ninguna escena capturada</h1>
        <p>Genera la carpeta de la escena y recárgala:
           <code>npx @playcanvas/splat-transform escena.ply ${expectedUrl}</code></p>
        <p>El pipeline completo está en <code>docs/05-produccion-de-escenas.md</code>.</p>
        <p>¿Quieres probar el visor mientras tanto?
           <a href="?sog=${sampleUrl}">Abrir la escena de muestra de PlayCanvas</a>
           (requiere internet).</p>
    `);
}

export function showError(message) {
    showOverlay(`
        <h1>⚠ No se pudo cargar la escena</h1>
        <p>${message}</p>
        <p><button id="retry">Reintentar</button></p>
    `);
    document.getElementById('retry').addEventListener('click', () => window.location.reload());
}

/** Ayuda en pantalla, abajo a la izquierda. */
export function showHint(html) {
    hint.innerHTML = html;
    hint.hidden = false;
}

/** Desvanece el overlay: la escena ya está lista detrás. */
export function hideOverlay() {
    overlay.classList.add('desvanecer');
    setTimeout(() => {
        overlay.hidden = true;
        overlay.classList.remove('desvanecer');
    }, 420);
}
