import { AmbientSoundType } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentSourceNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: AmbientSoundType = 'off';
  private volume: number = 0.5;
  private effectsEnabled: boolean = true;

  public setEffectsEnabled(enabled: boolean) {
    this.effectsEnabled = enabled;
  }

  public isEffectsEnabled(): boolean {
    return this.effectsEnabled;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public playAmbient(type: AmbientSoundType) {
    this.stopAmbient();
    this.currentType = type;
    if (type === 'off') return;

    this.initContext();
    if (!this.ctx) return;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'brown') {
      this.startBrownNoise();
    } else if (type === 'pink') {
      this.startPinkNoise();
    } else if (type === 'binaural_40hz') {
      this.startBinauralBeats(40);
    } else if (type === 'rain_hum') {
      this.startRainHum();
    }
  }

  public stopAmbient() {
    if (this.currentSourceNode) {
      try {
        (this.currentSourceNode as any).stop?.();
        this.currentSourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.currentSourceNode = null;
    }
    this.currentType = 'off';
  }

  public getActiveAmbient(): AmbientSoundType {
    return this.currentType;
  }

  private startBrownNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 4096;
    let lastOut = 0.0;
    const scriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);

    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain boost for soothing rumble
      }
    };

    // Filter to warm down high harsh frequencies
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    scriptNode.connect(filter);
    filter.connect(this.gainNode);
    this.currentSourceNode = scriptNode;
  }

  private startPinkNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 4096;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const scriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);

    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }
    };

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    scriptNode.connect(filter);
    filter.connect(this.gainNode);
    this.currentSourceNode = scriptNode;
  }

  private startBinauralBeats(beatFrequency: number = 40) {
    if (!this.ctx || !this.gainNode) return;
    const carrierFreq = 180; // Gentle low carrier

    // Left channel oscillator
    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(carrierFreq, this.ctx.currentTime);

    // Right channel oscillator with frequency offset
    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(carrierFreq + beatFrequency, this.ctx.currentTime);

    // Stereo panner / channel splitter
    const merger = this.ctx.createChannelMerger(2);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);

    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    merger.connect(padGain);
    padGain.connect(this.gainNode);

    oscL.start();
    oscR.start();

    this.currentSourceNode = {
      stop: () => {
        try {
          oscL.stop();
          oscR.stop();
          oscL.disconnect();
          oscR.disconnect();
        } catch (e) {}
      },
      disconnect: () => {
        merger.disconnect();
        padGain.disconnect();
      }
    } as any;
  }

  private startRainHum() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 4096;
    let lastOut = 0.0;
    const scriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);

    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.08 * white) / 1.08;
        lastOut = output[i];
        output[i] *= 1.2;
      }
    };

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    scriptNode.connect(filter);
    filter.connect(this.gainNode);
    this.currentSourceNode = scriptNode;
  }

  public playGentleChime() {
    if (!this.effectsEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major soothing arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        noteGain.gain.setValueAtTime(0.001, now + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

        osc.connect(noteGain);
        noteGain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  public playPop() {
    if (!this.effectsEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();
