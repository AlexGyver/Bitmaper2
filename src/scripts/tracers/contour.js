export function contour(arr, w, h, {
    threshold = 128,
    precision = 0.001,
} = {}) {
    if (w < 2 || h < 2) return [];

    const levels = Array.isArray(threshold) ? threshold : [threshold];

    let result = [];

    for (const level of levels) {
        const smallSegments = marchingSquares(arr, w, h, level, precision);
        const polylines = joinSegments(smallSegments, precision);
        result = result.concat(polylines);
    }

    return result;
}

//#region marchingSquares
function marchingSquares(arr, w, h, threshold, precision) {
    const segments = [];

    for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
            const i00 = y * w + x;
            const v00 = arr[i00];
            const v10 = arr[i00 + 1];
            const v01 = arr[i00 + w];
            const v11 = arr[i00 + w + 1];

            const state =
                (v00 <= threshold ? 1 : 0) |
                (v10 <= threshold ? 2 : 0) |
                (v11 <= threshold ? 4 : 0) |
                (v01 <= threshold ? 8 : 0);

            if (state === 0 || state === 15) {
                continue;
            }

            const top = edgePoint(
                [x, y],
                [x + 1, y],
                v00,
                v10,
                threshold,
                precision
            );

            const right = edgePoint(
                [x + 1, y],
                [x + 1, y + 1],
                v10,
                v11,
                threshold,
                precision
            );

            const bottom = edgePoint(
                [x, y + 1],
                [x + 1, y + 1],
                v01,
                v11,
                threshold,
                precision
            );

            const left = edgePoint(
                [x, y],
                [x, y + 1],
                v00,
                v01,
                threshold,
                precision
            );

            switch (state) {
                case 1:
                    pushSegment(segments, left, top, precision);
                    break;

                case 2:
                    pushSegment(segments, top, right, precision);
                    break;

                case 3:
                    pushSegment(segments, left, right, precision);
                    break;

                case 4:
                    pushSegment(segments, right, bottom, precision);
                    break;

                case 5: {
                    const centerInside = ((v00 + v10 + v11 + v01) * 0.25) <= threshold;

                    if (centerInside) {
                        pushSegment(segments, top, right, precision);
                        pushSegment(segments, bottom, left, precision);
                    } else {
                        pushSegment(segments, left, top, precision);
                        pushSegment(segments, right, bottom, precision);
                    }

                    break;
                }

                case 6:
                    pushSegment(segments, top, bottom, precision);
                    break;

                case 7:
                    pushSegment(segments, left, bottom, precision);
                    break;

                case 8:
                    pushSegment(segments, bottom, left, precision);
                    break;

                case 9:
                    pushSegment(segments, top, bottom, precision);
                    break;

                case 10: {
                    const centerInside = ((v00 + v10 + v11 + v01) * 0.25) <= threshold;

                    if (centerInside) {
                        pushSegment(segments, left, top, precision);
                        pushSegment(segments, right, bottom, precision);
                    } else {
                        pushSegment(segments, top, right, precision);
                        pushSegment(segments, bottom, left, precision);
                    }

                    break;
                }

                case 11:
                    pushSegment(segments, right, bottom, precision);
                    break;

                case 12:
                    pushSegment(segments, left, right, precision);
                    break;

                case 13:
                    pushSegment(segments, top, right, precision);
                    break;

                case 14:
                    pushSegment(segments, left, top, precision);
                    break;
            }
        }
    }

    return segments;
}

//#region helper
function edgePoint(p1, p2, v1, v2, threshold, precision) {
    if (v1 === v2) {
        return [
            (p1[0] + p2[0]) * 0.5,
            (p1[1] + p2[1]) * 0.5
        ];
    }

    let t = (threshold - v1) / (v2 - v1);
    const eps = precision * 2;

    t = Math.max(eps, Math.min(1 - eps, t));

    return [
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t
    ];
}

function pushSegment(segments, a, b, precision) {
    if (!samePoint(a, b, precision)) {
        segments.push([a, b]);
    }
}

