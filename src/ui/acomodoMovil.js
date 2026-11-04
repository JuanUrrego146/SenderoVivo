/*
 * Acomodo de la parte de abajo en celular (menos de 640 px).
 *
 * La tarjeta "Detalles del sendero" iba a una altura fija sobre la barra de
 * navegación (58 px), pero la barra mide más (72 px en un celular de 390 px y más
 * en iPhone, con la zona segura de abajo), así que la tarjeta quedaba medio tapada.
 * Aquí se mide lo que la barra ocupa desde el borde inferior de su contenedor y se
 * publica en --sv-tope-nav-movil; glass.css pone la tarjeta 8 px encima. Avisa con
 * 'sv:acomodo-movil' para que el joystick (JoystickView) se recoloque encima de ella.
 */
function acomodar() {
    const nav = document.getElementById('shell-nav-mobile');
    if (!nav || !nav.offsetParent) return;      // oculta: en PC no hay nada que acomodar
    const contenedor = nav.offsetParent.getBoundingClientRect();
    const tope = Math.round(contenedor.bottom - nav.getBoundingClientRect().top);
    if (tope <= 0) return;
    document.documentElement.style.setProperty('--sv-tope-nav-movil', tope + 'px');
    window.dispatchEvent(new Event('sv:acomodo-movil'));
}

function montar() {
    acomodar();
    window.addEventListener('resize', acomodar);
    window.addEventListener('orientationchange', acomodar);
    const nav = document.getElementById('shell-nav-mobile');
    if (nav && 'ResizeObserver' in window) new ResizeObserver(acomodar).observe(nav);
    // Las fuentes web cambian el alto de la barra al terminar de cargar.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(acomodar);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
} else {
    montar();
}
