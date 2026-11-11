import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Word Tower: SAY IT TWICE (grown-up taps Got it / Try again; every try
// counts), then the child CHOOSES one of three blocks and DRAGS it onto the
// tower, left, middle or right. Where it goes matters: a lopsided tower
// wobbles (it never falls). At the end the child picks a topper (flag, star
// or roof) and each one brings a different surprise.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "build" | "top" | "done";
type Try = "got" | "effort";
type Shape = "square" | "wide" | "tall" | "window" | "arch";
type Block = { shape: Shape; color: string; x: number };
type Topper = "flag" | "star" | "roof";

const SAYS_PER_WORD = 2;
const SHAPES: Record<Shape, { w: number; h: number; label: string }> = {
  square: { w: 64, h: 52, label: "Square" },
  wide: { w: 116, h: 40, label: "Long" },
  tall: { w: 48, h: 82, label: "Tall" },
  window: { w: 80, h: 62, label: "Window" },
  arch: { w: 104, h: 56, label: "Arch" },
};
const COLORS = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ffb74d", "#4db6ac"];
const COLOR_NAMES: Record<string, string> = {
  "#e57373": "Red", "#64b5f6": "Blue", "#81c784": "Green", "#ffd54f": "Yellow", "#ba68c8": "Purple", "#ffb74d": "Orange", "#4db6ac": "Teal",
};
const STAGE_H = 360;

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
  const total = Math.max(10, Math.min(16, words.length * 2));
  const q: string[] = [];
  while (q.length < total) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return q.slice(0, total);
}

function makeChoices(): Block[] {
  const shapes = shuffle(Object.keys(SHAPES) as Shape[]).slice(0, 3);
  const colors = shuffle(COLORS).slice(0, 3);
  return shapes.map((shape, i) => ({ shape, color: colors[i], x: 0 }));
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// How far the tower's weight sits from the middle (0 = perfectly balanced).
function lean(blocks: Block[]) {
  if (!blocks.length) return 0;
  let m = 0, sum = 0;
  for (const b of blocks) { const a = SHAPES[b.shape].w * SHAPES[b.shape].h; m += a * b.x; sum += a; }
  return m / sum;
}

// ── Drawings ───────────────────────────────────────────────────────
function BlockView({ b, scale = 1 }: { b: Block; scale?: number }) {
  const { w, h } = SHAPES[b.shape];
  const W = w * scale, H = h * scale;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {b.shape === "arch" ? (
        <path d={`M0 0 H${w} V${h} H${w - 26} Q${w / 2} ${h * 0.15} 26 ${h} H0 Z`} fill={b.color} stroke="rgba(0,0,0,.25)" strokeWidth="2" />
      ) : (
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="5" fill={b.color} stroke="rgba(0,0,0,.25)" strokeWidth="2" />
      )}
      {b.shape === "window" && <rect x={w / 2 - 14} y={h / 2 - 14} width="28" height="28" rx="4" fill="#e3f2fd" stroke="rgba(0,0,0,.3)" strokeWidth="2" />}
      {b.shape === "window" && <path d={`M${w / 2} ${h / 2 - 14} V${h / 2 + 14} M${w / 2 - 14} ${h / 2} H${w / 2 + 14}`} stroke="rgba(0,0,0,.3)" strokeWidth="2" />}
      {b.shape === "wide" && <path d={`M${w / 3} 4 V${h - 4} M${(2 * w) / 3} 4 V${h - 4}`} stroke="rgba(0,0,0,.12)" strokeWidth="2" />}
      <rect x="4" y="4" width={w - 8} height="5" rx="2" fill="rgba(255,255,255,.35)" />
    </svg>
  );
}

function TopperView({ t, size = 70 }: { t: Topper; size?: number }) {
  if (t === "flag")
    return (
      <svg viewBox="0 0 60 70" width={size} height={size * 1.16}>
        <rect x="8" y="4" width="4" height="66" fill="#6d4c41" />
        <path d="M12 6 L54 16 L12 28 Z" fill="#e53935" />
      </svg>
    );
  if (t === "star")
    return (
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <polygon points="30,3 37,22 57,22 41,34 47,54 30,42 13,54 19,34 3,22 23,22" fill="#ffd54f" stroke="#f9a825" strokeWidth="2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 50" width={size * 1.3} height={size * 0.8}>
      <polygon points="40,2 78,48 2,48" fill="#8d6e63" stroke="#5d4037" strokeWidth="2" />
    </svg>
  );
}

