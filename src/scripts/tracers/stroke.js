export function stroke(arr, w, h, {
    skipCorners = false,
    startX = 0,
    startY = 0,
} = {}) {
    if (w < 2 || h < 2) return [];

    const t = Uint8Array.from(arr);
    let _x = startX;
    let _y = startY;
    let _path = [];
    let _dir = 0;
    let _rsize = 1;

    const cornerMap = {
        0b0011: [1, 0],
        0b0100: [0, 1],
        0b1001: [-1, 0],
        0b1110: [0, -1],
        0b0101: [-1, 0],
        0b1010: [0, -1],
        0b1111: [1, 0],
        0b0000: [0, 1],
    };

    const inBound = (x, y) => (x >= 0 && x < w && y >= 0 && y < h);
    const clear = (x, y, v) => inBound(x, y) ? t[y * w + x] = 0 : 0;
    const get = (x, y) => inBound(x, y) ? t[y * w + x] : 0;

    const draw = (x, y, dir) => {
        if (!get(x, y)) return false;

        if (skipCorners && _rsize == 1) {
            const m = cornerMap[(_dir << 2) | dir];
            if (m) clear(x + m[0], y + m[1]);
        }

        clear(x, y);

        if (_rsize != 1 || !_path.length) _path.push([]);
        _path[_path.length - 1].push([x, y]);

        _x = x;
        _y = y;

        return true;
    }

    const check = (dir) => {
        switch (dir) {
            case 0:
                for (let x = _x - _rsize + 1; x <= _x + _rsize; x++) {
                    if (draw(x, _y - _rsize, dir)) return dir;
                }
                break;
            case 1:
                for (let y = _y - _rsize + 1; y <= _y + _rsize; y++) {
                    if (draw(_x + _rsize, y, dir)) return dir;
                }
                break;
            case 2:
                for (let x = _x + _rsize - 1; x >= _x - _rsize; x--) {
                    if (draw(x, _y + _rsize, dir)) return dir;
                }
                break;
            case 3:
                for (let y = _y + _rsize - 1; y >= _y - _rsize; y--) {
                    if (draw(_x - _rsize, y, dir)) return dir;
                }
                break;
        }
        return -1;
    }

    const findNext = () => {
        for (let i = 0; i < 4; i++) {
            let dir = check((_dir + 3 + i) & 3);
            if (dir >= 0) {
                _dir = dir;
                _rsize = 1;
                return false;
            }
        }

        let max_x = Math.max(_x, w - 1 - _x);
        let max_y = Math.max(_y, h - 1 - _y);

        return ++_rsize > Math.max(max_x, max_y);
    }

    // ==================== trace ====================
    draw(_x, _y, _dir);
    while (!findNext());
    return _path;
}