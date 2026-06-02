import UI from "@alexgyver/ui";
import ImageCanvas from "./ImageCanvas";
import loadImage from "./ImageLoader";
import DragBlock from "@alexgyver/drag-block";
import { app } from "./app";
import { change_conv, conv, converters } from "./converters";
import { clipWrite, decodeText, download, encodeText, fetchT, isTouch, LS } from "@alexgyver/utils";
import { defaultImage } from "./defaultImage";

/** @type {UI} */
export let ui_in;

/** @type {UI} */
export let ui_sel;

/** @type {UI} */
export let ui_conv;

/** @type {UI} */
export let ui_out;

/** @type {ImageCanvas} */
export let cvimg;

// web colors
const colors_pal = {
    dark: { on: '#478be6', off: '#000000' },
    light: { on: '#000000', off: '#ffffff' },
};
export let colors = colors_pal.light;

let files = null;
const grayFilters = ['brightness', 'contrast', 'gamma', 'blur', 'blur_iters', 'sharpen', 'sobel_edges', 'sobel_contour', 'canny', 'posterize', 'dither', 'thresh', 'median_r', 'median_iter', 'contour', 'thinner', 'erode', 'clean', 'invert'];
const vignetteFilters = ['vignette_val', 'vignette_size', 'vignette_r'];
const resetFilters = ['bblack', 'brightness', 'contrast', 'saturate', 'blur', 'posterizeRGB', 'mask', 'mask_color', 'mask_tol']
const saveCfg = ['prev_width', 'fil_show', 'proc_show', 'proc_grid'];
export const dither = ['None', 'Floyd-Steinberg', 'JJN', 'Bayer2', 'Bayer4', 'Bayer8', 'Stucki', 'Sierra2', 'Sierra3', 'SierraLite', 'Atkinson', 'Burkes', 'Riemersma'];

//#region dark
let darkmode;

export function initDark() {
    LS.init('darkmode', false);
    darkmode = LS.get('darkmode');
    setDark(darkmode);
}

export function toggleDark() {
    darkmode = !darkmode;
    setDark(darkmode);
    LS.set('darkmode', darkmode);
    update_h();
}

export function setDark(dark) {
    dark ? document.body.classList.add('darkmode') : document.body.classList.remove('darkmode');
    let theme = (dark ? 'dark' : 'light');
    [ui_in, ui_out, ui_conv, ui_sel].forEach(ui => ui.setTheme(theme));
    colors = dark ? colors_pal.dark : colors_pal.light;
}

const defW = 300;
const defH = 200;

