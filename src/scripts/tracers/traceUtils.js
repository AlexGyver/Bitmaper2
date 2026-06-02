import { dist2, perlin2 } from "../math";

export function optiPath(path, {
    minPoints = 0,
    close = 0,
    connect = 0,
    split = 0,
    smoothFactor = 0,
    smoothAngle = 135,
    smoothRatio = 0,
    smoothIters = 0,
    noiseAmpli = 0,
    noiseScale = 0,
    straightEpsilon = 0.01,
    simplifyTol = 0,
    simplifyLen = 3,
    optiTravel = false,
    round = 0,
} = {}) {
    if (minPoints) path = cleanPath(path, minPoints);
    if (optiTravel) path = sortPath(path);
    if (close) path = closePath(path, close);
    if (connect) path = connectSegments(path, connect);
    if (split) path = splitSegments(path, split);
    if (smoothFactor) path = smoothPath(path, { factor: smoothFactor, maxAngle: smoothAngle });
    if (smoothRatio) path = smoothPathChaikin(path, smoothIters, smoothRatio);
    if (noiseAmpli) path = noisePath(path, noiseAmpli, noiseScale)
    if (straightEpsilon) path = skipStraightPath(path, straightEpsilon);
    if (simplifyTol) path = simplifyPath(path, simplifyTol, simplifyLen);
    if (round) path = roundPath(path, round);
    return path;
}

// helpers
function isClosed(seg, closeGap = 1e-6) {
    if (seg.length < 2) return false;
    return dist2(seg[0], seg[seg.length - 1]) <= closeGap * closeGap;
}

//#region resample
export function splitSegments(path, step = 1) {
    return path.map(seg => splitSegment(seg, step));
}

export function splitSegment(seg, step = 1) {
    if (seg.length < 2) return seg;

    const out = [seg[0]];
    const step2 = step * step;

    for (let i = 1; i < seg.length; i++) {
        const a = seg[i - 1];
        const b = seg[i];
        const len2 = dist2(a, b);

        if (!len2) continue;

        if (len2 <= step2) {
            out.push(b);
            continue;
        }

        const len = Math.sqrt(len2);
        const count = Math.ceil(len / step);
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];

        for (let j = 1; j < count; j++) {
            const t = j / count;
            out.push([a[0] + dx * t, a[1] + dy * t,]);
        }
        out.push(b);
    }

    return out;
}

//#region noisePath
export function noisePath(path, ampli = 1, scale = 0.1, seed = 1, byIndex = true) {
    return path.map((seg, i) => noiseSegment(seg, ampli, scale, seed + i * 101, i, byIndex));
}

export function noiseSegment(seg, ampli = 1, scale = 0.1, seed = 1, lineIndex = 0, byIndex = true) {
    if (seg.length === 0) return seg;

    // const sampleStep = Math.max(1, Math.min(4, 1 / (scale * 4)));

    // if (seg.length === 2) {
    //     seg = splitSegment(seg, sampleStep);
    // }

    const closed = isClosed(seg);
    const count = closed ? seg.length - 1 : seg.length;
    const out = new Array(seg.length);

    for (let j = 0; j < count; j++) {
        const p = seg[j];
        let x;
        let y;

        if (closed) {
            const t = j / count;
            const a = t * Math.PI * 2;
            const r = count * scale / (2 * Math.PI);

            x = Math.cos(a) * r;
            y = Math.sin(a) * r + lineIndex * 17.13;
        } else if (byIndex) {
            x = j * scale;
            y = lineIndex * scale;
        } else {
            x = p[0] * scale;
            y = p[1] * scale;
        }

        const nx = perlin2(x, y, seed);
        const ny = perlin2(x, y, seed + 1000);

        out[j] = [p[0] + nx * ampli, p[1] + ny * ampli];
    }

    if (closed) {
        out[out.length - 1] = [out[0][0], out[0][1]];
    }

    return out;
}