function samePoint(a, b, precision) {
    return (
        Math.abs(a[0] - b[0]) <= precision &&
        Math.abs(a[1] - b[1]) <= precision
    );
}

function joinSegments(segments, precision = 0.001) {
    const lines = [];
    const byStart = new Map();
    const byEnd = new Map();

    function key(p) {
        return (
            Math.round(p[0] / precision) +
            "," +
            Math.round(p[1] / precision)
        );
    }

    function addTo(map, k, index) {
        if (!map.has(k)) {
            map.set(k, new Set());
        }

        map.get(k).add(index);
    }

    function removeFrom(map, k, index) {
        const set = map.get(k);

        if (!set) {
            return;
        }

        set.delete(index);

        if (set.size === 0) {
            map.delete(k);
        }
    }

    function addLine(index) {
        const line = lines[index];

        if (!line || line.length === 0) {
            return;
        }

        addTo(byStart, key(line[0]), index);
        addTo(byEnd, key(line[line.length - 1]), index);
    }

    function removeLine(index) {
        const line = lines[index];

        if (!line || line.length === 0) {
            return;
        }

        removeFrom(byStart, key(line[0]), index);
        removeFrom(byEnd, key(line[line.length - 1]), index);
    }

    function collectAlive(set, side) {
        const out = [];

        if (!set) {
            return out;
        }

        for (const index of set) {
            if (lines[index]) {
                out.push({ index, side });
            }
        }

        return out;
    }

    function findEndpoint(p) {
        const k = key(p);

        const matches = [
            ...collectAlive(byEnd.get(k), "end"),
            ...collectAlive(byStart.get(k), "start")
        ];

        if (matches.length === 0) {
            return null;
        }

        if (matches.length > 1) {
            return {
                ambiguous: true
            };
        }

        return matches[0];
    }

    function addNewLine(a, b) {
        const index = lines.length;
        lines.push([a, b]);
        addLine(index);
    }

    function appendToLine(match, newPoint) {
        const line = lines[match.index];

        removeLine(match.index);

        if (match.side === "end") {
            line.push(newPoint);
        } else {
            line.unshift(newPoint);
        }

        addLine(match.index);
    }

    for (const segment of segments) {
        const a = segment[0];
        const b = segment[1];

        const ma = findEndpoint(a);
        const mb = findEndpoint(b);

        // Если точка неоднозначная, лучше не склеивать,
        // чем случайно получить длинную перемычку через изображение.
        if (ma?.ambiguous || mb?.ambiguous) {
            addNewLine(a, b);
            continue;
        }

        // Новый отдельный сегмент.
        if (!ma && !mb) {
            addNewLine(a, b);
            continue;
        }

        // Один конец совпал: достраиваем линию.
        if (ma && !mb) {
            appendToLine(ma, b);
            continue;
        }

        if (!ma && mb) {
            appendToLine(mb, a);
            continue;
        }

        // Оба конца совпали с одной и той же линией: замыкаем контур.
        if (ma.index === mb.index) {
            removeLine(ma.index);

            const line = lines[ma.index];

            if (
                (ma.side === "start" && mb.side === "end") ||
                (ma.side === "end" && mb.side === "start")
            ) {
                if (key(line[0]) !== key(line[line.length - 1])) {
                    line.push(line[0]);
                }

                addLine(ma.index);
            } else {
                addLine(ma.index);
                addNewLine(a, b);
            }

            continue;
        }

        // Оба конца совпали с разными линиями: объединяем две линии.
        removeLine(ma.index);
        removeLine(mb.index);

        let lineA = lines[ma.index];
        let lineB = lines[mb.index];

        if (ma.side === "start") {
            lineA = lineA.slice().reverse();
        }
        if (mb.side === "end") {
            lineB = lineB.slice().reverse();
        }

        lines[ma.index] = lineA.concat(lineB.slice(1));
        lines[mb.index] = null;

        addLine(ma.index);
    }

    return lines.filter(Boolean);
}