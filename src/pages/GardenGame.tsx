import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Bloom Garden: SAY IT TWICE (grown-up taps Got it / Try again; every try
// counts), then the child CHOOSES a seed packet and DRAGS it into any empty
// spot in the garden, where it sprouts and grows. At the end, visitors come
// depending on what was planted (butterflies, a bee, a bunny, a bird), so
// every garden ends differently.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "plant" | "done";
type Try = "got" | "effort";
type Plant = "sunflower" | "tulip" | "daisy" | "carrot" | "strawberry" | "pumpkin";

const SAYS_PER_WORD = 2;
const PLOTS = 12;
const PLANTS: Record<Plant, { label: string; packet: string }> = {
  sunflower: { label: "Sunflower", packet: "#fbc02d" },
  tulip: { label: "Tulip", packet: "#ec407a" },
  daisy: { label: "Daisy", packet: "#90caf9" },
  carrot: { label: "Carrot", packet: "#fb8c00" },
  strawberry: { label: "Strawberry", packet: "#e53935" },
  pumpkin: { label: "Pumpkin", packet: "#8d6e63" },
};

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const sound = (p.get("sound") || p.get("targetSound") || "").replace(/\//g, "").toLowerCase();
  const words = (p.get("words") || "").split(",").map((w) => w.trim()).filter(Boolean);
  return { sound, words };
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
  const total = Math.max(10, Math.min(PLOTS, words.length * 2));
  const q: string[] = [];
  while (q.length < total) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return q.slice(0, total);
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
function PlantView({ p, size = 70 }: { p: Plant; size?: number }) {
  return <img src={`/game-art/plant-${p}.png`} alt={PLANTS[p].label} width={size} height={size} draggable={false} style={{ display: "block", objectFit: "contain" }} />;
}

const Sprout = () => (
  <svg viewBox="0 0 60 70" width="44" height="52" style={{ display: "block" }}>
    <path d="M30 68 V48" stroke="#43a047" strokeWidth="3" />
    <ellipse cx="23" cy="48" rx="7" ry="3.5" fill="#66bb6a" transform="rotate(-25 23 48)" />
    <ellipse cx="37" cy="46" rx="7" ry="3.5" fill="#66bb6a" transform="rotate(25 37 46)" />
  </svg>
);

function Packet({ p }: { p: Plant }) {
  return (
    <svg viewBox="0 0 60 80" width="58" height="77">
      <rect x="4" y="4" width="52" height="72" rx="6" fill={PLANTS[p].packet} stroke="rgba(0,0,0,.2)" strokeWidth="2" />
      <rect x="10" y="12" width="40" height="44" rx="6" fill="#fff" />
      <image href={`/game-art/plant-${p}.png`} x="10" y="12" width="40" height="44" />
    </svg>
  );
}

const Butterfly = () => <img src="/game-art/visitor-butterfly.png" alt="butterfly" width={70} height={70} draggable={false} style={{ display: "block" }} />;
const Bee = () => <img src="/game-art/visitor-bee.png" alt="bee" width={70} height={70} draggable={false} style={{ display: "block" }} />;
const Bunny = () => <img src="/game-art/visitor-bunny.png" alt="bunny" width={70} height={70} draggable={false} style={{ display: "block" }} />;
const Bird = () => <img src="/game-art/visitor-bird.png" alt="bird" width={70} height={70} draggable={false} style={{ display: "block" }} />;

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto", color: "#2e4a1f" }}>
        {word}
      </div>
    );
  return <img src={`/Images/${word.toLowerCase()}.png`} alt={word} onError={() => setMissing(true)} draggable={false}
    style={{ width: size, height: size, objectFit: "contain", borderRadius: 16, background: "#fff", display: "block", margin: "0 auto" }} />;
}

function Draggable({ children, onDrop, onTap, onMove }: {
  children: ReactNode; onDrop: (x: number, y: number) => void; onTap: () => void; onMove?: (x: number, y: number) => void;
}) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
    setDrag({ sx: e.clientX, sy: e.clientY });
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setOff({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
    onMove?.(e.clientX, e.clientY);
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 10;
    setDrag(null);
    setOff({ x: 0, y: 0 });
    if (moved) onDrop(e.clientX, e.clientY);
    else onTap();
  }
  return (
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { setDrag(null); setOff({ x: 0, y: 0 }); }}
      style={{ transform: `translate(${off.x}px, ${off.y}px)`, transition: drag ? "none" : "transform .25s", cursor: drag ? "grabbing" : "grab", touchAction: "none", userSelect: "none", position: "relative", zIndex: drag ? 20 : 1 }}>
      {children}
    </div>
  );
}

