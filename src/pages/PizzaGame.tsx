import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { speak, sfx, unlockAudio } from "../games/audio";

// ---------------------------------------------------------------------------
// Bloom Pizza: a customer asks for two favorite toppings. The child picks a
// sauce, then for each word SAYS IT TWICE (grown-up taps Got it / Try again)
// and DRAGS a topping of their choice onto the pizza wherever they like. Then
// they slide the pizza into the oven. The customer's reaction depends on what
// the child chose (favorites, or a happy surprise), never a wrong answer.
// ---------------------------------------------------------------------------

type Phase = "intro" | "order" | "say" | "top" | "oven" | "served" | "won";
type Try = "got" | "effort";
type Topping = "pepperoni" | "mushroom" | "olive" | "pepper" | "pineapple" | "tomato";
type Sauce = "red" | "white" | "green";
type Piece = { t: Topping; x: number; y: number; r: number };

const SAYS_PER_WORD = 2;
const WORDS_PER_PIZZA = 3;
const TOPPINGS: Topping[] = ["pepperoni", "mushroom", "olive", "pepper", "pineapple", "tomato"];
const TOPPING_LABEL: Record<Topping, string> = {
  pepperoni: "Pepperoni", mushroom: "Mushroom", olive: "Olive", pepper: "Green pepper", pineapple: "Pineapple", tomato: "Tomato",
};
const SAUCES: { id: Sauce; label: string; color: string }[] = [
  { id: "red", label: "Tomato sauce", color: "#d84315" },
  { id: "white", label: "White sauce", color: "#fff3e0" },
  { id: "green", label: "Pesto", color: "#7cb342" },
];
const CUSTOMERS = [
  { name: "Maya", skin: "#f2c6a0", hair: "#3e2723" },
  { name: "Leo", skin: "#8d5524", hair: "#1b1b1b" },
  { name: "Sam", skin: "#e0ac69", hair: "#c62828" },
  { name: "Ava", skin: "#ffdbac", hair: "#f9a825" },
  { name: "Max", skin: "#c68642", hair: "#4e342e" },
];

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

function buildOrders(words: string[]): string[][] {
  const pizzas = Math.max(3, Math.min(4, Math.ceil(words.length / WORDS_PER_PIZZA)));
  const q: string[] = [];
  while (q.length < pizzas * WORDS_PER_PIZZA) {
    let round = shuffle(words);
    if (q.length && round[0] === q[q.length - 1] && round.length > 1) round = [...round.slice(1), round[0]];
    q.push(...round);
  }
  return Array.from({ length: pizzas }, (_, i) => q.slice(i * WORDS_PER_PIZZA, (i + 1) * WORDS_PER_PIZZA));
}

function randomSpot(): [number, number] {
  const a = Math.random() * Math.PI * 2, d = Math.random() * 45;
  return [100 + Math.cos(a) * d, 100 + Math.sin(a) * d];
}

function scatter(t: Topping, cx: number, cy: number): Piece[] {
  return Array.from({ length: 4 }, () => ({
    t, x: cx + (Math.random() - 0.5) * 44, y: cy + (Math.random() - 0.5) * 44, r: Math.random() * 360,
  }));
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = "/";
}

