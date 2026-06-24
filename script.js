const dropzone = document.getElementById("dropzone");
const output = document.getElementById("output");
const status = document.getElementById("status");
const playButton = document.getElementById("play"); // <-- add a button in HTML

function setStatus(text) {
  status.textContent = text;
}

// --- Correct MakeCode Song Encoder ---
function encodeMakeCodeSong(midi) {
  const events = [];

  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      const mcNote = note.midi - 21; // MIDI 21 = MakeCode 0
      if (mcNote < 0 || mcNote > 87) return;

      const dur = Math.round(note.duration * 100); // seconds → 1/100 sec
      events.push({ time: note.time, mcNote, dur });
    });
  });

  if (events.length === 0) return null;

  events.sort((a, b) => a.time - b.time);

  let hex = "";
  for (const ev of events) {
    hex += ev.mcNote.toString(16).padStart(2, "0");
    hex += ev.dur.toString(16).padStart(2, "0");
  }

  return hex;
}

// --- Web Audio Player for MakeCode Songs ---
function playMakeCodeHex(hexString) {
  if (!hexString || hexString.length < 4) {
    setStatus("No valid song to play.");
    return;
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let t = ctx.currentTime;

  // Precompute MakeCode note frequencies (0–87)
  const freq = [];
  for (let i = 0; i < 88; i++) {
    freq[i] = 440 * Math.pow(2, (i - 57) / 12); // MakeCode note 57 = A4 = 440 Hz
  }

  // Split hex into bytes
  const bytes = hexString.match(/.{1,2}/g).map(x => parseInt(x, 16));

  for (let i = 0; i < bytes.length; i += 2) {
    const note = bytes[i];
    const dur = bytes[i + 1] / 100; // convert back to seconds

    if (note !== 255) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq[note];
      osc.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    }

    t += dur;
  }

  setStatus("Playing song…");
}

// --- Drag & Drop Handler ---
dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async e => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".mid")) {
    setStatus("Please drop a .mid file.");
    return;
  }

  setStatus(`Reading ${file.name}…`);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    const hex = encodeMakeCodeSong(midi);

    if (!hex) {
      setStatus("No notes found in this MIDI file.");
      output.value = "";
      return;
    }

    output.value = `music.playSong(hex\`${hex}\`);`;
    output.dataset.hex = hex; // store raw hex for playback
    setStatus(`Converted ${file.name} successfully.`);
  } catch (err) {
    console.error(err);
    setStatus("Error reading MIDI file. Check console for details.");
  }
});

// --- Play Button ---
playButton.addEventListener("click", () => {
  const hex = output.dataset.hex;
  playMakeCodeHex(hex);
});