const CSS = `
.bg-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(#e8f5e9,#fffde7);color:#2e4a1f;padding:14px 14px 30px;box-sizing:border-box}
.bg-wrap{max-width:740px;margin:0 auto}
.bg-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.bg-chip{background:#fff;border:2px solid #c5e1a5;color:#33691e;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.bg-card{background:#fff;border-radius:22px;padding:14px;text-align:center;box-shadow:0 8px 24px rgba(51,105,30,.12)}
.bg-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.bg-big:active{transform:scale(.97)}
.bg-go{background:linear-gradient(135deg,#7cb342,#558b2f);color:#fff;width:100%}
.bg-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.bg-try{background:#f5a623;color:#2e4a1f;box-shadow:0 4px 0 #b97a12}
.bg-word{font-size:34px;font-weight:900;margin:6px 0 0}
.bg-power{display:flex;justify-content:center;gap:10px;margin:8px 0}
.bg-cell{width:36px;height:36px;border-radius:50%;border:3px solid #dcedc8;background:#f9fbe7}
.bg-cell.got{background:#27c06b;border-color:#1b8a4c}.bg-cell.effort{background:#f5a623;border-color:#b97a12}
.bg-garden{position:relative;border-radius:18px;padding:40px 12px 12px;background:linear-gradient(#b3e5fc 0,#b3e5fc 34px,#8d6e63 34px)}
.bg-plots{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.bg-plot{height:92px;border-radius:12px;background:#6d4c41;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15);display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
.bg-plot.hot{outline:3px dashed #fff59d}
.bg-plot.full{background:#795548}
.bg-grow{animation:bgGrow .7s ease-out}
@keyframes bgGrow{from{transform:scaleY(.2);transform-origin:50% 100%;opacity:.4}to{transform:scaleY(1);opacity:1}}
.bg-packets{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.bg-pk{background:#f9fbe7;border:3px solid #dcedc8;border-radius:16px;padding:6px;display:flex;flex-direction:column;align-items:center;font-weight:800;font-size:14px}
.bg-sun{position:absolute;right:14px;top:4px;width:26px;height:26px;border-radius:50%;background:#fdd835;box-shadow:0 0 12px #fff176}
.bg-visit{position:absolute;animation:bgFly 3s ease-in-out infinite alternate}
@keyframes bgFly{from{transform:translate(0,0)}to{transform:translate(30px,-14px)}}
.bg-hop{position:absolute;animation:bgHop 1s ease-in-out infinite}
@keyframes bgHop{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@media (max-width:560px){.bg-plots{grid-template-columns:repeat(4,1fr)}.bg-plot{height:78px}}
`;

