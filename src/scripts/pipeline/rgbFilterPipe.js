import { vignetteIData } from '../filters/vignette.js';
import { posterizeIData } from '../filters/posterizeRGB.js';
import { maskHsvIData, maskHueIData, maskRgbIData } from '../filters/maskRGB.js';
import { balanceIData, blurIData, brightnessIData, contrastIData, gammaIData, mirrorIData, saturateIData } from '../filters/simpleRGB.js';

const filterHandlers = {
    mirror: (idata, f) => mirrorIData(idata, f.x, f.y),
    balance: (idata, f) => balanceIData(idata, f.r, f.g, f.b),
    vignette: (idata, f) => vignetteIData(idata, f.value, f.radius, f.size),
    posterize: (idata, f) => posterizeIData(idata, f.value),
    maskHUE: (idata, f) => maskHueIData(idata, f.color, f.value),
    maskHSV: (idata, f) => maskHsvIData(idata, f.color, f.value),
    maskRGB: (idata, f) => maskRgbIData(idata, f.color, f.value),
    brightness: (idata, f) => brightnessIData(idata, f.value),
    contrast: (idata, f) => contrastIData(idata, f.value),
    saturate: (idata, f) => saturateIData(idata, f.value),
    gamma: (idata, f) => gammaIData(idata, f.value),
    blur: (idata, f) => blurIData(idata, f.value),
};

self.onmessage = async e => {
    const { id, payload } = e.data;

    try {
        const { idata, filters } = payload;

        for (let f of filters) {
            const handler = filterHandlers[f.type];
            if (handler) handler(idata, f);
        }

        self.postMessage({ id, type: 'done', result: idata });
    } catch (error) {
        self.postMessage({ id, type: 'error', error });
    }
};