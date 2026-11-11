import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { sfx, speak, unlockAudio } from "../games/audio";

// Say it, then play: the child SAYS the word, the grown-up taps Got it or
// Try again, and every try earns a building turn. The child drags (or taps)
// one of three parts onto their own rocket. At the end they choose where the
// rocket flies, and it launches there. Effort earns the turn, never accuracy.

type Result = "got" | "sprout";

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const words = (p.get("words") || "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  return {
    words,
    targetSound: p.get("targetSound") || "",
    sentence: p.get("mode") === "sentence" || words.some((w) => w.includes(" ")),
  };
}

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildQueue(words: string[]): string[] {
  const total = Math.max(10, Math.min(20, words.length * 3));
  const q: string[] = [];
  while (q.length < total) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) {
      round = [...round.slice(1), round[0]];
    }
    q.push(...round);
  }
  return q.slice(0, total);
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/";
  }
}

// ── Rocket design ──────────────────────────────────────────────────
type Sticker = { kind: "star" | "heart" | "bolt" | "moon"; x: number; y: number };
type Design = {
  body?: string;
  nose?: "point" | "round" | "tall";
  fins?: "small" | "big" | "swoosh";
  window?: "one" | "two" | "star";
  stripe?: "band" | "dots" | "zigzag";
  fire?: "orange" | "blue" | "rainbow";
  stickers: Sticker[];
};
type Slot = Exclude<keyof Design, "stickers">;
type Option = { label: string; slot: Slot | "sticker"; value: string };

const SLOTS: { slot: Slot; prompt: string; options: Option[] }[] = [
  { slot: "body", prompt: "Pick a color for your rocket!", options: [
    { label: "Red", slot: "body", value: "#e53935" },
    { label: "Blue", slot: "body", value: "#1e88e5" },
    { label: "Purple", slot: "body", value: "#8e24aa" },
  ] },
  { slot: "nose", prompt: "Pick a top!", options: [
    { label: "Pointy", slot: "nose", value: "point" },
    { label: "Round", slot: "nose", value: "round" },
    { label: "Extra tall", slot: "nose", value: "tall" },
  ] },
  { slot: "fins", prompt: "Pick some wings!", options: [
    { label: "Small", slot: "fins", value: "small" },
    { label: "Big", slot: "fins", value: "big" },
    { label: "Swoosh", slot: "fins", value: "swoosh" },
  ] },
  { slot: "window", prompt: "Pick a window!", options: [
    { label: "One", slot: "window", value: "one" },
    { label: "Two", slot: "window", value: "two" },
    { label: "Star", slot: "window", value: "star" },
  ] },
  { slot: "stripe", prompt: "Pick a pattern!", options: [
    { label: "Stripe", slot: "stripe", value: "band" },
    { label: "Dots", slot: "stripe", value: "dots" },
    { label: "Zigzag", slot: "stripe", value: "zigzag" },
  ] },
  { slot: "fire", prompt: "Pick your rocket fire!", options: [
    { label: "Orange", slot: "fire", value: "orange" },
    { label: "Blue", slot: "fire", value: "blue" },
    { label: "Rainbow", slot: "fire", value: "rainbow" },
  ] },
];
const STICKERS: Option[] = [
  { label: "Star", slot: "sticker", value: "star" },
  { label: "Heart", slot: "sticker", value: "heart" },
  { label: "Lightning", slot: "sticker", value: "bolt" },
  { label: "Moon", slot: "sticker", value: "moon" },
];

function nextChoices(turn: number): { prompt: string; options: Option[] } {
  if (turn < SLOTS.length) return SLOTS[turn];
  return { prompt: "Drag a sticker onto your rocket!", options: shuffle(STICKERS).slice(0, 3) };
}

function starPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function StickerShape({ s }: { s: Sticker }) {
  return (
    <g transform={`translate(${s.x} ${s.y}) scale(1.6) translate(${-s.x} ${-s.y})`}>
      <StickerBase s={s} />
    </g>
  );
}

