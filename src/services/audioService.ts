/**
 * Web Audio API synthesizer for Focus Mode ambient sounds and soft completion chimes.
 * Requires 0 external asset downloads, works 100% offline, zero latency.
 */

type SoundscapeType = 'rain' | 'brown_noise' | 'cafe_hum' | 'none';

class AudioService {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: SoundscapeType = 'none';
  private volume: number = 0.3;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
    }
  }

  public stopSoundscape() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.noiseNode = null;
    }
    this.currentType = 'none';
  }

  public playSoundscape(type: SoundscapeType) {
    if (type === 'none') {
      this.stopSoundscape();
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    this.stopSoundscape();
    this.currentType = type;

    // Buffer duration 5 seconds looped
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'brown_noise') {
      // Brown noise algorithm: integrated white noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // boost volume
      }
    } else if (type === 'rain') {
      // Rain simulation: pink noise with gentle random rain drop modulations
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'cafe_hum') {
      // Low-frequency warm rumble with subtle murmurs
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.015 * white)) / 1.015;
        lastOut = output[i];
        output[i] *= 2.8;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filter to soften the sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'rain' ? 1200 : type === 'brown_noise' ? 450 : 350;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(0);
    this.noiseNode = whiteNoise;
    this.gainNode = gain;
  }

  /**
   * Plays a pleasant harmonic chime when a focus session or activity completes.
   */
  public playCompletionChime() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6

    chimeGain.gain.setValueAtTime(0.001, now);
    chimeGain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc1.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }
}

export const audioService = new AudioService();
