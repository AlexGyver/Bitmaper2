import BaseText from "./baseText";

export default class ASCII extends BaseText {
    static name = 'ASCII';

    palette = [
        "Wwli:,. ",
        "@%#*+=-:. ",
        "@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|\\()1{}[]?-_+~<>i!lI;:,\"^`'. ",
        "█▓▒░ "
    ];

    constructor() {
        super('gray');
        this.ui
            .addSelect('res', 'Resolution', ['8 char', '10 char', '70 char', '5 gray'])
            .addSwitch('half', 'Half', true)
    }

    getText() {
        const palette = this.palette[this.ui.res];
        const len = palette.length;
        const half = this.ui.half;
        const stepY = half ? 2 : 1;
        const lines = [];

        for (let y = 0; y < this.H; y += stepY) {
            let line = "";

            for (let x = 0; x < this.W; x++) {
                let pix = this.getPix(x, y);

                if (half && y + 1 < this.H) {
                    pix = (pix + this.getPix(x, y + 1)) / 2;
                }

                const idx = Math.floor((255 - pix) * (len - 1) / 255);
                line += palette[idx];
            }

            lines.push(line);
        }

        return lines.join('\n');
    }
}