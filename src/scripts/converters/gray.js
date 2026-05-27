import BaseMatrix from "./baseMatrix";

export default class Gray extends BaseMatrix {
    static name = 'Grayscale';
    ext = 'gray';

    async encode() {
        return Uint8Array.from(this.getImg().buf);
    }
}