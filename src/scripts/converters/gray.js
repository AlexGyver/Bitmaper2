import ConverterBase from "./base";

export default class Gray extends ConverterBase {
    static name = 'Grayscale';
    ext = 'gray';
    gray = true;

    async encode() {
        let img = this.getImg();
        return Uint8Array.from(img.buf);
    }
}