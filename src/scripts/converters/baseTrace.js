import ConverterBase from "./base";
import { optiPath } from "../tracers/traceUtils";
import { colors } from "../ui";

export default class BaseTrace extends ConverterBase {
    points = [];

    constructor(mode) {
        super(mode);
        this.ui
            .addSlider('minPoints', 'Min points', 0, 0, 10, 1)
            .addSwitch('optiTravel', 'Optimize travel', true)
            .addSlider('close', 'Close segments', 0, 0, 100, 1)
            .addSlider('connect', 'Connect segments', 0, 0, 100, 1)
            .addSlider('split', 'Split segments', 0, 0, 100, 1)
            .addSlider('smoothFactor', 'Smooth factor', 0, 0, 0.5, 0.1)
            .addSlider('smoothAngle', 'Smooth angle', 135, 0, 180, 1)
            .addSlider('smoothRatio', 'Smooth Ratio', 0, 0, 0.5, 0.01)
            .addSlider('smoothIters', 'Smooth Iters', 1, 1, 10, 1)
            .addSlider('noiseAmpli', 'noiseAmpli', 0, 0, 5, 0.1)
            .addSlider('noiseScale', 'noiseScale', 0, 0, 0.5, 0.001)
            .addSlider('straightEpsilon', 'Skip straight', 0, 0, 10, 0.1)
            .addSlider('simplifyTol', 'Simplify', 0.0, 0, 2, 0.01)
            .addSlider('simplifyLen', 'Simplify length', 0.2, 0, 1, 0.01)
            .addSlider('round', 'Round coords', 0, 0, 1, 0.1)
            .addSwitch('showTravel', 'Show travel', false)
            .addSwitch('showLines', 'Show lines', true)
            .addSwitch('showPoints', 'Show points', false)
    }

    show() {
        let opts = this.ui.toObject();
        let maxDim = Math.max(this.W, this.H);
        opts.simplifyLen = this.ui.simplifyLen * maxDim;
        let path = this.getPath();
        this.points = optiPath(path, opts);
        this.log(this.points.reduce((sum, inn) => sum + inn.length, 0) + ' points in ' + this.points.length + ' segments');

        let cv = this.cv;
        let cx = this.cx;
        let rect = cv.getBoundingClientRect();
        let w = rect.width;
        let h = rect.height;

        cv.width = w;
        cv.height = h;
        cx.fillStyle = colors.off;
        cx.fillRect(0, 0, w, h);
        cx.lineCap = 'round';
        cx.lineJoin = 'round';
        cx.fillStyle = colors.on;
        cx.strokeStyle = colors.on;

        let k = w / this.W;
        let k2 = k / 2;
        let prev = [0, 0];
        let showTravel = this.ui.showTravel;
        let showPoints = this.ui.showPoints;
        let showLines = this.ui.showLines;

        const xy = p => [p[0] * k + k2, p[1] * k + k2];

        const travelWidth = k * 0.2;
        const mainWidth = k * 0.8;

        const pointSize = mainWidth * 1.5;
        const pointRadius = pointSize * 0.5;

        const weightToRadius = (weight, fallbackRadius = pointRadius) => {
            const value = Number.isFinite(+weight) ? +weight : 0;

            if (value <= 0) return fallbackRadius;

            const w = Math.max(0, Math.min(1, value));

            const radiusGamma = 1;

            const minRadius = pointRadius * 0.45;
            const maxRadius = pointRadius * 2;

            return minRadius + Math.pow(w, radiusGamma) * (maxRadius - minRadius);
        };

        this.points.forEach(p => {
            if (!p.length) return;

            if (showTravel) {
                cx.beginPath();
                cx.moveTo(...xy(prev));
                cx.lineTo(...xy(p[0]));
                cx.lineWidth = travelWidth;
                cx.stroke();
            }

            if (showLines) {
                cx.beginPath();
                cx.moveTo(...xy(p[0]));

                for (let i = 1; i < p.length; i++) {
                    cx.lineTo(...xy(p[i]));
                }

                cx.lineWidth = mainWidth;
                cx.stroke();
            }

            if (showPoints) {
                for (let i = 0; i < p.length; i++) {
                    const [x, y] = xy(p[i]);
                    const r = weightToRadius(p[i][2], pointRadius);

                    cx.beginPath();
                    cx.arc(x, y, r, 0, Math.PI * 2);
                    cx.fill();
                }
            }

            prev = p[p.length - 1];
        });
    }

    encode() {
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

    // todo meta

    getPath() { }
}