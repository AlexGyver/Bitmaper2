import { clipWrite, encodeText } from "@alexgyver/utils";
import ConverterBase from "./base";
import { printMono } from "./utils";

export default class ASCII extends ConverterBase {
    static name = 'ASCII';
    prefix = 'const char';
    ext = 'txt';

    pallette = [
        "Wwli:,. ",
        "@%#*+=-:. ",
        "@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|\()1{}[]?-_+~<>i!lI;:,\"^`'. ",
        "█▓▒░ "
    ];

    constructor() {
        super();
        this.ui
            .addSelect('res', 'Resolution', ['8 char', '10 char', '70 char', '5 gray'])
            .addSwitch('half', 'Half', true)
            .addButton('copy', 'Copy text', () => clipWrite(this.getText()))
    }

    show() {
        printMono(this.cv, this.cx, this.getText());
    }

    getText() {
        let img = this.getImg();
        let pallette = this.pallette[this.ui.res];
        let len = pallette.length;
        let half = this.ui.half;
        let res = "";

        for (let y = 0; y < img.H; y++) {
            for (let x = 0; x < img.W; x++) {
                let pix = img.get(x, y);
                if (half && y < img.H - 1) {
                    pix = (pix + img.get(x, y + 1)) / 2;
                }
                res += pallette[((255 - pix) * (len - 1) / 255) << 0];
            }
            if (half) y++;
            if (y < img.H - 1) res += '\n';
        }
        return res;
    }

    async encode() {
        return encodeText(this.getText());
    }
}

/*
if (conv.plainText) {
    if (Array.isArray(res)) res = res[0];   // todo
    let w = conv.img.W;
    let lines = decodeText(res).split("\n");
    let h = lines.length;
    let code = header(`${res.byteLength} bytes`, w, h);
    code += `${conv.prefix} ${name}[] ${pgm}=\n`;
    code += lines.map(line => `\t"${line.replace(/"/g, '\\"')}\\n"`).join("\n");
    code = code.slice(0, -3);
    code += '";';
    return code;
}
*/