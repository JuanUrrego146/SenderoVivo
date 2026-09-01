/**
 * Test para GpsTrack — verifícalo corriendo:
 *   node src/models/GpsTrack.test.js
 *
 * No requiere PlayCanvas ni navegador.
 */

import { GpsTrack } from './GpsTrack.js';

// Datos de prueba: un track ficticio de 100m con pendiente gradual
const mockTrack = {
    version: 1,
    capturedOn: '2026-09-01',
    sceneWaypoints: [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 }
    ],
    points: [
        { distance: 0, altitude: 2000, lat: -4.123, lon: -70.456 },
        { distance: 25, altitude: 2010, lat: -4.124, lon: -70.457 },
        { distance: 50, altitude: 2030, lat: -4.125, lon: -70.458 },
        { distance: 75, altitude: 2050, lat: -4.126, lon: -70.459 },
        { distance: 100, altitude: 2080, lat: -4.127, lon: -70.460 }
    ],
    eyeHeight: 1.7,
    corridorRadius: 1.5
};

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ ${message}`);
    }
}

console.log('=== GpsTrack Tests ===\n');

const gps = new GpsTrack(mockTrack);

// Test 1: distancia total
console.log('📏 Distancia total');
assert(gps.totalDistance() === 100, 'totalDistance() = 100m');

// Test 2: altitud en puntos conocidos
console.log('\n📍 Altitud en puntos');
assert(gps.altitudeAt(0) === 2000, 'altitudeAt(0) = 2000');
assert(gps.altitudeAt(50) === 2030, 'altitudeAt(50) = 2030');
assert(gps.altitudeAt(100) === 2080, 'altitudeAt(100) = 2080');

// Test 3: interpolación de altitud entre puntos
console.log('\n🔀 Interpolación de altitud');
const alt25 = gps.altitudeAt(25);
assert(alt25 === 2010, `altitudeAt(25) = 2010 (exacto)`);

// Entre 0 y 25: interpolado
const altMid = gps.altitudeAt(12.5);
assert(altMid === 2005, `altitudeAt(12.5) = 2005 (interpolado)`);

// Test 4: distancia recorrida y restante
console.log('\n📊 Distancia recorrida y restante');
assert(gps.distanceTraveled(50) === 50, 'distanceTraveled(50) = 50');
assert(gps.distanceRemaining(50) === 50, 'distanceRemaining(50) = 50');
assert(gps.distanceTraveled(150) === 100, 'distanceTraveled(150) = 100 (clamped)');
assert(gps.distanceRemaining(150) === 0, 'distanceRemaining(150) = 0 (clamped)');

// Test 5: desnivel acumulado
console.log('\n⛰️  Desnivel acumulado');
const elev0 = gps.cumulativeElevation(0);
assert(elev0 === 0, 'cumulativeElevation(0) = 0');

const elev50 = gps.cumulativeElevation(50);
assert(elev50 === 30, 'cumulativeElevation(50) = 30m (2000→2010→2030)');

const elev100 = gps.cumulativeElevation(100);
assert(elev100 === 80, 'cumulativeElevation(100) = 80m (total)');

// Test 6: pendiente
console.log('\n% Pendiente');
const slope50 = gps.slopeAt(50, 50);
// Entre 0 (2000m) y 100 (2080m) hay 80m de desnivel en 100m horiz
// pendiente = 80/100 * 100 = 80%
assert(Math.abs(slope50 - 80) < 0.1, `slopeAt(50, window=50) ≈ 80%`);

// Pendiente con ventana 25m en 12.5m: antes=0(2000), después=37.5(2020), desnivel=20 en 37.5
const slopeStart = gps.slopeAt(12.5, 25);
assert(Math.abs(slopeStart - 53.33) < 1, `slopeAt(12.5, window=25) ≈ 53.33%`);

// Test 7: track vacío (sin datos GPS reales)
console.log('\n🚫 Track vacío (datos de práctica)');
const emptyTrack = new GpsTrack({
    sceneWaypoints: [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 }
    ],
    points: []
});
assert(emptyTrack.altitudeAt(0) === null, 'altitudeAt() = null sin datos GPS');
assert(emptyTrack.cumulativeElevation(0) === null, 'cumulativeElevation() = null sin datos');
assert(emptyTrack.slopeAt(0) === null, 'slopeAt() = null sin datos');
assert(emptyTrack.totalDistance() > 0, 'totalDistance() = ~50 (escena)');
assert(emptyTrack.distanceTraveled(25) === 25, 'distanceTraveled(25) = 25 (funciona igual)');

// Test 8: clamping de distancia
console.log('\n📌 Clamping de distancia');
assert(gps.distanceTraveled(-10) === 0, 'distanceTraveled(-10) = 0 (clamped)');
assert(gps.distanceRemaining(-10) === 100, 'distanceRemaining(-10) = 100 (clamped)');

console.log('\n✅ Todos los tests pasaron!\n');
