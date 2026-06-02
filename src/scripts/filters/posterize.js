//#region posterize
// n [1.. n]
export function posterize(arr, w, h, n) {
    if (n < 2) return;

    const len = w * h;

    // hist
    const hist = new Uint32Array(256);
    for (let i = 0; i < len; i++) {
        hist[arr[i] & 0xff]++;
    }

    // unique
    let unique = 0;
    for (let v = 0; v < 256; v++) {
        if (hist[v] > 0) unique++;
    }
    if (unique <= n) return;

    // palette
    const palette = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
        const target = Math.round((i * (len - 1)) / (n - 1));

        let acc = 0;
        let value = 0;

        for (let v = 0; v < 256; v++) {
            acc += hist[v];

            if (acc > target) {
                value = v;
                break;
            }
        }

        palette[i] = value;
    }

    // table
    const table = new Uint8Array(256);

    for (let v = 0; v < 256; v++) {
        let best = palette[0];
        let bestDist = Math.abs(v - best);

        for (let i = 1; i < n; i++) {
            const p = palette[i];
            const d = Math.abs(v - p);

            if (d < bestDist) {
                bestDist = d;
                best = p;
            }
        }

        table[v] = best;
    }

    for (let i = 0; i < len; i++) {
        arr[i] = table[arr[i] & 0xff];
    }
}