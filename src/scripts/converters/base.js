import { HEXtoRGB } from "@alexgyver/utils";
import Matrix from "../Matrix";
import { app } from "../app";
import { colors, ui_conv, ui_out } from "../ui";
import { grayscale } from "./filters";

export default class ConverterBase {
    prefix = 'const uint8_t';
    ext = 'bin';
    plainText = false;

    cv = app.$cvres;
    cx = app.$cvres.getContext("2d", { willReadFrequently: true });
    ui = ui_conv;
    img = new Matrix();

    click() { }

    convert(data, w, h) {
        this.img.resize(w, h);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            if (data[i + 3]) {
                this.img.buf[j] = this._encodeColor(data[i], data[i + 1], data[i + 2]);
            }
        }
        this.show();
    }

    show() {
        let img = this.filter ? this.filter(this.img.copy()) : this.img;
        let grid = Math.ceil(this.cv.clientWidth / img.W);

        if (grid > 1) {
            let w = this.cv.width = grid * img.W;
            let h = this.cv.height = grid * img.H;

            this.cx.fillStyle = colors.off;
            this.cx.fillRect(0, 0, w, h);

            for (let i = 0, x = 0, y = 0; i < img.buf.length; i++) {
                let v = img.buf[i];
                v = this._decodeColor(v);
                if (v) {
                    this.cx.fillStyle = v;
                    this.cx.fillRect(x * grid, y * grid, grid, grid);
                }
                if (++x == img.W) {
                    x = 0;
                    ++y;
                }
            }
        } else {
            this.cv.width = img.W;
            this.cv.height = img.H;

            this.cx.fillStyle = colors.off;
            this.cx.fillRect(0, 0, img.W, img.H);

            let idata = this.cx.getImageData(0, 0, img.W, img.H);
            let data = idata.data;
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                let col = this._decodeColor(img.buf[j]);
                if (col) {
                    let rgb = HEXtoRGB(parseInt(col.slice(1, 7), 16));
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = (col.length > 7) ? parseInt(col.slice(7, 9), 16) : 255;
                }
            }
            this.cx.putImageData(idata, 0, 0);
        }
        ui_out.result = '';
    }

    _encodeColor(r, g, b) {
        return 255 - grayscale(r, g, b);
    }
    _decodeColor(v) {
        return v ? (colors.on + v.toString(16).padStart(2, 0)) : 0;
    }
}