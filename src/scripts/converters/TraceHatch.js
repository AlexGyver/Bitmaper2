import BaseTrace from "./baseTrace";
import { hatchArc, hatchParallel, hatchRadial } from "../tracers/hatch";
import { contour } from "../tracers/contour";
import { invert } from "../filters/simple";
import { stitchHatches } from "../tracers/stitcher";

export class TraceHatch extends BaseTrace {
    static name = 'Trace Hatch';

    constructor() {
        super('gray');
    }

    getPath() {
        // res = res.concat(contour(i.buf, i.W, i.H));
        let buf = new Uint8Array(this.buf);
        invert(buf, this.W, this.H);
        const spacing = 3;
        let res = hatchParallel(buf, this.W, this.H, { spacing, angle: 45 });
        res = stitchHatches(res, { spacing });
        return res;
    }
}