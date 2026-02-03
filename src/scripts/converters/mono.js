import { colors } from "../ui";
import ConverterBase from "./base";
import { threshold } from "./filters";

class Mono extends ConverterBase {
    gray = true;

    constructor() {
        super();
        this.ui.addSlider('thresh', 'Threshold', 128, 0, 256, 1, () => this.show())
    }

    filter(img) {
        threshold(img.buf, this.ui.thresh);
        return img;
    }

    click(x, y) {
        if (this.cv.clientWidth / this.img.W < 2) return;
        x = Math.floor(x * this.img.W);
        y = Math.floor(y * this.img.H);
        this.img.set(x, y, 255 - this.img.get(x, y));
        this.show();
    }

    _decodeColor(v) {
        return v ? colors.on : 0;
    }
}

export class Mono1 extends Mono {
    static name = '1 pix/byte';
    ext = '1p';

    async encode() {
        return Uint8Array.from(this.img.buf.map(x => x ? 1 : 0));
    }
}

export class Mono8HLSB extends Mono {
    static name = '8x Horizontal';
    ext = '8h';

    async encode() {
        let m = this.img;
        let data = [];
        let chunk = Math.ceil(m.W / 8);

        for (let y = 0; y < m.H; y++) {
            for (let xx = 0; xx < chunk; xx++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;

                    let x = xx * 8 + b;
                    if (x < m.W && m.get(x, y)) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class Mono8HMSB extends Mono {
    static name = '8x Horizontal MSB';
    ext = '8h';

    async encode() {
        let m = this.img;
        let data = [];
        let chunk = Math.ceil(m.W / 8);

        for (let y = 0; y < m.H; y++) {
            for (let xx = 0; xx < chunk; xx++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte <<= 1;

                    let x = xx * 8 + b;
                    if (x < m.W && m.get(x, y)) {
                        byte |= 1;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class Mono8Vcol extends Mono {
    static name = '8x Vertical Col';
    ext = '8vc';

    async encode() {
        return Uint8Array.from(Mono8Vcol.make(this.img));
    }

    static make(m) {
        let data = [];
        let chunk = Math.ceil(m.H / 8);
        for (let x = 0; x < m.W; x++) {
            for (let yy = 0; yy < chunk; yy++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;
                    let y = yy * 8 + b;
                    if (y < m.H && m.get(x, y)) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return data;
    }
}

export class Mono8Vrow extends Mono {
    static name = '8x Vertical Row';
    ext = '8vr';

    async encode() {
        let m = this.img;
        let data = [];
        let chunk = Math.ceil(m.H / 8);
        for (let yy = 0; yy < chunk; yy++) {
            for (let x = 0; x < m.W; x++) {
                let byte = 0;
                for (let b = 0; b < 8; b++) {
                    byte >>= 1;
                    let y = yy * 8 + b;
                    if (y < m.H && m.get(x, y)) {
                        byte |= 1 << 7;
                    }
                }
                data.push(byte);
            }
        }
        return Uint8Array.from(data);
    }
}

export class MonoGImg extends Mono {
    static name = 'GyverGFX Image';
    ext = 'img';
    prefix = 'gfximage_t';

    async encode() {
        let m = this.img;
        let mapsize = Math.ceil(m.H / 8) * m.W + 4;
        let pack = MonoGPack.make(m);
        return Uint8Array.from((mapsize <= pack.length) ? [0].concat(MonoGMap.make(m)) : [1].concat(pack));
    }
}

export class MonoGMap extends Mono {
    static name = 'GyverGFX BitMap';
    ext = 'map';
    prefix = 'gfxmap_t';

    async encode() {
        return Uint8Array.from(MonoGMap.make(this.img));
    }

    static make(m) {
        return [(m.W & 0xff), ((m.W >> 8) & 0xff), (m.H & 0xff), ((m.H >> 8) & 0xff)].concat(Mono8Vcol.make(m));
    }
}

export class MonoGPack extends Mono {
    static name = 'GyverGFX BitPack';
    ext = 'pack';
    prefix = 'gfxpack_t';

    async encode() {
        return Uint8Array.from(MonoGPack.make(this.img));
    }

    static make(m) {
        let data = [(m.W & 0xff), (m.W >> 8) & 0xff, (m.H & 0xff), (m.H >> 8) & 0xff];
        let i = 0, value = 0, shift = 0;

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

        for (let x = 0; x < m.W; x++) {
            for (let y = 0; y < m.H; y++) {
                let v = m.get(x, y) ? 1 : 0;
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