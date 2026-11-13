/**
 * Web Audio API Notification Sound Synthesizer
 * Produces crisp, beautiful, zero-dependency chimes and pops for chat & notifications.
 * Works without external assets or network dependencies.
 */

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Auto resume on user gesture
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener("click", unlockAudio, { once: false, passive: true });
  window.addEventListener("keydown", unlockAudio, { once: false, passive: true });
}

/**
 * Play a notification sound
 * @param {"chime" | "sent" | "alert"} type
 */
export const playNotificationSound = (type = "chime") => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === "sent") {
      // Crisp outgoing bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    if (type === "alert") {
      // Double attention alert
      [0, 0.15].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(740, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
      return;
    }

    // Default "chime": Modern two-tone crystal chime (D5 -> A5 with soft harmonic sheen)
    // Note 1 (D5 ~ 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2 (A5 ~ 880 Hz, shimmering bright chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);

    // Harmonic overtone for natural acoustic presence (A6 ~ 1760 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(1760, now + 0.08);

    gain3.gain.setValueAtTime(0, now + 0.08);
    gain3.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.08);
    osc3.stop(now + 0.35);
  } catch (err) {
    console.warn("[playNotificationSound] Notice:", err?.message);
  }
};

