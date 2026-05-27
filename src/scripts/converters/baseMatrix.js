import { HEXtoRGB } from "@alexgyver/utils";
import { colors, ui_in } from "../ui";
import ConverterBase from "./base";
import { getWH16_LSB } from "./utils";

export default class BaseMatrix extends ConverterBase {
    show() {
        this.log('');

        let img = this.getImg();
        let grid = Math.ceil(this.cv.clientWidth / img.W);

        if (grid > 1) {
            let w = this.cv.width = grid * img.W;
            let h = this.cv.height = grid * img.H;

            const cx = this.cx;
            cx.fillStyle = colors.off;
            cx.fillRect(0, 0, w, h);

            for (let i = 0, x = 0, y = 0; i < img.buf.length; i++) {
                let v = img.buf[i];
                v = this.showColor(v);
                if (v) {
                    cx.fillStyle = v;
                    cx.fillRect(x * grid, y * grid, grid, grid);
                }
                if (++x == img.W) {
                    x = 0;
                    ++y;
                }
            }

            if (ui_in.proc_grid) {
                cx.strokeStyle = colors.off;
                cx.lineWidth = grid * ui_in.proc_grid;
                cx.beginPath();

                for (let x = 1; x <= img.W - 1; x++) {
                    cx.moveTo(x * grid, 0);
                    cx.lineTo(x * grid, img.H * grid);
                }
                for (let y = 1; y <= img.H - 1; y++) {
                    cx.moveTo(0, y * grid);
                    cx.lineTo(img.W * grid, y * grid);
                }

                cx.stroke();
            }
        } else {
            this.cv.width = img.W;
            this.cv.height = img.H;

            this.cx.fillStyle = colors.off;
            this.cx.fillRect(0, 0, img.W, img.H);

            let idata = this.cx.getImageData(0, 0, img.W, img.H);
            let data = idata.data;
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                let col = this.showColor(img.buf[j]);
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
    }

    getMeta() {
        return new Uint8Array(getWH16_LSB(this.img.W, this.img.H));
    }

    // цвет пикселя на preview
    showColor(v) {
        return v ? (colors.on + v.toString(16).padStart(2, 0)) : 0;
    }
}