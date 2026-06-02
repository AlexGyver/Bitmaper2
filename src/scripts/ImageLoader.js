export default async function loadImage(val) {
    return new Promise((resolve, reject) => {
        let name = 'bitmap';
        let objectUrl = '';

        const image = new Image();

        const cleanup = () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = '';
            }
        };

        image.addEventListener('load', () => {
            cleanup();

            if (image.naturalWidth && image.naturalHeight) {
                resolve({ image, name });
            } else {
                reject(new Error("Image error"));
            }
        });

        image.addEventListener('error', () => {
            cleanup();
            reject(new Error("Image load error"));
        });

        switch (typeof val) {
            case 'object': {
                if (!(val instanceof Blob) || !val.type.startsWith('image/')) {
                    return reject(new Error("Not an image"));
                }

                objectUrl = URL.createObjectURL(val);
                image.src = objectUrl;
                name = _getName(val.name || 'bitmap');
                break;
            }

            case 'string': {
                if (val.startsWith('data:image/') && val.includes(';base64,')) {
                    image.src = val;
                    name = 'bitmap';
                    break;
                }

                if (!/^https?:\/\//i.test(val)) {
                    return reject(new Error("Not a link"));
                }

                image.crossOrigin = "anonymous";
                image.src = val;
                name = _getNameFromUrl(val);
                break;
            }

            default:
                return reject(new Error("Image error"));
        }
    });
}

function _getNameFromUrl(url) {
    try {
        const u = new URL(url);
        return _getName(u.pathname);
    } catch {
        return _getName(url);
    }
}

function _getName(str = '') {
    let base = String(str).split('/').pop() || 'bitmap';

    const dot = base.lastIndexOf('.');
    if (dot > 0) base = base.slice(0, dot);

    base = base
        .replaceAll('-', '_')
        .replaceAll(' ', '_')
        .replace(/[^\w]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 10);

    if (!base) base = 'bitmap';
    else if (/^\d/.test(base)) base = 'b' + base;

    return base;
}