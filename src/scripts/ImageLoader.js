export default async function loadImage(img) {
    return new Promise((res, rej) => {
        let name;
        let image = new Image();

        image.crossOrigin = "Anonymous";
        image.addEventListener('load', () => {
            if (image.width && image.height) {
                res({ image: image, name: name });
            } else {
                rej("Image error");
            }
        });
        image.addEventListener('error', () => {
            rej("Image load error");
        });

        switch (typeof img) {
            case 'object':
                if (!img.type.toString().includes('image')) {
                    rej("Not an image");
                }
                image.src = URL.createObjectURL(img);
                name = _getName(img.name);
                break;

            case 'string':
                if (!img.startsWith('http')) {
                    rej("Not a link");
                }
                image.src = img;
                name = _getName(img);
                break;

            default:
                rej("Image error");
                break;
        }
    });
}

function _getName(str) {
    str = str.substring(str.lastIndexOf('/') + 1, str.lastIndexOf('.')).replaceAll('-', '_').replaceAll(' ', '_').substring(0, 10);
    if (!str.length) str = 'bitmap';
    else if (str[0] >= '0' && str[0] <= '9') str = 'b' + str;
    return str;
}