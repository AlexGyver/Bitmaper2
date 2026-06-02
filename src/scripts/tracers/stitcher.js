export function stitchHatches(segments, {
    spacing = 8,
    midpoint = true,
    skipSingles = false
} = {}) {
    const MIN_DIST_FACTOR = 0.25;
    const MAX_DIST_FACTOR = 2.3;
    const ALONG_WEIGHT = 1.2;

    if (!segments || segments.length === 0) {
        return [];
    }

    function toPoint(p) {
        return { x: p[0], y: p[1] };
    }

    function pointToArray(p) {
        return [p.x, p.y];
    }

    function dist2(a, b) {
        const x = a.x - b.x;
        const y = a.y - b.y;
        return x * x + y * y;
    }

    function midpointOf(a, b) {
        return {
            x: (a.x + b.x) * 0.5,
            y: (a.y + b.y) * 0.5
        };
    }

    function findDirection() {
        for (const segment of segments) {
            const a = toPoint(segment[0]);
            const b = toPoint(segment[1]);

            const vx = b.x - a.x;
            const vy = b.y - a.y;
            const len = Math.hypot(vx, vy);

            if (len > 1e-9) {
                return {
                    dx: vx / len,
                    dy: vy / len
                };
            }
        }

        return null;
    }

    const direction = findDirection();
    if (!direction) return [];

    const { dx, dy } = direction;

    const nx = -dy;
    const ny = dx;

    const minDist = spacing * MIN_DIST_FACTOR;
    const maxDist = spacing * MAX_DIST_FACTOR;

    const minDist2 = minDist * minDist;
    const maxDist2 = maxDist * maxDist;
    const targetDist2 = spacing * spacing;

    const tBinSize = maxDist || 1;

    function cOf(p) {
        return p.x * nx + p.y * ny;
    }

    function tOf(p) {
        return p.x * dx + p.y * dy;
    }

    function key(row, bin) {
        return row + "," + bin;
    }

    const prepared = segments.map((segment, id) => {
        const a = toPoint(segment[0]);
        const b = toPoint(segment[1]);
        const mid = midpointOf(a, b);

        return {
            id,
            a,
            b,
            c: cOf(mid),
            used: false,
            endpointA: null,
            endpointB: null
        };
    });

    let minC = Infinity;

    for (const seg of prepared) {
        if (seg.c < minC) minC = seg.c;
    }

    function rowOfC(c) {
        return Math.round((c - minC) / spacing);
    }

    const index = new Map();

    function addEndpoint(seg, endpointName, p) {
        const t = tOf(p);
        const bin = Math.floor(t / tBinSize);
        const row = rowOfC(seg.c);

        const endpoint = {
            segId: seg.id,
            endpointName,
            p,
            active: true
        };

        const k = key(row, bin);

        let bucket = index.get(k);
        if (!bucket) {
            bucket = [];
            index.set(k, bucket);
        }

        bucket.push(endpoint);

        return endpoint;
    }

    for (const seg of prepared) {
        seg.row = rowOfC(seg.c);
        seg.endpointA = addEndpoint(seg, "a", seg.a);
        seg.endpointB = addEndpoint(seg, "b", seg.b);
    }

    function deactivate(seg) {
        seg.used = true;
        seg.endpointA.active = false;
        seg.endpointB.active = false;
    }

    function candidateScore(currentT, candidatePoint, d2value) {
        const distancePenalty = Math.abs(d2value - targetDist2) / targetDist2;

        const dt = Math.abs(tOf(candidatePoint) - currentT);
        const alongPenalty = dt / spacing;

        return distancePenalty + alongPenalty * ALONG_WEIGHT;
    }

    function findNextEndpoint(currentPoint, currentSegId) {
        const currentSeg = prepared[currentSegId];
        const currentT = tOf(currentPoint);
        const currentBin = Math.floor(currentT / tBinSize);

        let best = null;
        let bestScore = Infinity;
        let bestD2 = Infinity;

        for (const row of [currentSeg.row - 1, currentSeg.row + 1]) {
            for (let db = -1; db <= 1; db++) {
                const bucket = index.get(key(row, currentBin + db));
                if (!bucket) continue;

                for (let i = 0; i < bucket.length; i++) {
                    const ep = bucket[i];

                    if (!ep.active) continue;
                    if (ep.segId === currentSegId) continue;

                    const nextSeg = prepared[ep.segId];
                    if (nextSeg.used) continue;

                    const d2value = dist2(currentPoint, ep.p);

                    if (d2value < minDist2) continue;
                    if (d2value > maxDist2) continue;

                    const score = candidateScore(currentT, ep.p, d2value);

                    if (
                        score < bestScore ||
                        (score === bestScore && d2value < bestD2)
                    ) {
                        best = ep;
                        bestScore = score;
                        bestD2 = d2value;
                    }
                }
            }
        }

        return best;
    }

    function growSide(startPoint, startSegId) {
        const points = [pointToArray(startPoint)];

        let currentPoint = startPoint;
        let currentSegId = startSegId;
        let added = 0;

        while (true) {
            const found = findNextEndpoint(currentPoint, currentSegId);
            if (!found) break;

            const nextSeg = prepared[found.segId];

            const entry = found.endpointName === "a"
                ? nextSeg.a
                : nextSeg.b;

            const exit = found.endpointName === "a"
                ? nextSeg.b
                : nextSeg.a;

            deactivate(nextSeg);

            if (midpoint) {
                const m = midpointOf(currentPoint, entry);
                points[points.length - 1] = pointToArray(m);
                points.push(pointToArray(exit));
            } else {
                points.push(pointToArray(entry));
                points.push(pointToArray(exit));
            }

            currentPoint = exit;
            currentSegId = nextSeg.id;
            added++;
        }

        return { points, added };
    }

    function buildPathFrom(seed) {
        deactivate(seed);

        const left = growSide(seed.a, seed.id);
        const right = growSide(seed.b, seed.id);

        return {
            path: left.points.slice().reverse().concat(right.points),
            count: 1 + left.added + right.added
        };
    }

    const paths = [];

    for (const seg of prepared) {
        if (seg.used) continue;

        const result = buildPathFrom(seg);

        if (skipSingles && result.count === 1) {
            continue;
        }

        paths.push(result.path);
    }

    return paths;
}