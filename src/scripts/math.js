// return -1.. 1
export function perlin2(x, y, seed = 1) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);

    const xf = x - x0;
    const yf = y - y0;

    const u = fade(xf);
    const v = fade(yf);

    const n00 = grad2(hash2(x0, y0, seed), xf, yf);
    const n10 = grad2(hash2(x0 + 1, y0, seed), xf - 1, yf);
    const n01 = grad2(hash2(x0, y0 + 1, seed), xf, yf - 1);
    const n11 = grad2(hash2(x0 + 1, y0 + 1, seed), xf - 1, yf - 1);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);

    return lerp(x1, x2, v);
}

// return 0.. 1
export function perlin201(x, y, seed = 1) {
    return clamp(perlin2(x, y, seed) * 0.5 + 0.5, 0, 1);
}

export function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

const GRAD2 = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

function grad2(hash, x, y) {
    const g = GRAD2[hash & 7];
    return g[0] * x + g[1] * y;
}

// export function grad2(hash, x, y) {
//     hash &= 7;
//     if (hash < 4) return (hash & 1 ? -x : x) + (hash & 2 ? -y : y);
//     return hash & 1 ? hash & 2 ? -y : -x : hash & 2 ? y : x;
// }

export function hash2(x, y, seed = 1) {
    let h = Math.imul(x | 0, 374761393) ^
        Math.imul(y | 0, 668265263) ^
        Math.imul(seed | 0, 1442695041);

    h ^= h >>> 13;
    h = Math.imul(h, 1274126177);
    h ^= h >>> 16;

    return h >>> 0;
}

export function hash32(a, b, c) {
    let x = a | 0;
    let y = b | 0;
    let z = c | 0;

    x = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b);
    y = Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
    z = Math.imul(z ^ 0x165667b1, 0x9e3779b1);

    let h = x ^ y ^ z;
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;

    return h >>> 0;
}

export function rand01(a, b, salt) {
    return hash32(a, b, salt) / 4294967296;
}

export function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

export function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : v);
}

let rndState = 123456789;

export function randomSeed(seed) {
    rndState = seed | 0;
}

export function random() {
    if (rndState === 0) rndState = 123456789;

    rndState ^= rndState << 13;
    rndState ^= rndState >>> 17;
    rndState ^= rndState << 5;

    return (rndState >>> 0) / 4294967296;
}

export function dist2(a, b) {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

export function dist(a, b) {
    return Math.sqrt(dist2(a, b));
}

export function diag(w, h) {
    return Math.sqrt(w * w + h * h)
}