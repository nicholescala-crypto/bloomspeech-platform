import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { speak, sfx, unlockAudio } from "../games/audio";

type Phase = "intro" | "playing" | "warp" | "won";

// 8 stops across the galaxy; the last one is home (Earth).
const PLANETS = [
  { name: "Mercury", emoji: "🪐", color: "#c79a6b" },
  { name: "Venus", emoji: "🟠", color: "#e8a33d" },
  { name: "Mars", emoji: "🔴", color: "#d1543b" },
  { name: "Jupiter", emoji: "🟤", color: "#cf9d6f" },
  { name: "Saturn", emoji: "🪐", color: "#e6c884" },
  { name: "Neptune", emoji: "🔵", color: "#4f7fe0" },
  { name: "Comet Belt", emoji: "☄️", color: "#8fb8ff" },
  { name: "Home", emoji: "🌍", color: "#3fa66a" },
];

// the task rotates per stop to keep the trip fresh
const TASKS = [
  { verb: "Fuel the ship", icon: "⛽", reward: "⛽" },
  { verb: "Collect the star", icon: "⭐", reward: "⭐" },
  { verb: "Scan the planet", icon: "🛰️", reward: "📡" },
  { verb: "Charge the core", icon: "🔋", reward: "⚡" },
];

const SHIPS = [
  { name: "Comet", emoji: "🚀" },
  { name: "Star Hopper", emoji: "🛸" },
  { name: "Astro Buddy", emoji: "🧑‍🚀" },
  { name: "Cosmo Cat", emoji: "🐱" },
];

const TARGET_STOPS = 24; // minimum length of the whole mission

const CSS = `
@keyframes sg-twinkle {0%,100%{opacity:.25}50%{opacity:1}}
@keyframes sg-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes sg-thrust {0%{transform:translateY(0) scale(1)}30%{transform:translateY(4px) scale(1.04)}100%{transform:translateY(-340px) scale(.5);opacity:0}}
@keyframes sg-pop {0%{transform:scale(1);opacity:1}100%{transform:scale(1.7);opacity:0}}
@keyframes sg-spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes sg-streak {0%{transform:translateY(-120%);opacity:0}30%{opacity:1}100%{transform:translateY(160%);opacity:0}}
@keyframes sg-fly {0%{transform:translateX(-40px) rotate(8deg)}50%{transform:translateX(0) rotate(8deg) translateY(-8px)}100%{transform:translateX(40px) rotate(8deg)}}
@keyframes sg-pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
`;

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const sound = (p.get("sound") || "").replace(/\//g, "").toLowerCase();
  const wordsParam = (p.get("words") || "").split(",").map((w) => w.trim()).filter(Boolean);
  return { sound, wordsParam };
}

function shuffle<T>(a: T[]): T[] {
  return [...a].sort(() => Math.random() - 0.5);
}

function buildJourney(words: string[]): string[][] {
  let padded = shuffle(words);
  while (padded.length < TARGET_STOPS && words.length) padded = padded.concat(shuffle(words));
  const buckets: string[][] = Array.from({ length: PLANETS.length }, () => []);
  padded.forEach((w, i) => buckets[i % PLANETS.length].push(w));
  return buckets;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", borderRadius: 14, background: "rgba(255,255,255,0.92)" }} />;
}

function Stars() {
  const dots = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      left: (i * 37) % 100,
      top: (i * 53) % 100,
      d: (i % 5) * 0.3,
      s: 2 + (i % 3),
    })),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {dots.map((d, i) => (
        <span key={i} style={{ position: "absolute", left: `${d.left}%`, top: `${d.top}%`, width: d.s, height: d.s, borderRadius: "50%", background: "#fff", animation: `sg-twinkle ${2 + d.d}s ease-in-out ${d.d}s infinite` }} />
      ))}
    </div>
  );
}