function StickerBase({ s }: { s: Sticker }) {
  const { x, y } = s;
  if (s.kind === "star") return <polygon points={starPoints(x, y, 7)} fill="#ffd54f" stroke="#f9a825" strokeWidth="1" />;
  if (s.kind === "heart")
    return <path d={`M${x} ${y + 6} C${x - 9} ${y - 1} ${x - 5} ${y - 9} ${x} ${y - 3} C${x + 5} ${y - 9} ${x + 9} ${y - 1} ${x} ${y + 6} Z`} fill="#ff6fa5" />;
  if (s.kind === "bolt")
    return <polygon points={`${x + 2},${y - 8} ${x - 5},${y + 1} ${x},${y + 1} ${x - 2},${y + 8} ${x + 5},${y - 1} ${x},${y - 1}`} fill="#ffeb3b" stroke="#f9a825" strokeWidth="1" />;
  return <path d={`M${x + 3} ${y - 7} A7 7 0 1 0 ${x + 3} ${y + 7} A5.5 5.5 0 1 1 ${x + 3} ${y - 7} Z`} fill="#fff59d" stroke="#fbc02d" strokeWidth="1" />;
}

function Rocket({ d, flame = false, size = 150 }: { d: Design; flame?: boolean; size?: number }) {
  const body = d.body || "#cfd8dc";
  const fin = d.body ? "#37474f" : "#b0bec5";
  const fireColors =
    d.fire === "blue" ? ["#4fc3f7", "#e1f5fe"] : d.fire === "rainbow" ? ["#e040fb", "#ffeb3b"] : ["#ff7043", "#ffee58"];
  return (
    <svg viewBox="0 0 120 220" width={size * 0.55} height={size} style={{ overflow: "visible", display: "block" }}>
      {(d.fire || flame) && (
        <g className={flame ? "rk-flame-big" : "rk-flame"}>
          <path d="M44 178 Q60 230 76 178 Z" fill={fireColors[0]} />
          <path d="M51 178 Q60 210 69 178 Z" fill={fireColors[1]} />
        </g>
      )}
      {d.fins === "big" ? (
        <>
          <path d="M38 120 L8 182 L40 172 Z" fill={fin} />
          <path d="M82 120 L112 182 L80 172 Z" fill={fin} />
        </>
      ) : d.fins === "swoosh" ? (
        <>
          <path d="M38 110 Q4 150 14 190 Q26 172 40 172 Z" fill={fin} />
          <path d="M82 110 Q116 150 106 190 Q94 172 80 172 Z" fill={fin} />
        </>
      ) : d.fins === "small" ? (
        <>
          <path d="M38 145 L22 180 L40 175 Z" fill={fin} />
          <path d="M82 145 L98 180 L80 175 Z" fill={fin} />
        </>
      ) : null}
      <path d="M38 60 Q38 55 43 55 L77 55 Q82 55 82 60 L84 170 Q84 178 76 178 L44 178 Q36 178 36 170 Z" fill={body} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      {d.nose === "point" && <path d="M38 57 L60 10 L82 57 Z" fill="#eceff1" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />}
      {d.nose === "round" && <path d="M38 57 Q38 14 60 14 Q82 14 82 57 Z" fill="#eceff1" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />}
      {d.nose === "tall" && <path d="M38 57 Q52 34 60 -6 Q68 34 82 57 Z" fill="#eceff1" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />}
      {d.stripe === "band" && <rect x="37" y="136" width="46" height="12" fill="#fff" opacity=".85" />}
      {d.stripe === "dots" && [44, 54, 64, 74].map((x) => <circle key={x} cx={x + 1} cy="142" r="3.5" fill="#fff" opacity=".9" />)}
      {d.stripe === "zigzag" && <polyline points="37,148 45,136 53,148 61,136 69,148 77,136 83,145" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />}
      {d.window === "one" && <circle cx="60" cy="95" r="14" fill="#b3e5fc" stroke="#eceff1" strokeWidth="4" />}
      {d.window === "two" && (
        <>
          <circle cx="60" cy="82" r="10" fill="#b3e5fc" stroke="#eceff1" strokeWidth="3.5" />
          <circle cx="60" cy="112" r="10" fill="#b3e5fc" stroke="#eceff1" strokeWidth="3.5" />
        </>
      )}
      {d.window === "star" && <polygon points={starPoints(60, 96, 16)} fill="#b3e5fc" stroke="#eceff1" strokeWidth="3" />}
      {d.stickers.map((s, i) => <StickerShape key={i} s={s} />)}
    </svg>
  );
}

function OptionPreview({ opt, design }: { opt: Option; design: Design }) {
  if (opt.slot === "sticker") {
    return (
      <svg viewBox="0 0 30 30" width="64" height="64">
        <StickerShape s={{ kind: opt.value as Sticker["kind"], x: 15, y: 15 }} />
      </svg>
    );
  }
  const preview: Design = { ...design, [opt.slot]: opt.value };
  return <Rocket d={preview} size={92} />;
}

