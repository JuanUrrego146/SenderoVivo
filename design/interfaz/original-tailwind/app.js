/* ==========================================================================
   DATA SOURCE: SPECIES & HOTSPOTS IN THE ECOLOGICAL TRAIL
   ========================================================================== */
const trailData = [
    {
        id: 'palma_cera',
        name: 'Palma de Cera del Quindío',
        scientific: 'Ceroxylon quindiuense',
        category: 'flora',
        icon: 'fa-seedling',
        color: '#34d399',
        typeLabel: 'Flora Nativa',
        image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Árbol nacional de Colombia. Alcanza alturas de hasta 60 metros.',
        fullDesc: 'Crece en los bosques de niebla andinos. Sus hojas proporcionan hábitat al loro orejiamarillo. Es una especie protegida debido a la deforestación histórica.',
        conservation: 'En Peligro (EN)',
        curiosity: 'Puede vivir más de 200 años y su tronco está cubierto por una cera impermeabilizante usada antiguamente para fabricar velas.',
        discovered: true,
        pos3D: { x: -2.2, y: 1.2, z: -1.5 },
        audioFreq: 520
    },
    {
        id: 'colibri_espada',
        name: 'Colibrí Pico Espada',
        scientific: 'Ensifera ensifera',
        category: 'fauna',
        icon: 'fa-dove',
        color: '#38bdf8',
        typeLabel: 'Avifauna',
        image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Única ave en el mundo con un pico más largo que su propio cuerpo.',
        fullDesc: 'Especializado en libar el néctar de flores tubulares como la Passiflora. Su vuelo consume gran energía, aleteando hasta 80 veces por segundo.',
        conservation: 'Preocupación Menor (LC)',
        curiosity: 'Debe mantener su pico apuntando hacia arriba al posarse para no perder el equilibrio.',
        discovered: true,
        pos3D: { x: 1.8, y: 1.8, z: -0.5 },
        audioFreq: 880
    },
    {
        id: 'orquidea_catleya',
        name: 'Orquídea Flor de Mayo',
        scientific: 'Cattleya trianae',
        category: 'flora',
        icon: 'fa-leaf',
        color: '#f472b6',
        typeLabel: 'Flora Epífita',
        image: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Hermosa orquídea epífita que crece sobre los troncos húmedos.',
        fullDesc: 'Crece sin parásitar a los árboles, absorbiendo humedad del aire y niebla del sendero. Sus colores varían del rosa pálido al violeta profundo.',
        conservation: 'Vulnerable (VU)',
        curiosity: 'Fue elegida flor nacional en 1936 por los vivos colores de su pétalo lipófilo central.',
        discovered: true,
        pos3D: { x: -0.8, y: -0.6, z: 2.1 },
        audioFreq: 440
    },
    {
        id: 'musgo_turbera',
        name: 'Colchón de Agua (Musgo)',
        scientific: 'Sphagnum magellanicum',
        category: 'curiosidades',
        icon: 'fa-lightbulb',
        color: '#fbbf24',
        typeLabel: 'Dato Curioso / Hidrología',
        image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Esponja natural del bosque nublado que almacena agua de lluvia.',
        fullDesc: 'Los musgos absorben hasta 20 veces su peso seco en agua, regulando el caudal de las quebradas que nacen en la montaña durante épocas de sequía.',
        conservation: 'Protección de Microcuenca',
        curiosity: 'Sin esta capa vegetal, el sendero sufriría erosión severa y deslizamientos de tierra con lluvias intensas.',
        discovered: false,
        pos3D: { x: 2.2, y: -1.2, z: 1.2 },
        audioFreq: 330
    },
    {
        id: 'oso_anteojos',
        name: 'Oso Andino (Rastros)',
        scientific: 'Tremarctos ornatus',
        category: 'fauna',
        icon: 'fa-paw',
        color: '#38bdf8',
        typeLabel: 'Fauna / Mamífero',
        image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Marcas de garras en la corteza de los árboles del sendero.',
        fullDesc: 'Único oso nativo de Sudamérica. Es un gran dispersor de semillas de frutos silvestres y constructor de plataformas en las copas de los árboles.',
        conservation: 'Vulnerable (VU)',
        curiosity: 'El patrón de manchas blancas alrededor de sus ojos es único en cada individuo, como una huella dactilar.',
        discovered: false,
        pos3D: { x: -1.5, y: -1.5, z: -2.0 },
        audioFreq: 220
    },
    {
        id: 'helecho_arborescente',
        name: 'Helecho Arborescente Gigante',
        scientific: 'Cyathea caracasana',
        category: 'flora',
        icon: 'fa-seedling',
        color: '#34d399',
        typeLabel: 'Fósil Viviente',
        image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
        shortDesc: 'Planta prehistórica que sobrevivió desde la época de los dinosaurios.',
        fullDesc: 'No produce flores ni semillas; se reproduce por esporas microscópicas bajo sus frondas. Su tronco está formado por raíces aéreas entrelazadas.',
        conservation: 'Protección Especial',
        curiosity: 'Crecen extremadamente lento, apenas 1 a 2 centímetros por año.',
        discovered: false,
        pos3D: { x: 1.2, y: 0.8, z: -2.2 },
        audioFreq: 600
    }
];

