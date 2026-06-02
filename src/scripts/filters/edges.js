import { clamp255, diag } from "../math";
import { invert } from "./simple";

//#region erode
// radius [1.. n]
// shape ['circle', 'cross', 'rect']
export function erode(arr, width, height, radius = 1, shape = 'circle') {
    if (!radius) return;
    radius = radius | 0;

    let inv = false;
    if (radius < 0) {
        radius = -radius;
        inv = true;
    }

    const t = new Uint8Array(arr);
    const isTarget = (i) => inv ? t[i] < 128 : t[i] >= 128;
    const offsets = [];
    const r2 = radius * radius;

    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            if (shape === 'cross') {
                if (x !== 0 && y !== 0) continue;
            } else if (shape === 'circle') {
                if (x * x + y * y > r2) continue;
            }

            offsets.push([x, y]);
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;

            // не трогать края todo
            // if (
            //     x < radius ||
            //     x >= width - radius ||
            //     y < radius ||
            //     y >= height - radius
            // ) {
            //     arr[i] = t[i];
            //     continue;
            // }

            if (!isTarget(i)) {
                arr[i] = inv ? 255 : 0;
                continue;
            }

            let keep = true;

            for (let k = 0; k < offsets.length; k++) {
                const ox = offsets[k][0];
                const oy = offsets[k][1];
                const xx = x + ox;
                const yy = y + oy;

                if (
                    xx < 0 ||
                    xx >= width ||
                    yy < 0 ||
                    yy >= height ||
                    !isTarget(yy * width + xx)
                ) {
                    keep = false;
                    break;
                }
            }

            arr[i] = keep ? (inv ? 0 : 255) : (inv ? 255 : 0);
        }
    }
}

//#region canny
// value [0.0.. 1.0]
export function canny(arr, w, h, value = 1.0) {
    const len = w * h;
    const mag = new Float32Array(len);
    const dir = new Uint8Array(len);

    // Sobel gradients
    for (let y = 1; y < h - 1; y++) {
        const yw = y * w;

        for (let x = 1; x < w - 1; x++) {
            const i = yw + x;

            const tl = arr[i - w - 1];
            const tc = arr[i - w];
            const tr = arr[i - w + 1];

            const ml = arr[i - 1];
            const mr = arr[i + 1];

            const bl = arr[i + w - 1];
            const bc = arr[i + w];
            const br = arr[i + w + 1];

            const gx =
                -tl + tr +
                -2 * ml + 2 * mr +
                -bl + br;

            const gy =
                -tl - 2 * tc - tr +
                bl + 2 * bc + br;

            const m = diag(gx, gy);
            mag[i] = m;

            // quantized angle
            let angle = Math.atan2(gy, gx) * 180 / Math.PI;
            if (angle < 0) angle += 180;

            if (angle < 22.5 || angle >= 157.5) {
                dir[i] = 0;       // 0°
            } else if (angle < 67.5) {
                dir[i] = 1;       // 45°
            } else if (angle < 112.5) {
                dir[i] = 2;       // 90°
            } else {
                dir[i] = 3;       // 135°
            }
        }
    }

    // clear borders
    for (let x = 0; x < w; x++) {
        arr[x] = 0;
        arr[(h - 1) * w + x] = 0;
    }

    for (let y = 0; y < h; y++) {
        arr[y * w] = 0;
        arr[y * w + w - 1] = 0;
    }

    // suppression
    for (let y = 1; y < h - 1; y++) {
        const yw = y * w;

        for (let x = 1; x < w - 1; x++) {
            const i = yw + x;
            const m = mag[i];

            let a;
            let b;

            switch (dir[i]) {
                case 0:
                    a = mag[i - 1];
                    b = mag[i + 1];
                    break;

                case 1:
                    a = mag[i - w + 1];
                    b = mag[i + w - 1];
                    break;

                case 2:
                    a = mag[i - w];
                    b = mag[i + w];
                    break;

                default:
                    a = mag[i - w - 1];
                    b = mag[i + w + 1];
                    break;
            }

            if (m >= a && m >= b) {
                const v = m * value;
                arr[i] = v > 255 ? 255 : v | 0;
            } else {
                arr[i] = 0;
            }
        }
    }
}

//#region binaryContour
// diag [true, false]
export function binaryContour(arr, w, h, diag = false) {
    if (w < 3 || h < 3) return;

    const len = arr.length;
    const t = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        t[i] = arr[i] >= 128;
    }

    arr.fill(0);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = x + y * w;
            if (!t[i]) continue;

            let val = !t[i - 1] || !t[i + 1] || !t[i - w] || !t[i + w];
            if (diag) val ||= !t[i - w - 1] || !t[i - w + 1] || !t[i + w - 1] || !t[i + w + 1];
            if (val) arr[i] = 255;
        }
    }
}

