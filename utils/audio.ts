
// Simple audio synthesizer to avoid external assets
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
const ctx = new AudioContextClass();

type SoundType = 'click' | 'success' | 'fail' | 'levelup' | 'hover';

let ambientNodes: { osc: OscillatorNode, gain: GainNode }[] = [];
let masterAmbientGain: GainNode | null = null;

export const startAmbient = () => {
    if (ctx.state === 'suspended') ctx.resume();
    stopAmbient(); // Clear existing

    masterAmbientGain = ctx.createGain();
    masterAmbientGain.gain.setValueAtTime(0, ctx.currentTime);
    masterAmbientGain.connect(ctx.destination);

    // PlayStation-style chill chord (Pad)
    // Frequencies for a dreamy sus2/maj7 feel
    const freqs = [110.00, 164.81, 196.00, 220.00, 329.63]; // A2, E3, G3, A3, E4
    
    freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        // Mix sine and triangle for warmth
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        
        // Slight detune for chorus effect
        osc.detune.value = (Math.random() * 10) - 5;

        // LFO for movement (Volume wobble)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + (Math.random() * 0.2); // Slow speed
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02; // Depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        lfo.start();

        // Base volume per oscillator
        oscGain.gain.value = 0.03; 

        osc.connect(oscGain);
        oscGain.connect(masterAmbientGain!);
        osc.start();
        
        ambientNodes.push({ osc, gain: oscGain });
    });

    // Fade In
    masterAmbientGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
};

export const stopAmbient = () => {
    if (masterAmbientGain) {
        // Fade Out
        masterAmbientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
        setTimeout(() => {
            ambientNodes.forEach(n => n.osc.stop());
            ambientNodes = [];
            masterAmbientGain = null;
        }, 2000);
    }
};

export const playSound = (type: SoundType) => {
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'hover':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'success':
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'fail':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'levelup':
      osc.type = 'triangle';
      // Arpeggio
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1); // C#
      osc.frequency.setValueAtTime(659, now + 0.2); // E
      osc.frequency.setValueAtTime(880, now + 0.4); // A
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0.2, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      
      osc.start(now);
      osc.stop(now + 1.5);
      break;
  }
};
