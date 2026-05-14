import { colors } from "../ui";
import ConverterBase from "./base";
import { threshold } from "./filters";

// todo переделать формат с 16/16/8 на 16/16

export class Trace extends ConverterBase {
    static name = 'Trace';
    points = [];

    constructor() {
        super();
        this.ui
            .addSlider('thresh', 'Threshold', 128, 0, 256, 1)
            .addSlider('skipSteps', 'Skip steps', 0, 0, 10, 1)
            .addSwitch('skipCorners', 'Skip corners', false)
            .addSwitch('skipSingle', 'Skip single', false)
    }

    getImg() {
        let img = this.img.copy();
        threshold(img.buf, this.ui.thresh);
        return img;
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

        this.trace();

        if (!this.points.length) return;

        cx.lineCap = 'round';
        cx.lineJoin = 'round';
        cx.strokeStyle = colors.on;

        let k = w / this.img.W;
        let k2 = k / 2;
        let drawing = 0;

        this.points.forEach(([x, y, d], i) => {
            if (drawing != d || !i) {
                drawing = d;
                if (i) cx.stroke();

                cx.beginPath();
                cx.lineWidth = k * (drawing ? 0.8 : 0.2);

                let [px, py] = i ? this.points[i - 1] : [0, 0];
                cx.moveTo(px * k + k2, py * k + k2);
            }

            cx.lineTo(x * k + k2, y * k + k2);
        });

        cx.stroke();
    }

    async encode() {
        const bpp = 2 + 2 + 1;
        const buffer = new ArrayBuffer(this.points.length * bpp);
        const view = new DataView(buffer);

        let offset = 0;

        for (const [x, y, f] of this.points) {
            view.setUint16(offset, x, true); offset += 2;
            view.setUint16(offset, y, true); offset += 2;
            view.setUint8(offset, f ? 1 : 0); offset += 1;
        }

        return new Uint8Array(buffer);
    }

    trace() {
        this.points = [];

        const Skip = {
            NoSkip: 1,
            SkipX: 2,
            SkipY: 3
        };

        let _x = 0;
        let _y = 0;
        let _dir = 0;
        let _rsize = 0;
        let _count = 0;
        let _img = this.getImg();
        let _lskip = Skip.NoSkip;
        let _skip_st = this.ui.skipSteps;
        let _skip_crn = this.ui.skipCorners;
        let _skip_single = this.ui.skipSingle;

        const _cb = (x, y, v) => {
            this.points.push([x, y, v ? 1 : 0]);
        }

        const _move = (x, y) => {
            _img.set(x, y, 0);

            if (_rsize == 1) {
                switch (_lskip) {
                    case Skip.NoSkip:
                        if (_x == x) _lskip = Skip.SkipX;
                        else if (_y == y) _lskip = Skip.SkipY;
                        break;

                    case Skip.SkipX:
                        if (_x != x) {
                            _lskip = Skip.NoSkip;
                            _cb(_x, _y, 1);
                            _count = 0;
                        }
                        break;

                    case Skip.SkipY:
                        if (_y != y) {
                            _lskip = Skip.NoSkip;
                            _cb(_x, _y, 1);
                            _count = 0;
                        }
                        break;
                }
            }

            if (_lskip == Skip.NoSkip) {
                if (_skip_st) {
                    if (++_count > _skip_st || _rsize > 1) {
                        if (_rsize > 1) _cb(_x, _y, 1);
                        _cb(x, y, _rsize == 1);
                        _count = 0;
                    }
                } else {
                    _cb(x, y, _rsize == 1);
                }
            }

            _x = x;
            _y = y;
        }

        const _moveClear = (x, y) => {
            _skip_crn ? _img.set(x, y, 0) : _move(x, y);
        }

        const _test = (x, y, dir) => {
            if (!_img.getSafe(x, y)) return false;

            if (_rsize == 1) {
                switch ((_dir << 2) | dir) {
                    case 0b0011: if (_img.getSafe(x + 1, y)) _moveClear(x + 1, y); break;
                    case 0b0100: if (_img.getSafe(x, y + 1)) _moveClear(x, y + 1); break;
                    case 0b1001: if (_img.getSafe(x - 1, y)) _moveClear(x - 1, y); break;
                    case 0b1110: if (_img.getSafe(x, y - 1)) _moveClear(x, y - 1); break;
                    case 0b0101: if (_img.getSafe(x - 1, y)) _moveClear(x - 1, y); break;
                    case 0b1010: if (_img.getSafe(x, y - 1)) _moveClear(x, y - 1); break;
                    case 0b1111: if (_img.getSafe(x + 1, y)) _moveClear(x + 1, y); break;
                    case 0b0000: if (_img.getSafe(x, y + 1)) _moveClear(x, y + 1); break;
                }
            } else {
                if (_skip_single) {
                    for (let xx = -1; xx <= 1; xx++) {
                        for (let yy = -1; yy <= 1; yy++) {
                            if ((xx || yy) && _img.getSafe(x + xx, y + yy)) {
                                _move(x, y);
                                return true;
                            }
                        }
                    }
                    return false;
                }
            }
            _move(x, y);
            return true;
        }

        const _check = (dir) => {
            switch (dir) {
                case 0:
                    for (let x = _x - _rsize + 1; x <= _x + _rsize; x++) {
                        if (_test(x, _y - _rsize, dir)) return dir;
                    }
                    break;
                case 1:
                    for (let y = _y - _rsize + 1; y <= _y + _rsize; y++) {
                        if (_test(_x + _rsize, y, dir)) return dir;
                    }
                    break;
                case 2:
                    for (let x = _x + _rsize - 1; x >= _x - _rsize; x--) {
                        if (_test(x, _y + _rsize, dir)) return dir;
                    }
                    break;
                case 3:
                    for (let y = _y + _rsize - 1; y >= _y - _rsize; y--) {
                        if (_test(_x - _rsize, y, dir)) return dir;
                    }
                    break;
            }
            return -1;
        }

        const findNext = () => {
            for (let i = 0; i < 4; i++) {
                let dir = _check((_dir + 3 + i) & 3);
                if (dir >= 0) {
                    _dir = dir;
                    _rsize = 1;
                    return false;
                }
            }

            if (_lskip != Skip.NoSkip) {
                _lskip = Skip.NoSkip;
                _cb(_x, _y, 1);
            }

            let max_x = _x < _img.W / 2 ? (_img.W - _x) : _x;
            let max_y = _y < _img.H / 2 ? (_img.H - _y) : _y;
            return ++_rsize >= Math.max(max_x, max_y);
        }

        while (!findNext());
    }
}