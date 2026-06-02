import { clamp, clamp255 } from "../math";

//#region mirrorIData
export function mirrorIData(idata, mx, my) {
    const data = idata.data;
    const w = idata.width;
    const h = idata.height;
    const t = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sx = mx ? w - 1 - x : x;
            const sy = my ? h - 1 - y : y;
            const di = (y * w + x) * 4;
            const ti = (sy * w + sx) * 4;

            data[di + 0] = t[ti + 0];
            data[di + 1] = t[ti + 1];
            data[di + 2] = t[ti + 2];
            data[di + 3] = t[ti + 3];
        }
    }
}

//#region balanceIData
// r, g, b [0.0.. 2.0]
export function balanceIData(idata, r = 1, g = 1, b = 1) {
    const data = idata.data;

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        data[i + 0] = data[i + 0] * r;
        data[i + 1] = data[i + 1] * g;
        data[i + 2] = data[i + 2] * b;
    }
}

//#region offsetIData
// value [-255.. 255]
export function offsetIData(idata, value = 0) {
    const data = idata.data;

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        data[i + 0] = data[i + 0] + value;
        data[i + 1] = data[i + 1] + value;
        data[i + 2] = data[i + 2] + value;
    }
}

//#region brightnessIData
// value [-255.. 255]
export function brightnessIData(idata, value = 0) {
    const data = idata.data;
    const amount = 1 + clamp(value, -255, 255) / 255;

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        data[i + 0] = data[i + 0] * amount;
        data[i + 1] = data[i + 1] * amount;
        data[i + 2] = data[i + 2] * amount;
    }
}

//#region contrastIData
// value [-255.. 255]
export function contrastIData(idata, value = 0) {
    const data = idata.data;
    const factor = (259 * (value + 255)) / (255 * (259 - value));

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        data[i + 0] = factor * (data[i + 0] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
}

//#region saturateIData
// value [-255.. 255]
export function saturateIData(idata, value = 0) {
    const data = idata.data;

    value = Math.max(-255, Math.min(255, value));

    const factor = value < 0
        ? (value + 255) / 255
        : 1 + value / 255;

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        const r = data[i + 0];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = r * 0.299 + g * 0.587 + b * 0.114;

        data[i + 0] = gray + (r - gray) * factor;
        data[i + 1] = gray + (g - gray) * factor;
        data[i + 2] = gray + (b - gray) * factor;
    }
}

//#region gammaIData
// value [0.0.. 5.0]
export function gammaIData(idata, value = 1.0) {
    if (!value) value = 1e-6;

    const data = idata.data;
    const inv = 1 / value;
    const lut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
        lut[i] = clamp255(Math.round(Math.pow(i / 255, inv) * 255));
    }

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        data[i + 0] = lut[data[i + 0]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
    }
}

//#region blurIData
// value [0.. n]
export function blurIData(idata, value = 1) {
    value = Math.max(0, Math.floor(value));

    if (!value) return;

    const data = idata.data;
    const w = idata.width;
    const h = idata.height;

    const tmp = new Uint8ClampedArray(data.length);
    const size = value * 2 + 1;

    // horizontal pass
    for (let y = 0; y < h; y++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;

        for (let x = -value; x <= value; x++) {
            const px = Math.min(w - 1, Math.max(0, x));
            const i = (y * w + px) * 4;

            r += data[i + 0];
            g += data[i + 1];
            b += data[i + 2];
            a += data[i + 3];
        }

        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;

            tmp[i + 0] = r / size;
            tmp[i + 1] = g / size;
            tmp[i + 2] = b / size;
            tmp[i + 3] = a / size;

            const removeX = Math.max(0, x - value);
            const addX = Math.min(w - 1, x + value + 1);

            const removeI = (y * w + removeX) * 4;
            const addI = (y * w + addX) * 4;

            r += data[addI + 0] - data[removeI + 0];
            g += data[addI + 1] - data[removeI + 1];
            b += data[addI + 2] - data[removeI + 2];
            a += data[addI + 3] - data[removeI + 3];
        }
    }

    // vertical pass
    for (let x = 0; x < w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;

        for (let y = -value; y <= value; y++) {
            const py = Math.min(h - 1, Math.max(0, y));
            const i = (py * w + x) * 4;

            r += tmp[i + 0];
            g += tmp[i + 1];
            b += tmp[i + 2];
            a += tmp[i + 3];
        }

        for (let y = 0; y < h; y++) {
            const i = (y * w + x) * 4;

            data[i + 0] = r / size;
            data[i + 1] = g / size;
            data[i + 2] = b / size;
            data[i + 3] = a / size;

            const removeY = Math.max(0, y - value);
            const addY = Math.min(h - 1, y + value + 1);

            const removeI = (removeY * w + x) * 4;
            const addI = (addY * w + x) * 4;

            r += tmp[addI + 0] - tmp[removeI + 0];
            g += tmp[addI + 1] - tmp[removeI + 1];
            b += tmp[addI + 2] - tmp[removeI + 2];
            a += tmp[addI + 3] - tmp[removeI + 3];
        }
    }
}