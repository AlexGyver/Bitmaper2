import { lerp } from "./math";

export default class GrayMatrix {
    constructor(buf, w, h) {
        this.w = w;
        this.h = h;
        this.buf = new Uint8Array(buf);
    }

    copy() {
        return new GrayMatrix(this.buf, this.w, this.h);
    }

    get length() {
        return this.buf.length;
    }

    index(x, y) {
        return y * this.w + x;
    }

    inside(x, y) {
        return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }

    get(x, y) {
        return this.inside(x, y) ? this.buf[this.index(x, y)] : 0;
    }

    set(x, y, value) {
        if (!this.inside(x, y)) return false;

        this.buf[this.index(x, y)] = clamp255(value);
        return true;
    }

    add(x, y, value) {
        if (!this.inside(x, y)) return false;

        const i = this.index(x, y);
        this.buf[i] = clamp255(this.buf[i] + value);
        return true;
    }

    fill(value) {
        this.buf.fill(clamp255(value));
    }

    line(x1, y1, x2, y2, valueOrFn) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;

        let err = dx - dy;
        let changed = 0;

        while (true) {
            if (this.inside(x1, y1)) {
                this.applyPixel(x1, y1, valueOrFn, 1);
                changed++;
            }

            if (x1 === x2 && y1 === y2) {
                break;
            }

            const e2 = err * 2;

            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
            }

            if (e2 < dx) {
                err += dx;
                y1 += sy;
            }
        }

        return changed;
    }

    thickLine(x1, y1, x2, y2, width = 1, valueOrFn = 255) {
        width = Number(width);

        if (!Number.isFinite(width) || width <= 0) {
            return 0;
        }

        const r = width * 0.5;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;

        if (len2 === 0) {
            if (!this.inside(x1, y1)) return 0;
            this.applyPixel(x1, y1, valueOrFn, 1);
            return 1;
        }

        const pad = Math.ceil(r + 1);
        const minX = Math.floor(Math.min(x1, x2) - pad);
        const minY = Math.floor(Math.min(y1, y2) - pad);
        const maxX = Math.ceil(Math.max(x1, x2) + pad);
        const maxY = Math.ceil(Math.max(y1, y2) + pad);

        let changed = 0;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!this.inside(x, y)) {
                    continue;
                }

                const px = x + 0.5;
                const py = y + 0.5;

                let t = ((px - x1) * dx + (py - y1) * dy) / len2;
                t = t < 0 ? 0 : t > 1 ? 1 : t;

                const cx = x1 + dx * t;
                const cy = y1 + dy * t;
                const ddx = px - cx;
                const ddy = py - cy;
                const d = Math.sqrt(ddx * ddx + ddy * ddy);
                const alpha = clamp01(r + 0.5 - d);

                if (alpha <= 0) {
                    continue;
                }

                this.applyPixel(x, y, valueOrFn, alpha);
                changed++;
            }
        }

        return changed;
    }

    applyPixel(x, y, valueOrFn, alpha = 1) {
        const i = this.index(x, y);
        const old = this.buf[i];

        const next = typeof valueOrFn === "function"
            ? valueOrFn(old, x, y, i, alpha)
            : lerp(old, valueOrFn, alpha);

        this.buf[i] = clamp255(next);
    }
}

function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}