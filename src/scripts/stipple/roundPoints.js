import { clamp } from "../math";

export function roundPoints(points, w, h, {
    dedupe = true,
    clampWeight = true,
} = {}) {
    const width = Math.max(0, w | 0);
    const height = Math.max(0, h | 0);

    if (!points || width <= 0 || height <= 0) return [];

    const out = [];
    const seen = dedupe ? new Set() : null;

    for (const point of points) {
        const x0 = Number.isFinite(+point[0]) ? +point[0] : 0;
        const y0 = Number.isFinite(+point[1]) ? +point[1] : 0;
        const w0 = Number.isFinite(+point[2]) ? +point[2] : 1;

        const x = clamp(Math.round(x0), 0, width - 1);
        const y = clamp(Math.round(y0), 0, height - 1);
        const weight = clampWeight ? clamp(w0, 0, 1) : w0;

        if (dedupe) {
            const key = x + "," + y;

            if (seen.has(key)) continue;
            seen.add(key);
        }

        out.push([x, y, weight]);
    }

    return out;
}

export function roundAndDedupePoints(points, w, h) {
    return roundPoints(points, w, h, { dedupe: true });
}