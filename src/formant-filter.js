import * as Tone from 'tone';
import { NUM_FORMANTS, FORMANTS, MIN_FREQ, MAX_FREQ } from './constants';

export class FormantFilter {
    constructor(freqResponseTicks) {
        this._input = new Tone.Gain();
        this._output = new Tone.Gain();

        this._filters = new Array(NUM_FORMANTS);
        this._volumes = new Array(NUM_FORMANTS);
        for (let i = 0; i < NUM_FORMANTS; ++i) {
            const filter = Tone.context.createBiquadFilter();
            filter.type = 'bandpass';
            this._filters[i] = filter;
            this._volumes[i] = new Tone.Volume();
            this._input.chain(this._volumes[i], this._filters[i], this._output);
        }

        this._freqArray = new Float32Array(freqResponseTicks);
        for (let i = 0; i < freqResponseTicks; ++i) {
            const f = i / freqResponseTicks;
            this._freqArray[i] = MIN_FREQ + (MAX_FREQ - MIN_FREQ) * f;
        }

        this._magResponse = new Float32Array(freqResponseTicks);
        this._phaseResponse = new Float32Array(freqResponseTicks);
        this._freqResponses = new Array(NUM_FORMANTS);
        for (let i = 0; i < NUM_FORMANTS; ++i) {
            this._freqResponses[i] = new Float32Array(freqResponseTicks);
        }

        this._x = this._y = 0.5;
        this._freqShift = this._qFactor = 0;
        this._updateFilters();
    }

    get input() {
        return this._input;
    }

    connect(dest) {
        this._output.connect(dest);
    }

    setArticulation(x, y) {
        this._x = x;
        this._y = y;
        this._updateFilters();
    }

    set frequencyShift(value) {
        this._freqShift = value;
        this._updateFilters();
    }

    set qFactor(value) {
        this._qFactor = value;
        this._updateFilters();
    }

    getFrequencyResponse(formantNum) {
        return this._freqResponses[formantNum];
    }

    _updateFilters() {
        for (let i = 0; i < NUM_FORMANTS; ++i) {
            let freq = interpolate(FORMANTS.freq, i, this._x, this._y);
            freq = Math.max(50, freq + 500 * this._freqShift);

            let bw = interpolate(FORMANTS.bw, i, this._x, this._y);
            bw *= Math.pow(4, -this._qFactor);

            const amp = interpolate(FORMANTS.amp, i, this._x, this._y);

            const omega = (2 * Math.PI * freq) / Tone.context.sampleRate;
            const bwOct =
                (Math.log(freq + bw / 2) - Math.log(freq - bw / 2)) / Math.LN2;
            const invQ =
                2 *
                Math.sinh((Math.LN2 / 2) * bwOct * (omega / Math.sin(omega)));

            this._filters[i].frequency.value = freq;
            this._filters[i].Q.value = 1 / invQ;
            this._volumes[i].volume.value = amp;

            this._calcFreqResponse(i);
        }
    }

    _calcFreqResponse(formantNum) {
        this._filters[formantNum].getFrequencyResponse(
            this._freqArray,
            this._magResponse,
            this._phaseResponse
        );

        const resp = this._freqResponses[formantNum];
        for (let i = 0; i < resp.length; ++i) {
            resp[i] =
                this._volumes[formantNum].volume.value +
                20 * Math.log10(this._magResponse[i]);
        }
    }
}

function bilinear(x, y, q11, q21, q12, q22) {
    return (
        q11 * (1 - x) * (1 - y) +
        q21 * x * (1 - y) +
        q12 * (1 - x) * y +
        q22 * x * y
    );
}

function interpolate(values, formantNum, x, y) {
    // I A
    // U O
    return bilinear(
        x,
        y,
        values.i[formantNum],
        values.a[formantNum],
        values.u[formantNum],
        values.o[formantNum]
    );
}