//#region init
export function initUI() {
    // =============== ui_in ===============
    ui_in = new UI({ parent: app.$ui_in, width: 'unset' })
        .addFile('file', 'File', file_h)
        .addInput('link', 'Link', '', file_h)
        .addButton('paste', 'Paste', paste_h)
        .addSpace()
        .addNumber('width', 'Width', defW, 1, resize_h)
        .addNumber('height', 'Height', defH, 1, resize_h)
        .addSwitch('precise_zoom', 'Precise zoom', false, (v) => cvimg.setZoomScale(v ? 0.05 : 1))
        .addButton('fit', 'Fit', () => cvimg.fit())
        .addSpace()
        .addSwitch('bblack', 'Black Background', false, update_h)
        .addSlider('rotate', 'Rotate', 0, -180, 180, 1, update_h)
        .addSwitch('mirror_x', 'Mirror X', false, update_h)
        .addSwitch('mirror_y', 'Mirror Y', false, update_h)
        .addSpace()
        .addSlider('brightness_rgb', 'Brightness', 0, -255, 255, 5, update_h)
        .addSlider('contrast_rgb', 'Contrast', 0, -255, 255, 5, update_h)
        .addSlider('gamma_rgb', 'Gamma', 1, 0, 3, 0.05, update_h)
        .addSlider('saturate_rgb', 'Saturation', 0, -255, 255, 5, update_h)
        .addSlider('blur_rgb', 'Blur', 0, 0, 10, 0.1, update_h)
        .addSpace()
        .addSwitch('vignette', 'Vignette', false, vignette_h)
        .addSlider('vignette_val', 'Vignette value', 0, -1, 1, 0.05, update_h)
        .addSlider('vignette_size', 'Vignette size', 0.65, 0, 2, 0.05, update_h)
        .addSlider('vignette_r', 'Vignette radius', 0, 0, 1, 0.05, update_h)
        .addSlider('R', 'R', 1, 0, 2, 0.01, update_h)
        .addSlider('G', 'G', 1, 0, 2, 0.01, update_h)
        .addSlider('B', 'B', 1, 0, 2, 0.01, update_h)
        .addSpace()
        .addSlider('posterizeRGB', 'Posterize RGB', 0, 0, 32, 1, update_h)
        .addSpace()
        .addColor('mask_color', 'Mask color', '#000000', update_h)
        .addSelect('mask', 'Mask', ['None', 'HUE', 'HSV', 'RGB'], update_h)
        .addSlider('mask_tol', 'Tolerance', 0.1, 0, 1, 0.01, update_h)
        .addSpace()
        .addSwitch('gray', 'Gray Filters', false, gray_h)
        .addSlider('brightness', 'Brightness', 0, -255, 255, 5, update_h)
        .addSlider('contrast', 'Contrast', 0, -255, 255, 5, update_h)
        .addSlider('gamma', 'Gamma', 1, 0, 3, 0.05, update_h)
        .addSlider('blur', 'Blur', 0, 0, 10, 1, update_h)
        .addSlider('blur_iters', 'Blur iters', 1, 1, 10, 1, update_h)
        .addSlider('sharpen', 'Sharpen', 0, 0, 1, 0.01, update_h)
        .addSlider('sobel_edges', 'Amplify edges', 0, -1, 1, 0.05, update_h)
        .addSlider('posterize', 'Posterize', 0, 0, 32, 1, update_h)
        .addSelect('dither', 'Dithering', dither, update_h)
        .addSwitch('sobel_contour', 'Sobel contour', false, update_h)
        .addSlider('canny', 'Canny', 0, 0, 1, 0.05, update_h)
        .addSlider('thresh', 'Threshold', 0, 0, 255, 1, update_h)
        .addSlider('median_r', 'Median', 0, 0, 10, 1, update_h)
        .addSlider('median_iter', 'Median iter', 1, 1, 10, 1, update_h)
        .addSelect('contour', '1px contour', ['None', '4 dir', '8 dir'], update_h)
        .addSwitch('thinner', 'Thinner', false, update_h)
        .addSlider('erode', 'Erode/dilate', 0, -32, 32, 1, update_h)
        .addSwitch('clean', 'Clean 1 px', false, update_h)
        .addSwitch('invert', 'Invert', false, update_h)
        .addSpace()
        .addButton('reset', 'Reset', reset_h)
        .addSpace()
        .addSwitch('fil_show', 'Show filter preview', true, fil_show_h)
        .addSlider('prev_width', 'Preview width', 900, 50, 1500, 1, prev_width_h)
        .addButton('fil_png', 'Save filter .png', fil_png_h)
        .addSpace()
        .addSwitch('proc_show', 'Show process preview', true, proc_show_h)
        .addSlider('proc_grid', 'Show grid', 0, 0, 0.3, 0.01, update_h)
        .addButton('proc_png', 'Save process .png', proc_png_h)

    if (isTouch()) ui_in.widget('precise_zoom').hide();

    // =============== ui_sel ===============
    ui_sel = new UI({ parent: app.$ui_out, width: 'unset' })
        .addSelect('conv', 'Converter', converters.map(v => v.name), change_conv)
        .addSwitch('autoShow', 'Auto show', true, () => conv.show())
        .addButton('show', 'Show', () => conv.show())

    // =============== ui_conv ===============
    ui_conv = new UI({ parent: app.$ui_out, width: 'unset' })

    // =============== ui_out ===============
    ui_out = new UI({ parent: app.$ui_out, width: 'unset' })
        .addInput('name', 'Name', 'none')
        .addSwitch('pgm', 'PROGMEM', true)
        .addHTML('result', '', '')
        .addSpace()
        .addButtons({ copy: ['Copy code', copy_h], header: ['Save .h', saveH_h] })
        .addButtons({ save: ['Save bin', saveBin_h] })

    if (window.location.hostname.match(/^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/)) {
        ui_out.addButton('send', 'Send to host', send_h);
    }

    cvimg = new ImageCanvas(app.$cvimg, update_h);

    initDark();
    change_conv(0);
    resize_h();

    new DragBlock(app.$cvres, e => {
        if (e.type == 'click') conv.click(e.pos.x / e.width, e.pos.y / e.height);
    });

    // =====================
    vignette_h(false);
    gray_h(false);

    const cfg = LS.get('bitmaper_cfg');
    if (cfg) {
        ui_in.fromObject(cfg);
        saveCfg.forEach(id => ui_in.widget(id).call());
    }

    loadFile(defaultImage);
}

//#region func

window.addEventListener('pagehide', () => {
    LS.set('bitmaper_cfg', ui_in.toObject(saveCfg));
});

