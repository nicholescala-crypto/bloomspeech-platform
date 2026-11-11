import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Word Quest: the child and a buddy travel camp to camp.
// For each word: SAY IT 3 TIMES (the grown-up taps Got it / Try again; every
// try powers up), then it's the child's turn to PLAY: drag the picture to the
// monster, drag the shovel to dig, drag the ball into the hoop, drag the fuel
// to the rocket. After each camp the child CHOOSES a path, and each path finds
// a different keepsake, so every trip ends with a different treasure.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "toy" | "camp" | "won";
type Try = "got" | "effort";
type ToyKey = "monster" | "dig" | "hoop" | "fuel";
type PathKey = "forest" | "river" | "cave" | "mountain";

const SAYS_PER_WORD = 3;
const WORDS_PER_CAMP = 3;
const CAMPS = 4;

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

// Up to 4 camps of 3 words; short lists repeat so there is still a full trip.
function buildCamps(words: string[]): string[][] {
  const camps = Math.max(3, Math.min(CAMPS, Math.ceil(words.length / WORDS_PER_CAMP)));
  const need = camps * WORDS_PER_CAMP;
  const q: string[] = [];
  while (q.length < need) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  const out: string[][] = [];
  for (let i = 0; i < camps; i++) out.push(q.slice(i * WORDS_PER_CAMP, (i + 1) * WORDS_PER_CAMP));
  return out;
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
const BUDDIES = ["Fox", "Bear", "Owl", "Frog"] as const;
type Buddy = (typeof BUDDIES)[number];

function BuddyFace({ who, size = 56 }: { who: Buddy; size?: number }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size}>
      {who === "Fox" && (
        <>
          <polygon points="10,8 22,22 8,28" fill="#e8762d" />
          <polygon points="50,8 38,22 52,28" fill="#e8762d" />
          <circle cx="30" cy="34" r="20" fill="#f08a3c" />
          <path d="M14 38 Q30 58 46 38 Q30 46 14 38 Z" fill="#fff" />
          <circle cx="23" cy="30" r="3" fill="#222" /><circle cx="37" cy="30" r="3" fill="#222" />
          <circle cx="30" cy="42" r="3" fill="#222" />
        </>
      )}
      {who === "Bear" && (
        <>
          <circle cx="13" cy="15" r="8" fill="#8d5a3b" /><circle cx="47" cy="15" r="8" fill="#8d5a3b" />
          <circle cx="30" cy="33" r="21" fill="#a0694a" />
          <ellipse cx="30" cy="41" rx="10" ry="8" fill="#e3c0a0" />
          <circle cx="22" cy="29" r="3" fill="#222" /><circle cx="38" cy="29" r="3" fill="#222" />
          <ellipse cx="30" cy="38" rx="3.5" ry="2.5" fill="#222" />
        </>
      )}
      {who === "Owl" && (
        <>
          <polygon points="12,10 20,20 10,22" fill="#7b6a58" /><polygon points="48,10 40,20 50,22" fill="#7b6a58" />
          <ellipse cx="30" cy="34" rx="21" ry="22" fill="#8d7b67" />
          <circle cx="21" cy="30" r="9" fill="#fff" /><circle cx="39" cy="30" r="9" fill="#fff" />
          <circle cx="21" cy="30" r="4" fill="#222" /><circle cx="39" cy="30" r="4" fill="#222" />
          <polygon points="30,36 26,41 34,41" fill="#f2a52b" />
        </>
      )}
      {who === "Frog" && (
        <>
          <circle cx="18" cy="18" r="9" fill="#5cb85c" /><circle cx="42" cy="18" r="9" fill="#5cb85c" />
          <circle cx="18" cy="17" r="4.5" fill="#fff" /><circle cx="42" cy="17" r="4.5" fill="#fff" />
          <circle cx="18" cy="17" r="2.2" fill="#222" /><circle cx="42" cy="17" r="2.2" fill="#222" />
          <ellipse cx="30" cy="36" rx="22" ry="17" fill="#6cc66c" />
          <path d="M18 38 Q30 48 42 38" stroke="#2e7d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const PATHS: Record<PathKey, { label: string; find: string; color: string }> = {
  forest: { label: "Forest path", find: "a pinecone", color: "#2e7d32" },
  river: { label: "River path", find: "a shiny shell", color: "#1e88e5" },
  cave: { label: "Cave path", find: "a glowing crystal", color: "#6a1b9a" },
  mountain: { label: "Mountain path", find: "an eagle feather", color: "#6d4c41" },
};

function Keepsake({ k, size = 46 }: { k: PathKey; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      {k === "forest" && (
        <>
          <ellipse cx="20" cy="22" rx="10" ry="14" fill="#8d5a3b" />
          {[12, 18, 24, 30].map((y) => <path key={y} d={`M11 ${y} Q20 ${y + 5} 29 ${y}`} stroke="#5d3a24" strokeWidth="2" fill="none" />)}
          <rect x="18" y="4" width="4" height="6" fill="#5d3a24" />
        </>
      )}
      {k === "river" && (
        <>
          <path d="M6 30 Q20 0 34 30 Z" fill="#ffccbc" stroke="#e64a19" strokeWidth="1.5" />
          {[12, 16, 20, 24, 28].map((x) => <line key={x} x1="20" y1="30" x2={x} y2="12" stroke="#e64a19" strokeWidth="1.2" />)}
        </>
      )}
      {k === "cave" && <polygon points="20,3 31,15 26,37 14,37 9,15" fill="#ce93d8" stroke="#8e24aa" strokeWidth="2" />}
      {k === "mountain" && (
        <>
          <path d="M8 36 Q14 10 32 4 Q26 24 8 36 Z" fill="#a1887f" />
          <line x1="8" y1="36" x2="30" y2="6" stroke="#5d4037" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 14, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, color: "#13314f" }}>
        {word}
      </div>
    );
  return (
    <img src={`/Images/${word.toLowerCase()}.png`} alt={word} onError={() => setMissing(true)} draggable={false}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 14, background: "#fff", pointerEvents: "none" }} />
  );
}

