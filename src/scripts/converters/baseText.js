import { colors } from "../ui";
import ConverterBase from "./base";
import { clipWrite, roundInt } from "@alexgyver/utils";

export default class BaseText extends ConverterBase {
    prefix = 'const char';
    ext = 'txt';

    constructor(mode) {
        super(mode);
        this.ui.addButton('copy', 'Copy text', () => clipWrite(this.getText()))
    }

    show() {
        const cv = this.cv;
        const cx = this.cx;
        const rect = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));

        cv.width = w;
        cv.height = h;
        cx.fillStyle = colors.off;
        cx.fillRect(0, 0, w, h);

        const text = this.getText();
        if (!text) return;

        const lines = text.split('\n');
        let fsize = h;
        const lh = 1.3;

        cx.font = `${fsize}px monospace`;

        const textWidth = Math.max(1, ...lines.map(line => cx.measureText(line).width));
        const textHeight = Math.max(1, fsize * lines.length * lh);
        const scale = Math.min(w / textWidth, h / textHeight);

        fsize = Math.max(1, roundInt(fsize * scale));

        cx.font = `${fsize}px monospace`;
        cx.textAlign = "center";
        cx.textBaseline = "top";
        cx.fillStyle = colors.on;

        const lineHeight = fsize * lh;
        const totalHeight = lines.length * lineHeight;
        let y = (h - totalHeight) / 2;

        for (const line of lines) {
            cx.fillText(line, w / 2, y);
            y += lineHeight;
        }
    }

    // todo
    encode() {
        return new TextEncoder().encode(this.getText());
    }

    getText() { }

    // todo get meta
}

/*
if (conv.plainText) {
    if (Array.isArray(res)) res = res[0];   // todo
    let w = conv.W;
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