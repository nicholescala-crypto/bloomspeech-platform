import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Superhero: the child designs a hero (cape color + chest symbol). Grumpy,
// silly villains are causing trouble. For each word the child SAYS IT TWICE
// (grown-up taps Got it / Try again; every try counts), then DRAGS a super
// power onto the villain (freeze, bubble, tickle, glitter). Each power does
// something different. After a few powers the villain cheers up and joins the
// team, so the child ends with a team of new friends. Nobody is ever laughed at.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "power" | "friend" | "done";
type Try = "got" | "effort";
type Power = "freeze" | "bubble" | "tickle" | "glitter";
type VillainKey = "cloud" | "sock" | "robot";

const SAYS_PER_WORD = 2;
const CAPES = [
  { name: "Red", color: "#e53935" },
  { name: "Blue", color: "#1e88e5" },
  { name: "Purple", color: "#8e24aa" },
  { name: "Green", color: "#43a047" },
];
type Emblem = "star" | "bolt" | "heart";
const POWERS: Record<Power, { label: string; color: string; react: string }> = {
  freeze: { label: "Freeze ray", color: "#4fc3f7", react: "Brrr! Frozen still!" },
  bubble: { label: "Bubble trap", color: "#b39ddb", react: "Stuck in a bubble! Boing!" },
  tickle: { label: "Tickle ray", color: "#f48fb1", react: "Hee hee hee! That tickles!" },
  glitter: { label: "Glitter blast", color: "#ffd54f", react: "Ooh, so sparkly!" },
};
const VILLAINS: Record<VillainKey, { name: string; trouble: string; friendly: string }> = {
  cloud: { name: "Grumble Cloud", trouble: "is raining on the playground!", friendly: "I'm not grumpy anymore! Can I make rainbows instead?" },
  sock: { name: "Sneaky Sock Monster", trouble: "took everyone's socks!", friendly: "Sorry! I was just cold. Here are the socks back!" },
  robot: { name: "Bossy Bot", trouble: "is telling everyone what to do!", friendly: "Beep boop! I'd rather play together. Friends?" },
};
const VILLAIN_ORDER: VillainKey[] = ["cloud", "sock", "robot"];

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

// 3 villains; 3 or 4 words each depending on how many words were assigned.
function buildRounds(words: string[]): string[][] {
  const per = words.length >= 10 ? 4 : 3;
  const q: string[] = [];
  while (q.length < per * 3) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return [0, 1, 2].map((i) => q.slice(i * per, (i + 1) * per));
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
function EmblemShape({ e, cx, cy, r, fill }: { e: Emblem; cx: number; cy: number; r: number; fill: string }) {
  if (e === "star") {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    }).join(" ");
    return <polygon points={pts} fill={fill} />;
  }
  if (e === "bolt") return <polygon points={`${cx + r * 0.2},${cy - r} ${cx - r * 0.6},${cy + r * 0.1} ${cx},${cy + r * 0.1} ${cx - r * 0.2},${cy + r} ${cx + r * 0.6},${cy - r * 0.1} ${cx},${cy - r * 0.1}`} fill={fill} />;
  return <path d={`M${cx} ${cy + r * 0.8} C${cx - r * 1.4} ${cy - r * 0.1} ${cx - r * 0.7} ${cy - r * 1.2} ${cx} ${cy - r * 0.4} C${cx + r * 0.7} ${cy - r * 1.2} ${cx + r * 1.4} ${cy - r * 0.1} ${cx} ${cy + r * 0.8} Z`} fill={fill} />;
}