const Bird = () => (
  <svg viewBox="0 0 60 44" width="64" height="47">
    <ellipse cx="28" cy="26" rx="20" ry="14" fill="#42a5f5" />
    <circle cx="44" cy="16" r="10" fill="#42a5f5" />
    <circle cx="47" cy="14" r="2.5" fill="#222" />
    <polygon points="54,16 62,18 54,21" fill="#ffa000" />
    <path d="M14 22 Q24 4 34 22" fill="#1e88e5" />
  </svg>
);

const Rainbow = () => (
  <svg viewBox="0 0 300 150" width="100%" height="150" style={{ position: "absolute", left: 0, top: 10, pointerEvents: "none" }}>
    {["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"].map((c, i) => (
      <path key={c} d={`M${20 + i * 10} 150 A${130 - i * 10} ${130 - i * 10} 0 0 1 ${280 - i * 10} 150`} stroke={c} strokeWidth="10" fill="none" opacity=".75" />
    ))}
  </svg>
);

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto", color: "#22364a" }}>
        {word}
      </div>
    );
  return <img src={`/Images/${word.toLowerCase()}.png`} alt={word} onError={() => setMissing(true)} draggable={false}
    style={{ width: size, height: size, objectFit: "contain", borderRadius: 16, background: "#fff", display: "block", margin: "0 auto" }} />;
}

