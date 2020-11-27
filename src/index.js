import * as Tone from 'tone';
import './style.css';
import {
    FFT_SIZE,
    MIN_AMP_DB,
    MAX_AMP_DB,
    MIN_FREQ,
    MAX_FREQ,
    FG_COLOR,
    BG_COLOR,
    LINE_COLOR,
    FORMANT_COLORS,
    NUM_FORMANTS,
} from './constants';
import { FormantFilter } from './formant-filter';

const canvas = document.getElementById('canvas');
const width = canvas.width;
const height = canvas.height;

canvas.width *= window.devicePixelRatio;
canvas.height *= window.devicePixelRatio;

// audio

const osc = new Tone.Oscillator(440, 'sawtooth');
const oscGain = new Tone.Gain(1);

const noise = new Tone.Noise('white');
const noiseGain = new Tone.Gain(0);

const gate = new Tone.Volume(20);
gate.mute = true;

const filter = new FormantFilter(width);

const reverb = new Tone.Reverb().set({
    wet: 0.3,
    decay: 0.5,
    preDelay: 0.01,
});
const masterGain = new Tone.Gain();
const limiter = new Tone.Limiter(-20);

const analyser = Tone.context.createAnalyser();
analyser.maxDecibels = MAX_AMP_DB;
analyser.minDecibels = MIN_AMP_DB;
analyser.fftSize = FFT_SIZE;
const freqData = new Uint8Array(FFT_SIZE / 2);

osc.chain(oscGain, gate);
noise.chain(noiseGain, gate);
gate.connect(filter.input);
filter.connect(reverb);
reverb.chain(new Tone.Volume(-10), masterGain, limiter, Tone.Destination);
filter.connect(analyser);

osc.start();
noise.start();

// visualizer

const ctx = canvas.getContext('2d');
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
ctx.lineCap = 'round';
ctx.font = 'bold 14px Inter';
ctx.textAlign = 'center';

function dbToY(db) {
    return height * (1 - (db - MIN_AMP_DB) / (MAX_AMP_DB - MIN_AMP_DB));
}

function drawHLine(db) {
    const y = dbToY(db);
    ctx.fillStyle = FG_COLOR;
    ctx.fillText(db, 15, y + 5);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width, y);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = LINE_COLOR;
    ctx.stroke();
}

function drawVLine(freq) {
    const x = ((freq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)) * width;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height - 10);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = LINE_COLOR;
    ctx.stroke();

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(x - 15, height - 20, 30, 20);

    let value = freq;
    if (value >= 1000) {
        value = Math.floor(value / 1000) + 'k';
    }
    ctx.fillStyle = FG_COLOR;
    ctx.fillText(value, x, height - 5);
}

function drawCurve() {
    for (let formantNum = 0; formantNum < NUM_FORMANTS; ++formantNum) {
        const freqResponse = filter.getFrequencyResponse(formantNum);
        ctx.beginPath();
        ctx.moveTo(0, dbToY(freqResponse[0]));
        for (let i = 1; i < freqResponse.length; ++i) {
            ctx.lineTo(i, dbToY(freqResponse[i]));
        }
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = FORMANT_COLORS[formantNum];
        ctx.stroke();
    }
}

function drawSpectrum() {
    analyser.getByteFrequencyData(freqData);
    ctx.beginPath();
    ctx.moveTo(0, ((255 - freqData[0]) / 255) * height);
    const binWidth = Tone.context.sampleRate / 2 / freqData.length;
    for (let i = 1; i < freqData.length; ++i) {
        const x = (width / (MAX_FREQ - MIN_FREQ)) * (binWidth * i - MIN_FREQ);
        const y = ((255 - freqData[i]) / 255) * height;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = FG_COLOR + '90';
    ctx.fill();
}

function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    drawHLine(0);
    drawHLine(-30);
    drawHLine(-60);

    for (let f = 1000; f < MAX_FREQ; f += 1000) {
        drawVLine(f);
    }

    drawSpectrum();
    drawCurve();

    requestAnimationFrame(draw);
}

draw();

// UI

const volume = document.getElementById('volume');
volume.addEventListener('input', () => {
    masterGain.gain.value = +volume.value;
});
masterGain.gain.value = +volume.value;

[
    ['freq-shift', 'frequencyShift'],
    ['q-factor', 'qFactor'],
].forEach(([id, param]) => {
    const slider = document.getElementById(id);
    slider.addEventListener('input', () => {
        filter[param] = +slider.value;
    });
    filter[param] = +slider.value;
});

const mix = document.getElementById('mix');
function updateMix() {
    oscGain.gain.value = 1 - +mix.value;
    noiseGain.gain.value = +mix.value;
}
mix.addEventListener('input', updateMix);
updateMix();

const oscFreq = document.getElementById('osc-freq');
function updateOscFreq() {
    osc.frequency.value = Math.pow(10, +oscFreq.value);
}
oscFreq.addEventListener('input', updateOscFreq);
updateOscFreq();

const container = document.getElementById('bislider-container');
const thumb = document.getElementById('bislider-thumb');

function onMouseEvent(e) {
    const { clientX, clientY } = e;
    const { height, width, x, y } = container.getBoundingClientRect();
    const valueX = Math.max(0, Math.min(1, (clientX - x) / width));
    const valueY = Math.max(0, Math.min(1, (clientY - y) / height));
    thumb.style.left = `${valueX * 100}%`;
    thumb.style.top = `${valueY * 100}%`;

    filter.setArticulation(valueX, valueY);
}

let mouseDown = false;
container.addEventListener('mousedown', (e) => {
    gate.mute = false;
    mouseDown = true;
    onMouseEvent(e);
});
window.addEventListener('mouseup', () => {
    gate.mute = true;
    mouseDown = false;
});
window.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        onMouseEvent(e);
    }
});
document.getElementsByTagName('input').forEach((input) => {
    input.addEventListener('mousedown', () => {
        gate.mute = false;
    });
});

function resume() {
    Tone.start();
}

document.addEventListener('mousedown', resume);
document.addEventListener('keydown', resume);
