/* Configuración de Tailwind del cascarón de Eybar (compilado a estático). */
module.exports = {
    content: ['./index.html', './src/ui/shell.js', './design/interfaz/original-tailwind/index.html', './design/interfaz/original-tailwind/app.js'],
    theme: {
        extend: {
            colors: {
                emerald: { 400: '#34d399', 500: '#10b981', 900: '#064e3b', 950: '#022c22' },
                glass: {
                    bg: 'rgba(15, 23, 42, 0.65)',
                    border: 'rgba(255, 255, 255, 0.12)',
                    active: 'rgba(52, 211, 153, 0.2)'
                }
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
                mono: ['"Fira Code"', 'monospace']
            }
        }
    },
    corePlugins: { preflight: false }
};
