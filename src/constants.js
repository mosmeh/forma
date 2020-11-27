export const MIN_FREQ = 0;
export const MAX_FREQ = 4000;
export const MAX_AMP_DB = 10;
export const MIN_AMP_DB = -80;

export const FFT_SIZE = 2048;

export const FG_COLOR = '#7b7b7b';
export const BG_COLOR = '#383838';
export const LINE_COLOR = '#505050';
export const FORMANT_COLORS = [
    '#F94144',
    '#F8961E',
    '#F9C74F',
    '#90BE6D',
    '#277DA1',
];

// "bass" from http://www.csounds.com/manual/html/MiscFormants.html
export const FORMANTS = {
    freq: {
        a: [600, 1040, 2250, 2450, 2750],
        e: [400, 1620, 2400, 2800, 3100],
        i: [250, 1750, 2600, 3050, 3340],
        o: [400, 750, 2400, 2600, 2900],
        u: [350, 600, 2400, 2675, 2950],
    },
    amp: {
        a: [0, -7, -9, -9, -20],
        e: [0, -12, -9, -12, -18],
        i: [0, -30, -16, -22, -28],
        o: [0, -11, -21, -20, -40],
        u: [0, -20, -32, -28, -36],
    },
    bw: {
        a: [60, 70, 110, 120, 130],
        e: [40, 80, 100, 120, 120],
        i: [60, 90, 100, 120, 120],
        o: [40, 80, 100, 120, 120],
        u: [40, 80, 100, 120, 120],
    },
};
export const NUM_FORMANTS = 5;