// ── Planets for the trip ───────────────────────────────────────────
type Dest = "moon" | "red" | "rings";
const DESTS: { id: Dest; label: string; landed: string }[] = [
  { id: "moon", label: "The Moon", landed: "You landed on the Moon! Bouncy moon jumps!" },
  { id: "red", label: "The red planet", landed: "You landed on the red planet! Red dust everywhere!" },
  { id: "rings", label: "The ring planet", landed: "You flew around the rings! Wheee!" },
];

function Planet({ id, size = 70 }: { id: Dest; size?: number }) {
  if (id === "moon")
    return (
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx="40" cy="40" r="34" fill="#e0e0e0" />
        <circle cx="28" cy="30" r="7" fill="#bdbdbd" />
        <circle cx="52" cy="48" r="9" fill="#bdbdbd" />
        <circle cx="34" cy="56" r="4" fill="#bdbdbd" />
      </svg>
    );
  if (id === "red")
    return (
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx="40" cy="40" r="34" fill="#e57348" />
        <path d="M10 34 Q40 26 70 36" stroke="#c4552c" strokeWidth="5" fill="none" />
        <path d="M14 52 Q40 46 66 54" stroke="#c4552c" strokeWidth="4" fill="none" />
      </svg>
    );
  return (
    <svg viewBox="0 0 100 80" width={size * 1.25} height={size}>
      <circle cx="50" cy="40" r="26" fill="#ffca6b" />
      <ellipse cx="50" cy="42" rx="48" ry="11" fill="none" stroke="#b388ff" strokeWidth="6" />
      <path d="M24 38 A26 26 0 0 1 76 38" fill="#ffca6b" />
    </svg>
  );
}

