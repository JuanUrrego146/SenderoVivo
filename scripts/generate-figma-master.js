const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// 1. Leer archivos de estilos del proyecto
const tokensCss = fs.readFileSync(path.join(baseDir, 'styles/tokens.css'), 'utf8');
const tailwindCss = fs.readFileSync(path.join(baseDir, 'styles/tailwind.css'), 'utf8');
const glassCss = fs.readFileSync(path.join(baseDir, 'styles/glass.css'), 'utf8');

// 2. Leer imágenes locales como base64
const heroBgPath = path.join(baseDir, 'assets/hero-bg.webp');
const cascadaBgPath = path.join(baseDir, 'assets/quebrada-cascada.webp');

const heroBgBase64 = fs.existsSync(heroBgPath) 
    ? `data:image/webp;base64,${fs.readFileSync(heroBgPath).toString('base64')}`
    : 'https://dev-eybar-viasus.senderovivo.pages.dev/assets/hero-bg.webp';

const cascadaBgBase64 = fs.existsSync(cascadaBgPath)
    ? `data:image/webp;base64,${fs.readFileSync(cascadaBgPath).toString('base64')}`
    : 'https://dev-eybar-viasus.senderovivo.pages.dev/assets/quebrada-cascada.webp';

// 3. Catálogo de los 8 POIs / Especies reales de Sendero Vivo
const poisData = [
    {
        id: "poi-colibri-chillon",
        category: "fauna",
        name: "Colibrí chillón",
        scientific: "Colibri coruscans",
        altitude: "1.700 – 3.500 msnm",
        desc: "Colibrí de verde iridiscente con parche azul violeta en la garganta. Ave insignia del sendero Quebrada La Vieja.",
        icon: "fa-dove",
        badgeClass: "badge-fauna",
        badgeText: "Fauna Silvestre",
        color: "#fbbf24"
    },
    {
        id: "poi-helecho-arborescente",
        category: "flora",
        name: "Helecho arborescente",
        scientific: "Cyathea caracasana",
        altitude: "2.600 – 3.200 msnm",
        desc: "Fábrica natural de humedad y niebla andina. Frondas gigantes en roseta que capturan el rocío de la cordillera.",
        icon: "fa-seedling",
        badgeClass: "badge-flora",
        badgeText: "Flora Altoandina",
        color: "#34d399"
    },
    {
        id: "poi-aliso",
        category: "flora",
        name: "Aliso",
        scientific: "Alnus acuminata",
        altitude: "2.600 – 3.200 msnm",
        desc: "Árbol nativo fijador de nitrógeno que estabiliza las riberas y cuencas hídricas de la quebrada.",
        icon: "fa-tree",
        badgeClass: "badge-flora",
        badgeText: "Flora Nativa",
        color: "#38bdf8"
    },
    {
        id: "poi-cusumbo",
        category: "fauna",
        name: "Cusumbo andino",
        scientific: "Nasuella olivacea",
        altitude: "2.650 – 3.250 msnm",
        desc: "Pequeño mamífero prociónido de hocico alargado y cola anillada que forrajea entre la hojarasca del sotobosque.",
        icon: "fa-paw",
        badgeClass: "badge-fauna",
        badgeText: "Fauna Silvestre",
        color: "#f59e0b"
    },
    {
        id: "poi-puente-madera",
        category: "patrimonio",
        name: "Puente de madera tradicional",
        scientific: "Infraestructura patrimonial",
        altitude: "2.712 msnm",
        desc: "Paso rústico tradicional sobre el cauce de la quebrada que marca el inicio del recorrido de alta montaña.",
        icon: "fa-bridge",
        badgeClass: "badge-patrimonio",
        badgeText: "Patrimonio",
        color: "#c084fc"
    },
    {
        id: "poi-pino",
        category: "flora",
        name: "Pino pátula",
        scientific: "Pinus patula",
        altitude: "2.600 – 3.100 msnm",
        desc: "Especie forestal introducida en reforestaciones históricas de los cerros orientales de Bogotá.",
        icon: "fa-tree",
        badgeClass: "badge-flora",
        badgeText: "Flora Introducida",
        color: "#34d399"
    },
    {
        id: "poi-golondrina-plomiza",
        category: "fauna",
        name: "Golondrina plomiza",
        scientific: "Orochelidon murina",
        altitude: "2.600 – 3.500 msnm",
        desc: "Avifauna insectívora andina de vuelo ágil y veloz sobre los claros y laderas abiertas de los cerros.",
        icon: "fa-dove",
        badgeClass: "badge-fauna",
        badgeText: "Fauna Silvestre",
        color: "#fbbf24"
    },
    {
        id: "poi-muro-antiguo",
        category: "patrimonio",
        name: "Muro colonial antiguo",
        scientific: "Estructura colonial andina",
        altitude: "2.780 msnm",
        desc: "Vestigios de mampostería colonial en piedra que delimitaban antiguos linderos de haciendas históricas.",
        icon: "fa-landmark",
        badgeClass: "badge-patrimonio",
        badgeText: "Patrimonio Histórico",
        color: "#c084fc"
    }
];

// Generar tarjetas para el álbum de biodiversidad
const albumGridHtml = poisData.map(poi => `
    <div class="album-species-card">
        <div class="album-species-header">
            <div class="album-species-thumb" style="color: ${poi.color}; background: rgba(56, 189, 248, 0.12); border-color: ${poi.color}40;">
                <i class="fa-solid ${poi.icon}"></i>
            </div>
            <div class="album-species-names">
                <h4 class="album-species-common">${poi.name}</h4>
                <p class="album-species-scientific">${poi.scientific}</p>
            </div>
        </div>
        <p class="album-species-body">${poi.desc}</p>
        <div class="album-species-footer">
            <span class="album-category-badge ${poi.badgeClass}">${poi.badgeText}</span>
            <div style="display: flex; gap: 6px;">
                <button type="button" class="album-btn-3d">
                    <i class="fa-solid fa-cube"></i> Ver 3D
                </button>
                <button type="button" class="album-btn-explore">
                    <span>Explorar</span>
                    <i class="fa-solid fa-arrow-right text-[9px]"></i>
                </button>
            </div>
        </div>
    </div>
`).join('\n');

