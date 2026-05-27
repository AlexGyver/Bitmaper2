import { constrain, roundInt } from "@alexgyver/utils";

//#region grayscale
export function grayscale(r, g, b) {
    return Math.min(255, Math.round(r * 0.299 + g * 0.587 + b * 0.114));
}

//#region invert
export function invert(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = 255 - arr[i];
    }
    return arr;
}

//#region threshold
export function threshold(arr, tr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = (arr[i] < tr) ? 0 : 255;
    }
    return arr;
}

//#region posterize
export function posterize(arr, w, h, n) {
    if (n < 2) return;

    const len = w * h;
    const levels = n - 1;
    const table = new Uint8Array(256);

    for (let x = 0; x < 256; x++) {
        const level = Math.round((x * levels) / 255);
        table[x] = Math.round((level * 255) / levels);
    }

    for (let i = 0; i < len; i++) {
        arr[i] = table[arr[i]];
    }
}

////////////////////
//#region posterizeIData
export function posterizeIData(data, w, h, n) {
    const pixelCount = w * h;
    const expectedLength = pixelCount * 4;
    const colors = collectUniqueRGBColors(data, pixelCount);

    if (colors.length <= n) {
        return;
    }

    const palette = buildPaletteKMeans(colors, n, 10);

    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        const color = (r << 16) | (g << 8) | b;
        const nearest = findNearestColor(color, palette);

        data[p] = (nearest >> 16) & 255;
        data[p + 1] = (nearest >> 8) & 255;
        data[p + 2] = nearest & 255;

        // data[p + 3] — alpha, не трогаем
    }
}

function collectUniqueRGBColors(data, pixelCount) {
    const set = new Set();

    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        set.add((r << 16) | (g << 8) | b);
    }

    return Array.from(set);
}

function buildPaletteKMeans(colors, n, iterations) {
    const centers = initCenters(colors, n);

    const sumsR = new Float32Array(n);
    const sumsG = new Float32Array(n);
    const sumsB = new Float32Array(n);
    const counts = new Uint32Array(n);

    for (let iter = 0; iter < iterations; iter++) {
        sumsR.fill(0);
        sumsG.fill(0);
        sumsB.fill(0);
        counts.fill(0);

        for (let i = 0; i < colors.length; i++) {
            const color = colors[i];
            const nearest = findNearestIndex(color, centers);

            sumsR[nearest] += (color >> 16) & 255;
            sumsG[nearest] += (color >> 8) & 255;
            sumsB[nearest] += color & 255;
            counts[nearest]++;
        }

        for (let i = 0; i < n; i++) {
            if (counts[i] === 0) continue;

            const r = Math.round(sumsR[i] / counts[i]);
            const g = Math.round(sumsG[i] / counts[i]);
            const b = Math.round(sumsB[i] / counts[i]);

            centers[i] = (r << 16) | (g << 8) | b;
        }
    }

    // Палитра будет состоять из цветов, которые реально есть на изображении.
    const palette = new Uint32Array(n);

    for (let i = 0; i < n; i++) {
        palette[i] = findNearestColor(centers[i], colors);
    }

    return palette;
}

function initCenters(colors, n) {
    const centers = new Uint32Array(n);

    for (let i = 0; i < n; i++) {
        const index = Math.floor((i * colors.length) / n);
        centers[i] = colors[index];
    }

    return centers;
}

function findNearestColor(color, palette) {
    return palette[findNearestIndex(color, palette)];
}

function findNearestIndex(color, palette) {
    const r1 = (color >> 16) & 255;
    const g1 = (color >> 8) & 255;
    const b1 = color & 255;

    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < palette.length; i++) {
        const c = palette[i];

        const dr = r1 - ((c >> 16) & 255);
        const dg = g1 - ((c >> 8) & 255);
        const db = b1 - (c & 255);

        const dist = dr * dr + dg * dg + db * db;

        if (dist < bestDist) {
            bestDist = dist;
            bestIndex = i;
        }
    }

    return bestIndex;
}
////////////////////

//#region ditherFloyd
export function ditherFloyd(arr, w, h) {
    const t = Float32Array.from(arr);

    const add = (x, y, v) => {
        if (x >= 0 && x < w && y >= 0 && y < h) {
            t[y * w + x] += v;
        }
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;

            const old = t[i];
            const col = old < 128 ? 0 : 255;
            const err = old - col;

            t[i] = col;

            add(x + 1, y, err * 7 / 16);
            add(x - 1, y + 1, err * 3 / 16);
            add(x, y + 1, err * 5 / 16);
            add(x + 1, y + 1, err * 1 / 16);
        }
    }

    for (let i = 0; i < t.length; i++) {
        arr[i] = t[i] < 128 ? 0 : 255;
    }
}

//#region ditherJJN
export function ditherJJN(arr, w, h) {
    const t = Float32Array.from(arr);

    const kernel = [
        [1, 0, 7],
        [2, 0, 5],
        [-2, 1, 3],
        [-1, 1, 5],
        [0, 1, 7],
        [1, 1, 5],
        [2, 1, 3],
        [-2, 2, 1],
        [-1, 2, 3],
        [0, 2, 5],
        [1, 2, 3],
        [2, 2, 1],
    ];
    const divisor = 48;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const prev = t[i];
            const cur = prev < 128 ? 0 : 255;
            t[i] = cur;
            const err = prev - cur;

            for (let k = 0; k < kernel.length; k++) {
                const nx = x + kernel[k][0];
                const ny = y + kernel[k][1];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const ni = ny * w + nx;
                    t[ni] += err * kernel[k][2] / divisor;
                }
            }
        }
    }
    for (let i = 0; i < t.length; i++) {
        arr[i] = t[i] < 128 ? 0 : 255;
    }
}

