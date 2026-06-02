import { Delaunay } from "d3-delaunay";
import { clamp, diag, rand01 } from "../math";

export function voronoiRelaxation(points, arr, w, h, {
    iterations = 1,

    // Pixel scan step inside each Voronoi cell.
    // 1 = highest quality. 2..3 = faster but rougher.
    sampleStep = 1,

    threshold = 1,
    gamma = 1.4,

    // 1 = full move to centroid. 0.5..0.8 usually looks better and is stabler.
    relax = 0.65,

    // 0 = no cap. Useful to avoid large jumps.
    maxMove = 0,

    // Do not let points drift outside the drawing mask.
    clampToMask = true,

    // What to do with a cell that has no weighted pixels:
    // "keep"   - leave it where it is.
    // "reseed" - move it to a random weighted image sample.
    empty = "keep",

    // Extra tiny stable displacement after each iteration, in pixels.
    // 0 disables. 0.02..0.1 can hide residual regularity.
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
    const step = Math.max(1, sampleStep | 0);
    const moveFactor = clamp(+relax || 0, 0, 1);

    let pts = points.map(point => normalizePoint(point, width, height));

    const weightLUT = buildWeightLUT(threshold, gamma);

    const useReseed = empty === "reseed";
    const reseedSamples = useReseed
        ? buildWeightedSamplePrefix(arr, width, height, weightLUT, step)
        : null;

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
        const { cx, cy, masses } = computeVoronoiMasses(
            pts,
            arr,
            width,
            height,
            weightLUT,
            step
        );

        let moved = 0;

        for (let i = 0; i < pts.length; i++) {
            const mass = masses[i];

            if (mass > 0) {
                const ox = pts[i][0];
                const oy = pts[i][1];

                let nx = ox + (cx[i] - ox) * moveFactor;
                let ny = oy + (cy[i] - oy) * moveFactor;

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
                    nx += (rand01(i, iter, 311) - 0.5) * microJitter;
                    ny += (rand01(i, iter, 313) - 0.5) * microJitter;
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
            } else if (useReseed && reseedSamples && reseedSamples.total > 0) {
                const si = pickWeightedSampleIndex(
                    reseedSamples.prefix,
                    reseedSamples.total,
                    rand01(i, iter, seed)
                );

                const nx = reseedSamples.xs[si] + rand01(i, iter, seed + 17) - 0.5;
                const ny = reseedSamples.ys[si] + rand01(i, iter, seed + 29) - 0.5;

                pts[i][0] = clamp(nx, 0, width - 1);
                pts[i][1] = clamp(ny, 0, height - 1);
            }
        }

        if (moved / pts.length < epsilon) break;
    }

    const { masses } = computeVoronoiMasses(
        pts,
        arr,
        width,
        height,
        weightLUT,
        step
    );

    return attachPointWeights(pts, masses);
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

function polygonBounds(polygon) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < polygon.length; i++) {
        const p = polygon[i];
        const x = p[0];
        const y = p[1];

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
}

function scanPolygonMass(polygon, arr, w, h, weightLUT, sampleStep) {
    if (!polygon || polygon.length < 3) {
        return { mass: 0, x: 0, y: 0 };
    }

    const { minX, minY, maxX, maxY } = polygonBounds(polygon);

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return { mass: 0, x: 0, y: 0 };
    }

    const step = Math.max(1, sampleStep | 0);

    const y0 = clamp(Math.floor(minY), 0, h - 1);
    const y1 = clamp(Math.ceil(maxY), 0, h - 1);

    let xSum = 0;
    let ySum = 0;
    let mass = 0;

    const intersections = [];
    const n = polygon.length;

    for (let y = y0; y <= y1; y += step) {
        const yScan = y + 0.5;
        intersections.length = 0;

        for (let i = 0; i < n; i++) {
            const a = polygon[i];
            const b = polygon[(i + 1) % n];

            const ax = a[0];
            const ay = a[1];
            const bx = b[0];
            const by = b[1];

            // Half-open edge test avoids double-counting vertices.
            if ((ay <= yScan && by > yScan) || (by <= yScan && ay > yScan)) {
                const t = (yScan - ay) / (by - ay);
                intersections.push(ax + t * (bx - ax));
            }
        }

        if (intersections.length < 2) continue;

        intersections.sort((a, b) => a - b);

        for (let k = 0; k + 1 < intersections.length; k += 2) {
            const left = intersections[k];
            const right = intersections[k + 1];

            if (right <= left) continue;

            // Pixel center x + 0.5 should be inside [left, right].
            const x0 = clamp(Math.ceil(left - 0.5), 0, w - 1);
            const x1 = clamp(Math.floor(right - 0.5), 0, w - 1);

            for (let x = x0; x <= x1; x += step) {
                const weight = weightLUT[grayAtNearest(arr, w, h, x, y)];

                if (weight <= 0) continue;

                const sx = x + 0.5;
                const sy = y + 0.5;

                xSum += sx * weight;
                ySum += sy * weight;
                mass += weight;
            }
        }
    }

    if (mass <= 0) {
        return { mass: 0, x: 0, y: 0 };
    }

    return {
        mass,
        x: xSum / mass,
        y: ySum / mass,
    };
}

function buildWeightedSamplePrefix(arr, w, h, weightLUT, sampleStep) {
    const step = Math.max(1, sampleStep | 0);
    const xs = [];
    const ys = [];
    const prefix = [];
    let total = 0;

    for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
            const weight = weightLUT[grayAtNearest(arr, w, h, x, y)];

            if (weight <= 0) continue;

            xs.push(x + 0.5);
            ys.push(y + 0.5);
            total += weight;
            prefix.push(total);
        }
    }

    return { xs, ys, prefix, total };
}

function pickWeightedSampleIndex(prefix, total, r01) {
    const r = r01 * total;
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

function computeVoronoiMasses(points, arr, w, h, weightLUT, sampleStep) {
    const delaunay = Delaunay.from(points, p => p[0], p => p[1]);
    const voronoi = delaunay.voronoi([0, 0, w, h]);

    const cx = new Float64Array(points.length);
    const cy = new Float64Array(points.length);
    const masses = new Float64Array(points.length);

    for (let i = 0; i < points.length; i++) {
        const polygon = voronoi.cellPolygon(i);
        const result = scanPolygonMass(polygon, arr, w, h, weightLUT, sampleStep);

        cx[i] = result.x;
        cy[i] = result.y;
        masses[i] = result.mass;
    }

    return { cx, cy, masses };
}

function attachPointWeights(points, masses) {
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