import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { wordsForSound, WORD_BANK_SOUNDS } from "../games/data/wordBank";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";

// ---------------------------------------------------------------------------
// Word Quest — a leveled adventure. The child travels a map, one "camp" (level)
// at a time, saying their target words to advance. Earns a badge per level and
// a treasure at the summit. Uses real photos (/Images/<word>.png, emoji fallback)
// and the big sound-organized word bank.
// ---------------------------------------------------------------------------

type Phase = "intro" | "playing" | "levelDone" | "won";

const WORDS_PER_LEVEL = 4;
const MAX_LEVELS = 5;

const COMPANIONS = [
  { name: "Pip the Fox", emoji: "🦊", color: "#e8723c" },
  { name: "Bramble the Bear", emoji: "🐻", color: "#9a6a3c" },
  { name: "Luna the Owl", emoji: "🦉", color: "#6d5ec0" },
  { name: "Coco the Monkey", emoji: "🐵", color: "#b07a2e" },
];

const BADGES = ["🥾", "🏕️", "🧭", "⛰️", "🏔️"];

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const sound = (p.get("sound") || "").replace(/\//g, "").toLowerCase();
  const pos = p.get("pos") || p.get("position") || "Mixed";
  const wordsParam = (p.get("words") || "").split(",").map((w) => w.trim()).filter(Boolean);
  return { sound, pos, wordsParam };
}

function buildWords(sound: string, pos: string): string[] {
  const position = pos === "Mixed" ? undefined : pos;
  const pool = wordsForSound(sound, position);
  const shuffled = [...new Set(pool)].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, WORDS_PER_LEVEL * MAX_LEVELS);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) {
    return <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  }
  return (
    <img
      src={`/Images/${word}.png`}
      alt={word}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 16 }}
    />
  );
}