const Monster = ({ chomp }: { chomp: boolean }) => (
  <svg viewBox="0 0 140 130" width="210" height="195" className={chomp ? "wq-chomp" : "wq-wiggle"}>
    <path d="M20 120 Q10 40 70 20 Q130 40 120 120 Z" fill="#8e5cd9" />
    <circle cx="50" cy="50" r="13" fill="#fff" /><circle cx="90" cy="50" r="13" fill="#fff" />
    <circle cx="52" cy="52" r="6" fill="#222" /><circle cx="88" cy="52" r="6" fill="#222" />
    {chomp ? <path d="M40 88 Q70 100 100 88" stroke="#3b1f66" strokeWidth="6" fill="none" strokeLinecap="round" />
      : <ellipse cx="70" cy="90" rx="30" ry="18" fill="#3b1f66" />}
    {!chomp && <><rect x="52" y="73" width="9" height="9" fill="#fff" /><rect x="79" y="73" width="9" height="9" fill="#fff" /></>}
  </svg>
);

const Mound = () => (
  <svg viewBox="0 0 160 100" width="240" height="150">
    <path d="M5 98 Q30 20 80 14 Q130 20 155 98 Z" fill="#8a5a32" />
    <path d="M30 70 Q50 60 60 72 M90 50 Q105 44 118 58 M70 86 Q82 80 92 88" stroke="#6b4423" strokeWidth="4" fill="none" />
  </svg>
);

const Shovel = () => (
  <svg viewBox="0 0 60 120" width="78" height="156">
    <rect x="26" y="6" width="8" height="70" rx="3" fill="#8d6e63" />
    <rect x="16" y="2" width="28" height="10" rx="5" fill="#6d4c41" />
    <path d="M12 74 L48 74 L44 108 Q30 120 16 108 Z" fill="#90a4ae" stroke="#607d8b" strokeWidth="2" />
  </svg>
);

