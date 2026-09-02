/*
 * ShellView
 *
 * Vista principal de la interfaz.
 *
 * RESPONSABILIDADES:
 * - Pintar y actualizar elementos visuales generales.
 * - Mostrar y ocultar paneles.
 * - Mostrar y ocultar el bottom sheet.
 * - Mostrar y ocultar el panel de búsqueda.
 * - Cambiar estados visuales generales de navegación.
 *
 * NO RESPONSABILIDADES:
 * - Leer JSON.
 * - Filtrar datos.
 * - Decidir cuándo ocurre una acción.
 * - Ejecutar lógica del recorrido.
 * - Modificar tour.distance.
 * - Gestionar POIs.
 * - Crear o posicionar hotspots.
 * - Gestionar el HUD específico.
 * - Reproducir audio.
 * - Abrir modelos 3D.
 */

export class ShellView {

    constructor() {

        this.root =
            document.body;

    }


    /*
     * =========================================================
     * UTILIDADES
     * =========================================================
     */

    /**
     * Busca un elemento de la interfaz por su ID.
     */
    get(id) {

        return document.getElementById(id);

    }


    /**
     * Cambia una clase de un elemento.
     *
     * La View solamente modifica la presentación.
     */
    toggleClass(
        id,
        className,
        enabled
    ) {

        const element =
            this.get(id);

        if (!element) {
            return;
        }

        element.classList.toggle(
            className,
            enabled
        );

    }


    /*
     * =========================================================
     * BOTTOM SHEET
     * =========================================================
     */

    /**
     * Muestra la ficha inferior.
     */
    showBottomSheet() {

        const sheet =
            this.get('bottom-sheet');

        if (!sheet) {
            return;
        }

        sheet.classList.remove(
            'translate-y-full'
        );

    }


    /**
     * Oculta la ficha inferior.
     */
    hideBottomSheet() {

        const sheet =
            this.get('bottom-sheet');

        if (!sheet) {
            return;
        }

        sheet.classList.add(
            'translate-y-full'
        );

    }


    /**
     * Cambia el contenido visual de la ficha inferior.
     *
     * ShellView no decide qué contenido mostrar.
     * Recibe el HTML ya preparado.
     */
    setBottomSheetContent(html) {

        const content =
            this.get('sheet-content');

        if (!content) {
            return;
        }

        content.innerHTML =
            html;

    }


    /*
     * =========================================================
     * PANELES
     * =========================================================
     */

    /**
     * Muestra un panel general.
     */
    showPanel(id) {

        const panel =
            this.get(id);

        if (!panel) {
            return;
        }

        panel.classList.remove(
            'hidden'
        );

        panel.classList.add(
            'flex'
        );

    }


    /**
     * Oculta un panel general.
     */
    hidePanel(id) {

        const panel =
            this.get(id);

        if (!panel) {
            return;
        }

        panel.classList.add(
            'hidden'
        );

        panel.classList.remove(
            'flex'
        );

    }


    /*
     * =========================================================
     * TAB PANEL
     * =========================================================
     */

    /**
     * Muestra el panel de pestañas.
     */
    showTabPanel() {

        this.showPanel(
            'tab-panel-container'
        );

    }


    /**
     * Oculta el panel de pestañas.
     */
    hideTabPanel() {

        this.hidePanel(
            'tab-panel-container'
        );

    }


    /**
     * Cambia el contenido visual del panel de pestañas.
     *
     * No decide qué pestaña está activa.
     */
    setTabPanelContent(html) {

        const content =
            this.get('tab-panel-content');

        if (!content) {
            return;
        }

        content.innerHTML =
            html;

    }


    /**
     * Actualiza visualmente el estado
     * de los botones de navegación.
     *
     * La decisión de qué pestaña activar
     * pertenece al controlador.
     */
    setActiveTab(tab) {

        const tabs = [
            'trail',
            'catalog',
            'audio',
            'quest'
        ];

        tabs.forEach(
            currentTab => {

                const button =
                    this.get(
                        `nav-${currentTab}`
                    );

                if (!button) {
                    return;
                }

                if (
                    currentTab === tab
                ) {

                    button.className =
                        'flex flex-col items-center gap-0.5 text-emerald-400 font-medium touch-manipulation cursor-pointer transition hover:text-emerald-300';

                } else {

                    button.className =
                        'flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer';

                }

            }
        );

    }


    /*
     * =========================================================
     * BÚSQUEDA
     * =========================================================
     */

    /**
     * Muestra el modal de búsqueda.
     */
    showSearchModal() {

        const modal =
            this.get('search-modal');

        if (!modal) {
            return;
        }

        modal.classList.remove(
            'hidden'
        );

        modal.classList.add(
            'flex'
        );

    }


    /**
     * Oculta el modal de búsqueda.
     */
    hideSearchModal() {

        const modal =
            this.get('search-modal');

        if (!modal) {
            return;
        }

        modal.classList.add(
            'hidden'
        );

        modal.classList.remove(
            'flex'
        );

    }


    /**
     * Enfoca el campo de búsqueda.
     */
    focusSearchInput() {

        const input =
            this.get('search-input');

        if (!input) {
            return;
        }

        input.focus();

    }


    /**
     * Actualiza visualmente los resultados
     * de una búsqueda.
     *
     * El filtrado ya debe haber sido realizado
     * por el controlador.
     */
    setSearchResults(html) {

        const results =
            this.get('search-results');

        if (!results) {
            return;
        }

        results.innerHTML =
            html;

    }


    /*
     * =========================================================
     * TEXTO GENERAL
     * =========================================================
     */

    /**
     * Cambia un texto visible de la interfaz.
     */
    setText(id, text) {

        const element =
            this.get(id);

        if (!element) {
            return;
        }

        element.innerText =
            text;

    }


    /**
     * Cambia contenido HTML de un elemento.
     *
     * Se utiliza solamente cuando la View
     * recibe contenido ya preparado.
     */
    setHTML(id, html) {

        const element =
            this.get(id);

        if (!element) {
            return;
        }

        element.innerHTML =
            html;

    }


    /*
     * =========================================================
     * ESTADOS VISUALES
     * =========================================================
     */

    /**
     * Activa o desactiva visualmente un elemento.
     */
    setVisible(
        id,
        visible
    ) {

        const element =
            this.get(id);

        if (!element) {
            return;
        }

        element.style.display =
            visible
                ? ''
                : 'none';

    }

}