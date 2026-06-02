import { posterize } from "../filters/posterize.js";
import { binaryContour, canny, erode, sobelContour, sobelEdges, thinZhangSuen } from "../filters/edges.js";
import { blurN, brightness, clean, contrast, gamma, invert, median, sharpen, threshold } from "../filters/simple.js";
import { ditherAtkinson, ditherBayer, ditherBurkes, ditherFS, ditherJJN, ditherRiemersma, ditherSierra2, ditherSierra3, ditherSierraLite, ditherStucki } from "../filters/dither.js";

const filterHandlers = {
    brightness: (args, f) => brightness(...args, f.value),
    contrast: (args, f) => contrast(...args, f.value),
    gamma: (args, f) => gamma(...args, f.value),
    blur: (args, f) => blurN(...args, f.value, f.iters),
    sharpen: (args, f) => sharpen(...args, f.value),
    sobel_edges: (args, f) => sobelEdges(...args, f.value),
    posterize: (args, f) => posterize(...args, f.value),
    dither: (args, f) => {
        const ditherMap = {
            'Floyd-Steinberg': ditherFS,
            'JJN': ditherJJN,
            'Bayer2': (gray, w, h) => ditherBayer(gray, w, h, 0),
            'Bayer4': (gray, w, h) => ditherBayer(gray, w, h, 1),
            'Bayer8': (gray, w, h) => ditherBayer(gray, w, h, 2),
            'Stucki': ditherStucki,
            'Sierra2': ditherSierra2,
            'Sierra3': ditherSierra3,
            'SierraLite': ditherSierraLite,
            'Atkinson': ditherAtkinson,
            'Burkes': ditherBurkes,
            'Riemersma': ditherRiemersma,
        };
        ditherMap[f.value]?.(...args);
    },
    sobel_contour: (args, f) => sobelContour(...args, f.value),
    canny: (args, f) => canny(...args, f.value),
    threshold: (args, f) => threshold(...args, f.value),
    median: (args, f) => median(...args, f.value, f.iters),
    contour: (args, f) => binaryContour(...args, f.diag),
    thinner: (args, f) => thinZhangSuen(...args),
    erode: (args, f) => erode(...args, f.value),
    clean: (args, f) => clean(...args),
    invert: (args, f) => invert(...args),
};

self.onmessage = async e => {
    const { id, payload } = e.data;

    try {
        const { arr, w, h, filters } = payload;

        for (let f of filters) {
            const handler = filterHandlers[f.type];
            if (handler) handler([arr, w, h], f);
        }

        self.postMessage({ id, type: 'done', result: arr });
    } catch (error) {
        self.postMessage({ id, type: 'error', error });
    }
};