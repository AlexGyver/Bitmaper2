import { trace } from "../tracers/stroke";
import { colors } from "../ui";
import BaseMatrix from "./baseMatrix";
import { threshold } from "./filters";

export class Trace extends BaseMatrix {
    static name = 'Trace Stroke (beta)';
    points = [];

    constructor() {
        super();
        this.ui
            .addSlider('thresh', 'Threshold', 128, 0, 256, 1)
            .addSlider('skipShort', 'Skip short', 0, 0, 10, 1)
            .addSwitch('skipCorners', 'Skip corners', false)
            .addSwitch('skipStraight', 'Skip straight', false)
            .addSlider('simplifyTol', 'Simplify', 0.0, 0, 2, 0.01)
            .addSlider('simplifyLen', 'Simplify length', 0.1, 0, 1, 0.01)
            .addSwitch('optiTravel', 'Optimize travel', false)
    }

    getImg() {
        let img = this.img.copy();
        threshold(img.buf, this.ui.thresh);
        return img;
    }

    show() {
        this.log('');

        let cv = this.cv;
        let cx = this.cx;

        let rect = cv.getBoundingClientRect();
        let w = rect.width;
        let h = rect.height;
        cv.width = w;
        cv.height = h;

        cx.fillStyle = colors.off;
        cx.fillRect(0, 0, w, h);

        let simplifyLen = Math.min(this.img.W, this.img.H) * this.ui.simplifyLen;
        this.points = trace(this.getImg(), { ...this.ui.toObject(), simplifyLen });
        if (!this.points.length) return;console.log(this.points)

        cx.lineCap = 'round';
        cx.lineJoin = 'round';
        cx.strokeStyle = colors.on;

        let k = w / this.img.W;
        let k2 = k / 2;
        let prev = [0, 0];

        const xy = p => ([p[0] * k + k2, p[1] * k + k2]);

        this.points.forEach(p => {
            if (!p.length) return;

            cx.beginPath();
            cx.moveTo(...xy(prev));
            cx.lineTo(...xy(p[0]));
            cx.lineWidth = k * 0.2;
            cx.stroke();

            cx.beginPath();
            cx.moveTo(...xy(p[0]));
            p.forEach(pp => cx.lineTo(...xy(pp)));
            cx.lineWidth = k * 0.8;
            cx.stroke();

            prev = p[p.length - 1];
        });

        this.log(this.points.reduce((sum, inn) => sum + inn.length, 0) + 'points');
    }

    async encode() {
        // todo
        // переделать формат с 16/16/8 на 8/8 dx dy (-127.. 127, а -128 это команда)
        // const bpp = 2 + 2 + 1;
        // const buffer = new ArrayBuffer(this.points.length * bpp);
        // const view = new DataView(buffer);

        // let offset = 0;

        // for (const [x, y, f] of this.points) {
        //     view.setUint16(offset, x, true); offset += 2;
        //     view.setUint16(offset, y, true); offset += 2;
        //     view.setUint8(offset, f ? 1 : 0); offset += 1;
        // }

        // return new Uint8Array(buffer);
        return new Uint8Array();
    }
}