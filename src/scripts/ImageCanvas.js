import Matrix from "./Matrix";
import DragBlock from "@alexgyver/drag-block";
import { colorToInt, HEXtoRGB, radians } from "@alexgyver/utils";
import { ditherBayer, ditherFloyd, ditherJJN, ditherRiemersma, edges_median, edges_simple, edges_sobel, grayscale, invert, threshold } from "./converters/filters";

export default class ImageCanvas {
    constructor(cv, onpan) {
        this.onpan = onpan;

        /**@type {HTMLCanvasElement} */
        this.cv = cv;

        /**@type {CanvasRenderingContext2D} */
        this.cx = this.cv.getContext("2d", { willReadFrequently: true });

        new DragBlock(cv, e => {
            if (!this.img) return;
            let r = this.cv.width / this.cv.clientWidth;

            switch (e.type) {
                case 'zoom':
                    this.offset.w += e.touch ? e.zoom : (this.offset.w / 10 * Math.sign(e.zoom));
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
        cx.fillStyle = this.fil.bblack ? 'black' : 'white';
        cx.fillRect(0, 0, this.cv.width, this.cv.height);

        if (!this.img) return;
        if (!this.offset) this.fit();

        cx.save();
        cx.translate(this.cv.width / 2 - this.offset.x, this.cv.height / 2 - this.offset.y);
        cx.rotate(-radians(this.fil.angle));
        let s = this.offset.w / this.img.width;
        cx.scale(s, s);
        this.cx.filter = `brightness(${fil.brightness ?? 0}%) contrast(${fil.contrast ?? 0}%) saturate(${fil.saturate ?? 0}%) blur(${(fil.blur ?? 0) * Math.sqrt(this.cv.width ** 2 + this.cv.height ** 2) / 64}px)`;
        cx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
        cx.restore();

        let idata = cx.getImageData(0, 0, this.cv.width, this.cv.height);
        let data = idata.data;

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
            gray.resize(this.cv.width, this.cv.height);
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (data[i + 3]) {
                    gray.buf[j] = grayscale(data[i + 0], data[i + 1], data[i + 2]);
                }
            }

            if (fil.edges) edges_simple(gray.buf, gray.W, gray.H);
            if (fil.sobel) edges_sobel(gray.buf, gray.W, gray.H, fil.sobel);
            switch (fil.dither) {
                case 1: ditherFloyd(gray.buf, gray.W, gray.H); break;
                case 2: ditherJJN(gray.buf, gray.W, gray.H); break;
                case 3: ditherBayer(gray.buf, gray.W, gray.H); break;
                case 4: ditherRiemersma(gray.buf, gray.W, gray.H); break;
            }
            if (fil.thresh) threshold(gray.buf, fil.thresh);
            if (fil.median) edges_median(gray.buf, gray.W, gray.H);
            if (fil.invert) invert(gray.buf);

            // write
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                if (data[i + 3]) {
                    data[i + 0] = data[i + 1] = data[i + 2] = gray.buf[j];
                }
            }
        }

        // end
        cx.putImageData(idata, 0, 0);
    }

    getData() {
        let w = this.cv.width, h = this.cv.height;
        if (!w || !h) return null;
        return this.cx.getImageData(0, 0, w, h).data;
    }
}