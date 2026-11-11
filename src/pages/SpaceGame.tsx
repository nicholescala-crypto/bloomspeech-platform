import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Star Mission: rescue the lost aliens.
// Fly planet to planet. For each word: SAY IT TWICE (grown-up taps Got it /
// Try again; every try counts), then DRAG the ship over one of three craters
// to search it. Each search finds something different: an alien to rescue, a
// space gem, or star fuel. Every planet has at least one alien. The crew the
// child brings home is different every time.
// ---------------------------------------------------------------------------

type Phase = "intro" | "say" | "search" | "fly" | "won";
type Try = "got" | "effort";
type Find = { kind: "alien"; alien: AlienLook } | { kind: "gem" } | { kind: "fuel" };
type AlienLook = { color: string; eyes: 1 | 2 | 3; antenna: boolean; name: string };

const SAYS_PER_WORD = 2;
const WORDS_PER_PLANET = 3;

const PLANETS = [
  { name: "Planet Zoom", color: "#e57348", ground: "#c4552c" },
  { name: "Planet Glow", color: "#7e57c2", ground: "#5e35b1" },
  { name: "Planet Frost", color: "#4fc3f7", ground: "#0288d1" },
  { name: "Planet Moss", color: "#66bb6a", ground: "#388e3c" },
  { name: "Planet Sunny", color: "#ffca28", ground: "#f9a825" },
];
const SHIP_COLORS = [
  { name: "Red", color: "#e53935" },
  { name: "Blue", color: "#1e88e5" },
  { name: "Green", color: "#43a047" },
];
const ALIEN_NAMES = ["Zib", "Blorp", "Kiki", "Mox", "Tuli", "Pim", "Zorb", "Nibs", "Lulu", "Grib", "Fizz", "Oot"];
const ALIEN_COLORS = ["#8bc34a", "#ff80ab", "#4dd0e1", "#ffb74d", "#b39ddb", "#f06292", "#aed581"];

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

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

function buildTrip(words: string[]): string[][] {
  const planets = Math.max(3, Math.min(PLANETS.length, Math.ceil(words.length / WORDS_PER_PLANET)));
  const q: string[] = [];
  while (q.length < planets * WORDS_PER_PLANET) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return Array.from({ length: planets }, (_, i) => q.slice(i * WORDS_PER_PLANET, (i + 1) * WORDS_PER_PLANET));
}

function newAlien(used: string[]): AlienLook {
  const names = ALIEN_NAMES.filter((n) => !used.includes(n));
  return {
    color: pick(ALIEN_COLORS),
    eyes: pick([1, 2, 3] as const),
    antenna: Math.random() < 0.6,
    name: pick(names.length ? names : ALIEN_NAMES),
  };
}

function goBack() {
  if (document.referrer && new URL(document.referrer).origin === window.location.origin) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
function Alien({ a, size = 80, wave = false }: { a: AlienLook; size?: number; wave?: boolean }) {
  const eyeXs = a.eyes === 1 ? [40] : a.eyes === 2 ? [30, 50] : [24, 40, 56];
  return (
    <svg viewBox="0 0 80 90" width={size} height={size * 1.12} className={wave ? "sm-wave" : ""}>
      {a.antenna && (
        <>
          <line x1="30" y1="20" x2="22" y2="4" stroke={a.color} strokeWidth="3" />
          <line x1="50" y1="20" x2="58" y2="4" stroke={a.color} strokeWidth="3" />
          <circle cx="22" cy="4" r="4" fill="#ffeb3b" /><circle cx="58" cy="4" r="4" fill="#ffeb3b" />
        </>
      )}
      <path d="M10 86 Q6 22 40 18 Q74 22 70 86 Z" fill={a.color} />
      {eyeXs.map((x) => (
        <g key={x}><circle cx={x} cy="44" r="8" fill="#fff" /><circle cx={x} cy="45" r="4" fill="#222" /></g>
      ))}
      <path d="M28 64 Q40 74 52 64" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="8" cy="62" rx="5" ry="10" fill={a.color} transform="rotate(-25 8 62)" />
      <ellipse cx="72" cy="62" rx="5" ry="10" fill={a.color} transform="rotate(25 72 62)" />
    </svg>
  );
}

const Gem = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 60 60" width={size} height={size}>
    <polygon points="30,4 52,22 30,56 8,22" fill="#4dd0e1" stroke="#00838f" strokeWidth="2" />
    <polygon points="8,22 52,22 30,4" fill="#b2ebf2" />
  </svg>
);
const Fuel = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 60 60" width={size} height={size}>
    <rect x="16" y="10" width="28" height="44" rx="8" fill="#ffca28" stroke="#f57f17" strokeWidth="2" />
    <rect x="22" y="4" width="16" height="8" rx="3" fill="#f57f17" />
    <polygon points="32,18 22,36 30,36 26,48 38,30 30,30" fill="#fff" />
  </svg>
);

