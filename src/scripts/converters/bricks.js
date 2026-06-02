import BaseText from "./baseText";

export default class Bricks extends BaseText {
    static name = 'Bricks';

    constructor() {
        super('mono');
        this.ui.addSelect('res', 'Resolution', ['X1', 'X2', 'X4', 'X8']);
    }

    isSet(x, y) {
        return this.getPixSafe(x, y) < 128 ? 0 : 1;
    }

    getText() {
        const lines = [];

        switch (this.ui.resText) {
            case 'X1':
                for (let y = 0; y < this.H; y++) {
                    let line = "";

                    for (let x = 0; x < this.W; x++) {
                        line += this.isSet(x, y) ? "⬛" : "⬜";
                    }

                    lines.push(line);
                }
                break;

            case 'X2':
                for (let y = 0; y < this.H; y += 2) {
                    let line = "";

                    for (let x = 0; x < this.W; x++) {
                        const v = this.isSet(x, y) | (this.isSet(x, y + 1) << 1);
                        line += ["⠀", "▀", "▄", "█"][v];
                    }

                    lines.push(line);
                }
                break;

            case 'X4':
                for (let y = 0; y < this.H; y += 2) {
                    let line = "";

                    for (let x = 0; x < this.W; x += 2) {
                        const v = this.isSet(x, y) | (this.isSet(x + 1, y) << 1) | (this.isSet(x, y + 1) << 2) | (this.isSet(x + 1, y + 1) << 3);
                        line += ["⠀", "▘", "▝", "▀", "▖", "▌", "▞", "▛", "▗", "▚", "▐", "▜", "▄", "▙", "▟", "█"][v];
                    }

                    lines.push(line);
                }
                break;

            case 'X8':
                for (let yy = 0; yy < this.H; yy += 4) {
                    let line = "";

                    for (let xx = 0; xx < this.W; xx += 2) {
                        let v = 0;

                        for (let k = 0; k < 8; k++) {
                            let x = xx;
                            let y = yy;

                            if (k <= 2) {
                                y += k;
                            } else if (k <= 5) {
                                x++;
                                y += k - 3;
                            } else if (k === 6) {
                                y += 3;
                            } else {
                                x++;
                                y += 3;
                            }

                            v = (v >> 1) | (this.isSet(x, y) << 7);
                        }

                        line += String.fromCharCode(0x2800 + v);
                    }

                    lines.push(line);
                }
                break;
        }

        return lines.join('\n');
    }
}