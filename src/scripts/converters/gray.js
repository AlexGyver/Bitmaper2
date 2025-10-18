import ConverterBase from "./base";

export default class Gray extends ConverterBase {
    static name = 'Grayscale';
    ext = 'gray';
    gray = true;

    async encode() {
        return Uint8Array.from(this.img.buf);
    }
}