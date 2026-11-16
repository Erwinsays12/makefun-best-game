// All sound is synthesised with WebAudio: short oscillator and filtered-noise
// blips for effects, and a slow pentatonic arpeggio for music. Nothing is
// loaded from a file, so the game stays silent until the first gesture
// creates the audio context, and every call is a no-op before that.
const MUSIC_NOTES = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const MUSIC_PATTERN = [0, 2, 4, 7, 4, 2, 5, 3, 0, 2, 4, 6, 7, 6, 4, 2];

export function createSound() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let noiseBuffer = null;
  let muted = false;
  let musicStep = 0;
  let nextNoteAt = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      nextNoteAt = ctx.currentTime + 0.1;
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function chime(freqs) {
    freqs.forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.28, 'sine', 0.16), i * 70);
    });
  }

  return {
    /** Call from the first user gesture; safe to call any time. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone(880, 0.07, 'square', 0.05, 520);
    },
    hit() {
      noise(0.08, 0.12, 1800);
    },
    kill(kind) {
      if (kind === 'brute' || kind === 'boss') {
        noise(0.35, 0.22, 900);
        tone(140, 0.3, 'sawtooth', 0.14, 60);
      } else {
        tone(520, 0.12, 'triangle', 0.12, 180);
        noise(0.1, 0.1, 2400);
      }
    },
    hurt() {
      tone(180, 0.25, 'sawtooth', 0.2, 70);
      noise(0.2, 0.16, 700);
    },
    pickup() {
      chime([660, 880]);
    },
    heart() {
      chime([523.25, 659.25, 783.99]);
    },
    dash() {
      noise(0.16, 0.1, 3200);
    },
    sunburst() {
      tone(120, 0.5, 'sine', 0.22, 880);
      noise(0.4, 0.14, 1400);
    },
    waveStart() {
      chime([392.0, 523.25]);
    },
    upgrade() {
      chime([523.25, 659.25, 783.99, 1046.5]);
    },
    bossRoar() {
      tone(90, 0.7, 'sawtooth', 0.2, 45);
      noise(0.6, 0.18, 500);
    },
    victory() {
      chime([523.25, 659.25, 783.99, 1046.5, 1318.5]);
    },
    gameOver() {
      chime([392.0, 329.63, 261.63, 196.0]);
    },
    /** Advance the music clock; call once a frame while playing. */
    update(dt) {
      if (!ctx || muted || ctx.state !== 'running') return;
      const ahead = ctx.currentTime + 0.25;
      while (nextNoteAt < ahead) {
        const note = MUSIC_NOTES[MUSIC_PATTERN[musicStep % MUSIC_PATTERN.length]];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = note;
        gain.gain.setValueAtTime(0.0001, nextNoteAt);
        gain.gain.linearRampToValueAtTime(0.5, nextNoteAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, nextNoteAt + 0.9);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(nextNoteAt);
        osc.stop(nextNoteAt + 1);
        musicStep += 1;
        nextNoteAt += 0.42;
      }
      void dt;
    },
  };
}
