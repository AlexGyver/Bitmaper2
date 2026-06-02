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
export function ditherRgbFS(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixFS, divFS);
}

export function ditherRgbJJN(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixJJN, divJJN);
}

export function ditherRgbStucki(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixStucki, divStucki);
}

export function ditherRgbSierra3(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixSierra3, divSierra3);
}

export function ditherRgbSierra2(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixSierra2, divSierra2);
}

export function ditherRgbSierraLite(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixSierraLite, divSierraLite);
}

export function ditherRgbAtkinson(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixAtkinson, divAtkinson);
}

export function ditherRgbBurkes(rgbArr, w, h, palette) {
    return ditherRgb(rgbArr, w, h, palette, matrixBurkes, divBurkes);
}

//#region index
const RI = 2;
const GI = 1;
const BI = 0;

//#region Bayer
// palette [uint32 color array]
// idx [0, 1, 2] - 2/4/8 matrix
// factor [0.0.. 2.0]
export function ditherRgbBayer(rgbArr, w, h, palette, idx = 2, factor = 1.0) {
    const pal = preparePalette(palette);
    const matrix = matrixBayer[idx];
    const n = matrix.length;
    const k = 255.0 / (n * n);

    for (let y = 0; y < h; y++) {
        const row = y * w;
        const my = y & (n - 1);

        for (let x = 0; x < w; x++) {
            const mx = x & (n - 1);
            const p = (row + x) * 4;
            const bayer = (matrix[my][mx] + 0.5) * k;
            const offset = (bayer - 128) * factor;
            const r = clamp255(rgbArr[p + RI] + offset);
            const g = clamp255(rgbArr[p + GI] + offset);
            const b = clamp255(rgbArr[p + BI] + offset);
            const nc = nearestColor(r, g, b, pal);

            rgbArr[p + RI] = (nc >> 16) & 255;
            rgbArr[p + GI] = (nc >> 8) & 255;
            rgbArr[p + BI] = nc & 255;
        }
    }
}

//#region generic
export function ditherRgb(rgbArr, w, h, palette, matrix, div) {
    const len = w * h;
    const r = new Float32Array(len);
    const g = new Float32Array(len);
    const b = new Float32Array(len);
    const pal = preparePalette(palette);

    for (let i = 0, p = 0; i < len; i++, p += 4) {
        r[i] = rgbArr[p + RI];
        g[i] = rgbArr[p + GI];
        b[i] = rgbArr[p + BI];
    }

    for (let y = 0; y < h; y++) {
        const row = y * w;

        for (let x = 0; x < w; x++) {
            const i = row + x;
            const p = i * 4;
            const oldR = clamp255(r[i]);
            const oldG = clamp255(g[i]);
            const oldB = clamp255(b[i]);
            const nc = nearestColor(oldR, oldG, oldB, pal);
            const newR = (nc >> 16) & 255;
            const newG = (nc >> 8) & 255;
            const newB = nc & 255;
            const errR = oldR - newR;
            const errG = oldG - newG;
            const errB = oldB - newB;

            rgbArr[p + RI] = newR;
            rgbArr[p + GI] = newG;
            rgbArr[p + BI] = newB;

            for (let k = 0; k < matrix.length; k++) {
                const m = matrix[k];
                addError(r, g, b, w, h, x + m[0], y + m[1], errR, errG, errB, m[2] / div);
            }
        }
    }
}

//#region helpers
function addError(r, g, b, w, h, x, y, er, eg, eb, k) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const i = y * w + x;

    r[i] += er * k;
    g[i] += eg * k;
    b[i] += eb * k;
}

function preparePalette(palette) {
    return palette.map(c => ({
        c,
        r: (c >> 16) & 255,
        g: (c >> 8) & 255,
        b: c & 255,
    }));
}

function nearestColor(r, g, b, pal) {
    let best = pal[0].c;
    let bestDist = Infinity;

    for (let i = 0; i < pal.length; i++) {
        const p = pal[i];

        const dr = r - p.r;
        const dg = g - p.g;
        const db = b - p.b;

        const d = dr * dr + dg * dg + db * db;

        if (d < bestDist) {
            bestDist = d;
            best = p.c;
        }
    }

    return best;
}

// const hueW = 0.25;
// const satW = 0.10;
// const valW = 0.30;
// const rgbW = 0.8;
// const hsvW = 1.0 - rgbW;
// const hueMinSat = 0.18;

// function hueDist01(h1, h2) {
//     let d = Math.abs(h1 - h2);
//     if (d > 180) d = 360 - d;
//     return d / 180;
// }

// function preparePalette(palette) {
//     return palette.map(c => {
//         const r = (c >> 16) & 255;
//         const g = (c >> 8) & 255;
//         const b = c & 255;
//         const [h, s, v] = rgbToHsv(r, g, b);

//         return { c, r, g, b, h, s, v };
//     });
// }

// function nearestColor(r, g, b, pal) {
//     const [h, s, v] = rgbToHsv(r, g, b);

//     let best = pal[0].c;
//     let bestDist = Infinity;

//     for (let i = 0; i < pal.length; i++) {
//         const p = pal[i];

//         const dr = (r - p.r) / 255;
//         const dg = (g - p.g) / 255;
//         const db = (b - p.b) / 255;

//         const rgbD = dr * dr + dg * dg + db * db;

//         const ds = s - p.s;
//         const dv = v - p.v;

//         let hsvD = ds * ds * satW + dv * dv * valW;

//         if (s > hueMinSat && p.s > hueMinSat) {
//             const dh = hueDist01(h, p.h);
//             hsvD += dh * dh * hueW;
//         }

//         const d = rgbD * rgbW + hsvD * hsvW;

//         if (d < bestDist) {
//             bestDist = d;
//             best = p.c;
//         }
//     }

//     return best;
// }