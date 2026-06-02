import { intToColor } from "@alexgyver/utils";
import { RGB24 } from "./rgb";
import { ditherRgbAtkinson, ditherRgbBayer, ditherRgbBurkes, ditherRgbFS, ditherRgbJJN, ditherRgbSierra2, ditherRgbSierra3, ditherRgbSierraLite, ditherRgbStucki } from "../filters/ditherRgb";

const maxCols = 10;
const defPal = [
    0x000000,
    0xffffff,
    0xff0000,
    0x00ff00,
    0x0000ff,
];

export class DitherRGB extends RGB24 {
    static name = 'Dither RGB';
    ext = 'drgb';

    constructor() {
        super();
        this.ui
            .addSelect('dither', 'Dithering', ['Floyd-Steinberg', 'JJN', 'Bayer2', 'Bayer4', 'Bayer8', 'Stucki', 'Sierra2', 'Sierra3', 'SierraLite', 'Atkinson', 'Burkes'])
            .addSlider('colors', 'Colors', defPal.length, 2, maxCols, 1, () => this.updColors())

        for (let i = 0; i < maxCols; i++) {
            this.ui.addColor('col' + i, i, (i < defPal.length) ? intToColor(defPal[i]) : null);
        }
        this.updColors();
    }

    updColors() {
        let cols = this.ui.colors;
        for (let i = 0; i < maxCols; i++) {
            this.ui.widget('col' + i).display(i < cols);
        }
    }

    getPal() {
        let pal = [];
        let cols = this.ui.colors;
        for (let i = 0; i < cols; i++) {
            pal.push(this.ui.widget('col' + i).valueInt);
        }
        return pal;
    }

    getBuf() {
        const u32 = new Uint32Array(this.buf); // copy
        const u8 = new Uint8Array(u32.buffer, u32.byteOffset, u32.byteLength);
        const arg = [u8, this.W, this.H, this.getPal()];

        const dithers = {
            'Floyd-Steinberg': ditherRgbFS,
            'JJN': ditherRgbJJN,
            'Bayer2': (a, w, h, p) => ditherRgbBayer(a, w, h, p, 0, 1),
            'Bayer4': (a, w, h, p) => ditherRgbBayer(a, w, h, p, 1, 1),
            'Bayer8': (a, w, h, p) => ditherRgbBayer(a, w, h, p, 2, 1),
            'Stucki': ditherRgbStucki,
            'Sierra2': ditherRgbSierra2,
            'Sierra3': ditherRgbSierra3,
            'SierraLite': ditherRgbSierraLite,
            'Atkinson': ditherRgbAtkinson,
            'Burkes': ditherRgbBurkes,
        };

        dithers[this.ui.ditherText](...arg);
        return u32;
    }

    // todo encode
    // todo meta
}