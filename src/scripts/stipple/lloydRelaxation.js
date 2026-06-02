import { Delaunay } from "d3-delaunay";
import { clamp, diag, rand01, random, randomSeed } from "../math";

// [ [x, y, weight01] ]
export function lloydRelaxation(points, arr, w, h, {
    iterations = 2,

    // Base sampling step. Bigger = faster but rougher.
    sampleStep = 2,

    // Auto-increases effective step if there would be too many samples.
    maxSamples = 50000,

    threshold = 1,
    gamma = 1.4,

    // 1 = full Lloyd. 0.55..0.85 usually looks better for stippling.
    relax = 0.75,

    // 0 = no cap. Useful to avoid large jumps.
    maxMove = 0,

    // Do not let points drift outside the drawing mask.
    clampToMask = true,

    // What to do with a point that receives no samples:
    // "keep"   - leave it where it is.
    // "reseed" - move it to a random weighted sample.
    empty = "keep",

    // 0..1. 1 means full-cell jitter.
    // 0.5..1 helps break rectangular sampling patterns.
    sampleJitter = 0.9,

    // Adds tiny stable noise to sample weights.
    // Helps break ties and overly regular lattices. Keep small.
    weightNoise = 0.025,

    // Extra tiny stable displacement after each iteration, in pixels.
    // 0 disables. 0.05..0.2 can hide residual grid feel.
    microJitter = 0,

    // Stop early when average squared movement per point falls below epsilon.
    epsilon = 1e-4,

    // Used only by empty: "reseed".
    seed = 1337,
} = {}) {
    const width = Math.max(0, w | 0);
    const height = Math.max(0, h | 0);

    if (!points || points.length === 0 || !arr || width <= 0 || height <= 0) {
        return [];
    }

    const iterCount = Math.max(0, iterations | 0);

    let pts = points.map(point => normalizePoint(point, width, height));

    const weightLUT = buildWeightLUT(threshold, gamma);
    const samples = buildWeightedSamples(arr, width, height, {
        weightLUT,
        sampleStep,
        maxSamples,
        sampleJitter: clamp(+sampleJitter || 0, 0, 1),
        weightNoise: Math.max(0, +weightNoise || 0),
    });

    const { xs, ys, ws, length } = samples;

    if (length === 0) {
        return pts;
    }

    const accX = new Float64Array(pts.length);
    const accY = new Float64Array(pts.length);
    const accW = new Float64Array(pts.length);

    const useReseed = empty === "reseed";
    const weightedPrefix = useReseed ? buildWeightedPrefix(ws) : null;

    if (useReseed) {
        randomSeed(seed);
    }

    function weightAtNearest(x, y) {
        return weightLUT[grayAtNearest(arr, width, height, x, y)];
    }

    function isInsideMask(x, y) {
        return weightAtNearest(x, y) > 0;
    }

    function clampPointToMask(oldX, oldY, newX, newY) {
        if (!clampToMask) return [newX, newY];
        if (isInsideMask(newX, newY)) return [newX, newY];

        for (let t = 0.75; t >= 0.125; t *= 0.5) {
            const x = oldX + (newX - oldX) * t;
            const y = oldY + (newY - oldY) * t;

            if (isInsideMask(x, y)) return [x, y];
        }

        return [oldX, oldY];
    }

    for (let iter = 0; iter < iterCount; iter++) {
        const delaunay = Delaunay.from(pts, p => p[0], p => p[1]);

        accX.fill(0);
        accY.fill(0);
        accW.fill(0);

        for (let i = 0; i < length; i++) {
            const nearest = delaunay.find(xs[i], ys[i]);
            const weight = ws[i];

            accX[nearest] += xs[i] * weight;
            accY[nearest] += ys[i] * weight;
            accW[nearest] += weight;
        }

        let moved = 0;

        for (let i = 0; i < pts.length; i++) {
            const mass = accW[i];

            if (mass > 0) {
                const ox = pts[i][0];
                const oy = pts[i][1];

                let nx = accX[i] / mass;
                let ny = accY[i] / mass;

                nx = ox + (nx - ox) * relax;
                ny = oy + (ny - oy) * relax;

                let dx = nx - ox;
                let dy = ny - oy;

                if (maxMove > 0) {
                    const d = diag(dx, dy);

                    if (d > maxMove) {
                        const s = maxMove / d;
                        dx *= s;
                        dy *= s;
                        nx = ox + dx;
                        ny = oy + dy;
                    }
                }

                if (microJitter > 0) {
                    nx += (rand01(i, iter, 211) - 0.5) * microJitter;
                    ny += (rand01(i, iter, 213) - 0.5) * microJitter;
                }

                nx = clamp(nx, 0, width - 1);
                ny = clamp(ny, 0, height - 1);

                const clamped = clampPointToMask(ox, oy, nx, ny);
                nx = clamped[0];
                ny = clamped[1];

                const mdx = nx - ox;
                const mdy = ny - oy;

                moved += mdx * mdx + mdy * mdy;

                pts[i][0] = nx;
                pts[i][1] = ny;
            } else if (useReseed && weightedPrefix && weightedPrefix.total > 0) {
                const si = pickWeightedSampleIndex(weightedPrefix.prefix, weightedPrefix.total);

                pts[i][0] = clamp(xs[si] + random() - 0.5, 0, width - 1);
                pts[i][1] = clamp(ys[si] + random() - 0.5, 0, height - 1);
            }
        }

        if (moved / pts.length < epsilon) break;
    }

    return attachPointWeights(pts, samples);
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

function grayAtNearest(arr, w, h, x, y) {
    const ix = clamp(x | 0, 0, w - 1);
    const iy = clamp(y | 0, 0, h - 1);

    return clamp(arr[iy * w + ix] | 0, 0, 255);
}

function normalizePoint(point, w, h) {
    const x = Number.isFinite(+point[0]) ? +point[0] : 0;
    const y = Number.isFinite(+point[1]) ? +point[1] : 0;
    const weight = Number.isFinite(+point[2]) ? +point[2] : 1;

    return [
        clamp(x, 0, w - 1),
        clamp(y, 0, h - 1),
        clamp(weight, 0, 1),
    ];
}

function buildWeightedSamples(arr, w, h, {
    weightLUT,
    sampleStep,
    maxSamples,
    sampleJitter,
    weightNoise,
} = {}) {
    const baseStep = Math.max(1, sampleStep | 0);
    const estimatedSamples = Math.ceil(w / baseStep) * Math.ceil(h / baseStep);
    const stride = estimatedSamples > maxSamples
        ? Math.ceil(estimatedSamples / maxSamples)
        : 1;

    const step = baseStep * stride;

    const sampleXs = [];
    const sampleYs = [];
    const sampleWs = [];

    for (let gy = 0, y0 = 0; y0 < h; gy++, y0 += step) {
        for (let gx = 0, x0 = 0; x0 < w; gx++, x0 += step) {
            const jx = (rand01(gx, gy, 101) - 0.5) * sampleJitter;
            const jy = (rand01(gx, gy, 103) - 0.5) * sampleJitter;

            let x = clamp(x0 + step * (0.5 + jx), 0, w - 1);
            let y = clamp(y0 + step * (0.5 + jy), 0, h - 1);

            let weight = weightLUT[grayAtNearest(arr, w, h, x, y)];

            if (weight <= 0) {
                weight = weightLUT[grayAtNearest(arr, w, h, x0, y0)];

                if (weight <= 0) continue;

                x = x0;
                y = y0;
            }

            if (weightNoise > 0) {
                weight *= 1 + (rand01(gx, gy, 107) - 0.5) * weightNoise;
            }

            sampleXs.push(x);
            sampleYs.push(y);
            sampleWs.push(weight);
        }
    }

    const n = sampleXs.length;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const ws = new Float32Array(n);

    for (let i = 0; i < n; i++) {
        xs[i] = sampleXs[i];
        ys[i] = sampleYs[i];
        ws[i] = sampleWs[i];
    }

    return { xs, ys, ws, length: n };
}

function buildWeightedPrefix(ws) {
    const prefix = new Float64Array(ws.length);
    let total = 0;

    for (let i = 0; i < ws.length; i++) {
        total += ws[i];
        prefix[i] = total;
    }

    return { prefix, total };
}

function pickWeightedSampleIndex(prefix, total) {
    const r = random() * total;
    let lo = 0;
    let hi = prefix.length - 1;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (prefix[mid] < r) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

function attachPointWeights(points, samples) {
    if (points.length === 0) return [];

    const { xs, ys, ws, length } = samples;
    const delaunay = Delaunay.from(points, p => p[0], p => p[1]);
    const masses = new Float64Array(points.length);

    for (let i = 0; i < length; i++) {
        const nearest = delaunay.find(xs[i], ys[i]);
        masses[nearest] += ws[i];
    }

    let maxMass = 0;

    for (let i = 0; i < masses.length; i++) {
        if (masses[i] > maxMass) maxMass = masses[i];
    }

    if (maxMass <= 0) maxMass = 1;

    return points.map(([x, y], i) => [
        x,
        y,
        Math.sqrt(masses[i] / maxMass),
    ]);
}