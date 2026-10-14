/**
 * ZenShikaku: Procedural Japanese Acoustic Synthesizer
 * Pure Web Audio API — tatami placement thuds, shoji paper screen slides,
 * bamboo clacks, and resonant Buddhist temple victory bells.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.ZenAudio = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  // Load persisted mute state
  try {
    const saved = localStorage.getItem('zenshikaku_sound_muted');
    if (saved !== null) {
      isMuted = saved === 'true';
    }
  } catch (e) {
    // LocalStorage unavailable in certain environments
  }

  function getAudioContext() {
    if (isMuted) return null;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function toggleMute() {
    isMuted = !isMuted;
    try {
      localStorage.setItem('zenshikaku_sound_muted', isMuted ? 'true' : 'false');
    } catch (e) {}
    return isMuted;
  }

  function isAudioMuted() {
    return isMuted;
  }

  /**
   * Soft sliding paper screen tick during rectangle dragging.
   */
  function playDragTick() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  /**
   * Tactile tatami mat placement thud.
   */
  function playRoomPlace(isValid) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Low resonant wood thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isValid ? 220 : 160;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    // 2. If valid room, play soft harmonic wooden overtone
    if (isValid) {
      const harm = ctx.createOscillator();
      const harmGain = ctx.createGain();

      harm.type = 'triangle';
      harm.frequency.setValueAtTime(523.25, t); // C5
      harm.frequency.exponentialRampToValueAtTime(659.25, t + 0.18); // E5

      harmGain.gain.setValueAtTime(0.09, t);
      harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      harm.connect(harmGain);
      harmGain.connect(ctx.destination);
      harm.start(t + 0.02);
      harm.stop(t + 0.20);
    }
  }

  /**
   * Shoji sliding screen whoosh when removing/clearing a room.
   */
  function playRoomClear() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Crisp Japanese bamboo shishi-odoshi clack.
   */
  function playBambooSatisfied() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(784, t); // G5
    osc1.frequency.exponentialRampToValueAtTime(392, t + 0.08);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, t); // D6
    osc2.frequency.exponentialRampToValueAtTime(587.33, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.08);
    osc2.stop(t + 0.08);
  }

  /**
   * Gentle wind chime hint sound.
   */
  function playHintChime() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [659.25, 783.99, 987.77]; // E5, G5, B5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.07, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.4);
    });
  }

  /**
   * Resonant temple victory bell (Bonshō 梵鐘) with rich long overtones.
   */
  function playTempleGong() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Harmonic series of Japanese bronze bell: fundamental + partials
    const partials = [
      { freq: 146.83, gain: 0.28, decay: 3.5 }, // D3 fundamental
      { freq: 293.66, gain: 0.22, decay: 3.0 }, // D4
      { freq: 440.00, gain: 0.16, decay: 2.2 }, // A4
      { freq: 587.33, gain: 0.12, decay: 1.8 }, // D5
      { freq: 739.99, gain: 0.08, decay: 1.4 }, // F#5
      { freq: 880.00, gain: 0.05, decay: 1.0 }  // A5
    ];

    partials.forEach(({ freq, gain: initGain, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(initGain, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + decay);
    });
  }

  return {\n    toggleMute,
    isAudioMuted,
    playDragTick,
    playRoomPlace,
    playRoomClear,
    playBambooSatisfied,
    playHintChime,
    playTempleGong
  };
});
