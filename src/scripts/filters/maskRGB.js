import { colorToArray, rgbToHsv } from "@alexgyver/utils";

const hueW = 1;
const satW = 0.25;
const valW = 0.15;

//#region maskRgbIData
// mask [webcolor | uint32 rgb888]
// tol [0.0.. 1.0]
export function maskRgbIData(idata, mask, tol) {
    const data = idata.data;
    const [r0, g0, b0] = colorToArray(mask);
    tol *= 440;    // sqrt 255*255 x3
    const tol2 = tol * tol;
    const scale = tol ? 255 / tol : 255;

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        const dr = data[i + 0] - r0;
        const dg = data[i + 1] - g0;
        const db = data[i + 2] - b0;
        const d2 = (dr * dr) + (dg * dg) + (db * db);
        let out = (d2 < tol2) ? Math.sqrt(d2) * scale : 255;
        apply(data, i, out);
    }
}

//#region maskHueIData
// mask [webcolor | uint32 rgb888]
// tol [0.0.. 1.0]
export function maskHueIData(idata, mask, tol) {
    const data = idata.data;
    const h0 = rgbToHsv(...colorToArray(mask))[0];
    tol *= 180;
    const scale = tol ? 255 / tol : 255;

    const dist = (h1, h2) => {
        let d = Math.abs(h1 - h2);
        return d > 180 ? 360 - d : d;
    }

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        const [h, s] = rgbToHsv(data[i + 0], data[i + 1], data[i + 2]);
        let out = 255;

        if (s > 0.02) { // not gray
            const d = dist(h, h0);
            if (d < tol) out = d * scale;
        }
        apply(data, i, out);
    }
}

//#region maskHsvIData
// mask [webcolor | uint32 rgb888]
// tol [0.0.. 1.0]
export function maskHsvIData(idata, mask, tol) {
    const data = idata.data;
    const [h0, s0, v0] = rgbToHsv(...colorToArray(mask));
    const scale = tol ? 255 / tol : 255;

    const dist = (h1, h2) => {
        let d = Math.abs(h1 - h2);
        if (d > 180) d = 360 - d;
        return d / 180;
    }

    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;

        const [h, s, v] = rgbToHsv(data[i + 0], data[i + 1], data[i + 2]);
        const dh = dist(h, h0);
        const ds = Math.abs(s - s0);
        const dv = Math.abs(v - v0);
        const d = Math.sqrt(dh * dh * hueW + ds * ds * satW + dv * dv * valW);
        let out = d < tol ? d * scale : 255;
        apply(data, i, out);
    }
}

function apply(data, i, out) {
    out = 255 - out;
    data[i + 0] = out;
    data[i + 1] = out;
    data[i + 2] = out;
}