//#region insetPath
function insetPoint(a, b, amount) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0 || amount <= 0) {
        return [a[0], a[1]];
    }

    const t = Math.min(amount / len, 0.5);

    return [
        a[0] + dx * t,
        a[1] + dy * t
    ];
}

export function insetSegment(seg, amount = 0.5) {
    if (seg.length < 2 || amount <= 0) return seg;

    const first = seg[0];
    const second = seg[1];

    const last = seg[seg.length - 1];
    const beforeLast = seg[seg.length - 2];

    const nextFirst = insetPoint(first, second, amount);
    const nextLast = insetPoint(last, beforeLast, amount);

    const out = seg.slice();
    out[0] = nextFirst;
    out[out.length - 1] = nextLast;

    return out;
}

export function insetPath(path, amount = 0.5) {
    return path
        .map(seg => insetSegment(seg, amount))
        .filter(seg => seg.length >= 2 && dist2(seg[0], seg[seg.length - 1]) > 0);
}

//#region cleanPath
export function cleanPath(path, minPoints = 1) {
    return path.filter(seg => seg.length > minPoints);
}

//#region roundSegment
export function roundPath(path, step = 1) {
    return path.map(seg => roundSegment(seg, step));
}

export function roundSegment(seg, step = 1) {
    const roundTo = (value, step = 1) => Math.round(value / step) * step;
    return seg.map(p => [
        roundTo(p[0], step),
        roundTo(p[1], step)
    ]);
}

//#region closeSegment
export function closePath(path, maxGap = 2) {
    return path.map(seg => closeSegment(seg, maxGap));
}

export function closeSegment(seg, maxGap = 2) {
    if (seg.length < 2) return seg;

    const first = seg[0];
    const last = seg[seg.length - 1];
    const d2 = dist2(first, last);

    if (!d2) return seg;
    if (d2 > maxGap * maxGap) return seg;

    return [
        ...seg,
        [first[0], first[1]]
    ];
}

//#region connectSegments
export function connectSegments(path, maxGap = 2, closeGap = 0) {
    if (!path.length) return [];

    const out = [];
    const maxGap2 = maxGap * maxGap;

    let current = path[0].slice();

    for (let i = 1; i < path.length; i++) {
        const next = path[i];

        const currentClosed = isClosed(current, closeGap);
        const nextClosed = isClosed(next, closeGap);

        if (currentClosed || nextClosed) {
            out.push(current);
            current = next.slice();
            continue;
        }

        const currentEnd = current[current.length - 1];
        const nextStart = next[0];

        if (dist2(currentEnd, nextStart) <= maxGap2) {
            current.push(...next);
        } else {
            out.push(current);
            current = next.slice();
        }
    }

    out.push(current);
    return out;
}

//#region sortPath
export function sortPath(path, startX = 0, startY = 0) {
    if (path.length < 2) return path;

    let result = [[[startX, startY]]];
    let rest = path.slice();

    while (rest.length) {
        let lastSegment = result[result.length - 1];
        let prev = lastSegment[lastSegment.length - 1];
        let bestIndex = 0;
        let bestReverse = false;
        let bestDist = Infinity;

        for (let i = 0; i < rest.length; i++) {
            let segment = rest[i];

            let dStart = dist2(prev, segment[0]);
            if (dStart < bestDist) {
                bestDist = dStart;
                bestIndex = i;
                bestReverse = false;
            }

            let dEnd = dist2(prev, segment[segment.length - 1]);
            if (dEnd < bestDist) {
                bestDist = dEnd;
                bestIndex = i;
                bestReverse = true;
            }
        }

        let next = rest.splice(bestIndex, 1)[0];

        if (bestReverse) {
            next = next.slice().reverse();
        }

        result.push(next);
    }

    result.shift(); // [startX, startY]

    return result;
}

//#region simplifySegment
// Douglas–Peucker с ограничением масштаба упрощения
export function simplifyPath(path, tolerance = 0, maxLine = Infinity) {
    return path.map(seg => simplifySegment(seg, tolerance, maxLine));
}

