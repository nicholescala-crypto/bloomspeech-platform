import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { speak, sfx, unlockAudio } from "../games/audio";

type Phase = "intro" | "playing" | "levelDone" | "won";

const SECTION_SIZE = 4;       // blocks per tier
const TARGET_BLOCKS = 24;     // minimum total floors for a nice tall tower
const BLOCK_H = 50;

const MATERIALS = [
  { name: "Stone", block: "#9aa3ad", edge: "#6b727b" },
  { name: "Brick", block: "#c65f43", edge: "#8f3f2b" },
  { name: "Wood", block: "#c08a4e", edge: "#8a5f30" },
  { name: "Gold", block: "#e8c04a", edge: "#b48f22" },
  { name: "Crystal", block: "#6fc6e0", edge: "#3f96b0" },
  { name: "Cloud", block: "#dfe8ff", edge: "#a9bce0" },
];

const BUILDERS = [
  { name: "Builder Bo", emoji: "👷" },
  { name: "Bricky", emoji: "🧱" },
  { name: "Ellie", emoji: "🐘" },
  { name: "Robo", emoji: "🤖" },
];

const CSS = `
@keyframes tw-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes tw-drop {0%{transform:translateY(-230px) scaleY(.7);opacity:0}60%{opacity:1}80%{transform:translateY(6px) scaleY(1.15)}100%{transform:translateY(0) scaleY(1);opacity:1}}
@keyframes tw-swing {0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes tw-pop {0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes tw-spark {0%{transform:translateY(0) scale(0);opacity:1}100%{transform:translateY(-50px) scale(1.2);opacity:0}}
@keyframes tw-flag {0%{transform:translateY(14px) scale(.4);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
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

function buildSections(words: string[]): string[][] {
  let padded = shuffle(words);
  while (padded.length < TARGET_BLOCKS && words.length) padded = padded.concat(shuffle(words));
  const out: string[][] = [];
  for (let i = 0; i < padded.length; i += SECTION_SIZE) out.push(padded.slice(i, i + SECTION_SIZE));
  return out;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.82, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.95)" }} />;
}

function Block({ word, mat, size = 36 }: { word: string; mat: typeof MATERIALS[number]; size?: number }) {
  return (
    <div style={{ width: 168, height: BLOCK_H - 4, borderRadius: 10, background: mat.block, border: `3px solid ${mat.edge}`, boxShadow: "0 3px 0 rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
      <WordImage word={word} size={size} />
      <span style={{ fontWeight: 900, fontSize: 17, color: "#2b2b2b", textTransform: "lowercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{word}</span>
    </div>
  );
}

export default function TowerGame() {
  const params = useMemo(readParams, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [builder, setBuilder] = useState(0);
  const [sections, setSections] = useState<string[][]>([]);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [blockIdx, setBlockIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);
  const [fx, setFx] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const soundLabel = params.sound ? `/${params.sound}/` : "";
  const section = sections[sectionIdx] || [];
  const curWord = section[blockIdx] || "";
  const totalBlocks = sections.reduce((n, s) => n + s.length, 0);
  const floors = sections.slice(0, sectionIdx).reduce((n, s) => n + s.length, 0) + blockIdx;
  const mat = MATERIALS[sectionIdx % MATERIALS.length];
  const cur = BUILDERS[builder];

  function start() {
    unlockAudio();
    setSections(buildSections(params.wordsParam));
    setSectionIdx(0); setBlockIdx(0); setStars(0); setTries(0); setFx(false);
    setRecordingUrl(null);
    setPhase("playing");
  }

  function advance(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null); setFx(false);
    if (blockIdx + 1 < section.length) setBlockIdx(blockIdx + 1);
    else if (sectionIdx + 1 < sections.length) setPhase("levelDone");
    else setPhase("won");
  }

  function play() {
    if (fx) return;
    sfx("success");
    setFx(true);
    window.setTimeout(() => advance(true), 1000);
  }

  useEffect(() => { if (phase === "playing" && curWord) speak(curWord); }, [curWord, phase]);
  useEffect(() => { if (phase === "won") sfx("win"); else if (phase === "levelDone") sfx("level"); }, [phase]);

  function nextSection() { setSectionIdx(sectionIdx + 1); setBlockIdx(0); setPhase("playing"); }

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

  const page: CSSProperties = { minHeight: "100vh", fontFamily: "'Nunito',system-ui,Arial,sans-serif", background: "linear-gradient(180deg,#bfe3ff,#e8f5ff 55%,#dff0dc)", color: "#22364a", padding: "16px 16px 40px" };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto" };
  const card: CSSProperties = { background: "#fff", border: "2px solid #d6e6f2", borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: "0 8px 24px rgba(60,110,160,0.12)" };

  // ── NO HOMEWORK ────────────────────────────────────────────────
  if (!params.wordsParam.length) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: 60 }}>🏗️</div>
          <h1 style={{ fontSize: 24, margin: "10px 0" }}>No blueprint loaded</h1>
          <p style={{ maxWidth: 340, margin: "0 auto 18px", opacity: 0.8, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will build the exact words their therapist assigned.</p>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3f96b0,#2b6f86)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
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
          <a href="/parent" style={{ color: "#2b6f86", fontWeight: 800, textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 8 }}>← Back</a>
          <div style={{ fontSize: 58, animation: "tw-bob 2.6s ease-in-out infinite" }}>🏗️</div>
          <h1 style={{ fontSize: 30, margin: "6px 0" }}>Word Tower</h1>
          <p style={{ opacity: 0.8, margin: "0 0 16px" }}>Say each word to stack a block. Build all the way up to the castle! {soundLabel && <>Sound: <b>{soundLabel}</b></>}</p>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#2b6f86", marginBottom: 8 }}>Pick your builder</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {BUILDERS.map((b, i) => (
              <button key={b.name} onClick={() => setBuilder(i)} style={{ width: 110, padding: "14px 8px", borderRadius: 16, cursor: "pointer", background: builder === i ? "#cdeaf7" : "#fff", border: builder === i ? "2px solid #3f96b0" : "2px solid #d6e6f2", color: "#22364a" }}>
                <div style={{ fontSize: 38 }}>{b.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{b.name}</div>
              </button>
            ))}
          </div>
          <button onClick={start} style={{ padding: "16px 44px", borderRadius: 20, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3f96b0,#2b6f86)", color: "white", fontSize: 22, fontWeight: 900, boxShadow: "0 10px 30px rgba(43,111,134,0.35)" }}>
            🧱 Start building!
          </button>
          <p style={{ opacity: 0.45, fontSize: 12, marginTop: 14 }}>{params.wordsParam.length} words · ~{Math.max(TARGET_BLOCKS, params.wordsParam.length)} floors · Press G = Got it, N = Not yet</p>
        </div>
      </div>
    );
  }

  // ── LEVEL DONE (tier finished) ─────────────────────────────────
  if (phase === "levelDone") {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30, animation: "tw-flag .5s ease-out" }}>🚩</div>
          <div style={{ fontSize: 84 }}>🏢</div>
          <h2 style={{ margin: "8px 0", color: "#2b6f86" }}>{mat.name} tier done!</h2>
          <p style={{ opacity: 0.8 }}>Tower is {floors} floors tall. Next up: {MATERIALS[(sectionIdx + 1) % MATERIALS.length].name}.</p>
          <button onClick={nextSection} style={{ marginTop: 14, padding: "14px 30px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3f96b0,#2b6f86)", color: "white", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>Keep building ▲</button>
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
          <div style={{ fontSize: 30 }}>🚩</div>
          <div style={{ fontSize: 84, animation: "tw-bob 2.4s ease-in-out infinite" }}>🏰</div>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>Tower complete!</h1>
          <p style={{ opacity: 0.8 }}>{cur.name} {cur.emoji} built a castle {totalBlocks} floors high.</p>
          <div style={{ ...card, display: "inline-block", padding: "16px 28px", marginTop: 8 }}>
            <div style={{ fontSize: 30, fontWeight: 900 }}>⭐ {stars} / {totalBlocks}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Accuracy {acc}% · {totalBlocks} floors</div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={start} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3f96b0,#2b6f86)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>🧱 Build again</button>
            <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "2px solid #9cc6d8", background: "transparent", color: "#22364a", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────
  const placed = section.slice(0, blockIdx);
  const stackH = SECTION_SIZE * BLOCK_H + 96;
  const castlePct = totalBlocks ? Math.round((floors / totalBlocks) * 100) : 0;
  return (
    <div style={page}>
      <style>{CSS}</style>
      <div style={wrap}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ background: "#fff", border: "2px solid #d6e6f2", borderRadius: 10, padding: "6px 12px", color: "#2b6f86", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Exit</button>
          {soundLabel && <div style={{ fontWeight: 800, color: "#2b6f86" }}>Sound {soundLabel}</div>}
          <div style={{ background: "#fff", border: "2px solid #d6e6f2", borderRadius: 12, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* tier progress */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {sections.map((_, i) => (
              <span key={i} style={{ fontSize: i === sectionIdx ? 22 : 16, opacity: i > sectionIdx ? 0.4 : 1 }}>{i < sectionIdx ? "🟩" : i === sectionIdx ? "🏗️" : "▫️"}</span>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontWeight: 900, fontSize: 15, color: mat.edge }}>{mat.name} tier · Floor {floors + 1} of {totalBlocks}</div>
        </div>

        {/* build scene */}
        <div style={{ ...card, position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: mat.edge, textAlign: "center" }}>
            🧱 Stack the block · say <span style={{ color: "#163b3f" }}>{curWord}</span>{soundLabel && <> with {soundLabel}</>}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", justifyContent: "center", marginTop: 6 }}>
            {/* the tower column */}
            <div style={{ position: "relative", width: 180, height: stackH }}>
              {/* crane + hanging block */}
              {!fx && (
                <div onClick={play} style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 26 }}>🏗️</div>
                  <div style={{ width: 2, height: 14, background: "#7c8aa0", margin: "0 auto" }} />
                  <div style={{ animation: "tw-swing 2.2s ease-in-out infinite" }}><Block word={curWord} mat={mat} /></div>
                </div>
              )}
              {/* dropping block */}
              {fx && (
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: blockIdx * BLOCK_H + 6, animation: "tw-drop .7s ease-out" }}>
                  <Block word={curWord} mat={mat} />
                </div>
              )}
              {/* placed blocks */}
              {placed.map((w, i) => (
                <div key={w + i} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: i * BLOCK_H + 6 }}>
                  <Block word={w} mat={mat} />
                </div>
              ))}
              {/* sparkles on drop */}
              {fx && Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ position: "absolute", left: `${28 + i * 12}%`, bottom: blockIdx * BLOCK_H + 30, fontSize: 16, animation: `tw-spark .8s ease-out ${i * 0.05}s forwards` }}>✨</span>
              ))}
              {/* ground */}
              <div style={{ position: "absolute", bottom: 0, left: -10, right: -10, height: 8, background: "#7fae55", borderRadius: 4 }} />
            </div>

            {/* castle height meter */}
            <div style={{ width: 26, height: stackH, position: "relative", background: "#eaf3fa", borderRadius: 13, border: "2px solid #d6e6f2", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: castlePct + "%", background: "linear-gradient(180deg,#7fd4ff,#3f96b0)", transition: "height .4s" }} />
              <div style={{ position: "absolute", top: 2, left: 0, right: 0, textAlign: "center", fontSize: 16 }}>🏰</div>
            </div>
          </div>

          {/* current word big */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6 }}>
            <WordImage word={curWord} size={56} />
            <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
          </div>
          <div style={{ fontSize: 12, color: "#7c8aa0", fontWeight: 700, marginTop: 4, textAlign: "center" }}>Block {blockIdx + 1} of {section.length} · this tier</div>

          {/* record (optional) */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => speak(curWord)} style={{ background: "#eaf3fa", border: "2px solid #d6e6f2", color: "#2b6f86", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🔊 Hear it</button>
            {!isRecording ? (
              <button onClick={startRec} style={{ background: "#eaf3fa", border: "2px solid #d6e6f2", color: "#2b6f86", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🎤 Record</button>
            ) : (
              <button onClick={stopRec} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>⏹ Stop</button>
            )}
            {recordingUrl && <button onClick={playBack} style={{ background: "#eaf3fa", border: "2px solid #d6e6f2", color: "#2b6f86", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>▶ Play back</button>}
          </div>
          {micError && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6, textAlign: "center" }}>{micError}</div>}
        </div>

        {/* score buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={play} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "white", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer", opacity: fx ? 0.7 : 1 }}>
            🧱 Stack it! <span style={{ opacity: 0.7, fontSize: 13 }}>(G)</span>
          </button>
          <button onClick={() => { sfx("fail"); advance(false); }} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "#e3edf3", color: "#5a7182", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer" }}>
            Not yet ▶ <span style={{ opacity: 0.7, fontSize: 13 }}>(N)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
