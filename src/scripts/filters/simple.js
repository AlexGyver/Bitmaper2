import { clamp, clamp255 } from "../math";

//#region rgbToGray
export function rgbToGray(r, g, b) {
    return clamp255(r * 0.299 + g * 0.587 + b * 0.114);
}

//#region invert
export function invert(arr, w, h) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = 255 - arr[i];
    }
}

//#region threshold
// value [0.. 255]
export function threshold(arr, w, h, value = 128) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i] < value ? 0 : 255;
    }
}

//#region gamma
// value [0.0.. 5.0]
export function gamma(arr, w, h, value = 1.0) {
    if (!value) return;
    const inv = 1 / value;
    const lut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
        lut[i] = clamp255(Math.round(Math.pow(i / 255, inv) * 255));
    }

    for (let i = 0; i < arr.length; i++) {
        arr[i] = lut[arr[i]];
    }
}

//#region offset
// value [-255.. 255]
export function offset(arr, w, h, value = 0) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = clamp255(arr[i] + value);
    }
}

//#region brightness
// value [-255.. 255]
export function brightness(arr, w, h, value = 0) {
    const amount = 1 + clamp(value, -255, 255) / 255;

    for (let i = 0; i < arr.length; i++) {
        arr[i] = clamp255(arr[i] * amount);
    }
}

//#region contrast
// value [-255.. 255]
export function contrast(arr, w, h, value = 0) {
    const factor = (259 * (value + 255)) / (255 * (259 - value));

    for (let i = 0; i < arr.length; i++) {
        arr[i] = clamp255(factor * (arr[i] - 128) + 128);
    }
}

//#region clean
export function clean(arr, w, h) {
    const src = new Uint8Array(arr);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const v = src[i];
            let isolated = true;

            for (let dy = -1; dy <= 1 && isolated; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;

                    const ni = (y + dy) * w + (x + dx);

                    if (src[ni] == v) {
                        isolated = false;
                        break;
                    }
                }
            }

            if (isolated) {
                arr[i] = v == 255 ? 0 : 255;
            }
        }
    }
}

//#region blur
// value [0.. n]
export function blur(arr, w, h, value = 1) {
    const t = new Uint32Array(w * h);
    const size = value * 2 + 1;
    value = value | 0;

    // horizontal pass
    for (let y = 0; y < h; y++) {
        const row = y * w;
        let sum = 0;

        for (let i = -value; i <= value; i++) {
            let x = i;
            if (x < 0) x = 0;
            else if (x >= w) x = w - 1;

            sum += arr[row + x];
        }

        for (let x = 0; x < w; x++) {
            t[row + x] = (sum / size + 0.5) | 0;

            let xRemove = x - value;
            let xAdd = x + value + 1;

            if (xRemove < 0) xRemove = 0;
            else if (xRemove >= w) xRemove = w - 1;

            if (xAdd < 0) xAdd = 0;
            else if (xAdd >= w) xAdd = w - 1;

            sum += arr[row + xAdd] - arr[row + xRemove];
        }
    }

    // vertical pass
    for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let i = -value; i <= value; i++) {
            let y = i;
            if (y < 0) y = 0;
            else if (y >= h) y = h - 1;

            sum += t[y * w + x];
        }

        for (let y = 0; y < h; y++) {
            arr[y * w + x] = (sum / size + 0.5) | 0;

            let yRemove = y - value;
            let yAdd = y + value + 1;

            if (yRemove < 0) yRemove = 0;
            else if (yRemove >= h) yRemove = h - 1;

            if (yAdd < 0) yAdd = 0;
            else if (yAdd >= h) yAdd = h - 1;

            sum += t[yAdd * w + x] - t[yRemove * w + x];
        }
    }
}

//#region blurN
// value [0.. n]
// iterations [0.. n]
export function blurN(arr, w, h, value = 1, iterations = 1) {
    for (let i = 0; i < iterations; i++) {
        blur(arr, w, h, value);
    }
}

