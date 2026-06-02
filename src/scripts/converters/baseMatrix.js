import ConverterBase from "./base";
import { colorToArray, intToColor } from "@alexgyver/utils";
import { colors, ui_in } from "../ui";
import { getWH16_LSB } from "./utils";

export default class BaseMatrix extends ConverterBase {
    constructor(mode = 'mono') {
        super(mode);
    }

    show() {
        this.log('');

        const W = this.W;
        const H = this.H;
        const ablk = this.activeBlack;
        let buf = this.getBuf();
        if (!W || !H || !buf.length) return;

        const decode = decoders[this.mode];
        const grid = Math.max(1, Math.ceil(this.cv.clientWidth / W));

        if (grid > 1) {
            let w = this.cv.width = grid * W;
            let h = this.cv.height = grid * H;

            const cx = this.cx;
            cx.fillStyle = colors.off;
            cx.fillRect(0, 0, w, h);

            for (let i = 0, x = 0, y = 0; i < buf.length; i++) {
                let v = decode(buf[i], ablk);
                if (v) {
                    cx.fillStyle = v;
                    cx.fillRect(x * grid, y * grid, grid, grid);
                }
                if (++x == W) {
                    x = 0;
                    ++y;
                }
            }

            if (ui_in.proc_grid) {
                cx.strokeStyle = colors.off;
                cx.lineWidth = grid * ui_in.proc_grid;
                cx.beginPath();

                for (let x = 1; x <= W - 1; x++) {
                    cx.moveTo(x * grid, 0);
                    cx.lineTo(x * grid, H * grid);
                }
                for (let y = 1; y <= H - 1; y++) {
                    cx.moveTo(0, y * grid);
                    cx.lineTo(W * grid, y * grid);
                }

                cx.stroke();
            }
        } else {
            this.cv.width = W;
            this.cv.height = H;

            this.cx.fillStyle = colors.off;
            this.cx.fillRect(0, 0, W, H);

            let idata = this.cx.getImageData(0, 0, W, H);
            let data = idata.data;
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                let col = decode(buf[j], ablk);
                if (col) {
                    let rgb = colorToArray(col);
                    data[i + 0] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = rgb[3];
                }
            }
            this.cx.putImageData(idata, 0, 0);
        }
    }

    getMeta() {
        return new Uint8Array(getWH16_LSB(this.W, this.H));
    }
}

const decoders = {
    rgb: (c) => intToColor(c),
    gray: (c, ablk) => { if (ablk) c = 255 - c; return c ? (colors.on + c.toString(16).padStart(2, '0')) : 0 },
    mono: (c, ablk) => (ablk ? 255 - c : c) ? colors.on : 0,
};