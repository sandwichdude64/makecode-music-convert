const dropzone = document.getElementById("dropzone");
const output = document.getElementById("output");
const status = document.getElementById("status");

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

  return `music.playSong(hex\`${hex}\`);`;
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

    const result = encodeMakeCodeSong(midi);

    if (!result) {
      setStatus("No notes found in this MIDI file.");
      output.value = "";
      return;
    }

    output.value = result;
    setStatus(`Converted ${file.name} successfully.`);
  } catch (err) {
    console.error(err);
    setStatus("Error reading MIDI file. Check console for details.");
  }
});
