import * as Tone from 'tone';

/**
 * AudioSystem - Manages procedural audio with Tone.js
 */
export class AudioSystem {
  constructor() {
    this.initialized = false;
    
    // Main synth for notes
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.3,
        release: 0.8
      }
    }).toDestination();
    
    this.synth.volume.value = -8; // dB
    
    // Progressive audio layers
    this.layers = {
      bass: null,
      pad: null,
      melody: null,
      harmony: null,
      rhythm: null
    };
    
    this.activeLayerCount = 0;
    
    // Ambient pad (deep, ethereal)
    this.ambientPad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 3,
        decay: 2,
        sustain: 0.9,
        release: 5
      }
    });

    this.ambientPad.volume.value = -18;

    this.ambientHPF = new Tone.Filter(80, 'highpass');
    this.ambientPad.chain(this.ambientHPF, Tone.Destination);
    
    // Pad for ambient atmosphere
    this.pad = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.8,
        release: 3
      }
    }).toDestination();
    
    this.pad.volume.value = -18;
    
    // Current musical scale
    this.currentScale = ['C4', 'D4', 'E4', 'G4', 'A4']; // Pentatonic - Level 0
    
    // Tempo
    this.tempo = 120;
    Tone.Transport.bpm.value = this.tempo;
    
    // Ambient state
    this.ambientPlaying = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await Tone.start();
      console.log('Audio system initialized');
      this.initialized = true;
      
      // Start ambient immediately when audio is initialized
      this.startAmbient();
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  playNote(velocity = 0.5, duration = '8n') {
    if (!this.initialized) return;
    
    const note = this.currentScale[
      Math.floor(Math.random() * this.currentScale.length)
    ];
    
    this.synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
  }

  playPulseSound() {
    if (!this.initialized) return;
    
    // Softer, lower ping sound
    const pingSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 }
    }).toDestination();
    
    pingSynth.volume.value = -8; 
    pingSynth.triggerAttackRelease('G4', '8n', Tone.now(), 0.4); // Lower pitch G4 instead of C6
    
    // Cleanup after playing
    setTimeout(() => pingSynth.dispose(), 800);
  }

  playCollisionSound(intensity = 0.3) {
    if (!this.initialized) return;
    
    // Lower pitch for collision
    const note = this.currentScale[0]; // Root note
    this.synth.triggerAttackRelease(note, '16n', Tone.now(), intensity);
  }

  setScaleByLevel(levelId) {
    const scales = {
      0: ['C4', 'D4', 'E4', 'G4', 'A4'],        // Pentatonic - Peaceful
      1: ['C4', 'Eb4', 'F4', 'G4', 'Bb4'],      // Minor - Tension
      2: ['C4', 'D4', 'F#4', 'G4', 'A4'],       // Whole Tone - Dreamy
      3: ['C4', 'E4', 'G4', 'B4', 'D5', 'F#5']  // Major 7th - Triumphant
    };
    
    this.currentScale = scales[levelId] || scales[0];
  }

  startAmbient() {
    if (!this.initialized || this.ambientPlaying) return;
    
    this.ambientPlaying = true;
    
    // Play deep ambient chord - ethereal space atmosphere
    this.ambientPad.triggerAttack(
        ['C2', 'G2', 'C3', 'E3'],
        Tone.now() + 0.15,
        0.3
    );
    
    console.log('🎵 Ambient audio started');
  }

  addMusicLayer(orbCount) {
    if (!this.initialized) return;
    
    console.log(`🎵 Adding music layer ${orbCount}...`);
    
    switch(orbCount) {
      case 1:
        // Layer 1: Smooth bass with filter - warm and pleasant
        this.layers.bass = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 1.5 }
        });
        this.layers.bass.volume.value = -14;
        
        // Create filter for warmth
        const bassFilter = new Tone.Filter(200, 'lowpass');
        this.layers.bass.chain(bassFilter, Tone.Destination);
        
        // Slow, gentle bass pattern
        const bassPattern = new Tone.Pattern((time, note) => {
          this.layers.bass.triggerAttackRelease(note, '2n', time, 0.4);
        }, ['C2', 'G2', 'C2', 'E2'], 'up');
        bassPattern.interval = '2n'; // Slower
        bassPattern.start(0);
        Tone.Transport.start();
        break;
        
      case 2:
        // Layer 2: Warm pad harmony
        this.layers.pad = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2.5 }
        }).toDestination();
        this.layers.pad.volume.value = -16;
        this.layers.pad.triggerAttack(['C3', 'E3', 'G3', 'B3'], Tone.now(), 0.3);
        break;
        
      case 3:
        // Layer 3: Gentle melodic synth
        this.layers.melody = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 }
        }).toDestination();
        this.layers.melody.volume.value = -10;
        
        const melodyPattern = new Tone.Pattern((time, note) => {
          this.layers.melody.triggerAttackRelease(note, '4n', time, 0.5);
        }, ['E4', 'G4', 'A4', 'G4', 'E4', 'D4'], 'upDown');
        melodyPattern.interval = '4n';
        melodyPattern.start(0);
        break;
        
      case 4:
        // Layer 4: Harmony shimmer
        this.layers.harmony = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.2, decay: 0.4, sustain: 0.5, release: 1 }
        }).toDestination();
        this.layers.harmony.volume.value = -12;
        
        const harmonyPattern = new Tone.Pattern((time, note) => {
          this.layers.harmony.triggerAttackRelease(note, '2n', time, 0.4);
        }, ['C4', 'E4', 'G4', 'C5'], 'random');
        harmonyPattern.interval = '2n';
        harmonyPattern.start(0);
        break;
        
      case 5:
        // Layer 5: Subtle chime instead of harsh metallic
        this.layers.rhythm = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 }
        }).toDestination();
        this.layers.rhythm.volume.value = -18;
        
        const chimePattern = new Tone.Pattern((time, note) => {
          this.layers.rhythm.triggerAttackRelease(note, '8n', time, 0.3);
        }, ['C6', 'E6', 'G6', 'C7'], 'randomOnce');
        chimePattern.interval = '2n';
        chimePattern.start(0);
        break;
    }
    
    this.activeLayerCount = orbCount;
  }

  stopAmbient() {
    if (!this.initialized) return;
    this.ambientPad.triggerRelease(['C2', 'G2', 'C3', 'E3']);
    this.pad.triggerRelease();
    this.ambientPlaying = false;
  }

  updateTempo(speed) {
    // Map speed (0-100) to tempo (80-180 BPM)
    this.tempo = 80 + (speed / 100) * 100;
    Tone.Transport.bpm.value = this.tempo;
  }

  cleanup() {
    this.stopAmbient();
    Tone.Transport.stop();
  }
}
