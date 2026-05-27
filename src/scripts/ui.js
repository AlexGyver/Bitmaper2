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

export let colors = {};

let files = null;

const grayFilters = ['posterize', 'sharpen', 'sobel', 'dither', 'thresh', 'contour', 'invert'];
const saveCfg = ['prev_width', 'fil_show', 'proc_show', 'proc_grid'];

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
    colors = { off: dark ? '#1e232a' : '#fff', on: dark ? '#478be6' : '#000000' };
}

//#region init
export function initUI() {
    // =============== ui_in ===============
    ui_in = new UI({ parent: app.$ui_in, width: 'unset' })
        .addFile('file', 'File', file_h)
        .addInput('link', 'Link', '', file_h)
        .addButton('paste', 'Paste', paste_h)
        .addSpace()
        .addNumber('width', 'Width', 128, 1, resize_h)
        .addNumber('height', 'Height', 64, 1, resize_h)
        .addSwitch('precise_zoom', 'Precise zoom', false, (v) => cvimg.setZoomScale(v ? 0.05 : 1))
        .addButton('fit', 'Fit', () => cvimg.fit())
        .addSwitch('mirror_x', 'Mirror X', false, update_h)
        .addSwitch('mirror_y', 'Mirror Y', false, update_h)
        .addSlider('angle', 'Rotate', 0, -180, 180, 5, update_h)
        .addSpace()
        .addSwitch('bblack', 'Black Background', false, update_h)
        .addSlider('brightness', 'Brightness', 100, 0, 300, 5, update_h)
        .addSlider('contrast', 'Contrast', 100, 0, 300, 5, update_h)
        .addSlider('saturate', 'Saturation', 100, 0, 300, 5, update_h)
        .addSlider('blur', 'Blur', 0, 0, 1, 0.05, update_h)
        .addSlider('posterizeRGB', 'Posterize RGB', 0, 0, 64, 1, update_h)
        .addSpace()
        .addSwitch('mask', 'Color mask', false, mask_h)
        .addColor('mask_color', 'Color', '#000000', update_h)
        .addSlider('mask_tol', 'Tolerance', 0, 0, 400, 1, update_h)
        .addSlider('mask_amp', 'Amplify', 1, 1, 10, 0.5, update_h)
        .addSpace()
        .addSwitch('gray', 'Gray Filters', false, gray_h)
        .addSwitch('sharpen', 'Sharpen', 0, update_h)
        .addSlider('sobel', 'Edges Sobel', 0, 0, 1, 0.05, update_h)
        .addSlider('posterize', 'Posterize', 0, 0, 32, 1, update_h)
        .addSelect('dither', 'Dithering', ['None', 'Floyd-Steinberg', 'JJN', 'Bayer'], update_h)
        .addSlider('thresh', 'Threshold', 0, 0, 255, 1, update_h)
        // .addSwitch('median', 'Edges Median', 0, update_h)
        .addSelect('contour', 'Contour', ['None', '4-dir', '8-dir'], update_h)
        .addSwitch('invert', 'Invert', 0, update_h)
        .addSpace()
        .addButton('reset', 'Reset', reset_h)
        .addSpace()
        .addSlider('prev_width', 'Preview width', 900, 50, 1500, 1, prev_width_h)
        .addSwitch('fil_show', 'Show filter preview', true, fil_show_h)
        .addButton('fil_png', 'Save filter .png', fil_png_h)
        .addSpace()
        .addSwitch('proc_show', 'Show process preview', true, proc_show_h)
        .addSlider('proc_grid', 'Show grid', 0, 0, 0.3, 0.01, update_h)
        .addButton('proc_png', 'Save process .png', proc_png_h)

    if (isTouch()) ui_in.widget('precise_zoom').hide();

    // =============== ui_sel ===============
    ui_sel = new UI({ parent: app.$ui_out, width: 'unset' })
        .addSelect('conv', 'Converter', converters.map(v => v.name), change_conv)
        .addSwitch('auto_encode', 'Auto encode', true)
        .addButton('encode', 'Encode', () => conv.show())

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
    gray_h(false);
    mask_h(false);

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
        let img = await loadImage(f);
        cvimg.setImage(img.image, reset);
        if (reset) {
            ui_out.name = img.name;
            cvimg.fit();
        }
        update_h();

    } catch (e) {
        alert(e);
    }
}

function reset_h() {
    ['bblack', 'brightness', 'contrast', 'saturate', 'blur', 'posterizeRGB',
        'mask', 'mask_color', 'mask_tol', 'mask_amp', ...grayFilters].forEach(f => ui_in.getWidget(f).default());
    update_h();
}
export function update_h() {
    cvimg.setFilter(ui_in.toObject());
    cvimg.show();
    let data = cvimg.getData();
    if (data) conv.setData(data, cvimg.cv.width, cvimg.cv.height);
}

function resize_h() {
    let w = ui_in.width, h = ui_in.height;
    document.body.style.setProperty('--ratio', w / h);
    cvimg.cv.width = w;
    cvimg.cv.height = h;
    update_h();
}

//#region encode-make
async function encode() {
    let res;
    if (!files) {
        res = await conv.encode();
        ui_out.result = `Saved ${res.byteLength} bytes`;
    } else {
        res = [];
        for (let file of files) {
            await loadFile(file, false);
            res.push(await conv.encode());
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
    if (!res) return;

    download(new Blob([encodeText(makeH(res))], { type: "text/plain" }), ui_out.name + '.h');
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

    let ok = await fetchT(window.location.href + `bitmap?width=${conv.img.W}&height=${conv.img.H}&type=${conv.ext}`, {
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
        code += header(`${res.length} images, ${size} bytes`, conv.img.W, conv.img.H);

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
        code += header(`${res.byteLength} bytes`, conv.img.W, conv.img.H);
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
    grayFilters.forEach(f => ui_in.getWidget(f).display(show));
    update_h();
}
function mask_h(show) {
    ['mask_tol', 'mask_amp'].forEach(f => ui_in.getWidget(f).display(show));
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