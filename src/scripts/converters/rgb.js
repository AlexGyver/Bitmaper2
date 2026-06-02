import { colorToArray } from "@alexgyver/utils";
import BaseMatrix from "./baseMatrix";

export class RGB24 extends BaseMatrix {
    static name = 'RGB24';
    prefix = 'const uint32_t';
    ext = 'rgb24';

    constructor() {
        super('rgb');
    }

    encode() {
        return this.buf;
    }
}

export class RGB888 extends RGB24 {
    static name = 'RGB888';
    ext = 'rgb888';

    encode() {
        const res = new Uint8Array(this.buf.length * 3);

        for (let i = 0, p = 0; i < this.buf.length; i++) {
            const c = this.buf[i];
            res[p++] = (c >> 16) & 0xff;
            res[p++] = (c >> 8) & 0xff;
            res[p++] = c & 0xff;
        }

        return res;
    }
}

export class RGB565 extends BaseMatrix {
    static name = 'RGB565';
    prefix = 'const uint16_t';
    ext = 'rgb565';

    constructor() {
        super('rgb');
    }

    getBuf() {
        const buf = new Uint32Array(this.buf);

        for (let i = 0; i < buf.length; i++) {
            const c = buf[i];

            let r = (c >> 19) & 0x1f;
            let g = (c >> 10) & 0x3f;
            let b = (c >> 3) & 0x1f;

            r = (r << 3) | (r >> 2);
            g = (g << 2) | (g >> 4);
            b = (b << 3) | (b >> 2);

            buf[i] = (r << 16) | (g << 8) | b;
        }

        return buf;
    }

    encode() {
        const res = new Uint16Array(this.buf.length);

        for (let i = 0; i < this.buf.length; i++) {
            const c = this.buf[i];
            const r = (c >> 19) & 0x1f;
            const g = (c >> 10) & 0x3f;
            const b = (c >> 3) & 0x1f;
            res[i] = (r << 11) | (g << 5) | b;
        }

        return res;
    }
}

export class RGB233 extends BaseMatrix {
    static name = 'RGB233';
    ext = 'rgb233';

    constructor() {
        super('rgb');
    }

    getBuf() {
        const buf = new Uint32Array(this.buf);

        for (let i = 0; i < buf.length; i++) {
            const c = buf[i];

            let r = (c >> 22) & 0x03;
            let g = (c >> 13) & 0x07;
            let b = (c >> 5) & 0x07;

            r = (r << 6) | (r << 4) | (r << 2) | r;
            g = (g << 5) | (g << 2) | (g >> 1);
            b = (b << 5) | (b << 2) | (b >> 1);

            buf[i] = (r << 16) | (g << 8) | b;
        }

        return buf;
    }

    encode() {
        const res = new Uint8Array(this.buf.length);

        for (let i = 0; i < this.buf.length; i++) {
            const c = this.buf[i];
            const r = (c >> 22) & 0x03;
            const g = (c >> 13) & 0x07;
            const b = (c >> 5) & 0x07;
            res[i] = (r << 6) | (g << 3) | b;
        }

        return res;
    }
}