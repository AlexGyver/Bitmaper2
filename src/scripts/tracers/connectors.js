import { Delaunay } from "d3-delaunay";
import { dist, dist2 } from "../math";

//#region connectTriangle
export function connectTriangle(points, {
    minEdge = 0,
    maxEdge = Infinity
} = {}) {
    if (!points || points.length < 3) {
        return [];
    }

    const nextHalfedge = (e) => e % 3 === 2 ? e - 2 : e + 1;

    const delaunay = Delaunay.from(
        points,
        p => p[0],
        p => p[1]
    );

    const edges = [];
    const triangles = delaunay.triangles;
    const halfedges = delaunay.halfedges;

    const [minEdge2, maxEdge2] = normalizeEdgeLimits(minEdge, maxEdge);

    for (let e = 0; e < triangles.length; e++) {
        const opposite = halfedges[e];

        if (opposite !== -1 && e > opposite) {
            continue;
        }

        const a = triangles[e];
        const b = triangles[nextHalfedge(e)];

        const pa = points[a];
        const pb = points[b];

        const d = dist2(pa, pb);

        if (d < minEdge2 || d > maxEdge2) {
            continue;
        }

        edges.push([pa, pb]);
    }

    return edges;
}

//#region connectVoronoi
export function connectVoronoi(points, w, h, {
    minEdge = 0,
    maxEdge = Infinity,
    includeBounds = false,
} = {}) {
    if (!points || points.length < 2) {
        return [];
    }

    const bounds = getVoronoiBounds(points, w, h, 2);

    if (!bounds) {
        return [];
    }

    const delaunay = Delaunay.from(
        points,
        p => p[0],
        p => p[1]
    );

    const voronoi = delaunay.voronoi(bounds);
    const edges = [];
    const [minEdge2, maxEdge2] = normalizeEdgeLimits(minEdge, maxEdge);

    let current = null;

    function pushEdge(a, b) {
        if (
            !Number.isFinite(a[0]) ||
            !Number.isFinite(a[1]) ||
            !Number.isFinite(b[0]) ||
            !Number.isFinite(b[1]) ||
            samePoint(a, b)
        ) {
            return;
        }

        const d = dist2(a, b);

        if (d < minEdge2 || d > maxEdge2) {
            return;
        }

        edges.push([a, b]);
    }

    const collector = {
        moveTo(x, y) {
            current = [x, y];
        },

        lineTo(x, y) {
            const next = [x, y];

            if (current) {
                pushEdge(current, next);
            }

            current = next;
        },

        closePath() {
            current = null;
        }
    };

    voronoi.render(collector);

    if (includeBounds) {
        voronoi.renderBounds(collector);
    }

    return edges;
}

function getVoronoiBounds(points, w, h, padding = 2) {
    const ww = Number(w);
    const hh = Number(h);

    if (
        Number.isFinite(ww) &&
        Number.isFinite(hh) &&
        ww > 0 &&
        hh > 0
    ) {
        return [0, 0, ww, hh];
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
        const x = Number(p[0]);
        const y = Number(p[1]);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            continue;
        }

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
    ) {
        return null;
    }

    if (minX === maxX) {
        minX -= padding;
        maxX += padding;
    }

    if (minY === maxY) {
        minY -= padding;
        maxY += padding;
    }

    return [
        minX - padding,
        minY - padding,
        maxX + padding,
        maxY + padding
    ];
}

//#region helpers
function normalizeEdgeLimits(minEdge, maxEdge) {
    let min = Number(minEdge);
    let max = Number(maxEdge);

    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = Infinity;

    min = Math.max(0, min);
    max = Math.max(0, max);

    if (min > max) {
        const tmp = min;
        min = max;
        max = tmp;
    }

    return [min * min, max * max];
}

//#region connectTSP
export function connectTSP(points, {
    startIndex = null,

    // "left" | "right" | "top" | "bottom" | "center"
    start = "left",

    // Maximum full 2-opt passes over the path.
    // Higher = cleaner path, slower.
    maxPasses = 50,

    // Stop early after a pass with fewer or equal swaps.
    // 0 means only stop when there are no swaps.
    minSwapsPerPass = 0,
} = {}) {
    const pts = normalizePoints(points);

    if (pts.length === 0) return [];
    if (pts.length === 1) return [[pts[0]]];

    const path = buildNearestNeighborPath(pts, { startIndex, start });

    improveTwoOptUntilStable(path, {
        maxPasses,
        minSwapsPerPass,
    });

    return [path];
}