function Hero({ cape, emblem, size = 140, pose = "stand" }: { cape: string; emblem: Emblem; size?: number; pose?: "stand" | "zap" }) {
  return (
    <svg viewBox="0 0 100 140" width={size * 0.72} height={size} style={{ overflow: "visible", display: "block" }}>
      <path d="M30 46 L14 128 Q50 118 86 128 L70 46 Z" fill={cape} />
      <rect x="34" y="44" width="32" height="44" rx="10" fill="#3949ab" />
      <circle cx="50" cy="64" r="11" fill="#fff" />
      <EmblemShape e={emblem} cx={50} cy={64} r={8} fill={cape} />
      <rect x="36" y="86" width="12" height="34" rx="5" fill="#3949ab" />
      <rect x="52" y="86" width="12" height="34" rx="5" fill="#3949ab" />
      <rect x="34" y="116" width="16" height="10" rx="4" fill={cape} />
      <rect x="50" y="116" width="16" height="10" rx="4" fill={cape} />
      {pose === "zap" ? <rect x="64" y="46" width="30" height="10" rx="5" fill="#3949ab" /> : <rect x="64" y="48" width="10" height="30" rx="5" fill="#3949ab" />}
      <rect x="26" y="48" width="10" height="30" rx="5" fill="#3949ab" />
      <circle cx="50" cy="28" r="18" fill="#f2c6a0" />
      <path d="M32 24 Q36 8 50 8 Q66 8 68 24 Q60 16 50 18 Q40 16 32 24 Z" fill="#4e342e" />
      <rect x="35" y="22" width="30" height="9" rx="4" fill={cape} />
      <circle cx="43" cy="27" r="2.6" fill="#222" /><circle cx="57" cy="27" r="2.6" fill="#222" />
      <path d="M43 36 Q50 42 57 36" stroke="#7b1f1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Villain({ v, friendly, effect, size = 150 }: { v: VillainKey; friendly: boolean; effect: Power | null; size?: number }) {
  const mouth = friendly ? <path d="M38 76 Q50 88 62 76" stroke="#333" strokeWidth="4" fill="none" strokeLinecap="round" />
    : effect === "tickle" ? <ellipse cx="50" cy="78" rx="10" ry="8" fill="#5d1f1f" />
    : <path d="M38 82 Q50 72 62 82" stroke="#333" strokeWidth="4" fill="none" strokeLinecap="round" />;
  const brows = friendly ? null : <><path d="M32 48 L44 52" stroke="#333" strokeWidth="3.5" /><path d="M68 48 L56 52" stroke="#333" strokeWidth="3.5" /></>;
  const eyes = <><circle cx="40" cy="60" r="5" fill="#222" /><circle cx="60" cy="60" r="5" fill="#222" /></>;
  let body: ReactNode;
  if (v === "cloud") {
    body = (
      <>
        <path d="M18 80 Q4 80 6 64 Q8 48 26 50 Q28 28 50 30 Q70 26 76 46 Q96 44 94 64 Q94 82 76 82 Z" fill={friendly ? "#e3f2fd" : "#78909c"} />
        {!friendly && [26, 46, 66].map((x) => <path key={x} d={`M${x} 90 l-4 10`} stroke="#4fc3f7" strokeWidth="3" />)}
        {friendly && <path d="M10 98 A40 30 0 0 1 90 98" stroke="#ffb74d" strokeWidth="5" fill="none" />}
      </>
    );
  } else if (v === "sock") {
    body = (
      <>
        <path d="M30 10 H66 V64 Q66 96 40 96 Q18 96 18 80 Q18 66 30 64 Z" fill={friendly ? "#a5d6a7" : "#9575cd"} />
        <rect x="30" y="10" width="36" height="12" fill={friendly ? "#81c784" : "#7e57c2"} />
        {[26, 40, 54].map((y) => <rect key={y} x="30" y={y} width="36" height="4" fill="rgba(255,255,255,.35)" />)}
      </>
    );
  } else {
    body = (
      <>
        <line x1="50" y1="14" x2="50" y2="26" stroke="#607d8b" strokeWidth="3" /><circle cx="50" cy="12" r="5" fill={friendly ? "#66bb6a" : "#ef5350"} />
        <rect x="20" y="26" width="60" height="66" rx="12" fill={friendly ? "#b0bec5" : "#90a4ae"} />
        <rect x="30" y="50" width="40" height="22" rx="6" fill="#eceff1" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} style={{ overflow: "visible", display: "block" }}
      className={effect === "tickle" && !friendly ? "sh-wiggle" : friendly ? "sh-bounce" : "sh-hover"}>
      {body}
      {v === "robot" ? <g transform="translate(0 2)">{eyes}{brows}{mouth}</g> : <g>{eyes}{brows}{mouth}</g>}
      {effect === "freeze" && !friendly && <rect x="2" y="4" width="96" height="100" rx="14" fill="rgba(179,229,252,.55)" stroke="#81d4fa" strokeWidth="3" />}
      {effect === "bubble" && !friendly && <circle cx="50" cy="56" r="54" fill="rgba(209,196,233,.35)" stroke="#b39ddb" strokeWidth="3" />}
      {effect === "glitter" && !friendly && [[14, 20], [86, 24], [20, 92], [84, 88], [50, 6]].map(([x, y], i) => (
        <polygon key={i} points={`${x},${y - 7} ${x + 2},${y - 2} ${x + 7},${y} ${x + 2},${y + 2} ${x},${y + 7} ${x - 2},${y + 2} ${x - 7},${y} ${x - 2},${y - 2}`} fill="#ffd54f" className="sh-twinkle" />
      ))}
    </svg>
  );
}

function PowerIcon({ p, size = 56 }: { p: Power; size?: number }) {
  const c = POWERS[p].color;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size}>
      <circle cx="30" cy="30" r="27" fill={c} stroke="rgba(0,0,0,.2)" strokeWidth="2" />
      {p === "freeze" && <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M30 12 V48 M14 21 L46 39 M14 39 L46 21" /></g>}
      {p === "bubble" && <><circle cx="26" cy="32" r="11" fill="none" stroke="#fff" strokeWidth="3" /><circle cx="40" cy="20" r="6" fill="none" stroke="#fff" strokeWidth="3" /></>}
      {p === "tickle" && <path d="M14 40 Q22 14 30 30 Q38 46 46 18" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />}
      {p === "glitter" && <polygon points="30,10 34,26 50,30 34,34 30,50 26,34 10,30 26,26" fill="#fff" />}
    </svg>
  );
}

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto", color: "#1a237e" }}>
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
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* dragging still works */ }
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
.sh-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(#1a237e,#3949ab 60%,#7986cb);color:#fff;padding:14px 14px 30px;box-sizing:border-box}
.sh-wrap{max-width:720px;margin:0 auto}
.sh-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.sh-chip{background:rgba(255,255,255,.15);border:none;color:#fff;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.sh-card{background:#fff;color:#1a237e;border-radius:22px;padding:14px;text-align:center}
.sh-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.sh-big:active{transform:scale(.97)}
.sh-go{background:linear-gradient(135deg,#ff7043,#e53935);color:#fff;width:100%}
.sh-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.sh-try{background:#f5a623;color:#1a237e;box-shadow:0 4px 0 #b97a12}
.sh-word{font-size:34px;font-weight:900;margin:6px 0 0}
.sh-power{display:flex;justify-content:center;gap:10px;margin:8px 0}
.sh-cell{width:36px;height:36px;border-radius:50%;border:3px solid #c5cae9;background:#f3f4fb}
.sh-cell.got{background:#27c06b;border-color:#1b8a4c}.sh-cell.effort{background:#f5a623;border-color:#b97a12}
.sh-arena{display:flex;justify-content:space-around;align-items:flex-end;background:linear-gradient(#bbdefb,#e3f2fd 70%,#a5d6a7 70%);border-radius:18px;padding:10px 6px 8px;min-height:200px;position:relative}
.sh-target{border-radius:20px;padding:4px}
.sh-target.hot{outline:4px dashed #ffd54f}
.sh-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.sh-opt{background:#f3f4fb;border:3px solid #c5cae9;border-radius:16px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:800;font-size:14px;color:#1a237e}
.sh-meter{display:flex;gap:6px;justify-content:center;margin:6px 0}
.sh-meter span{width:26px;height:12px;border-radius:6px;background:#ffcdd2}
.sh-meter span.on{background:#66bb6a}
.sh-hover{animation:shHover 2s ease-in-out infinite}
@keyframes shHover{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.sh-wiggle{animation:shWiggle .25s ease-in-out infinite}
@keyframes shWiggle{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
.sh-bounce{animation:shBounce .7s ease-in-out infinite}
@keyframes shBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.sh-twinkle{animation:shTw .5s ease-in-out infinite alternate}
@keyframes shTw{from{opacity:.3}to{opacity:1}}
.sh-pop{animation:shPop .5s ease-out}
@keyframes shPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
.sh-pick{border-radius:14px;padding:6px 10px;cursor:pointer;font-family:inherit;font-weight:800;color:#fff;border:3px solid transparent}
@media (max-width:520px){.sh-arena{min-height:170px}}
`;

export default function SuperheroGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [cape, setCape] = useState(CAPES[0].color);
  const [emblem, setEmblem] = useState<Emblem>("star");
  const [rounds, setRounds] = useState<string[][]>([]);
  const [vIdx, setVIdx] = useState(0);
  const [wIdx, setWIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [effect, setEffect] = useState<Power | null>(null);
  const [choices, setChoices] = useState<Power[]>([]);
  const [friends, setFriends] = useState<VillainKey[]>([]);
  const [hot, setHot] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const villain = VILLAIN_ORDER[vIdx];
  const curWord = rounds[vIdx]?.[wIdx] || "";
  const perVillain = rounds[0]?.length || 3;

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio();
    sfx("tap");
    busy.current = false;
    setRounds(buildRounds(words));
    setVIdx(0); setWIdx(0); setPower([]); setSecondTry(false); setLog([]); setEffect(null); setFriends([]);
    setPhase("say");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      setChoices(shuffle(Object.keys(POWERS) as Power[]).slice(0, 3));
      setEffect(null);
      window.setTimeout(() => setPhase("power"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); setLog((l) => [...l, { word: curWord, t: "effort" }]); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  function firePower(p: Power) {
    if (busy.current) return;
    busy.current = true;
    setEffect(p);
    setHot(false);
    sfx("success");
    window.setTimeout(() => {
      busy.current = false;
      setPower([]);
      if (wIdx + 1 < perVillain) { setWIdx(wIdx + 1); setPhase("say"); }
      else { setFriends((f) => [...f, villain]); sfx("level"); setPhase("friend"); }
    }, 1900);
  }

  function inTarget(x: number, y: number) {
    const r = targetRef.current?.getBoundingClientRect();
    return !!r && x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30;
  }

  function nextVillain() {
    setEffect(null);
    if (vIdx + 1 < VILLAIN_ORDER.length) { setVIdx(vIdx + 1); setWIdx(0); setPhase("say"); }
    else { sfx("win"); setPhase("done"); }
  }

  if (!words.length) {
    return (
      <div className="sh-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="sh-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Superhero there.</p>
          <button className="sh-big sh-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="sh-page"><style>{CSS}</style><div className="sh-wrap">
        <button className="sh-chip" onClick={goBack}>Back</button>
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <h1 style={{ margin: "4px 0" }}>Superhero</h1>
          <p style={{ margin: 0, fontWeight: 700, color: "#e8eaf6" }}>Grumpy villains are causing trouble. Use your words and super powers to cheer them up!</p>
        </div>
        <div className="sh-card" style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <Hero cape={cape} emblem={emblem} size={170} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 900, margin: "4px 0" }}>Pick your cape</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CAPES.map((c) => (
                <button key={c.name} className="sh-pick" style={{ background: c.color, borderColor: cape === c.color ? "#1a237e" : "transparent" }}
                  onClick={() => { setCape(c.color); sfx("tap"); }}>{c.name}</button>
              ))}
            </div>
            <div style={{ fontWeight: 900, margin: "10px 0 4px" }}>Pick your symbol</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["star", "bolt", "heart"] as Emblem[]).map((e) => (
                <button key={e} onClick={() => { setEmblem(e); sfx("tap"); }}
                  style={{ background: "#f3f4fb", border: emblem === e ? "3px solid #1a237e" : "3px solid #c5cae9", borderRadius: 14, padding: 6, cursor: "pointer" }}>
                  <svg viewBox="0 0 40 40" width="40" height="40"><EmblemShape e={e} cx={20} cy={20} r={14} fill={cape} /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="sh-big sh-go" style={{ marginTop: 14 }} onClick={start}>Save the day</button>
        <p style={{ textAlign: "center", color: "#e8eaf6", fontSize: 14, fontWeight: 700 }}>Grown-up: after each try, tap Got it or Try again.</p>
      </div></div>
    );
  }

  if (phase === "done") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    return (
      <div className="sh-page"><style>{CSS}</style><div className="sh-wrap">
        <div className="sh-card sh-pop">
          <h1 style={{ margin: "4px 0" }}>You saved the day!</h1>
          <p style={{ fontWeight: 800, margin: 0 }}>Every villain is now your friend. Here's your new team:</p>
          <div className="sh-arena" style={{ marginTop: 10 }}>
            <Hero cape={cape} emblem={emblem} size={130} />
            {friends.map((f) => <Villain key={f} v={f} friendly effect={null} size={105} />)}
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, margin: "10px 0 6px" }}>You practiced {log.length} times. Grown-up marked {got} of {log.length} tries correct.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="sh-big sh-go" onClick={start}>Play again</button>
            <button className="sh-big" style={{ background: "#e8eaf6", color: "#1a237e" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  const meter = (
    <div className="sh-meter" aria-label="cheer-up meter">
      {Array.from({ length: perVillain }, (_, i) => <span key={i} className={i < wIdx + (phase === "friend" ? 1 : 0) || (phase === "power" && effect && i === wIdx) ? "on" : ""} />)}
    </div>
  );

  const arena = (
    <div className="sh-arena">
      <Hero cape={cape} emblem={emblem} size={130} pose={phase === "power" ? "zap" : "stand"} />
      <div ref={targetRef} className={`sh-target ${hot ? "hot" : ""}`}>
        <Villain v={villain} friendly={phase === "friend"} effect={effect} size={120} />
      </div>
    </div>
  );

  return (
    <div className="sh-page"><style>{CSS}</style><div className="sh-wrap">
      <div className="sh-row">
        <button className="sh-chip" onClick={goBack}>Back</button>
        {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#ffd54f" }}>/{sound}/</span></div>}
        <div style={{ fontWeight: 900 }}>Villain {vIdx + 1} of 3</div>
      </div>
      <div className="sh-card">
        <div style={{ fontWeight: 900, fontSize: 18 }}>{VILLAINS[villain].name} {phase === "friend" ? "is happy now!" : VILLAINS[villain].trouble}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#5c6bc0" }}>Cheer-up meter</div>
        {meter}
        {arena}
        {phase === "say" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#3949ab", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times to power up!</div>
            <div style={{ marginTop: 6 }}><WordPic key={curWord} word={curWord} size={130} /></div>
            <div className="sh-word">{curWord}</div>
            <div className="sh-power">
              {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`sh-cell ${power[i] || ""}`} />)}
            </div>
            <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
            <button className="sh-chip" style={{ background: "#e8eaf6", color: "#1a237e", marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button className="sh-big sh-got" onClick={gotIt}>Got it</button>
              <button className="sh-big sh-try" onClick={tryAgain}>Try again</button>
            </div>
          </div>
        )}
        {phase === "power" && (
          <div style={{ marginTop: 10 }}>
            {effect ? (
              <h2 className="sh-pop" style={{ margin: "6px 0" }}>{POWERS[effect].react}</h2>
            ) : (
              <>
                <h2 style={{ margin: "0 0 2px" }}>Your turn! Pick a super power</h2>
                <div style={{ fontWeight: 700, color: "#5c6bc0" }}>Drag it to {VILLAINS[villain].name}, or tap it.</div>
                <div className="sh-opts">
                  {choices.map((p) => (
                    <Draggable key={p} onTap={() => firePower(p)} onDrop={(x, y) => { if (inTarget(x, y)) firePower(p); else setHot(false); }}>
                      <div className="sh-opt"><PowerIcon p={p} />{POWERS[p].label}</div>
                    </Draggable>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {phase === "friend" && (
          <div className="sh-pop" style={{ marginTop: 10 }}>
            <h2 style={{ margin: "4px 0" }}>"{VILLAINS[villain].friendly}"</h2>
            <p style={{ fontWeight: 800 }}>{VILLAINS[villain].name} joined your team!</p>
            <button className="sh-big sh-go" onClick={nextVillain}>{vIdx + 1 < VILLAIN_ORDER.length ? "Next adventure" : "See your team"}</button>
          </div>
        )}
      </div>
    </div></div>
  );
}
