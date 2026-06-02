import { scribble } from "../tracers/scribble";
import BaseTrace from "./baseTrace";

export class TraceScribble extends BaseTrace {
    static name = 'Trace Scribble';

    constructor() {
        super('gray');
    }

    getPath() {
        let res = scribble(this.buf, this.W, this.H);
        return res;
    }
}