export default function AdventureGame() {
  const params = useMemo(readParams, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [sound, setSound] = useState(params.sound && WORD_BANK_SOUNDS.includes(params.sound) ? params.sound : "r");
  const [pos, setPos] = useState(params.pos);
  const [companion, setCompanion] = useState(0);

  const [levels, setLevels] = useState<string[][]>([]);
  const [level, setLevel] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);

  // recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  function start() {
    let words: string[];
    if (params.wordsParam.length) {
      words = params.wordsParam.slice(0, WORDS_PER_LEVEL * MAX_LEVELS);
    } else {
      words = buildWords(sound, pos);
    }
    if (!words.length) words = ["star", "sun", "rain", "rope"];
    setLevels(chunk(words, WORDS_PER_LEVEL));
    setLevel(0);
    setWordIdx(0);
    setStars(0);
    setTries(0);
    setRecordingUrl(null);
    setPhase("playing");
  }

  async function startRec() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunksRef.current = [];
      r.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      r.start();
      recorderRef.current = r;
      setIsRecording(true);
    } catch {
      setMicError("Microphone is blocked — you can still tap Got it! / Try again.");
    }
  }
  function stopRec() {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setIsRecording(false);
  }
  function playBack() {
    if (recordingUrl) new Audio(recordingUrl).play().catch(() => {});
  }

  const curWords = levels[level] || [];
  const curWord = curWords[wordIdx] || "";
  const totalWords = levels.reduce((n, l) => n + l.length, 0);
  const doneWords = levels.slice(0, level).reduce((n, l) => n + l.length, 0) + wordIdx;

  function nextWord(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null);
    if (wordIdx + 1 < curWords.length) {
      setWordIdx(wordIdx + 1);
    } else if (level + 1 < levels.length) {
      setPhase("levelDone");
    } else {
      setPhase("won");
    }
  }
  function nextLevel() {
    setLevel(level + 1);
    setWordIdx(0);
    setPhase("playing");
  }

  // keyboard: G = got it, N = try again, space = (handled by hold elsewhere)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === "g" || e.key === "G") nextWord(true);
      else if (e.key === "n" || e.key === "N") nextWord(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const comp = COMPANIONS[companion];
  const soundLabel = `/${sound}/`;

  // ---------- styles ----------
  const page: CSSProperties = {
    minHeight: "100vh",
    fontFamily: "'Nunito', system-ui, Arial, sans-serif",
    background: "linear-gradient(180deg,#0e2a4d 0%,#13457a 55%,#1f6fb0 100%)",
    color: "#fff",
    padding: "16px 16px 40px",
  };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto" };
  const card: CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 22, padding: 18 };
  const bigBtn: CSSProperties = { flex: 1, border: "none", borderRadius: 16, padding: "16px 12px", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

  // ---------- intro ----------
  if (phase === "intro") {
    return (
      <div style={page}>
        <div style={wrap}>
          <a href="/parent" style={{ color: "#bfe0ff", fontWeight: 800, textDecoration: "none", fontSize: 14 }}>← Back</a>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <div style={{ fontSize: 56 }}>🗺️</div>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: "4px 0" }}>Word Quest</h1>
            <p style={{ color: "#cfe4ff", fontWeight: 700, maxWidth: 460, margin: "0 auto 14px" }}>
              Travel across the map! Say each word with your sound to move your buddy to the next camp and earn the treasure.
            </p>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Pick your buddy</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {COMPANIONS.map((c, i) => (
                <button key={c.name} onClick={() => setCompanion(i)} style={{
                  flex: "1 1 120px", border: companion === i ? "3px solid #7fd4ff" : "2px solid rgba(255,255,255,0.2)",
                  background: companion === i ? "rgba(127,212,255,0.18)" : "rgba(255,255,255,0.06)", color: "#fff",
                  borderRadius: 14, padding: "12px 8px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800,
                }}>
                  <div style={{ fontSize: 34 }}>{c.emoji}</div>
                  <div style={{ fontSize: 12 }}>{c.name}</div>
                </button>
              ))}
            </div>
          </div>

          {!params.wordsParam.length && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Target sound</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {WORD_BANK_SOUNDS.map((s) => (
                  <button key={s} onClick={() => setSound(s)} style={{
                    border: sound === s ? "2px solid #7fd4ff" : "1px solid rgba(255,255,255,0.2)",
                    background: sound === s ? "rgba(127,212,255,0.2)" : "rgba(255,255,255,0.06)",
                    color: "#fff", borderRadius: 12, padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                  }}>/{s}/</button>
                ))}
              </div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Position</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Initial", "Medial", "Final", "Mixed"].map((p) => (
                  <button key={p} onClick={() => setPos(p)} style={{
                    border: pos === p ? "2px solid #7fd4ff" : "1px solid rgba(255,255,255,0.2)",
                    background: pos === p ? "rgba(127,212,255,0.2)" : "rgba(255,255,255,0.06)",
                    color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  }}>{p}</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={start} style={{ ...bigBtn, width: "100%", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff", fontSize: 20, boxShadow: "0 6px 18px rgba(30,166,90,.4)" }}>
            🚩 Start the Quest
          </button>
        </div>
      </div>
    );
  }

  // ---------- level complete ----------
  if (phase === "levelDone") {
    return (
      <div style={page}>
        <div style={{ ...wrap, textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 70 }}>{BADGES[level] || "🏅"}</div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>Camp {level + 1} cleared!</h1>
          <p style={{ color: "#cfe4ff", fontWeight: 700 }}>You earned a badge. {comp.emoji} {comp.name} is ready for the next climb.</p>
          <div style={{ fontSize: 22, margin: "10px 0 18px" }}>⭐ {stars} stars so far</div>
          <button onClick={nextLevel} style={{ ...bigBtn, width: "100%", maxWidth: 360, background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff" }}>
            Onward to Camp {level + 2} →
          </button>
        </div>
      </div>
    );
  }

  // ---------- won ----------
  if (phase === "won") {
    const accuracy = tries ? Math.round((stars / tries) * 100) : 0;
    const medal = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
    return (
      <div style={page}>
        <div style={{ ...wrap, textAlign: "center", paddingTop: 36 }}>
          <div style={{ fontSize: 78 }}>🏆</div>
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>Treasure found!</h1>
          <p style={{ color: "#cfe4ff", fontWeight: 700 }}>{comp.emoji} {comp.name} reached the summit with you.</p>
          <div style={{ fontSize: 40, margin: "8px 0" }}>{"⭐".repeat(medal)}{"☆".repeat(3 - medal)}</div>
          <div style={{ fontWeight: 800, marginBottom: 18 }}>{stars} / {totalWords} words · {accuracy}% great sounds</div>
          <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto" }}>
            <button onClick={() => setPhase("intro")} style={{ ...bigBtn, background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff" }}>Play again</button>
            <a href="/parent" style={{ ...bigBtn, background: "rgba(255,255,255,0.14)", color: "#fff", textAlign: "center", textDecoration: "none", lineHeight: "26px" }}>Done</a>
          </div>
        </div>
      </div>
    );
  }

  // ---------- playing ----------
  const progressPct = totalWords ? (doneWords / totalWords) * 100 : 0;
  return (
    <div style={page}>
      <div style={wrap}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => setPhase("intro")} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontWeight: 800, borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" }}>← Exit</button>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Sound: <span style={{ color: "#7fd4ff" }}>{soundLabel}</span></div>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* map / level path */}
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <div style={{ position: "absolute", left: 18, right: 18, top: "50%", height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 4 }} />
            {levels.map((_, i) => {
              const state = i < level ? "done" : i === level ? "current" : "locked";
              return (
                <div key={i} style={{ position: "relative", textAlign: "center", flex: 1 }}>
                  <div style={{
                    width: 40, height: 40, margin: "0 auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 900,
                    background: state === "done" ? "#27c06b" : state === "current" ? "#f5b820" : "rgba(255,255,255,0.12)",
                    border: state === "current" ? "3px solid #fff" : "2px solid rgba(255,255,255,0.25)",
                    boxShadow: state === "current" ? "0 0 14px rgba(245,184,32,.7)" : "none",
                  }}>
                    {state === "done" ? "✓" : state === "current" ? comp.emoji : "🔒"}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: "#cfe4ff" }}>Camp {i + 1}</div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.14)", borderRadius: 6, marginTop: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: progressPct + "%", background: "linear-gradient(90deg,#7fd4ff,#27c06b)", transition: "width .35s" }} />
          </div>
        </div>

        {/* word panel */}
        <div style={{ ...card, textAlign: "center", background: "rgba(255,255,255,0.95)", color: "#13314f" }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#3b82d6" }}>
            Say this word with {soundLabel}
          </div>
          <div style={{ margin: "14px 0 6px" }}><WordImage word={curWord} size={120} /></div>
          <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginTop: 6 }}>Word {wordIdx + 1} of {curWords.length} · Camp {level + 1}</div>

          {/* mic */}
          <div style={{ marginTop: 16 }}>
            <button
              onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={() => isRecording && stopRec()}
              onTouchStart={(e) => { e.preventDefault(); startRec(); }} onTouchEnd={(e) => { e.preventDefault(); stopRec(); }}
              style={{
                width: 84, height: 84, borderRadius: "50%", border: "none", cursor: "pointer",
                background: isRecording ? "#ef4444" : "linear-gradient(135deg,#3b82d6,#2f6fb0)", color: "#fff", fontSize: 32,
                boxShadow: isRecording ? "0 0 0 8px rgba(239,68,68,.25)" : "0 6px 16px rgba(59,130,214,.45)",
              }}
            >🎤</button>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 6 }}>
              {isRecording ? "Recording… let go to stop" : "Press & hold to record"}
            </div>
            {recordingUrl && !isRecording && (
              <button onClick={playBack} style={{ marginTop: 8, border: "2px solid #d7e6fa", background: "#eef5ff", color: "#2f6fb0", borderRadius: 10, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>▶ Play it back</button>
            )}
            {micError && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700, marginTop: 6 }}>{micError}</div>}
          </div>
        </div>

        {/* judge buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => nextWord(true)} style={{ ...bigBtn, background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff" }}>✅ Got it! <span style={{ opacity: .8, fontSize: 13 }}>(G)</span></button>
          <button onClick={() => nextWord(false)} style={{ ...bigBtn, background: "linear-gradient(135deg,#ef6b5e,#d8453a)", color: "#fff" }}>🔁 Try again <span style={{ opacity: .8, fontSize: 13 }}>(N)</span></button>
        </div>
        <p style={{ textAlign: "center", color: "#bfe0ff", fontSize: 12, fontWeight: 700, marginTop: 10 }}>
          Record together, play it back, then choose. Both moves go to the next word.
        </p>
      </div>
    </div>
  );
}
