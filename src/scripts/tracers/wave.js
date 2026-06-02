import { clamp, lerp, diag } from "../math";

//#region horizontalWave
export function horizontalWave(arr, w, h, {
    frequency = 0.15,
    lineCount = 50,
    amplitude = 1,
    sampling = 1,
    sampleStep = 1,
    am = true,
    fm = true,
} = {}) {
    const lines = [];
    const lineHeight = h / Math.max(1, lineCount);
    const halfLineHeight = lineHeight / 2;
    const waveAmplitude = halfLineHeight * amplitude;
    const yInset = halfLineHeight + waveAmplitude;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        const y = lineCount === 1
            ? h / 2
            : lerp(yInset, h - yInset, lineIndex / (lineCount - 1));

        const line = [];
        let phase = 0;

        for (let x = 0; x < w; x += sampling) {
            const value = avgRect(arr, w, h, x, y - halfLineHeight, x + sampling, y + halfLineHeight, sampleStep);

            phase += TWOPI * frequency * (fm ? value : 1);

            line.push([
                x,
                y + Math.sin(phase) * waveAmplitude * (am ? value : 1)
            ]);
        }

        if (!line.length || line[line.length - 1][0] < w - 1) {
            const value = avgRect(arr, w, h, w - 1 - sampling, y - halfLineHeight, w - 1, y + halfLineHeight, sampleStep);

            phase += TWOPI * frequency * (fm ? value : 1);
            line.push([
                w - 1,
                y + Math.sin(phase) * waveAmplitude * (am ? value : 1)
            ]);
        }

        lines.push(line);
    }

    return lines;
}
//#endregion

//#region circularWave
export function circularWave(arr, w, h, {
    frequency = 0.15,
    lineCount = 50,
    amplitude = 1,
    sampling = 1,
    sampleStep = 1,
    am = true,
    fm = true,
    centerX = w / 2,
    centerY = h / 2,
    startRadius = 1,
} = {}) {
    const lineHeight = spiralLineHeight(w, h, centerX, centerY, lineCount);
    const halfLineHeight = lineHeight / 2;
    const margin = halfLineHeight * amplitude;
    const maxRadius = spiralMaxRadius(w, h, centerX, centerY) - margin;
    const points = [[centerX, centerY]];

    let phase = 0;
    let radius = Math.max(startRadius, 0.001);
    let theta = 0;
    let x = centerX + radius * Math.sin(theta);
    let y = centerY + radius * Math.cos(theta);

    while (radius <= maxRadius && inside(x, y, w, h, margin)) {
        const thetaStep = Math.min(Math.PI / 4, sampling / Math.max(radius, 1));
        const nextRadius = radius + lineHeight * thetaStep / TWOPI;
        const nextTheta = theta + thetaStep;
        const nextX = centerX + nextRadius * Math.sin(nextTheta);
        const nextY = centerY + nextRadius * Math.cos(nextTheta);

        if (nextRadius > maxRadius || !inside(nextX, nextY, w, h, margin)) break;

        const value = avgTube(arr, w, h, x, y, nextX, nextY, halfLineHeight, sampleStep);
        phase += TWOPI * frequency * (fm ? value : 1);

        const displacedRadius = radius + Math.sin(phase) * margin * (am ? value : 1);
        points.push([
            centerX + displacedRadius * Math.sin(theta),
            centerY + displacedRadius * Math.cos(theta),
        ]);

        radius = nextRadius;
        theta = nextTheta;
        x = nextX;
        y = nextY;
    }

    return [points];
}
//#endregion

//#region polygonWave
export function polygonWave(arr, w, h, {
    vertices = 5,
    frequency = 0.15,
    lineCount = 50,
    amplitude = 1,
    sampling = 1,
    sampleStep = 1,
    am = true,
    fm = true,
    centerX = w / 2,
    centerY = h / 2,
    startAngle = 0,
} = {}) {
    const vertexCount = clamp(vertices | 0, 3, 8);
    const lineHeight = spiralLineHeight(w, h, centerX, centerY, lineCount);
    const halfLineHeight = lineHeight / 2;
    const margin = halfLineHeight * amplitude;
    const segmentTurn = TWOPI / vertexCount;
    const segmentGrow = polygonSegmentGrow(vertexCount, lineHeight, sampling);
    const points = [[centerX, centerY]];

    let phase = 0;
    let x = centerX;
    let y = centerY;
    let theta = startAngle;
    let travelled = 0;
    let segmentLength = 1;

    while (inside(x, y, w, h, margin)) {
        const nextX = x + sampling * Math.cos(theta);
        const nextY = y + sampling * Math.sin(theta);

        if (!inside(nextX, nextY, w, h, margin)) break;

        const value = avgTube(arr, w, h, x, y, nextX, nextY, halfLineHeight, sampleStep);
        phase += TWOPI * frequency * (fm ? value : 1);

        const displacement = Math.sin(phase) * margin * (am ? value : 1);
        points.push([
            x - displacement * Math.sin(theta),
            y + displacement * Math.cos(theta),
        ]);

        if (++travelled >= segmentLength) {
            travelled = 0;
            theta += segmentTurn;
            segmentLength += segmentGrow;
        }

        x = nextX;
        y = nextY;
    }

    return [points];
}
//#endregion

//#region helpers
const TWOPI = Math.PI * 2;

function inside(x, y, w, h, margin = 0) {
    return x >= margin && y >= margin && x < w - margin && y < h - margin;
}

function spiralMaxRadius(w, h, centerX, centerY) {
    return Math.min(centerX, centerY, w - centerX, h - centerY);
}

function spiralLineHeight(w, h, centerX, centerY, lineCount) {
    return spiralMaxRadius(w, h, centerX, centerY) * 2 / Math.max(1, lineCount);
}

function polygonSegmentGrow(vertexCount, lineHeight, sampling) {
    const sideGrow = 2 * lineHeight * Math.tan(Math.PI / vertexCount) / vertexCount;
    return Math.max(1, Math.round(sideGrow / Math.max(sampling, 0.001)));
}

function gray(arr, w, h, x, y) {
    return clamp(
        arr[clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)],
        0,
        255
    );
}

function sampleCount(size, sampleStep) {
    return Math.max(1, Math.ceil(Math.abs(size) / Math.max(0.001, sampleStep)));
}

function avgRect(arr, w, h, x0, y0, x1, y1, sampleStep) {
    const along = sampleCount(x1 - x0, sampleStep);
    const across = sampleCount(y1 - y0, sampleStep);
    let sum = 0;

    for (let row = 0; row < across; row++) {
        const y = lerp(y0, y1, (row + 0.5) / across);

        for (let col = 0; col < along; col++) {
            const x = lerp(x0, x1, (col + 0.5) / along);
            sum += gray(arr, w, h, x, y) / 255;
        }
    }

    return sum / (along * across);
}

function avgTube(arr, w, h, x0, y0, x1, y1, halfWidth, sampleStep) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = diag(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const along = sampleCount(length, sampleStep);
    const across = sampleCount(halfWidth * 2, sampleStep);
    let sum = 0;

    for (let stepIndex = 0; stepIndex < along; stepIndex++) {
        const t = (stepIndex + 0.5) / along;
        const centerX = lerp(x0, x1, t);
        const centerY = lerp(y0, y1, t);

        for (let offsetIndex = 0; offsetIndex < across; offsetIndex++) {
            const offset = lerp(-halfWidth, halfWidth, (offsetIndex + 0.5) / across);
            sum += gray(arr, w, h, centerX + normalX * offset, centerY + normalY * offset) / 255;
        }
    }

    return sum / (along * across);
}
//#endregion