export default function GardenGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [plots, setPlots] = useState<(Plant | null)[]>(Array(PLOTS).fill(null));
  const [fresh, setFresh] = useState<number | null>(null);
  const [grown, setGrown] = useState<number[]>([]);
  const [choices, setChoices] = useState<Plant[]>([]);
  const [hot, setHot] = useState<number | null>(null);
  const plotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const busy = useRef(false);

  const curWord = queue[idx] || "";

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio();
    sfx("tap");
    setQueue(buildQueue(words));
    busy.current = false;
    setIdx(0); setPower([]); setSecondTry(false); setLog([]); setPlots(Array(PLOTS).fill(null)); setGrown([]); setFresh(null);
    setPhase("say");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      setChoices(shuffle(Object.keys(PLANTS) as Plant[]).slice(0, 3));
      window.setTimeout(() => setPhase("plant"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); setLog((l) => [...l, { word: curWord, t: "effort" }]); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  function plotAt(x: number, y: number) {
    for (let i = 0; i < PLOTS; i++) {
      const r = plotRefs.current[i]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top - 20 && y <= r.bottom && !plots[i]) return i;
    }
    return null;
  }

  function plantAt(p: Plant, i: number | null) {
    if (busy.current) return; // one seed per word, even on a double tap
    const spot = i ?? plots.findIndex((x) => !x);
    if (spot < 0) return;
    busy.current = true;
    const next = plots.slice();
    next[spot] = p;
    setPlots(next);
    setFresh(spot);
    setPower([]);
    setHot(null);
    sfx("pop");
    window.setTimeout(() => { setGrown((g) => [...g, spot]); sfx("success"); }, 700);
    window.setTimeout(() => {
      busy.current = false;
      if (idx + 1 < queue.length) { setIdx(idx + 1); setPhase("say"); }
      else { sfx("win"); setPhase("done"); }
    }, 1400);
  }

  if (!words.length) {
    return (
      <div className="bg-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="bg-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Bloom Garden there.</p>
          <button className="bg-big bg-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const planted = plots.filter(Boolean) as Plant[];
  const count = (p: Plant) => planted.filter((x) => x === p).length;
  const flowers = count("tulip") + count("daisy") + count("sunflower");
  const visitors: { key: string; el: ReactNode; msg: string; style: React.CSSProperties; cls: string }[] = [];
  if (phase === "done") {
    if (flowers >= 2) visitors.push({ key: "bf", el: <Butterfly />, msg: "Butterflies came for your flowers!", style: { left: "18%", top: 30 }, cls: "bg-visit" });
    if (count("sunflower")) visitors.push({ key: "bee", el: <Bee />, msg: "A bee is buzzing on your sunflower!", style: { left: "55%", top: 44 }, cls: "bg-visit" });
    if (count("carrot") || count("pumpkin")) visitors.push({ key: "bun", el: <Bunny />, msg: "A bunny hopped in for a snack!", style: { left: "2%", bottom: 6 }, cls: "bg-hop" });
    if (count("strawberry")) visitors.push({ key: "bird", el: <Bird />, msg: "A bird wants your strawberries!", style: { right: "18%", top: 26 }, cls: "bg-visit" });
    if (!visitors.length) visitors.push({ key: "bf", el: <Butterfly />, msg: "A butterfly came to visit!", style: { left: "40%", top: 30 }, cls: "bg-visit" });
  }

  const garden = (
    <div className="bg-garden">
      <div className="bg-sun" />
      <div className="bg-plots">
        {plots.map((p, i) => (
          <div key={i} ref={(el) => { plotRefs.current[i] = el; }} className={`bg-plot ${p ? "full" : ""} ${hot === i ? "hot" : ""}`}
>
            {p && (grown.includes(i)
              ? <div className={fresh === i ? "bg-grow" : ""}><PlantView p={p} size={66} /></div>
              : <div className="bg-grow"><Sprout /></div>)}
          </div>
        ))}
      </div>
      {visitors.map((v) => <div key={v.key} className={v.cls} style={v.style}>{v.el}</div>)}
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="bg-page"><style>{CSS}</style><div className="bg-wrap">
        <button className="bg-chip" onClick={goBack}>Back</button>
        <div className="bg-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <PlantView p="sunflower" size={50} /><PlantView p="tulip" size={50} /><PlantView p="carrot" size={50} /><PlantView p="strawberry" size={50} />
          </div>
          <h1 style={{ margin: "6px 0 4px" }}>Bloom Garden</h1>
          <p style={{ fontWeight: 700, margin: 0 }}>Say each word 2 times, then plant a seed anywhere in your garden.</p>
          <p style={{ fontWeight: 700, margin: "4px 0 12px" }}>What you plant decides who comes to visit!</p>
          <button className="bg-big bg-go" onClick={start}>Start planting</button>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#558b2f" }}>Grown-up: after each try, tap Got it or Try again.</p>
        </div>
      </div></div>
    );
  }

  if (phase === "done") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    return (
      <div className="bg-page"><style>{CSS}</style><div className="bg-wrap">
        <div className="bg-card">
          <h1 style={{ margin: "4px 0" }}>Your garden is all grown!</h1>
          {visitors.map((v) => <p key={v.key} style={{ fontWeight: 800, margin: "2px 0" }}>{v.msg}</p>)}
          <div style={{ margin: "10px 0" }}>{garden}</div>
          <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. Grown-up marked {got} of {log.length} tries correct.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="bg-big bg-go" onClick={start}>Plant a new garden</button>
            <button className="bg-big" style={{ background: "#f1f8e9", color: "#33691e" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="bg-page"><style>{CSS}</style><div className="bg-wrap">
      <div className="bg-row">
        <button className="bg-chip" onClick={goBack}>Back</button>
        {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#558b2f" }}>/{sound}/</span></div>}
        <div style={{ fontWeight: 900 }}>{idx + 1} of {queue.length}</div>
      </div>
      <div className="bg-card">
        {phase === "say" ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#558b2f", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times!</div>
            <div style={{ marginTop: 6 }}><WordPic key={curWord} word={curWord} size={150} /></div>
            <div className="bg-word">{curWord}</div>
            <div className="bg-power">
              {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`bg-cell ${power[i] || ""}`} />)}
            </div>
            <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
            <button className="bg-chip" style={{ marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button className="bg-big bg-got" onClick={gotIt}>Got it</button>
              <button className="bg-big bg-try" onClick={tryAgain}>Try again</button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 2px" }}>Pick a seed and plant it!</h2>
            <div style={{ fontWeight: 700, color: "#558b2f" }}>Drag a seed packet to any empty spot. Or tap it.</div>
            <div className="bg-packets">
              {choices.map((p) => (
                <Draggable key={p} onTap={() => plantAt(p, null)}
                  onMove={(x, y) => setHot(plotAt(x, y))}
                  onDrop={(x, y) => { const i = plotAt(x, y); setHot(null); if (i !== null) plantAt(p, i); }}>
                  <div className="bg-pk"><Packet p={p} />{PLANTS[p].label}</div>
                </Draggable>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 12 }}>{garden}</div>
    </div></div>
  );
}