/* ==========================================================================
   THREE.JS 3D SCENE SETUP
   ========================================================================== */
let scene, camera, renderer, controls;
let splatParticles, trailLineMesh, treeGroup;
let currentFilter = 'all';

function initThreeJS() {
    const container = document.getElementById('three-canvas');
    if (!container) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    // 1. Color de fondo del cielo (Azul cielo diurno) y la niebla que se funde con el horizonte
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.05);

    camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 6);

    renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 12;

    // 2. Luz ambiental clara y luminosa simulando la luz rebotada del cielo diurno
    const ambientLight = new THREE.AmbientLight(0xd9f99d, 1.2);
    scene.add(ambientLight);

    // 3. Sol brillante y cálido desde arriba
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(5, 12, 5);
    scene.add(sunLight);

    // 4. Luz de realce suave para los elementos del suelo
    const pointLight = new THREE.PointLight(0xfef08a, 2, 10);
    pointLight.position.set(0, 2, 0);
    scene.add(pointLight);

    createTerrainAndTrail();
    createParticlesCloud();
    create3DTrees();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onWindowResize);
    animate();
}

function createTerrainAndTrail() {
    const groundGeo = new THREE.PlaneGeometry(20, 20, 32, 32);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        pos.setZ(i, Math.sin(vx * 0.5) * Math.cos(vy * 0.5) * 0.4);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    scene.add(ground);

    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3, -1.3, -3),
        new THREE.Vector3(-1.5, -1.3, -1),
        new THREE.Vector3(0, -1.3, 0),
        new THREE.Vector3(1.5, -1.3, 1),
        new THREE.Vector3(2.5, -1.3, 3)
    ]);

    const points = curve.getPoints(50);
    const trailGeo = new THREE.BufferGeometry().setFromPoints(points);
    const trailMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 3 });
    trailLineMesh = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLineMesh);
}

function createParticlesCloud() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorOptions = [
        new THREE.Color(0x34d399),
        new THREE.Color(0x10b981),
        new THREE.Color(0x38bdf8)
    ];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.2) * 5 - 1;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

        const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });

    splatParticles = new THREE.Points(geometry, particleMat);
    scene.add(splatParticles);
}

