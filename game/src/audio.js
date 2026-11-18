// VELMARA — audio.js: all sound is synthesised with WebAudio.
// One job: engine hum, siren, gunshots, pickups and a bassline groove.
// No audio files, no network — everything is an oscillator + noise buffer.

export class SoundBank {
  constructor() {
    this.ctx = null; this.master = null; this.musicOn = true;
    this.engineOsc = null; this.engineGain = null; this.sirenTimer = null;
    this.musicTimer = null; this.beat = 0; this.muted = false;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.startMusic();
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.35; return this.muted; }
  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }
  pickup() { this.blip(660, 0.12, 'sine', 0.25); setTimeout(() => this.blip(990, 0.18, 'sine', 0.25), 90); }
  cash() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.15, 'triangle', 0.22), i * 70)); }
  shoot() { this.noise(0.12, 0.35, 3000); this.blip(180, 0.1, 'square', 0.15, 60); }
  crash() { this.noise(0.3, 0.4, 700); }
  sirenBurst() { this.blip(700, 0.35, 'sawtooth', 0.08, 1100); setTimeout(() => this.blip(1100, 0.35, 'sawtooth', 0.08, 700), 350); }
  horn() { this.blip(370, 0.25, 'square', 0.12); }
  missionDone() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.25), i * 110)); }
  busted() { [330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.18), i * 160)); }
  engineStart(speed01) {
    if (!this.ctx || this.muted) return;
    if (!this.engineOsc) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 60;
      g.gain.value = 0; o.connect(g); g.connect(this.master); o.start();
      this.engineOsc = o; this.engineGain = g;
    }
    this.engineOsc.frequency.value = 55 + speed01 * 130;
    this.engineGain.gain.value = 0.05 + speed01 * 0.05;
  }
  engineStop() { if (this.engineGain) this.engineGain.gain.value = 0; }
  // A slow sun-soaked bassline groove: A minor walk, one note per beat.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
    const chords = [220, 220, 261.63, 196, 220, 220, 329.63, 293.66];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.musicOn) return;
      const i = this.beat % 8;
      this.blip(bass[i], 0.5, 'triangle', 0.16);
      if (this.beat % 2 === 0) this.blip(chords[i], 0.4, 'sine', 0.05);
      if (this.beat % 4 === 2) this.noise(0.05, 0.05, 6000);
      this.beat++;
    }, 340);
  }
}
