import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";

type Phase = "intro" | "playing" | "bedDone" | "won";

const BED_SIZE = 4;            // flowers per garden bed
const TARGET_FLOWERS = 24;     // minimum total flowers for a full garden

const SEASONS = [
  { name: "Spring", emoji: "🌷", sky: "#e2f5e8", soil: "#8a5a34", petal: "#ff8ab5" },
  { name: "Summer", emoji: "☀️", sky: "#fff3d4", soil: "#7a4e2c", petal: "#ffab33" },
  { name: "Autumn", emoji: "🍂", sky: "#ffe7cf", soil: "#6f4626", petal: "#e0602f" },
  { name: "Winter", emoji: "❄️", sky: "#e6f2ff", soil: "#5f4a3a", petal: "#7fb3ff" },
  { name: "Rainbow", emoji: "🌈", sky: "#f3e8ff", soil: "#6b4a30", petal: "#b06bff" },
  { name: "Meadow", emoji: "🌼", sky: "#eaf7d8", soil: "#6f5a2c", petal: "#ffd23a" },
];

const GARDENERS = [
  { name: "Daisy", emoji: "👩‍🌾" },
  { name: "Sunny", emoji: "🧑‍🌾" },
  { name: "Buzz", emoji: "🐝" },
  { name: "Hoppy", emoji: "🐰" },
];

const CSS = `
@keyframes gg-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes gg-grow {0%{transform:scale(0) translateY(16px);opacity:0}60%{opacity:1}80%{transform:scale(1.12) translateY(0)}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes gg-sway {0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes gg-water {0%{transform:rotate(0)}40%{transform:rotate(-32deg)}100%{transform:rotate(-32deg)}}
@keyframes gg-drop {0%{transform:translateY(-6px);opacity:0}30%{opacity:1}100%{transform:translateY(26px);opacity:0}}
@keyframes gg-spark {0%{transform:translateY(0) scale(0);opacity:1}100%{transform:translateY(-46px) scale(1.2);opacity:0}}
@keyframes gg-pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
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

function buildBeds(words: string[]): string[][] {
  let padded = shuffle(words);
  while (padded.length < TARGET_FLOWERS && words.length) padded = padded.concat(shuffle(words));
  const out: string[][] = [];
  for (let i = 0; i < padded.length; i += BED_SIZE) out.push(padded.slice(i, i + BED_SIZE));
  return out;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.82, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }} />;
}

function Flower({ word, petal, size = 62, animate = false }: { word: string; petal: string; size?: number; animate?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: animate ? "gg-grow .8s ease-out" : "gg-sway 3s ease-in-out infinite", transformOrigin: "bottom center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <span key={a} style={{ position: "absolute", top: "50%", left: "50%", width: size * 0.52, height: size * 0.52, borderRadius: "50%", background: petal, transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-${size * 0.3}px)` }} />
        ))}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: size * 0.66, height: size * 0.66, borderRadius: "50%", overflow: "hidden", border: "2px solid #fff", background: "#fff", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <WordImage word={word} size={size * 0.62} />
        </div>
      </div>
      <div style={{ width: 4, height: 24, background: "#3f9d4a" }} />
      <div style={{ width: 20, height: 6, background: "#3f9d4a", borderRadius: 6, marginTop: -14, transform: "rotate(-20deg)" }} />
    </div>
  );
}