//#region sobel
// edges [true, false]
// k = edges ? [-1.0.. 1.0] : [0.0.. 1.0]
export function sobel(arr, w, h, edges, k) {
    const t = Uint8Array.from(arr);
    const edge = new Uint8Array(arr.length);

    const kernel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const kernel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
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
            edge[x + y * w] = clamp255(v);
        }
    }

    for (let i = 0; i < arr.length; i++) {
        let v = 0;
        if (edges) v = arr[i] + edge[i] * k;
        else v = arr[i] * (1 - k) + edge[i] * k;
        arr[i] = Math.round(clamp255(v));
    }
}

//#region sobelEdges
// value [-1.0.. 1.0]
export function sobelEdges(arr, w, h, value) {
    sobel(arr, w, h, true, value);
}

//#region sobelContour
// value [0.0.. 1.0]
export function sobelContour(arr, w, h, value) {
    sobel(arr, w, h, false, value);
}

//#region thinZhangSuen
export function thinZhangSuen(arr, w, h) {
    if (w < 3 || h < 3) return;

    const len = arr.length;
    const remove = new Int32Array(len);
    let changed = true;

    // to bin
    for (let i = 0; i < len; i++) {
        arr[i] = arr[i] < 128 ? 0 : 1;
    }

    // clear frame
    for (let x = 0; x < w; x++) {
        arr[x] = 0;
        arr[(h - 1) * w + x] = 0;
    }
    for (let y = 0; y < h; y++) {
        arr[y * w] = 0;
        arr[y * w + w - 1] = 0;
    }

    while (changed) {
        changed = false;

        let removeCount = 0;

        // Step 1
        for (let y = 1; y < h - 1; y++) {
            const row = y * w;

            for (let x = 1; x < w - 1; x++) {
                const i = row + x;

                if (!arr[i]) continue;

                const p2 = arr[i - w];
                const p3 = arr[i - w + 1];
                const p4 = arr[i + 1];
                const p5 = arr[i + w + 1];
                const p6 = arr[i + w];
                const p7 = arr[i + w - 1];
                const p8 = arr[i - 1];
                const p9 = arr[i - w - 1];

                const n = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

                if (n < 2 || n > 6) continue;

                let s = 0;

                if (!p2 && p3) s++;
                if (!p3 && p4) s++;
                if (!p4 && p5) s++;
                if (!p5 && p6) s++;
                if (!p6 && p7) s++;
                if (!p7 && p8) s++;
                if (!p8 && p9) s++;
                if (!p9 && p2) s++;

                if (s !== 1) continue;

                if (p2 * p4 * p6 == 0 && p4 * p6 * p8 == 0) {
                    remove[removeCount++] = i;
                }
            }
        }

        if (removeCount > 0) {
            changed = true;

            for (let i = 0; i < removeCount; i++) {
                arr[remove[i]] = 0;
            }
        }

        removeCount = 0;

        // Step 2
        for (let y = 1; y < h - 1; y++) {
            const row = y * w;

            for (let x = 1; x < w - 1; x++) {
                const i = row + x;

                if (!arr[i]) continue;

                const p2 = arr[i - w];
                const p3 = arr[i - w + 1];
                const p4 = arr[i + 1];
                const p5 = arr[i + w + 1];
                const p6 = arr[i + w];
                const p7 = arr[i + w - 1];
                const p8 = arr[i - 1];
                const p9 = arr[i - w - 1];

                const n = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;

                if (n < 2 || n > 6) continue;

                let s = 0;

                if (!p2 && p3) s++;
                if (!p3 && p4) s++;
                if (!p4 && p5) s++;
                if (!p5 && p6) s++;
                if (!p6 && p7) s++;
                if (!p7 && p8) s++;
                if (!p8 && p9) s++;
                if (!p9 && p2) s++;

                if (s !== 1) continue;

                if (p2 * p4 * p8 == 0 && p2 * p6 * p8 == 0) {
                    remove[removeCount++] = i;
                }
            }
        }

        if (removeCount > 0) {
            changed = true;

            for (let i = 0; i < removeCount; i++) {
                arr[remove[i]] = 0;
            }
        }
    }

    for (let i = 0; i < len; i++) {
        arr[i] = arr[i] ? 255 : 0;
    }
}