import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";

type Phase = "intro" | "playing" | "served" | "won";

const TOPPINGS_PER_PIZZA = 3;
const TARGET_TOPPINGS = 24; // minimum total reps for a nice long shift

const CHEFS = [
  { name: "Chef Pep", emoji: "👨‍🍳" },
  { name: "Chef Mimi", emoji: "👩‍🍳" },
  { name: "Chef Bear", emoji: "🐻" },
  { name: "Chef Cat", emoji: "🐱" },
];

const CUSTOMERS = ["🧒", "👧", "👶", "🧑", "👩", "🧓", "🦸", "🐵", "🐶", "🐰", "🦊", "🐸"];

// fixed spots where finished toppings sit on the pizza
const SPOTS = [
  { top: "20%", left: "32%" },
  { top: "24%", left: "60%" },
  { top: "52%", left: "44%" },
  { top: "64%", left: "26%" },
  { top: "60%", left: "66%" },
  { top: "40%", left: "72%" },
];

const CSS = `
@keyframes pz-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes pz-drop {0%{transform:translateY(-120px) scale(.4);opacity:0}60%{opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes pz-pop {0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes pz-serve {0%{transform:translateX(0) rotate(0)}100%{transform:translateX(120px) translateY(-40px) rotate(12deg);opacity:0}}
@keyframes pz-steam {0%{transform:translateY(0) scale(1);opacity:.7}100%{transform:translateY(-26px) scale(1.4);opacity:0}}
@keyframes pz-pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes pz-spark {0%{transform:translateY(0) scale(0);opacity:1}100%{transform:translateY(-60px) scale(1.2);opacity:0}}
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

function buildOrders(words: string[]): string[][] {
  let padded = shuffle(words);
  while (padded.length < TARGET_TOPPINGS && words.length) padded = padded.concat(shuffle(words));
  const orders: string[][] = [];
  for (let i = 0; i < padded.length; i += TOPPINGS_PER_PIZZA) orders.push(padded.slice(i, i + TOPPINGS_PER_PIZZA));
  return orders;
}

function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", borderRadius: "50%", background: "rgba(255,255,255,0.95)" }} />;
}

export default function PizzaGame() {
  const params = useMemo(readParams, []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [chef, setChef] = useState(0);
  const [orders, setOrders] = useState<string[][]>([]);
  const [orderIdx, setOrderIdx] = useState(0);
  const [toppingIdx, setToppingIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [tries, setTries] = useState(0);
  const [fx, setFx] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const soundLabel = params.sound ? `/${params.sound}/` : "";
  const order = orders[orderIdx] || [];
  const curWord = order[toppingIdx] || "";
  const totalToppings = orders.reduce((n, o) => n + o.length, 0);
  const doneToppings = orders.slice(0, orderIdx).reduce((n, o) => n + o.length, 0) + toppingIdx;
  const customer = CUSTOMERS[orderIdx % CUSTOMERS.length];
  const cur = CHEFS[chef];

  function start() {
    setOrders(buildOrders(params.wordsParam));
    setOrderIdx(0); setToppingIdx(0); setStars(0); setTries(0); setFx(false);
    setRecordingUrl(null);
    setPhase("playing");
  }

  function advance(got: boolean) {
    setTries((t) => t + 1);
    if (got) setStars((s) => s + 1);
    setRecordingUrl(null); setFx(false);
    if (toppingIdx + 1 < order.length) setToppingIdx(toppingIdx + 1);
    else setPhase("served");
  }

  function play() {
    if (fx) return;
    setFx(true);
    window.setTimeout(() => advance(true), 1000);
  }

  // brief "served" beat, then next customer (or finish)
  useEffect(() => {
    if (phase !== "served") return;
    const t = window.setTimeout(() => {
      if (orderIdx + 1 < orders.length) { setOrderIdx((o) => o + 1); setToppingIdx(0); setPhase("playing"); }
      else setPhase("won");
    }, 1500);
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

  const page: CSSProperties = { minHeight: "100vh", fontFamily: "'Nunito',system-ui,Arial,sans-serif", background: "linear-gradient(180deg,#fff4e0,#ffe2b8 60%,#ffcf8a)", color: "#5b3a1a", padding: "16px 16px 40px" };
  const wrap: CSSProperties = { maxWidth: 720, margin: "0 auto" };
  const card: CSSProperties = { background: "#fff", border: "2px solid #f0d6a8", borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: "0 8px 24px rgba(180,120,40,0.12)" };

  // ── NO HOMEWORK ────────────────────────────────────────────────
  if (!params.wordsParam.length) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: 60 }}>🍕</div>
          <h1 style={{ fontSize: 24, margin: "10px 0" }}>No orders loaded</h1>
          <p style={{ maxWidth: 340, margin: "0 auto 18px", opacity: 0.8, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will cook the exact words their therapist assigned.</p>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#e8723c,#c8521f)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
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
          <a href="/parent" style={{ color: "#c8521f", fontWeight: 800, textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 8 }}>← Back</a>
          <div style={{ fontSize: 58, animation: "pz-bob 2.6s ease-in-out infinite" }}>🍕</div>
          <h1 style={{ fontSize: 30, margin: "6px 0" }}>Bloom Pizza</h1>
          <p style={{ opacity: 0.8, margin: "0 0 16px" }}>Each order wants a word topping. Say it to add it, then serve the pizza! {soundLabel && <>Sound: <b>{soundLabel}</b></>}</p>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#c8521f", marginBottom: 8 }}>Pick your chef</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {CHEFS.map((c, i) => (
              <button key={c.name} onClick={() => setChef(i)} style={{ width: 110, padding: "14px 8px", borderRadius: 16, cursor: "pointer", background: chef === i ? "#ffe1c2" : "#fff", border: chef === i ? "2px solid #e8723c" : "2px solid #f0d6a8", color: "#5b3a1a" }}>
                <div style={{ fontSize: 38 }}>{c.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{c.name}</div>
              </button>
            ))}
          </div>
          <button onClick={start} style={{ padding: "16px 44px", borderRadius: 20, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#e8723c,#c8521f)", color: "white", fontSize: 22, fontWeight: 900, boxShadow: "0 10px 30px rgba(200,82,31,0.35)" }}>
            🍕 Open the shop!
          </button>
          <p style={{ opacity: 0.45, fontSize: 12, marginTop: 14 }}>{params.wordsParam.length} words · ~{Math.ceil(Math.max(TARGET_TOPPINGS, params.wordsParam.length) / TOPPINGS_PER_PIZZA)} pizzas · Press G = Got it, N = Not yet</p>
        </div>
      </div>
    );
  }

  // ── SERVED ─────────────────────────────────────────────────────
  if (phase === "served") {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <span style={{ position: "absolute", top: -18, left: "40%", fontSize: 20, animation: "pz-steam 1s ease-out infinite" }}>♨️</span>
            <div style={{ fontSize: 96, animation: "pz-serve 1.4s ease-in forwards" }}>🍕</div>
          </div>
          <div style={{ fontSize: 64 }}>{customer}😋</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: "#c8521f" }}>Order served! ⭐ +tip</div>
        </div>
      </div>
    );
  }

  // ── WON ────────────────────────────────────────────────────────
  if (phase === "won") {
    const acc = tries ? Math.round((stars / tries) * 100) : 0;
    const rating = acc >= 85 ? 3 : acc >= 60 ? 2 : 1;
    return (
      <div style={page}>
        <style>{CSS}</style>
        <div style={{ ...wrap, textAlign: "center", paddingTop: 30 }}>
          <div style={{ fontSize: 80, animation: "pz-bob 2.4s ease-in-out infinite" }}>🍕</div>
          <h1 style={{ fontSize: 30, margin: "8px 0" }}>Shop closed — great shift!</h1>
          <p style={{ opacity: 0.8 }}>{cur.name} {cur.emoji} served the whole neighborhood.</p>
          <div style={{ ...card, display: "inline-block", padding: "16px 28px", marginTop: 8 }}>
            <div style={{ fontSize: 30 }}>{"⭐".repeat(rating)}{"☆".repeat(3 - rating)}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{orders.length} pizzas served</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Accuracy {acc}% · ⭐ {stars}/{totalToppings} toppings</div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={start} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#e8723c,#c8521f)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>🍕 Open again</button>
            <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "2px solid #e8a36c", background: "transparent", color: "#5b3a1a", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────
  const placed = order.slice(0, toppingIdx); // toppings already on the pizza
  return (
    <div style={page}>
      <style>{CSS}</style>
      <div style={wrap}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => { window.location.href = "/parent"; }} style={{ background: "#fff", border: "2px solid #f0d6a8", borderRadius: 10, padding: "6px 12px", color: "#c8521f", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Exit</button>
          {soundLabel && <div style={{ fontWeight: 800, color: "#c8521f" }}>Sound {soundLabel}</div>}
          <div style={{ background: "#fff", border: "2px solid #f0d6a8", borderRadius: 12, padding: "6px 12px", fontWeight: 900 }}>⭐ {stars}</div>
        </div>

        {/* order progress */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {orders.map((_, i) => (
              <span key={i} style={{ fontSize: i === orderIdx ? 22 : 16, opacity: i > orderIdx ? 0.4 : 1 }}>{i < orderIdx ? "✅" : i === orderIdx ? "🍕" : "•"}</span>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 6, fontWeight: 900, fontSize: 15, color: "#c8521f" }}>Pizza {orderIdx + 1} of {orders.length} · {doneToppings + 1}/{totalToppings} toppings</div>
        </div>

        {/* customer order */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
          <div style={{ fontSize: 46, animation: "pz-bob 2.6s ease-in-out infinite" }}>{customer}</div>
          <div style={{ background: "#fff7ec", border: "2px solid #f0d6a8", borderRadius: 14, padding: "10px 14px", flex: 1, fontWeight: 800 }}>
            “I’d like <span style={{ color: "#c8521f" }}>{curWord}</span> on my pizza, please!”
          </div>
        </div>

        {/* pizza scene */}
        <div style={{ ...card, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#c8723c" }}>
            🍕 Add the topping · say <span style={{ color: "#163b3f" }}>{curWord}</span>{soundLabel && <> with {soundLabel}</>}
          </div>

          <div onClick={play} style={{ position: "relative", width: 220, height: 220, margin: "14px auto 6px", cursor: fx ? "default" : "pointer", animation: fx ? "pz-pop .5s ease-out" : "pz-pulse 2.4s ease-in-out infinite" }}>
            {/* crust + cheese */}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #ffd97a 0 62%, #e8a33d 63% 78%, #c8802f 79%)", boxShadow: "inset 0 -8px 18px rgba(150,90,20,.3), 0 8px 18px rgba(180,120,40,.25)" }} />
            {/* placed toppings */}
            {placed.map((w, i) => (
              <div key={w + i} style={{ position: "absolute", width: 52, height: 52, ...SPOTS[i % SPOTS.length], transform: "translate(-50%,-50%)" }}>
                <WordImage word={w} size={52} />
              </div>
            ))}
            {/* the topping being added */}
            {fx && (
              <div style={{ position: "absolute", width: 52, height: 52, ...SPOTS[toppingIdx % SPOTS.length], transform: "translate(-50%,-50%)", animation: "pz-drop .6s ease-out" }}>
                <WordImage word={curWord} size={52} />
              </div>
            )}
            {fx && Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ position: "absolute", left: `${30 + i * 12}%`, top: "50%", fontSize: 18, animation: `pz-spark .8s ease-out ${i * 0.05}s forwards` }}>✨</span>
            ))}
          </div>

          {/* the word being said, big with its photo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <WordImage word={curWord} size={64} />
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, textTransform: "lowercase" }}>{curWord}</div>
          </div>
          <div style={{ fontSize: 12, color: "#a07a4a", fontWeight: 700, marginTop: 4 }}>Topping {toppingIdx + 1} of {order.length}</div>

          {/* record (optional) */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {!isRecording ? (
              <button onClick={startRec} style={{ background: "#fff7ec", border: "2px solid #f0d6a8", color: "#c8521f", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>🎤 Record</button>
            ) : (
              <button onClick={stopRec} style={{ background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>⏹ Stop</button>
            )}
            {recordingUrl && <button onClick={playBack} style={{ background: "#fff7ec", border: "2px solid #f0d6a8", color: "#c8521f", borderRadius: 12, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>▶ Play back</button>}
          </div>
          {micError && <div style={{ fontSize: 12, color: "#c0392b", marginTop: 6 }}>{micError}</div>}
        </div>

        {/* score buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={play} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#27c06b,#1ea65a)", color: "white", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer", opacity: fx ? 0.7 : 1 }}>
            🍕 Add it! <span style={{ opacity: 0.7, fontSize: 13 }}>(G)</span>
          </button>
          <button onClick={() => advance(false)} disabled={fx} style={{ padding: "18px 12px", borderRadius: 16, border: "none", background: "#f3e2c8", color: "#7a5a30", fontSize: 18, fontWeight: 900, cursor: fx ? "default" : "pointer" }}>
            Not yet ▶ <span style={{ opacity: 0.7, fontSize: 13 }}>(N)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
