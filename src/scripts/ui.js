import UI from "@alexgyver/ui";
import ImageCanvas from "./ImageCanvas";
import loadImage from "./ImageLoader";
import DragBlock from "@alexgyver/drag-block";
import { app } from "./app";
import { change_conv, conv, converters } from "./converters";
import { clipWrite, decodeText, download, encodeText, fetchT, LS } from "@alexgyver/utils";

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
let res;
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

function setDark(dark) {
    dark ? document.body.classList.add('darkmode') : document.body.classList.remove('darkmode');
    let theme = (dark ? 'dark' : 'light');
    [ui_in, ui_out, ui_conv, ui_sel].forEach(ui => ui.setTheme(theme));
    colors = { off: dark ? '#1e232a' : '#fff', on: dark ? '#478be6' : '#000000' };
}

export function initUI() {
    // =============== ui_in ===============
    ui_in = new UI({ parent: app.$ui_in, width: 'unset' })
        .addFile('file', 'File', file_h)
        .addInput('link', 'Link', '', file_h)
        .addButton('paste', 'Paste', paste_h)
        .addSpace()
        .addNumber('width', 'Width', 128, 1, resize_h)
        .addNumber('height', 'Height', 64, 1, resize_h)
        .addButton('fit', 'Fit', () => cvimg.fit())
        .addRange('angle', 'Rotate', 0, -180, 180, 5, update_h)
        .addSpace()
        .addSwitch('bblack', 'Black Background', false, update_h)
        .addRange('brightness', 'Brightness', 100, 0, 300, 5, update_h)
        .addRange('contrast', 'Contrast', 100, 0, 300, 5, update_h)
        .addRange('saturate', 'Saturation', 100, 0, 300, 5, update_h)
        .addRange('blur', 'Blur', 0, 0, 1, 0.05, update_h)
        .addSpace()
        .addSwitch('mask', 'Color mask', false, mask_h)
        .addColor('mask_color', 'Color', '#000000', update_h)
        .addRange('mask_tol', 'Tolerance', 0, 0, 400, 1, update_h)
        .addRange('mask_amp', 'Amplify', 1, 1, 10, 0.5, update_h)
        .addSpace()
        .addSwitch('gray', 'Gray Filters', false, gray_h)
        .addSwitch('edges', 'Edges Simple', 0, update_h)
        .addRange('sobel', 'Edges Sobel', 0, 0, 1, 0.05, update_h)
        .addSelect('dither', 'Dithering', ['None', 'Floyd-Steinberg', 'JJN', 'Bayer', 'Riemersma'], update_h)
        .addSlider('thresh', 'Threshold', 0, 0, 255, 1, update_h)
        .addSwitch('median', 'Edges Median', 0, update_h)
        .addSwitch('invert', 'Invert', 0, update_h)
        .addSpace()
        .addButton('reset', 'Reset', reset_h)
        .addSpace()
        .addSlider('prev_width', 'Preview width', 900, 50, 1500, 1, prev_width_h)
        .addSwitch('fil_show', 'Show filter preview', true, fil_show_h)
        .addButton('fil_png', 'Save filter .png', fil_png_h)
        .addSwitch('proc_show', 'Show process preview', true, proc_show_h)
        .addButton('proc_png', 'Save process .png', proc_png_h)

    // =============== ui_sel ===============
    ui_sel = new UI({ parent: app.$ui_out, width: 'unset' })
        .addSelect('conv', 'Converter', converters.map(v => v.name), change_conv)

    // =============== ui_conv ===============
    ui_conv = new UI({ parent: app.$ui_out, width: 'unset' })


    // =============== ui_out ===============
    ui_out = new UI({ parent: app.$ui_out, width: 'unset' })
        .addInput('name', 'Name', 'none')
        .addSwitch('pgm', 'PROGMEM', true)
        .addButton('encode', 'Encode', encode_h)
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

    gray_h(false);
    mask_h(false);
}

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
    ['bblack', 'brightness', 'contrast', 'saturate', 'blur',
        'mask', 'mask_color', 'mask_tol', 'mask_amp', 'gray',
        'edges', 'sobel', 'dither', 'thresh', 'median', 'invert'].forEach(f => ui_in.getWidget(f).default());
    update_h();
}
export function update_h() {
    cvimg.setFilter(ui_in.toObject());
    cvimg.show();
    let data = cvimg.getData();
    if (data) conv.convert(data, cvimg.cv.width, cvimg.cv.height);
}

function resize_h() {
    let w = ui_in.width, h = ui_in.height;
    document.body.style.setProperty('--ratio', w / h);
    cvimg.cv.width = w;
    cvimg.cv.height = h;
    update_h();
}

async function encode_h() {
    if (!files) {
        res = await conv.encode();
        ui_out.result = `Done! ${res.byteLength} bytes`;
    } else {
        res = [];
        for (let file of files) {
            await loadFile(file, false);
            res.push(await conv.encode());
        }
        let size = 0;
        res.forEach(r => size += r.byteLength);
        ui_out.result = `Done! ${res.length} images, ${size} bytes`;
    }
}

function copy_h() {
    if (!res) return;

    if (conv.plainText) {
        clipWrite(decodeText(res));
        return;
    }

    clipWrite(makeH());
}
function saveH_h() {
    if (!res) return;
    download(new Blob([encodeText(makeH())], { type: "text/plain" }), ui_out.name + '.h');
}
function saveBin_h() {
    if (!res) return;
    download(new Blob([res], { type: "application/octet-stream" }), ui_out.name + '.' + conv.ext);
}
async function send_h() {
    if (!res) return;
    let formData = new FormData();
    formData.append('bitmap', new Blob([res], { type: "application/octet-stream" }));

    let ok = await fetchT(window.location.href + `bitmap?width=${conv.img.W}&height=${conv.img.H}&type=${conv.ext}`, {
        method: 'POST',
        body: formData,
        timeout: 2000
    });
    alert(ok ? 'Sent' : 'Send error');
}
function makeArray(bin, name) {
    let pad = bin.BYTES_PER_ELEMENT * 2;
    let pgm = ui_out.pgm ? 'PROGMEM ' : '';
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

function makeH() {
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

    if (conv.plainText) {
        let w = conv.img.W;
        let lines = decodeText(res).split("\n");
        let h = lines.length;
        let code = header(`${res.byteLength} bytes`, w, h);
        code += `${conv.prefix} ${name}[] ${pgm}=\n`;
        code += lines.map(line => `\t"${line.replace(/"/g, '\\"')}\\n"`).join("\n");
        code = code.slice(0, -3);
        code += '";';
        return code;
    }

    if (Array.isArray(res)) {
        let size = 0;
        res.forEach(r => size += r.byteLength);
        code += header(`${res.length} images, ${size} bytes`, conv.img.W, conv.img.H);

        let names = '';
        for (let i in res) {
            let cur = name + '_' + i;
            code += makeArray(res[i], cur) + '\n\n';
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
        code += makeArray(res, name);
    }

    return code;
}

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
    ['edges', 'sobel', 'dither', 'thresh', 'median', 'invert'].forEach(f => ui_in.getWidget(f).display(show));
    update_h();
}
function mask_h(show) {
    ['mask_tol', 'mask_amp'].forEach(f => ui_in.getWidget(f).display(show));
    update_h();
}
function fil_show_h(show) {
    cvimg.cv.classList.toggle('hidden');
}
function proc_show_h(show) {
    conv.cv.classList.toggle('hidden');
}
function prev_width_h(w) {
    document.body.style.setProperty('--maxw', w + 'px');
}