//#region ditherBayer
export function ditherBayer(arr, w, h) {
    const matrix = [
        [0, 32, 8, 40, 2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21],
    ];
    const n = matrix.length;
    const div = n * n;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const threshold = (matrix[y % n][x % n] + 0.5) * (255 / div);
            arr[i] = arr[i] < threshold ? 0 : 255;
        }
    }
}

//#region edgesSimple
export function edgesSimple(arr, w, h) {
    const t = Int32Array.from(arr);
    const kernel = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let sum = 0;
            for (let kx = -1; kx <= 1; kx++) {
                for (let ky = -1; ky <= 1; ky++) {
                    let val = t[(x + kx) + (y + ky) * w];
                    sum += kernel[ky + 1][kx + 1] * val;
                }
            }
            arr[x + y * w] = constrain(sum, 0, 255);
        }
    }
}

//#region edgesMedian
export function edgesMedian(arr, w, h) {
    if (w < 3 || h < 3) return;

    const t = Int32Array.from(arr);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = x + y * w;

            const c = t[i];
            const l = t[i - 1];
            const r = t[i + 1];
            const u = t[i - w];
            const d = t[i + w];

            const min = Math.min(c, l, r, u, d);
            const max = Math.max(c, l, r, u, d);

            arr[i] = constrain(max - min, 0, 255);
        }
    }

    invert(arr);

    for (let x = 0; x < w; x++) {
        arr[x] = arr[x + w];
        arr[x + w * (h - 1)] = arr[x + w * (h - 2)];
    }

    for (let y = 0; y < h; y++) {
        arr[y * w] = arr[y * w + 1];
        arr[y * w + w - 1] = arr[y * w + w - 2];
    }
}

//#region binaryContour
export function binaryContour(arr, w, h, dir8) {
    if (w < 3 || h < 3) return;

    const t = Uint8Array.from(arr);
    for (let i = 0; i < t.length; i++) {
        if (t[i] < 128) t[i] = 0;
    }

    arr.fill(255);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = x + y * w;

            if (t[i]) continue;

            let val = t[i - 1] || t[i + 1] || t[i - w] || t[i + w];
            if (dir8) val |= t[i - w - 1] || t[i - w + 1] || t[i + w - 1] || t[i + w + 1];
            if (val) arr[i] = 0;
        }
    }
}

//#region edgesSobel
export function edgesSobel(arr, w, h, k) {
    const t = Int32Array.from(arr);
    const edge = new Int32Array(arr.length);

    const kernel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const kernel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let sum_x = 0;
            let sum_y = 0;

            if ((x > 0) && (x < w - 1) && (y > 0) && (y < h - 1)) {
                for (let kx = -1; kx <= 1; kx++) {
                    for (let ky = -1; ky <= 1; ky++) {
                        let val = t[(x + kx) + (y + ky) * w];
                        sum_x += kernel_x[ky + 1][kx + 1] * val;
                        sum_y += kernel_y[ky + 1][kx + 1] * val;
                    }
                }
            }

            let v = Math.sqrt(sum_x * sum_x + sum_y * sum_y);
            edge[x + y * w] = constrain(v, 0, 255);
        }
    }

    for (let i = 0; i < arr.length; i++) {
        let v = arr[i] * (1 - k) + (255 - edge[i]) * k;
        arr[i] = roundInt(constrain(v, 0, 255));
    }
}

//#region ditherRiemersma
/*
export function ditherRiemersma(arr, w, h) {
    const rot = (n, x, y, rx, ry) => {
        if (ry === 0) {
            if (rx === 1) {
                x = n - 1 - x;
                y = n - 1 - y;
            }
            return [y, x];
        }
        return [x, y];
    }
    const d2xy = (n, d) => {
        let x = 0, y = 0;
        let t = d;
        for (let s = 1; s < n; s <<= 1) {
            const rx = 1 & (t >> 1);
            const ry = 1 & (t ^ rx);
            [x, y] = rot(s, x, y, rx, ry);
            x += s * rx;
            y += s * ry;
            t >>= 2;
        }
        return [x, y];
    }
    const hilbertOrder = (w, h) => {
        let n = 1;
        while (n < Math.max(w, h)) n <<= 1;

        const coords = [];
        for (let d = 0; d < n * n; d++) {
            const [x, y] = d2xy(n, d);
            if (x < w && y < h) coords.push([x, y]);
        }
        return coords;
    }

    const decay = 0.75;
    const historyLen = 16;

    const errBuf = new Array(historyLen).fill(0);
    let errIdx = 0;

    const order = hilbertOrder(w, h);

    for (let k = 0; k < order.length; k++) {
        const [x, y] = order[k];
        const idx = y * w + x;

        let oldPixel = arr[idx];
        let errSum = 0;
        let weight = 1.0;

        for (let i = 0; i < historyLen; i++) {
            errSum += errBuf[(errIdx - i + historyLen) % historyLen] * weight;
            weight *= decay;
        }

        let val = oldPixel + errSum;
        if (val < 0) val = 0;
        if (val > 255) val = 255;

        const q = val < 128 ? 0 : 255;
        arr[idx] = q;

        const error = val - q;
        errIdx = (errIdx + 1) % historyLen;
        errBuf[errIdx] = error;
    }
}
*/