//#region sharpen
// value [0.0.. 1.0]
export function sharpen(arr, w, h, value = 1.0) {
    const t = Int16Array.from(arr);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = x + y * w;
            const center = t[i];
            const neighbors =
                t[i - w - 1] + t[i - w] + t[i - w + 1] +
                t[i - 1] + t[i + 1] +
                t[i + w - 1] + t[i + w] + t[i + w + 1];

            arr[i] = clamp255(center * (1 + 8 * value) - neighbors * value);
        }
    }
}

//#region median
// radius [0.. n]
// iterations [0.. n]
export function median(arr, w, h, radius = 1, iterations = 1) {
    if (radius === 1) {
        median3x3(arr, w, h, iterations);
    } else {
        medianHist(arr, w, h, radius, iterations);
    }
}

export function median3x3(arr, w, h, iterations = 1) {
    const tmp = new Uint8Array(arr.length);

    let src = arr;
    let dst = tmp;

    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 0; y < h; y++) {
            const ym = y > 0 ? y - 1 : 0;
            const yp = y < h - 1 ? y + 1 : h - 1;

            const row0 = ym * w;
            const row1 = y * w;
            const row2 = yp * w;

            for (let x = 0; x < w; x++) {
                const xm = x > 0 ? x - 1 : 0;
                const xp = x < w - 1 ? x + 1 : w - 1;

                let a = src[row0 + xm];
                let b = src[row0 + x];
                let c = src[row0 + xp];

                let d = src[row1 + xm];
                let e = src[row1 + x];
                let f = src[row1 + xp];

                let g = src[row2 + xm];
                let h0 = src[row2 + x];
                let i = src[row2 + xp];

                if (a > b) { const t = a; a = b; b = t; }
                if (d > e) { const t = d; d = e; e = t; }
                if (g > h0) { const t = g; g = h0; h0 = t; }

                if (a > d) { const t = a; a = d; d = t; }
                if (b > e) { const t = b; b = e; e = t; }
                if (c > f) { const t = c; c = f; f = t; }

                if (d > g) { const t = d; d = g; g = t; }
                if (e > h0) { const t = e; e = h0; h0 = t; }
                if (f > i) { const t = f; f = i; i = t; }

                if (a > d) { const t = a; a = d; d = t; }
                if (b > e) { const t = b; b = e; e = t; }
                if (c > f) { const t = c; c = f; f = t; }

                if (c > e) { const t = c; c = e; e = t; }
                if (d > g) { const t = d; d = g; g = t; }

                if (c > d) { const t = c; c = d; d = t; }
                if (e > g) { const t = e; e = g; g = t; }

                if (d > e) { const t = d; d = e; e = t; }

                dst[row1 + x] = e;
            }
        }

        const swap = src;
        src = dst;
        dst = swap;
    }

    if (src !== arr) {
        arr.set(src);
    }
}

export function medianHist(arr, w, h, radius = 2, iterations = 1) {
    const tmp = new Uint8Array(arr.length);
    const hist = new Uint16Array(256);

    let src = arr;
    let dst = tmp;

    const diameter = radius * 2 + 1;
    const area = diameter * diameter;
    const mid = area >> 1;

    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                hist.fill(0);

                for (let dy = -radius; dy <= radius; dy++) {
                    let yy = y + dy;

                    if (yy < 0) yy = 0;
                    else if (yy >= h) yy = h - 1;

                    const row = yy * w;

                    for (let dx = -radius; dx <= radius; dx++) {
                        let xx = x + dx;

                        if (xx < 0) xx = 0;
                        else if (xx >= w) xx = w - 1;

                        hist[src[row + xx]]++;
                    }
                }

                let acc = 0;
                let m = 0;

                while (m < 256) {
                    acc += hist[m];
                    if (acc > mid) break;
                    m++;
                }
                dst[y * w + x] = m;
            }
        }

        const swap = src;
        src = dst;
        dst = swap;
    }

    if (src !== arr) {
        arr.set(src);
    }
}