// ── Drawings ───────────────────────────────────────────────────────
function ToppingShape({ t, x, y, r = 0, s = 1 }: { t: Topping; x: number; y: number; r?: number; s?: number }) {
  const tf = `translate(${x} ${y}) rotate(${r}) scale(${s})`;
  if (t === "pepperoni")
    return <g transform={tf}><circle r="9" fill="#c62828" /><circle cx="-3" cy="-2" r="1.6" fill="#8e0000" /><circle cx="3" cy="3" r="1.4" fill="#8e0000" /></g>;
  if (t === "mushroom")
    return <g transform={tf}><path d="M-9 0 Q-9 -9 0 -9 Q9 -9 9 0 Z" fill="#d7ccc8" stroke="#8d6e63" strokeWidth="1.2" /><rect x="-3" y="0" width="6" height="7" rx="2" fill="#efebe9" stroke="#8d6e63" strokeWidth="1" /></g>;
  if (t === "olive")
    return <g transform={tf}><circle r="6" fill="#212121" /><circle r="2.5" fill="#f4e1b5" /></g>;
  if (t === "pepper")
    return <g transform={tf}><path d="M-9 2 Q0 -12 9 2" stroke="#2e7d32" strokeWidth="4" fill="none" strokeLinecap="round" /></g>;
  if (t === "pineapple")
    return <g transform={tf}><polygon points="-7,6 7,6 0,-8" fill="#ffd54f" stroke="#f9a825" strokeWidth="1.2" /></g>;
  return <g transform={tf}><circle r="8" fill="#e53935" /><circle r="5" fill="#ef9a9a" /><circle cx="-2" cy="-1" r="1" fill="#fff59d" /><circle cx="2" cy="2" r="1" fill="#fff59d" /></g>;
}

function Pizza({ sauce, pieces, size = 240, baked = false }: { sauce?: Sauce; pieces: Piece[]; size?: number; baked?: boolean }) {
  const sc = SAUCES.find((s) => s.id === sauce)?.color;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: "block" }}>
      <circle cx="100" cy="100" r="96" fill={baked ? "#d9a05b" : "#f3d39b"} />
      {sc && <circle cx="100" cy="100" r="82" fill={sc} />}
      {sauce && <circle cx="100" cy="100" r="70" fill={baked ? "#ffd54f" : "#fff59d"} opacity={sauce === "white" ? 0.55 : 0.75} />}
      {pieces.map((p, i) => <ToppingShape key={i} t={p.t} x={p.x} y={p.y} r={p.r} s={1.8} />)}
    </svg>
  );
}

function Customer({ c, mood = "wait", size = 90 }: { c: (typeof CUSTOMERS)[number]; mood?: "wait" | "love" | "wow"; size?: number }) {
  const face = mood === "wait" ? "wait" : "happy";
  return <img src={`/game-art/customer-${c.name.toLowerCase()}-${face}.png`} alt={c.name} width={size} height={size} draggable={false} style={{ display: "block", objectFit: "contain", margin: "0 auto" }} />;
}

function WordPic({ word, size }: { word: string; size: number }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <div style={{ width: size, height: size, borderRadius: 16, background: "#fff4e0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 5, margin: "0 auto" }}>
        {word}
      </div>
    );
  return <img src={`/Images/${word.toLowerCase()}.png`} alt={word} onError={() => setMissing(true)} draggable={false}
    style={{ width: size, height: size, objectFit: "contain", borderRadius: 16, background: "#fff", display: "block", margin: "0 auto" }} />;
}

// Generic drag helper: drag the child element; onDrop gets the pointer spot.
function Draggable({ children, onDrop, onTap, disabled = false }: {
  children: React.ReactNode; onDrop: (x: number, y: number) => boolean; onTap?: () => void; disabled?: boolean;
}) {
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ sx: number; sy: number } | null>(null);
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
    setDrag({ sx: e.clientX, sy: e.clientY });
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setOff({ x: e.clientX - drag.sx, y: e.clientY - drag.sy });
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 10;
    setDrag(null);
    setOff({ x: 0, y: 0 });
    if (!moved) { onTap?.(); return; }
    onDrop(e.clientX, e.clientY);
  }
  return (
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { setDrag(null); setOff({ x: 0, y: 0 }); }}
      style={{ transform: `translate(${off.x}px, ${off.y}px)`, transition: drag ? "none" : "transform .25s", cursor: disabled ? "default" : drag ? "grabbing" : "grab", touchAction: "none", userSelect: "none", position: "relative", zIndex: drag ? 20 : 1 }}>
      {children}
    </div>
  );
}

