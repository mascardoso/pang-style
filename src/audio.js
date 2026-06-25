class AudioManager {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.isPlayingBgm = false;
    this.bgmTimer = null;
    
    this.tempo = 125;
    this.stepDuration = 60 / 125 / 4; // 16th note = 120ms
    this.nextNoteTime = 0;
    this.currentStep = 0;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.noiseBuffer) {
      const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopBGM();
    }
  }

  startBGM() {
    this.init();
    if (this.isPlayingBgm) return;
    if (this.isMuted) return;

    this.isPlayingBgm = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;

    this.bgmTimer = setInterval(() => {
      if (this.isPlayingBgm && !this.isMuted) {
        this.scheduler();
      }
    }, 100);
  }

  stopBGM() {
    if (!this.isPlayingBgm) return;
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % 64;
    }
  }

  scheduleNote(step, time) {
    if (this.isMuted) return;

    // --- 1. Bassline (Triangle Wave) ---
    let bassFreq = 0;
    if (step % 2 === 0) {
      if (step < 16) {
        // Am (chord root: A)
        bassFreq = (step % 8 === 0) ? 110 : ((step % 8 === 4) ? 110 : 164.81); // A2 or E3
      } else if (step < 32) {
        // F (chord root: F)
        bassFreq = (step % 8 === 0) ? 87.31 : ((step % 8 === 4) ? 87.31 : 130.81); // F2 or C3
      } else if (step < 48) {
        // C (chord root: C)
        bassFreq = (step % 8 === 0) ? 65.41 : ((step % 8 === 4) ? 65.41 : 98.00); // C2 or G2
      } else {
        // G (chord root: G)
        bassFreq = (step % 8 === 0) ? 98.00 : ((step % 8 === 4) ? 98.00 : 146.83); // G2 or D3
      }
      
      if (step % 4 === 2) {
        bassFreq *= 2; // Jump up octave
      }
    }

    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, time);
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 1.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + this.stepDuration * 1.8);
    }

    // --- 2. Melody Lead (Square Wave) ---
    const E5 = 659.25, G5 = 783.99, A5 = 880.00, D5 = 587.33, C5 = 523.25, B4 = 493.88, F5 = 698.46, B5 = 987.77;
    const melody = [
      E5, 0, G5, 0, A5, 0, G5, 0, 0, E5, 0, G5, 0, A5, 0, 0,
      D5, 0, E5, 0, F5, 0, E5, 0, 0, D5, 0, E5, 0, F5, 0, 0,
      C5, 0, D5, 0, E5, 0, C5, 0, 0, B4, 0, C5, 0, E5, 0, 0,
      B4, 0, D5, 0, G5, 0, B5, 0, 0, A5, 0, G5, 0, B5, 0, 0
    ];

    const melFreq = melody[step];
    if (melFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(melFreq, time);
      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + this.stepDuration * 1.2);
    }

    // --- 3. Drums / Percussion ---
    // Snare (low pitch sweep + noise burst)
    if (step % 8 === 4) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.linearRampToValueAtTime(60, time + 0.07);
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.07);
      
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.02, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(time);
      }
    }
    
    // Hi-hat tick
    if (step % 4 === 2) {
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, time);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.012, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(time);
      }
    }
  }

  playShoot() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playPop() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    
    // Main pop tone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(900, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.08);
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.08);

    // Sparkle high tone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, t);
    gain2.gain.setValueAtTime(0.06, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.15);

    // Filtered noise pop burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      filter.Q.setValueAtTime(1, t);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    }
  }

  playPowerUp(type) {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    
    if (type === 'double_hook') {
      const freqs = [523.25, 783.99, 1046.50, 1567.98]; // C5, G5, C6, G6
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.04, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.10);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.10);
      });
    } else if (type === 'sticky_hook') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'shield') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(1800, t + 0.4);
      
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(15, t);
      lfoGain.gain.setValueAtTime(120, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      lfo.start(t);
      osc.start(t);
      lfo.stop(t + 0.4);
      osc.stop(t + 0.4);
    } else if (type === 'hourglass') {
      const ticks = [1200, 1000, 1200, 800];
      ticks.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.12);
        gain.gain.setValueAtTime(0.06, t + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.12);
        osc.stop(t + idx * 0.12 + 0.08);
      });
    } else if (type === 'heart') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.08, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.25);
      });
    } else {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        gain.gain.setValueAtTime(0.08, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.15);
      });
    }
  }

  playFreeze() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.setValueAtTime(800, t + 0.15);
    osc.frequency.setValueAtTime(600, t + 0.3);
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.65);
  }

  playHit() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    
    const sequence = [330, 311.13, 293.66, 220]; // E4, D#4, D4, A3
    sequence.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      osc.frequency.linearRampToValueAtTime(freq - 15, t + idx * 0.1 + 0.12);
      
      const oscDetune = this.ctx.createOscillator();
      oscDetune.frequency.setValueAtTime(freq + 4, t + idx * 0.1);
      oscDetune.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0.12, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.15);
      
      osc.connect(gain);
      oscDetune.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.15);
      oscDetune.start(t + idx * 0.1);
      oscDetune.stop(t + idx * 0.1 + 0.15);
    });
  }

  playLevelUp() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const sequence = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    sequence.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      gain.gain.setValueAtTime(0.1, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.25);
    });
  }
}

export const audio = new AudioManager();