const CSS = `
.sp-page{min-height:100vh;background:linear-gradient(#e8f7ff,#f3fbf4 70%);font-family:'Nunito',Arial,sans-serif;color:#163b3f;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center}
.sp-card{background:#fff;border-radius:24px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:18px;width:100%;max-width:620px;box-sizing:border-box;text-align:center}
.sp-top{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:620px;margin-bottom:10px;gap:8px}
.sp-pill{background:#fff;border-radius:999px;padding:6px 14px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:15px}
.sp-link{background:none;border:none;color:#2a7d78;font-weight:800;font-size:15px;cursor:pointer;padding:6px;font-family:inherit}
.sp-say{font-size:28px;font-weight:900;margin:0 0 8px}
.sp-main{display:flex;gap:16px;align-items:center;justify-content:center}
.sp-left{flex:1;min-width:0}
.sp-pad{width:170px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-height:290px;border-radius:18px;background:linear-gradient(#eef7ff,#dfeefc);padding:8px 0;position:relative}
.sp-pad::after{content:"";position:absolute;bottom:4px;left:12px;right:12px;height:8px;border-radius:4px;background:#90a4ae}
.sp-pad.sp-hot{outline:4px dashed #2fb8ae;outline-offset:2px}
.sp-pic{width:min(220px,48vw);height:min(220px,48vw);object-fit:contain;border-radius:20px;background:#fff;display:block;margin:0 auto}
.sp-pic-word{display:flex;align-items:center;justify-content:center;background:#fff4e0;font-size:32px;font-weight:900;padding:12px;box-sizing:border-box}
.sp-word{font-size:34px;font-weight:900;margin:8px 0 2px}
.sp-sentence{font-size:26px;font-weight:900;line-height:1.3;margin:16px 0;padding:16px;background:#fff4e0;border-radius:18px}
.sp-hear{background:#e6f4f3;border:none;border-radius:999px;padding:10px 20px;font-size:17px;font-weight:800;color:#1f6e69;cursor:pointer;margin:6px 0 2px;font-family:inherit}
.sp-again-note{color:#c26a00;font-weight:800;font-size:18px;min-height:24px;margin:4px 0}
.sp-grown{font-size:14px;color:#567;font-weight:700;margin:12px 0 0}
.sp-btns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
.sp-btn{border:none;border-radius:18px;padding:18px 10px;font-size:20px;font-weight:900;cursor:pointer;color:#fff;font-family:inherit;touch-action:manipulation}
.sp-btn:active{transform:scale(.97)}
.sp-got{background:#2fb86e;box-shadow:0 4px 0 #22894f}
.sp-try{background:#f59e0b;box-shadow:0 4px 0 #b97405}
.sp-big{background:#2fb8ae;box-shadow:0 4px 0 #23877f;width:100%}
.sp-plain{background:#e6f4f3;color:#1f6e69;width:100%}
.sp-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.sp-opt{background:#f4f9ff;border:3px solid #cfe3f5;border-radius:18px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:grab;touch-action:none;user-select:none;font-weight:800;font-size:16px;color:#163b3f;min-height:130px;justify-content:flex-end;font-family:inherit}
.sp-opt:hover{border-color:#2fb8ae}
.sp-ghost{position:fixed;pointer-events:none;z-index:50;transform:translate(-50%,-50%) scale(1.1);opacity:.9}
.sp-pop{animation:spPop .45s ease-out}
@keyframes spPop{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
.rk-flame{transform-origin:60px 178px;animation:rkFl .25s ease-in-out infinite alternate}
.rk-flame-big{transform-origin:60px 178px;animation:rkFlB .15s ease-in-out infinite alternate}
@keyframes rkFl{to{transform:scaleY(1.15)}}
@keyframes rkFlB{from{transform:scaleY(1.4)}to{transform:scaleY(1.9)}}
.sp-space{position:relative;width:100%;max-width:620px;height:360px;border-radius:24px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#283593,#0d1033 70%)}
.sp-space .twinkle{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:tw 1.6s ease-in-out infinite alternate}
@keyframes tw{from{opacity:.25}to{opacity:1}}
.sp-fly{position:absolute;left:50%;transform:translateX(-50%)}
.sp-fly.up{animation:flyUp 1.8s ease-in forwards}
@keyframes flyUp{from{bottom:10px}to{bottom:420px}}
.sp-fly.land{animation:landDown 1.6s ease-out forwards}
@keyframes landDown{from{top:-240px}to{top:20px}}
.sp-fly.orbit{animation:orbit 3s ease-in-out forwards}
@keyframes orbit{0%{top:-240px;left:50%}35%{top:40px;left:15%}65%{top:40px;left:85%}100%{top:30px;left:50%}}
.sp-dest-planet{position:absolute;left:50%;bottom:-70px;transform:translateX(-50%)}
.sp-dests{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.sp-dest{background:#1a237e;color:#fff;border:none;border-radius:18px;padding:12px 6px;font-weight:900;font-size:16px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:inherit}
.sp-sum{font-size:19px;font-weight:800;margin:4px 0}
.sp-more{background:#fff8ec;border-radius:14px;padding:10px 14px;margin:10px 0;font-size:16px}
.sp-intro p{font-size:18px;color:#456;margin:8px 0}
.sp-stars{display:flex;justify-content:center;gap:3px;margin-top:8px;flex-wrap:wrap}
.sp-dot{width:12px;height:12px;border-radius:50%;background:#dfe7ea}
.sp-dot.on{background:#2fb86e}.sp-dot.half{background:#f5b443}
@media (max-width:520px){.sp-main{flex-direction:column-reverse}.sp-pad{width:100%;min-height:200px}.sp-opt{min-height:110px}}
@media (max-height:520px){.sp-pic{width:140px;height:140px}.sp-say{font-size:22px}.sp-word{font-size:26px}.sp-btn{padding:12px 8px;font-size:18px}}
`;

