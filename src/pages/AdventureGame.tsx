import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { wordsForSound, WORD_BANK_SOUNDS } from "../games/data/wordBank";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Word Quest — a leveled adventure where every word is a different MINI-GAME.
// Say the word to power the toy: pop a bubble, feed a monster, dig treasure,
// launch a rocket. Travel a map of camps, earn badges + treasures.
// Uses real photos (/Images/<word>.png, emoji fallback) + the big word bank.
// ---------------------------------------------------------------------------

type Phase = "intro" | "playing" | "levelDone" | "won";

const WORDS_PER_LEVEL = 4;
const MAX_LEVELS = 5;

const COMPANIONS = [
  { name: "Pip the Fox", emoji: "🦊" },
  { name: "Bramble the Bear", emoji: "🐻" },
  { name: "Luna the Owl", emoji: "🦉" },
  { name: "Coco the Monkey", emoji: "🐵" },
];
const BADGES = ["🥾", "🏕️", "🧭", "⛰️", "🏔️"];

const MINIS = [
  { key: "bubble", icon: "🫧", title: "Bubble Pop", action: "Pop it!", reward: "✨", verb: "pop the bubble" },
  { key: "monster", icon: "👾", title: "Feed the Monster", action: "Feed it!", reward: "🍬", verb: "feed the monster" },
  { key: "dig", icon: "⛏️", title: "Treasure Dig", action: "Dig it up!", reward: "💎", verb: "dig up the treasure" },
  { key: "rocket", icon: "🚀", title: "Blast Off", action: "Launch!", reward: "⭐", verb: "launch the rocket" },
  { key: "fish", icon: "🎣", title: "Reel It In", action: "Reel it in!", reward: "🐟", verb: "reel in the catch" },
  { key: "hoop", icon: "🏀", title: "Hoop Shot", action: "Shoot!", reward: "🏀", verb: "sink the basket" },
  { key: "balloon", icon: "🎈", title: "Balloon Float", action: "Let it go!", reward: "🎈", verb: "float the balloon away" },
  { key: "paint", icon: "🎨", title: "Paint Splash", action: "Splash!", reward: "🌈", verb: "splash the paint off" },
] as const;

