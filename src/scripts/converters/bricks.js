import { clipWrite } from "@alexgyver/utils";
import BaseThresh from "./baseThresh";
import { printMono } from "./utils";

export default class Bricks extends BaseThresh {
    static name = 'Bricks';
    prefix = 'const char';
    ext = 'txt';

    constructor() {
        super();
        this.ui
            .addSelect('res', 'Resolution', ['X1', 'X2', 'X4', 'X8'])
            .addButton('copy', 'Copy text', () => clipWrite(this.getText()))
    }

    show() {
        printMono(this.cv, this.cx, this.getText());
    }

    getText() {
        let img = this.getImg();
        let res = "";

        switch (this.ui.resText) {
            case 'X1':
                for (let y = 0; y < img.H; y++) {
                    for (let x = 0; x < img.W; x++) {
                        res += img.get(x, y) ? "⬛" : "⬜";
                    }
                    res += "\n";
                }
                break;

            case 'X2':
                for (let y = 0; y < img.H; y += 2) {
                    for (let x = 0; x < img.W; x++) {
                        let v = !!img.get(x, y) | (!!img.get(x, y + 1) << 1);
                        res += ["⠀", "▀", "▄", "█"][v];
                    }
                    res += "\n";
                }
                break;

            case 'X4':
                for (let y = 0; y < img.H; y += 2) {
                    for (let x = 0; x < img.W; x += 2) {
                        let v = !!img.get(x, y) | (!!img.get(x + 1, y) << 1) | (!!img.get(x, y + 1) << 2) | (!!img.get(x + 1, y + 1) << 3);
                        res += ["⠀", "▘", "▝", "▀", "▖", "▌", "▞", "▛", "▗", "▚", "▐", "▜", "▄", "▙", "▟", "█"][v];
                    }
                    res += "\n";
                }
                break;

            case 'X8':
                for (let yy = 0; yy < img.H; yy += 4) {
                    for (let xx = 0; xx < img.W; xx += 2) {
                        let v = 0;
                        for (let k = 0; k < 8; k++) {
                            let x = xx, y = yy;
                            if (k <= 2) {
                                y += k;
                            } else if (k <= 5) {
                                x++;
                                y += k - 3;
                            } else if (k == 6) {
                                y += 3;
                            } else {
                                y += 3;
                                x++;
                            }
                            v = (v >> 1) | (!!img.get(x, y) << 7);
                        }
                        res += String.fromCharCode(0x2800 + v);
                    }
                    res += "\n";
                }
                break;
        }

        return res;
    }

    async encode() {
        return encodeText(this.getText());
    }
}