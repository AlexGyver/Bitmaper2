import { contour } from "../tracers/contour";
import BaseTrace from "./baseTrace";

export class TraceContour extends BaseTrace {
    static name = 'Trace Contour';

    constructor() {
        super('gray');
        this.ui
            .addSlider('threshold', 'Threshold', 128, 0, 255, 1)
            .addSwitch('round', 'Round', false)
    }

    getPath() {
        let res = contour(this.buf, this.W, this.H, this.ui.toObject());

        if (this.ui.round) {
            res = res.map(segment =>
                segment.map(([x, y]) => [Math.round(x), Math.round(y)])
            );
        }

        return res;
    }
}