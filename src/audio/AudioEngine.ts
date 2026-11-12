import { AUDIO_FILES, MUSIC, pickVariant, SOUNDS, windCutoff, windGain, windLevel } from './sounds';
import type { SoundName } from './sounds';

/**
 * All of the game's sound: the looping music, the recorded effects, the wind of a fall (filtered noise, made here)
 * and the small synthesized tones (`beep`). Everything is optional: with no Web Audio, a blocked context or a file
 * that fails to load, the calls do nothing.
 *
 * Browsers keep an AudioContext suspended until the player has acted, so nothing is created until `unlock()` is
 * called from a user gesture; the files are fetched and decoded then, and the music starts when it is ready.
 */
export class AudioEngine {
  private ctx: AudioContext | undefined;
  private sfxBus: GainNode | undefined;
  private musicBus: GainNode | undefined;
  private readonly buffers = new Map<string, AudioBuffer>();
  private loading = false;
  private musicSource: AudioBufferSourceNode | undefined;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | undefined;
  private sfxLevel = 1;
  private musicLevel = 1;
  /** An effect asked for before its file had loaded (the very first print-in), played if it arrives soon enough. */
  private pending: { name: SoundName; volume: number; at: number } | undefined;

  /** `base` is where the audio files are served from. */
  constructor(private readonly base = 'audio/') {}

  /** For the dev hook and tests: the context's state, how many files have decoded, and what is sounding. */
  public status(): { state: string; loaded: number; music: boolean; wind: number } {
    return {
      state: this.ctx?.state ?? 'none',
      loaded: this.buffers.size,
      music: this.musicSource !== undefined,
      wind: this.wind?.gain.gain.value ?? 0,
    };
  }

  /** Sets the two volumes (0-1 each): effects, and music. Safe to call before `unlock()`. */
  public setVolumes(sfx: number, music: number): void {
    this.sfxLevel = sfx;
    this.musicLevel = music;
    const now = this.ctx?.currentTime ?? 0;
    this.sfxBus?.gain.setTargetAtTime(sfx, now, 0.05);
    this.musicBus?.gain.setTargetAtTime(music, now, 0.2);
  }

  /** Call from a user gesture (a click, a key, a tap): creates or resumes the context and starts loading. */
  public unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = this.sfxLevel;
        this.sfxBus.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicLevel;
        this.musicBus.connect(this.ctx.destination);
        this.startWind();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx
          .resume()
          .then(() => this.flushPending())
          .catch(() => {});
      }
      if (!this.loading) {
        this.loading = true;
        void this.load();
      }
    } catch {
      /* audio is optional */
    }
  }

  private async load(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      AUDIO_FILES.map(async (file) => {
        try {
          const response = await fetch(this.base + file);
          if (!response.ok) return;
          this.buffers.set(file, await ctx.decodeAudioData(await response.arrayBuffer()));
          if (file === MUSIC.file) this.startMusic();
          else this.flushPending();
        } catch {
          /* a missing or undecodable file is only a missing sound */
        }
      }),
    );
  }

  private startMusic(): void {
    const buffer = this.buffers.get(MUSIC.file);
    if (!this.ctx || !this.musicBus || !buffer || this.musicSource) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = MUSIC.loopStart;
    source.loopEnd = buffer.duration - MUSIC.loopEndTrim;
    const gain = this.ctx.createGain();
    // Fades in over a few seconds, so it arrives under the first chamber and is not switched on.
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(MUSIC.gain, this.ctx.currentTime + 6);
    source.connect(gain).connect(this.musicBus);
    source.start(0, MUSIC.loopStart);
    this.musicSource = source;
  }

  /** The wind: looped white noise through a low-pass filter, silent until `setFall` opens it. */
  private startWind(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = windCutoff(0);
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.sfxBus);
    source.start();
    this.wind = { gain, filter };
  }

  /**
   * How far through a fall the player is: 0 (or not falling) is silence, 1 is the roar just above the planet.
   * Call every frame.
   */
  public setFall(progress: number): void {
    if (!this.ctx || !this.wind) return;
    const level = windLevel(progress);
    const now = this.ctx.currentTime;
    // Rises smoothly; cut off, it dies in a fraction of a second.
    this.wind.gain.gain.setTargetAtTime(windGain(level), now, level > 0 ? 0.15 : 0.06);
    this.wind.filter.frequency.setTargetAtTime(windCutoff(level), now, 0.15);
  }

  private flushPending(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = undefined;
    if (performance.now() - p.at < 1500) this.play(p.name, p.volume);
  }

  /**
   * Plays a recorded effect at `volume` (0-1 of its own level). One asked for before the context is running or its
   * file has loaded is held briefly and played late; otherwise a sound that is not ready is simply skipped.
   */
  public play(name: SoundName, volume = 1): void {
    const spec = SOUNDS[name];
    const ctx = this.ctx;
    if (volume <= 0) return;
    const buffer = this.buffers.get(spec.files[pickVariant(spec.files.length, Math.random())]);
    if (!ctx || !this.sfxBus || ctx.state !== 'running' || !buffer) {
      this.pending = { name, volume, at: performance.now() };
      return;
    }
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * spec.vary;
      const gain = ctx.createGain();
      gain.gain.value = spec.gain * Math.min(volume, 1);
      source.connect(gain).connect(this.sfxBus);
      source.start();
    } catch {
      /* audio is optional */
    }
  }

  /** A short synthesized tone sliding from `from` to `to` Hz: the interface's own small sounds. */
  public beep(from: number, to: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || volume <= 0 || ctx.state !== 'running') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(this.sfxBus);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* audio is optional */
    }
  }
}
