// Shared game audio: synthesized sound effects (Web Audio) + spoken words
// (Web Speech API). No asset files needed. Must be unlocked by a user gesture
// (call unlockAudio() from the intro "start" button) for iOS/autoplay policies.

let _ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!_ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      _ctx = new AC();
    }
    if (_ctx && _ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  } catch {
    return null;
  }
}

// A single tone with a quick attack + exponential decay envelope.
function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
  const c = _ctx;
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export type Sfx = "tap" | "pop" | "success" | "fail" | "level" | "win";

export function sfx(kind: Sfx) {
  if (!ac()) return;
  switch (kind) {
    case "tap":
      tone(660, 0, 0.09, "triangle", 0.14);
      break;
    case "pop":
      tone(880, 0, 0.08, "sine", 0.16);
      tone(1320, 0.03, 0.08, "sine", 0.1);
      break;
    case "success": // cheerful ascending arpeggio C-E-G
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.17, "triangle", 0.16));
      break;
    case "fail": // gentle, non-punishing "try again" dip
      tone(320, 0, 0.16, "sine", 0.12);
      tone(240, 0.1, 0.22, "sine", 0.1);
      break;
    case "level": // 4-note flourish
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.2, "triangle", 0.16));
      break;
    case "win": // little victory fanfare
      [523, 659, 784, 1047, 880, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.28, "triangle", 0.17));
      break;
  }
}

// ── Spoken words (text-to-speech) ──────────────────────────────────
let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = window.speechSynthesis.getVoices();
  if (!vs.length) return;
  voice =
    vs.find((v) => /^en(-|_)?(US|GB)/i.test(v.lang) && /Samantha|Karen|Moira|Google US English|female|Zira/i.test(v.name)) ||
    vs.find((v) => /^en/i.test(v.lang)) ||
    vs[0] ||
    null;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

// Speak a word slowly and clearly, as a model for the child to imitate.
export function speak(text: string) {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!voice) pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.8; // slower for young speakers
    u.pitch = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

// Call from the first user gesture (intro start button) to unlock audio.
export function unlockAudio() {
  ac();
  // Warm up speech synthesis with a silent utterance so the first real word is snappy.
  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* ignore */
  }
}
