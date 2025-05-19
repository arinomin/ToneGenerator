const ctx = new (window.AudioContext || window.webkitAudioContext)();
let oscillator = null;
let gainNode = null;
let isPlaying = false;

const controls = document.getElementById('controls');
const playButton = document.getElementById('playButton');
const frequencyInput = document.getElementById('frequency');
const noteSelect = document.getElementById('note');
const octaveSelect = document.getElementById('octave');
const waveformSelect = document.getElementById('waveform');
const volumeInput = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const volumeUp = document.getElementById('volumeUp');
const volumeDown = document.getElementById('volumeDown');
const modeSelect = document.getElementById('mode');
const status = document.getElementById('status');

const noteOffsets = {
  'C': 0, 'D♭': 1, 'D': 2, 'E♭': 3, 'E': 4, 'F': 5,
  'F♯': 6, 'G': 7, 'A♭': 8, 'A': 9, 'B♭': 10, 'B': 11
};
const A4_FREQ = 440;
const A4_OCTAVE = 4;
const A4_NOTE_OFFSET = noteOffsets['A'];

function calculateFrequency(note, octave) {
  const noteOffset = noteOffsets[note];
  const totalOffset = (octave - A4_OCTAVE) * 12 + (noteOffset - A4_NOTE_OFFSET);
  return A4_FREQ * Math.pow(2, totalOffset / 12);
}

function updateFrequency() {
  const note = noteSelect.value;
  const octave = parseInt(octaveSelect.value);
  const freq = calculateFrequency(note, octave);
  frequencyInput.value = freq.toFixed(2);
  if (isPlaying) {
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  }
}

noteSelect.addEventListener('change', updateFrequency);
octaveSelect.addEventListener('change', updateFrequency);

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

function startTone() {
  if (oscillator) {
    oscillator.stop();
  }
  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();
  oscillator.type = waveformSelect.value;
  oscillator.frequency.setValueAtTime(parseFloat(frequencyInput.value), ctx.currentTime);
  gainNode.gain.setValueAtTime(volumeInput.value / 100, ctx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
  isPlaying = true;
  status.textContent = '再生中';
  status.classList.add('playing');
  controls.classList.add('playing');
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
    controls.classList.remove('playing');
    playButton.textContent = '再生';
    playButton.classList.remove('stop');
    playButton.classList.add('play');
  }
}

playButton.addEventListener('click', () => {
  if (modeSelect.value === 'toggle') {
    if (isPlaying) {
      stopTone();
    } else {
      startTone();
    }
  }
});

playButton.addEventListener('mousedown', () => {
  if (modeSelect.value === 'hold' && !isPlaying) {
    startTone();
  }
});

playButton.addEventListener('mouseup', () => {
  if (modeSelect.value === 'hold' && isPlaying) {
    stopTone();
  }
});

playButton.addEventListener('mouseleave', () => {
  if (modeSelect.value === 'hold' && isPlaying) {
    stopTone();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (modeSelect.value === 'hold') {
      if (!isPlaying) {
        startTone();
      }
    } else if (modeSelect.value === 'toggle' && !event.repeat) {
      if (isPlaying) {
        stopTone();
      } else {
        startTone();
      }
    }
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code === 'Space' && modeSelect.value === 'hold') {
    stopTone();
  }
});

frequencyInput.addEventListener('input', () => {
  if (isPlaying) {
    oscillator.frequency.setValueAtTime(parseFloat(frequencyInput.value), ctx.currentTime);
  }
});

waveformSelect.addEventListener('change', () => {
  if (isPlaying) {
    stopTone();
    startTone();
  }
});

volumeInput.addEventListener('input', () => {
  updateVolumeDisplay();
  if (isPlaying && gainNode) {
    gainNode.gain.setValueAtTime(volumeInput.value / 100, ctx.currentTime);
  }
});

volumeUp.addEventListener('click', () => {
  setVolume(parseInt(volumeInput.value) + 1);
});

volumeDown.addEventListener('click', () => {
  setVolume(parseInt(volumeInput.value) - 1);
});

// タッチイベント用の追加
playButton.addEventListener('touchstart', (event) => {
  event.preventDefault(); // デフォルトのタッチ動作を防止
  if (modeSelect.value === 'hold' && !isPlaying) {
    startTone();
  } else if (modeSelect.value === 'toggle') {
    if (isPlaying) {
      stopTone();
    } else {
      startTone();
    }
  }
});

updateFrequency();
updateVolumeDisplay();
volumeInput.addEventListener('wheel', (event) => {
  event.preventDefault(); // デフォルトのスクロール動作を防止
  const delta = Math.sign(event.deltaY); // スクロール方向を判定
  setVolume(parseInt(volumeInput.value) + (delta === 1 ? -1 : 1)); // 音量を調整
});
