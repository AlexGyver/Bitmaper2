//#region Floyd–Steinberg
export const divFS = 16;

export const matrixFS = [
    [1, 0, 7],
    [-1, 1, 3],
    [0, 1, 5],
    [1, 1, 1],
];

//#region Jarvis–Judice–Ninke
export const divJJN = 48;

export const matrixJJN = [
    [1, 0, 7],
    [2, 0, 5],

    [-2, 1, 3],
    [-1, 1, 5],
    [0, 1, 7],
    [1, 1, 5],
    [2, 1, 3],

    [-2, 2, 1],
    [-1, 2, 3],
    [0, 2, 5],
    [1, 2, 3],
    [2, 2, 1],
];

//#region Stucki
export const divStucki = 42;

export const matrixStucki = [
    [1, 0, 8],
    [2, 0, 4],

    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 8],
    [1, 1, 4],
    [2, 1, 2],

    [-2, 2, 1],
    [-1, 2, 2],
    [0, 2, 4],
    [1, 2, 2],
    [2, 2, 1],
];

//#region Sierra 3-row
export const divSierra3 = 32;

export const matrixSierra3 = [
    [1, 0, 5],
    [2, 0, 3],

    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 5],
    [1, 1, 4],
    [2, 1, 2],

    [-1, 2, 2],
    [0, 2, 3],
    [1, 2, 2],
];

//#region Sierra 2-row
export const divSierra2 = 16;

export const matrixSierra2 = [
    [1, 0, 4],
    [2, 0, 3],

    [-2, 1, 1],
    [-1, 1, 2],
    [0, 1, 3],
    [1, 1, 2],
    [2, 1, 1],
];

//#region Sierra Lite
export const divSierraLite = 4;

export const matrixSierraLite = [
    [1, 0, 2],
    [-1, 1, 1],
    [0, 1, 1],
];

//#region Atkinson
export const divAtkinson = 8;

export const matrixAtkinson = [
    [1, 0, 1],
    [2, 0, 1],

    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],

    [0, 2, 1],
];

//#region Burkes
export const divBurkes = 32;

export const matrixBurkes = [
    [1, 0, 8],
    [2, 0, 4],

    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 8],
    [1, 1, 4],
    [2, 1, 2],
];

//#region Bayer matrices
export const matrixBayer = [
    [
        [0, 2],
        [3, 1],
    ],
    [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
    ],
    [
        [0, 32, 8, 40, 2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21],
    ]
];