function Ship({ color, size = 90, beam = false }: { color: string; size?: number; beam?: boolean }) {
  return (
    <svg viewBox="0 0 120 110" width={size} height={size * 0.92} style={{ overflow: "visible" }}>
      {beam && <polygon points="40,52 80,52 104,140 16,140" fill="rgba(255,255,140,.55)" className="sm-beam" />}
      <ellipse cx="60" cy="26" rx="24" ry="20" fill="#b3e5fc" stroke="#90a4ae" strokeWidth="3" />
      <ellipse cx="60" cy="44" rx="56" ry="16" fill={color} />
      {[20, 40, 60, 80, 100].map((x) => <circle key={x} cx={x} cy="46" r="4" fill="#fff59d" />)}
    </svg>
  );
}

const Crater = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 120 50" width="110" height="46">
    <ellipse cx="60" cy="28" rx="56" ry="20" fill="rgba(0,0,0,.25)" />
    <ellipse cx="60" cy="24" rx="46" ry="14" fill={open ? "rgba(255,255,200,.6)" : "rgba(0,0,0,.35)"} />
  </svg>
);

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", color: "#13314f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto" }}>
        {word}
      </div>
    );
  return <img src={`/Images/${word.toLowerCase()}.png`} alt={word} onError={() => setMissing(true)} draggable={false}
    style={{ width: size, height: size, objectFit: "contain", borderRadius: 16, background: "#fff", display: "block", margin: "0 auto" }} />;
}

// ── Search: drag the ship over a crater (or tap a crater) ──────────
function Search({ planet, shipColor, find, onDone }: {
  planet: (typeof PLANETS)[number]; shipColor: string; find: Find; onDone: () => void;
}) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const craterRefs = useRef<(HTMLDivElement | null)[]>([]);

  function craterAt(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const r = craterRefs.current[i]?.getBoundingClientRect();
      if (r && x > r.left - 20 && x < r.right + 20 && y > r.top - 140 && y < r.bottom + 20) return i;
    }
    return null;
  }
  function choose(i: number) {
    if (chosen !== null) return;
    setChosen(i);
    sfx("pop");
    window.setTimeout(() => sfx(find.kind === "alien" ? "level" : "success"), 600);
    window.setTimeout(onDone, 2400);
  }
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (chosen !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ sx: e.clientX - off.x, sy: e.clientY - off.y });
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setOff({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
    setHover(craterAt(e.clientX, e.clientY));
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag(null);
    const i = craterAt(e.clientX, e.clientY);
    setHover(null);
    if (i !== null) {
      const r = craterRefs.current[i]!.getBoundingClientRect();
      const shipEl = e.currentTarget.getBoundingClientRect();
      setOff((o) => ({ x: o.x + (r.left + r.width / 2) - (shipEl.left + shipEl.width / 2), y: o.y + (r.top - 150) - shipEl.top }));
      choose(i);
    } else setOff({ x: 0, y: 0 });
  }

  return (
    <div className="sm-surface" style={{ background: `linear-gradient(#0d1033 0%, #1a237e 55%, ${planet.color} 55%, ${planet.ground} 100%)` }}>
      <div className="sm-ship" onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerCancel={() => { setDrag(null); setOff({ x: 0, y: 0 }); }}
        style={{ transform: `translate(calc(-50% + ${off.x}px), ${off.y}px)`, transition: drag ? "none" : "transform .35s", cursor: drag ? "grabbing" : "grab" }}>
        <Ship color={shipColor} beam={chosen !== null || hover !== null} />
      </div>
      <div className="sm-craters">
        {[0, 1, 2].map((i) => (
          <div key={i} ref={(el) => { craterRefs.current[i] = el; }} className="sm-crater" onClick={() => choose(i)}
            style={{ outline: hover === i ? "3px dashed #fff59d" : "none" }}>
            {chosen === i && (
              <div className="sm-found">
                {find.kind === "alien" ? <Alien a={find.alien} size={70} wave /> : find.kind === "gem" ? <Gem /> : <Fuel />}
              </div>
            )}
            <Crater open={chosen === i} />
          </div>
        ))}
      </div>
      {chosen !== null && (
        <div className="sm-found-msg">
          {find.kind === "alien" ? `You found ${find.alien.name}! Welcome aboard!` : find.kind === "gem" ? "A sparkly space gem!" : "Star fuel! Zoom zoom!"}
        </div>
      )}
    </div>
  );
}