export function simplifySegment(seg, tolerance = 0, maxLine = Infinity) {
    // helpers
    const distToLine2 = (p, a, b) => {
        let x = p[0];
        let y = p[1];
        let x1 = a[0];
        let y1 = a[1];
        let x2 = b[0];
        let y2 = b[1];

        let dx = x2 - x1;
        let dy = y2 - y1;

        if (dx === 0 && dy === 0) {
            dx = x - x1;
            dy = y - y1;
            return dx * dx + dy * dy;
        }

        let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));

        let px = x1 + t * dx;
        let py = y1 + t * dy;

        dx = x - px;
        dy = y - py;

        return dx * dx + dy * dy;
    }
    const pathLengthAndSplit = (seg, maxLine) => {
        let len = 0;
        let splitIndex = -1;

        for (let i = 1; i < seg.length; i++) {
            len += Math.sqrt(dist2(seg[i - 1], seg[i]));

            if (splitIndex < 0 && i < seg.length - 1 && len >= maxLine) {
                splitIndex = i;
            }
        }

        if (splitIndex < 0) {
            splitIndex = seg.length >> 1;
        }

        return {
            length: len,
            splitIndex
        };
    }
    const simplify = (seg, tolerance, maxLine) => {
        if (seg.length <= 2) return seg;

        let first = seg[0];
        let last = seg[seg.length - 1];

        let info = pathLengthAndSplit(seg, maxLine);

        if (info.length > maxLine) {
            let mid = info.splitIndex;

            let left = simplify(seg.slice(0, mid + 1), tolerance, maxLine);
            let right = simplify(seg.slice(mid), tolerance, maxLine);

            return left.slice(0, -1).concat(right);
        }

        let maxDist = 0;
        let index = -1;

        for (let i = 1; i < seg.length - 1; i++) {
            let d = distToLine2(seg[i], first, last);

            if (d > maxDist) {
                maxDist = d;
                index = i;
            }
        }

        let tolerance2 = tolerance * tolerance;

        if (maxDist <= tolerance2) {
            return [first, last];
        }

        let left = simplify(seg.slice(0, index + 1), tolerance, maxLine);
        let right = simplify(seg.slice(index), tolerance, maxLine);

        return left.slice(0, -1).concat(right);
    }

    return simplify(seg, tolerance, maxLine);
}

//#region skipStraightLines
export function skipStraightPath(path, epsilon = 1e-9) {
    return path.map(seg => skipStraightLines(seg, epsilon));
}

export function skipStraightLines(seg, epsilon = 1e-9) {
    if (seg.length <= 2) return seg;

    let result = [seg[0]];

    for (let i = 1; i < seg.length - 1; i++) {
        let a = result[result.length - 1];
        let b = seg[i];
        let c = seg[i + 1];

        let abx = b[0] - a[0];
        let aby = b[1] - a[1];
        let bcx = c[0] - b[0];
        let bcy = c[1] - b[1];

        let cross = abx * bcy - aby * bcx;

        if (Math.abs(cross) > epsilon) {
            result.push(b);
        }
    }

    result.push(seg[seg.length - 1]);

    return result;
}

//#region smooth
export function smoothPath(paths, options = {}) {
    return paths.map(path => smoothSegment(path, options));
}

