
export function skeleton(arr, W, H) {
    if (W < 2 || H < 2) return [];

    const mask = Uint8Array.from(arr);

    for (let i = 0; i < mask.length; i++) {
        mask[i] = mask[i] ? 1 : 0;
    }

    const segments = [];
    const visitedEdges = new Set();

    // helpers
    const edgeKey = (a, b) => {
        const size = mask.length;

        const ia = a[1] * W + a[0];
        const ib = b[1] * W + b[0];

        return ia < ib
            ? ia * size + ib
            : ib * size + ia;
    }

    const idx = (x, y) => y * W + x;
    const on = (x, y) => x >= 0 && x < W && y >= 0 && y < H && mask[idx(x, y)];
    const markEdge = (a, b) => visitedEdges.add(edgeKey(a, b));
    const isEdgeVisited = (a, b) => visitedEdges.has(edgeKey(a, b));
    const degree = (x, y) => neighbors(x, y).length;
    const isNode = (x, y) => degree(x, y) != 2;

    const neighbors = (x, y) => {
        const out = [];

        const n = on(x, y - 1);
        const e = on(x + 1, y);
        const s = on(x, y + 1);
        const w = on(x - 1, y);

        const ne = on(x + 1, y - 1);
        const se = on(x + 1, y + 1);
        const sw = on(x - 1, y + 1);
        const nw = on(x - 1, y - 1);

        if (n) out.push([x, y - 1]);
        if (e) out.push([x + 1, y]);
        if (s) out.push([x, y + 1]);
        if (w) out.push([x - 1, y]);

        if (ne && !n && !e) out.push([x + 1, y - 1]);
        if (se && !s && !e) out.push([x + 1, y + 1]);
        if (sw && !s && !w) out.push([x - 1, y + 1]);
        if (nw && !n && !w) out.push([x - 1, y - 1]);

        return out;
    }

    const chooseNext = (prev, curr, candidates) => {
        if (candidates.length === 0) {
            return null;
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        const vx = curr[0] - prev[0];
        const vy = curr[1] - prev[1];

        let best = candidates[0];
        let bestScore = -Infinity;

        for (const p of candidates) {
            const wx = p[0] - curr[0];
            const wy = p[1] - curr[1];

            const score = vx * wx + vy * wy;

            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }

        return best;
    }

    const traceEdge = (start, next) => {
        const line = [start, next];

        markEdge(start, next);

        let prev = start;
        let curr = next;

        while (true) {
            const [cx, cy] = curr;

            if (isNode(cx, cy)) {
                break;
            }

            const ns = neighbors(cx, cy)
                .filter(p => !(p[0] === prev[0] && p[1] === prev[1]))
                .filter(p => !isEdgeVisited(curr, p));

            const candidate = chooseNext(prev, curr, ns);

            if (!candidate) {
                break;
            }

            markEdge(curr, candidate);

            prev = curr;
            curr = candidate;

            line.push(curr);
        }

        return line;
    }

    const traceCycle = (start, next) => {
        const line = [start, next];

        markEdge(start, next);

        let prev = start;
        let curr = next;

        while (true) {
            const [cx, cy] = curr;

            const ns = neighbors(cx, cy)
                .filter(p => !(p[0] === prev[0] && p[1] === prev[1]))
                .filter(p => !isEdgeVisited(curr, p));

            const candidate = chooseNext(prev, curr, ns);

            if (!candidate) {
                break;
            }

            markEdge(curr, candidate);

            prev = curr;
            curr = candidate;

            if (curr[0] === start[0] && curr[1] === start[1]) {
                break;
            }

            line.push(curr);
        }

        return line;
    }

    // ==================== trace ====================

    // 1. Сначала трассируем все ветки от концов и junction-точек.
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!on(x, y)) continue;

            if (!isNode(x, y)) continue;

            const start = [x, y];
            const ns = neighbors(x, y);

            for (const next of ns) {
                if (isEdgeVisited(start, next)) {
                    continue;
                }

                const line = traceEdge(start, next);

                if (line.length > 1) {
                    segments.push(line);
                }
            }
        }
    }

    // 2. Потом забираем замкнутые циклы, где у всех пикселей degree === 2.
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!on(x, y)) continue;

            const start = [x, y];
            const ns = neighbors(x, y);

            for (const next of ns) {
                if (isEdgeVisited(start, next)) {
                    continue;
                }

                const line = traceCycle(start, next);

                if (line.length > 1) {
                    segments.push(line);
                }
            }
        }
    }

    return segments;
}