const CSS = `
.sm-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:radial-gradient(circle at 30% 10%,#283593,#0d1033 70%);color:#fff;padding:14px 14px 30px;box-sizing:border-box}
.sm-wrap{max-width:680px;margin:0 auto}
.sm-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.sm-chip{background:rgba(255,255,255,.14);border:none;color:#fff;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.sm-card{background:rgba(255,255,255,.97);color:#13314f;border-radius:22px;padding:16px;text-align:center;position:relative;overflow:hidden}
.sm-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.sm-big:active{transform:scale(.97)}
.sm-go{background:linear-gradient(135deg,#7c4dff,#536dfe);color:#fff;width:100%}
.sm-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.sm-try{background:#f5a623;color:#13314f;box-shadow:0 4px 0 #b97a12}
.sm-word{font-size:38px;font-weight:900;margin:6px 0 0}
.sm-power{display:flex;justify-content:center;gap:10px;margin:10px 0}
.sm-cell{width:38px;height:38px;border-radius:50%;border:3px solid #cfd8dc;background:#f4f7f9}
.sm-cell.got{background:#27c06b;border-color:#1b8a4c}.sm-cell.effort{background:#f5a623;border-color:#b97a12}
.sm-crew{display:flex;gap:4px;align-items:flex-end;min-height:56px;flex-wrap:wrap}
.sm-trip{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.08);border-radius:18px;padding:8px 12px;margin-bottom:10px}
.sm-dot{width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,.35)}
.sm-surface{position:relative;height:360px;border-radius:18px;overflow:hidden;margin:8px -4px 0;touch-action:none}
.sm-ship{position:absolute;left:50%;top:20px;z-index:5;touch-action:none;user-select:none}
.sm-craters{position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:space-around}
.sm-crater{position:relative;cursor:pointer;border-radius:14px;padding:4px}
.sm-found{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);animation:smRise .8s ease-out}
.sm-found-msg{position:absolute;left:0;right:0;top:auto;bottom:84px;font-size:24px;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.6);animation:smPop .5s ease-out}
.sm-beam{animation:smBeam .6s ease-in-out infinite alternate}
.sm-wave{animation:smWave .8s ease-in-out infinite alternate;transform-origin:50% 100%}
.sm-fly{animation:smFly 1.8s ease-in-out forwards}
@keyframes smRise{from{transform:translate(-50%,30px) scale(.4);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}
@keyframes smPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
@keyframes smBeam{from{opacity:.4}to{opacity:.9}}
@keyframes smWave{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@keyframes smFly{0%{transform:translateX(-160px) rotate(-8deg)}100%{transform:translateX(160px) rotate(8deg)}}
.sm-ships{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.sm-shipbtn{border-radius:16px;padding:10px 4px;cursor:pointer;font-family:inherit;font-weight:800;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px}
@media (max-width:520px){.sm-surface{height:320px}.sm-crater svg{width:84px}}
@media (max-height:560px){.sm-surface{height:280px}.sm-word{font-size:30px}}
`;

