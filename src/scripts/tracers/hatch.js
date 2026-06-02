import { diag, dist } from "../math";

//#region hatchParallel
export function hatchParallel(arr, width, height, {
    angle = 45,
    spacing = 8,
    step = 0.75,
    threshold = 128,
    minLength = 3,
} = {}) {
    const out = [];
    const rad = angle * Math.PI / 180;

    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    const nx = -dy;
    const ny = dx;

    const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1]
    ];

    let minC = Infinity;
    let maxC = -Infinity;

    for (const [x, y] of corners) {
        const c = x * nx + y * ny;

        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
    }

    minC -= spacing;
    maxC += spacing;

    for (let c = minC; c <= maxC; c += spacing) {
        const x0 = nx * c;
        const y0 = ny * c;

        const range = clipLineToRect(dx, dy, x0, y0, width, height);
        if (!range) continue;

        const [t0, t1] = range;

        traceMergedSegments(
            out,
            visit => {
                forEachLinePoint(x0, y0, dx, dy, t0, t1, step, visit);
            },
            arr,
            width,
            height,
            { threshold, minLength }
        );
    }

    return out;
}

//#region hatchRadial
export function hatchRadial(arr, width, height, {
    center = [width / 2, height / 2],
    diameter = diag(width, height),
    spacing = 8,
    step = 0.75,
    threshold = 128,
    minLength = 3,
} = {}) {
    const out = [];
    const [cx, cy] = center;
    const radius = diameter / 2;

    for (let angle = 0; angle < 360; angle += spacing) {
        const rad = angle * Math.PI / 180;

        traceMergedSegments(
            out,
            visit => {
                forEachRadialLinePoint(cx, cy, rad, radius, step, visit);
            },
            arr,
            width,
            height,
            { threshold, minLength }
        );
    }

    return out;
}

//#region hatchArc
export function hatchArc(arr, width, height, {
    center = [width / 2, height / 2],
    diameter = diag(width, height),
    spacing = 8,
    maxSegmentLength = 2,
    threshold = 128,
    minLength = 3,
} = {}) {
    const out = [];

    const [cx, cy] = center;
    const maxRadius = diameter / 2;

    const startRad = 0;
    const endRad = Math.PI * 2;

    for (let r = spacing; r <= maxRadius; r += spacing) {
        tracePolylineSegments(
            out,
            visit => {
                forEachArcSegmentPoint(
                    cx,
                    cy,
                    r,
                    startRad,
                    endRad,
                    maxSegmentLength,
                    visit
                );
            },
            arr,
            width,
            height,
            { threshold, minLength }
        );
    }

    return out;
}

//#region hatch helpers
function isPointFilled(arr, width, height, x, y, threshold) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
        return false;
    }

    return arr[iy * width + ix] >= threshold;
}

function pushSegment(out, start, end, minLength) {
    if (!start || !end) return;

    const len = dist(start, end);

    if (len >= minLength) {
        out.push([
            [start[0], start[1]],
            [end[0], end[1]]
        ]);
    }
}

function pushPath(out, path, minLength) {
    if (!path || path.length < 2) return;

    let len = 0;

    for (let i = 1; i < path.length; i++) {
        len += dist(path[i - 1], path[i]);
    }

    if (len >= minLength) {
        out.push(path);
    }
}

// Трассировка последовательности точек с объединением соседних filled-точек в один прямой сегмент
function traceMergedSegments(out, forEachPoint, arr, width, height, {
    threshold = 128,
    minLength = 3,
} = {}) {
    let inside = false;
    let start = null;

    let prevPoint = null;
    let beforePrevPoint = null;

    forEachPoint(p => {
        const filled = isPointFilled(arr, width, height, p[0], p[1], threshold);

        if (filled && !inside) {
            inside = true;
            start = p;
        }

        if (!filled && inside) {
            inside = false;

            const end = beforePrevPoint || prevPoint;

            if (start && end) {
                pushSegment(out, start, end, minLength);
            }

            start = null;
        }

        beforePrevPoint = prevPoint;
        prevPoint = p;
    });

    if (inside && start && prevPoint) {
        pushSegment(out, start, prevPoint, minLength);
    }
}

// Трассировка последовательности точек с объединением соседних filled-точек в одну полилинию.
function tracePolylineSegments(out, forEachPoint, arr, width, height, {
    threshold = 128,
    minLength = 3,
} = {}) {
    let inside = false;
    let path = [];

    forEachPoint(p => {
        const filled = isPointFilled(arr, width, height, p[0], p[1], threshold);

        if (filled) {
            if (!inside) {
                inside = true;
                path = [];
            }

            path.push(p);
        } else if (inside) {
            inside = false;

            pushPath(out, path, minLength);
            path = [];
        }
    });

    if (inside) {
        pushPath(out, path, minLength);
    }
}

// Отрезание бесконечной прямой прямоугольником
function clipLineToRect(dx, dy, x0, y0, width, height) {
    let t0 = -Infinity;
    let t1 = Infinity;

    function clip(p, q) {
        if (p === 0) {
            return q >= 0;
        }

        const r = q / p;

        if (p < 0) {
            if (r > t1) return false;
            if (r > t0) t0 = r;
        } else {
            if (r < t0) return false;
            if (r < t1) t1 = r;
        }

        return true;
    }

    // x >= 0
    if (!clip(-dx, x0)) return null;

    // x <= width - 1
    if (!clip(dx, width - 1 - x0)) return null;

    // y >= 0
    if (!clip(-dy, y0)) return null;

    // y <= height - 1
    if (!clip(dy, height - 1 - y0)) return null;

    if (t0 > t1) return null;

    return [t0, t1];
}

function forEachLinePoint(x0, y0, dx, dy, t0, t1, step, visit) {
    let lastT = null;

    for (let t = t0; t <= t1; t += step) {
        lastT = t;

        visit([
            x0 + dx * t,
            y0 + dy * t
        ]);
    }

    if (lastT === null || Math.abs(lastT - t1) > 1e-9) {
        visit([
            x0 + dx * t1,
            y0 + dy * t1
        ]);
    }
}

function forEachRadialLinePoint(cx, cy, angleRad, radius, step, visit) {
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);

    let lastR = null;

    for (let r = 0; r <= radius; r += step) {
        lastR = r;

        visit([
            cx + dx * r,
            cy + dy * r
        ]);
    }

    if (lastR === null || Math.abs(lastR - radius) > 1e-9) {
        visit([
            cx + dx * radius,
            cy + dy * radius
        ]);
    }
}

function forEachArcSegmentPoint(cx, cy, radius, startRad, endRad, maxSegmentLength, visit) {
    if (radius <= 0) return;

    const arcLength = Math.abs(endRad - startRad) * radius;
    if (arcLength <= 0) return;

    const segmentCount = Math.max(1, Math.ceil(arcLength / maxSegmentLength));
    const angleStep = (endRad - startRad) / segmentCount;

    for (let i = 0; i <= segmentCount; i++) {
        const a = startRad + angleStep * i;

        visit([
            cx + Math.cos(a) * radius,
            cy + Math.sin(a) * radius
        ]);
    }
}