import { skeleton } from "../tracers/skeleton";
import BaseTrace from "./baseTrace";

export class TraceSkeleton extends BaseTrace {
    static name = 'Trace Skeleton';

    constructor() {
        super('mono');
        // this.ui.addSwitch('skipCorners', 'Skip corners', false)
    }

    getPath() {
        return skeleton(this.buf, this.W, this.H, this.ui.toObject());
    }
}