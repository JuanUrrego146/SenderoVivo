#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    console.error('Uso: node scripts/convertir-gpx.cjs <entrada.gpx> <salida.json>');
    process.exit(1);
}

const gpx = fs.readFileSync(inputPath, 'utf8');
const trackPoints = [...gpx.matchAll(
    /<trkpt\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g
)].map((match) => {
    const [, lat, lon, body] = match;
    const elevation = body.match(/<ele>\s*([-+]?(?:\d+\.?\d*|\.\d+))\s*<\/ele>/);
    const time = body.match(/<time>\s*([^<]+?)\s*<\/time>/);

    if (!elevation) {
        throw new Error(`El punto ${lat},${lon} no tiene elevación`);
    }

    return {
        lat: Number(lat),
        lon: Number(lon),
        altitude: Number(elevation[1]),
        ...(time ? { time: time[1] } : {})
    };
});

if (trackPoints.length < 2) {
    throw new Error('El GPX debe contener al menos dos puntos de track');
}

const toRadians = (degrees) => degrees * Math.PI / 180;
const haversineDistance = (a, b) => {
    const earthRadius = 6371000;
    const latitude1 = toRadians(a.lat);
    const latitude2 = toRadians(b.lat);
    const deltaLatitude = toRadians(b.lat - a.lat);
    const deltaLongitude = toRadians(b.lon - a.lon);
    const sinLatitude = Math.sin(deltaLatitude / 2);
    const sinLongitude = Math.sin(deltaLongitude / 2);
    const arc = sinLatitude * sinLatitude
        + Math.cos(latitude1) * Math.cos(latitude2) * sinLongitude * sinLongitude;

    return 2 * earthRadius * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
};

let distance = 0;
const points = trackPoints.map((point, index) => {
    if (index > 0) {
        distance += haversineDistance(trackPoints[index - 1], point);
    }

    return {
        distance: Number(distance.toFixed(3)),
        altitude: point.altitude,
        lat: point.lat,
        lon: point.lon,
        ...(point.time ? { time: point.time } : {})
    };
});

const output = {
    version: 2,
    capturedOn: points[0].time?.slice(0, 10) || null,
    source: path.basename(inputPath),
    distanceUnit: 'meters',
    sceneDistanceMapping: 'proportional',
    sceneWaypoints: [
        { x: 2.942, y: -0.488, z: -2.205 },
        { x: -8.766, y: 0.942, z: 5.889 }
    ],
    eyeHeight: 0,
    corridorRadius: 1.5,
    points
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Convertidos ${points.length} puntos; distancia total: ${distance.toFixed(3)} m`);