//#region helpers
function normalizePoints(points) {
    if (!points || points.length === 0) return [];

    const out = [];

    for (const point of points) {
        if (!point || point.length < 2) continue;

        const x = +point[0];
        const y = +point[1];

        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        out.push([x, y]);
    }

    return out;
}
function samePoint(a, b, eps = 1e-9) {
    return (
        Math.abs(a[0] - b[0]) <= eps &&
        Math.abs(a[1] - b[1]) <= eps
    );
}

function buildNearestNeighborPath(points, startOptions) {
    const used = new Uint8Array(points.length);
    const path = new Array(points.length);

    let current = getStartIndex(points, startOptions);

    used[current] = 1;
    path[0] = points[current];

    for (let step = 1; step < points.length; step++) {
        let best = -1;
        let bestD = Infinity;

        for (let i = 0; i < points.length; i++) {
            if (used[i]) continue;

            const d = dist2(points[current], points[i]);

            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }

        if (best < 0) {
            path.length = step;
            break;
        }

        current = best;
        used[current] = 1;
        path[step] = points[current];
    }

    return path;
}

function getStartIndex(points, {
    startIndex = null,
    start = "left",
} = {}) {
    if (startIndex != null) {
        const index = Math.floor(Number(startIndex));

        if (Number.isFinite(index)) {
            return Math.max(0, Math.min(points.length - 1, index));
        }
    }

    switch (start) {
        case "right":
            return getExtremeIndex(points, 0, 1);

        case "top":
            return getExtremeIndex(points, 1, -1);

        case "bottom":
            return getExtremeIndex(points, 1, 1);

        case "center":
            return getCenterIndex(points);

        case "left":
        default:
            return getExtremeIndex(points, 0, -1);
    }
}

function getExtremeIndex(points, axis, direction) {
    let best = 0;

    for (let i = 1; i < points.length; i++) {
        const a = points[i][axis];
        const b = points[best][axis];

        if (direction < 0 ? a < b : a > b) {
            best = i;
        }
    }

    return best;
}

function getCenterIndex(points) {
    let sx = 0;
    let sy = 0;

    for (const point of points) {
        sx += point[0];
        sy += point[1];
    }

    const cx = sx / points.length;
    const cy = sy / points.length;

    let best = 0;
    let bestD = Infinity;

    for (let i = 0; i < points.length; i++) {
        const dx = points[i][0] - cx;
        const dy = points[i][1] - cy;
        const d = dx * dx + dy * dy;

        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }

    return best;
}

function improveTwoOptUntilStable(path, {
    maxPasses = 50,
    minSwapsPerPass = 0,
} = {}) {
    const n = path.length;
    const passes = Math.max(0, maxPasses | 0);
    const minSwaps = Math.max(0, minSwapsPerPass | 0);

    if (n < 4 || passes === 0) return 0;

    let totalSwaps = 0;

    for (let pass = 0; pass < passes; pass++) {
        let swaps = 0;

        for (let i = 1; i < n - 2; i++) {
            for (let k = i + 1; k < n - 1; k++) {
                const a = path[i - 1];
                const b = path[i];
                const c = path[k];
                const d = path[k + 1];

                if (improves2OptSquared(a, b, c, d)) {
                    reverseSlice(path, i, k);
                    swaps++;
                    totalSwaps++;
                }
            }
        }

        if (swaps <= minSwaps) break;
    }

    return totalSwaps;
}

function improves2OptSquared(a, b, c, d) {
    const before = dist2(a, b) + dist2(c, d);
    const after = dist2(a, c) + dist2(b, d);

    return after < before;
}

function reverseSlice(arr, i, k) {
    while (i < k) {
        const tmp = arr[i];
        arr[i] = arr[k];
        arr[k] = tmp;
        i++;
        k--;
    }
}