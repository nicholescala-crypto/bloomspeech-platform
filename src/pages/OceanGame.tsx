import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Ocean: the child builds their own reef. For each word the child SAYS IT
// TWICE (grown-up taps Got it / Try again; every try counts), then CHOOSES a
// sea animal and DRAGS it anywhere into the water, where it swims. At the end
// the child picks daytime, sunset or night; at night the jellyfish glow. Every
// reef looks different.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "place" | "light" | "done";
type Try = "got" | "effort";
type Animal = "fish" | "turtle" | "octopus" | "crab" | "jelly" | "seahorse" | "star";
type Placed = { a: Animal; x: number; y: number; hue: number };
type Light = "day" | "sunset" | "night";

const SAYS_PER_WORD = 2;
const ANIMALS: Record<Animal, string> = {
  fish: "Fish", turtle: "Sea turtle", octopus: "Octopus", crab: "Crab", jelly: "Jellyfish", seahorse: "Seahorse", star: "Starfish",
};
const FISH_COLORS = ["#ff7043", "#ffca28", "#4fc3f7", "#ab47bc", "#66bb6a", "#ec407a"];
const BOTTOM: Animal[] = ["crab", "star"]; // these sit on the sand

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
  const total = Math.max(10, Math.min(14, words.length * 2));
  const q: string[] = [];
  while (q.length < total) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return q.slice(0, total);
}