export default function SpaceGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shipColor, setShipColor] = useState(SHIP_COLORS[1].color);
  const [trip, setTrip] = useState<string[][]>([]);
  const [planet, setPlanet] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [crew, setCrew] = useState<AlienLook[]>([]);
  const [gems, setGems] = useState(0);
  const [fuel, setFuel] = useState(0);
  const [find, setFind] = useState<Find>({ kind: "gem" });
  const [alienHere, setAlienHere] = useState(false);
  const [twinkles] = useState(() => Array.from({ length: 30 }, () => ({ l: Math.random() * 100, t: Math.random() * 100 })));

  const curWord = trip[planet]?.[wordIdx] || "";
  const P = PLANETS[planet % PLANETS.length];

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "fly") return;
    const t = window.setTimeout(() => { setPhase("say"); }, 1900);
    return () => window.clearTimeout(t);
  }, [phase]);

  function start() {
    unlockAudio();
    sfx("tap");
    setTrip(buildTrip(words));
    setPlanet(0); setWordIdx(0); setPower([]); setSecondTry(false); setLog([]); setCrew([]); setGems(0); setFuel(0); setAlienHere(false);
    setPhase("fly");
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      // Decide what this search will find. The last search on a planet always finds an alien if none yet.
      const last = wordIdx === WORDS_PER_PLANET - 1;
      const r = Math.random();
      const f: Find = (last && !alienHere) || r < 0.45
        ? { kind: "alien", alien: newAlien(crew.map((c) => c.name)) }
        : r < 0.75 ? { kind: "gem" } : { kind: "fuel" };
      setFind(f);
      window.setTimeout(() => setPhase("search"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  function searchDone() {
    if (find.kind === "alien") { setCrew((c) => [...c, find.alien]); setAlienHere(true); }
    else if (find.kind === "gem") setGems((g) => g + 1);
    else setFuel((f) => f + 1);
    setPower([]);
    if (wordIdx + 1 < WORDS_PER_PLANET) {
      setWordIdx(wordIdx + 1);
      setPhase("say");
    } else if (planet + 1 < trip.length) {
      setPlanet(planet + 1);
      setWordIdx(0);
      setAlienHere(false);
      setPhase("fly");
    } else {
      sfx("win");
      setPhase("won");
    }
  }

  if (!words.length) {
    return (
      <div className="sm-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="sm-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Star Mission there.</p>
          <button className="sm-big sm-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const stars = twinkles.map((s, i) => (
    <span key={i} style={{ position: "fixed", left: `${s.l}%`, top: `${s.t}%`, width: 2, height: 2, borderRadius: 2, background: "#fff", opacity: 0.6, pointerEvents: "none" }} />
  ));

  if (phase === "intro") {
    return (
      <div className="sm-page"><style>{CSS}</style>{stars}<div className="sm-wrap">
        <button className="sm-chip" onClick={goBack}>Back</button>
        <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
          <Alien a={{ color: "#8bc34a", eyes: 3, antenna: true, name: "Zib" }} size={70} wave />
          <h1 style={{ fontSize: 32, margin: "4px 0" }}>Star Mission</h1>
          <p style={{ color: "#cfd8ff", fontWeight: 700, margin: 0 }}>Some little aliens are lost! Fly to each planet and find them.</p>
          <p style={{ color: "#cfd8ff", fontWeight: 700, margin: "4px 0 0" }}>Say each word 2 times, then pick a crater to search.</p>
        </div>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Pick your spaceship</div>
        <div className="sm-ships">
          {SHIP_COLORS.map((s) => (
            <button key={s.name} className="sm-shipbtn" onClick={() => { setShipColor(s.color); sfx("tap"); }}
              style={{ border: shipColor === s.color ? "3px solid #fff59d" : "2px solid rgba(255,255,255,.2)", background: shipColor === s.color ? "rgba(255,245,157,.15)" : "rgba(255,255,255,.06)" }}>
              <Ship color={s.color} size={80} />{s.name}
            </button>
          ))}
        </div>
        <button className="sm-big sm-go" style={{ marginTop: 16 }} onClick={start}>Blast off</button>
        <p style={{ textAlign: "center", color: "#cfd8ff", fontSize: 14, fontWeight: 700 }}>Grown-up: after each try, tap Got it or Try again.</p>
      </div></div>
    );
  }

  if (phase === "won") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    return (
      <div className="sm-page"><style>{CSS}</style>{stars}<div className="sm-wrap">
        <div className="sm-card">
          <h1 style={{ margin: "4px 0" }}>Mission complete!</h1>
          <p style={{ fontWeight: 800, margin: 0 }}>You brought home {crew.length} alien{crew.length === 1 ? "" : "s"}!</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, background: "#e8f5e9", borderRadius: 18, padding: 12, margin: "10px 0" }}>
            {crew.map((a, i) => (
              <div key={i} style={{ textAlign: "center", fontWeight: 800, fontSize: 14 }}><Alien a={a} size={62} wave /><div>{a.name}</div></div>
            ))}
          </div>
          <p style={{ fontWeight: 800, margin: "4px 0" }}>Plus {gems} space gem{gems === 1 ? "" : "s"} and {fuel} star fuel.</p>
          <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. {got} sounded right.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="sm-big sm-go" onClick={() => setPhase("intro")}>New mission</button>
            <button className="sm-big" style={{ background: "#e8eaf6", color: "#283593" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  const tripBar = (
    <div className="sm-trip">
      {trip.map((_, i) => (
        <div key={i} className="sm-dot" style={{ background: PLANETS[i % PLANETS.length].color, opacity: i <= planet ? 1 : 0.35, boxShadow: i === planet ? "0 0 0 3px #fff" : "none" }} />
      ))}
      <div className="sm-crew">
        {crew.slice(-6).map((a, i) => <Alien key={i} a={a} size={30} />)}
      </div>
    </div>
  );

  if (phase === "fly") {
    return (
      <div className="sm-page"><style>{CSS}</style>{stars}<div className="sm-wrap">
        {tripBar}
        <div style={{ textAlign: "center", paddingTop: 30 }}>
          <div className="sm-fly" style={{ display: "inline-block" }}><Ship color={shipColor} size={130} /></div>
          <h1 style={{ marginTop: 30 }}>Flying to {P.name}...</h1>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: P.color, margin: "10px auto", boxShadow: `inset -14px -10px 0 ${P.ground}` }} />
        </div>
      </div></div>
    );
  }

  return (
    <div className="sm-page"><style>{CSS}</style>{stars}<div className="sm-wrap">
      <div className="sm-row">
        <button className="sm-chip" onClick={goBack}>Back</button>
        {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#fff59d" }}>/{sound}/</span></div>}
        <div style={{ fontWeight: 900 }}>{P.name}</div>
      </div>
      {tripBar}
      {phase === "say" ? (
        <div className="sm-card">
          <div style={{ fontSize: 14, fontWeight: 900, color: "#5c6bc0", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times to search!</div>
          <div style={{ marginTop: 8 }}><WordPic key={curWord} word={curWord} size={170} /></div>
          <div className="sm-word">{curWord}</div>
          <div className="sm-power">
            {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`sm-cell ${power[i] || ""}`} />)}
          </div>
          <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
          <button className="sm-chip" style={{ background: "#e8eaf6", color: "#283593", marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="sm-big sm-got" onClick={gotIt}>Got it</button>
            <button className="sm-big sm-try" onClick={tryAgain}>Try again</button>
          </div>
        </div>
      ) : (
        <div className="sm-card" style={{ paddingBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Your turn! Search a crater</div>
          <div style={{ fontWeight: 700, color: "#456" }}>Drag your ship over a crater, or tap one.</div>
          <Search key={`${planet}-${wordIdx}`} planet={P} shipColor={shipColor} find={find} onDone={searchDone} />
        </div>
      )}
    </div></div>
  );
}