async function paste_h() {
    let items = await navigator.clipboard.read();
    for (const item of items) {
        for (const type of item.types) {
            if (type.startsWith("image/")) {
                const blob = await item.getType(type);
                const file = new File([blob], "pasted", { type: blob.type });
                loadFile(file);
                return;
            }
        }
    }
}

function file_h(file) {
    if (file instanceof FileList) {
        files = file;
        loadFile(files[0]);
    } else {
        ui_in.link = '';
        files = null;
        loadFile(file);
    }
}

async function loadFile(f, reset = true) {
    try {
        let res = await loadImage(f);
        cvimg.setImage(res.image, reset);
        if (reset) {
            ui_out.name = res.name;
            cvimg.fit();
        }
        update_h();

    } catch (e) {
        alert(e);
    }
}

function reset_h() {
    [...resetFilters, ...grayFilters].forEach(f => ui_in.widget(f).default());
    update_h();
}
export async function update_h() {
    let fil = ui_in.toObject();

    // rgb
    let rgbfil = [];

    if (fil.mirror_x || fil.mirror_y) rgbfil.push({
        type: 'mirror',
        x: fil.mirror_x,
        y: fil.mirror_y,
    });

    if (fil.R != 1 || fil.G != 1 || fil.B != 1) rgbfil.push({
        type: 'balance',
        r: fil.R,
        g: fil.G,
        b: fil.B,
    });

    if (fil.brightness_rgb) rgbfil.push({
        type: 'brightness',
        value: fil.brightness_rgb,
    });

    if (fil.contrast_rgb) rgbfil.push({
        type: 'contrast',
        value: fil.contrast_rgb,
    });

    if (fil.gamma_rgb != 1) rgbfil.push({
        type: 'gamma',
        value: fil.gamma_rgb,
    });

    if (fil.saturate_rgb) rgbfil.push({
        type: 'saturate',
        value: fil.saturate_rgb,
    });

    if (fil.blur_rgb) rgbfil.push({
        type: 'blur',
        value: fil.blur_rgb,
    });

    if (fil.vignette) rgbfil.push({
        type: 'vignette',
        value: fil.vignette_val,
        radius: fil.vignette_r,
        size: fil.vignette_size,
    });

    if (fil.posterizeRGB) rgbfil.push({
        type: 'posterize',
        value: fil.posterizeRGB,
    });

    const mask = {
        HUE: 'maskHUE',
        HSV: 'maskHSV',
        RGB: 'maskRGB',
    }[fil.maskText];

    if (mask) rgbfil.push({
        type: mask,
        color: fil.mask_color,
        value: fil.mask_tol,
    });

    // gray
    let grayfil = null;

    if (fil.gray) {
        grayfil = [];

        if (fil.brightness) grayfil.push({
            type: 'brightness',
            value: fil.brightness,
        });

        if (fil.contrast) grayfil.push({
            type: 'contrast',
            value: fil.contrast,
        });

        if (fil.gamma) grayfil.push({
            type: 'gamma',
            value: fil.gamma,
        });

        if (fil.blur) grayfil.push({
            type: 'blur',
            value: fil.blur,
            iters: fil.blur_iters,
        });

        if (fil.sharpen) grayfil.push({
            type: 'sharpen',
            value: fil.sharpen,
        });

        if (fil.sobel_edges) grayfil.push({
            type: 'sobel_edges',
            value: fil.sobel_edges,
        });

        if (fil.posterize) grayfil.push({
            type: 'posterize',
            value: fil.posterize,
        });

        if (fil.dither) grayfil.push({
            type: 'dither',
            value: fil.ditherText,
        });

        if (fil.sobel_contour) grayfil.push({
            type: 'sobel_contour',
            value: 1,
        });

        if (fil.canny) grayfil.push({
            type: 'canny',
            value: fil.canny,
        });

        if (fil.thresh) grayfil.push({
            type: 'threshold',
            value: fil.thresh,
        });

        if (fil.median_r) grayfil.push({
            type: 'median',
            value: fil.median_r,
            iters: fil.median_iter,
        });

        if (fil.contour) grayfil.push({
            type: 'contour',
            diag: fil.contour == 2, // 0 none, 1 cross, 2 diag
        });

        if (fil.thinner) grayfil.push({
            type: 'thinner',
        });

        if (fil.erode) grayfil.push({
            type: 'erode',
            value: fil.erode,
        });

        if (fil.clean) grayfil.push({
            type: 'clean',
        });

        if (fil.invert) grayfil.push({
            type: 'invert',
        });
    }

    try {
        let idata = await cvimg.preview(fil.bblack, fil.rotate, rgbfil, grayfil);
        if (idata) conv.setData(idata);
    } catch (e) {
        console.log(e);
    }
}