// 4. Armar el HTML Maestro Completo
const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sendero Vivo · Todas las Interfaces para Figma (html.to.design)</title>
    <meta name="description" content="Recopilación completa de todas las interfaces, pantallas, modales y menús de Sendero Vivo (https://dev-eybar-viasus.senderovivo.pages.dev/) optimizada para importación a Figma en 1 solo crédito de html.to.design.">
    
    <!-- Tipografías oficiales de Sendero Vivo -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700&family=Quicksand:wght@400;500;600;700&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        /* ==========================================================================
           1. ESTILOS REALES DE SENDERO VIVO (tokens.css + tailwind.css + glass.css)
           ========================================================================== */
        ${tokensCss}

        ${tailwindCss}

        ${glassCss}

        /* Sobrescritura de imágenes de fondo con base64 para garantía 100% libre de rutas rotas */
        #trail-lobby, .hero-standalone-screen {
            background-image: url('${heroBgBase64}') !important;
            background-size: cover !important;
            background-position: center 65% !important;
        }

        #preparar-eco-banner, .eco-banner-standalone {
            background-image: url('${cascadaBgBase64}') !important;
            background-size: cover !important;
            background-position: center !important;
        }

        #preparar-map-img, .map-visual-standalone {
            background-image: url('${heroBgBase64}') !important;
            background-size: cover !important;
            background-position: center !important;
        }

        /* ==========================================================================
           2. LIENZO FIGMA ARTBOARDS (DISPOSICIÓN VISIBLE DE TODAS LAS PANTALLAS)
           ========================================================================== */
        body.figma-showcase-canvas {
            background-color: #060d17 !important;
            background-image: radial-gradient(rgba(56, 189, 248, 0.09) 1px, transparent 1px) !important;
            background-size: 24px 24px !important;
            min-width: 1540px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 40px 50px 140px 50px !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 70px !important;
            font-family: var(--sv-font-body) !important;
            color: var(--sv-text-primary) !important;
        }

        /* Sticky Toolbar para navegación en navegador */
        .figma-top-bar {
            position: sticky;
            top: 20px;
            z-index: 100000;
            background: rgba(11, 22, 34, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--sv-sky-border);
            border-radius: 20px;
            padding: 14px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 16px 48px rgba(0,0,0,0.7);
            width: 100%;
            max-width: 1440px;
            box-sizing: border-box;
        }

        .figma-brand-chip {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .figma-badge-pro {
            background: linear-gradient(135deg, #0284c7, #38bdf8);
            color: #04111d;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 6px 14px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .figma-nav-links {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .figma-jump-btn {
            background: rgba(14, 165, 233, 0.12);
            border: 1px solid var(--sv-sky-border);
            color: var(--sv-sky-hover);
            padding: 7px 14px;
            border-radius: 10px;
            font-size: 11.5px;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .figma-jump-btn:hover {
            background: var(--sv-sky-hover);
            color: #04111d;
            transform: translateY(-1px);
        }

        /* Artboard Container y Metadatos */
        .figma-artboard-screen {
            width: 100%;
            max-width: 1440px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            box-sizing: border-box;
        }

        .artboard-meta-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 8px;
        }

        .artboard-meta-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .artboard-pill-number {
            font-family: monospace;
            font-size: 11px;
            font-weight: 800;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid var(--sv-sky-border);
            color: var(--sv-sky-hover);
            padding: 4px 10px;
            border-radius: 6px;
            letter-spacing: 0.05em;
        }

        .artboard-meta-title {
            font-family: var(--sv-font-title);
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }

        .artboard-meta-dim {
            font-family: monospace;
            font-size: 12px;
            color: var(--sv-text-dim);
        }

        /* Frame Wrapper Desktop */
        .desktop-frame-box {
            width: 100%;
            height: 850px;
            border-radius: 28px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 25px 70px rgba(0,0,0,0.7);
            border: 1px solid var(--sv-sky-border);
            background: var(--sv-teal-deep);
            box-sizing: border-box;
        }

        /* Re-forzar visibilidad estática sin romper el diseño */
        .standalone-visible {
            position: relative !important;
            inset: auto !important;
            transform: none !important;
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            width: 100% !important;
            height: 100% !important;
        }

        /* Simulación de fondo montañoso 3D para el visor */
        .trail-3d-backdrop {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 25%, #0e2a44 0%, #061524 60%, #030a12 100%);
            overflow: hidden;
        }

        .trail-3d-backdrop svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0.55;
        }

        /* Hotspot estático en visor */
        .static-beacon-wrap {
            position: absolute;
            top: 48%;
            left: 54%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            z-index: 25;
        }

        .static-beacon-ring {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            border: 2px solid var(--sv-sky-hover);
            background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(2, 132, 199, 0.1) 70%);
            box-shadow: 0 0 24px rgba(56, 189, 248, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 20px;
        }

        .static-beacon-tooltip {
            background: rgba(11, 22, 34, 0.94);
            border: 1px solid var(--sv-sky-hover);
            border-radius: 10px;
            padding: 5px 12px;
            font-size: 11.5px;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }

        /* Two Columns Layout para Modales */
        .modal-duo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            width: 100%;
            max-width: 1440px;
        }

        @media (max-width: 1100px) {
            .modal-duo-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body class="figma-showcase-canvas">

    <!-- ==========================================================================
         BARRA SUPERIOR DE NAVEGACIÓN Y EXPORTACIÓN
         ========================================================================== -->
    <header class="figma-top-bar">
        <div class="figma-brand-chip">
            <span class="figma-badge-pro">
                <i class="fa-solid fa-gem"></i> Todo en 1 Importación
            </span>
            <div>
                <strong style="font-family: var(--sv-font-title); font-size: 17px; color: #ffffff; display: block;">Sendero Vivo · Todas las Interfaces de Usuario</strong>
                <span style="font-size: 11.5px; color: var(--sv-sky-hover);">Réplica fiel de https://dev-eybar-viasus.senderovivo.pages.dev/ (Sin diagramas)</span>
            </div>
        </div>
        <div class="figma-nav-links">
            <a href="#artboard-01" class="figma-jump-btn"><i class="fa-solid fa-house"></i> 01. Lobby</a>
            <a href="#artboard-02" class="figma-jump-btn"><i class="fa-solid fa-vr-cardboard"></i> 02. Visor 3D HUD</a>
            <a href="#artboard-03" class="figma-jump-btn"><i class="fa-solid fa-clipboard-check"></i> 03. Preparar Visita</a>
            <a href="#artboard-04" class="figma-jump-btn"><i class="fa-solid fa-book-open"></i> 04. Biodiversidad</a>
            <a href="#artboard-05" class="figma-jump-btn"><i class="fa-solid fa-sheet-plastic"></i> 05. Bottom Sheet</a>
            <a href="#artboard-06" class="figma-jump-btn"><i class="fa-solid fa-trophy"></i> 06. Bitácora</a>
            <a href="#artboard-07" class="figma-jump-btn"><i class="fa-solid fa-mobile-screen"></i> 07. Móvil</a>
        </div>
    </header>


    <!-- ==========================================================================
         PANTALLA 01 · PANTALLA INICIAL (HERO START LOBBY)
         ========================================================================== -->
    <section class="figma-artboard-screen" id="artboard-01" data-name="PANTALLA 01 · Hero Start Lobby">
        <div class="artboard-meta-header">
            <div class="artboard-meta-left">
                <span class="artboard-pill-number">FRAME 01</span>
                <h2 class="artboard-meta-title">Pantalla Inicial · Hero Start Lobby</h2>
            </div>
            <span class="artboard-meta-dim">1440 × 850 px · Pantalla de Bienvenida</span>
        </div>

        <div class="desktop-frame-box" style="position: relative;">
            <div id="trail-lobby" class="standalone-visible hero-standalone-screen">
                <div class="hero-screen-overlay"></div>

                <!-- Botón Cerrar (en caso de reabrir desde visor) -->
                <button id="btn-hero-close" class="hero-close-trigger" title="Volver al visor" aria-label="Cerrar ventana inicial">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- Barra Superior: Ubicación y Tecnología 3DGS -->
                <header class="hero-top-bar">
                    <div class="hero-pill-location">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>Quebrada La Vieja</span>
                    </div>
                    <div class="hero-pill-tech">
                        <span>200m Escaneados en 3DGS</span>
                    </div>
                </header>

                <!-- Bloque Central: Título y Acciones -->
                <main class="hero-main-content">
                    <h1 class="hero-brand-title">
                        <span class="hero-brand-sendero">Sendero</span>
                        <span class="hero-brand-vivo">Vivo</span>
                    </h1>
                    <p class="hero-brand-tagline">Naturaleza que nos conecta</p>

                    <div class="hero-cta-group">
                        <button id="btn-hero-explore" class="hero-btn-primary" type="button" aria-label="Explorar el sendero">
                            <span>Explorar el sendero</span>
                            <span class="hero-arrow">→</span>
                        </button>
                        <button id="btn-hero-visit" class="hero-btn-secondary" type="button" aria-label="Preparar visita al sendero">
                            <i class="fa-solid fa-clipboard-check"></i>
                            <span>Preparar Visita</span>
                        </button>
                        <button id="btn-hero-biodiversity" class="hero-btn-secondary" type="button" aria-label="Ver álbum de biodiversidad">
                            <i class="fa-solid fa-leaf"></i>
                            <span>Biodiversidad</span>
                        </button>
                    </div>
                </main>

                <!-- Barra Inferior / Footer: Estadísticas y Lema -->
                <footer class="hero-bottom-footer">
                    <div class="hero-bottom-divider"></div>
                    <div class="hero-footer-content">
                        <div class="hero-footer-stats">
                            <span class="hero-stat-highlight">7,3 km</span>
                            <span class="hero-stat-sep">·</span>
                            <span class="hero-stat-highlight">+406 m desnivel</span>
                            <span class="hero-stat-sep">·</span>
                            <span class="hero-stat-time">3 horas</span>
                        </div>
                        <div class="hero-footer-slogan">
                            Buenos senderos, mejores personas
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    </section>


    <!-- ==========================================================================
         PANTALLA 02 · VISOR 3DGS RECORRIDO & HORIZON COMMAND BAR + HUD DE TELEMETRÍA
         ========================================================================== -->
    <section class="figma-artboard-screen" id="artboard-02" data-name="PANTALLA 02 · Visor 3DGS y HUD de Telemetría">
        <div class="artboard-meta-header">
            <div class="artboard-meta-left">
                <span class="artboard-pill-number">FRAME 02</span>
                <h2 class="artboard-meta-title">Visor 3DGS Recorrido & Horizon Command Bar + HUD</h2>
            </div>
            <span class="artboard-meta-dim">1440 × 850 px · Pantalla Principal de Navegación</span>
        </div>

        <div class="desktop-frame-box" style="position: relative;">
            <div class="trail-3d-backdrop">
                <!-- Gráfico de montaña y sendero en perspectiva -->
                <svg viewBox="0 0 1440 850" preserveAspectRatio="none">
                    <path d="M0,850 L0,510 Q240,410 480,460 T960,420 T1440,360 L1440,850 Z" fill="#091b2c"/>
                    <path d="M0,850 L0,590 Q360,520 720,570 T1440,500 L1440,850 Z" fill="#061320"/>
                    <polygon points="720,440 670,850 770,850" fill="#040b12"/>
                </svg>
            </div>

            <!-- Beacon POI Flotante en el Visor -->
            <div class="static-beacon-wrap">
                <div class="static-beacon-ring">
                    <i class="fa-solid fa-dove"></i>
                </div>
                <div class="static-beacon-tooltip">
                    <i class="fa-solid fa-location-dot" style="color: var(--sv-sky-hover); margin-right: 4px;"></i> Colibrí chillón · 2.712 msnm
                </div>
            </div>

            <!-- Segundo POI Beacon de fondo -->
            <div class="static-beacon-wrap" style="top: 60%; left: 32%;">
                <div class="static-beacon-ring" style="width: 44px; height: 44px; font-size: 16px; border-color: #34d399; background: rgba(16, 185, 129, 0.3);">
                    <i class="fa-solid fa-seedling"></i>
                </div>
                <div class="static-beacon-tooltip" style="border-color: #34d399;">
                    Helecho arborescente · 2.750 msnm
                </div>
            </div>

            <!-- CASCARÓN DE INTERFAZ (#shell) -->
            <div id="shell" class="standalone-visible font-sans" style="position: absolute; inset: 0; z-index: 30;">

                <!-- BARRA DE COMANDO SUPERIOR (HORIZON COMMAND BAR - PC) -->
                <header id="expedition-top-bar" style="position: absolute; top: 18px; left: 24px; right: 24px; display: flex !important;">
                    <div class="command-bar-left">
                        <button class="expedition-badge-trigger" title="Ficha técnica del sendero y detalles">
                            <div class="expedition-badge-icon">
                                <i class="fa-solid fa-mountain-sun"></i>
                            </div>
                            <div class="expedition-title-group">
                                <span class="expedition-brand-sup">Cerros Orientales · Bogotá</span>
                                <h2 class="expedition-trail-name">Sendero Santa Ana · La Vieja</h2>
                            </div>
                        </button>
                        <div class="expedition-live-pill" title="Altitud de estación actual">
                            <span class="live-pulse-dot"></span>
                            <span style="font-size: 11px; font-weight: 600; color: var(--sv-text-muted);">
                                <i class="fa-solid fa-mountain text-[10px]" style="color: var(--sv-sky-hover);"></i> <strong id="hud-altitud-top" style="color: var(--sv-text-primary); font-family: 'Syne', sans-serif;">2.712 m</strong>
                            </span>
                        </div>
                    </div>

                    <div class="command-bar-right">
                        <div class="render-toggle-deck" title="Conmutador de técnica de renderizado y sonido ambiental">
                            <button type="button" class="render-btn activa">COLMAP</button>
                            <button type="button" class="render-btn">Luma</button>
                            <button type="button" class="render-btn" title="Activar / Silenciar sonido de bosque">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
                        <div class="command-actions-cluster">
                            <button class="command-icon-btn" title="Ficha del sendero">
                                <i class="fa-solid fa-mountain-sun"></i>
                            </button>
                            <button class="command-icon-btn" title="Tutorial de interacción">
                                <i class="fa-solid fa-circle-question"></i>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- TELEMETRÍA DE EXPEDICIÓN (HUD UNIFICADO PC) -->
                <div id="expedition-telemetry-hud" style="position: absolute; bottom: 84px; left: 24px; display: block !important; width: 420px;">
                    <div class="telemetry-card">
                        <div class="telemetry-top-row">
                            <div class="telemetry-alt-chip">
                                <div class="telemetry-alt-icon">
                                    <i class="fa-solid fa-mountain"></i>
                                </div>
                                <div class="telemetry-alt-numbers">
                                    <span class="telemetry-alt-title">Altitud</span>
                                    <span class="telemetry-alt-val">2.712 m</span>
                                </div>
                            </div>

                            <div class="telemetry-metrics-pills">
                                <div class="telemetry-mini-pill" title="Desnivel acumulado">
                                    <i class="fa-solid fa-arrow-trend-up" style="color: var(--sv-sky-hover);"></i>
                                    <span>+42 m</span>
                                </div>
                                <div class="telemetry-mini-pill" title="Pendiente media">
                                    <i class="fa-solid fa-percent" style="color: var(--sv-sky-hover);"></i>
                                    <span>14 %</span>
                                </div>
                            </div>
                        </div>

                        <div class="telemetry-progress-track">
                            <div class="telemetry-progress-header">
                                <span style="color: var(--sv-text-muted);">Progreso del sendero · 35%</span>
                                <span style="color: var(--sv-sky-hover); font-family: 'Syne', sans-serif;">1.450 m</span>
                            </div>
                            <div class="telemetry-bar-bg">
                                <div class="telemetry-bar-fill" style="width: 35%;"></div>
                            </div>
                        </div>

                        <div class="telemetry-footer-row">
                            <div class="telemetry-poi-count">
                                <i class="fa-solid fa-binoculars" style="color: var(--sv-sky-hover); font-size: 11px;"></i>
                                <span>3 de 8 especies vistas</span>
                            </div>
                            <button class="telemetry-btn-bitacora">
                                <i class="fa-solid fa-book-bookmark"></i> Bitácora
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Hint de controles (teclado) -->
                <p id="hint" style="position: absolute; right: 24px; bottom: 84px; display: block !important;">
                    <strong>W A S D</strong> caminar · <strong>Q E</strong> bajar y subir · <strong>Shift</strong> más rápido ·
                    arrastrar para mirar · rueda para acercar
                </p>

                <!-- Nav PC -->
                <nav id="shell-nav-pc" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex !important;">
                    <button class="active-dock-tab flex flex-col items-center gap-0.5 font-medium cursor-pointer transition" style="color: var(--sv-sky-hover);">
                        <i class="fa-solid fa-compass text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px]">Sendero</span>
                    </button>
                    <button class="flex flex-col items-center gap-0.5 transition cursor-pointer" style="color: var(--sv-text-dim);">
                        <i class="fa-solid fa-book-bookmark text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px]">Especies</span>
                    </button>
                    <button class="flex flex-col items-center gap-0.5 transition cursor-pointer" style="color: var(--sv-text-dim);">
                        <i class="fa-solid fa-trophy text-base sm:text-lg"></i>
                        <span class="text-[9px] sm:text-[10px]">Bitácora</span>
                    </button>
                </nav>
            </div>
        </div>
    </section>


    <!-- ==========================================================================
         PANTALLA 03 · MODAL "PREPARAR VISITA" (FICHA TÉCNICA Y REQUISITOS EAAB)
         ========================================================================== -->
    <section class="figma-artboard-screen" id="artboard-03" data-name="PANTALLA 03 · Modal Preparar Visita EAAB">
        <div class="artboard-meta-header">
            <div class="artboard-meta-left">
                <span class="artboard-pill-number">FRAME 03</span>
                <h2 class="artboard-meta-title">Modal "Preparar Visita" · Ficha Técnica y Checklist EAAB</h2>
            </div>
            <span class="artboard-meta-dim">1200 × 880 px · Ventana Emergente Completa</span>
        </div>

        <div style="width: 100%; display: flex; justify-content: center;">
            <div class="preparar-visita-modal-card glass-panel pointer-events-auto" style="width: 100%; max-width: 1200px; position: relative !important;">
                
                <!-- Cabecera de la Ficha Técnica -->
                <div class="preparar-header-row">
                    <div class="min-w-0 pr-8 md:pr-0">
                        <span class="text-[10px] sm:text-[11px] font-bold font-mono tracking-wider uppercase block mb-1" style="color: var(--sv-text-dim);">
                            FICHA TÉCNICA DEL SENDERO · <span style="color: var(--sv-sky-hover);">EAAB Cerros Orientales</span>
                        </span>
                        <h2 class="text-xl sm:text-3xl font-extrabold font-syne truncate" style="color: var(--sv-text-primary); letter-spacing: -0.02em;">
                            Quebrada La Vieja
                        </h2>
                        <p class="text-xs sm:text-[13px] mt-1 flex items-center truncate" style="color: var(--sv-text-muted);">
                            <i class="fa-solid fa-location-dot mr-1.5" style="color: var(--sv-sky-hover);"></i>
                            Cerros Orientales de Bogotá · Localidad de Chapinero (Cl. 71)
                        </p>
                    </div>

                    <!-- Selector de Sendero + Botón Cerrar -->
                    <div class="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold hidden lg:inline" style="color: var(--sv-text-muted);">
                                Cambiar sendero:
                            </span>
                            <div class="flex items-center gap-1.5 p-1 rounded-2xl" style="background: rgba(10, 22, 34, 0.85); border: 1px solid rgba(56, 189, 248, 0.25);">
                                <button type="button" class="trail-select-pill active text-xs font-semibold px-3.5 py-1.5 rounded-xl cursor-pointer transition text-center" style="background: var(--sv-sky-surface); color: var(--sv-sky-hover); border: 1px solid var(--sv-sky-border);">
                                    Quebrada La Vieja
                                </button>
                                <button type="button" class="trail-select-pill text-xs font-semibold px-3.5 py-1.5 rounded-xl cursor-pointer transition text-center" style="color: var(--sv-text-muted);">
                                    Santa Ana - La Aguadora
                                </button>
                            </div>
                        </div>

                        <button class="tab-modal-close-btn flex-shrink-0" title="Cerrar ventana" aria-label="Cerrar ventana">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Cuerpo del Modal -->
                <div class="preparar-scroll-container">

                    <!-- Fila 1: Métricas Principales (3 Columnas) -->
                    <div class="preparar-metrics-grid">
                        <div class="trail-metric-card">
                            <div class="trail-metric-icon">
                                <i class="fa-solid fa-shoe-prints"></i>
                            </div>
                            <div class="min-w-0">
                                <span class="text-[9.5px] sm:text-[11px] font-bold font-mono tracking-wider uppercase block truncate" style="color: var(--sv-text-dim);">
                                    DISTANCIA
                                </span>
                                <span class="text-base sm:text-2xl font-bold font-syne block truncate" style="color: var(--sv-text-primary);">
                                    → 7,3 km
                                </span>
                            </div>
                        </div>

                        <div class="trail-metric-card">
                            <div class="trail-metric-icon icon-fauna">
                                <i class="fa-solid fa-arrow-trend-up"></i>
                            </div>
                            <div class="min-w-0">
                                <span class="text-[9.5px] sm:text-[11px] font-bold font-mono tracking-wider uppercase block truncate" style="color: var(--sv-text-dim);">
                                    DESNIVEL +
                                </span>
                                <span class="text-base sm:text-2xl font-bold font-syne block truncate" style="color: var(--sv-text-primary);">
                                    ▲ +406 m
                                </span>
                            </div>
                        </div>

                        <div class="trail-metric-card">
                            <div class="trail-metric-icon icon-flora">
                                <i class="fa-regular fa-clock"></i>
                            </div>
                            <div class="min-w-0">
                                <span class="text-[9.5px] sm:text-[11px] font-bold font-mono tracking-wider uppercase block truncate" style="color: var(--sv-text-dim);">
                                    TIEMPO APROX.
                                </span>
                                <span class="text-base sm:text-2xl font-bold font-syne block truncate" style="color: var(--sv-text-primary);">
                                    ⏱ 3 h
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Fila 2: Cuadrícula de 2 Columnas -->
                    <div class="preparar-content-grid">

                        <!-- Columna Izquierda: Ecosistema + Mapa -->
                        <div class="flex flex-col gap-4 sm:gap-5">
                            
                            <!-- 1. Tarjeta Ecosistema con Imagen y Descripción -->
                            <div class="ecosystem-banner-card">
                                <div class="ecosystem-banner eco-banner-standalone">
                                    <div class="ecosystem-banner-overlay"></div>
                                    <div class="absolute bottom-3 left-4 right-4 z-10">
                                        <span class="inline-block text-[10px] sm:text-xs font-bold font-syne px-3 py-1 rounded-full shadow-md" style="background: rgba(16, 185, 129, 0.35); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.5);">
                                            Ecosistema de Niebla y Nacimiento Hídrico
                                        </span>
                                    </div>
                                </div>
                                <div class="p-4 sm:p-5" style="background: rgba(10, 22, 36, 0.75);">
                                    <p class="text-xs sm:text-[13.5px] font-medium leading-relaxed" style="color: var(--sv-text-muted); font-family: 'Quicksand', sans-serif;">
                                        El sendero más emblemático de los Cerros Orientales de Bogotá. Asciende a lo largo del cañón de la quebrada entre helechos gigantes, orquídeas silvestres y bosques de niebla hasta alcanzar la cascada y el mirador con vista panorámica a la sabana.
                                    </p>
                                </div>
                            </div>

                            <!-- 2. Tarjeta Mapa Interactivo del Recorrido -->
                            <div class="preparar-map-card p-4 sm:p-5">
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style="background: var(--sv-sky-surface); color: var(--sv-sky-hover); border: 1px solid var(--sv-sky-border);">
                                            <i class="fa-solid fa-compass"></i>
                                        </div>
                                        <h3 class="text-sm sm:text-base font-bold font-syne" style="color: var(--sv-text-primary);">
                                            Mapa Interactivo del Recorrido
                                        </h3>
                                    </div>
                                    <span class="text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg flex items-center gap-1.5" style="background: rgba(56, 189, 248, 0.12); color: var(--sv-sky-light); border: 1px solid rgba(56, 189, 248, 0.25);">
                                        Norte <i class="fa-solid fa-arrow-up text-[10px]"></i>
                                    </span>
                                </div>
                                <p class="text-xs sm:text-[12.5px] mb-3.5" style="color: var(--sv-text-muted);">
                                    Hitos clave numerados a lo largo de la ruta
                                </p>

                                <div class="preparar-map-visual map-visual-standalone mb-3.5">
                                    <div class="preparar-map-overlay"></div>
                                    <div class="absolute top-3 left-3 z-10">
                                        <span class="text-[10px] sm:text-[10.5px] font-bold font-mono uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5" style="background: rgba(10, 20, 32, 0.85); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); backdrop-filter: blur(4px);">
                                            <i class="fa-solid fa-location-crosshairs text-[10px]"></i>
                                            ORIENTACIÓN N
                                        </span>
                                    </div>
                                </div>

                                <!-- Hitos del recorrido -->
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-xs font-semibold px-3 py-1.5 rounded-xl" style="background: rgba(14, 28, 44, 0.85); border: 1px solid var(--sv-sky-border); color: #ffffff;">
                                        <strong style="color: var(--sv-sky-hover);">1.</strong> Entrada Cl. 71 (2.650m)
                                    </span>
                                    <span class="text-xs font-semibold px-3 py-1.5 rounded-xl" style="background: rgba(14, 28, 44, 0.85); border: 1px solid var(--sv-sky-border); color: #ffffff;">
                                        <strong style="color: var(--sv-sky-hover);">2.</strong> Mirador La Virgen (2.850m)
                                    </span>
                                    <span class="text-xs font-semibold px-3 py-1.5 rounded-xl" style="background: rgba(14, 28, 44, 0.85); border: 1px solid var(--sv-sky-border); color: #ffffff;">
                                        <strong style="color: var(--sv-sky-hover);">3.</strong> Cascada (2.950m)
                                    </span>
                                    <span class="text-xs font-semibold px-3 py-1.5 rounded-xl" style="background: rgba(14, 28, 44, 0.85); border: 1px solid var(--sv-sky-border); color: #ffffff;">
                                        <strong style="color: var(--sv-sky-hover);">4.</strong> Alto de la Cruz (3.200m)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Columna Derecha: Requisitos de Seguridad -->
                        <div class="checklist-card-group p-4 sm:p-6 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center justify-between gap-3 mb-1.5">
                                    <h3 class="text-base sm:text-lg font-bold font-syne" style="color: var(--sv-text-primary);">
                                        Antes de comenzar
                                    </h3>
                                    <span class="text-xs font-mono font-bold px-3 py-1 rounded-full" style="background: var(--sv-sky-surface); color: var(--sv-sky-light); border: 1px solid var(--sv-sky-border);">
                                        4/4 verificado
                                    </span>
                                </div>
                                <p class="text-xs sm:text-[12.5px] mb-4 sm:mb-5" style="color: var(--sv-text-muted);">
                                    Requisitos de seguridad y elementos esenciales
                                </p>

                                <!-- Lista de 4 requisitos -->
                                <div class="flex flex-col gap-3">
                                    <div class="checklist-item-card checked">
                                        <div class="checklist-checkbox checked"><i class="fa-solid fa-check"></i></div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                                <h4 class="text-xs sm:text-[14px] font-bold font-syne" style="color: var(--sv-text-primary);">
                                                    Agua (Mínimo 1 Litro)
                                                </h4>
                                                <span class="checklist-badge-obligatorio">OBLIGATORIO</span>
                                            </div>
                                            <p class="text-xs sm:text-[12.5px] font-medium leading-relaxed" style="color: var(--sv-text-muted);">
                                                Llevar termo o cantimplora recargable. En los cerros está prohibido el plástico de un solo uso.
                                            </p>
                                        </div>
                                    </div>

                                    <div class="checklist-item-card checked">
                                        <div class="checklist-checkbox checked"><i class="fa-solid fa-check"></i></div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                                <h4 class="text-xs sm:text-[14px] font-bold font-syne" style="color: var(--sv-text-primary);">
                                                    Calzado cómodo y con agarre
                                                </h4>
                                                <span class="checklist-badge-obligatorio">OBLIGATORIO</span>
                                            </div>
                                            <p class="text-xs sm:text-[12.5px] font-medium leading-relaxed" style="color: var(--sv-text-muted);">
                                                Botas de trekking o calzado deportivo con labrado para evitar resbalones sobre piedras húmedas y barro.
                                            </p>
                                        </div>
                                    </div>

                                    <div class="checklist-item-card checked">
                                        <div class="checklist-checkbox checked"><i class="fa-solid fa-check"></i></div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                                <h4 class="text-xs sm:text-[14px] font-bold font-syne" style="color: var(--sv-text-primary);">
                                                    Reserva Acueducto de Bogotá
                                                </h4>
                                                <span class="checklist-badge-obligatorio">OBLIGATORIO</span>
                                            </div>
                                            <p class="text-xs sm:text-[12.5px] font-medium leading-relaxed" style="color: var(--sv-text-muted);">
                                                Reserva confirmada en el portal o app "Caminos de los Cerros" de la EAAB. Código QR listo en pantalla.
                                            </p>
                                        </div>
                                    </div>

                                    <div class="checklist-item-card checked">
                                        <div class="checklist-checkbox checked"><i class="fa-solid fa-check"></i></div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                                <h4 class="text-xs sm:text-[14px] font-bold font-syne" style="color: var(--sv-text-primary);">
                                                    Chaqueta cortaviento o impermeable
                                                </h4>
                                                <span class="checklist-badge-obligatorio">OBLIGATORIO</span>
                                            </div>
                                            <p class="text-xs sm:text-[12.5px] font-medium leading-relaxed" style="color: var(--sv-text-muted);">
                                                La temperatura desciende bruscamente arriba de 3.000 m con niebla y brisa andina.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Plataforma EAAB y Horario Oficial -->
                            <div class="mt-5 pt-4 border-t space-y-3" style="border-color: rgba(56, 189, 248, 0.16);">
                                <a href="https://caminos.eaab.gov.co/" target="_blank" rel="noopener noreferrer" class="eaab-platform-link">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.45);">
                                            <i class="fa-regular fa-file-lines"></i>
                                        </div>
                                        <div>
                                            <span class="text-xs sm:text-[13.5px] font-bold font-syne block" style="color: var(--sv-text-primary);">
                                                Plataforma EAAB Caminos de los Cerros
                                            </span>
                                            <span class="text-[11px] sm:text-xs" style="color: var(--sv-text-muted);">
                                                Gestiona tu código de ingreso y reserva tu cupo gratuito
                                            </span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 text-xs font-bold flex-shrink-0" style="color: var(--sv-sky-hover);">
                                        <i class="fa-solid fa-arrow-up-right-from-square text-[12px]"></i>
                                    </div>
                                </a>

                                <div class="flex items-center gap-2 text-[11.5px] sm:text-xs px-1" style="color: var(--sv-text-muted);">
                                    <i class="fa-regular fa-calendar-check" style="color: var(--sv-fauna-hover);"></i>
                                    <span><strong>Martes a Domingo:</strong> 5:45 a.m. a 10:00 a.m. (Ingreso hasta las 8:30 a.m.)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer del Modal -->
                <div class="p-4 sm:p-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs flex-shrink-0" style="border-color: rgba(56, 189, 248, 0.18); background: rgba(10, 22, 34, 0.92);">
                    <div class="text-[11px] sm:text-xs flex items-center gap-2" style="color: var(--sv-text-muted);">
                        <i class="fa-solid fa-shield-halved text-xs" style="color: var(--sv-sky-hover);"></i>
                        <span>Todo listo para vivir la expedición de manera responsable y segura.</span>
                    </div>
                    <div class="flex items-center gap-2.5 w-full sm:w-auto">
                        <button type="button" class="px-4 py-2.5 rounded-xl font-bold cursor-pointer transition text-center text-xs sm:text-sm" style="background: rgba(14, 28, 44, 0.85); border: 1px solid rgba(56, 189, 248, 0.25); color: var(--sv-text-muted);">
                            Volver al inicio
                        </button>
                        <button type="button" class="px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition text-xs sm:text-sm" style="background: linear-gradient(135deg, #0284c7 0%, #034671 100%); border: 1px solid #38bdf8; color: #ffffff; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                            <span>Iniciar Exploración 3D</span>
                            <i class="fa-solid fa-arrow-right text-[11px]"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>


    <!-- ==========================================================================
         PANTALLA 04 · MODAL "ATLAS DE BIODIVERSIDAD Y PATRIMONIO" (8 ESPECIES)
         ========================================================================== -->
    <section class="figma-artboard-screen" id="artboard-04" data-name="PANTALLA 04 · Atlas de Biodiversidad">
        <div class="artboard-meta-header">
            <div class="artboard-meta-left">
                <span class="artboard-pill-number">FRAME 04</span>
                <h2 class="artboard-meta-title">Atlas de Biodiversidad y Patrimonio (Catálogo de 8 Especies)</h2>
            </div>
            <span class="artboard-meta-dim">1240 × 920 px · Modal de Especies y Ecosistema</span>
        </div>

        <div style="width: 100%; display: flex; justify-content: center;">
            <div class="biodiversity-modal-card glass-panel w-full max-w-6xl flex flex-col rounded-3xl overflow-hidden shadow-2xl pointer-events-auto" style="position: relative !important; background: var(--sv-surface-solid); border: 1px solid var(--sv-sky-border);">
                <!-- Cabecera del Álbum -->
                <div class="p-5 sm:p-6 border-b flex items-center justify-between gap-4" style="border-color: rgba(56, 189, 248, 0.20);">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style="background: var(--sv-sky-surface); border: 1px solid var(--sv-sky-border); color: var(--sv-sky-hover);">
                            <i class="fa-solid fa-book-open"></i>
                        </div>
                        <div>
                            <h2 class="text-base sm:text-xl font-bold font-syne" style="color: var(--sv-text-primary);">Atlas de Biodiversidad y Patrimonio</h2>
                            <p class="text-xs" style="color: var(--sv-text-muted);">Especies y elementos registrados · Quebrada La Vieja</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2.5">
                        <span class="text-xs px-3 py-1 rounded-full font-mono font-bold" style="background: var(--sv-sky-surface); color: var(--sv-sky-light); border: 1px solid var(--sv-sky-border);">8 registros</span>
                        <button class="tab-modal-close-btn" title="Cerrar álbum">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Filtros de categoría -->
                <div class="px-5 py-3 border-b flex items-center gap-2 overflow-x-auto no-scrollbar" style="border-color: rgba(56, 189, 248, 0.15);">
                    <button class="album-filter-pill active">
                        <i class="fa-solid fa-layer-group text-xs"></i> Todas (8)
                    </button>
                    <button class="album-filter-pill">
                        <i class="fa-solid fa-dove text-xs"></i> Fauna Silvestre (3)
                    </button>
                    <button class="album-filter-pill">
                        <i class="fa-solid fa-seedling text-xs"></i> Flora Altoandina (3)
                    </button>
                    <button class="album-filter-pill">
                        <i class="fa-solid fa-landmark text-xs"></i> Patrimonio (2)
                    </button>
                </div>

                <!-- Cuadrícula con las 8 especies completas -->
                <div class="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    ${albumGridHtml}
                </div>

                <!-- Footer -->
                <div class="px-5 py-3 border-t flex items-center justify-between gap-4 text-xs" style="border-color: rgba(56, 189, 248, 0.15); background: rgba(10, 22, 34, 0.65);">
                    <span class="text-[11px] truncate flex items-center gap-1.5" style="color: var(--sv-text-muted);">
                        <i class="fa-solid fa-compass text-[11px]" style="color: var(--sv-sky-hover);"></i>
                        Haz clic en <strong>Explorar en sendero</strong> para teletransportarte en 3D a cualquier punto
                    </span>
                    <button class="text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition" style="background: var(--sv-sky-surface); border: 1px solid var(--sv-sky-border); color: var(--sv-sky-light);">
                        <i class="fa-solid fa-arrow-left text-[10px]"></i>
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    </section>


    <!-- ==========================================================================
         FILA COMBINADA: BOTTOM SHEET (FICHA ESPECIE) + BITÁCORA DE EXPEDICIÓN
         ========================================================================== -->
    <div class="modal-duo-grid">
        
        <!-- PANTALLA 05: BOTTOM SHEET (FICHA DETALLADA DE ESPECIE) -->
        <section class="figma-artboard-screen" id="artboard-05" data-name="PANTALLA 05 · Bottom Sheet Especie">
            <div class="artboard-meta-header">
                <div class="artboard-meta-left">
                    <span class="artboard-pill-number">FRAME 05</span>
                    <h2 class="artboard-meta-title">Ficha Deslizante · Bottom Sheet de Especie</h2>
                </div>
                <span class="artboard-meta-dim">680 × 760 px</span>
            </div>

            <div style="width: 100%; display: flex; justify-content: center;">
                <div class="glass-panel rounded-3xl p-6 shadow-2xl relative backdrop-blur-xl w-full" style="background: var(--sv-surface-solid); border: 1px solid var(--sv-sky-border);">
                    <!-- Indicador de arrastre -->
                    <div style="width: 36px; height: 4px; background: rgba(255,255,255,0.25); border-radius: 999px; margin: 0 auto 16px auto;"></div>

                    <!-- Cabecera de la ficha -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 44px; height: 44px; border-radius: 14px; background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(251, 191, 36, 0.40); color: #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                <i class="fa-solid fa-dove"></i>
                            </div>
                            <div>
                                <span style="font-size: 10.5px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; display: block;">
                                    Avifauna · Verificado en el sendero
                                </span>
                                <h3 style="font-family: var(--sv-font-title); font-size: 22px; font-weight: 800; color: #ffffff; margin: 1px 0;">
                                    Colibrí chillón
                                </h3>
                                <span style="font-size: 12.5px; font-style: italic; color: var(--sv-sky-light);">
                                    Colibri coruscans · 1.700 – 3.500 msnm
                                </span>
                            </div>
                        </div>
                        <button class="tab-modal-close-btn" title="Cerrar ficha">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <!-- Reproductor Bioacústico -->
                    <div style="background: rgba(14, 28, 44, 0.85); border: 1px solid var(--sv-sky-border); border-radius: 16px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px;">
                        <button type="button" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none; color: #04111d; display: flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);">
                            <i class="fa-solid fa-play ml-0.5"></i>
                        </button>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                                <strong style="color: #ffffff;">Canto territorial andino</strong>
                                <span style="color: var(--sv-text-muted); font-family: monospace;">0:14 / 0:14</span>
                            </div>
                            <!-- Espectro simulado -->
                            <div style="display: flex; align-items: center; gap: 3px; height: 16px;">
                                <div style="width: 3px; height: 40%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 80%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 60%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 100%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 75%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 45%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 90%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                                <div style="width: 3px; height: 30%; background: var(--sv-sky-hover); border-radius: 2px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Descripción ecológica -->
                    <p style="font-size: 13px; line-height: 1.55; color: var(--sv-text-muted); margin-bottom: 14px;">
                        Colibrí de verde iridiscente con parche azul violeta en la garganta. Vive entre 1.700 y 3.500 msnm. Registrado en el propio sendero: eBird lo reporta en el punto Club La Aguadora / Sendero Santa Ana.
                    </p>

                    <!-- Tarjeta Curiosidad -->
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; display: flex; gap: 10px; align-items: flex-start;">
                        <i class="fa-solid fa-lightbulb" style="color: #fbbf24; font-size: 14px; margin-top: 2px;"></i>
                        <p style="font-size: 12px; color: #fef08a; line-height: 1.45; margin: 0;">
                            <strong>Dato curioso:</strong> Su nombre viene del canto insistente y chillón que emite desde perchas altas, sobre todo al amanecer.
                        </p>
                    </div>

                    <!-- Botones de Acción de la Ficha -->
                    <div style="display: flex; gap: 10px; margin-top: 18px;">
                        <button type="button" style="flex: 1; padding: 12px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #034671); border: 1px solid var(--sv-sky-border); color: #ffffff; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                            <i class="fa-solid fa-cube"></i> Ver Modelo 3D
                        </button>
                        <button type="button" style="flex: 1; padding: 12px; border-radius: 12px; background: var(--sv-sky-surface); border: 1px solid var(--sv-sky-border); color: var(--sv-sky-hover); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                            <i class="fa-solid fa-check"></i> Marcar como Visto
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- PANTALLA 06: PANEL MODAL "BITÁCORA DE EXPEDICIÓN" -->
        <section class="figma-artboard-screen" id="artboard-06" data-name="PANTALLA 06 · Bitácora de Expedición">
            <div class="artboard-meta-header">
                <div class="artboard-meta-left">
                    <span class="artboard-pill-number">FRAME 06</span>
                    <h2 class="artboard-meta-title">Modal Pestañas · Bitácora de Expedición</h2>
                </div>
                <span class="artboard-meta-dim">680 × 760 px</span>
            </div>

            <div style="width: 100%; display: flex; justify-content: center;">
                <div class="tab-modal-dialog pointer-events-auto" style="width: 100%; position: relative !important; max-width: 680px;">
                    <!-- Cabecera -->
                    <div class="tab-modal-header">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style="background: var(--sv-sky-surface); border: 1px solid var(--sv-sky-border); color: var(--sv-sky-hover);">
                                <i class="fa-solid fa-trophy"></i>
                            </div>
                            <div class="min-w-0">
                                <h2 class="text-xs sm:text-sm font-bold font-syne truncate" style="color: var(--sv-text-primary);">
                                    Bitácora de Expedición
                                </h2>
                                <p class="text-[10px] truncate" style="color: var(--sv-text-muted);">
                                    Progreso y descubrimientos del caminante
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full" style="background: var(--sv-sky-surface); color: var(--sv-sky-light); border: 1px solid var(--sv-sky-border);">
                                4/8 Especies
                            </span>
                            <button class="tab-modal-close-btn" title="Cerrar ventana">
                                <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Barra de filtros integrada en modal -->
                    <div id="tab-modal-filter-bar">
                        <span class="tab-filter-pill">Sendero</span>
                        <span class="tab-filter-pill">Especies</span>
                        <span class="tab-filter-pill active-tab-filter">Bitácora Activa</span>
                    </div>

                    <!-- Cuerpo de la Bitácora -->
                    <div class="tab-modal-body">
                        <!-- Medalla / Insignia de Progreso -->
                        <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(14, 28, 44, 0.8)); border: 1px solid var(--sv-sky-border); border-radius: 18px; padding: 18px; display: flex; align-items: center; gap: 16px;">
                            <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; color: #07131e; font-size: 24px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); flex-shrink: 0;">
                                <i class="fa-solid fa-award"></i>
                            </div>
                            <div>
                                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #fbbf24; letter-spacing: 0.05em;">Logro Desbloqueado</span>
                                <h4 style="font-family: var(--sv-font-title); font-size: 16px; font-weight: 700; color: #ffffff; margin: 2px 0;">Explorador del Bosque Altoandino</h4>
                                <p style="font-size: 11.5px; color: var(--sv-text-muted); margin: 0;">Has alcanzado el 50% del sendero y registrado 4 especies clave.</p>
                            </div>
                        </div>

                        <!-- Métricas de la jornada -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div style="background: rgba(14, 28, 44, 0.7); border: 1px solid var(--sv-surface-border); border-radius: 12px; padding: 10px; text-align: center;">
                                <span style="font-size: 9px; font-weight: 700; color: var(--sv-text-dim); text-transform: uppercase; display: block;">Recorrido</span>
                                <strong style="font-family: var(--sv-font-title); font-size: 16px; color: var(--sv-sky-hover);">3,6 km</strong>
                            </div>
                            <div style="background: rgba(14, 28, 44, 0.7); border: 1px solid var(--sv-surface-border); border-radius: 12px; padding: 10px; text-align: center;">
                                <span style="font-size: 9px; font-weight: 700; color: var(--sv-text-dim); text-transform: uppercase; display: block;">Desnivel</span>
                                <strong style="font-family: var(--sv-font-title); font-size: 16px; color: #34d399;">+240 m</strong>
                            </div>
                            <div style="background: rgba(14, 28, 44, 0.7); border: 1px solid var(--sv-surface-border); border-radius: 12px; padding: 10px; text-align: center;">
                                <span style="font-size: 9px; font-weight: 700; color: var(--sv-text-dim); text-transform: uppercase; display: block;">Tiempo</span>
                                <strong style="font-family: var(--sv-font-title); font-size: 16px; color: #fbbf24;">1h 45m</strong>
                            </div>
                        </div>

                        <!-- Checkpoints de especies -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div class="species-catalog-card card-cat-fauna">
                                <i class="fa-solid fa-circle-check text-xs" style="color: #34d399;"></i>
                                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; flex: 1;">Colibrí chillón</span>
                                <span style="font-size: 11px; color: var(--sv-text-dim);">Avistado · 2.712m</span>
                            </div>
                            <div class="species-catalog-card card-cat-flora">
                                <i class="fa-solid fa-circle-check text-xs" style="color: #34d399;"></i>
                                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; flex: 1;">Helecho arborescente</span>
                                <span style="font-size: 11px; color: var(--sv-text-dim);">Avistado · 2.750m</span>
                            </div>
                            <div class="species-catalog-card card-cat-flora">
                                <i class="fa-solid fa-circle-check text-xs" style="color: #34d399;"></i>
                                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; flex: 1;">Aliso andino</span>
                                <span style="font-size: 11px; color: var(--sv-text-dim);">Avistado · 2.810m</span>
                            </div>
                            <div class="species-catalog-card card-cat-patrimonio">
                                <i class="fa-solid fa-circle-check text-xs" style="color: #34d399;"></i>
                                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; flex: 1;">Puente de madera</span>
                                <span style="font-size: 11px; color: var(--sv-text-dim);">Registrado · 2.712m</span>
                            </div>
                        </div>

                        <!-- Botón Descargar Resumen -->
                        <button type="button" style="margin-top: 10px; width: 100%; padding: 12px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none; color: #04111d; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                            <i class="fa-solid fa-download"></i> Descargar Pasaporte de Expedición
                        </button>
                    </div>
                </div>
            </div>
        </section>

    </div>


    <!-- ==========================================================================
         FILA COMBINADA: TUTORIAL ONBOARDING (3 PASOS) + MENÚS MÓVILES
         ========================================================================== -->
    <div class="modal-duo-grid">
        
        <!-- PANTALLA 07: TUTORIAL ONBOARDING DE PRIMERA VEZ -->
        <section class="figma-artboard-screen" id="artboard-07" data-name="PANTALLA 07 · Tutorial Onboarding">
            <div class="artboard-meta-header">
                <div class="artboard-meta-left">
                    <span class="artboard-pill-number">FRAME 07</span>
                    <h2 class="artboard-meta-title">Tutorial Onboarding · 3 Pasos de Navegación</h2>
                </div>
                <span class="artboard-meta-dim">520 × 520 px</span>
            </div>

            <div style="width: 100%; display: flex; justify-content: center;">
                <div class="onboarding-card pointer-events-auto" style="width: 100%; max-width: 520px; position: relative !important;">
                    <div class="onboarding-header">
                        <div class="onboarding-steps-indicator">
                            <div class="onboarding-dot active"></div>
                            <div class="onboarding-dot"></div>
                            <div class="onboarding-dot"></div>
                        </div>
                        <button class="onboarding-skip-btn">
                            Saltar tutorial <i class="fa-solid fa-xmark ml-1"></i>
                        </button>
                    </div>

                    <div class="onboarding-step-content">
                        <div class="onboarding-visual-bubble">
                            <div class="pulse-indicator"></div>
                            <i class="fa-solid fa-arrows-spin"></i>
                        </div>
                        <h3 class="onboarding-step-title">1. Mirar a tu alrededor</h3>
                        <p class="onboarding-step-desc">
                            Haz clic y arrastra con el ratón (o desliza tu dedo en la pantalla) para girar libremente la mirada en 360° por el sendero.
                        </p>
                    </div>

                    <div class="onboarding-footer">
                        <button class="onboarding-nav-btn onboarding-btn-prev" style="visibility: hidden;">
                            <i class="fa-solid fa-arrow-left"></i> Anterior
                        </button>
                        <button class="onboarding-nav-btn onboarding-btn-next">
                            Siguiente <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- PANTALLA 08: MENÚS Y CONTROLES MÓVILES (VISTA CELULAR) -->
        <section class="figma-artboard-screen" id="artboard-08" data-name="PANTALLA 08 · Interfaz Móvil">
            <div class="artboard-meta-header">
                <div class="artboard-meta-left">
                    <span class="artboard-pill-number">FRAME 08</span>
                    <h2 class="artboard-meta-title">Interfaz Móvil · Barra Superior, HUD & Dock</h2>
                </div>
                <span class="artboard-meta-dim">414 × 750 px · Viewport Móvil</span>
            </div>

            <div style="width: 100%; display: flex; justify-content: center;">
                <div style="width: 414px; height: 750px; border-radius: 40px; border: 2px solid var(--sv-sky-border); background: #07131e; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.8); display: flex; flex-direction: column; justify-content: space-between; padding: 18px 14px;">
                    <!-- Fondo de montaña -->
                    <div class="trail-3d-backdrop">
                        <svg viewBox="0 0 414 750" preserveAspectRatio="none">
                            <path d="M0,750 L0,450 Q100,380 207,410 T414,340 L414,750 Z" fill="#0c2338"/>
                            <polygon points="207,410 180,750 234,750" fill="#040b12"/>
                        </svg>
                    </div>

                    <!-- Barra Superior Móvil -->
                    <header id="mobile-top-bar" style="position: relative !important; top: auto; left: auto; right: auto; display: flex !important; width: 100%;">
                        <div class="mobile-top-main">
                            <button class="mobile-brand-pill">
                                <div class="mobile-brand-icon">
                                    <i class="fa-solid fa-mountain-sun"></i>
                                </div>
                                <div class="mobile-brand-titles">
                                    <span class="mobile-brand-title">Sendero Santa Ana</span>
                                    <span class="mobile-brand-sub">2.712 m · Cerros Orientales</span>
                                </div>
                            </button>
                            <div class="mobile-top-controls">
                                <button class="mobile-action-icon" aria-label="Sonido ambiental">
                                    <i class="fa-solid fa-volume-high"></i>
                                </button>
                                <button class="mobile-action-icon" aria-label="Información del sendero">
                                    <i class="fa-solid fa-circle-info"></i>
                                </button>
                            </div>
                        </div>
                    </header>

                    <!-- Hotspot flotante en pantalla móvil -->
                    <div class="static-beacon-wrap" style="top: 45%; left: 50%;">
                        <div class="static-beacon-ring" style="width: 46px; height: 46px; font-size: 16px;">
                            <i class="fa-solid fa-dove"></i>
                        </div>
                        <div class="static-beacon-tooltip" style="font-size: 10.5px;">
                            Colibrí chillón · 2.712m
                        </div>
                    </div>

                    <!-- Tarjeta Detalles Móvil (Desplegada) -->
                    <div style="position: relative; z-index: 30; display: flex; flex-direction: column; gap: 10px;">
                        <div id="mobile-details-card" style="position: relative !important; bottom: auto; left: auto; right: auto; display: block !important;">
                            <div class="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-chevron-up text-xs" style="color: var(--sv-sky-hover);"></i>
                                    <span class="text-xs font-bold" style="color: var(--sv-text-primary);">Detalles del sendero</span>
                                </div>
                                <span class="text-[10px] font-mono font-semibold" style="color: var(--sv-sky-hover);">2.712 m · 85 m</span>
                            </div>
                            <div style="border-top: 1px solid var(--sv-surface-border);">
                                <div class="grid grid-cols-4 gap-1 px-3 py-2">
                                    <div class="text-center">
                                        <div class="text-[9px] font-semibold" style="color: var(--sv-text-dim);">Altitud</div>
                                        <div class="text-[13px] font-semibold" style="color: var(--sv-sky-hover);">2.712 m</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-[9px] font-semibold" style="color: var(--sv-text-dim);">Recorrido</div>
                                        <div class="text-[13px] font-semibold" style="color: var(--sv-sky-hover);">85 m</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-[9px] font-semibold" style="color: var(--sv-text-dim);">Desnivel</div>
                                        <div class="text-[13px] font-semibold" style="color: var(--sv-sky-hover);">+14 m</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-[9px] font-semibold" style="color: var(--sv-text-dim);">Pendiente</div>
                                        <div class="text-[13px] font-semibold" style="color: var(--sv-sky-hover);">8 %</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Dock de Navegación Móvil -->
                        <nav id="shell-nav-mobile" style="position: relative !important; bottom: auto; left: auto; right: auto; display: flex !important;">
                            <button class="nav-m-btn nav-m-active flex flex-col items-center gap-0.5 font-medium cursor-pointer transition" style="color: var(--sv-sky-hover);">
                                <i class="fa-solid fa-compass text-base"></i>
                                <span class="text-[9px]">Sendero</span>
                            </button>
                            <button class="nav-m-btn flex flex-col items-center gap-0.5 transition cursor-pointer" style="color: var(--sv-text-dim);">
                                <i class="fa-solid fa-book-bookmark text-base"></i>
                                <span class="text-[9px]">Especies</span>
                            </button>
                            <button class="nav-m-btn flex flex-col items-center gap-0.5 transition cursor-pointer" style="color: var(--sv-text-dim);">
                                <i class="fa-solid fa-trophy text-base"></i>
                                <span class="text-[9px]">Bitácora</span>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </section>

    </div>

</body>
</html>
`;

// 5. Escribir archivos maestros
const outputPath1 = path.join(baseDir, 'sendero-vivo-interfaz-figma.html');
const outputPath2 = path.join(baseDir, 'docs/sendero-vivo-interfaz-figma.html');

fs.writeFileSync(outputPath1, htmlContent, 'utf8');
fs.writeFileSync(outputPath2, htmlContent, 'utf8');

console.log('✅ Archivo generado con éxito:');
console.log('  -> ' + outputPath1);
console.log('  -> ' + outputPath2);
console.log('Tamaño total: ' + (Buffer.byteLength(htmlContent, 'utf8') / 1024).toFixed(2) + ' KB');
