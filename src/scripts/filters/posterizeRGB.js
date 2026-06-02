//#region posterizeIData
// n [1.. n]
export function posterizeIData(idata, n) {
    const data = idata.data;
    const w = idata.width;
    const h = idata.height;
    const pixelCount = w * h;
    const expectedLength = pixelCount * 4;
    const colors = collectUniqueRGBColors(data, pixelCount);

    if (colors.length <= n) {
        return;
    }

    const palette = buildPaletteKMeans(colors, n, 10);

    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        const color = (r << 16) | (g << 8) | b;
        const nearest = findNearestColor(color, palette);

        data[p] = (nearest >> 16) & 255;
        data[p + 1] = (nearest >> 8) & 255;
        data[p + 2] = nearest & 255;
    }
}

function collectUniqueRGBColors(data, pixelCount) {
    const set = new Set();

    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        set.add((r << 16) | (g << 8) | b);
    }

    return Array.from(set);
}

function buildPaletteKMeans(colors, n, iterations) {
    const centers = initCenters(colors, n);

    const sumsR = new Float32Array(n);
    const sumsG = new Float32Array(n);
    const sumsB = new Float32Array(n);
    const counts = new Uint32Array(n);

    for (let iter = 0; iter < iterations; iter++) {
        sumsR.fill(0);
        sumsG.fill(0);
        sumsB.fill(0);
        counts.fill(0);

        for (let i = 0; i < colors.length; i++) {
            const color = colors[i];
            const nearest = findNearestIndex(color, centers);

            sumsR[nearest] += (color >> 16) & 255;
            sumsG[nearest] += (color >> 8) & 255;
            sumsB[nearest] += color & 255;
            counts[nearest]++;
        }

        for (let i = 0; i < n; i++) {
            if (counts[i] === 0) continue;

            const r = Math.round(sumsR[i] / counts[i]);
            const g = Math.round(sumsG[i] / counts[i]);
            const b = Math.round(sumsB[i] / counts[i]);

            centers[i] = (r << 16) | (g << 8) | b;
        }
    }

    const palette = new Uint32Array(n);

    for (let i = 0; i < n; i++) {
        palette[i] = findNearestColor(centers[i], colors);
    }

    return palette;
}

function initCenters(colors, n) {
    const centers = new Uint32Array(n);

    for (let i = 0; i < n; i++) {
        const index = Math.floor((i * colors.length) / n);
        centers[i] = colors[index];
    }

    return centers;
}

function findNearestColor(color, palette) {
    return palette[findNearestIndex(color, palette)];
}

function findNearestIndex(color, palette) {
    const r1 = (color >> 16) & 255;
    const g1 = (color >> 8) & 255;
    const b1 = color & 255;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < palette.length; i++) {
        const c = palette[i];

        const dr = r1 - ((c >> 16) & 255);
        const dg = g1 - ((c >> 8) & 255);
        const db = b1 - (c & 255);

        const dist = dr * dr + dg * dg + db * db;

        if (dist < bestDist) {
            bestDist = dist;
            bestIndex = i;
        }
    }

    return bestIndex;
}