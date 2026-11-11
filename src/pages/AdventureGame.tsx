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
  return <img src={`/game-art/buddy-${who.toLowerCase()}.png`} alt={who} width={size} height={size} draggable={false} style={{ display: "block", objectFit: "contain" }} />;
}

const PATHS: Record<PathKey, { label: string; find: string; color: string }> = {
  forest: { label: "Forest path", find: "a pinecone", color: "#2e7d32" },
  river: { label: "River path", find: "a shiny shell", color: "#1e88e5" },
  cave: { label: "Cave path", find: "a glowing crystal", color: "#6a1b9a" },
  mountain: { label: "Mountain path", find: "an eagle feather", color: "#6d4c41" },
};

const KEEPSAKE_ART: Record<PathKey, string> = { forest: "pinecone", river: "shell", cave: "crystal", mountain: "feather" };
function Keepsake({ k, size = 46 }: { k: PathKey; size?: number }) {
  return <img src={`/game-art/keepsake-${KEEPSAKE_ART[k]}.png`} alt={PATHS[k].find} width={size} height={size} draggable={false} style={{ display: "block", objectFit: "contain" }} />;
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
  <div className={chomp ? "wq-chomp" : "wq-wiggle"}><img src={`/game-art/toy-monster-${chomp ? "happy" : "open"}.png`} alt="monster" width={200} height={200} draggable={false} style={{ display: "block", objectFit: "contain" }} /></div>
);

const Mound = () => (
  <img src="/game-art/toy-dirt.png" alt="" width={210} height={210} draggable={false} style={{ display: "block", objectFit: "contain" }} />
);

const Shovel = () => (
  <img src="/game-art/toy-shovel.png" alt="" width={130} height={130} draggable={false} style={{ display: "block", objectFit: "contain" }} />
);

const Hoop = ({ swish }: { swish: boolean }) => (
  <div className={swish ? "wq-net" : ""}><img src="/game-art/toy-hoop.png" alt="" width={200} height={200} draggable={false} style={{ display: "block", objectFit: "contain" }} /></div>
);

const FuelCan = () => (
  <img src="/game-art/toy-fuel.png" alt="" width={110} height={110} draggable={false} style={{ display: "block", objectFit: "contain" }} />
);

const SmallRocket = ({ go }: { go: boolean }) => (
  <div className={go ? "wq-launch" : "wq-wiggle"}><img src="/game-art/toy-rocket.png" alt="" width={200} height={200} draggable={false} style={{ display: "block", objectFit: "contain" }} /></div>
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
    if (!secondTry) { sfx("tap"); setSecondTry(true); setLog((l) => [...l, { word: curWord, t: "effort" }]); speak(curWord); }
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
              <BuddyFace who={b} size={86} />{b}
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
          <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. Grown-up marked {got} of {log.length} tries correct.</p>
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
