/*
 * Configuración de Tailwind del cascarón (compilado a estático en styles/tailwind.css).
 *
 * CLAVE: las escalas de color de Tailwind que usa el marcado (slate, emerald,
 * teal, amber, sky) están REMAPEADAS a la paleta documentada del proyecto
 * (docs/06-contenido-de-la-experiencia.md §B.2). Así el diseño de Eybar
 * conserva su estructura pero pinta con la identidad del bosque, no con los
 * colores por defecto de Tailwind. El ámbar y el rosa no existen en la
 * identidad: caen a gris claro y verde (RNF-006 pide forma además de color).
 *
 * Si añades clases nuevas en index.html o src/ui/shell.js, recompila:
 *   npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind.in.css -o styles/tailwind.css --minify
 */
module.exports = {
    content: ['./index.html', './src/ui/shell.js', './design/interfaz/original-tailwind/index.html', './design/interfaz/original-tailwind/app.js'],
    theme: {
        extend: {
            colors: {
                slate: {
                    100: '#EDF1EF',   // --sv-gray-050
                    200: '#B9C1BC',   // --sv-gray-200
                    300: '#9AA39E',
                    400: '#6E7873',   // --sv-gray-400
                    500: '#57605B',
                    600: '#3A423E',   // --sv-gray-600
                    700: '#2A322D',
                    800: '#1B211E',   // --sv-gray-800
                    900: '#141917',
                    950: '#0E1210'    // --sv-black-900
                },
                emerald: {
                    300: '#6FCF97',   // --sv-green-300
                    400: '#6FCF97',
                    500: '#2E8B57',   // --sv-green-500
                    600: '#27794C',
                    900: '#1F5D3A',   // --sv-green-700
                    950: '#143D28'
                },
                teal: { 400: '#4FA3A5' },   // --sv-water-400
                sky: { 400: '#4FA3A5' },    // el azul de fauna cae al acento del agua
                amber: { 400: '#B9C1BC', 500: '#B9C1BC' },  // sin amarillo en la identidad
                pink: { 400: '#6FCF97' },
                glass: {
                    bg: 'rgba(14, 18, 16, 0.62)',
                    border: 'rgba(237, 241, 239, 0.12)',
                    active: 'rgba(111, 207, 151, 0.22)'
                }
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
                mono: ['"Fira Code"', 'ui-monospace', 'monospace']
            }
        }
    },
    corePlugins: { preflight: false }
};