const CSS = `
.pz-page{min-height:100vh;font-family:'Nunito',system-ui,Arial,sans-serif;background:linear-gradient(#fff3e0,#ffe0b2);color:#4e2c12;padding:14px 14px 30px;box-sizing:border-box}
.pz-wrap{max-width:700px;margin:0 auto}
.pz-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.pz-chip{background:#fff;border:2px solid #f0d6a8;color:#c8521f;font-weight:800;border-radius:12px;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:15px}
.pz-card{background:#fff;border-radius:22px;padding:16px;text-align:center;box-shadow:0 8px 24px rgba(160,90,20,.12);position:relative}
.pz-big{border:none;border-radius:16px;padding:16px 12px;font-size:19px;font-weight:900;cursor:pointer;font-family:inherit;touch-action:manipulation}
.pz-big:active{transform:scale(.97)}
.pz-go{background:linear-gradient(135deg,#e8723c,#c8521f);color:#fff;width:100%}
.pz-got{background:#27c06b;color:#fff;box-shadow:0 4px 0 #1b8a4c}
.pz-try{background:#f5a623;color:#4e2c12;box-shadow:0 4px 0 #b97a12}
.pz-word{font-size:36px;font-weight:900;margin:6px 0 0}
.pz-power{display:flex;justify-content:center;gap:10px;margin:10px 0}
.pz-cell{width:38px;height:38px;border-radius:50%;border:3px solid #e0cdb5;background:#fffaf2}
.pz-cell.got{background:#27c06b;border-color:#1b8a4c}.pz-cell.effort{background:#f5a623;border-color:#b97a12}
.pz-kitchen{display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap}
.pz-bin{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.pz-tbtn{background:#fff8ec;border:3px solid #f0d6a8;border-radius:16px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;font-weight:800;font-size:14px;color:#4e2c12}
.pz-wish{background:#fff;border:3px solid #f0d6a8;border-radius:18px;padding:8px 12px;display:inline-flex;align-items:center;gap:8px;font-weight:800}
.pz-oven{width:200px;height:170px;border-radius:18px;background:#5d4037;border:6px solid #3e2723;display:flex;align-items:center;justify-content:center;position:relative}
.pz-oven-door{width:150px;height:90px;border-radius:12px;background:#212121;border:4px solid #8d6e63;display:flex;align-items:center;justify-content:center;color:#ffcc80;font-weight:900}
.pz-hot .pz-oven-door{background:radial-gradient(#ff9800,#bf360c);animation:pzGlow .5s ease-in-out infinite alternate}
@keyframes pzGlow{from{filter:brightness(1)}to{filter:brightness(1.3)}}
.pz-pop{animation:pzPop .5s ease-out}
@keyframes pzPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
.pz-bounce{animation:pzBounce .6s ease-in-out 3}
@keyframes pzBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@media (max-width:520px){.pz-oven{width:150px;height:130px}.pz-oven-door{width:110px;height:70px}}
`;

