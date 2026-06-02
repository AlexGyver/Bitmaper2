import BaseTrace from "./baseTrace";
import { connectTriangle, connectTSP, connectVoronoi } from "../tracers/connectors";
import { WPD } from "../stipple/WPD";
import { invert } from "../filters/simple";
import { lloydRelaxation } from "../stipple/lloydRelaxation";
import { voronoiRelaxation } from "../stipple/voronoiRelaxation";
import { WorkerRunner } from "../pipeline/runner";

export class TracePaths extends BaseTrace {
    static name = 'Trace Paths';

    constructor() {
        super('gray');
    }

    getPath() {
        let buf = this.bufCopy();
        invert(buf);

        let res = WPD(buf, this.W, this.H);
        res = lloydRelaxation(res, buf, this.W, this.H);
        res = voronoiRelaxation(res, buf, this.W, this.H);
        res = connectTSP(res);

        // res = res.map(p => [p[0], p[1], p[2] *= 3]);
        // return [res];
        // return connectVoronoi(res, { maxEdge: 50 });
        // return connectTriangle(res, { maxEdge: 50 });
        return res
    }
}