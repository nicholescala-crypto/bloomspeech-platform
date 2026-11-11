import { useEffect, useState } from "react";
import { sfx, speak, unlockAudio } from "../games/audio";

// Say-It Practice: the child SAYS each word, the grown-up listens and taps
// "Got it" or "Try again". Every try grows a flower in the garden; a word that
// needs a second go stays on screen for one more try, then moves on (no fail).

type Result = "got" | "sprout"; // got = sounded right, sprout = practiced, needs more

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

// Enough turns for real practice: about 3 per word, at least 10, at most 20.
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
  if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
    window.history.back();
  } else {
    window.location.href = "/";
  }
}

function WordPicture({ word }: { word: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return <div className="sp-pic sp-pic-word">{word}</div>;
  }
  return (
    <img
      className="sp-pic"
      src={`/Images/${word.toLowerCase()}.png`}
      alt={word}
      onError={() => setMissing(true)}
    />
  );
}

function Flower({ kind, fresh }: { kind: Result | "empty"; fresh: boolean }) {
  if (kind === "empty") {
    return (
      <svg viewBox="0 0 40 52" className="sp-flower">
        <ellipse cx="20" cy="48" rx="12" ry="4" fill="#c9b79c" />
      </svg>
    );
  }
  if (kind === "sprout") {
    return (
      <svg viewBox="0 0 40 52" className={`sp-flower ${fresh ? "sp-pop" : ""}`}>
        <ellipse cx="20" cy="48" rx="12" ry="4" fill="#c9b79c" />
        <path d="M20 47 V30" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="14" cy="32" rx="6" ry="3.5" fill="#66bb6a" transform="rotate(-30 14 32)" />
        <ellipse cx="26" cy="30" rx="6" ry="3.5" fill="#66bb6a" transform="rotate(30 26 30)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 52" className={`sp-flower ${fresh ? "sp-pop" : ""}`}>
      <ellipse cx="20" cy="48" rx="12" ry="4" fill="#c9b79c" />
      <path d="M20 47 V20" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="13" cy="36" rx="6" ry="3.5" fill="#66bb6a" transform="rotate(-30 13 36)" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx="20"
          cy="10"
          rx="5"
          ry="8"
          fill="#ff7eb3"
          transform={`rotate(${a} 20 18)`}
        />
      ))}
      <circle cx="20" cy="18" r="5" fill="#ffd54f" />
    </svg>
  );
}

function Confetti() {
  const [bits] = useState(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: ["#ff7eb3", "#ffd54f", "#4fc3f7", "#81c784", "#ba68c8"][i % 5],
      }))
  );
  return (
    <div className="sp-confetti" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, background: b.color }} />
      ))}
    </div>
  );
}

const CSS = `
.sp-page{min-height:100vh;background:linear-gradient(#e8f7ff,#f3fbf4 70%);font-family:'Nunito',Arial,sans-serif;color:#163b3f;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center}
.sp-card{background:#fff;border-radius:24px;box-shadow:0 8px 24px rgba(0,0,0,.08);padding:20px;width:100%;max-width:560px;box-sizing:border-box;text-align:center}
.sp-top{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:560px;margin-bottom:12px;gap:8px}
.sp-pill{background:#fff;border-radius:999px;padding:6px 14px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:15px}
.sp-link{background:none;border:none;color:#2a7d78;font-weight:800;font-size:15px;cursor:pointer;padding:6px}
.sp-say{font-size:28px;font-weight:900;margin:0 0 8px}
.sp-pic{width:min(240px,55vw);height:min(240px,55vw);object-fit:contain;border-radius:20px;background:#fff;display:block;margin:0 auto}
.sp-pic-word{display:flex;align-items:center;justify-content:center;background:#fff4e0;font-size:34px;font-weight:900;padding:12px;box-sizing:border-box}
.sp-word{font-size:34px;font-weight:900;margin:10px 0 2px;letter-spacing:.02em}
.sp-sentence{font-size:28px;font-weight:900;line-height:1.3;margin:20px 0;padding:18px;background:#fff4e0;border-radius:18px}
.sp-hear{background:#e6f4f3;border:none;border-radius:999px;padding:10px 20px;font-size:17px;font-weight:800;color:#1f6e69;cursor:pointer;margin:6px 0 4px}
.sp-again-note{color:#c26a00;font-weight:800;font-size:18px;min-height:24px;margin:6px 0}
.sp-grown{font-size:14px;color:#567;font-weight:700;margin:14px 0 6px}
.sp-btns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px}
.sp-btn{border:none;border-radius:18px;padding:18px 10px;font-size:20px;font-weight:900;cursor:pointer;color:#fff;font-family:inherit;touch-action:manipulation}
.sp-btn:active{transform:scale(.97)}
.sp-got{background:#2fb86e;box-shadow:0 4px 0 #22894f}
.sp-try{background:#f59e0b;box-shadow:0 4px 0 #b97405}
.sp-big{background:#2fb8ae;box-shadow:0 4px 0 #23877f;width:100%}
.sp-plain{background:#e6f4f3;color:#1f6e69;width:100%}
.sp-garden{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin:14px auto 0;width:100%;max-width:560px;box-sizing:border-box;background:linear-gradient(#e9f6e6,#d4ecc9);border-radius:18px;padding:10px 6px 4px;border-bottom:6px solid #a1887f}
.sp-flower{width:44px;height:57px}
.sp-pop{animation:spPop .45s ease-out}
@keyframes spPop{0%{transform:scale(.2) translateY(10px)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
.sp-confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.sp-confetti span{position:absolute;top:-12px;width:10px;height:14px;border-radius:3px;animation:spFall 2.6s ease-in forwards}
@keyframes spFall{to{transform:translateY(110vh) rotate(540deg)}}
.sp-sum{font-size:20px;font-weight:800;margin:6px 0}
.sp-more{background:#fff8ec;border-radius:14px;padding:10px 14px;margin:12px 0;font-size:16px}
.sp-intro p{font-size:18px;color:#456;margin:8px 0}
@media (max-height:520px){.sp-pic{width:150px;height:150px}.sp-say{font-size:22px}.sp-word{font-size:26px}.sp-btn{padding:12px 8px;font-size:18px}}
`;