const Hoop = ({ swish }: { swish: boolean }) => (
  <svg viewBox="0 0 140 130" width="210" height="195">
    <rect x="20" y="4" width="100" height="70" rx="6" fill="#fff" stroke="#90a4ae" strokeWidth="4" />
    <rect x="50" y="26" width="40" height="30" fill="none" stroke="#ef5350" strokeWidth="4" />
    <ellipse cx="70" cy="78" rx="30" ry="7" fill="none" stroke="#f57c00" strokeWidth="6" />
    <path d="M42 80 L52 118 M58 82 L62 120 M82 82 L78 120 M98 80 L88 118" stroke="#cfd8dc" strokeWidth="3" className={swish ? "wq-net" : ""} />
  </svg>
);

const FuelCan = () => (
  <svg viewBox="0 0 70 90" width="90" height="116">
    <rect x="8" y="18" width="54" height="68" rx="8" fill="#e53935" />
    <rect x="22" y="4" width="26" height="14" rx="4" fill="#b71c1c" />
    <path d="M20 42 L35 30 L50 42 L35 70 Z" fill="#ffeb3b" />
  </svg>
);

const SmallRocket = ({ go }: { go: boolean }) => (
  <svg viewBox="0 0 100 170" width="124" height="210" className={go ? "wq-launch" : "wq-wiggle"} style={{ overflow: "visible" }}>
    {go && <path d="M36 140 Q50 200 64 140 Z" fill="#ff7043" />}
    <path d="M30 60 L10 140 L32 130 Z" fill="#37474f" /><path d="M70 60 L90 140 L68 130 Z" fill="#37474f" />
    <path d="M50 4 Q82 40 74 140 L26 140 Q18 40 50 4 Z" fill="#eceff1" stroke="#90a4ae" strokeWidth="3" />
    <circle cx="50" cy="70" r="14" fill="#b3e5fc" stroke="#90a4ae" strokeWidth="3" />
  </svg>
);

const TOYS: Record<ToyKey, { title: string; hint: string; done: string }> = {
  monster: { title: "Feed the monster", hint: "Drag the picture into the monster's mouth!", done: "Yum!" },
  dig: { title: "Treasure dig", hint: "Drag the shovel to the dirt!", done: "You found treasure!" },
  hoop: { title: "Hoop shot", hint: "Drag the ball into the hoop!", done: "Swish!" },
  fuel: { title: "Blast off", hint: "Drag the fuel to the rocket!", done: "Blast off!" },
};
const TOY_ORDER: ToyKey[] = ["monster", "dig", "hoop", "fuel"];

