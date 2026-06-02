import BaseMatrix from "./baseMatrix";

export default class Gray extends BaseMatrix {
    static name = 'Grayscale';
    ext = 'gray';

    constructor() {
        super('gray');
    }

    encode() {
        return this.buf;
    }
}