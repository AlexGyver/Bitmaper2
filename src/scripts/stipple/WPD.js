import { clamp, hash32, rand01 } from "../math";

// [ [x, y, weight01] ]
export function WPD(arr, w, h, {
    minRadius = 2, // Minimum exclusion radius.
    maxRadius = 5, // Maximum exclusion radius.
    threshold = 10, // Ignore grayscale values below this threshold.
    gamma = 1.3, // Weight curve.

    // Higher = more candidates, slower.
    // Since this should usually be followed by relaxation,
    // 1..1.5 is usually enough.
    oversample = 1.5,

    seed = 1337,

    // Cap, not exact target count.
    // 0 = unlimited.
    maxPoints = 0,

    // 1 = fastest.
    // 2 = good default.
    // 4 = quality mode.
    priorityBands = 2,
} = {}) {
    const width = Math.max(0, w | 0);
    const height = Math.max(0, h | 0);

    if (!arr || width <= 0 || height <= 0) return [];

    const minR = Math.max(0.5, +minRadius || 0.5);
    const maxR = Math.max(minR, +maxRadius || minR);
    const os = Math.max(1, +oversample || 1);
    const bands = Math.max(1, priorityBands | 0);
    const limit = Math.max(0, maxPoints | 0);

    const weightLUT = buildWeightLUT(threshold, gamma);
    const radiusLUT = buildRadiusLUT(weightLUT, minR, maxR);

    const candidateCellSize = minR / os;
    const candGridW = Math.ceil(width / candidateCellSize);
    const candGridH = Math.ceil(height / candidateCellSize);
    const totalCandidates = candGridW * candGridH;

    if (totalCandidates <= 0) return [];

    const accCellSize = minR / Math.SQRT2;
    const accGridW = Math.ceil(width / accCellSize);
    const accGridH = Math.ceil(height / accCellSize);
    const accGrid = new Int32Array(accGridW * accGridH).fill(-1);

    const xs = [];
    const ys = [];
    const rs = [];
    const ws = [];

    function acceptPoint(x, y, r, weight) {
        const index = xs.length;

        xs.push(x);
        ys.push(y);
        rs.push(r);
        ws.push(weight);

        const gx = Math.floor(x / accCellSize);
        const gy = Math.floor(y / accCellSize);

        if (gx >= 0 && gy >= 0 && gx < accGridW && gy < accGridH) {
            accGrid[gy * accGridW + gx] = index;
        }
    }

    function canAccept(x, y, r) {
        const gx = Math.floor(x / accCellSize);
        const gy = Math.floor(y / accCellSize);

        if (gx < 0 || gy < 0 || gx >= accGridW || gy >= accGridH) {
            return false;
        }

        const range = Math.ceil(maxR / accCellSize);

        const x0 = Math.max(0, gx - range);
        const y0 = Math.max(0, gy - range);
        const x1 = Math.min(accGridW - 1, gx + range);
        const y1 = Math.min(accGridH - 1, gy + range);

        for (let yy = y0; yy <= y1; yy++) {
            const row = yy * accGridW;

            for (let xx = x0; xx <= x1; xx++) {
                const pi = accGrid[row + xx];
                if (pi < 0) continue;

                const dx = x - xs[pi];
                const dy = y - ys[pi];
                const required = Math.max(r, rs[pi]);

                if (dx * dx + dy * dy < required * required) {
                    return false;
                }
            }
        }

        return true;
    }

    const start = hash32(seed, totalCandidates, 123) % totalCandidates;
    const stride = makeCoprimeStride(totalCandidates, seed);

    for (let band = bands - 1; band >= 0; band--) {
        for (let n = 0; n < totalCandidates; n++) {
            if (limit > 0 && xs.length >= limit) break;

            const ci = (start + n * stride) % totalCandidates;
            const cx = ci % candGridW;
            const cy = (ci / candGridW) | 0;

            const x = (cx + rand01(cx, cy, 11)) * candidateCellSize;
            const y = (cy + rand01(cx, cy, 23)) * candidateCellSize;

            if (x < 0 || y < 0 || x >= width || y >= height) continue;

            const ix = clamp(Math.floor(x), 0, width - 1);
            const iy = clamp(Math.floor(y), 0, height - 1);
            const gray = clamp(arr[iy * width + ix] | 0, 0, 255);
            const weight = weightLUT[gray];

            if (weight <= 0) continue;

            if (rand01(cx, cy, 37) > weight) continue;

            if (bands > 1) {
                const priority = Math.min(
                    0.999999,
                    weight + rand01(cx, cy, 41) * 0.001
                );

                const candidateBand = Math.floor(priority * bands);

                if (candidateBand !== band) continue;
            }

            const r = radiusLUT[gray];

            if (!Number.isFinite(r)) continue;
            if (!canAccept(x, y, r)) continue;

            acceptPoint(x, y, r, weight);
        }

        if (limit > 0 && xs.length >= limit) break;
    }

    const out = new Array(xs.length);

    for (let i = 0; i < xs.length; i++) {
        out[i] = [xs[i], ys[i], clamp(ws[i], 0, 1)];
    }

    return out;
}

function buildWeightLUT(threshold, gamma) {
    const lut = new Float32Array(256);
    const t = clamp(threshold | 0, 0, 255);
    const g = Math.max(0.0001, +gamma || 1);

    for (let i = 0; i < 256; i++) {
        lut[i] = i < t ? 0 : Math.pow(i / 255, g);
    }

    return lut;
}

function buildRadiusLUT(weightLUT, minRadius, maxRadius) {
    const lut = new Float32Array(256);
    const minR = Math.max(0.5, +minRadius || 0.5);
    const maxR = Math.max(minR, +maxRadius || minR);

    for (let i = 0; i < 256; i++) {
        const weight = weightLUT[i];
        lut[i] = weight <= 0 ? Infinity : maxR - weight * (maxR - minR);
    }

    return lut;
}

function gcd(a, b) {
    while (b !== 0) {
        const t = b;
        b = a % b;
        a = t;
    }

    return a;
}

function makeCoprimeStride(total, seed) {
    if (total <= 1) return 1;

    let stride = hash32(seed, total, 911) % total;
    stride |= 1;

    if (stride <= 0) stride = 1;

    while (gcd(stride, total) !== 1) {
        stride += 2;
        if (stride >= total) stride = 1;
    }

    return stride;
}