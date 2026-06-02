import { stroke } from "../tracers/stroke";
import BaseTrace from "./baseTrace";

export class TraceStroke extends BaseTrace {
    static name = 'Trace Stroke';

    constructor() {
        super('mono');
        this.ui.addSwitch('skipCorners', 'Skip corners', false)
    }

    getPath() {
        return stroke(this.buf, this.W, this.H, this.ui.toObject());
    }
}