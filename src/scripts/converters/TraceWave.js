import { invert } from "../filters/simple";
import { circularWave, horizontalWave, polygonWave } from "../tracers/wave";
import BaseTrace from "./baseTrace";

export class TraceWave extends BaseTrace {
    static name = 'Trace Wave';

    constructor() {
        super('gray');
    }

    getPath() {
        let buf = this.bufCopy();
        invert(buf);

        return horizontalWave(buf, this.W, this.H);
    }
}