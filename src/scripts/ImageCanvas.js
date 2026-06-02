import DragBlock from "@alexgyver/drag-block";
import { radians } from "@alexgyver/utils";
import { rgbToGray } from "./filters/simple";
import { WorkerModule, WorkerRunner } from "./pipeline/runner";

export default class ImageCanvas {
    constructor(cv, onpan) {
        this.onpan = onpan;
        this.scale = 1;

        this.rgbRunner = new WorkerRunner(new Worker(new URL('./pipeline/rgbFilterPipe.js', import.meta.url), { type: 'module' }));
        this.grayRunner = new WorkerRunner(new Worker(new URL('./pipeline/grayFilterPipe.js', import.meta.url), { type: 'module' }));

        this.cv = cv;
        this.cx = this.cv.getContext("2d", { willReadFrequently: true });

        this.offcv = document.createElement('canvas');
        this.offcx = this.offcv.getContext("2d", { willReadFrequently: true });

        new DragBlock(cv, e => {
            if (!this.image) return;
            let r = this.cv.width / this.cv.clientWidth;

            switch (e.type) {
                case 'zoom':
                    /// center cursor
                    // {
                    //     const oldW = this.offset.w;
                    //     let newW = oldW + (e.touch ? e.zoom : oldW * 0.1 * Math.sign(e.zoom) * this.scale);

                    //     if (newW < 0) newW = 0;
                    //     if (oldW <= 0) {
                    //         this.offset.w = newW;
                    //         this.onpan();
                    //         break;
                    //     }

                    //     const k = newW / oldW;
                    //     const rx = this.cv.width / this.cv.clientWidth;
                    //     const ry = this.cv.height / this.cv.clientHeight;
                    //     const mx = e.pos.x * rx;
                    //     const my = e.pos.y * ry;
                    //     const cx = this.cv.width / 2;
                    //     const cy = this.cv.height / 2;
                    //     this.offset.x = this.offset.x * k + (k - 1) * (mx - cx);
                    //     this.offset.y = this.offset.y * k + (k - 1) * (my - cy);
                    //     this.offset.w = newW;
                    //     this.onpan();
                    //     break;
                    // }

                    /// center canvas
                    {
                        const oldW = this.offset.w;

                        this.offset.w += e.touch
                            ? e.zoom
                            : (this.offset.w * 0.1 * Math.sign(e.zoom) * this.scale);

                        if (this.offset.w < 0) this.offset.w = 0;
                        const k = this.offset.w / oldW;
                        this.offset.x *= k;
                        this.offset.y *= k;
                        this.onpan();
                    } break;

                /// center image
                // this.offset.w += e.touch ? e.zoom : (this.offset.w * 0.1 * Math.sign(e.zoom) * this.scale);
                // if (this.offset.w < 0) this.offset.w = 0;
                // this.onpan();
                // break;

                case 'drag':
                case 'tdrag':
                    this.offset.x -= e.move.x * r;
                    this.offset.y -= e.move.y * r;
                    this.onpan();
                    break;
            }
        });
    }

    setZoomScale(scale) {
        this.scale = scale;
    }

    setImage(image, reset) {
        this.image = image;
        if (reset) this.offset = null;
    }

    fit() {
        if (!this.image || !this.cv.width || !this.cv.height) return;

        this.offset = {
            x: 0,
            y: 0,
            w: this.image.width * Math.min(this.cv.width / this.image.width, this.cv.height / this.image.height),
        };
        this.onpan();
    }

    async preview(bblack, rotate, rgbfil, grayfil) {
        let w = this.cv.width;
        let h = this.cv.height;
        if (!this.image || !w || !h) return;

        if (!this.offset) this.fit();
        if (!this.offset) return;

        await this.rgbRunner.busy();
        await this.grayRunner.busy();

        this.offcv.width = w;
        this.offcv.height = h;
        let cx = this.offcx;
        cx.fillStyle = bblack ? 'black' : 'white';
        cx.fillRect(0, 0, w, h);

        cx.save();
        cx.translate(w / 2 - this.offset.x, h / 2 - this.offset.y);
        cx.rotate(radians(rotate));
        let s = this.offset.w / this.image.width;
        cx.scale(s, s);
        cx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
        cx.restore();

        let idata = cx.getImageData(0, 0, w, h);

        // rgb
        if (rgbfil && rgbfil.length) idata = await this.rgbRunner.run({
            idata,
            filters: rgbfil,
        });

        // gray
        if (grayfil) {
            let data = idata.data;
            let gray = new Uint8Array(w * h);

            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                gray[j] = rgbToGray(data[i + 0], data[i + 1], data[i + 2]);
            }

            if (grayfil.length) gray = await this.grayRunner.run({
                arr: gray,
                w: idata.width,
                h: idata.height,
                filters: grayfil,
            });

            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (!data[i + 3]) continue;
                data[i + 0] = data[i + 1] = data[i + 2] = gray[j];
            }
        }

        // end
        this.cv.getContext("2d").putImageData(idata, 0, 0);
        return idata;
    }
}