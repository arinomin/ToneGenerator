// ===== Audio Context & State =====
const ctx = new (window.AudioContext || window.webkitAudioContext)();
let oscillator = null;
let gainNode = null;
let analyser = null;
let isPlaying = false;

// ===== DOM Elements =====
const playButton = document.getElementById('playButton');
const frequencyInput = document.getElementById('frequency');
const noteSelect = document.getElementById('note');
const octaveSelect = document.getElementById('octave');
const waveformSelect = document.getElementById('waveform');
const volumeInput = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const modeSelect = document.getElementById('mode');
const status = document.getElementById('status');
const pianoKeyboard = document.getElementById('pianoKeyboard');
const oscilloscopeCanvas = document.getElementById('oscilloscope');
const helpSection = document.getElementById('helpSection');
const helpToggle = document.getElementById('helpToggle');
const octaveDisplay = document.getElementById('octaveDisplay');
const octaveUpBtn = document.getElementById('octaveUp');
const octaveDownBtn = document.getElementById('octaveDown');

// ===== Constants =====
const noteOffsets = {
  'C': 0, 'D♭': 1, 'D': 2, 'E♭': 3, 'E': 4, 'F': 5,
  'F♯': 6, 'G': 7, 'A♭': 8, 'A': 9, 'B♭': 10, 'B': 11
};
const noteNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const A4_FREQ = 440;
const A4_OCTAVE = 4;
const A4_NOTE_OFFSET = noteOffsets['A'];

// ===== Frequency Calculations =====
function calculateFrequency(note, octave) {
  const noteOffset = noteOffsets[note];
  const totalOffset = (octave - A4_OCTAVE) * 12 + (noteOffset - A4_NOTE_OFFSET);
  return A4_FREQ * Math.pow(2, totalOffset / 12);
}

function frequencyToNote(freq) {
  const semitonesFromA4 = 12 * Math.log2(freq / A4_FREQ);
  const totalSemitones = Math.round(semitonesFromA4);
  const noteIndex = ((totalSemitones % 12) + 12 + A4_NOTE_OFFSET) % 12;
  const octave = A4_OCTAVE + Math.floor((totalSemitones + A4_NOTE_OFFSET) / 12);
  return {
    note: noteNames[noteIndex],
    octave: Math.max(1, Math.min(9, octave))
  };
}

function updateFrequency() {
  const note = noteSelect.value;
  const octave = parseInt(octaveSelect.value);
  const freq = calculateFrequency(note, octave);
  frequencyInput.value = freq.toFixed(2);
  octaveDisplay.textContent = octave;
  updatePianoKeyboard();
  if (isPlaying) {
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  }
}

// ===== Piano Keyboard =====
function updatePianoKeyboard() {
  const currentNote = noteSelect.value;
  const keys = pianoKeyboard.querySelectorAll('.piano-key');
  keys.forEach(key => {
    key.classList.toggle('active', key.dataset.note === currentNote);
  });
}

function initPianoKeyboard() {
  const keys = pianoKeyboard.querySelectorAll('.piano-key');
  keys.forEach(key => {
    key.addEventListener('click', () => {
      noteSelect.value = key.dataset.note;
      updateFrequency();
    });
  });
  updatePianoKeyboard();
}

// ===== Oscilloscope =====
function initOscilloscope() {
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  const canvas = oscilloscopeCanvas;
  const canvasCtx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvasCtx.fillStyle = '#12121f';
    canvasCtx.fillRect(0, 0, width, height);

    // Center line
    canvasCtx.strokeStyle = '#2a2a4a';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height / 2);
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();

    // Waveform
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = isPlaying ? '#00d4ff' : '#3a4a5a';
    canvasCtx.shadowBlur = isPlaying ? 8 : 0;
    canvasCtx.shadowColor = '#00d4ff';

    canvasCtx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }

    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
    canvasCtx.shadowBlur = 0;
  }

  draw();
}

// ===== Volume =====
function updateVolumeDisplay() {
  volumeValue.textContent = `${volumeInput.value}%`;
}

function setVolume(value) {
  volumeInput.value = Math.max(0, Math.min(100, value));
  updateVolumeDisplay();
  if (isPlaying && gainNode) {
    gainNode.gain.setValueAtTime(volumeInput.value / 100, ctx.currentTime);
  }
}