export default function PizzaGame() {
  const [{ sound, words }] = useState(readParams);
  const [phase, setPhase] = useState<Phase>("intro");
  const [orders, setOrders] = useState<string[][]>([]);
  const [pizzaIdx, setPizzaIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [power, setPower] = useState<Try[]>([]);
  const [secondTry, setSecondTry] = useState(false);
  const [log, setLog] = useState<{ word: string; t: Try }[]>([]);
  const [sauce, setSauce] = useState<Sauce | undefined>();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [wish, setWish] = useState<Topping[]>([]);
  const [choices, setChoices] = useState<Topping[]>([]);
  const [customerOrder, setCustomerOrder] = useState<number[]>([]);
  const [baking, setBaking] = useState(false);
  const [coins, setCoins] = useState(0);
  const [served, setServed] = useState<{ sauce?: Sauce; pieces: Piece[]; fav: boolean }[]>([]);
  const pizzaRef = useRef<HTMLDivElement>(null);
  const ovenRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const curWord = orders[pizzaIdx]?.[wordIdx] || "";
  const cust = CUSTOMERS[customerOrder[pizzaIdx] ?? 0];

  useEffect(() => {
    if (phase === "say" && curWord && power.length === 0 && !secondTry) speak(curWord);
  }, [phase, curWord]); // eslint-disable-line react-hooks/exhaustive-deps

  function newPizza() {
    setSauce(undefined);
    setPieces([]);
    setWish(shuffle(TOPPINGS).slice(0, 2));
    setPhase("order");
  }

  function start() {
    unlockAudio();
    sfx("tap");
    setOrders(buildOrders(words));
    setCustomerOrder(shuffle(CUSTOMERS.map((_, i) => i)));
    setPizzaIdx(0); setWordIdx(0); setPower([]); setSecondTry(false); setLog([]); setCoins(0); setServed([]);
    newPizza();
  }

  function pickSauce(s: Sauce) {
    sfx("pop");
    setSauce(s);
    window.setTimeout(() => setPhase("say"), 500);
  }

  function addTry(t: Try) {
    const next = [...power, t];
    setLog((l) => [...l, { word: curWord, t }]);
    setPower(next);
    setSecondTry(false);
    if (next.length >= SAYS_PER_WORD) {
      // Offer 3 toppings, always including at least one the customer wished for.
      const others = shuffle(TOPPINGS.filter((x) => !wish.includes(x))).slice(0, 2);
      setChoices(shuffle([wish[Math.floor(Math.random() * wish.length)], ...others]));
      window.setTimeout(() => setPhase("top"), 450);
    } else {
      window.setTimeout(() => speak(curWord), 350);
    }
  }
  function gotIt() { sfx("success"); addTry("got"); }
  function tryAgain() {
    if (!secondTry) { sfx("tap"); setSecondTry(true); setLog((l) => [...l, { word: curWord, t: "effort" }]); speak(curWord); }
    else { sfx("pop"); addTry("effort"); }
  }

  function placeTopping(t: Topping, clientX?: number, clientY?: number) {
    if (busy.current) return; // one topping per word, even on a double tap
    busy.current = true;
    let cx = 100, cy = 100;
    const el = pizzaRef.current?.getBoundingClientRect();
    if (el && clientX !== undefined && clientY !== undefined) {
      cx = ((clientX - el.left) / el.width) * 200;
      cy = ((clientY - el.top) / el.height) * 200;
    } else {
      [cx, cy] = randomSpot();
    }
    // keep the center inside the pizza
    const dx = cx - 100, dy = cy - 100, dist = Math.hypot(dx, dy);
    if (dist > 55) { cx = 100 + (dx / dist) * 55; cy = 100 + (dy / dist) * 55; }
    const add = scatter(t, cx, cy);
    sfx("pop");
    setPieces((p) => [...p, ...add]);
    setPower([]);
    window.setTimeout(() => {
      busy.current = false;
      if (wordIdx + 1 < WORDS_PER_PIZZA) { setWordIdx(wordIdx + 1); setPhase("say"); }
      else setPhase("oven");
    }, 600);
  }

  function dropOnPizza(t: Topping, x: number, y: number) {
    const r = pizzaRef.current?.getBoundingClientRect();
    if (r && x > r.left && x < r.right && y > r.top && y < r.bottom) { placeTopping(t, x, y); return true; }
    return false;
  }

  function bake() {
    if (baking) return;
    setBaking(true);
    sfx("level");
    window.setTimeout(() => {
      setBaking(false);
      const used = new Set(pieces.map((p) => p.t));
      const fav = wish.every((w) => used.has(w));
      setServed((s) => [...s, { sauce, pieces, fav }]);
      setCoins((c) => c + 3);
      sfx("success");
      setPhase("served");
    }, 1800);
  }
  function dropInOven(x: number, y: number) {
    const r = ovenRef.current?.getBoundingClientRect();
    if (r && x > r.left - 20 && x < r.right + 20 && y > r.top - 20 && y < r.bottom + 20) { bake(); return true; }
    return false;
  }

  function nextCustomer() {
    if (pizzaIdx + 1 < orders.length) {
      setPizzaIdx(pizzaIdx + 1);
      setWordIdx(0);
      newPizza();
    } else {
      sfx("win");
      setPhase("won");
    }
  }

  if (!words.length) {
    return (
      <div className="pz-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="pz-wrap" style={{ textAlign: "center" }}>
          <h1>No homework loaded</h1>
          <p>Open your child's homework and tap Bloom Pizza there.</p>
          <button className="pz-big pz-go" style={{ maxWidth: 320 }} onClick={goBack}>Back to homework</button>
        </div>
      </div>
    );
  }

  const wishBubble = (
    <div className="pz-wish">
      <Customer c={cust} size={64} />
      <span>I'd love</span>
      {wish.map((t) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <svg viewBox="-12 -12 24 24" width="30" height="30"><ToppingShape t={t} x={0} y={0} /></svg>
          <span style={{ fontSize: 13 }}>{TOPPING_LABEL[t]}</span>
        </span>
      ))}
    </div>
  );

  const top = (
    <div className="pz-row">
      <button className="pz-chip" onClick={goBack}>Back</button>
      {sound && <div style={{ fontWeight: 900 }}>Sound: <span style={{ color: "#c8521f" }}>/{sound}/</span></div>}
      <div style={{ fontWeight: 900 }}>Pizza {pizzaIdx + 1} of {orders.length} · Coins {coins}</div>
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="pz-page"><style>{CSS}</style><div className="pz-wrap">
        <button className="pz-chip" onClick={goBack}>Back</button>
        <div className="pz-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Pizza sauce="red" pieces={[{ t: "pepperoni", x: 70, y: 80, r: 0 }, { t: "olive", x: 120, y: 70, r: 0 }, { t: "pepper", x: 100, y: 130, r: 30 }, { t: "mushroom", x: 135, y: 115, r: 0 }]} size={160} /></div>
          <h1 style={{ margin: "8px 0 4px" }}>Bloom Pizza</h1>
          <p style={{ fontWeight: 700, margin: 0 }}>Make pizzas for hungry customers!</p>
          <p style={{ fontWeight: 700, margin: "4px 0 12px" }}>Say each word 2 times, then add a topping anywhere you like.</p>
          <button className="pz-big pz-go" onClick={start}>Open the pizza shop</button>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#8a6a4a" }}>Grown-up: after each try, tap Got it or Try again.</p>
        </div>
      </div></div>
    );
  }

  if (phase === "won") {
    const got = log.filter((x) => x.t === "got").length;
    const hard = Array.from(new Set(log.filter((x) => x.t === "effort").map((x) => x.word)));
    return (
      <div className="pz-page"><style>{CSS}</style><div className="pz-wrap">
        <div className="pz-card pz-pop">
          <h1 style={{ margin: "4px 0" }}>Shop closed! Great job, chef!</h1>
          <p style={{ fontWeight: 800 }}>You made {served.length} pizzas and earned {coins} coins.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
            {served.map((s, i) => <Pizza key={i} sauce={s.sauce} pieces={s.pieces} size={110} baked />)}
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>You practiced {log.length} times. Grown-up marked {got} of {log.length} tries correct.</p>
          {hard.length > 0 && <p style={{ background: "#fff4e0", borderRadius: 12, padding: 10, margin: "8px 0" }}><b>Keep practicing:</b> {hard.join(", ")}</p>}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <button className="pz-big pz-go" onClick={start}>Open the shop again</button>
            <button className="pz-big" style={{ background: "#fff3e0", color: "#c8521f" }} onClick={goBack}>Back to homework</button>
          </div>
        </div>
      </div></div>
    );
  }

  if (phase === "served") {
    const last = served[served.length - 1];
    return (
      <div className="pz-page"><style>{CSS}</style><div className="pz-wrap">
        {top}
        <div className="pz-card pz-pop">
          <div className="pz-bounce" style={{ display: "inline-block" }}><Customer c={cust} mood={last?.fav ? "love" : "wow"} size={110} /></div>
          <h2 style={{ margin: "6px 0" }}>{last?.fav ? `"My favorite! Thank you, chef!"` : `"Ooh, a surprise pizza! I love it!"`}</h2>
          <p style={{ fontWeight: 800 }}>{cust.name} gave you 3 coins.</p>
          <div style={{ display: "flex", justifyContent: "center" }}><Pizza sauce={last?.sauce} pieces={last?.pieces || []} size={170} baked /></div>
          <button className="pz-big pz-go" style={{ marginTop: 12 }} onClick={nextCustomer}>
            {pizzaIdx + 1 < orders.length ? "Next customer" : "Close the shop"}
          </button>
        </div>
      </div></div>
    );
  }

  return (
    <div className="pz-page"><style>{CSS}</style><div className="pz-wrap">
      {top}
      <div style={{ textAlign: "center", marginBottom: 10 }}>{wishBubble}</div>

      {phase === "order" && (
        <div className="pz-card">
          <h2 style={{ margin: "0 0 8px" }}>Hi! I'm {cust.name}. Pick a sauce for my pizza!</h2>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}><Customer c={cust} size={150} /><Pizza sauce={sauce} pieces={[]} size={180} /></div>
          <div className="pz-bin">
            {SAUCES.map((s) => (
              <button key={s.id} className="pz-tbtn" style={{ cursor: "pointer", fontFamily: "inherit" }} onClick={() => pickSauce(s.id)}>
                <span style={{ width: 44, height: 44, borderRadius: "50%", background: s.color, border: "3px solid #e0cdb5" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "say" && (
        <div className="pz-card">
          <div className="pz-kitchen">
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#c8521f", textTransform: "uppercase", letterSpacing: 1 }}>Say it 2 times!</div>
              <div style={{ marginTop: 6 }}><WordPic key={curWord} word={curWord} size={160} /></div>
              <div className="pz-word">{curWord}</div>
            </div>
            <Pizza sauce={sauce} pieces={pieces} size={150} />
          </div>
          <div className="pz-power">
            {Array.from({ length: SAYS_PER_WORD }, (_, i) => <span key={i} className={`pz-cell ${power[i] || ""}`} />)}
          </div>
          <div style={{ color: "#c26a00", fontWeight: 800, minHeight: 22 }}>{secondTry ? "One more try!" : ""}</div>
          <button className="pz-chip" style={{ marginBottom: 10 }} onClick={() => speak(curWord)}>Hear it</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="pz-big pz-got" onClick={gotIt}>Got it</button>
            <button className="pz-big pz-try" onClick={tryAgain}>Try again</button>
          </div>
        </div>
      )}

      {phase === "top" && (
        <div className="pz-card">
          <h2 style={{ margin: "0 0 2px" }}>Your turn! Add a topping</h2>
          <div style={{ fontWeight: 700, color: "#8a6a4a" }}>Drag it anywhere on the pizza, or tap it.</div>
          <div ref={pizzaRef} style={{ display: "inline-block", marginTop: 8 }}><Pizza sauce={sauce} pieces={pieces} size={230} /></div>
          <div className="pz-bin">
            {choices.map((t) => (
              <Draggable key={t} onDrop={(x, y) => dropOnPizza(t, x, y)} onTap={() => placeTopping(t)}>
                <div className="pz-tbtn">
                  <svg viewBox="-14 -14 28 28" width="52" height="52"><ToppingShape t={t} x={0} y={0} s={1.1} /></svg>
                  {TOPPING_LABEL[t]}
                </div>
              </Draggable>
            ))}
          </div>
        </div>
      )}

      {phase === "oven" && (
        <div className="pz-card">
          <h2 style={{ margin: "0 0 2px" }}>{baking ? "Baking..." : "Into the oven!"}</h2>
          <div style={{ fontWeight: 700, color: "#8a6a4a" }}>{baking ? "Smells yummy!" : "Drag the pizza into the oven, or tap it."}</div>
          <div className="pz-kitchen" style={{ marginTop: 10 }}>
            {!baking && (
              <Draggable onDrop={dropInOven} onTap={bake}>
                <Pizza sauce={sauce} pieces={pieces} size={170} />
              </Draggable>
            )}
            <div ref={ovenRef} className={`pz-oven ${baking ? "pz-hot" : ""}`}>
              <div className="pz-oven-door">{baking ? "" : "OVEN"}</div>
            </div>
          </div>
        </div>
      )}
    </div></div>
  );
}
