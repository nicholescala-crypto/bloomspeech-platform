import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { sfx, speak, unlockAudio } from "../games/audio";
import {
  VOCAB,
  VOCAB_CATEGORIES,
  wordsForCategories,
  wordsWithClues,
  type VocabWord,
} from "../games/data/vocabBank";

/*
  Bloom Vocabulary — picture vocabulary practice for the family homework link.

  Three formats rotate across a session:
    name   — show the photo, child names it, adult marks it (expressive)
    choose — say the word, child taps the right photo from four (receptive, self-scoring)
    clue   — read the function/feature clues, child names it (word finding)

  Words come from the shared picture bank. Categories may be assigned via the
  querystring (?cats=animal,food) the way the articulation games take ?words=,
  otherwise the child picks. Progress stays in localStorage — no results are
  sent anywhere, matching the other games in this app.
*/

type Format = "name" | "choose" | "clue";
type Round = { word: VocabWord; format: Format; choices: VocabWord[] };

const ROUNDS_PER_SESSION = 12;
const STORE_KEY = "bloom-vocab-progress-v1";

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const cats = (p.get("cats") || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  const words = (p.get("words") || "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  return { cats, words };
}

function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRounds(pool: VocabWord[]): Round[] {
  const cluePool = new Set(wordsWithClues(pool).map((w) => w.key));
  const picked = shuffle(pool).slice(0, ROUNDS_PER_SESSION);
  return picked.map((word, i) => {
    // Rotate the three formats; fall back to naming when a word has no clues,
    // and when the pool is too small to offer four distinct choices.
    let format: Format = (["name", "choose", "clue"] as Format[])[i % 3];
    if (format === "clue" && !cluePool.has(word.key)) format = "name";
    if (format === "choose" && pool.length < 4) format = "name";

    let choices: VocabWord[] = [];
    if (format === "choose") {
      // Prefer distractors from the same category — a harder, more useful contrast
      // than four unrelated pictures.
      const sameCat = pool.filter((w) => w.category === word.category && w.key !== word.key);
      const others = pool.filter((w) => w.category !== word.category && w.key !== word.key);
      const distractors = shuffle(sameCat).slice(0, 3);
      while (distractors.length < 3 && others.length) {
        const next = others[Math.floor(Math.random() * others.length)];
        if (!distractors.some((d) => d.key === next.key)) distractors.push(next);
      }
      choices = shuffle([word, ...distractors]);
    }
    return { word, format, choices };
  });
}

function loadTotal(): number {
  try {
    return Number(JSON.parse(localStorage.getItem(STORE_KEY) || "{}").stars) || 0;
  } catch {
    return 0;
  }
}
function saveTotal(stars: number) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ stars, updated: Date.now() }));
  } catch {
    /* private browsing — practice still works, it just won't be remembered */
  }
}

/* ---------- styles (inline, matching the other game pages) ---------- */
const page: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#e8f0fb,#eefaf4)",
  fontFamily: "ui-rounded, 'SF Pro Rounded', -apple-system, 'Segoe UI', system-ui, sans-serif",
  color: "#20364a",
  padding: "18px 14px 60px",
};
const shell: CSSProperties = { maxWidth: 720, margin: "0 auto" };
const card: CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  boxShadow: "0 10px 28px rgba(30,60,90,.14)",
  padding: 18,
};
const bigBtn: CSSProperties = {
  border: "none",
  borderRadius: 16,
  color: "#fff",
  font: "800 19px/1 inherit",
  padding: "16px 22px",
  cursor: "pointer",
  flex: 1,
};
const photoWrap: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  maxWidth: 340,
  margin: "0 auto 10px",
  borderRadius: 18,
  overflow: "hidden",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const photo: CSSProperties = { width: "100%", height: "100%", objectFit: "contain", display: "block" };