// ===== Audio Playback =====
function startTone() {
  if (oscillator) oscillator.stop();

  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();
  oscillator.type = waveformSelect.value;
  oscillator.frequency.setValueAtTime(parseFloat(frequencyInput.value), ctx.currentTime);
  gainNode.gain.setValueAtTime(volumeInput.value / 100, ctx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(ctx.destination);
  oscillator.start();

  isPlaying = true;
  status.textContent = '再生中';
  status.classList.add('playing');
  playButton.textContent = '停止';
  playButton.classList.remove('play');
  playButton.classList.add('stop');
}

function stopTone() {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
    gainNode = null;
    isPlaying = false;
    status.textContent = '停止中';
    status.classList.remove('playing');
    playButton.textContent = '再生';
    playButton.classList.remove('stop');
    playButton.classList.add('play');
  }
}

// ===== Help Toggle =====
function initHelp() {
  helpToggle.addEventListener('click', () => {
    helpSection.classList.toggle('open');
  });
}

// ===== Event Listeners =====

// Play button
playButton.addEventListener('click', () => {
  if (modeSelect.value === 'toggle') {
    isPlaying ? stopTone() : startTone();
  }
});

playButton.addEventListener('mousedown', () => {
  if (modeSelect.value === 'hold' && !isPlaying) startTone();
});

playButton.addEventListener('mouseup', () => {
  if (modeSelect.value === 'hold' && isPlaying) stopTone();
});

playButton.addEventListener('mouseleave', () => {
  if (modeSelect.value === 'hold' && isPlaying) stopTone();
});

// Touch events
playButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (modeSelect.value === 'hold' && !isPlaying) startTone();
  else if (modeSelect.value === 'toggle') isPlaying ? stopTone() : startTone();
});

playButton.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (modeSelect.value === 'hold' && isPlaying) stopTone();
});

// Octave buttons
octaveUpBtn.addEventListener('click', () => changeOctave(1));
octaveDownBtn.addEventListener('click', () => changeOctave(-1));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (modeSelect.value === 'hold') {
        if (!isPlaying) startTone();
      } else if (!e.repeat) {
        isPlaying ? stopTone() : startTone();
      }
      break;
    case 'ArrowLeft': e.preventDefault(); changeNote(-1); break;
    case 'ArrowRight': e.preventDefault(); changeNote(1); break;
    case 'ArrowUp': e.preventDefault(); changeOctave(1); break;
    case 'ArrowDown': e.preventDefault(); changeOctave(-1); break;
    case 'KeyW': e.preventDefault(); cycleWaveform(); break;
    case 'Digit1': case 'Digit2': case 'Digit3':
    case 'Digit4': case 'Digit5': case 'Digit6':
    case 'Digit7': case 'Digit8': case 'Digit9':
      e.preventDefault();
      octaveSelect.value = e.code.replace('Digit', '');
      updateFrequency();
      break;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && modeSelect.value === 'hold') stopTone();
});

function changeNote(direction) {
  const currentIndex = noteNames.indexOf(noteSelect.value);
  let newIndex = currentIndex + direction;

  if (newIndex < 0) {
    newIndex = noteNames.length - 1;
    changeOctave(-1);
  } else if (newIndex >= noteNames.length) {
    newIndex = 0;
    changeOctave(1);
  }

  noteSelect.value = noteNames[newIndex];
  updateFrequency();
}

function changeOctave(direction) {
  const current = parseInt(octaveSelect.value);
  const newVal = Math.max(1, Math.min(9, current + direction));
  octaveSelect.value = newVal;
  updateFrequency();
}

function cycleWaveform() {
  const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
  const idx = waveforms.indexOf(waveformSelect.value);
  waveformSelect.value = waveforms[(idx + 1) % waveforms.length];
  if (isPlaying) { stopTone(); startTone(); }
}

// Frequency input sync
frequencyInput.addEventListener('input', () => {
  const freq = parseFloat(frequencyInput.value);
  if (!isNaN(freq) && freq > 0) {
    const { note, octave } = frequencyToNote(freq);
    noteSelect.value = note;
    octaveSelect.value = octave;
    octaveDisplay.textContent = octave;
    updatePianoKeyboard();
    if (isPlaying) oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  }
});

// Waveform change
waveformSelect.addEventListener('change', () => {
  if (isPlaying) { stopTone(); startTone(); }
});

// Volume
volumeInput.addEventListener('input', () => {
  updateVolumeDisplay();
  if (isPlaying && gainNode) gainNode.gain.setValueAtTime(volumeInput.value / 100, ctx.currentTime);
});

volumeInput.addEventListener('wheel', (e) => {
  e.preventDefault();
  setVolume(parseInt(volumeInput.value) + (e.deltaY > 0 ? -5 : 5));
});

// ===== Initialize =====
function init() {
  updateFrequency();
  updateVolumeDisplay();
  initPianoKeyboard();
  initOscilloscope();
  initHelp();
}

init();