function create3DTrees() {
    treeGroup = new THREE.Group();
    
    // Lista original y 5 nuevas posiciones más lejanas (z más alto en negativo o positivo)
    const treePositions = [
        { x: -3.5, z: -2 }, { x: 3.2, z: -3 },
        { x: -2.8, z: 2 }, { x: 2.8, z: 2.5 },
        { x: 0, z: -4 },
        // Nuevos árboles más lejos
        { x: -6.0, z: -7.0 }, { x: 6.0, z: -7.0 }, 
        { x: -8.0, z: 0 }, { x: 8.0, z: 0 }, 
        { x: 0, z: 8.0 }
    ];

    treePositions.forEach((p, index) => {
        // Determinamos si es un árbol lejano (índice mayor a 4) para hacerlo más oscuro
        const isFarTree = index > 4;
        
        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 3, 8);
        // Tronco estándar o más oscuro para los lejanos
        const trunkMat = new THREE.MeshStandardMaterial({ 
            color: isFarTree ? 0x271a14 : 0x3f2e25, 
            roughness: 0.9 
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(p.x, 0, p.z);

        const leavesGeo = new THREE.DodecahedronGeometry(1.2, 1);
        // Hojas: Verde bosque profundo para los cercanos, casi negro/verde muy oscuro para los lejanos
        const leavesMat = new THREE.MeshStandardMaterial({ 
            color: isFarTree ? 0x022c22 : 0x064e3b, 
            roughness: 0.8 
        });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(p.x, 1.8, p.z);

        treeGroup.add(trunk);
        treeGroup.add(leaves);
    });

    scene.add(treeGroup);
}

function animate() {
    requestAnimationFrame(animate);
    if (splatParticles) {
        splatParticles.rotation.y += 0.0012;
    }
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
    updateHotspotsOverlay();
}

function onWindowResize() {
    const container = document.getElementById('three-canvas');
    if (!container || !camera || !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/* ==========================================================================
   2D HOTSPOTS MAPPING (MOBILE & PC COMPATIBLE)
   ========================================================================== */
function updateHotspotsOverlay() {
    const overlay = document.getElementById('hotspots-overlay');
    if (!overlay || !camera) return;

    const container = document.getElementById('three-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    let html = '';

    trailData.forEach(item => {
        if (currentFilter !== 'all' && item.category !== currentFilter) return;

        const vec = new THREE.Vector3(item.pos3D.x, item.pos3D.y, item.pos3D.z);
        vec.project(camera);

        const x = (vec.x * 0.5 + 0.5) * width;
        const y = (-vec.y * 0.5 + 0.5) * height;

        if (vec.z < 1) {
            html += `
                <div onclick="selectHotspot('${item.id}')" 
                     ontouchstart="selectHotspot('${item.id}')"
                     style="left: ${x}px; top: ${y}px;" 
                     class="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-30 touch-manipulation">
                    <div class="hotspot-ring"></div>
                    <div class="w-10 h-10 rounded-2xl glass-panel border flex items-center justify-center text-sm transition-all duration-300 transform group-hover:scale-125 shadow-xl"
                         style="border-color: ${item.color}; color: ${item.color}; background: rgba(15, 23, 42, 0.85);">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <div class="absolute left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        <div class="glass-panel px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-100 flex items-center gap-1.5 shadow-lg">
                            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${item.color}"></span>
                            ${item.name}
                        </div>
                    </div>
                </div>
            `;
        }
    });

    overlay.innerHTML = html;
}

/* ==========================================================================
   INTERACTION & UI LOGIC
   ========================================================================== */
function selectHotspot(id) {
    const item = trailData.find(x => x.id === id);
    if (!item) return;

    playSynthBeep(item.audioFreq || 440);

    const targetPos = new THREE.Vector3(item.pos3D.x, item.pos3D.y + 0.2, item.pos3D.z + 2.5);
    smoothCameraMove(targetPos, new THREE.Vector3(item.pos3D.x, item.pos3D.y, item.pos3D.z));

    const sheet = document.getElementById('bottom-sheet');
    const content = document.getElementById('sheet-content');

    if (!sheet || !content) return;

    content.innerHTML = `
        <div class="relative pt-2">
            <button onclick="closeBottomSheet()" ontouchstart="closeBottomSheet(); event.preventDefault();" 
                    class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition border border-slate-700 z-50 touch-manipulation cursor-pointer shadow-lg">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="flex items-start gap-3 mb-3 pr-6">
                <img src="${item.image}" alt="${item.name}" class="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-md">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border" style="background:${item.color}15; color:${item.color}; border-color:${item.color}40;">
                            <i class="fa-solid ${item.icon}"></i> ${item.typeLabel}
                        </span>
                    </div>
                    <h3 class="text-base font-bold text-slate-100 leading-snug">${item.name}</h3>
                    <p class="text-[11px] text-slate-400 italic font-mono">${item.scientific}</p>
                </div>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed mb-3">${item.fullDesc}</p>

            <div class="bg-slate-900/80 rounded-2xl p-3 border border-slate-800 mb-4">
                <h4 class="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <i class="fa-solid fa-lightbulb"></i> ¿Sabías que?
                </h4>
                <p class="text-[11px] text-slate-300">${item.curiosity}</p>
            </div>

            <div class="flex gap-2">
                <button onclick="playSpeciesSound(${item.audioFreq})" ontouchstart="playSpeciesSound(${item.audioFreq}); event.preventDefault();"
                        class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2 touch-manipulation cursor-pointer">
                    <i class="fa-solid fa-volume-high text-emerald-400"></i> Escuchar Canto
                </button>
                <button onclick="markAsDiscovered('${item.id}')" ontouchstart="markAsDiscovered('${item.id}'); event.preventDefault();"
                        class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 touch-manipulation cursor-pointer">
                    <i class="fa-solid fa-circle-check"></i> ${item.discovered ? 'Descubierto' : 'Marcar Hallazgo'}
                </button>
            </div>
        </div>
    `;

    sheet.classList.remove('translate-y-full');
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.add('translate-y-full');
}

function smoothCameraMove(targetCamPos, lookAtPos) {
    if (!camera || !controls) return;
    const startCamPos = camera.position.clone();
    const duration = 1000;
    const startTime = performance.now();

    function animateCam(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startCamPos, targetCamPos, ease);
        controls.target.lerp(lookAtPos, ease);

        if (progress < 1) {
            requestAnimationFrame(animateCam);
        }
    }
    requestAnimationFrame(animateCam);
}

function resetCamera() {
    smoothCameraMove(new THREE.Vector3(0, 3.5, 6), new THREE.Vector3(0, 0, 0));
    closeBottomSheet();
}

function filterCategory(cat) {
    currentFilter = cat;
    ['all', 'flora', 'fauna', 'curiosidades'].forEach(c => {
        const btn = document.getElementById(`filter-${c}`);
        if (btn) {
            if (c === cat) {
                btn.className = 'glass-pill glass-pill-active px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 touch-manipulation cursor-pointer';
            } else {
                btn.className = 'glass-pill px-3 py-1 rounded-full text-[11px] font-semibold text-slate-300 whitespace-nowrap transition flex items-center gap-1.5 hover:text-emerald-300 touch-manipulation cursor-pointer';
            }
        }
    });
    updateHotspotsOverlay();
}

function markAsDiscovered(id) {
    const item = trailData.find(x => x.id === id);
    if (!item) return;

    item.discovered = true;
    updateDiscoveredProgress();

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 }
        });
    }

    selectHotspot(id);
}