export default function PlayPage() {
  const [{ words, targetSound, sentence }] = useState(readParams);
  const [queue, setQueue] = useState<string[]>(() => buildQueue(words));
  const [phase, setPhase] = useState<"intro" | "say" | "build" | "choose" | "trip" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [secondTry, setSecondTry] = useState(false);
  const [results, setResults] = useState<{ word: string; r: Result }[]>([]);
  const [design, setDesign] = useState<Design>({ stickers: [] });
  const [choices, setChoices] = useState(() => nextChoices(0));
  const [justBuilt, setJustBuilt] = useState(0);
  const [drag, setDrag] = useState<{ opt: Option; x: number; y: number; sx: number; sy: number } | null>(null);
  const [overPad, setOverPad] = useState(false);
  const [dest, setDest] = useState<Dest>("moon");
  const [tripStage, setTripStage] = useState<"up" | "land">("up");
  const padRef = useRef<HTMLDivElement>(null);
  const [twinkles] = useState(() =>
    Array.from({ length: 40 }, () => ({ l: Math.random() * 100, t: Math.random() * 100, d: Math.random() * 1.6 }))
  );

  useEffect(() => {
    const id = "sp-nunito";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@600;800;900&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const current = queue[index];

  useEffect(() => {
    if (phase === "say" && current && !secondTry) speak(current);
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "trip") return;
    const t1 = window.setTimeout(() => setTripStage("land"), 1800);
    const t2 = window.setTimeout(() => {
      sfx("win");
      setPhase("done");
    }, dest === "rings" ? 5200 : 3900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase, dest]);

  function start() {
    unlockAudio();
    sfx("tap");
    setPhase("say");
  }

  function record(r: Result) {
    setResults((prev) => [...prev, { word: current, r }]);
    setSecondTry(false);
    setChoices(nextChoices(index));
    setPhase("build");
  }

  function gotIt() {
    sfx("success");
    record("got");
  }

  function tryAgain() {
    if (!secondTry) {
      sfx("tap");
      setSecondTry(true);
      speak(current);
    } else {
      sfx("pop");
      record("sprout");
    }
  }

  function applyOption(opt: Option, at?: { x: number; y: number }) {
    sfx("pop");
    setDesign((d) => {
      if (opt.slot === "sticker") {
        const pos = at ?? { x: 44 + Math.random() * 32, y: 70 + Math.random() * 95 };
        return { ...d, stickers: [...d.stickers, { kind: opt.value as Sticker["kind"], ...pos }] };
      }
      return { ...d, [opt.slot]: opt.value };
    });
    setJustBuilt((n) => n + 1);
    if (index + 1 >= queue.length) {
      setPhase("choose");
    } else {
      setIndex(index + 1);
      setPhase("say");
    }
  }

  function padPoint(clientX: number, clientY: number) {
    const el = padRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const svg = el.querySelector("svg");
    if (!svg) return { x: 60, y: 120 };
    const s = svg.getBoundingClientRect();
    const x = ((clientX - s.left) / s.width) * 120;
    const y = ((clientY - s.top) / s.height) * 220;
    return { x: Math.max(42, Math.min(78, x)), y: Math.max(64, Math.min(170, y)) };
  }

  function onOptDown(e: ReactPointerEvent<HTMLButtonElement>, opt: Option) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
    setDrag({ opt, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  }
  function onOptMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setOverPad(!!padPoint(e.clientX, e.clientY));
  }
  function onOptUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 10;
    const pt = padPoint(e.clientX, e.clientY);
    const opt = drag.opt;
    setDrag(null);
    setOverPad(false);
    if (!moved) applyOption(opt);
    else if (pt) applyOption(opt, opt.slot === "sticker" ? pt : undefined);
  }

  function chooseDest(d: Dest) {
    unlockAudio();
    sfx("level");
    setDest(d);
    setTripStage("up");
    setPhase("trip");
  }

  function playAgain() {
    setQueue(buildQueue(words));
    setIndex(0);
    setResults([]);
    setSecondTry(false);
    setDesign({ stickers: [] });
    setChoices(nextChoices(0));
    setPhase("say");
  }

  if (words.length === 0) {
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <div className="sp-card sp-intro">
          <h1>No practice words yet</h1>
          <p>Go back and tap Play Practice Game on your homework.</p>
          <button className="sp-btn sp-big" onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const progress = (
    <div className="sp-stars" aria-label={`${results.length} of ${queue.length} done`}>
      {queue.map((_, i) => (
        <span key={i} className={`sp-dot ${results[i]?.r === "got" ? "on" : results[i] ? "half" : ""}`} />
      ))}
    </div>
  );

  const pad = (
    <div ref={padRef} className={`sp-pad ${overPad ? "sp-hot" : ""}`}>
      <div key={justBuilt} className={justBuilt ? "sp-pop" : ""}>
        <Rocket d={design} size={250} />
      </div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <div className="sp-card sp-intro">
          <div className="sp-main">
            <div className="sp-left">
              <h1 className="sp-say">Build a rocket!</h1>
              {targetSound && <p>Today's sound: <strong>{targetSound}</strong></p>}
              <p>Say each {sentence ? "sentence" : "word"}, then add a piece to your rocket.</p>
              <p>At the end, you pick where it flies!</p>
              <p style={{ fontSize: 15 }}>Grown-up: listen, then tap <strong>Got it</strong> or <strong>Try again</strong>.</p>
            </div>
            {pad}
          </div>
          <button className="sp-btn sp-big" style={{ marginTop: 14 }} onClick={start}>Start</button>
        </div>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <div className="sp-card">
          <div className="sp-main">
            <div className="sp-left">
              <h1 className="sp-say">Your rocket is ready!</h1>
              <p style={{ fontSize: 18, fontWeight: 800 }}>Where should it fly?</p>
            </div>
            {pad}
          </div>
          <div className="sp-dests">
            {DESTS.map((d) => (
              <button key={d.id} className="sp-dest" onClick={() => chooseDest(d.id)}>
                <Planet id={d.id} size={56} />
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "trip" || phase === "done") {
    const info = DESTS.find((d) => d.id === dest)!;
    const got = results.filter((x) => x.r === "got").length;
    const needMore = Array.from(new Set(results.filter((x) => x.r === "sprout").map((x) => x.word)));
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <div className="sp-space">
          {twinkles.map((s, i) => (
            <span key={i} className="twinkle" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.d}s` }} />
          ))}
          {tripStage === "land" && (
            <div className="sp-dest-planet sp-pop">
              <Planet id={dest} size={dest === "rings" ? 230 : 280} />
            </div>
          )}
          <div className={`sp-fly ${tripStage === "up" ? "up" : dest === "rings" ? "orbit" : "land"}`}>
            <Rocket d={design} flame={phase === "trip"} size={170} />
          </div>
        </div>
        {phase === "done" && (
          <div className="sp-card sp-pop" style={{ marginTop: 14 }}>
            <h1 className="sp-say">{info.landed}</h1>
            <p className="sp-sum">You practiced {results.length} times. {got} sounded right.</p>
            {needMore.length > 0 && (
              <div className="sp-more"><strong>Keep practicing:</strong> {needMore.join(", ")}</div>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <button className="sp-btn sp-big" onClick={playAgain}>Build a new rocket</button>
              <button className="sp-btn sp-plain" onClick={goBack}>Back to homework</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sp-page">
      <style>{CSS}</style>
      <div className="sp-top">
        <button className="sp-link" onClick={goBack}>Back</button>
        {targetSound && <span className="sp-pill">{targetSound}</span>}
        <span className="sp-pill">{index + 1} of {queue.length}</span>
      </div>
      <div className="sp-card">
        <div className="sp-main">
          <div className="sp-left">
            {phase === "say" ? (
              <>
                <p className="sp-say">Say it!</p>
                {sentence ? (
                  <div className="sp-sentence">{current}</div>
                ) : (
                  <>
                    <WordPicture key={current} word={current} />
                    <div className="sp-word">{current}</div>
                  </>
                )}
                <button className="sp-hear" onClick={() => speak(current)}>Hear it</button>
                <div className="sp-again-note">{secondTry ? "One more try!" : ""}</div>
              </>
            ) : (
              <>
                <p className="sp-say">{choices.prompt}</p>
                <p style={{ margin: 0, color: "#567", fontWeight: 700 }}>Drag it to your rocket, or tap it.</p>
                <div className="sp-opts">
                  {choices.options.map((o) => (
                    <button
                      key={o.label}
                      className="sp-opt"
                      onPointerDown={(e) => onOptDown(e, o)}
                      onPointerMove={onOptMove}
                      onPointerUp={onOptUp}
                      onPointerCancel={() => { setDrag(null); setOverPad(false); }}
                    >
                      <OptionPreview opt={o} design={design} />
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {pad}
        </div>
        {phase === "say" && (
          <>
            <div className="sp-btns" style={{ marginTop: 10 }}>
              <button className="sp-btn sp-got" onClick={gotIt}>Got it</button>
              <button className="sp-btn sp-try" onClick={tryAgain}>Try again</button>
            </div>
            <p className="sp-grown">Grown-up: tap after your child says it.</p>
          </>
        )}
        {progress}
      </div>
      {drag && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 10 && (
        <div className="sp-ghost" style={{ left: drag.x, top: drag.y }}>
          <OptionPreview opt={drag.opt} design={design} />
        </div>
      )}
    </div>
  );
}

function WordPicture({ word }: { word: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <div className="sp-pic sp-pic-word">{word}</div>;
  return (
    <img
      className="sp-pic"
      src={`/Images/${word.toLowerCase()}.png`}
      alt={word}
      onError={() => setMissing(true)}
    />
  );
}