export default function PlayPage() {
  const [{ words, targetSound, sentence }] = useState(readParams);
  const [queue, setQueue] = useState<string[]>(() => buildQueue(words));
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [secondTry, setSecondTry] = useState(false);
  const [results, setResults] = useState<{ word: string; r: Result }[]>([]);

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

  // Model the word once when it first appears (not again on the second try).
  useEffect(() => {
    if (phase === "play" && current && !secondTry) speak(current);
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio();
    sfx("tap");
    setPhase("play");
  }

  function record(r: Result) {
    const next = [...results, { word: current, r }];
    setResults(next);
    setSecondTry(false);
    if (index + 1 >= queue.length) {
      setPhase("done");
      sfx("win");
    } else {
      setIndex(index + 1);
    }
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

  function playAgain() {
    setQueue(buildQueue(words));
    setIndex(0);
    setResults([]);
    setSecondTry(false);
    setPhase("play");
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

  const garden = (
    <div className="sp-garden" aria-label={`${results.length} of ${queue.length} done`}>
      {queue.map((_, i) => (
        <Flower
          key={i}
          kind={results[i]?.r ?? "empty"}
          fresh={i === results.length - 1}
        />
      ))}
    </div>
  );

  if (phase === "intro") {
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <div className="sp-card sp-intro">
          <h1 className="sp-say">Let's grow a garden!</h1>
          {targetSound && <p>Today's sound: <strong>{targetSound}</strong></p>}
          <p>Your child says each {sentence ? "sentence" : "word"} out loud.</p>
          <p>You listen and tap <strong>Got it</strong> or <strong>Try again</strong>.</p>
          <p>Every try grows something in the garden.</p>
          <button className="sp-btn sp-big" style={{ marginTop: 12 }} onClick={start}>Start</button>
        </div>
        {garden}
      </div>
    );
  }

  if (phase === "done") {
    const got = results.filter((x) => x.r === "got").length;
    const needMore = Array.from(new Set(results.filter((x) => x.r === "sprout").map((x) => x.word)));
    return (
      <div className="sp-page">
        <style>{CSS}</style>
        <Confetti />
        <div className="sp-card">
          <h1 className="sp-say">Your garden is full!</h1>
          <p className="sp-sum">You practiced {results.length} times.</p>
          <p className="sp-sum">{got} sounded right.</p>
          {needMore.length > 0 && (
            <div className="sp-more">
              <strong>Keep practicing:</strong> {needMore.join(", ")}
            </div>
          )}
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <button className="sp-btn sp-big" onClick={playAgain}>Play again</button>
            <button className="sp-btn sp-plain" onClick={goBack}>Back to homework</button>
          </div>
        </div>
        {garden}
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
        <div className="sp-btns">
          <button className="sp-btn sp-got" onClick={gotIt}>Got it</button>
          <button className="sp-btn sp-try" onClick={tryAgain}>Try again</button>
        </div>
        <p className="sp-grown">Grown-up: tap after your child says it.</p>
      </div>
      {garden}
    </div>
  );
}
