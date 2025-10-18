import ConverterBase from "./base";

export class Test extends ConverterBase {
    static name = 'Test';

    show() { }

    async encode() {
        console.log(this.cv);
        this.cv.width = this.cv.clientWidth;
        this.cv.height = this.cv.clientHeight;
        return new Uint8Array();
    }
}