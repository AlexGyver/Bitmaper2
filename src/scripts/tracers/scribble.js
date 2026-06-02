import { diag, perlin2, random } from "../math";

export function scribble(arr, w, h, {
    steps = 30000,
    maxSpeed = 1.3,
    surround = 3,
    noiseMultiplier = 0.1,
    fadeAmount = 50,
    minValue = 1,
    noiseScale = 0.01,
    seed = 1,
} = {}) {
    const field = new Float32Array(w * h);

    for (let i = 0; i < w * h; i++) {
        const v = arr[i] || 0;
        field[i] = v >= minValue ? 255 - v : 255;
    }

    function inside(x, y) {
        return x >= 0 && y >= 0 && x < w && y < h;
    }

    function get(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!inside(x, y)) return 255;

        return field[y * w + x];
    }

    function set(x, y, v) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!inside(x, y)) return;

        field[y * w + x] = Math.max(0, Math.min(255, v));
    }

    function findStart() {
        for (let i = 0; i < 10000; i++) {
            const x = random() * w;
            const y = random() * h;

            if (get(x, y) < 255) {
                return [x, y];
            }
        }

        return null;
    }

    function fadeLine(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        const n = Math.max(
            1,
            Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))
        );

        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = x1 + dx * t;
            const y = y1 + dy * t;

            set(x, y, get(x, y) + fadeAmount);
        }
    }

    const pos = findStart();
    if (!pos) {
        return [];
    }

    const vel = [0, 0];

    const line = [[pos[0], pos[1]]];

    let z = 0;

    for (let step = 0; step < steps; step++) {
        let fx = 0;
        let fy = 0;
        let count = 0;

        const half = Math.floor(surround / 2);

        for (let ox = -half; ox <= half; ox++) {
            for (let oy = -half; oy <= half; oy++) {
                if (ox === 0 && oy === 0) continue;

                const x = Math.floor(pos[0] + ox);
                const y = Math.floor(pos[1] + oy);

                if (!inside(x, y)) continue;

                let b = get(x, y);

                b = 1 - b / 20;

                const len = diag(ox, oy);
                if (len === 0) continue;

                fx += (ox / len) * b;
                fy += (oy / len) * b;

                count++;
            }
        }

        if (count > 0) {
            fx /= count;
            fy /= count;
        }

        const n = perlin2(
            pos[0] * noiseScale,
            pos[1] * noiseScale + z,
            seed
        );

        const a = ((n * 0.5 + 0.5) * Math.PI * 10);

        const fm = diag(fx, fy);

        const nm = fm < 0.01
            ? noiseMultiplier * 5
            : noiseMultiplier;

        fx += Math.cos(a) * nm;
        fy += Math.sin(a) * nm;

        vel[0] += fx;
        vel[1] += fy;

        const speed = diag(vel[0], vel[1]);

        if (speed > maxSpeed) {
            vel[0] = (vel[0] / speed) * maxSpeed;
            vel[1] = (vel[1] / speed) * maxSpeed;
        }

        const prevX = pos[0];
        const prevY = pos[1];

        pos[0] += vel[0];
        pos[1] += vel[1];

        if (!inside(pos[0], pos[1])) {
            break;
        }

        line.push([pos[0], pos[1]]);

        fadeLine(prevX, prevY, pos[0], pos[1]);

        z += 0.01;
    }

    return [line];
}