function updateDiscoveredProgress() {
    const elem = document.getElementById('discovered-counter');
    if (elem) {
        const count = trailData.filter(x => x.discovered).length;
        elem.innerText = `${count} de ${trailData.length} Especies Descubiertas`;
    }
}

/* ==========================================================================
   TAB NAVIGATION & PANELS
   ========================================================================== */
function switchTab(tab) {
    closeBottomSheet();
    const panel = document.getElementById('tab-panel-container');
    const content = document.getElementById('tab-panel-content');

    if (!panel || !content) return;

    ['trail', 'catalog', 'audio', 'quest'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'flex flex-col items-center gap-1 text-emerald-400 font-medium touch-manipulation cursor-pointer';
            } else {
                btn.className = 'flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition touch-manipulation cursor-pointer';
            }
        }
    });

    if (tab === 'trail') {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
        return;
    }

    panel.classList.remove('hidden');
    panel.classList.add('flex');

    if (tab === 'catalog') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-book-bookmark text-emerald-400"></i> Guía de Especies del Sendero
            </h2>
            <div class="space-y-3">
                ${trailData.map(item => `
                    <div onclick="selectHotspot('${item.id}'); closeTabPanel();" ontouchstart="selectHotspot('${item.id}'); closeTabPanel();" 
                         class="glass-panel rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-emerald-500/50 transition touch-manipulation">
                        <img src="${item.image}" class="w-14 h-14 rounded-xl object-cover">
                        <div class="flex-1">
                            <span class="text-[9px] uppercase font-bold text-emerald-400 block">${item.typeLabel}</span>
                            <h4 class="text-xs font-bold text-slate-100">${item.name}</h4>
                            <p class="text-[10px] text-slate-400 line-clamp-1">${item.shortDesc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right text-xs text-slate-500"></i>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'audio') {
        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-headphones text-emerald-400"></i> Paisajes Sonoros & Cantos
            </h2>

            <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-300 mb-2">Audios de Aves Registradas</h4>
                ${trailData.filter(x => x.category === 'fauna').map(item => `
                    <div onclick="playSpeciesSound(${item.audioFreq})" ontouchstart="playSpeciesSound(${item.audioFreq})" 
                         class="glass-panel p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 touch-manipulation">
                        <div class="flex items-center gap-2.5">
                            <i class="fa-solid fa-circle-play text-emerald-400 text-lg"></i>
                            <div>
                                <h5 class="text-xs font-bold text-slate-200">${item.name}</h5>
                                <span class="text-[10px] text-slate-400 font-mono">${item.scientific}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-mono text-emerald-400">0:15</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'quest') {
        const discoveredCount = trailData.filter(x => x.discovered).length;
        const totalCount = trailData.length;
        const progressPercent = Math.round((discoveredCount / totalCount) * 100);

        content.innerHTML = `
            <h2 class="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-trophy text-amber-400"></i> Desafío Eco-Explorador
            </h2>
            <div class="glass-panel rounded-2xl p-4 mb-4 border-amber-500/30">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-200">Insignia: Guardián del Sendero</span>
                    <span class="text-xs font-bold text-amber-400">${discoveredCount} / ${totalCount}</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-2">
                    <div class="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                </div>
                <p class="text-[10px] text-slate-400 text-right font-mono">${progressPercent}% Completado</p>
            </div>
            <div class="space-y-2">
                ${trailData.map(item => `
                    <div class="glass-panel p-3 rounded-xl flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg ${item.discovered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-600'} flex items-center justify-center text-xs">
                                <i class="fa-solid ${item.discovered ? 'fa-check' : 'fa-lock'}"></i>
                            </div>
                            <div>
                                <h5 class="text-xs font-bold ${item.discovered ? 'text-slate-100' : 'text-slate-500'}">${item.name}</h5>
                                <span class="text-[10px] text-slate-400">${item.typeLabel}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold ${item.discovered ? 'text-emerald-400' : 'text-slate-600'}">
                            ${item.discovered ? '+50 PTS' : 'Bloqueado'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function closeTabPanel() {
    const panel = document.getElementById('tab-panel-container');
    if (panel) panel.classList.add('hidden');
    switchTab('trail');
}

/* ==========================================================================
   WEB AUDIO SYNTHESIZER (MOBIL COMPATIBLE)
   ========================================================================== */
let audioCtx;
let isAudioPlaying = false;
let windNoiseNode;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function unlockMobileAudio() {
    initAudioContext();
}
window.addEventListener('touchstart', unlockMobileAudio, { passive: true });
window.addEventListener('click', unlockMobileAudio, { passive: true });

function toggleAudio() {
    initAudioContext();

    isAudioPlaying = !isAudioPlaying;
    const btn = document.getElementById('ambient-audio-btn');
    const icon = document.getElementById('audio-icon');

    if (isAudioPlaying) {
        if (icon) icon.className = 'fa-solid fa-volume-high text-emerald-400';
        if (btn) btn.classList.add('bg-emerald-500/30');
        startForestSound();
    } else {
        if (icon) icon.className = 'fa-solid fa-volume-xmark';
        if (btn) btn.classList.remove('bg-emerald-500/30');
        stopForestSound();
    }
}

function startForestSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    windNoiseNode = audioCtx.createBufferSource();
    windNoiseNode.buffer = noiseBuffer;
    windNoiseNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    windNoiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    windNoiseNode.start();
}

function stopForestSound() {
    if (windNoiseNode) {
        try { windNoiseNode.stop(); } catch(e){}
    }
}

function playSynthBeep(freq = 440) {
    initAudioContext();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
}

function playSpeciesSound(freq) {
    initAudioContext();
    if (!audioCtx) return;

    const targetFreq = freq || 500;

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(targetFreq + Math.random() * 150, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(targetFreq + 350, audioCtx.currentTime + 0.09);

                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start();
                osc.stop(audioCtx.currentTime + 0.09);
            } catch(e) {}
        }, i * 110);
    }
}

/* ==========================================================================
   MODALS & SEARCH
   ========================================================================== */
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (input) {
        input.focus();
        handleSearch();
    }
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    const query = input.value.toLowerCase();
    const filtered = trailData.filter(x => x.name.toLowerCase().includes(query) || x.scientific.toLowerCase().includes(query));

    results.innerHTML = filtered.map(item => `
        <div onclick="selectHotspot('${item.id}'); closeSearchModal();" ontouchstart="selectHotspot('${item.id}'); closeSearchModal();"
             class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 touch-manipulation">
            <div>
                <h4 class="text-xs font-bold text-slate-100">${item.name}</h4>
                <p class="text-[10px] text-slate-400 font-mono">${item.scientific}</p>
            </div>
            <i class="fa-solid fa-arrow-right text-xs text-emerald-400"></i>
        </div>
    `).join('');
}

window.onload = () => {
    initThreeJS();
    updateDiscoveredProgress();
};