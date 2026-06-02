import { clamp255, lerp } from "../math";

// value [-1.0.. 1.0]
// radius [0.0.. 1.0]
// size [0.0.. 2.0]
export function vignetteIData(imageData, value = 0, radius = 0.25, size = 0.65) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    value = Math.max(-1, Math.min(1, value));

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const mask = vignetteMask(x, y, w, h, radius, size);
            const i = (y * w + x) * 4;

            data[i] = applyVignetteValue(data[i], value, mask);
            data[i + 1] = applyVignetteValue(data[i + 1], value, mask);
            data[i + 2] = applyVignetteValue(data[i + 2], value, mask);
        }
    }
}

export function vignette(arr, w, h, value, radius = 0.25, size = 0.65) {
    value = Math.max(-1, Math.min(1, value));

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const mask = vignetteMask(x, y, w, h, radius, size);
            const i = y * w + x;

            arr[i] = applyVignetteValue(arr[i], value, mask);
        }
    }
}

//#region helpers
function smoothstep(v) {
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    return v * v * (3 - 2 * v);
}

function applyVignetteValue(px, value, mask) {
    if (value < 0) {
        return clamp255(px * (1 + value * mask));
    }

    if (value > 0) {
        return clamp255(px + (255 - px) * value * mask);
    }

    return px;
}

function vignetteFade(dist, R, blurR) {
    // # размытие наружу от формы
    // const inner = R;
    // const outer = R + blurR;

    // # размытие в обе стороны от линии формы
    const inner = Math.max(0, R - blurR * 0.5);
    const outer = R + blurR * 0.5;

    // # размытие внутрь формы
    // const inner = Math.max(0, R - blurR);
    // const outer = R;

    return smoothstep((dist - inner) / (outer - inner));
}

const vignetteMask = vignetteMaskEllipse;

function vignetteMaskCircle(x, y, w, h, radius = 0.25, size = 0.65) {
    const cx = (w - 1) * 0.5;
    const cy = (h - 1) * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const diag = Math.sqrt(w * w + h * h);
    const dim = Math.max(w, h);
    const D = lerp(diag, dim, size);
    const R = D * 0.5;
    const blurR = Math.max(0.0001, radius * dim * 0.5);

    return vignetteFade(dist, R, blurR);
}

function vignetteMaskEllipse(x, y, w, h, radius = 0.25, size = 0.65) {
    const cx = (w - 1) * 0.5;
    const cy = (h - 1) * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const halfW = w * 0.5;
    const halfH = h * 0.5;
    const dim = Math.max(w, h);
    const k = lerp(Math.SQRT2, 1, size);
    const rx = halfW * k;
    const ry = halfH * k;
    const nx = dx / rx;
    const ny = dy / ry;
    const dist = Math.sqrt(nx * nx + ny * ny);
    const blurPx = Math.max(0.0001, radius * dim * 0.5);
    const blurR = blurPx / (dim * 0.5);

    return vignetteFade(dist, 1, blurR);
}