import { ui_conv, ui_out, update_h } from "../ui";
import { Mono1, Mono8H, Mono8HLSB, Mono8Vcol, Mono8Vrow, MonoGImg, MonoGMap, MonoGPack } from "./mono";
import { RGB233, RGB24, RGB565, RGB888 } from "./rgb";
import Gray from "./gray";
import { Test } from "./test";
import ASCII from "./ascii";

export let conv;

export function change_conv(n) {
    ui_conv.removeAll();
    conv = new (converters)[n]();
    update_h();
}

export let converters = [
    Mono1,
    Mono8H,
    Mono8HLSB,
    Mono8Vcol,
    Mono8Vrow,
    MonoGImg,
    MonoGMap,
    MonoGPack,
    Gray,
    RGB24,
    RGB888,
    RGB565,
    RGB233,
    ASCII,
    // Test,
];