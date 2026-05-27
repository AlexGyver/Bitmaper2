export function trace(image, {
    skipShort = 0,
    skipCorners = false,
    skipStraight = false,
    simplifyTol = 0.0,
    simplifyLen = 3,
    optiTravel = false,
}) {
    let _x = 0;
    let _y = 0;
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

    const draw = (x, y, dir) => {
        if (!image.getSafe(x, y)) return false;

        if (skipCorners && _rsize == 1) {
            const m = cornerMap[(_dir << 2) | dir];

            if (m) {
                let sx = x + m[0];
                let sy = y + m[1];

                if (image.getSafe(sx, sy)) {
                    image.set(sx, sy, 0);
                }
            }
        }

        image.set(x, y, 0);

        if (_rsize != 1 || !_path.length) _path.push([]);
        _path.at(-1).push([x, y]);

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

        let max_x = Math.max(_x, image.W - 1 - _x);
        let max_y = Math.max(_y, image.H - 1 - _y);

        return ++_rsize > Math.max(max_x, max_y);
    }

    // ======================== draw ========================
    draw(_x, _y, _dir);
    while (!findNext());

    if (skipShort) {
        _path = _path.filter(p => p.length > skipShort);
    }

    if (skipStraight) {
        _path = simplifyStraightSegments(_path);
    }

    if (simplifyTol) {
        _path = simplifySegments(_path, simplifyTol, simplifyLen);
    }

    if (optiTravel) {
        _path = sortSegments(_path);
    }

    return _path;
}

const dist2 = (a, b) => {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

function sortSegments(segments) {
    if (segments.length <= 2) return segments;

    let result = [segments[0]];
    let rest = segments.slice(1);

    while (rest.length) {
        let prev = result.at(-1).at(-1);

        let bestIndex = 0;
        let bestReverse = false;
        let bestDist = Infinity;

        for (let i = 0; i < rest.length; i++) {
            let segment = rest[i];

            let dStart = dist2(prev, segment[0]);
            if (dStart < bestDist) {
                bestDist = dStart;
                bestIndex = i;
                bestReverse = false;
            }

            let dEnd = dist2(prev, segment.at(-1));
            if (dEnd < bestDist) {
                bestDist = dEnd;
                bestIndex = i;
                bestReverse = true;
            }
        }

        let next = rest.splice(bestIndex, 1)[0];

        if (bestReverse) {
            next = next.slice().reverse();
        }

        result.push(next);
    }

    return result;
}

function distToLine2(p, a, b) {
    let x = p[0];
    let y = p[1];
    let x1 = a[0];
    let y1 = a[1];
    let x2 = b[0];
    let y2 = b[1];

    let dx = x2 - x1;
    let dy = y2 - y1;

    if (dx === 0 && dy === 0) {
        dx = x - x1;
        dy = y - y1;
        return dx * dx + dy * dy;
    }

    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    let px = x1 + t * dx;
    let py = y1 + t * dy;

    dx = x - px;
    dy = y - py;

    return dx * dx + dy * dy;
}

// Douglas–Peucker
function simplifySegment(points, tolerance, maxLine) {
    if (points.length <= 2) return points;

    let first = points[0];
    let last = points[points.length - 1];

    if (dist2(first, last) > maxLine * maxLine) {
        let mid = points.length >> 1;

        let left = simplifySegment(points.slice(0, mid + 1), tolerance, maxLine);
        let right = simplifySegment(points.slice(mid), tolerance, maxLine);

        return left.slice(0, -1).concat(right);
    }

    let maxDist = 0;
    let index = -1;

    for (let i = 1; i < points.length - 1; i++) {
        let d = distToLine2(points[i], first, last);
        if (d > maxDist) {
            maxDist = d;
            index = i;
        }
    }

    let tolerance2 = tolerance * tolerance;

    if (maxDist <= tolerance2) {
        return [first, last];
    }

    let left = simplifySegment(points.slice(0, index + 1), tolerance, maxLine);
    let right = simplifySegment(points.slice(index), tolerance, maxLine);

    return left.slice(0, -1).concat(right);
}

function simplifySegments(segments, tolerance, maxline) {
    return segments.map(p => simplifySegment(p, tolerance, maxline));
}

function skipStraight(points) {
    if (points.length <= 2) return points;

    let result = [points[0]];

    let prevDx = points[1][0] - points[0][0];
    let prevDy = points[1][1] - points[0][1];

    for (let i = 2; i < points.length; i++) {
        let dx = points[i][0] - points[i - 1][0];
        let dy = points[i][1] - points[i - 1][1];

        if (dx !== prevDx || dy !== prevDy) {
            result.push(points[i - 1]);
            prevDx = dx;
            prevDy = dy;
        }
    }

    result.push(points.at(-1));
    return result;
}

function simplifyStraightSegments(segments) {
    return segments.map(p => skipStraight(p));
}