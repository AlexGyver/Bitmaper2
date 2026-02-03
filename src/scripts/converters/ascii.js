import { encodeText, roundInt } from "@alexgyver/utils";
import ConverterBase from "./base";
import { colors } from "../ui";

export default class ASCII extends ConverterBase {
    static name = 'ASCII';
    prefix = 'const char';
    ext = 'txt';
    gray = true;
    plainText = true;

    pallette = [
        "Wwli:,. ",
        "@%#*+=-:. ",
        "@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|\()1{}[]?-_+~<>i!lI;:,\"^`'. ",
        "█▓▒░ "
    ];

    constructor() {
        super();
        this.ui
            .addSelect('res', 'Resolution', ['8 char', '10 char', '70 char', '5 gray'], () => this.show())
            .addSwitch('half', 'Half', true, () => this.show());
    }

    show() {
        let cv = this.cv;
        let cx = this.cx;

        let rect = cv.getBoundingClientRect();
        let w = rect.width;
        let h = rect.height;
        cv.width = w;
        cv.height = h;

        cx.fillStyle = colors.off;
        cx.fillRect(0, 0, w, h);

        let text = this.getText();
        let lines = text.split("\n");
        let fsize = h;
        let lh = 1.3;
        cx.font = fsize + "px monospace";
        let wh = cx.measureText(lines[0]);
        wh = [wh.width, fsize * lines.length * lh];
        let scale = Math.min(w / wh[0], h / wh[1]);

        fsize = roundInt(fsize * scale);
        cx.font = fsize + "px monospace";
        cx.textAlign = "center";
        cx.textBaseline = "top";
        cx.fillStyle = colors.on;

        let y = 0;
        for (const line of lines) {
            cx.fillText(line, w / 2, y);
            y += fsize * lh;
        }
    }

    getText() {
        let img = this.getImg();
        let pallette = this.pallette[this.ui.res];
        let len = pallette.length;
        let half = this.ui.half;
        let res = "";

        for (let y = 0; y < img.H; y++) {
            for (let x = 0; x < img.W; x++) {
                let pix = img.buf[y * img.W + x];
                if (half && y < img.H - 1) {
                    pix = (pix + img.buf[(y + 1) * img.W + x]) / 2;
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