export function smoothSegment(path, {
    factor = 0.25,
    maxAngle = 135,
    maxShift = 0.5,
    iterations = 1,
    closed = false,
    autoClosed = true,
    closeGap = 1e-6
} = {}) {
    if (path.length <= 2) {
        return path;
    }

    if (autoClosed && isClosed(path, closeGap)) {
        closed = true;
    }

    let result = path;

    if (closed && isClosed(result, closeGap)) {
        result = result.slice(0, -1);
    }

    const cornerCos = Math.cos(maxAngle * Math.PI / 180);
    const maxShift2 = maxShift * maxShift;

    for (let iter = 0; iter < iterations; iter++) {
        const next = result.map(p => [p[0], p[1]]);
        const n = result.length;

        const start = closed ? 0 : 1;
        const end = closed ? n : n - 1;

        for (let i = start; i < end; i++) {
            const prev = result[(i - 1 + n) % n];
            const curr = result[i];
            const after = result[(i + 1) % n];
            const cos = angleCos(prev, curr, after);

            if (cos > cornerCos) {
                continue;
            }

            const tx = (prev[0] + after[0]) * 0.5;
            const ty = (prev[1] + after[1]) * 0.5;

            let dx = (tx - curr[0]) * factor;
            let dy = (ty - curr[1]) * factor;

            const d2 = dx * dx + dy * dy;

            if (d2 > maxShift2) {
                const d = Math.sqrt(d2);
                dx = dx / d * maxShift;
                dy = dy / d * maxShift;
            }

            next[i] = [
                curr[0] + dx,
                curr[1] + dy
            ];
        }

        result = next;
    }

    if (closed) {
        result.push([result[0][0], result[0][1]]);
    }

    return result;
}

function angleCos(a, b, c) {
    const ux = a[0] - b[0];
    const uy = a[1] - b[1];
    const vx = c[0] - b[0];
    const vy = c[1] - b[1];

    const lu2 = ux * ux + uy * uy;
    const lv2 = vx * vx + vy * vy;

    if (lu2 === 0 || lv2 === 0) {
        return -1;
    }

    return (ux * vx + uy * vy) / Math.sqrt(lu2 * lv2);
}

//#region smoothPathChaikin
export function smoothPathChaikin(paths, iterations = 1, ratio = 0.25, closed = false) {
    return paths.map(path => smoothSegmentChaikin(path, iterations, ratio, closed));
}

export function smoothSegmentChaikin(
    path,
    iterations = 1,
    ratio = 0.25,
    closed = false,
    autoClosed = true,
    closeGap = 1e-6
) {
    if (path.length < 3) {
        return path;
    }

    if (autoClosed && isClosed(path, closeGap)) {
        closed = true;
    }

    let result = path;

    if (closed && isClosed(result, closeGap)) {
        result = result.slice(0, -1);
    }

    for (let i = 0; i < iterations; i++) {
        result = chaikinOnce(result, ratio, closed);
    }

    if (closed) {
        result.push([result[0][0], result[0][1]]);
    }

    return result;
}

function chaikinOnce(path, ratio, closed) {
    const out = [];
    const n = path.length;

    if (!closed) {
        out.push(path[0]);
    }

    const count = closed ? n : n - 1;

    for (let i = 0; i < count; i++) {
        const p0 = path[i];
        const p1 = path[(i + 1) % n];

        const q = lerpPoint(p0, p1, ratio);
        const r = lerpPoint(p0, p1, 1 - ratio);

        out.push(q);
        out.push(r);
    }

    if (!closed) {
        out.push(path[n - 1]);
    }

    return out;
}

function lerpPoint(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t
    ];
}

/*
//#region smoothSegmentSimple
export function smoothPathSimple(path, factor = 0.5, iterations = 1) {
    return path.map(seg => smoothSegmentSimple(seg, factor, iterations));
}

export function smoothSegmentSimple(seg, factor = 0.5, iterations = 1) {
    if (seg.length <= 2) return seg;

    let result = seg.map(p => [p[0], p[1]]);

    for (let iter = 0; iter < iterations; iter++) {
        let next = [result[0]];

        for (let i = 1; i < result.length - 1; i++) {
            let prev = result[i - 1];
            let curr = result[i];
            let nextPoint = result[i + 1];
            let x = curr[0] * (1 - factor) + (prev[0] + nextPoint[0]) * 0.5 * factor;
            let y = curr[1] * (1 - factor) + (prev[1] + nextPoint[1]) * 0.5 * factor;

            next.push([x, y]);
        }

        next.push(result[result.length - 1]);
        result = next;
    }

    return result;
}
*/