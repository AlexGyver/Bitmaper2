import { ui_conv, ui_out, update_h } from "../ui";
import { Mono1p, Mono8HMSB, Mono8HLSB, Mono8Vcol, Mono8Vrow, MonoGImg, MonoGMap, MonoGPack } from "./mono";
import { RGB233, RGB24, RGB565, RGB888 } from "./rgb";
import Gray from "./gray";
import ASCII from "./ascii";
import Bricks from "./bricks";
import { TraceStroke } from "./TraceStroke";
import { TraceContour } from "./TraceContour";
import { TraceSkeleton } from "./TraceSkeleton";
import { DitherRGB } from "./dither";
import { TraceHatch } from "./TraceHatch";
import { TracePaths } from "./TracePaths";
import { TraceScribble } from "./TraceScribble";
import { TraceWave } from "./TraceWave";

export let conv;

export function change_conv(n) {
    ui_conv.removeAll();
    conv = new (converters)[n]();
    update_h();
}

export let converters = [
    TraceWave,
    TracePaths,
    TraceHatch,
    TraceScribble,
    Mono1p,
    Mono8HLSB,
    Mono8HMSB,
    Mono8Vcol,
    Mono8Vrow,
    ASCII,
    Bricks,
    // MonoGImg,
    // MonoGMap,
    // MonoGPack,
    Gray,
    RGB24,
    RGB888,
    RGB565,
    RGB233,
    DitherRGB,
    TraceStroke,
    TraceContour,
    TraceSkeleton,
];