function Draggable({ children, onDrop, onTap }: { children: ReactNode; onDrop: (x: number, y: number) => void; onTap: () => void }) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
    setDrag({ sx: e.clientX, sy: e.clientY });
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag) setOff({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
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
.wt-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(#e3f2fd,#f1f8e9);color:#22364a;padding:14px 14px 30px;box-sizing:border-box}
.wt-wrap{max-width:720px;margin:0 auto}
.wt-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.wt-chip{background:#fff;border:2px solid #d6e6f2;color:#2b6f86;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.wt-card{background:#fff;border-radius:22px;padding:14px;text-align:center;box-shadow:0 8px 24px rgba(43,111,134,.12)}
.wt-main{display:flex;gap:14px;align-items:stretch}
.wt-left{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.wt-stage{width:260px;flex:none;height:${STAGE_H}px;position:relative;border-radius:18px;overflow:hidden;background:linear-gradient(#bbdefb,#e3f2fd 75%,#a5d6a7 75%)}
.wt-stage.night{background:linear-gradient(#1a237e,#283593 75%,#33691e 75%)}
.wt-stage.hot{outline:4px dashed #2b6f86;outline-offset:-4px}
.wt-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.wt-big:active{transform:scale(.97)}
.wt-go{background:linear-gradient(135deg,#3f96b0,#2b6f86);color:#fff;width:100%}
.wt-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.wt-try{background:#f5a623;color:#22364a;box-shadow:0 4px 0 #b97a12}
.wt-word{font-size:34px;font-weight:900;margin:6px 0 0}
.wt-power{display:flex;justify-content:center;gap:10px;margin:8px 0}
.wt-cell{width:36px;height:36px;border-radius:50%;border:3px solid #cfd8dc;background:#f4f7f9}
.wt-cell.got{background:#27c06b;border-color:#1b8a4c}.wt-cell.effort{background:#f5a623;border-color:#b97a12}
.wt-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.wt-opt{background:#f4f9ff;border:3px solid #d6e6f2;border-radius:16px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;min-height:120px;font-weight:800;font-size:14px}
.wt-tower{position:absolute;left:50%;bottom:${STAGE_H * 0.25 - 6}px;transform-origin:50% 100%}
.wt-wobble{animation:wtWobble .9s ease-in-out 2}
@keyframes wtWobble{0%,100%{rotate:0deg}25%{rotate:-4deg}75%{rotate:4deg}}
.wt-drop{animation:wtDrop .4s ease-out}
@keyframes wtDrop{from{transform:translate(-50%,-60px);opacity:.3}to{transform:translate(-50%,0);opacity:1}}
.wt-bird{position:absolute;animation:wtBird 2.4s ease-out forwards}
@keyframes wtBird{from{left:-70px;top:20px}to{left:calc(50% + 6px);top:var(--land)}}
.wt-tw{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:wtTw 1.4s ease-in-out infinite alternate}
@keyframes wtTw{from{opacity:.2}to{opacity:1}}
.wt-glow{filter:drop-shadow(0 0 12px #fff59d)}
.wt-pop{animation:wtPop .5s ease-out}
@keyframes wtPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
@media (max-width:560px){.wt-main{flex-direction:column-reverse}.wt-stage{width:100%;height:300px}}
`;

export default function TowerGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [choices, setChoices] = useState<Block[]>([]);
  const [wobble, setWobble] = useState(0);
  const [topper, setTopper] = useState<Topper | null>(null);
  const [hot, setHot] = useState(false);
  const [stars] = useState(() => Array.from({ length: 30 }, () => ({ l: Math.random() * 100, t: Math.random() * 70 })));
  const stageRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const curWord = queue[idx] || "";

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio();
    sfx("tap");
    setQueue(buildQueue(words));
    setIdx(0); setPower([]); setSecondTry(false); setLog([]); setBlocks([]); setTopper(null);
    setPhase("say");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      setChoices(makeChoices());
      window.setTimeout(() => setPhase("build"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  // Stage geometry: tower is drawn at a scale that keeps it inside the stage.
  const towerH = blocks.reduce((h, b) => h + SHAPES[b.shape].h, 0);
  const scale = Math.min(1, (STAGE_H * 0.66) / Math.max(1, towerH + 110));
  const topX = blocks.length ? blocks[blocks.length - 1].x : 0;

  function place(choice: Block, clientX?: number) {
    if (busy.current) return; // one block per word, even on a double tap
    busy.current = true;
    let x = topX;
    const r = stageRef.current?.getBoundingClientRect();
    if (r && clientX !== undefined) {
      const rel = (clientX - (r.left + r.width / 2)) / scale; // px from the middle, in tower units
      const below = blocks.length ? SHAPES[blocks[blocks.length - 1].shape].w : 120;
      const limit = below / 2;
      x = topX + Math.max(-limit, Math.min(limit, rel - topX));
      x = Math.round(x / 8) * 8;
    }
    const next = [...blocks, { ...choice, x }];
    setBlocks(next);
    setPower([]);
    sfx("pop");
    if (Math.abs(lean(next)) > 22) { setWobble((w) => w + 1); window.setTimeout(() => sfx("fail"), 200); }
    window.setTimeout(() => {
      busy.current = false;
      if (idx + 1 < queue.length) { setIdx(idx + 1); setPhase("say"); }
      else setPhase("top");
    }, 700);
  }

  function dropOnStage(choice: Block, x: number, y: number) {
    setHot(false);
    const r = stageRef.current?.getBoundingClientRect();
    if (r && x > r.left - 30 && x < r.right + 30 && y > r.top && y < r.bottom) place(choice, x);
  }

  function chooseTopper(t: Topper) {
    setTopper(t);
    sfx("win");
    setPhase("done");
  }

  if (!words.length) {
    return (
      <div className="wt-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="wt-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Word Tower there.</p>
          <button className="wt-big wt-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  // Build the tower bottom-up.
  const bottoms = blocks.map((_, i) => blocks.slice(0, i).reduce((h, bb) => h + SHAPES[bb.shape].h, 0));
  const y = towerH;
  const towerBlocks = blocks.map((b, i) => (
    <div key={i} className={i === blocks.length - 1 && phase !== "done" ? "wt-drop" : ""}
      style={{ position: "absolute", bottom: bottoms[i] * scale, left: b.x * scale, transform: "translateX(-50%)" }}>
      <BlockView b={b} scale={scale} />
    </div>
  ));
  const night = phase === "done" && topper === "star";
  const landTop = STAGE_H * 0.75 - 6 - (towerH + 60) * scale - 40;

  const stage = (
    <div ref={stageRef} className={`wt-stage ${night ? "night" : ""} ${hot ? "hot" : ""}`}>
      {night && stars.map((s, i) => <span key={i} className="wt-tw" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${(i % 7) * 0.2}s` }} />)}
      {phase === "done" && topper === "roof" && <Rainbow />}
      <div key={wobble} className={`wt-tower ${wobble ? "wt-wobble" : ""}`}>
        {towerBlocks}
        {phase === "done" && topper && (
          <div className={`wt-pop ${topper === "star" ? "wt-glow" : ""}`} style={{ position: "absolute", bottom: y * scale - 2, left: topX * scale, transform: "translateX(-50%)" }}>
            <TopperView t={topper} size={60 * Math.max(scale, 0.6)} />
          </div>
        )}
      </div>
      {phase === "done" && topper === "flag" && (
        <div className="wt-bird" style={{ ["--land" as string]: `${Math.max(10, landTop)}px` }}><Bird /></div>
      )}
      <div style={{ position: "absolute", top: 8, right: 10, fontWeight: 900, color: night ? "#fff" : "#22364a" }}>{blocks.length} {blocks.length === 1 ? "floor" : "floors"}</div>
    </div>
  );

  const top = (
    <div className="wt-row">
      <button className="wt-chip" onClick={goBack}>Back</button>
      {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#2b6f86" }}>/{sound}/</span></div>}
      <div style={{ fontWeight: 900 }}>{Math.min(idx + 1, queue.length || 1)} of {queue.length || "?"}</div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="wt-page"><style>{CSS}</style><div className="wt-wrap">
        <button className="wt-chip" onClick={goBack}>Back</button>
        <div className="wt-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, alignItems: "flex-end", margin: "6px 0" }}>
            <BlockView b={{ shape: "tall", color: "#64b5f6", x: 0 }} scale={0.8} />
            <BlockView b={{ shape: "window", color: "#ffd54f", x: 0 }} scale={0.8} />
            <BlockView b={{ shape: "square", color: "#e57373", x: 0 }} scale={0.8} />
          </div>
          <h1 style={{ margin: "6px 0 4px" }}>Word Tower</h1>
          <p style={{ fontWeight: 700, margin: 0 }}>Say each word 2 times, then pick a block and put it on your tower.</p>
          <p style={{ fontWeight: 700, margin: "4px 0 12px" }}>Careful: a lopsided tower wobbles! At the end, pick what goes on top.</p>
          <button className="wt-big wt-go" onClick={start}>Start building</button>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#567" }}>Grown-up: after each try, tap Got it or Try again.</p>
        </div>
      </div></div>
    );
  }

  if (phase === "done") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    const msg = topper === "flag" ? "A bird came to visit your flag!" : topper === "star" ? "Your star lights up the night sky!" : "Your roof brought a rainbow!";
    return (
      <div className="wt-page"><style>{CSS}</style><div className="wt-wrap">
        <div className="wt-card">
          <div className="wt-main">
            <div className="wt-left">
              <h1 style={{ margin: "4px 0" }}>{msg}</h1>
              <p style={{ fontWeight: 800 }}>Your tower is {blocks.length} floors tall.</p>
              <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. {got} sounded right.</p>
              {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <button className="wt-big wt-go" onClick={start}>Build a new tower</button>
                <button className="wt-big" style={{ background: "#eaf3fa", color: "#2b6f86" }} onClick={goBack}>Back to homework</button>
              </div>
            </div>
            {stage}
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="wt-page"><style>{CSS}</style><div className="wt-wrap">
      {top}
      <div className="wt-card">
        <div className="wt-main">
          <div className="wt-left">
            {phase === "say" && (
              <>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#2b6f86", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times!</div>
                <div style={{ marginTop: 6 }}><WordPic key={curWord} word={curWord} size={150} /></div>
                <div className="wt-word">{curWord}</div>
                <div className="wt-power">
                  {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`wt-cell ${power[i] || ""}`} />)}
                </div>
                <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
                <div><button className="wt-chip" style={{ marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="wt-big wt-got" onClick={gotIt}>Got it</button>
                  <button className="wt-big wt-try" onClick={tryAgain}>Try again</button>
                </div>
              </>
            )}
            {phase === "build" && (
              <>
                <h2 style={{ margin: "0 0 2px" }}>Pick a block!</h2>
                <div style={{ fontWeight: 700, color: "#567" }}>Drag it onto your tower: left, middle, or right. Or tap it.</div>
                <div className="wt-opts">
                  {choices.map((c, i) => (
                    <Draggable key={i} onDrop={(x, yy) => dropOnStage(c, x, yy)} onTap={() => place(c)}>
                      <div className="wt-opt">
                        <BlockView b={c} scale={0.8} />
                        {COLOR_NAMES[c.color]} {SHAPES[c.shape].label.toLowerCase()}
                      </div>
                    </Draggable>
                  ))}
                </div>
                {Math.abs(lean(blocks)) > 22 && <p style={{ fontWeight: 800, color: "#c26a00" }}>Wobbly! Try the other side.</p>}
              </>
            )}
            {phase === "top" && (
              <>
                <h2 style={{ margin: "0 0 2px" }}>What goes on top?</h2>
                <div style={{ fontWeight: 700, color: "#567" }}>Pick one. Each one brings a surprise!</div>
                <div className="wt-opts">
                  {(["flag", "star", "roof"] as Topper[]).map((t) => (
                    <button key={t} className="wt-opt" style={{ cursor: "pointer", fontFamily: "inherit" }} onClick={() => chooseTopper(t)}>
                      <TopperView t={t} size={52} />
                      {t === "flag" ? "Flag" : t === "star" ? "Star" : "Roof"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {stage}
        </div>
      </div>
    </div></div>
  );
}
