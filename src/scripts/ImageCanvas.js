import Matrix from "./Matrix";
import DragBlock from "@alexgyver/drag-block";
import { colorToInt, HEXtoRGB, radians } from "@alexgyver/utils";
import { binaryContour, ditherBayer, ditherFloyd, ditherJJN, edgesMedian, edgesSimple, edgesSobel, grayscale, invert, posterize, posterizeIData, stipple, threshold } from "./converters/filters";

export default class ImageCanvas {
    constructor(cv, onpan) {
        this.onpan = onpan;
        this.scale = 1;

        /**@type {HTMLCanvasElement} */
        this.cv = cv;

        /**@type {CanvasRenderingContext2D} */
        this.cx = this.cv.getContext("2d", { willReadFrequently: true });

        new DragBlock(cv, e => {
            if (!this.img) return;
            let r = this.cv.width / this.cv.clientWidth;

            switch (e.type) {
                case 'zoom':
                    this.offset.w += e.touch ? e.zoom : (this.offset.w * 0.1 * Math.sign(e.zoom) * this.scale);
                    if (this.offset.w < 0) this.offset.w = 0;
                    this.show();
                    this.onpan();
                    break;

                case 'drag':
                case 'tdrag':
                    this.offset.x -= e.move.x * r;
                    this.offset.y -= e.move.y * r;
                    this.show();
                    this.onpan();
                    break;
            }
        });
    }

    setZoomScale(scale) {
        this.scale = scale;
    }

    setImage(img, reset) {
        this.img = img;
        if (reset) this.offset = null;
    }

    fit() {
        if (!this.img) return;
        this.offset = {
            x: 0,
            y: 0,
            w: this.img.width * Math.min(this.cv.width / this.img.width, this.cv.height / this.img.height),
        };
        this.onpan();
    }

    setFilter(fil) {
        this.fil = fil;
    }

    show() {
        let fil = this.fil;
        let cx = this.cx;
        let w = this.cv.width;
        let h = this.cv.height;
        cx.fillStyle = this.fil.bblack ? 'black' : 'white';
        cx.fillRect(0, 0, w, h);

        if (!this.img || !w || !h) return;
        if (!this.offset) this.fit();

        cx.save();
        cx.translate(w / 2 - this.offset.x, h / 2 - this.offset.y);
        cx.rotate(-radians(this.fil.angle));
        let s = this.offset.w / this.img.width;
        cx.scale(s, s);
        this.cx.filter = `brightness(${fil.brightness ?? 0}%) contrast(${fil.contrast ?? 0}%) saturate(${fil.saturate ?? 0}%) blur(${(fil.blur ?? 0) * Math.sqrt(w ** 2 + h ** 2) / 64}px)`;
        cx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
        cx.restore();

        // data
        let idata = cx.getImageData(0, 0, w, h);
        let data = idata.data;

        if (fil.mirror_x || fil.mirror_y) {
            const src = new Uint8ClampedArray(data);
            const mx = fil.mirror_x;
            const my = fil.mirror_y;

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const sx = mx ? w - 1 - x : x;
                    const sy = my ? h - 1 - y : y;

                    const dstIdx = (y * w + x) * 4;
                    const srcIdx = (sy * w + sx) * 4;

                    data[dstIdx] = src[srcIdx];
                    data[dstIdx + 1] = src[srcIdx + 1];
                    data[dstIdx + 2] = src[srcIdx + 2];
                    data[dstIdx + 3] = src[srcIdx + 3];
                }
            }
        }

        if (fil.posterizeRGB) posterizeIData(data, w, h, fil.posterizeRGB);

        // mask
        if (fil.mask) {
            let tol = fil.mask_tol;
            let ampli = fil.mask_amp;
            let rgb = HEXtoRGB(colorToInt(fil.mask_color));

            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (data[i + 3]) {
                    let d = Math.sqrt(
                        (data[i + 0] - rgb[0]) ** 2 +
                        (data[i + 1] - rgb[1]) ** 2 +
                        (data[i + 2] - rgb[2]) ** 2
                    );
                    if (d < tol) {
                        // data[i + 0] = rgb[0];
                        // data[i + 1] = rgb[1];
                        // data[i + 2] = rgb[2];
                        // data[i + 0] = data[i + 1] = data[i + 2] = 255 - d / ampli;
                        data[i + 0] = data[i + 1] = data[i + 2] = d / ampli;
                    } else {
                        // data[i + 3] = 0;
                        // data[i + 0] = data[i + 1] = data[i + 2] = 0;
                        data[i + 0] = data[i + 1] = data[i + 2] = 255;
                    }
                }
            }
        }

        // gray filters
        if (fil.gray) {
            // read
            let gray = new Matrix();
            gray.resize(w, h);
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (!data[i + 3]) continue;
                gray.buf[j] = grayscale(data[i + 0], data[i + 1], data[i + 2]);
            }

            // filter
            if (fil.sharpen) edgesSimple(gray.buf, gray.W, gray.H);
            if (fil.sobel) edgesSobel(gray.buf, gray.W, gray.H, fil.sobel);
            if (fil.posterize) posterize(gray.buf, gray.W, gray.H, fil.posterize);
            switch (fil.dither) {
                case 1: ditherFloyd(gray.buf, gray.W, gray.H); break;
                case 2: ditherJJN(gray.buf, gray.W, gray.H); break;
                case 3: ditherBayer(gray.buf, gray.W, gray.H); break;
            }
            if (fil.thresh) threshold(gray.buf, fil.thresh);
            // if (fil.median) edgesMedian(gray.buf, gray.W, gray.H);
            if (fil.contour) binaryContour(gray.buf, gray.W, gray.H, fil.contour == 2);
            if (fil.invert) invert(gray.buf);

            // write
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (!data[i + 3]) continue;
                data[i + 0] = data[i + 1] = data[i + 2] = gray.buf[j];
            }
        }

        // end
        cx.putImageData(idata, 0, 0);
    }

    getData() {
        let w = this.cv.width;
        let h = this.cv.height;
        if (!w || !h) return null;
        return this.cx.getImageData(0, 0, w, h).data;
    }
}