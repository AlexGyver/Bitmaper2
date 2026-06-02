import { clamp255 } from "../math";
import {
    matrixFS,
    divFS,

    matrixJJN,
    divJJN,

    matrixStucki,
    divStucki,

    matrixSierra3,
    divSierra3,

    matrixSierra2,
    divSierra2,

    matrixSierraLite,
    divSierraLite,

    matrixAtkinson,
    divAtkinson,

    matrixBurkes,
    divBurkes,

    matrixBayer,
} from "./ditherMatrix";

//#region wrappers
export function ditherFS(arr, w, h) {
    return dither(arr, w, h, matrixFS, divFS);
}

export function ditherJJN(arr, w, h) {
    return dither(arr, w, h, matrixJJN, divJJN);
}

export function ditherStucki(arr, w, h) {
    return dither(arr, w, h, matrixStucki, divStucki);
}

export function ditherSierra2(arr, w, h) {
    return dither(arr, w, h, matrixSierra2, divSierra2);
}

export function ditherSierra3(arr, w, h) {
    return dither(arr, w, h, matrixSierra3, divSierra3);
}

export function ditherSierraLite(arr, w, h) {
    return dither(arr, w, h, matrixSierraLite, divSierraLite);
}

export function ditherAtkinson(arr, w, h) {
    return dither(arr, w, h, matrixAtkinson, divAtkinson);
}

export function ditherBurkes(arr, w, h) {
    return dither(arr, w, h, matrixBurkes, divBurkes);
}

//#region generic
function dither(arr, w, h, matrix, div) {
    const t = Float32Array.from(arr);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;

            const old = clamp255(t[i]);
            const cur = old < 128 ? 0 : 255;
            const err = old - cur;

            t[i] = cur;
            arr[i] = cur;

            for (let k = 0; k < matrix.length; k++) {
                const nx = x + matrix[k][0];
                const ny = y + matrix[k][1];

                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const ni = ny * w + nx;
                    t[ni] += err * matrix[k][2] / div;
                }
            }
        }
    }
}

//#region Bayer
// idx [0, 1, 2] - 2/4/8 matrix
// factor [0.0.. 2.0]
export function ditherBayer(arr, w, h, idx = 2, factor = 1.0) {
    const matrix = matrixBayer[idx];
    const n = matrix.length;
    const k = 255.0 / (n * n);

    for (let y = 0; y < h; y++) {
        const row = y * w;
        const my = y & (n - 1);

        for (let x = 0; x < w; x++) {
            const i = row + x;
            const mx = x & (n - 1);
            const bayer = (matrix[my][mx] + 0.5) * k;
            const threshold = 128 + (bayer - 128) * factor;
            arr[i] = arr[i] < threshold ? 0 : 255;
        }
    }
}

//#region Riemersma
// factor [0.0.. 2.0]
export function ditherRiemersma(arr, w, h, factor = 1.0) {
    function rot(n, x, y, rx, ry) {
        if (ry === 0) {
            if (rx === 1) {
                x = n - 1 - x;
                y = n - 1 - y;
            }
            return [y, x];
        }
        return [x, y];
    }

    function d2xy(n, d) {
        let x = 0;
        let y = 0;
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

    function hilbertOrder(w, h) {
        let n = 1;

        while (n < Math.max(w, h)) {
            n <<= 1;
        }

        const coords = [];

        for (let d = 0; d < n * n; d++) {
            const [x, y] = d2xy(n, d);

            if (x < w && y < h) {
                coords.push([x, y]);
            }
        }

        return coords;
    }

    const decay = 0.75;
    const historyLen = 16;

    const errBuf = new Float32Array(historyLen);
    let errIdx = 0;

    const order = hilbertOrder(w, h);

    for (let k = 0; k < order.length; k++) {
        const [x, y] = order[k];
        const idx = y * w + x;

        let errSum = 0;
        let weightSum = 0;
        let weight = 1;

        for (let i = 0; i < historyLen; i++) {
            const e = errBuf[(errIdx - i + historyLen) % historyLen];
            errSum += e * weight;
            weightSum += weight;
            weight *= decay;
        }

        const correctedError = weightSum > 0 ? errSum / weightSum : 0;
        let val = arr[idx] + correctedError * factor;
        val = clamp255(val);

        const q = val < 128 ? 0 : 255;
        arr[idx] = q;

        const error = val - q;
        errBuf[errIdx] = error;
        errIdx = (errIdx + 1) % historyLen;
    }
}