export default function GardenGame() {
  const params = useMemo(readParams, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [gardener, setGardener] = useState(0);
  const [beds, setBeds] = useState<string[][]>([]);
  const [bedIdx, setBedIdx] = useState(0);
  const [plotIdx, setPlotIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);
  const [fx, setFx] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const soundLabel = params.sound ? `/${params.sound}/` : "";
  const bed = beds[bedIdx] || [];
  const curWord = bed[plotIdx] || "";
  const totalFlowers = beds.reduce((n, b) => n + b.length, 0);
  const grown = beds.slice(0, bedIdx).reduce((n, b) => n + b.length, 0) + plotIdx;
  const season = SEASONS[bedIdx % SEASONS.length];
  const cur = GARDENERS[gardener];

  function start() {
    setBeds(buildBeds(params.wordsParam));
    setBedIdx(0); setPlotIdx(0); setStars(0); setTries(0); setFx(false);
    setRecordingUrl(null);
    setPhase("playing");
  }

  function advance(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null); setFx(false);
    if (plotIdx + 1 < bed.length) setPlotIdx(plotIdx + 1);
    else if (bedIdx + 1 < beds.length) setPhase("bedDone");
    else setPhase("won");
  }

  function play() {
    if (fx) return;
    setFx(true);
    window.setTimeout(() => advance(true), 1000);
  }

  function nextBed() { setBedIdx(bedIdx + 1); setPlotIdx(0); setPhase("playing"); }

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

  const page: CSSProperties = { minHeight: "100vh", fontFamily: "'Nunito',system-ui,Arial,sans-serif", background: "linear-gradient(180deg,#d8f0ff,#eafbe8 55%,#d7f0cf)", color: "#2f4a2f", padding: "16px 16px 40px" };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto" };
  const card: CSSProperties = { background: "#fff", border: "2px solid #d6ecc9", borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: "0 8px 24px rgba(80,140,60,0.12)" };

  // ── NO HOMEWORK ────────────────────────────────────────────────
  if (!params.wordsParam.length) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: 60 }}>🌱</div>
          <h1 style={{ fontSize: 24, margin: "10px 0" }}>No seeds loaded</h1>
          <p style={{ maxWidth: 340, margin: "0 auto 18px", opacity: 0.8, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will grow the exact words their therapist assigned.</p>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#5bbf5b,#3f9d4a)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
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
        <div style={{ ...wrap, textAlign: "center" }}>
          <a href="/parent" style={{ color: "#3f9d4a", fontWeight: 800, textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 8 }}>← Back</a>
          <div style={{ fontSize: 58, animation: "gg-bob 2.6s ease-in-out infinite" }}>🌻</div>
          <h1 style={{ fontSize: 30, margin: "6px 0" }}>Bloom Garden</h1>
          <p style={{ opacity: 0.8, margin: "0 0 16px" }}>Say each word to water a seed and grow a flower. Fill the whole garden! {soundLabel && <>Sound: <b>{soundLabel}</b></>}</p>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#3f9d4a", marginBottom: 8 }}>Pick your gardener</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {GARDENERS.map((g, i) => (
              <button key={g.name} onClick={() => setGardener(i)} style={{ width: 110, padding: "14px 8px", borderRadius: 16, cursor: "pointer", background: gardener === i ? "#d6f0cf" : "#fff", border: gardener === i ? "2px solid #3f9d4a" : "2px solid #d6ecc9", color: "#2f4a2f" }}>
                <div style={{ fontSize: 38 }}>{g.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{g.name}</div>
              </button>
            ))}
          </div>
          <button onClick={start} style={{ padding: "16px 44px", borderRadius: 20, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#5bbf5b,#3f9d4a)", color: "white", fontSize: 22, fontWeight: 900, boxShadow: "0 10px 30px rgba(63,157,74,0.35)" }}>
            🌱 Start planting!
          </button>
          <p style={{ opacity: 0.45, fontSize: 12, marginTop: 14 }}>{params.wordsParam.length} words · ~{Math.max(TARGET_FLOWERS, params.wordsParam.length)} flowers · Press G = Got it, N = Not yet</p>
        </div>
      </div>
    );
  }

  // ── BED DONE (season finished) ─────────────────────────────────
  if (phase === "bedDone") {
    const next = SEASONS[(bedIdx + 1) % SEASONS.length];
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 84, animation: "gg-bob 2.2s ease-in-out infinite" }}>{season.emoji}🌼</div>
          <h2 style={{ margin: "8px 0", color: "#3f9d4a" }}>{season.name} bed in full bloom!</h2>
          <p style={{ opacity: 0.8 }}>{grown} flowers grown. Next up: {next.name} {next.emoji}.</p>
          <button onClick={nextBed} style={{ marginTop: 14, padding: "14px 30px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#5bbf5b,#3f9d4a)", color: "white", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>Plant more 🌱</button>
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
        <div style={{ ...wrap, textAlign: "center", paddingTop: 30 }}>
          <div style={{ fontSize: 40 }}>🌸🌻🌷🌼🌹</div>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>Garden in full bloom!</h1>
          <p style={{ opacity: 0.8 }}>{cur.name} {cur.emoji} grew {totalFlowers} flowers across every season.</p>
          <div style={{ ...card, display: "inline-block", padding: "16px 28px", marginTop: 8 }}>
            <div style={{ fontSize: 30, fontWeight: 900 }}>⭐ {stars} / {totalFlowers}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Accuracy {acc}% · {totalFlowers} flowers</div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={start} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#5bbf5b,#3f9d4a)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>🌱 Grow again</button>
            <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "2px solid #a9d99b", background: "transparent", color: "#2f4a2f", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────
  const bloomPct = totalFlowers ? Math.round((grown / totalFlowers) * 100) : 0;
  return (
    <div style={page}>
      <style>{CSS}</style>
      <div style={wrap}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ background: "#fff", border: "2px solid #d6ecc9", borderRadius: 10, padding: "6px 12px", color: "#3f9d4a", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Exit</button>
          {soundLabel && <div style={{ fontWeight: 800, color: "#3f9d4a" }}>Sound {soundLabel}</div>}
          <div style={{ background: "#fff", border: "2px solid #d6ecc9", borderRadius: 12, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* bed progress */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {beds.map((_, i) => (
              <span key={i} style={{ fontSize: i === bedIdx ? 22 : 16, opacity: i > bedIdx ? 0.4 : 1 }}>{i < bedIdx ? "🌸" : i === bedIdx ? "🌱" : "•"}</span>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontWeight: 900, fontSize: 15, color: "#3f9d4a" }}>{season.emoji} {season.name} bed · Flower {grown + 1} of {totalFlowers}</div>
          <div style={{ height: 8, background: "#e6f2df", borderRadius: 6, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: bloomPct + "%", background: "linear-gradient(90deg,#a7e37f,#3f9d4a)", transition: "width .4s" }} />
          </div>
        </div>

        {/* garden scene */}
        <div style={{ ...card, position: "relative", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 14px 4px", fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#3f9d4a", textAlign: "center" }}>
            💧 Water the seed · say <span style={{ color: "#163b3f" }}>{curWord}</span>{soundLabel && <> with {soundLabel}</>}
          </div>

          {/* sky + bed */}
          <div style={{ position: "relative", background: season.sky, minHeight: 180, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, padding: "18px 10px 0" }}>
            {bed.map((w, i) => {
              const state = i < plotIdx ? "grown" : i === plotIdx ? "current" : "empty";
              return (
                <div key={i} style={{ flex: 1, maxWidth: 84, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", minHeight: 150 }}>
                  {state === "grown" && <Flower word={w} petal={season.petal} />}
                  {state === "current" && !fx && (
                    <div onClick={play} style={{ cursor: "pointer", textAlign: "center", animation: "gg-pulse 1.8s ease-in-out infinite" }}>
                      <div style={{ fontSize: 30 }}>🌱</div>
                    </div>
                  )}
                  {state === "current" && fx && (
                    <div style={{ position: "relative", textAlign: "center" }}>
                      <span style={{ position: "absolute", top: -34, left: "52%", fontSize: 26, animation: "gg-water .9s ease-in-out" }}>🪣</span>
                      <span style={{ position: "absolute", top: -8, left: "46%", fontSize: 14, animation: "gg-drop .8s ease-in infinite" }}>💧</span>
                      {Array.from({ length: 4 }).map((_, s) => (
                        <span key={s} style={{ position: "absolute", top: -10, left: `${30 + s * 14}%`, fontSize: 14, animation: `gg-spark .8s ease-out ${s * 0.06}s forwards` }}>✨</span>
                      ))}
                      <Flower word={w} petal={season.petal} animate />
                    </div>
                  )}
                  {state === "empty" && <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.18)" }} />}
                </div>
              );
            })}
            {/* soil */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, background: season.soil }} />
          </div>

          <div style={{ padding: "10px 14px 14px" }}>
            {/* current word big */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", border: "2px solid #d6ecc9", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WordImage word={curWord} size={54} />
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
            </div>
            <div style={{ fontSize: 12, color: "#7c9a6f", fontWeight: 700, marginTop: 4, textAlign: "center" }}>Flower {plotIdx + 1} of {bed.length} · this bed</div>

            {/* record (optional) */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {!isRecording ? (
                <button onClick={startRec} style={{ background: "#eef7e8", border: "2px solid #d6ecc9", color: "#3f9d4a", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🎤 Record</button>
              ) : (
                <button onClick={stopRec} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>⏹ Stop</button>
              )}
              {recordingUrl && <button onClick={playBack} style={{ background: "#eef7e8", border: "2px solid #d6ecc9", color: "#3f9d4a", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>▶ Play back</button>}
            </div>
            {micError && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6, textAlign: "center" }}>{micError}</div>}
          </div>
        </div>

        {/* score buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={play} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "white", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer", opacity: fx ? 0.7 : 1 }}>
            💧 Water it! <span style={{ opacity: 0.7, fontSize: 13 }}>(G)</span>
          </button>
          <button onClick={() => advance(false)} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "#e3efdc", color: "#5a7150", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer" }}>
            Not yet ▶ <span style={{ opacity: 0.7, fontSize: 13 }}>(N)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
