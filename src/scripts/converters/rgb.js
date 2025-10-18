import { HEXtoRGB, intToColor, rgbTo233, rgbTo565, rgbTo888 } from "@alexgyver/utils";
import ConverterBase from "./base";

export class RGB24 extends ConverterBase {
    static name = 'RGB24';
    prefix = 'const uint32_t';
    ext = 'rgb24';

    async encode() {
        return Uint32Array.from(this.img.buf);
    }

    _encodeColor(r, g, b) {
        return rgbTo888(r, g, b);
    }
    _decodeColor(v) {
        return intToColor(v);
    }
}

export class RGB888 extends RGB24 {
    static name = 'RGB888';
    ext = 'rgb888';

    async encode() {
        let res = [];
        this.img.buf.forEach(v => res.push(...HEXtoRGB(v)));
        return Uint8Array.from(res);
    }
}

export class RGB565 extends ConverterBase {
    static name = 'RGB565';
    prefix = 'const uint16_t';
    ext = 'rgb565';

    async encode() {
        return Uint16Array.from(this.img.buf);
    }

    _encodeColor(r, g, b) {
        return rgbTo565(r, g, b);
    }
    _decodeColor(v) {
        return intToColor(((v & 0b1111100000000000) << 8) | ((v & 0b11111100000) << 5) | ((v & 0b11111) << 3));
    }
}

export class RGB233 extends ConverterBase {
    static name = 'RGB233';
    ext = 'rgb233';

    async encode() {
        return Uint8Array.from(this.img.buf);
    }

    _encodeColor(r, g, b) {
        return rgbTo233(r, g, b);
    }
    _decodeColor(v) {
        return intToColor(((v & 0b11000000) << 16) | ((v & 0b111000) << 10) | ((v & 0b111) << 5));
    }
}