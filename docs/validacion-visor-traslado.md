# Validación del visor tras el traslado

## Lista de comprobaciones

Antes de cerrar el traslado, comprobar en el visor actual y repetir en el visor refactorizado:

- [ ] La escena termina de cargar y el canvas ocupa la ventana sin tapar el cascarón.
- [ ] Los filtros `Todo`, `Flora` y `Fauna` actualizan los puntos mostrados.
- [ ] Las pestañas `Sendero`, `Especies`, `Sonidos` y `Bitácora` abren su panel y se pueden cerrar.
- [ ] El recorrido muestra sus datos iniciales y las flechas o controles siguen disponibles.
- [ ] El selector `COLMAP` / `Luma` conserva su estado y permite cambiar de técnica.
- [ ] La consola no muestra errores nuevos durante la carga ni al recorrer la lista anterior.
- [ ] La composición no presenta cortes, solapamientos ni controles inutilizables en escritorio ni en celular.

## Resultado del visor refactorizado

Fecha: 08/09/2026  
URL: `http://localhost:3000/`  
Rama: `dev/david-beltran`, commit `4e5a509`

### Escritorio

Estado: **pasado** en navegador de escritorio mediante Playwright.

- La escena terminó de cargar; hubo un canvas y el overlay de carga desapareció.
- Los filtros mostraron el contenido esperado: `Flora` incluyó `Aliso` y `Fauna` incluyó `Cusumbo andino`.
- `Especies` abrió `Guía de puntos del sendero`; `Sonidos` abrió su panel; `Bitácora` abrió su panel; todos se cerraron.
- El cascarón mostró los datos iniciales: `0 m`, `+0 m`, `0 %` y `0 de 8 puntos vistos`.
- Se mantuvieron visibles las opciones `COLMAP` y `Luma`.
- Diferencia observada: mientras un panel está abierto, intercepta los clics del menú inferior. Es el comportamiento modal esperado; hay que cerrarlo antes de cambiar de pestaña.
- Consola: **sin errores** (`console.error` y `pageerror` vacíos durante la carga y la interacción).

### Celular

Estado: **emulación móvil pasada; teléfono físico pendiente**.

- Se probó a 390 × 844 px, con canvas de 312 × 675 px y sin overflow horizontal.
- En móvil los filtros se agrupan bajo `Filtros del sendero`; al abrirlos funcionan `Flora`, `Fauna` y `Todo`.
- `Especies` abrió `Guía de puntos del sendero` y el panel se pudo cerrar.
- La producción mostró el mismo flujo móvil y la misma composición que el visor refactorizado.
- La consola no mostró errores. Sí apareció la advertencia existente del `SortWorker`: `166 splats lost due to sortKey overflow`.
- La emulación permite comprobar el breakpoint y la selección de la variante liviana, pero no equivale a una prueba en un celular real.
- No se marca como completada la comprobación física hasta abrir la URL desplegada desde un teléfono y repetir la lista.

## Diferencias y pendientes

- No se encontraron errores nuevos de consola en la pasada de escritorio.
- No se encontraron diferencias funcionales entre producción y refactor en filtros, paneles, datos iniciales, selector de técnica o composición móvil dentro de las pasadas realizadas.
- La única diferencia de interacción observada es el bloqueo normal del menú mientras hay un panel modal abierto.
- En móvil los filtros no son botones permanentes: se muestran al abrir `Filtros del sendero`. Esto coincide con producción.
- Falta la evidencia de hardware real para cerrar la validación móvil.