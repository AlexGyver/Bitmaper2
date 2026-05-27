import { roundInt } from "@alexgyver/utils";
import { colors } from "../ui";

export function getWH16_LSB(w, h) {
    return [
        w & 0xff,
        (w >> 8) & 0xff,
        h & 0xff,
        (h >> 8) & 0xff
    ];
}

export function printMono(cv, cx, text) {
    let rect = cv.getBoundingClientRect();
    let w = rect.width;
    let h = rect.height;
    cv.width = w;
    cv.height = h;

    cx.fillStyle = colors.off;
    cx.fillRect(0, 0, w, h);

    let lines = text.split("\n");
    let fsize = h;
    let lh = 1.3;
    cx.font = fsize + "px monospace";
    let wh = cx.measureText(lines[0]);
    wh = [wh.width, fsize * lines.length * lh];
    let scale = Math.min(w / wh[0], h / wh[1]);

    fsize = roundInt(fsize * scale);
    cx.font = fsize + "px monospace";
    cx.textAlign = "center";
    cx.textBaseline = "top";
    cx.fillStyle = colors.on;

    let y = fsize * lh / 2;
    for (const line of lines) {
        cx.fillText(line, w / 2, y);
        y += fsize * lh;
    }
}