import Matrix from "../Matrix";
import { app } from "../app";
import { ui_conv, ui_out, ui_sel } from "../ui";
import { grayscale } from "./filters";

export default class ConverterBase {
    prefix = 'const uint8_t';
    ext = 'bin';

    cv = app.$cvres;
    cx = app.$cvres.getContext("2d", { willReadFrequently: true });
    ui = ui_conv;
    img = new Matrix();

    constructor() {
        this.ui.onChange(() => ui_sel.auto_encode && this.show());
    }

    setData(data, w, h) {
        this.img.resize(w, h);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            if (data[i + 3]) {
                this.img.buf[j] = this.encodeColor(data[i + 0], data[i + 1], data[i + 2]);
            }
        }
        ui_sel.auto_encode && this.show();
    }

    log(str) {
        ui_out.result = str;
    }

    // virtual
    show() { }                              // показать preview
    click() { }                             // обработка клика по preview
    async encode() { }                      // получить бинарные данные
    getImg() { return this.img; }           // получить image Matrix
    getMeta() { return new Uint8Array(); }  // uint8array для добавления в начало bin
    encodeColor(r, g, b) { return 255 - grayscale(r, g, b); }      // результат запишется в this.img.buf (UInt32 array)
}