function Photo({ w, alt }: { w: VocabWord; alt?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <span style={{ fontSize: 84 }}>🖼️</span>;
  return <img src={w.image} alt={alt ?? w.word} style={photo} onError={() => setErr(true)} />;
}

export default function VocabularyGame() {
  const params = useMemo(readParams, []);
  const [chosenCats, setChosenCats] = useState<string[]>(params.cats);
  const [started, setStarted] = useState(params.cats.length > 0 || params.words.length > 0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const totalRef = useRef(loadTotal());

  const pool = useMemo(() => {
    if (params.words.length) {
      const want = new Set(params.words);
      const hit = VOCAB.filter((w) => want.has(w.key));
      if (hit.length) return hit;
    }
    return wordsForCategories(chosenCats);
  }, [chosenCats, params.words]);

  useEffect(() => {
    if (!started) return;
    setRounds(buildRounds(pool));
    setIdx(0);
    setStars(0);
    setDone(false);
  }, [started, pool]);

  const round = rounds[idx];

  // Speak the prompt when a new round appears: the word for "choose" (the child
  // must not see it), the clues for "clue". Naming rounds stay silent so the
  // child produces the word first.
  useEffect(() => {
    if (!round) return;
    setPicked(null);
    setRevealed(false);
    if (round.format === "choose") speak(round.word.word);
    if (round.format === "clue") speak(`${round.word.fn}. ${round.word.feat}.`);
  }, [round]);

  function advance(correct: boolean) {
    if (correct) {
      setStars((s) => s + 1);
      totalRef.current += 1;
      saveTotal(totalRef.current);
      sfx("success");
    } else {
      sfx("fail");
    }
    if (idx + 1 >= rounds.length) setDone(true);
    else setIdx((i) => i + 1);
  }

  function choose(w: VocabWord) {
    if (picked) return;
    setPicked(w.key);
    const right = w.key === round.word.key;
    sfx(right ? "success" : "fail");
    if (right) {
      setStars((s) => s + 1);
      totalRef.current += 1;
      saveTotal(totalRef.current);
    }
    window.setTimeout(() => {
      if (idx + 1 >= rounds.length) setDone(true);
      else setIdx((i) => i + 1);
    }, 900);
  }

  /* ---------- category picker ---------- */
  if (!started) {
    return (
      <div style={page}>
        <div style={shell}>
          <h1 style={{ textAlign: "center", fontSize: 28, margin: "18px 0 4px" }}>📖 Picture Words</h1>
          <p style={{ textAlign: "center", color: "#5b7488", fontWeight: 600, margin: "0 0 16px" }}>
            Pick what you want to practise, then play {ROUNDS_PER_SESSION} pictures.
          </p>
          <div style={card}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {VOCAB_CATEGORIES.map((c) => {
                const on = chosenCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      sfx("tap");
                      setChosenCats((prev) =>
                        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                      );
                    }}
                    style={{
                      border: on ? "2px solid #2b6f86" : "2px solid #d8e3ee",
                      background: on ? "linear-gradient(180deg,#4aa6c4,#2b6f86)" : "#f6fafd",
                      color: on ? "#fff" : "#3f6b86",
                      borderRadius: 999,
                      padding: "9px 14px",
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {c.label} <span style={{ opacity: 0.75 }}>{c.count}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ textAlign: "center", color: "#5b7488", fontSize: 13, fontWeight: 600, marginTop: 14 }}>
              {chosenCats.length ? `${pool.length} pictures selected` : `Nothing picked — you'll get all ${VOCAB.length}`}
            </p>
            <button
              style={{ ...bigBtn, background: "linear-gradient(135deg,#2bb98f,#1d9271)", width: "100%", marginTop: 6 }}
              onClick={() => {
                unlockAudio();
                sfx("level");
                setStarted(true);
              }}
            >
              Start ▶
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- finished ---------- */
  if (done) {
    return (
      <div style={page}>
        <div style={shell}>
          <div style={{ ...card, textAlign: "center", marginTop: 40 }}>
            <div style={{ fontSize: 60 }}>🌟</div>
            <h2 style={{ fontSize: 26, margin: "6px 0" }}>
              {stars} out of {rounds.length}
            </h2>
            <p style={{ color: "#5b7488", fontWeight: 600 }}>Stars all together: {totalRef.current}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                style={{ ...bigBtn, background: "linear-gradient(135deg,#2bb98f,#1d9271)" }}
                onClick={() => {
                  sfx("level");
                  setRounds(buildRounds(pool));
                  setIdx(0);
                  setStars(0);
                  setDone(false);
                }}
              >
                Play again
              </button>
              <button
                style={{ ...bigBtn, background: "linear-gradient(135deg,#7c8ea0,#5b6c7d)" }}
                onClick={() => {
                  setStarted(false);
                  setDone(false);
                }}
              >
                Change words
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!round) return null;

  /* ---------- a round ---------- */
  return (
    <div style={page}>
      <div style={shell}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 800, color: "#5b7488", fontSize: 14 }}>
            {idx + 1} / {rounds.length}
          </span>
          <span style={{ fontWeight: 800, color: "#e8a33c", fontSize: 16 }}>⭐ {stars}</span>
        </div>

        <div style={card}>
          {round.format === "choose" ? (
            <>
              <p style={{ textAlign: "center", fontWeight: 800, fontSize: 19, margin: "2px 0 12px" }}>
                Find the <span style={{ color: "#1d9271" }}>{round.word.word}</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {round.choices.map((c) => {
                  const isPicked = picked === c.key;
                  const isRight = c.key === round.word.key;
                  const border = !picked
                    ? "3px solid #e3ecf4"
                    : isRight
                      ? "3px solid #2bb98f"
                      : isPicked
                        ? "3px solid #e06666"
                        : "3px solid #e3ecf4";
                  return (
                    <button
                      key={c.key}
                      onClick={() => choose(c)}
                      style={{
                        border,
                        borderRadius: 16,
                        background: "#fff",
                        padding: 8,
                        cursor: picked ? "default" : "pointer",
                      }}
                    >
                      <div style={{ ...photoWrap, maxWidth: "100%", margin: 0 }}>
                        <Photo w={c} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => speak(round.word.word)}
                style={{
                  ...bigBtn,
                  background: "linear-gradient(135deg,#4aa6c4,#2b6f86)",
                  width: "100%",
                  marginTop: 12,
                }}
              >
                🔊 Say it again
              </button>
            </>
          ) : (
            <>
              {round.format === "clue" ? (
                <>
                  <p style={{ textAlign: "center", fontWeight: 800, fontSize: 18, margin: "2px 0 10px" }}>
                    What am I?
                  </p>
                  <div style={{ background: "#f4f9fd", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#33566e" }}>• {round.word.fn}</p>
                    <p style={{ margin: 0, fontWeight: 700, color: "#33566e" }}>• {round.word.feat}</p>
                  </div>
                  {revealed ? (
                    <div style={photoWrap}>
                      <Photo w={round.word} />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p style={{ textAlign: "center", fontWeight: 800, fontSize: 18, margin: "2px 0 10px" }}>
                    What is it?
                  </p>
                  <div style={photoWrap}>
                    <Photo w={round.word} />
                  </div>
                </>
              )}

              {revealed ? (
                <p style={{ textAlign: "center", fontSize: 26, fontWeight: 900, color: "#1d9271", margin: "8px 0" }}>
                  {round.word.word}
                </p>
              ) : (
                <button
                  onClick={() => {
                    setRevealed(true);
                    speak(round.word.word);
                    sfx("pop");
                  }}
                  style={{
                    ...bigBtn,
                    background: "linear-gradient(135deg,#4aa6c4,#2b6f86)",
                    width: "100%",
                    margin: "6px 0",
                  }}
                >
                  🔊 Show the word
                </button>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  style={{ ...bigBtn, background: "linear-gradient(135deg,#2bb98f,#1d9271)" }}
                  onClick={() => advance(true)}
                >
                  ⭐ Got it!
                </button>
                <button
                  style={{ ...bigBtn, background: "linear-gradient(135deg,#98a7b6,#77879a)" }}
                  onClick={() => advance(false)}
                >
                  Not yet ▶
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#8a99ab", fontSize: 12, marginTop: 16 }}>
          {round.format === "choose"
            ? "Listen, then tap the matching picture."
            : round.format === "clue"
              ? "Listen to the clues and guess the word."
              : "Name the picture, then check it."}
        </p>
      </div>
    </div>
  );
}