const CSS = `
@keyframes wq-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes wq-pop {0%{transform:scale(1);opacity:1}100%{transform:scale(1.7);opacity:0}}
@keyframes wq-chomp {0%,100%{transform:scaleY(1)}40%{transform:scaleY(.62)}}
@keyframes wq-flydown {0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(120px) scale(.25);opacity:0}}
@keyframes wq-reveal {from{opacity:0;transform:scale(.7) rotate(-8deg)}to{opacity:1;transform:scale(1) rotate(0)}}
@keyframes wq-launch {0%{transform:translateY(0)}25%{transform:translateY(6px)}100%{transform:translateY(-460px) scale(.5);opacity:0}}
@keyframes wq-spark {0%{transform:translateY(0) scale(0);opacity:1}100%{transform:translateY(-70px) scale(1.3);opacity:0}}
@keyframes wq-pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes wq-shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes wq-reel {0%{transform:translateY(0) rotate(0)}100%{transform:translateY(-250px) rotate(10deg);opacity:0}}
@keyframes wq-hoop {0%{transform:translate(0,0) scale(1)}45%{transform:translate(34px,-150px) scale(.7)}100%{transform:translate(70px,30px) scale(.45);opacity:0}}
@keyframes wq-float {0%{transform:translateY(0) translateX(0) scale(1)}100%{transform:translateY(-380px) translateX(34px) scale(.7);opacity:0}}
`;

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
  return [...new Set(pool)].sort(() => Math.random() - 0.5).slice(0, WORDS_PER_LEVEL * MAX_LEVELS);
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", borderRadius: 14 }} />;
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
  const [fx, setFx] = useState(false); // success animation in progress

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  function start() {
    unlockAudio();
    let words = params.wordsParam.length ? params.wordsParam.slice(0, WORDS_PER_LEVEL * MAX_LEVELS) : buildWords(sound, pos);
    if (!words.length) words = ["star", "sun", "rain", "rope"];
    setLevels(chunk(words, WORDS_PER_LEVEL));
    setLevel(0); setWordIdx(0); setStars(0); setTries(0); setRecordingUrl(null); setFx(false);
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
      r.start(); recorderRef.current = r; setIsRecording(true);
    } catch { setMicError("Mic is off — you can still play the toy."); }
  }
  function stopRec() { const r = recorderRef.current; if (r && r.state !== "inactive") r.stop(); setIsRecording(false); }
  function playBack() { if (recordingUrl) new Audio(recordingUrl).play().catch(() => {}); }

  const curWords = levels[level] || [];
  const curWord = curWords[wordIdx] || "";
  const totalWords = levels.reduce((n, l) => n + l.length, 0);
  const doneWords = levels.slice(0, level).reduce((n, l) => n + l.length, 0) + wordIdx;
  const mini = MINIS[doneWords % MINIS.length];

  function advance(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null); setFx(false);
    if (wordIdx + 1 < curWords.length) setWordIdx(wordIdx + 1);
    else if (level + 1 < levels.length) setPhase("levelDone");
    else setPhase("won");
  }
  function play() { // tap the toy = "got it" with a fun animation
    if (fx) return;
    sfx("success");
    setFx(true);
    window.setTimeout(() => advance(true), 1050);
  }
  function nextLevel() { setLevel(level + 1); setWordIdx(0); setPhase("playing"); }

  useEffect(() => { if (phase === "playing" && curWord) speak(curWord); }, [curWord, phase]);
  useEffect(() => { if (phase === "won") sfx("win"); else if (phase === "levelDone") sfx("level"); }, [phase]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing" || fx) return;
      if (e.key === "g" || e.key === "G" || e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "n" || e.key === "N") advance(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const comp = COMPANIONS[companion];
  const soundLabel = `/${sound}/`;
  const page: CSSProperties = { minHeight: "100vh", fontFamily: "'Nunito',system-ui,Arial,sans-serif", background: "linear-gradient(180deg,#0e2a4d,#13457a 55%,#1f6fb0)", color: "#fff", padding: "16px 16px 40px" };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto" };
  const card: CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 22, padding: 18 };
  const bigBtn: CSSProperties = { flex: 1, border: "none", borderRadius: 16, padding: "16px 12px", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
  const sparks = (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {["✨", "⭐", "💫", "✨", "⭐"].map((s, i) => (
        <span key={i} style={{ position: "absolute", left: `${15 + i * 17}%`, top: "55%", fontSize: 26, animation: `wq-spark .9s ease-out ${i * 0.05}s forwards` }}>{s}</span>
      ))}
    </div>
  );

  // Must be opened from a child's assignment card so it plays the assigned words.
  if (!params.wordsParam.length) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: 60 }}>🗺️</div>
          <h1 style={{ fontSize: 24, margin: "10px 0" }}>No homework loaded</h1>
          <p style={{ maxWidth: 340, margin: "0 auto 18px", opacity: 0.85, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will play the exact words their therapist assigned.</p>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
            ← Back to my child’s card
          </button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div style={page}><div style={wrap}>
        <a href="/parent" style={{ color: "#bfe0ff", fontWeight: 800, textDecoration: "none", fontSize: 14 }}>← Back</a>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 56 }}>🗺️</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: "4px 0" }}>Word Quest</h1>
          <p style={{ color: "#cfe4ff", fontWeight: 700, maxWidth: 470, margin: "0 auto 8px" }}>
            Every word powers a different toy — pop bubbles 🫧, feed a monster 👾, dig treasure ⛏️, launch rockets 🚀 — as your buddy travels to the treasure!
          </p>
        </div>
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Pick your buddy</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COMPANIONS.map((c, i) => (
              <button key={c.name} onClick={() => setCompanion(i)} style={{ flex: "1 1 120px", border: companion === i ? "3px solid #7fd4ff" : "2px solid rgba(255,255,255,0.2)", background: companion === i ? "rgba(127,212,255,0.18)" : "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, padding: "12px 8px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>
                <div style={{ fontSize: 34 }}>{c.emoji}</div><div style={{ fontSize: 12 }}>{c.name}</div>
              </button>
            ))}
          </div>
        </div>
        {!params.wordsParam.length && (
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Target sound</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {WORD_BANK_SOUNDS.map((s) => (
                <button key={s} onClick={() => setSound(s)} style={{ border: sound === s ? "2px solid #7fd4ff" : "1px solid rgba(255,255,255,0.2)", background: sound === s ? "rgba(127,212,255,0.2)" : "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 12, padding: "8px 12px", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>/{s}/</button>
              ))}
            </div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Position</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Initial", "Medial", "Final", "Mixed"].map((p) => (
                <button key={p} onClick={() => setPos(p)} style={{ border: pos === p ? "2px solid #7fd4ff" : "1px solid rgba(255,255,255,0.2)", background: pos === p ? "rgba(127,212,255,0.2)" : "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
        <button onClick={start} style={{ ...bigBtn, width: "100%", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff", fontSize: 20, boxShadow: "0 6px 18px rgba(30,166,90,.4)" }}>🚩 Start the Quest</button>
      </div></div>
    );
  }

  if (phase === "levelDone") {
    return (<div style={page}><div style={{ ...wrap, textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 70 }}>{BADGES[level] || "🏅"}</div>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Camp {level + 1} cleared!</h1>
      <p style={{ color: "#cfe4ff", fontWeight: 700 }}>Badge earned! {comp.emoji} {comp.name} climbs higher.</p>
      <div style={{ fontSize: 22, margin: "10px 0 18px" }}>⭐ {stars} collected</div>
      <button onClick={nextLevel} style={{ ...bigBtn, width: "100%", maxWidth: 360, background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff" }}>Onward to Camp {level + 2} →</button>
    </div></div>);
  }

  if (phase === "won") {
    const accuracy = tries ? Math.round((stars / tries) * 100) : 0;
    const medal = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
    return (<div style={page}><div style={{ ...wrap, textAlign: "center", paddingTop: 36 }}>
      <div style={{ fontSize: 78 }}>🏆</div>
      <h1 style={{ fontSize: 30, fontWeight: 900 }}>Treasure found!</h1>
      <p style={{ color: "#cfe4ff", fontWeight: 700 }}>{comp.emoji} {comp.name} reached the summit with you.</p>
      <div style={{ fontSize: 40, margin: "8px 0" }}>{"⭐".repeat(medal)}{"☆".repeat(3 - medal)}</div>
      <div style={{ fontWeight: 800, marginBottom: 18 }}>{stars} / {totalWords} words · {accuracy}% great sounds</div>
      <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto" }}>
        <button onClick={() => setPhase("intro")} style={{ ...bigBtn, background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "#fff" }}>Play again</button>
        <a href="/parent" style={{ ...bigBtn, background: "rgba(255,255,255,0.14)", color: "#fff", textAlign: "center", textDecoration: "none", lineHeight: "26px" }}>Done</a>
      </div>
    </div></div>);
  }

  // ---------- playing (mini-game per word) ----------
  const progressPct = totalWords ? (doneWords / totalWords) * 100 : 0;
  return (
    <div style={page}>
      <style>{CSS}</style>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => setPhase("intro")} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontWeight: 800, borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" }}>← Exit</button>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Sound: <span style={{ color: "#7fd4ff" }}>{soundLabel}</span></div>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* camp map */}
        <div style={{ ...card, marginBottom: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <div style={{ position: "absolute", left: 18, right: 18, top: 20, height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 4 }} />
            {levels.map((_, i) => {
              const st = i < level ? "done" : i === level ? "current" : "locked";
              return (<div key={i} style={{ position: "relative", textAlign: "center", flex: 1 }}>
                <div style={{ width: 40, height: 40, margin: "0 auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, background: st === "done" ? "#27c06b" : st === "current" ? "#f5b820" : "rgba(255,255,255,0.12)", border: st === "current" ? "3px solid #fff" : "2px solid rgba(255,255,255,0.25)", boxShadow: st === "current" ? "0 0 14px rgba(245,184,32,.7)" : "none" }}>{st === "done" ? "✓" : st === "current" ? comp.emoji : "🔒"}</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: "#cfe4ff" }}>Camp {i + 1}</div>
              </div>);
            })}
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.14)", borderRadius: 6, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: progressPct + "%", background: "linear-gradient(90deg,#7fd4ff,#27c06b)", transition: "width .35s" }} />
          </div>
        </div>

        {/* mini-game scene */}
        <div style={{ ...card, textAlign: "center", background: "rgba(255,255,255,0.96)", color: "#13314f", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#3b82d6" }}>
            {mini.icon} {mini.title} · say <span style={{ color: "#163b3f" }}>{curWord}</span> with {soundLabel}
          </div>

          <div style={{ position: "relative", height: 230, display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
            {/* BUBBLE */}
            {mini.key === "bubble" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", animation: fx ? "wq-pop .9s ease-out forwards" : "wq-bob 2.4s ease-in-out infinite" }}>
                <div style={{ width: 180, height: 180, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(190,225,255,.55) 55%, rgba(120,180,240,.35))", boxShadow: "inset 0 0 30px rgba(255,255,255,.7), 0 8px 24px rgba(59,130,214,.25)", border: "2px solid rgba(255,255,255,.7)" }}>
                  <WordImage word={curWord} size={120} />
                </div>
              </div>
            )}
            {/* MONSTER */}
            {mini.key === "monster" && (
              <div style={{ position: "relative", textAlign: "center" }}>
                <div style={{ animation: fx ? "wq-flydown .9s ease-in forwards" : "wq-bob 2.6s ease-in-out infinite" }}><WordImage word={curWord} size={104} /></div>
                <div onClick={play} style={{ cursor: fx ? "default" : "pointer", fontSize: 86, marginTop: 6, animation: fx ? "wq-chomp .45s ease-in-out 2" : "wq-pulse 2s ease-in-out infinite" }}>{fx ? "😋" : "👾"}</div>
              </div>
            )}
            {/* DIG */}
            {mini.key === "dig" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", position: "relative", width: 200, height: 180 }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: fx ? "wq-reveal .6s ease-out forwards" : "none", opacity: fx ? 1 : 0 }}><WordImage word={curWord} size={130} /></div>
                {!fx && <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "linear-gradient(180deg,#8a5a32,#6b4423)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, boxShadow: "inset 0 -10px 20px rgba(0,0,0,.25)" }}>⛰️</div>}
                {fx && <span style={{ position: "absolute", top: -6, right: 10, fontSize: 40, animation: "wq-reveal .6s ease-out" }}>💎</span>}
              </div>
            )}
            {/* ROCKET */}
            {mini.key === "rocket" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", textAlign: "center", animation: fx ? "wq-launch 1s ease-in forwards" : "wq-bob 2.6s ease-in-out infinite" }}>
                <div style={{ width: 150, height: 150, margin: "0 auto", borderRadius: "50% 50% 45% 45%", background: "linear-gradient(180deg,#eef4ff,#cdddf2)", border: "4px solid #b3c6e0", display: "flex", alignItems: "center", justifyContent: "center" }}><WordImage word={curWord} size={104} /></div>
                <div style={{ fontSize: 34, marginTop: -6 }}>{fx ? "🔥" : "🚀"}</div>
              </div>
            )}
            {/* FISH */}
            {mini.key === "fish" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>🎣</div>
                <div style={{ width: 2, height: 26, background: "#94a3b8", margin: "0 auto" }} />
                <div style={{ animation: fx ? "wq-reel .9s ease-in forwards" : "wq-bob 2.4s ease-in-out infinite" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 152, height: 152, borderRadius: 22, background: "radial-gradient(circle at 40% 30%, rgba(127,212,255,.4), rgba(59,130,214,.18))", border: "2px solid rgba(127,212,255,.6)" }}><WordImage word={curWord} size={110} /></div>
                </div>
              </div>
            )}
            {/* HOOP */}
            {mini.key === "hoop" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", position: "relative", width: 220, height: 210 }}>
                <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-28px)", width: 56, height: 16, borderRadius: "50%", border: "5px solid #e8723c", boxShadow: "0 4px 8px rgba(0,0,0,.12)" }} />
                <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-56px)", animation: fx ? "wq-hoop 1s ease-in forwards" : "wq-pulse 2s ease-in-out infinite" }}>
                  <div style={{ width: 112, height: 112, borderRadius: "50%", overflow: "hidden", border: "3px solid #e8723c", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}><WordImage word={curWord} size={96} /></div>
                </div>
              </div>
            )}
            {/* BALLOON */}
            {mini.key === "balloon" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", textAlign: "center", animation: fx ? "wq-float 1s ease-in forwards" : "wq-bob 2.6s ease-in-out infinite" }}>
                <div style={{ width: 160, height: 174, margin: "0 auto", borderRadius: "50% 50% 48% 48%", background: "radial-gradient(circle at 38% 28%, #ffd3df, #ff7aa0 72%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 22px rgba(255,122,160,.32)" }}><WordImage word={curWord} size={104} /></div>
                <div style={{ width: 2, height: 30, background: "#cbd5e1", margin: "0 auto" }} />
              </div>
            )}
            {/* PAINT */}
            {mini.key === "paint" && (
              <div onClick={play} style={{ cursor: fx ? "default" : "pointer", position: "relative", width: 200, height: 180 }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", animation: fx ? "wq-reveal .6s ease-out forwards" : "none", opacity: fx ? 1 : 0 }}><WordImage word={curWord} size={130} /></div>
                {!fx && <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>🎨</div>}
                {fx && <span style={{ position: "absolute", top: -6, right: 8, fontSize: 40, animation: "wq-reveal .6s ease-out" }}>🌈</span>}
              </div>
            )}
            {fx && sparks}
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 }}>Word {wordIdx + 1} of {curWords.length} · Camp {level + 1}</div>

          <button onClick={() => speak(curWord)} style={{ marginTop: 8, border: "2px solid #d7e6fa", background: "#eef5ff", color: "#2f6fb0", borderRadius: 12, padding: "8px 16px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>🔊 Hear it</button>

          {/* mic */}
          <div style={{ marginTop: 12 }}>
            <button onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={() => isRecording && stopRec()} onTouchStart={(e) => { e.preventDefault(); startRec(); }} onTouchEnd={(e) => { e.preventDefault(); stopRec(); }}
              style={{ width: 72, height: 72, borderRadius: "50%", border: "none", cursor: "pointer", background: isRecording ? "#ef4444" : "linear-gradient(135deg,#3b82d6,#2f6fb0)", color: "#fff", fontSize: 28, boxShadow: isRecording ? "0 0 0 8px rgba(239,68,68,.25)" : "0 6px 16px rgba(59,130,214,.45)" }}>🎤</button>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 6 }}>{isRecording ? "Recording… let go to stop" : "Press & hold to record"}</div>
            {recordingUrl && !isRecording && <button onClick={playBack} style={{ marginTop: 6, border: "2px solid #d7e6fa", background: "#eef5ff", color: "#2f6fb0", borderRadius: 10, padding: "6px 12px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>▶ Play it back</button>}
            {micError && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700, marginTop: 6 }}>{micError}</div>}
          </div>
        </div>

        {/* action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={play} disabled={fx} style={{ ...bigBtn, background: "linear-gradient(135deg,#f5b820,#e09b00)", color: "#13314f", opacity: fx ? 0.7 : 1 }}>{mini.icon} {mini.action} <span style={{ opacity: .7, fontSize: 13 }}>(G)</span></button>
          <button onClick={() => { sfx("fail"); advance(false); }} disabled={fx} style={{ ...bigBtn, flex: "0 0 130px", background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 15 }}>Not yet ▶ <span style={{ opacity: .7, fontSize: 12 }}>(N)</span></button>
        </div>
        <p style={{ textAlign: "center", color: "#bfe0ff", fontSize: 12, fontWeight: 700, marginTop: 10 }}>
          Say <b>{curWord}</b>, record &amp; play it back, then tap the {mini.icon} to {mini.verb}!
        </p>
      </div>
    </div>
  );
}
