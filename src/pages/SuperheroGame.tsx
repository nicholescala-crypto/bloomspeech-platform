import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { speak, sfx, unlockAudio } from "../games/audio";

// Read the child's assigned sound + words from the URL (?sound=&words=).
// When present, the game plays exactly those words instead of its own bank.
function readAssigned() {
  const p = new URLSearchParams(window.location.search);
  const sound = (p.get("sound") || p.get("targetSound") || "").replace(/\//g, "").toLowerCase();
  const words = (p.get("words") || "").split(",").map((w) => w.trim()).filter(Boolean);
  return { sound, words };
}

// ── types ────────────────────────────────────────────────────────
type GamePhase = "intro" | "playing" | "correct" | "wrong" | "victory" | "complete";

interface WordCard {
  word: string;
  used: boolean;
  correct: boolean | null;
}

// ── word banks per sound ─────────────────────────────────────────
const WORD_BANKS: Record<string, string[]> = {
  r:  ["rocket","robot","rainbow","river","rabbit","ring","roof","race","rope","rock","rain","road","rose","ruler","radio"],
  s:  ["sun","star","soup","sock","seal","sand","sail","seed","salt","soap","sit","six","side","safe","save"],
  l:  ["lion","leaf","lamp","lake","log","lime","lip","lid","lock","lace","lane","lava","leap","lift","link"],
  ch: ["chair","cheese","chain","cherry","chicken","chalk","chin","chip","chest","cheer","chop","check","chose","chill","chat"],
  sh: ["ship","shoe","sheep","shell","shop","shark","shade","shake","sharp","shelf","shift","shine","shore","shot","shout"],
  th: ["thumb","three","throne","thread","throw","thick","thin","thorn","thought","thaw","theme","thermal","thrill","throne","thud"],
  k:  ["king","kite","kitten","kick","keep","key","kind","knee","kneel","knock","kit","kid","kin","kelp","kern"],
  g:  ["game","gold","gate","gift","goat","grape","grass","great","green","grin","grip","grow","guard","guide","gulp"],
  f:  ["fish","fox","frog","fire","flag","flip","flow","foam","fold","foot","fork","form","fort","foul","four"],
  v:  ["vase","vine","vest","van","vet","vim","void","volt","vote","vow","vale","vast","veal","veer","veil"],
  st: ["stop","star","step","stem","stick","stone","storm","stove","straw","stream","street","string","strong","stuck","stump"],
  sp: ["spin","spot","space","speak","speed","spell","spend","spill","spine","spit","splash","split","spoke","spoon","sport"],
  bl: ["blue","black","blank","blast","blaze","bleed","blend","bless","blind","block","bloom","blow","bluff","blur","blurt"],
  gr: ["green","grab","grace","grade","grain","grand","grape","grass","grave","gray","graze","greet","grill","grip","grin"],
  tr: ["tree","track","trade","trail","train","trap","trash","treat","trick","trim","trip","truck","true","trunk","trust"],
  pr: ["price","pray","press","print","prize","probe","proud","prove","prom","prop","prank","prawn","prep","prey","prod"],
  fr: ["frog","frame","free","fresh","from","front","frost","frown","fruit","fry","frank","frail","fray","freak","Fred"],
  dr: ["drum","draw","dream","dress","drift","drink","drip","drive","drop","drove","drown","drug","dry","drape","drain"],
  sw: ["swim","swan","swap","swat","sweep","sweet","swift","swing","swipe","swoop","swore","swarm","sway","swear","sweat"],
  sn: ["snake","snap","snack","snag","snail","snare","sneak","sniff","snob","snore","snort","snout","snow","snug","sniff"],
  default: ["sun","star","moon","tree","boat","bird","fish","frog","duck","bear","wolf","hawk","dove","crow","wren"],
};

function getWords(sound: string, count = 10): string[] {
  const key = sound?.toLowerCase().replace(/[^a-z]/g, "") || "default";
  const pool = WORD_BANKS[key] || WORD_BANKS.default;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── villain roster ───────────────────────────────────────────────
const VILLAINS = [
  { name: "Dr. Mumble",   emoji: "🦹",  color: "#6B21A8", weakness: "clear sounds" },
  { name: "The Silencer", emoji: "🤐",  color: "#1E3A8A", weakness: "loud voices"  },
  { name: "Chaos Bot",    emoji: "👾",  color: "#991B1B", weakness: "practice"     },
  { name: "Word Wraith",  emoji: "👻",  color: "#065F46", weakness: "confidence"   },
  { name: "Fuzz Face",    emoji: "🧟",  color: "#92400E", weakness: "accuracy"     },
];

// ── hero roster ──────────────────────────────────────────────────
const HEROES = [
  { name: "Sound Striker", emoji: "🦸",    color: "#2563EB" },
  { name: "Voice Viper",   emoji: "🦸‍♀️", color: "#7C3AED" },
  { name: "Echo Eagle",    emoji: "🦅",    color: "#0891B2" },
];

// ── star rating ──────────────────────────────────────────────────
function Stars({ count, total = 3 }: { count: number; total?: number }) {
  return (
    <span style={{ fontSize: 20, letterSpacing: 2 }}>
      {"⭐".repeat(count)}{"☆".repeat(Math.max(0, total - count))}
    </span>
  );
}

// ── power bar ────────────────────────────────────────────────────
function PowerBar({ power, max }: { power: number; max: number }) {
  const pct = Math.round((power / max) * 100);
  const color = pct > 66 ? "#10B981" : pct > 33 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.15)", borderRadius: 20, height: 14, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: 20,
        transition: "width 0.5s ease",
        boxShadow: `0 0 8px ${color}`,
      }} />
    </div>
  );
}

