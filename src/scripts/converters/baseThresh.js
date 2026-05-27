import ConverterBase from "./base";
import { threshold } from "./filters";

export default class BaseThresh extends ConverterBase {
    constructor() {
        super();
        this.ui.addSlider('thresh', 'Threshold', 128, 0, 256, 1)
    }

    getImg() {
        let img = this.img.copy();
        threshold(img.buf, this.ui.thresh);
        return img;
    }
}