export default function SpaceGame() {
  const params = useMemo(readParams, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [ship, setShip] = useState(0);
  const [journey, setJourney] = useState<string[][]>([]);
  const [planetIdx, setPlanetIdx] = useState(0);
  const [stopIdx, setStopIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);
  const [fx, setFx] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const soundLabel = params.sound ? `/${params.sound}/` : "";
  const planetWords = journey[planetIdx] || [];
  const curWord = planetWords[stopIdx] || "";
  const totalStops = journey.reduce((n, p) => n + p.length, 0);
  const doneStops = journey.slice(0, planetIdx).reduce((n, p) => n + p.length, 0) + stopIdx;
  const task = TASKS[doneStops % TASKS.length];
  const planet = PLANETS[planetIdx] || PLANETS[0];

  function start() {
    unlockAudio();
    setJourney(buildJourney(params.wordsParam));
    setPlanetIdx(0); setStopIdx(0); setStars(0); setTries(0); setFx(false);
    setRecordingUrl(null);
    setPhase("playing");
  }

  function advance(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null); setFx(false);
    if (stopIdx + 1 < planetWords.length) {
      setStopIdx(stopIdx + 1);
    } else if (planetIdx + 1 < journey.length) {
      setPhase("warp");
    } else {
      setPhase("won");
    }
  }

  function play() {
    if (fx) return;
    sfx("success");
    setFx(true);
    window.setTimeout(() => advance(true), 1000);
  }

  // speak the target word aloud each time a new one appears (model to imitate)
  useEffect(() => { if (phase === "playing" && curWord) speak(curWord); }, [curWord, phase]);
  useEffect(() => { if (phase === "won") sfx("win"); else if (phase === "warp") sfx("level"); }, [phase]);

  // warp travel animation between planets
  useEffect(() => {
    if (phase !== "warp") return;
    const t = window.setTimeout(() => {
      setPlanetIdx((p) => p + 1);
      setStopIdx(0);
      setPhase("playing");
    }, 1400);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing" || fx) return;
      if (e.key === "g" || e.key === "G" || e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "n" || e.key === "N") advance(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    } catch { setMicError("Mic is off — you can still tap to score."); }
  }
  function stopRec() { const r = recorderRef.current; if (r && r.state !== "inactive") r.stop(); setIsRecording(false); }
  function playBack() { if (recordingUrl) new Audio(recordingUrl).play().catch(() => {}); }

  const page: CSSProperties = { minHeight: "100vh", fontFamily: "'Nunito',system-ui,Arial,sans-serif", background: "radial-gradient(circle at 50% 20%,#1b2c63,#0a1230 70%,#05081c)", color: "#fff", padding: "16px 16px 40px", position: "relative" };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 2 };
  const card: CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 18, marginBottom: 14, backdropFilter: "blur(2px)" };
  const cur = SHIPS[ship];

  // ── NO HOMEWORK ────────────────────────────────────────────────
  if (!params.wordsParam.length) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Stars />
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: 60 }}>🚀</div>
          <h1 style={{ fontSize: 24, margin: "10px 0" }}>No mission loaded</h1>
          <p style={{ maxWidth: 340, margin: "0 auto 18px", opacity: 0.85, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will fly the exact words their therapist assigned.</p>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3b82d6,#7c3aed)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
            ← Back to my child’s card
          </button>
        </div>
      </div>
    );
  }

  // ── INTRO ──────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={page}>
        <style>{CSS}</style>
        <Stars />
        <div style={{ ...wrap, textAlign: "center" }}>
          <a href="/parent" style={{ color: "#bfe0ff", fontWeight: 800, textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 8 }}>← Back</a>
          <div style={{ fontSize: 58, animation: "sg-bob 2.6s ease-in-out infinite" }}>🚀</div>
          <h1 style={{ fontSize: 30, margin: "6px 0" }}>Star Words Mission</h1>
          <p style={{ opacity: 0.85, margin: "0 0 16px" }}>Travel to 8 planets. Say each word to power your ship — reach home! {soundLabel && <>Sound: <b>{soundLabel}</b></>}</p>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#bfe0ff", marginBottom: 8 }}>Pick your ride</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {SHIPS.map((s, i) => (
              <button key={s.name} onClick={() => setShip(i)} style={{ width: 110, padding: "14px 8px", borderRadius: 16, cursor: "pointer", background: ship === i ? "rgba(123,170,255,0.25)" : "rgba(255,255,255,0.06)", border: ship === i ? "2px solid #7baaff" : "2px solid rgba(255,255,255,0.15)", color: "#fff" }}>
                <div style={{ fontSize: 38 }}>{s.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{s.name}</div>
              </button>
            ))}
          </div>
          <button onClick={start} style={{ padding: "16px 44px", borderRadius: 20, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82d6,#7c3aed)", color: "white", fontSize: 22, fontWeight: 900, boxShadow: "0 10px 30px rgba(59,130,214,0.45)" }}>
            🚀 Blast off!
          </button>
          <p style={{ opacity: 0.45, fontSize: 12, marginTop: 14 }}>{params.wordsParam.length} words · ~{Math.max(TARGET_STOPS, params.wordsParam.length)} stops · Press G = Got it, N = Not yet</p>
        </div>
      </div>
    );
  }

  // ── WARP TRAVEL ────────────────────────────────────────────────
  if (phase === "warp") {
    const next = PLANETS[Math.min(planetIdx + 1, PLANETS.length - 1)];
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <style>{CSS}</style>
        <Stars />
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{ position: "absolute", left: `${(i * 7 + 5) % 100}%`, top: 0, width: 2, height: 80, background: "linear-gradient(#fff,transparent)", animation: `sg-streak ${0.5 + (i % 4) * 0.15}s linear ${(i % 5) * 0.08}s infinite` }} />
        ))}
        <div style={{ textAlign: "center", zIndex: 2 }}>
          <div style={{ fontSize: 70, animation: "sg-fly .9s ease-in-out infinite" }}>{cur.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>Warping to {next.name} {next.emoji}</div>
        </div>
      </div>
    );
  }

  // ── WON ────────────────────────────────────────────────────────
  if (phase === "won") {
    const acc = tries ? Math.round((stars / tries) * 100) : 0;
    return (
      <div style={page}>
        <style>{CSS}</style>
        <Stars />
        <div style={{ ...wrap, textAlign: "center", paddingTop: 30 }}>
          <div style={{ fontSize: 80, animation: "sg-bob 2.4s ease-in-out infinite" }}>🌍</div>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>Mission complete!</h1>
          <p style={{ opacity: 0.85 }}>You powered {cur.name} {cur.emoji} home across the galaxy.</p>
          <div style={{ ...card, display: "inline-block", padding: "16px 28px", marginTop: 8 }}>
            <div style={{ fontSize: 30, fontWeight: 900 }}>⭐ {stars} / {totalStops}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>Accuracy {acc}% · 8 planets visited</div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={start} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3b82d6,#7c3aed)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>🚀 Fly again</button>
            <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────
  const fuelPct = planetWords.length ? Math.round(((stopIdx + (fx ? 1 : 0)) / planetWords.length) * 100) : 0;
  return (
    <div style={page}>
      <style>{CSS}</style>
      <Stars />
      <div style={wrap}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "6px 12px", color: "#cfe4ff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Exit</button>
          {soundLabel && <div style={{ fontWeight: 800, color: "#bfe0ff" }}>Sound {soundLabel}</div>}
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* planet progress */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <div style={{ position: "absolute", left: 16, right: 16, top: 18, height: 3, background: "rgba(255,255,255,0.18)" }} />
            {PLANETS.map((p, i) => {
              const st = i < planetIdx ? "done" : i === planetIdx ? "cur" : "locked";
              return (
                <div key={i} style={{ position: "relative", textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: st === "cur" ? 26 : 18, filter: st === "locked" ? "grayscale(1) opacity(.45)" : "none", animation: st === "cur" ? "sg-pulse 1.8s ease-in-out infinite" : "none" }}>{i < planetIdx ? "✅" : p.emoji}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontWeight: 900, fontSize: 15, color: planet.color }}>{planet.name} · Planet {planetIdx + 1} of {PLANETS.length}</div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.14)", borderRadius: 6, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: fuelPct + "%", background: "linear-gradient(90deg,#ffd76a,#ff8a3d)", transition: "width .35s" }} />
          </div>
        </div>

        {/* scene */}
        <div style={{ ...card, textAlign: "center", position: "relative", overflow: "hidden", minHeight: 320 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#bfe0ff" }}>
            {task.icon} {task.verb} · say <span style={{ color: "#fff" }}>{curWord}</span>{soundLabel && <> with {soundLabel}</>}
          </div>

          {/* big planet behind */}
          <div style={{ position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)", fontSize: 120, opacity: 0.18 }}>{planet.emoji}</div>

          <div style={{ position: "relative", height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "6px 0" }}>
            <div onClick={play} style={{ cursor: fx ? "default" : "pointer", animation: fx ? "sg-thrust 1s ease-in forwards" : "sg-bob 2.4s ease-in-out infinite", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 150, height: 150, borderRadius: 22, background: "radial-gradient(circle at 38% 30%, rgba(255,255,255,.95), rgba(190,225,255,.5) 60%, rgba(120,160,240,.3))", border: "2px solid rgba(255,255,255,.55)", boxShadow: "0 0 28px rgba(123,170,255,.5)" }}>
                <WordImage word={curWord} size={112} />
              </div>
              <div style={{ fontSize: 36, marginTop: -4 }}>{fx ? "🔥" : cur.emoji}</div>
            </div>
          </div>

          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
          <div style={{ fontSize: 12, color: "#9fb6d8", fontWeight: 700, marginTop: 4 }}>Stop {stopIdx + 1} of {planetWords.length} · {doneStops + 1}/{totalStops} total</div>

          {/* record (optional) */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => speak(curWord)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🔊 Hear it</button>
            {!isRecording ? (
              <button onClick={startRec} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🎤 Record</button>
            ) : (
              <button onClick={stopRec} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>⏹ Stop</button>
            )}
            {recordingUrl && <button onClick={playBack} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>▶ Play back</button>}
          </div>
          {micError && <div style={{ fontSize: 12, color: "#ffd1d1", marginTop: 6 }}>{micError}</div>}
        </div>

        {/* score buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={play} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "white", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer", opacity: fx ? 0.7 : 1 }}>
            {task.reward} Got it! <span style={{ opacity: 0.7, fontSize: 13 }}>(G)</span>
          </button>
          <button onClick={() => { sfx("fail"); advance(false); }} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "rgba(255,255,255,0.12)", color: "white", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer" }}>
            Not yet ▶ <span style={{ opacity: 0.7, fontSize: 13 }}>(N)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
