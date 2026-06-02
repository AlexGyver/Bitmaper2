import BaseMatrix from "./baseMatrix";
import { getWH16_LSB } from "./utils";

class MonoBase extends BaseMatrix {
    constructor() {
        super('mono');
    }

    click(x, y) {
        if (this.cv.clientWidth / this.W < 2) return;
        x = Math.floor(x * this.W);
        y = Math.floor(y * this.H);
        let i = y * this.W + x;
        this.buf[i] = 255 - this.buf[i];
        this.show();
    }
}

export class Mono1p extends MonoBase {
    static name = '1 pix/byte';
    ext = '1p';

    encode() {
        return Uint8Array.from(this.buf.map(x => x ? 1 : 0));
    }
}

export class Mono8HLSB extends MonoBase {
    static name = '8x Horizontal';
    ext = '8h';

    encode() {
        let data = [];
        let chunk = Math.ceil(this.W / 8);

        for (let y = 0; y < this.H; y++) {
            for (let xx = 0; xx < chunk; xx++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;

                    let x = xx * 8 + b;
                    if (x < this.W && this.getPix(x, y)) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class Mono8HMSB extends MonoBase {
    static name = '8x Horizontal MSB';
    ext = '8hm';

    encode() {
        let data = [];
        let chunk = Math.ceil(this.W / 8);

        for (let y = 0; y < thisthis.H; y++) {
            for (let xx = 0; xx < chunk; xx++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte <<= 1;

                    let x = xx * 8 + b;
                    if (x < this.W && this.getPix(x, y)) {
                        byte |= 1;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class Mono8Vcol extends MonoBase {
    static name = '8x Vertical Col';
    ext = '8vc';

    encode() {
        return Uint8Array.from(Mono8Vcol.make(this.buf, this.w, this.h));
    }

    static make(buf, w, h) {
        let data = [];
        let chunk = Math.ceil(h / 8);
        for (let x = 0; x < w; x++) {
            for (let yy = 0; yy < chunk; yy++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;
                    let y = yy * 8 + b;
                    if (y < h && buf[y * w + h]) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return data;
    }
}

export class Mono8Vrow extends MonoBase {
    static name = '8x Vertical Row';
    ext = '8vr';

    encode() {
        let data = [];
        let chunk = Math.ceil(this.H / 8);
        for (let yy = 0; yy < chunk; yy++) {
            for (let x = 0; x < this.W; x++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;
                    let y = yy * 8 + b;
                    if (y < this.H && this.getPix(x, y)) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class MonoGImg extends MonoBase {
    static name = 'GyverGFX Image';
    ext = 'img';
    prefix = 'gfximage_t';

    encode() {
        let mapsize = Math.ceil(this.H / 8) * this.W + 4;
        let pack = MonoGPack.make(this.buf, this.w, this.h);
        return Uint8Array.from((mapsize <= pack.length) ? [0].concat(MonoGMap.make(this.buf, this.w, this.h)) : [1].concat(pack));
    }
}

export class MonoGMap extends MonoBase {
    static name = 'GyverGFX BitMap';
    ext = 'map';
    prefix = 'gfxmap_t';

    encode() {
        return Uint8Array.from(MonoGMap.make(this.buf, this.w, this.h));
    }

    static make(buf, w, h) {
        return getWH16_LSB(w, h).concat(Mono8Vcol.make(buf, w, h));
    }
}

export class MonoGPack extends MonoBase {
    static name = 'GyverGFX BitPack';
    ext = 'pack';
    prefix = 'gfxpack_t';

    encode() {
        return Uint8Array.from(MonoGPack.make(this.buf, this.w, this.h));
    }

    static make(buf, w, h) {
        let data = getWH16_LSB(w, h);
        let i = 0, value = 0, shift = 0;
        const get = (x, y) => buf[y * w + x];

        let push = () => {
            let chunk = (i << 1) | value;
            switch ((shift++) & 0b11) {
                case 0:
                    data.push(chunk << 2);
                    break;
                case 1:
                    data[data.length - 1] |= chunk >> 4;
                    data.push((chunk << 4) & 0b11110000);
                    break;
                case 2:
                    data[data.length - 1] |= chunk >> 2;
                    data.push((chunk << 6) & 0b11000000);
                    break;
                case 3:
                    data[data.length - 1] |= chunk;
                    break;
            }
        }

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                let v = get(x, y) ? 1 : 0;
                if (!i) {
                    i = 1;
                    value = v;
                } else {
                    if (value == v) {
                        i++;
                        if (i == 31) {
                            push();
                            i = 0;
                        }
                    } else {
                        push();
                        value = v;
                        i = 1;
                    }
                }
            }
        }
        if (i) push();

        return data;
    }
}