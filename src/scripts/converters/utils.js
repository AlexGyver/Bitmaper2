export function getWH16_LSB(w, h) {
    return [
        w & 0xff,
        (w >> 8) & 0xff,
        h & 0xff,
        (h >> 8) & 0xff
    ];
}