import { app } from "../app";
import { rgbToGray } from "../filters/simple";
import { ui_conv, ui_out, ui_sel } from "../ui";

export default class ConverterBase {
    prefix = 'const uint8_t';
    ext = 'bin';

    // rgb  = Uint32Array обычный RGB (0 black, 255 white)
    // gray = Uint8Array обычная яркость (0 black, 255 white)
    // mono = Uint8Array обычная яркость (0 black, 255 white)
    buf = new Uint8Array();

    W = 0;
    H = 0;
    ui = ui_conv;
    cv = app.$cvres;
    cx = app.$cvres.getContext("2d", { willReadFrequently: true });

    activeBlack = false;

    constructor(mode = 'mono') {
        this.mode = mode;
        this.ui.onChange(() => ui_sel.autoShow && this.show());
    }

    bufCopy() {
        return (this.mode == 'rgb') ? new Uint32Array(this.buf) : new Uint8Array(this.buf);
    }

    getPix(x, y) {
        return this.buf[y * this.W + x];
    }

    getPixSafe(x, y, fallback = 0) {
        if (x < 0 || y < 0 || x >= this.W || y >= this.H) {
            return fallback;
        }

        return this.getPix(x, y);
    }

    setData(idata) {
        if (!idata) return;

        this.W = idata.width;
        this.H = idata.height;
        const data = idata.data;
        const encode = encoders[this.mode];
        const len = idata.width * idata.height;
        this.buf = (this.mode == 'rgb') ? new Uint32Array(len) : new Uint8Array(len);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            this.buf[j] = encode(data[i + 0], data[i + 1], data[i + 2]);
        }

        if (ui_sel.autoShow) this.show();
    }

    log(str) {
        ui_out.result = str;
    }

    // virtual
    show() { }                              // показать preview
    click() { }                             // обработка клика по preview
    encode() { return new Uint8Array(); }   // получить бинарные данные
    getMeta() { return new Uint8Array(); }  // uint8array для добавления в начало bin
    getBuf() { return this.buf; }           // получить буфер для для show
}

const encoders = {
    rgb: (r, g, b) => ((r << 16) | (g << 8) | b) >>> 0,
    gray: (r, g, b) => rgbToGray(r, g, b),
    mono: (r, g, b) => rgbToGray(r, g, b) < 128 ? 0 : 255,
};