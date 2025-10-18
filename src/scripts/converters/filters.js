import { constrain, roundInt } from "@alexgyver/utils";

export const grayscale = (r, g, b) => Math.round(r * 0.299 + g * 0.587 + b * 0.114);

export function invert(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = 255 - arr[i];
    }
    return arr;
}

export function threshold(arr, tr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = (arr[i] < tr) ? 0 : 255;
    }
    return arr;
}

export function ditherFloyd(arr, w, h) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let idx = y * w + x;
            let old = arr[idx];
            let col = old < 128 ? 0 : 255;
            let err = old - col;
            arr[idx] = col;

            if (x + 1 < w) arr[idx + 1] += Math.floor(err * 7 / 16);
            if (y + 1 < h) {
                if (x > 0) arr[idx + w - 1] += Math.floor(err * 3 / 16);
                arr[idx + w] += Math.floor(err * 5 / 16);
                if (x + 1 < w) arr[idx + w + 1] += Math.floor(err / 16);
            }
        }
    }
    for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i] < 0 ? 0 : (arr[i] > 255 ? 255 : arr[i]);
    }
}

export function ditherJJN(arr, w, h) {
    const kernel = [
        { x: 1, y: 0, w: 7 }, { x: 2, y: 0, w: 5 },
        { x: -2, y: 1, w: 3 }, { x: -1, y: 1, w: 5 },
        { x: 0, y: 1, w: 7 }, { x: 1, y: 1, w: 5 },
        { x: 2, y: 1, w: 3 }, { x: -2, y: 2, w: 1 },
        { x: -1, y: 2, w: 3 }, { x: 0, y: 2, w: 5 },
        { x: 1, y: 2, w: 3 }, { x: 2, y: 2, w: 1 },
    ];
    const divisor = 48;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const prev = arr[i];
            const cur = prev < 128 ? 0 : 255;
            arr[i] = cur;
            const err = prev - cur;

            for (let k = 0; k < kernel.length; k++) {
                const nx = x + kernel[k].x;
                const ny = y + kernel[k].y;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nidx = ny * w + nx;
                    arr[nidx] = constrain(arr[nidx] + err * (kernel[k].w / divisor), 0, 255);
                }
            }
        }
    }
}

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
    const n = 8;
    const divisor = n * n; // 64

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const threshold = (matrix[y % n][x % n] + 0.5) * (255 / divisor);
            arr[idx] = arr[idx] < threshold ? 0 : 255;
        }
    }
}

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

export function edges_simple(arr, w, h) {
    const kernel = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]];
    let t = [...arr];

    for (let x = 1; x < w - 1; x++) {
        for (let y = 1; y < h - 1; y++) {
            let sum = 0;
            for (let kx = -1; kx <= 1; kx++) {
                for (let ky = -1; ky <= 1; ky++) {
                    let val = t[(x + kx) + (y + ky) * w];
                    sum += kernel[ky + 1][kx + 1] * val;
                }
            }
            arr[x + y * w] = roundInt(constrain(sum, 0, 255));
        }
    }
}

export function edges_median(arr, w, h) {
    // let kernel = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
    let kernel = [[0, 0], [0, 1], [1, 0]];
    let t = [...arr];

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            if (!((x == 0) || (x == w - 1) || (y == 0) || (y == h - 1))) {
                let sum = [];
                for (let i = 0; i < kernel.length; i++) {
                    sum.push(t[(x + kernel[i][0]) + (y + kernel[i][1]) * w]);
                }
                sum.sort();
                let v = sum[sum.length - 1] - sum[0];
                arr[x + y * w] = roundInt(constrain(v, 0, 255));
            }
        }
    }
    invert(arr);
    if (h < 2 || w < 2) return;

    for (let x = 0; x < w; x++) {
        arr[x] = arr[x + w];
        arr[x + w * (h - 1)] = arr[x + w * (h - 2)];
    }
    for (let y = 0; y < h; y++) {
        arr[y * w] = arr[y * w + 1];
        arr[y * w + w - 1] = arr[y * w + w - 2];
    }
}

export function edges_sobel(arr, w, h, k) {
    const kernel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const kernel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    let t = [...arr];

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let sum_x = 0;
            let sum_y = 0;

            if (!((x == 0) || (x == w - 1) || (y == 0) || (y == h - 1))) {
                for (let kx = -1; kx <= 1; kx++) {
                    for (let ky = -1; ky <= 1; ky++) {
                        let val = arr[(x + kx) + (y + ky) * w];
                        sum_x += kernel_x[ky + 1][kx + 1] * val;
                        sum_y += kernel_y[ky + 1][kx + 1] * val;
                    }
                }
            }

            let sum = Math.sqrt(sum_x ** 2 + sum_y ** 2);
            t[x + y * w] = constrain(sum, 0, 255);
        }
    }

    for (let i = 0; i < arr.length; i++) {
        let val = arr[i] * (1 - k) + (255 - t[i]) * k;
        arr[i] = roundInt(val);
    }
}