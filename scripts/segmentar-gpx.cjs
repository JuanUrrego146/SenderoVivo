#!/usr/bin/env node

const fs = require('node:fs');

const [, , sourcePath, outputPath, startArg, endArg, segmentName] = process.argv;

if (!sourcePath || !outputPath || !startArg || !endArg || !segmentName) {
    console.error(
        'Uso: node scripts/segmentar-gpx.cjs <fuente.json> <salida.json> <inicio-m> <fin-m> <nombre>'
    );
    process.exit(1);
}

const start = Number(startArg);
const end = Number(endArg);
if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error('El inicio y el fin deben ser distancias validas y el fin debe ser mayor');
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(source.points) || source.points.length < 2) {
    throw new Error(`${sourcePath} no contiene suficientes puntos GPS`);
}

const sourcePoints = source.points;
const sourceTotal = sourcePoints[sourcePoints.length - 1].distance;
if (start > sourceTotal || end > sourceTotal) {
    throw new Error(`El segmento ${start}-${end} m queda fuera del GPX (total: ${sourceTotal} m)`);
}

const interpolate = (distance) => {
    let right = sourcePoints.findIndex((point) => point.distance >= distance);
    if (right < 0) right = sourcePoints.length - 1;
    if (right === 0 || sourcePoints[right].distance === distance) {
        return { ...sourcePoints[right], distance };
    }

    const before = sourcePoints[right - 1];
    const after = sourcePoints[right];
    const span = after.distance - before.distance;
    const ratio = span === 0 ? 0 : (distance - before.distance) / span;
    const point = {
        distance,
        altitude: before.altitude + ratio * (after.altitude - before.altitude),
        lat: before.lat + ratio * (after.lat - before.lat),
        lon: before.lon + ratio * (after.lon - before.lon)
    };

    if (before.time && after.time) {
        const time = new Date(
            new Date(before.time).getTime()
            + ratio * (new Date(after.time).getTime() - new Date(before.time).getTime())
        );
        point.time = time.toISOString();
    } else if (before.time || after.time) {
        point.time = before.time || after.time;
    }

    return point;
};

const distances = [start];
for (const point of sourcePoints) {
    if (point.distance > start && point.distance < end) distances.push(point.distance);
}
distances.push(end);

const points = distances.map((distance) => ({
    ...interpolate(distance),
    distance: Number((distance - start).toFixed(3))
}));

const output = {
    ...JSON.parse(fs.readFileSync(outputPath, 'utf8')),
    distanceUnit: 'meters',
    sceneDistanceMapping: 'proportional',
    points,
    note: `${JSON.parse(fs.readFileSync(outputPath, 'utf8')).note} GPS: segmento ${segmentName} del archivo ${sourcePath}; cubre los metros ${start.toFixed(3)}-${end.toFixed(3)} del GPX (longitud ${(
        end - start
    ).toFixed(3)} m).`
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Segmentado ${segmentName}: ${points.length} puntos, ${start}-${end} m del GPX`);