// Real photo for a word (/Images/<word>.png) with emoji fallback.
function WordImage({ word, size }: { word: string; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [word]);
  if (err) return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}</span>;
  return <img src={`/Images/${word}.png`} alt={word} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain", borderRadius: 16, background: "rgba(255,255,255,0.92)" }} />;
}

// ── main game component ──────────────────────────────────────────
export default function SuperheroGame() {
  const assigned = useMemo(readAssigned, []);
  const [targetSound, setTargetSound] = useState(assigned.sound || "r");
  const [heroIndex, setHeroIndex] = useState(0);
  const [villainIndex, setVillainIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [cards, setCards] = useState<WordCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [power, setPower] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [villainHp, setVillainHp] = useState(5);
  const [shake, setShake] = useState(false);
  const [totalWords] = useState(8);

  // ── recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const hero = HEROES[heroIndex];
  const villain = VILLAINS[villainIndex];

  const startGame = useCallback(() => {
    unlockAudio();
    const words = assigned.words.length ? assigned.words : getWords(targetSound, totalWords);
    setCards(words.map(w => ({ word: w, used: false, correct: null })));
    setCurrentIndex(0);
    setPower(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setVillainHp(words.length);
    setPhase("playing");
  }, [targetSound, totalWords, assigned]);

  const markCorrect = useCallback(() => {
    if (phase !== "playing") return;
    sfx("success");
    const newStreak = streak + 1;
    const newScore = score + (newStreak >= 3 ? 2 : 1);
    const newPower = Math.min(power + (newStreak >= 3 ? 2 : 1), cards.length);
    const newHp = Math.max(villainHp - 1, 0);

    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore(newScore);
    setPower(newPower);
    setVillainHp(newHp);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 700);

    setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, used: true, correct: true } : c));
    setPhase("correct");

    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) {
        setPhase(newHp <= 0 ? "victory" : "complete");
      } else {
        setCurrentIndex(i => i + 1);
        setPhase("playing");
      }
    }, 900);
  }, [phase, streak, score, power, villainHp, currentIndex, cards, bestStreak]);

  const markWrong = useCallback(() => {
    if (phase !== "playing") return;
    sfx("fail");
    setStreak(0);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, used: true, correct: false } : c));
    setPhase("wrong");

    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) {
        setPhase("complete");
      } else {
        setCurrentIndex(i => i + 1);
        setPhase("playing");
      }
    }, 900);
  }, [phase, currentIndex, cards]);

  useEffect(() => { const w = cards[currentIndex]?.word; if (phase === "playing" && w) speak(w); }, [currentIndex, phase, cards]);
  useEffect(() => { if (phase === "victory" || phase === "complete") sfx("win"); }, [phase]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setMicError("We need microphone access to record. Please allow the microphone permission in your browser, then try again.");
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // reset recording when moving to a new word
  useEffect(() => {
    setRecordingUrl(null);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [currentIndex]);

  // revoke the previous object URL whenever it changes or on unmount
  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [recordingUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key === "g" || e.key === "G") markCorrect();
      if (e.key === "n" || e.key === "N") markWrong();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, markCorrect, markWrong]);

  const accuracy = cards.filter(c => c.correct === true).length;
  const currentCard = cards[currentIndex];
  const gameLen = cards.length || totalWords; // all assigned words (or 8 in free play)
  const progressPct = Math.round((currentIndex / gameLen) * 100);

  // ── NO HOMEWORK LOADED ───────────────────────────────────────
  // This game must be opened from a child's assignment card so it plays
  // the assigned words (never random ones).
  if (!assigned.words.length) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: "linear-gradient(160deg,#0b1530,#1e1b4b)", color: "white", fontFamily: "'Nunito',system-ui,sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 60 }}>🦸</div>
        <h1 style={{ fontSize: 24, margin: 0 }}>No homework loaded</h1>
        <p style={{ maxWidth: 340, opacity: 0.8, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will play the exact words their therapist assigned.</p>
        <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
          ← Back to my child’s card
        </button>
      </div>
    );
  }

  // ── INTRO SCREEN ─────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={pageStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px", textAlign: "center" }}>

          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#60A5FA", marginBottom: 8 }}>
            ⚡ Superhero Sound Training
          </div>
          <h1 style={{ fontFamily: "Bangers, cursive", fontSize: "clamp(36px, 8vw, 56px)", color: "white", margin: "0 0 8px", letterSpacing: 2, textShadow: "0 0 20px rgba(96,165,250,0.5)" }}>
            Hero Academy
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginBottom: 28 }}>
            Say each word to power up your hero and defeat the villain!
          </p>

          {/* hero picker */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Choose your hero</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {HEROES.map((h, i) => (
                <button key={i} onClick={() => setHeroIndex(i)} style={{
                  background: heroIndex === i ? h.color : "rgba(255,255,255,0.08)",
                  border: heroIndex === i ? `2px solid ${h.color}` : "2px solid rgba(255,255,255,0.15)",
                  borderRadius: 16, padding: "12px 16px", cursor: "pointer",
                  transition: "all 0.2s", color: "white",
                }}>
                  <div style={{ fontSize: 28 }}>{h.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{h.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* villain picker */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Choose your villain</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {VILLAINS.map((v, i) => (
                <button key={i} onClick={() => setVillainIndex(i)} style={{
                  background: villainIndex === i ? v.color : "rgba(255,255,255,0.08)",
                  border: villainIndex === i ? `2px solid ${v.color}` : "2px solid rgba(255,255,255,0.15)",
                  borderRadius: 12, padding: "10px 14px", cursor: "pointer",
                  transition: "all 0.2s", color: "white",
                }}>
                  <div style={{ fontSize: 22 }}>{v.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3 }}>{v.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* sound selector — hidden when playing a child's assigned words */}
          {assigned.words.length ? (
            <div style={{ marginBottom: 28, padding: "12px 18px", borderRadius: 14, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your assignment</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{assigned.words.length} words · /{targetSound}/</div>
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Target sound</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {["r","s","l","ch","sh","th","k","g","f","v","st","sp","bl","gr","tr","pr","fr","dr","sw","sn"].map(s => (
                  <button key={s} onClick={() => setTargetSound(s)} style={{
                    fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 1,
                    width: 44, height: 44, borderRadius: 12,
                    background: targetSound === s ? "#2563EB" : "rgba(255,255,255,0.08)",
                    border: targetSound === s ? "2px solid #60A5FA" : "2px solid rgba(255,255,255,0.15)",
                    color: "white", cursor: "pointer", transition: "all 0.15s",
                  }}>/{s}/</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={startGame} style={{
            fontFamily: "Bangers, cursive", fontSize: 26, letterSpacing: 2,
            padding: "16px 48px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: "white", boxShadow: "0 8px 32px rgba(37,99,235,0.4)",
            transition: "transform 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            ⚡ START MISSION!
          </button>

          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 16 }}>
            Tip: Press G = Got it! &nbsp;|&nbsp; N = Not yet
          </p>
        </div>
      </div>
    );
  }

  // ── VICTORY / COMPLETE SCREEN ────────────────────────────────
  if (phase === "victory" || phase === "complete") {
    const won = phase === "victory";
    const stars = accuracy >= gameLen ? 3 : accuracy >= Math.ceil(gameLen * 0.7) ? 2 : 1;
    return (
      <div style={pageStyle}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 80, marginBottom: 8, animation: "bounce 0.6s ease infinite alternate" }}>
            {won ? "🏆" : "🦸"}
          </div>
          <h1 style={{ fontFamily: "Bangers, cursive", fontSize: "clamp(32px, 8vw, 52px)", color: won ? "#FCD34D" : "white", letterSpacing: 2, margin: "0 0 8px", textShadow: won ? "0 0 20px rgba(252,211,77,0.6)" : "none" }}>
            {won ? "VILLAIN DEFEATED!" : "MISSION COMPLETE!"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginBottom: 24 }}>
            {won ? `${hero.name} saved the day! ${villain.name} has been stopped!` : `Great practice, hero! Keep training!`}
          </p>

          <div style={{ marginBottom: 20 }}>
            <Stars count={stars} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Correct", value: `${accuracy}/${gameLen}`, icon: "✅" },
              { label: "Score",   value: score,                        icon: "⭐" },
              { label: "Best Streak", value: `${bestStreak}x`,        icon: "🔥" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 8px" }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontFamily: "Bangers, cursive", fontSize: 28, color: "white", letterSpacing: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16, marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Word review</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cards.map((c, i) => (
                <span key={i} style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 14, fontWeight: 800,
                  background: c.correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  color: c.correct ? "#34D399" : "#F87171",
                  border: `1.5px solid ${c.correct ? "#10B981" : "#EF4444"}`,
                }}>
                  {c.correct ? "✅" : "❌"} {c.word}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={startGame} style={{
              fontFamily: "Bangers, cursive", fontSize: 20, letterSpacing: 1,
              padding: "12px 28px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #2563EB, #7C3AED)", color: "white",
            }}>🔄 Play Again</button>
            <button onClick={() => setPhase("intro")} style={{
              fontFamily: "Bangers, cursive", fontSize: 20, letterSpacing: 1,
              padding: "12px 28px", borderRadius: 16, border: "2px solid rgba(255,255,255,0.2)",
              background: "transparent", color: "white", cursor: "pointer",
            }}>⚙️ New Setup</button>
          </div>
        </div>
        <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-12px); } }`}</style>
      </div>
    );
  }

  // ── PLAYING SCREEN ───────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <style>{fonts + animations}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setPhase("intro")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ← Exit
          </button>
          <div style={{ fontFamily: "Bangers, cursive", fontSize: 16, letterSpacing: 1, color: "rgba(255,255,255,0.6)" }}>
            Target: <span style={{ color: "#60A5FA", fontSize: 20 }}>/{targetSound}/</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "6px 14px" }}>
            <span style={{ fontFamily: "Bangers, cursive", fontSize: 20, color: "#FCD34D", letterSpacing: 1 }}>⭐ {score}</span>
          </div>
        </div>

        {/* PROGRESS */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Progress</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{currentIndex}/{gameLen}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, height: 8 }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #2563EB, #7C3AED)", borderRadius: 20, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* BATTLE ARENA */}
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, padding: "20px 16px", marginBottom: 16,
          display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12,
        }}>
          {/* HERO side */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Your Hero</div>
            <div style={{ fontSize: 52, marginBottom: 6, animation: phase === "correct" ? "heroAttack 0.5s ease" : "heroIdle 3s ease infinite" }}>
              {hero.emoji}
            </div>
            <div style={{ fontFamily: "Bangers, cursive", fontSize: 14, color: "white", letterSpacing: 1, marginBottom: 8 }}>{hero.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 700 }}>POWER</div>
            <PowerBar power={power} max={gameLen} />
            {streak >= 3 && (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: "#FCD34D" }}>🔥 {streak}x STREAK!</div>
            )}
          </div>

          {/* VS */}
          <div style={{ fontFamily: "Bangers, cursive", fontSize: 28, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textAlign: "center" }}>
            VS
          </div>

          {/* VILLAIN side */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Villain</div>
            <div style={{
              fontSize: 52, marginBottom: 6,
              animation: phase === "wrong" ? "villainLaugh 0.4s ease" : shake ? "shakeAnim 0.4s ease" : "villainIdle 2s ease infinite",
              filter: villainHp <= 2 ? "grayscale(0.5)" : "none",
            }}>
              {villain.emoji}
            </div>
            <div style={{ fontFamily: "Bangers, cursive", fontSize: 14, color: villain.color, letterSpacing: 1, marginBottom: 8 }}>{villain.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 700 }}>HP</div>
            <PowerBar power={villainHp} max={gameLen} />
            <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 4 }}>
              {Array.from({ length: gameLen }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < villainHp ? villain.color : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
              ))}
            </div>
          </div>
        </div>

        {/* WORD CARD */}
        <div style={{
          background: phase === "correct"
            ? "linear-gradient(135deg, #065F46, #10B981)"
            : phase === "wrong"
            ? "linear-gradient(135deg, #7F1D1D, #EF4444)"
            : "linear-gradient(135deg, #1E3A8A, #2563EB)",
          borderRadius: 28, padding: "32px 24px", textAlign: "center",
          marginBottom: 16, position: "relative", overflow: "hidden",
          boxShadow: phase === "correct" ? "0 8px 32px rgba(16,185,129,0.4)" : phase === "wrong" ? "0 8px 32px rgba(239,68,68,0.3)" : "0 8px 32px rgba(37,99,235,0.3)",
          transition: "all 0.3s ease",
          minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {showBurst && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 60, animation: "burst 0.6s ease forwards" }}>⚡</div>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            {phase === "correct" ? "⚡ POWER UP!" : phase === "wrong" ? "⚠️ Try again next time!" : `Say this word with /${targetSound}/`}
          </div>

          {currentCard && (
            <div style={{ animation: phase === "playing" ? "cardIn 0.3s ease" : undefined }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                <WordImage word={currentCard.word} size={120} />
              </div>
              <div style={{
                fontFamily: "Bangers, cursive",
                fontSize: "clamp(48px, 12vw, 72px)",
                color: "white",
                letterSpacing: 3,
                lineHeight: 1,
                textShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>
                {currentCard.word}
              </div>
              {phase === "playing" && (
                <button onClick={() => speak(currentCard.word)} style={{ marginTop: 10, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 12, padding: "8px 16px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>🔊 Hear it</button>
              )}
              {phase === "playing" && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontStyle: "italic", marginTop: 10 }}>
                  💡 Listen — did you hear the /{targetSound}/ sound clearly?
                </div>
              )}
            </div>
          )}

          {phase === "correct" && <div style={{ fontSize: 28, marginTop: 8, animation: "burst 0.5s ease" }}>🎯✨⚡</div>}
          {phase === "wrong"   && <div style={{ fontSize: 28, marginTop: 8 }}>⚠️</div>}
        </div>

        {/* RECORD & PLAYBACK */}
        {phase === "playing" && currentCard && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12, fontWeight: 600 }}>
              🎙️ Record the word together, then play it back before scoring
            </p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", display: "inline-flex" }}>
                {isRecording && (
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(239,68,68,0.45)",
                    animation: "pulseRing 1.2s ease-out infinite",
                  }} />
                )}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => { if (isRecording) stopRecording(); }}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  style={{
                    position: "relative", width: 84, height: 84, borderRadius: "50%", border: "none",
                    background: "linear-gradient(135deg, #B91C1C, #EF4444)",
                    color: "white", fontSize: 32, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(239,68,68,0.4)",
                    transform: isRecording ? "scale(1.08)" : "scale(1)",
                    transition: "transform 0.15s",
                  }}
                >
                  🎤
                </button>
              </div>

              {recordingUrl && !isRecording && (
                <button
                  onClick={() => { new Audio(recordingUrl).play(); }}
                  style={{
                    width: 84, height: 84, borderRadius: "50%", border: "none",
                    background: "linear-gradient(135deg, #059669, #10B981)",
                    color: "white", fontSize: 32, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(16,185,129,0.4)",
                  }}
                >
                  🔊
                </button>
              )}
            </div>

            {isRecording && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 4, height: 28, marginTop: 14 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 5, background: "#EF4444", borderRadius: 3,
                    animation: "waveBar 0.8s ease-in-out infinite",
                    animationDelay: `${i * 0.12}s`,
                  }} />
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 12, fontWeight: 600 }}>
              {isRecording
                ? "🔴 Recording… let go to stop"
                : recordingUrl
                ? "Tap 🔊 to listen back together"
                : "Press and hold 🎤 to record"}
            </p>

            {micError && (
              <div style={{
                marginTop: 12, padding: "10px 16px", borderRadius: 14, display: "inline-block",
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#FCA5A5", fontSize: 13, fontWeight: 600, maxWidth: 380,
              }}>
                🎙️ {micError}
              </div>
            )}
          </div>
        )}

        {/* WORD DOTS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              width: i === currentIndex ? 24 : 10, height: 10, borderRadius: 5,
              background: c.correct === true ? "#10B981" : c.correct === false ? "#EF4444" : i === currentIndex ? "#60A5FA" : "rgba(255,255,255,0.15)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* BUTTONS */}
        {phase === "playing" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={markCorrect} style={{
              fontFamily: "Bangers, cursive", fontSize: 22, letterSpacing: 1,
              padding: "18px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #059669, #10B981)",
              color: "white", boxShadow: "0 6px 20px rgba(16,185,129,0.4)",
              transition: "transform 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              ✅ Got it! <span style={{ fontSize: 13, opacity: 0.7 }}>(G)</span>
            </button>
            <button onClick={markWrong} style={{
              fontFamily: "Bangers, cursive", fontSize: 22, letterSpacing: 1,
              padding: "18px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #B91C1C, #EF4444)",
              color: "white", boxShadow: "0 6px 20px rgba(239,68,68,0.3)",
              transition: "transform 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              ❌ Not yet <span style={{ fontSize: 13, opacity: 0.7 }}>(N)</span>
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 14, fontWeight: 600 }}>
          SLP controls scoring · Kid says the word · You decide ✅ or ❌
        </p>
      </div>
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
  fontFamily: "'Nunito', sans-serif",
  color: "white",
};

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800;900&display=swap');
`;

const animations = `
  @keyframes heroIdle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes heroAttack { 0% { transform: translateX(0); } 30% { transform: translateX(40px) scale(1.2); } 100% { transform: translateX(0) scale(1); } }
  @keyframes villainIdle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
  @keyframes villainLaugh { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
  @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
  @keyframes burst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
  @keyframes cardIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 70% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1.6); opacity: 0; } }
  @keyframes waveBar { 0%,100% { height: 8px; } 50% { height: 26px; } }
`;