function resize_h() {
    let w = ui_in.width;
    let h = ui_in.height;
    if (!h) h = w;
    document.body.style.setProperty('--ratio', w / h);
    cvimg.cv.width = w;
    cvimg.cv.height = h;
    update_h();
}

//#region encode-make
async function encode() {
    let res;
    if (!files) {
        res = conv.encode();
        ui_out.result = `Saved ${res.byteLength} bytes`;
    } else {
        res = [];
        for (let file of files) {
            await loadFile(file, false);
            res.push(conv.encode());
        }
        let size = 0;
        res.forEach(r => size += r.byteLength);
        ui_out.result = `Saved ${res.length} images, ${size} bytes`;
    }
    return res;
}

async function copy_h() {
    let res = await encode();
    if (res) clipWrite(makeH(res));
}
async function saveH_h() {
    let res = await encode();
    if (res) download(new Blob([encodeText(makeH(res))], { type: "text/plain" }), ui_out.name + '.h');
}
async function saveBin_h() {
    let res = await encode();
    if (!res || Array.isArray(res)) return; // todo

    download(new Blob([conv.getMeta(), res], { type: "application/octet-stream" }), ui_out.name + '.' + conv.ext);
}
async function send_h() {
    let res = await encode();
    if (!res || Array.isArray(res)) return; // todo

    let formData = new FormData();
    formData.append('bitmap', new Blob([res], { type: "application/octet-stream" }));

    let ok = await fetchT(window.location.href + `bitmap?width=${conv.W}&height=${conv.H}&type=${conv.ext}`, {
        method: 'POST',
        body: formData,
        timeout: 2000
    });

    ui_out.result = ok ? 'Sent' : 'Send error';
}

function makeArray(bin, name, pgm) {
    let pad = bin.BYTES_PER_ELEMENT * 2;
    if (pad == 8) pad = 6;
    let code = `${conv.prefix} ${name}[] ${pgm}= {`;

    for (let i = 0; i < bin.length; i++) {
        if (i % 24 == 0) code += '\n\t';
        code += '0x' + bin[i].toString(16).padStart(pad, 0);
        if (i != bin.length - 1) code += ', ';
    }

    code += '\n};';
    return code;
}

function makeH(res) {
    let name = ui_out.name;
    let code = '';
    let pgm = ui_out.pgm ? 'PROGMEM ' : '';
    const header = (len, w, h) => `#pragma once
#include <Arduino.h>

// ${name}, ${w}x${h}, ${len}
// Bitmaper v2 [${(converters[ui_sel.conv]).name}]

const uint16_t ${name}_w = ${w};
const uint16_t ${name}_h = ${h};

`;

    if (Array.isArray(res)) {
        let size = 0;
        res.forEach(r => size += r.byteLength);
        code += header(`${res.length} images, ${size} bytes`, conv.W, conv.H);

        let names = '';
        for (let i in res) {
            let cur = name + '_' + i;
            code += makeArray(res[i], cur, pgm) + '\n\n';
            if (i != 0) {
                names += ', ';
                if (i % 8 == 0) names += '\n\t';
            }
            names += cur;
        }
        code += `const uint16_t ${name}_list_size = ${res.length};\n\n`;
        code += `${conv.prefix}* const ${name}_list_pgm[] ${pgm}= {\n\t${names}\n};\n\n`;
        code += `${conv.prefix}* const ${name}_list[] = {\n\t${names}\n};`;

    } else {
        code += header(`${res.byteLength} bytes`, conv.W, conv.H);
        code += makeArray(res, name, pgm);
    }

    return code;
}

//#region etc
function save_png(cv, name) {
    let link = document.createElement('a');
    link.href = cv.toDataURL('image/png');
    link.download = name + '.png';
    link.click();
}

function fil_png_h() {
    save_png(cvimg.cv, ui_out.name + '.filt');
}
function proc_png_h() {
    save_png(conv.cv, ui_out.name + '.proc');
}
function gray_h(show) {
    grayFilters.forEach(f => ui_in.widget(f).display(show));
    update_h();
}
function vignette_h(show) {
    vignetteFilters.forEach(f => ui_in.widget(f).display(show));
    update_h();
}
function fil_show_h(show) {
    cvimg.cv.classList.toggle('hidden', !show);
}
function proc_show_h(show) {
    conv.cv.classList.toggle('hidden', !show);
}
function prev_width_h(w) {
    document.body.style.setProperty('--maxw', w + 'px');
}