function pickColor() {
  return Math.floor(Math.random() * FISH_COLORS.length);
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
const ANIMAL_ART: Record<Animal, string> = {
  fish: "fish-orange", turtle: "turtle", octopus: "octopus", crab: "crab", jelly: "jellyfish", seahorse: "seahorse", star: "starfish",
};
function AnimalView({ a, hue = 0, size = 60, glow = false }: { a: Animal; hue?: number; size?: number; glow?: boolean }) {
  const art = a === "fish" ? (hue % 2 ? "fish-blue" : "fish-orange") : a === "jelly" && glow ? "jellyfish-glow" : ANIMAL_ART[a];
  return <img src={`/game-art/sea-${art}.png`} alt={ANIMALS[a]} width={size} height={size} draggable={false} style={{ display: "block", objectFit: "contain" }} />;
}

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto", color: "#01579b" }}>
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
.oc-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(#e1f5fe,#b3e5fc);color:#01579b;padding:14px 14px 30px;box-sizing:border-box}
.oc-wrap{max-width:740px;margin:0 auto}
.oc-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.oc-chip{background:#fff;border:2px solid #b3e5fc;color:#0277bd;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.oc-card{background:#fff;border-radius:22px;padding:14px;text-align:center;box-shadow:0 8px 24px rgba(2,119,189,.12)}
.oc-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.oc-big:active{transform:scale(.97)}
.oc-go{background:linear-gradient(135deg,#29b6f6,#0277bd);color:#fff;width:100%}
.oc-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.oc-try{background:#f5a623;color:#01579b;box-shadow:0 4px 0 #b97a12}
.oc-word{font-size:34px;font-weight:900;margin:6px 0 0}
.oc-power{display:flex;justify-content:center;gap:10px;margin:8px 0}
.oc-cell{width:36px;height:36px;border-radius:50%;border:3px solid #b3e5fc;background:#f1faff}
.oc-cell.got{background:#27c06b;border-color:#1b8a4c}.oc-cell.effort{background:#f5a623;border-color:#b97a12}
.oc-sea{position:relative;height:320px;border-radius:18px;overflow:hidden;transition:background 1.2s}
.oc-sea.day{background:linear-gradient(#4fc3f7,#0288d1 80%)}
.oc-sea.sunset{background:linear-gradient(#ffb74d,#f06292 30%,#5e35b1 85%)}
.oc-sea.night{background:linear-gradient(#0d1b4c,#01102e 85%)}
.oc-sea.hot{outline:4px dashed #fff59d;outline-offset:-4px}
.oc-sand{position:absolute;left:0;right:0;bottom:0;height:46px;background:#ffe082;border-top-left-radius:50% 18px;border-top-right-radius:50% 18px}
.oc-weed{position:absolute;bottom:30px;width:10px;border-radius:6px;background:#2e7d32;transform-origin:50% 100%;animation:ocSway 3s ease-in-out infinite alternate}
@keyframes ocSway{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
.oc-bub{position:absolute;bottom:0;width:8px;height:8px;border-radius:50%;border:2px solid rgba(255,255,255,.6);animation:ocBub 5s linear infinite}
@keyframes ocBub{from{transform:translateY(0);opacity:1}to{transform:translateY(-320px);opacity:0}}
.oc-swim{position:absolute;animation:ocSwim 4s ease-in-out infinite alternate}
@keyframes ocSwim{from{transform:translate(-50%,-50%) translateX(-12px)}to{transform:translate(-50%,-50%) translateX(12px) translateY(-6px)}}
.oc-sit{position:absolute;transform:translate(-50%,-50%)}
.oc-new{animation:ocIn .6s ease-out}
@keyframes ocIn{from{opacity:0;scale:.3}to{opacity:1;scale:1}}
.oc-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.oc-opt{background:#f1faff;border:3px solid #b3e5fc;border-radius:16px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:800;font-size:14px}
.oc-pop{animation:ocPop .5s ease-out}
@keyframes ocPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
@media (max-width:520px){.oc-sea{height:260px}}
`;

export default function OceanGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [choices, setChoices] = useState<{ a: Animal; hue: number }[]>([]);
  const [light, setLight] = useState<Light>("day");
  const [hot, setHot] = useState(false);
  const [bubbles] = useState(() => Array.from({ length: 8 }, () => ({ l: Math.random() * 100, d: Math.random() * 5 })));
  const seaRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const curWord = queue[idx] || "";

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio();
    sfx("tap");
    busy.current = false;
    setQueue(buildQueue(words));
    setIdx(0); setPower([]); setSecondTry(false); setLog([]); setPlaced([]); setLight("day");
    setPhase("say");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      setChoices(shuffle(Object.keys(ANIMALS) as Animal[]).slice(0, 3).map((a) => ({ a, hue: pickColor() })));
      window.setTimeout(() => setPhase("place"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); setLog((l) => [...l, { word: curWord, t: "effort" }]); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  // Where does a drop land in the sea? (percent of the sea box)
  function seaSpot(x: number, y: number) {
    const r = seaRef.current?.getBoundingClientRect();
    if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    return { x: ((x - r.left) / r.width) * 100, y: ((y - r.top) / r.height) * 100 };
  }

  function place(c: { a: Animal; hue: number }, spot: { x: number; y: number } | null) {
    if (busy.current) return;
    busy.current = true;
    let s = spot ?? { x: 10 + ((placed.length * 23) % 80), y: 18 + ((placed.length * 17) % 55) };
    if (BOTTOM.includes(c.a)) s = { x: s.x, y: 86 }; // crabs and starfish sit on the sand
    s = { x: Math.max(8, Math.min(92, s.x)), y: Math.max(10, Math.min(88, s.y)) };
    setPlaced((p) => [...p, { a: c.a, hue: c.hue, ...s }]);
    setPower([]);
    setHot(false);
    sfx("pop");
    window.setTimeout(() => {
      busy.current = false;
      if (idx + 1 < queue.length) { setIdx(idx + 1); setPhase("say"); }
      else setPhase("light");
    }, 900);
  }

  function chooseLight(l: Light) {
    setLight(l);
    sfx("win");
    setPhase("done");
  }

  if (!words.length) {
    return (
      <div className="oc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="oc-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Ocean there.</p>
          <button className="oc-big oc-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const sea = (
    <div ref={seaRef} className={`oc-sea ${light} ${hot ? "hot" : ""}`}>
      {bubbles.map((b, i) => <span key={i} className="oc-bub" style={{ left: `${b.l}%`, animationDelay: `${b.d}s` }} />)}
      {[8, 22, 70, 86].map((l, i) => <span key={l} className="oc-weed" style={{ left: `${l}%`, height: 50 + (i % 2) * 30, animationDelay: `${i * 0.6}s` }} />)}
      <div className="oc-sand" />
      {placed.map((p, i) => (
        <div key={i} className={`${BOTTOM.includes(p.a) ? "oc-sit" : "oc-swim"} ${i === placed.length - 1 && phase !== "done" ? "oc-new" : ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${(i % 5) * 0.5}s` }}>
          <AnimalView a={p.a} hue={p.hue} size={70} glow={light === "night" && p.a === "jelly"} />
        </div>
      ))}
      <div style={{ position: "absolute", top: 8, right: 12, fontWeight: 900, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>{placed.length} {placed.length === 1 ? "sea friend" : "sea friends"}</div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="oc-page"><style>{CSS}</style><div className="oc-wrap">
        <button className="oc-chip" onClick={goBack}>Back</button>
        <div className="oc-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <AnimalView a="fish" hue={0} size={50} /><AnimalView a="turtle" size={50} /><AnimalView a="octopus" size={50} /><AnimalView a="jelly" size={50} />
          </div>
          <h1 style={{ margin: "6px 0 4px" }}>Ocean Reef</h1>
          <p style={{ fontWeight: 700, margin: 0 }}>Say each word 2 times, then pick a sea animal and put it anywhere in your reef.</p>
          <p style={{ fontWeight: 700, margin: "4px 0 12px" }}>At the end, pick daytime, sunset, or night. Something glows at night!</p>
          <button className="oc-big oc-go" onClick={start}>Dive in</button>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0277bd" }}>Grown-up: after each try, tap Got it or Try again.</p>
        </div>
      </div></div>
    );
  }

  if (phase === "done") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    const jellies = placed.filter((p) => p.a === "jelly").length;
    const msg = light === "night" ? (jellies ? `Your ${jellies === 1 ? "jellyfish glows" : "jellyfish glow"} in the dark!` : "Shhh, your sea friends are sleeping.") : light === "sunset" ? "What a pretty sunset reef!" : "Your reef is sparkling in the sun!";
    return (
      <div className="oc-page"><style>{CSS}</style><div className="oc-wrap">
        <div className="oc-card oc-pop">
          <h1 style={{ margin: "4px 0" }}>{msg}</h1>
          <p style={{ fontWeight: 800, margin: "0 0 8px" }}>You filled your reef with {placed.length} sea friends.</p>
          {sea}
          <p style={{ fontWeight: 800, fontSize: 18, margin: "10px 0 6px" }}>You practiced {log.length} times. Grown-up marked {got} of {log.length} tries correct.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="oc-big oc-go" onClick={start}>Build a new reef</button>
            <button className="oc-big" style={{ background: "#e1f5fe", color: "#0277bd" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="oc-page"><style>{CSS}</style><div className="oc-wrap">
      <div className="oc-row">
        <button className="oc-chip" onClick={goBack}>Back</button>
        {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#0277bd" }}>/{sound}/</span></div>}
        <div style={{ fontWeight: 900 }}>{Math.min(idx + 1, queue.length)} of {queue.length}</div>
      </div>
      <div className="oc-card">
        {phase === "say" && (
          <>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0277bd", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times!</div>
            <div style={{ marginTop: 6 }}><WordPic key={curWord} word={curWord} size={140} /></div>
            <div className="oc-word">{curWord}</div>
            <div className="oc-power">
              {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`oc-cell ${power[i] || ""}`} />)}
            </div>
            <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
            <button className="oc-chip" style={{ marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button className="oc-big oc-got" onClick={gotIt}>Got it</button>
              <button className="oc-big oc-try" onClick={tryAgain}>Try again</button>
            </div>
          </>
        )}
        {phase === "place" && (
          <>
            <h2 style={{ margin: "0 0 2px" }}>Pick a sea friend!</h2>
            <div style={{ fontWeight: 700, color: "#0277bd" }}>Drag it anywhere in the water, or tap it.</div>
            <div className="oc-opts">
              {choices.map((c) => (
                <Draggable key={c.a} onTap={() => place(c, null)} onDrop={(x, y) => { const s = seaSpot(x, y); if (s) place(c, s); }}>
                  <div className="oc-opt"><AnimalView a={c.a} hue={c.hue} size={66} />{ANIMALS[c.a]}</div>
                </Draggable>
              ))}
            </div>
          </>
        )}
        {phase === "light" && (
          <>
            <h2 style={{ margin: "0 0 2px" }}>Your reef is full! What time is it?</h2>
            <div style={{ fontWeight: 700, color: "#0277bd" }}>Pick one and watch what happens.</div>
            <div className="oc-opts">
              {(["day", "sunset", "night"] as Light[]).map((l) => (
                <button key={l} className="oc-opt" style={{ cursor: "pointer", fontFamily: "inherit" }} onClick={() => chooseLight(l)}>
                  <span style={{ width: 54, height: 54, borderRadius: "50%", background: l === "day" ? "#ffeb3b" : l === "sunset" ? "linear-gradient(#ffb74d,#f06292)" : "#1a237e", border: "3px solid #b3e5fc" }} />
                  {l === "day" ? "Daytime" : l === "sunset" ? "Sunset" : "Night"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 12 }}>{sea}</div>
    </div></div>
  );
}