// ── Drag-to-target toy ─────────────────────────────────────────────
function DragToy({ toy, word, onDone }: { toy: ToyKey; word: string; onDone: () => void }) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  const [hot, setHot] = useState(false);
  const [done, setDone] = useState(false);
  const [nudge, setNudge] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  function inTarget(x: number, y: number) {
    const r = targetRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 24;
    return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (done) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
    setDrag({ sx: e.clientX - off.x, sy: e.clientY - off.y });
    setNudge(false);
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setOff({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
    setHot(inTarget(e.clientX, e.clientY));
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag(null);
    setHot(false);
    const moved = Math.hypot(off.x, off.y) > 12;
    if (inTarget(e.clientX, e.clientY)) {
      setDone(true);
      sfx("success");
      window.setTimeout(onDone, 1500);
    } else {
      setOff({ x: 0, y: 0 });
      if (!moved) { setNudge(true); sfx("tap"); }
    }
  }

  const item =
    toy === "monster" ? <WordPic word={word} size={120} /> :
    toy === "dig" ? <Shovel /> :
    toy === "hoop" ? (
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#f57c00", border: "4px solid #bf360c", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <WordPic word={word} size={86} />
      </div>
    ) : <FuelCan />;

  const target =
    toy === "monster" ? <Monster chomp={done} /> :
    toy === "dig" ? (done ? <div className="wq-reveal" style={{ position: "relative" }}><WordPic word={word} size={150} /><div style={{ position: "absolute", top: -14, right: -18 }}><Keepsake k="cave" size={54} /></div></div> : <Mound />) :
    toy === "hoop" ? <Hoop swish={done} /> :
    <SmallRocket go={done} />;

  return (
    <div className="wq-stage">
      <div className="wq-target" ref={targetRef} style={{ outline: hot ? "4px dashed #27c06b" : "none" }}>{target}</div>
      {!done && (
        <div className={`wq-drag ${nudge ? "wq-nudge" : ""}`}
          style={{ transform: `translate(${off.x}px, ${off.y}px)`, transition: drag ? "none" : "transform .25s", cursor: drag ? "grabbing" : "grab" }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { setDrag(null); setOff({ x: 0, y: 0 }); }}>
          {item}
        </div>
      )}
      {done && <div className="wq-done">{TOYS[toy].done}</div>}
      {nudge && !done && <div className="wq-hint-pop">Drag it!</div>}
    </div>
  );
}

const CSS = `
.wq-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(180deg,#0e2a4d,#13457a 55%,#1f6fb0);color:#fff;padding:14px 14px 30px;box-sizing:border-box}
.wq-wrap{max-width:680px;margin:0 auto}
.wq-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.wq-chip{background:rgba(255,255,255,.14);border:none;color:#fff;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.wq-card{background:rgba(255,255,255,.97);color:#13314f;border-radius:22px;padding:16px;text-align:center;position:relative;overflow:hidden}
.wq-map{display:flex;align-items:center;justify-content:space-between;position:relative;background:rgba(255,255,255,.08);border-radius:18px;padding:10px 12px;margin-bottom:12px}
.wq-map-line{position:absolute;left:30px;right:30px;top:50%;height:4px;background:rgba(255,255,255,.2)}
.wq-stop{position:relative;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900}
.wq-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.wq-big:active{transform:scale(.97)}
.wq-go{background:linear-gradient(135deg,#27c06b,#1ea65a);color:#fff;width:100%}
.wq-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.wq-try{background:#f5a623;color:#13314f;box-shadow:0 4px 0 #b97a12}
.wq-word{font-size:38px;font-weight:900;margin:6px 0 0}
.wq-power{display:flex;justify-content:center;gap:10px;margin:10px 0}
.wq-cell{width:40px;height:40px;border-radius:50%;border:3px solid #cfd8dc;display:flex;align-items:center;justify-content:center;background:#f4f7f9}
.wq-cell.got{background:#27c06b;border-color:#1b8a4c}
.wq-cell.effort{background:#f5a623;border-color:#b97a12}
.wq-cell.got::after,.wq-cell.effort::after{content:"";width:14px;height:14px;border-radius:50%;background:#fff}
.wq-stage{position:relative;height:340px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 10px;touch-action:none;margin:8px -16px -16px;background:linear-gradient(#e3f2fd 0%,#e3f2fd 72%,#a5d6a7 72%,#81c784 100%)}
.wq-target{align-self:flex-start;margin-left:auto;margin-right:6%;margin-top:14px;border-radius:20px;padding:4px}
.wq-drag{position:absolute;left:14px;bottom:10px;touch-action:none;user-select:none;z-index:5}
.wq-done{position:absolute;left:0;right:0;bottom:16px;font-size:30px;font-weight:900;color:#1b8a4c;animation:wqPop .5s ease-out}
.wq-hint-pop{position:absolute;left:18px;bottom:130px;background:#13314f;color:#fff;border-radius:12px;padding:6px 12px;font-weight:900}
.wq-nudge{animation:wqShake .4s ease-in-out 2}
.wq-wiggle{animation:wqBob 2.4s ease-in-out infinite}
.wq-chomp{animation:wqChomp .3s ease-in-out 3}
.wq-launch{animation:wqLaunch 1.4s ease-in forwards}
.wq-reveal{animation:wqPop .6s ease-out}
.wq-net{animation:wqShake .3s ease-in-out 2}
@keyframes wqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes wqChomp{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.85)}}
@keyframes wqLaunch{0%{transform:translateY(0)}20%{transform:translateY(6px)}100%{transform:translateY(-420px)}}
@keyframes wqPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes wqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.wq-paths{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.wq-path{border:none;border-radius:18px;padding:18px 10px;color:#fff;font-weight:900;font-size:18px;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px}
.wq-buddies{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.wq-buddy{border-radius:14px;padding:8px 4px;cursor:pointer;font-family:inherit;font-weight:800;color:#fff;display:flex;flex-direction:column;align-items:center;gap:2px}
.wq-chest{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;background:#fff8e1;border-radius:18px;padding:12px;margin:10px 0}
@media (max-height:560px){.wq-stage{height:260px}.wq-word{font-size:30px}}
@media (max-width:520px){.wq-target{transform:scale(.75);transform-origin:top right;margin-right:0}}
`;

export default function AdventureGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [buddy, setBuddy] = useState<Buddy>("Fox");
  const [camps, setCamps] = useState<string[][]>([]);
  const [camp, setCamp] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [found, setFound] = useState<PathKey[]>([]);
  const [pathChoice, setPathChoice] = useState<PathKey[]>(["forest", "river"]);
  const [toyCount, setToyCount] = useState(0);

  // recorder (optional: hear yourself)
  const [isRec, setIsRec] = useState(false);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const curWord = camps[camp]?.[wordIdx] || "";
  const soundLabel = sound ? `/${sound}/` : "";
  const toy = TOY_ORDER[toyCount % TOY_ORDER.length];

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      r.onstop = () => {
        setRecUrl(URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach((t) => t.stop());
      };
      r.start();
      recRef.current = r;
      setIsRec(true);
    } catch { /* mic off: the game still works */ }
  }
  function stopRec() {
    const r = recRef.current;
    if (r && r.state !== "inactive") r.stop();
    setIsRec(false);
  }

  function start() {
    unlockAudio();
    sfx("tap");
    setCamps(buildCamps(words));
    setCamp(0); setWordIdx(0); setPower([]); setSecondTry(false); setLog([]); setFound([]); setToyCount(0);
    setPhase("say");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    setRecUrl(null);
    if (next.length >= SAYS_PER_WORD) {
      sfx("level");
      window.setTimeout(() => setPhase("toy"), 500);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  function toyDone() {
    setToyCount((n) => n + 1);
    setPower([]);
    if (wordIdx + 1 < WORDS_PER_CAMP) {
      setWordIdx(wordIdx + 1);
      setPhase("say");
    } else if (camp + 1 < camps.length) {
      const keys = shuffle(Object.keys(PATHS) as PathKey[]).slice(0, 2);
      setPathChoice(keys);
      sfx("level");
      setPhase("camp");
    } else {
      sfx("win");
      setPhase("won");
    }
  }

  function choosePath(k: PathKey) {
    sfx("success");
    setFound((f) => [...f, k]);
    setCamp(camp + 1);
    setWordIdx(0);
    setPhase("say");
  }

  if (!words.length) {
    return (
      <div className="wq-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="wq-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Word Quest there.</p>
          <button className="wq-big wq-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const map = (
    <div className="wq-map">
      <div className="wq-map-line" />
      {camps.map((_, i) => (
        <div key={i} className="wq-stop" style={{
          background: i < camp ? "#27c06b" : i === camp ? "#f5b820" : "rgba(255,255,255,.15)",
          border: i === camp ? "3px solid #fff" : "2px solid rgba(255,255,255,.3)",
        }}>
          {i === camp ? <BuddyFace who={buddy} size={38} /> : i < camp && found[i] ? <Keepsake k={found[i]} size={28} /> : i + 1}
        </div>
      ))}
      <div className="wq-stop" style={{ background: "#8d6e63", border: "2px solid rgba(255,255,255,.3)", fontSize: 12 }}>END</div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="wq-page"><style>{CSS}</style><div className="wq-wrap">
        <button className="wq-chip" onClick={goBack}>Back</button>
        <div style={{ textAlign: "center", margin: "8px 0 12px" }}>
          <h1 style={{ fontSize: 32, margin: "4px 0" }}>Word Quest</h1>
          <p style={{ color: "#cfe4ff", fontWeight: 700, margin: 0 }}>Say each word 3 times to power up. Then play!</p>
          <p style={{ color: "#cfe4ff", fontWeight: 700, margin: "4px 0 0" }}>Pick your path at every camp and find treasure.</p>
        </div>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Pick your buddy</div>
        <div className="wq-buddies">
          {BUDDIES.map((b) => (
            <button key={b} className="wq-buddy" onClick={() => { setBuddy(b); sfx("tap"); }}
              style={{ border: buddy === b ? "3px solid #7fd4ff" : "2px solid rgba(255,255,255,.2)", background: buddy === b ? "rgba(127,212,255,.2)" : "rgba(255,255,255,.06)" }}>
              <BuddyFace who={b} />{b}
            </button>
          ))}
        </div>
        <button className="wq-big wq-go" style={{ marginTop: 16 }} onClick={start}>Start the quest</button>
        <p style={{ textAlign: "center", color: "#bfe0ff", fontSize: 14, fontWeight: 700 }}>Grown-up: after each try, tap Got it or Try again.</p>
      </div></div>
    );
  }

  if (phase === "camp") {
    return (
      <div className="wq-page"><style>{CSS}</style><div className="wq-wrap">
        {map}
        <div className="wq-card">
          <BuddyFace who={buddy} size={80} />
          <h1 style={{ margin: "6px 0" }}>Camp {camp + 1} done!</h1>
          <p style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>Which way should {buddy} go next?</p>
          <div className="wq-paths">
            {pathChoice.map((k) => (
              <button key={k} className="wq-path" style={{ background: PATHS[k].color }} onClick={() => choosePath(k)}>
                {PATHS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div></div>
    );
  }

  if (phase === "won") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    return (
      <div className="wq-page"><style>{CSS}</style><div className="wq-wrap">
        <div className="wq-card wq-reveal">
          <BuddyFace who={buddy} size={90} />
          <h1 style={{ margin: "6px 0" }}>You reached the treasure!</h1>
          <p style={{ fontWeight: 800, margin: 0 }}>Here's what you and {buddy} found on your trip:</p>
          <div className="wq-chest">
            {found.length ? found.map((k, i) => (
              <div key={i} style={{ textAlign: "center", fontWeight: 800, fontSize: 13 }}><Keepsake k={k} size={56} /><div>{PATHS[k].find}</div></div>
            )) : <div style={{ fontWeight: 800 }}>A big gold coin!</div>}
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. {got} sounded right.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="wq-big wq-go" onClick={() => setPhase("intro")}>Go on a new quest</button>
            <button className="wq-big" style={{ background: "#e6f4f3", color: "#1f6e69" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="wq-page"><style>{CSS}</style><div className="wq-wrap">
      <div className="wq-row">
        <button className="wq-chip" onClick={goBack}>Back</button>
        {soundLabel && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#7fd4ff" }}>{soundLabel}</span></div>}
        <div style={{ fontWeight: 900 }}>Camp {camp + 1}</div>
      </div>
      {map}
      {phase === "say" ? (
        <div className="wq-card">
          <div style={{ fontSize: 14, fontWeight: 900, color: "#3b82d6", textTransform: "uppercase", letterSpacing: 1 }}>Say it 3 times to power up!</div>
          <div style={{ marginTop: 8 }}><WordPic key={curWord} word={curWord} size={170} /></div>
          <div className="wq-word">{curWord}</div>
          <div className="wq-power">
            {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`wq-cell ${power[i] || ""}`} />)}
          </div>
          <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "4px 0 10px" }}>
            <button className="wq-chip" style={{ background: "#eef5ff", color: "#2f6fb0" }} onClick={() => speak(curWord)}>Hear it</button>
            <button className="wq-chip" style={{ background: isRec ? "#ef4444" : "#eef5ff", color: isRec ? "#fff" : "#2f6fb0", touchAction: "none" }}
              onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={() => isRec && stopRec()}>
              {isRec ? "Recording... let go" : "Hold to record"}
            </button>
            {recUrl && !isRec && <button className="wq-chip" style={{ background: "#eef5ff", color: "#2f6fb0" }} onClick={() => new Audio(recUrl).play().catch(() => {})}>Hear yourself</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="wq-big wq-got" onClick={gotIt}>Got it</button>
            <button className="wq-big wq-try" onClick={tryAgain}>Try again</button>
          </div>
        </div>
      ) : (
        <div className="wq-card">
          <div style={{ fontSize: 22, fontWeight: 900 }}>Your turn! {TOYS[toy].title}</div>
          <div style={{ fontWeight: 700, color: "#456" }}>{TOYS[toy].hint}</div>
          <DragToy key={`${camp}-${wordIdx}`} toy={toy} word={curWord} onDone={toyDone} />
        </div>
      )}
    </div></div>
  );
}
