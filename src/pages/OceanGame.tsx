import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { speak, sfx, unlockAudio } from "../games/audio";

// Read the child's assigned sound + words from the URL (?sound=&words=).
function readAssigned() {
  const p = new URLSearchParams(window.location.search);
  const sound = (p.get("sound") || p.get("targetSound") || "").replace(/\//g, "").toLowerCase();
  const words = (p.get("words") || "").split(",").map((w) => w.trim()).filter(Boolean);
  return { sound, words };
}

type GamePhase = "intro" | "playing" | "correct" | "wrong" | "complete";

interface WordCard {
  word: string;
  used: boolean;
  correct: boolean | null;
}

// -- word banks --------------------------------------------------
const WORD_BANKS: Record<string, { word: string; emoji: string }[]> = {
  r:  [
    {word:"ray",emoji:"☀️"},{word:"reef",emoji:"🪸"},{word:"rope",emoji:"🪢"},
    {word:"rock",emoji:"🪨"},{word:"rain",emoji:"🌧️"},{word:"ride",emoji:"🎢"},
    {word:"ring",emoji:"💍"},{word:"river",emoji:"🏞️"},{word:"rose",emoji:"🌹"},
    {word:"run",emoji:"🏃"},{word:"rabbit",emoji:"🐰"},{word:"rainbow",emoji:"🌈"},
    {word:"rocket",emoji:"🚀"},{word:"robot",emoji:"🤖"},{word:"road",emoji:"🛣️"},
  ],
  s:  [
    {word:"sea",emoji:"🌊"},{word:"seal",emoji:"🦭"},{word:"sand",emoji:"🏖️"},
    {word:"ship",emoji:"🚢"},{word:"sail",emoji:"⛵"},{word:"shell",emoji:"🐚"},
    {word:"shark",emoji:"🦈"},{word:"star",emoji:"⭐"},{word:"sun",emoji:"☀️"},
    {word:"soup",emoji:"🍜"},{word:"sock",emoji:"🧦"},{word:"seed",emoji:"🌱"},
    {word:"soap",emoji:"🧼"},{word:"salt",emoji:"🧂"},{word:"snail",emoji:"🐌"},
  ],
  l:  [
    {word:"lobster",emoji:"🦞"},{word:"lake",emoji:"🏞️"},{word:"leaf",emoji:"🍃"},
    {word:"light",emoji:"💡"},{word:"lion",emoji:"🦁"},{word:"log",emoji:"🪵"},
    {word:"lime",emoji:"🍋"},{word:"lamp",emoji:"💡"},{word:"lace",emoji:"🎀"},
    {word:"lock",emoji:"🔒"},{word:"lunch",emoji:"🥪"},{word:"lemon",emoji:"🍋"},
    {word:"lip",emoji:"👄"},{word:"lid",emoji:"🫙"},{word:"lane",emoji:"🛣️"},
  ],
  ch: [
    {word:"crab",emoji:"🦀"},{word:"chair",emoji:"🪑"},{word:"cheese",emoji:"🧀"},
    {word:"chain",emoji:"⛓️"},{word:"cherry",emoji:"🍒"},{word:"chicken",emoji:"🐔"},
    {word:"chalk",emoji:"🖍️"},{word:"chin",emoji:"😶"},{word:"chip",emoji:"🍟"},
    {word:"chest",emoji:"📦"},{word:"cheer",emoji:"🎉"},{word:"chop",emoji:"🪓"},
    {word:"check",emoji:"✅"},{word:"chat",emoji:"💬"},{word:"chill",emoji:"❄️"},
  ],
  sh: [
    {word:"shark",emoji:"🦈"},{word:"ship",emoji:"🚢"},{word:"shell",emoji:"🐚"},
    {word:"shore",emoji:"🏖️"},{word:"shrimp",emoji:"🦐"},{word:"shoe",emoji:"👟"},
    {word:"sheep",emoji:"🐑"},{word:"shop",emoji:"🏪"},{word:"shade",emoji:"🌂"},
    {word:"shake",emoji:"🤝"},{word:"sharp",emoji:"🔪"},{word:"shelf",emoji:"📚"},
    {word:"shine",emoji:"✨"},{word:"shot",emoji:"🎯"},{word:"shout",emoji:"📣"},
  ],
  th: [
    {word:"three",emoji:"3️⃣"},{word:"thumb",emoji:"👍"},{word:"throne",emoji:"👑"},
    {word:"thread",emoji:"🧵"},{word:"throw",emoji:"🎯"},{word:"thick",emoji:"📚"},
    {word:"thin",emoji:"📏"},{word:"thorn",emoji:"🌹"},{word:"thought",emoji:"💭"},
    {word:"thaw",emoji:"🌡️"},{word:"theme",emoji:"🎨"},{word:"thrill",emoji:"😱"},
    {word:"thunder",emoji:"⛈️"},{word:"think",emoji:"🤔"},{word:"thirteen",emoji:"🔢"},
  ],
  k:  [
    {word:"kelp",emoji:"🌿"},{word:"king",emoji:"👑"},{word:"kite",emoji:"🪁"},
    {word:"kitten",emoji:"🐱"},{word:"kick",emoji:"🦵"},{word:"key",emoji:"🔑"},
    {word:"keep",emoji:"📌"},{word:"kind",emoji:"💝"},{word:"kit",emoji:"🧰"},
    {word:"kneel",emoji:"🙇"},{word:"knock",emoji:"🚪"},{word:"kid",emoji:"🧒"},
  ],
  g:  [
    {word:"goldfish",emoji:"🐠"},{word:"game",emoji:"🎮"},{word:"gold",emoji:"🥇"},
    {word:"gate",emoji:"🚪"},{word:"gift",emoji:"🎁"},{word:"goat",emoji:"🐐"},
    {word:"grape",emoji:"🍇"},{word:"grass",emoji:"🌿"},{word:"green",emoji:"💚"},
    {word:"grin",emoji:"😁"},{word:"grip",emoji:"✊"},{word:"grow",emoji:"🌱"},
  ],
  st: [
    {word:"starfish",emoji:"⭐"},{word:"stop",emoji:"🛑"},{word:"star",emoji:"⭐"},
    {word:"step",emoji:"👣"},{word:"stick",emoji:"🪵"},{word:"stone",emoji:"🪨"},
    {word:"storm",emoji:"⛈️"},{word:"stove",emoji:"🍳"},{word:"straw",emoji:"🥤"},
    {word:"stream",emoji:"🏞️"},{word:"street",emoji:"🛣️"},{word:"strong",emoji:"💪"},
  ],
  sp: [
    {word:"sponge",emoji:"🧽"},{word:"spin",emoji:"🌀"},{word:"spot",emoji:"🎯"},
    {word:"space",emoji:"🚀"},{word:"speak",emoji:"🗣️"},{word:"speed",emoji:"⚡"},
    {word:"spoon",emoji:"🥄"},{word:"sport",emoji:"⚽"},{word:"splash",emoji:"💦"},
    {word:"split",emoji:"✂️"},{word:"spoke",emoji:"🚲"},{word:"spell",emoji:"✨"},
  ],
  bl: [
    {word:"blue",emoji:"💙"},{word:"black",emoji:"🖤"},{word:"blast",emoji:"💥"},
    {word:"blaze",emoji:"🔥"},{word:"blend",emoji:"🌀"},{word:"block",emoji:"🧱"},
    {word:"bloom",emoji:"🌸"},{word:"blow",emoji:"💨"},{word:"blur",emoji:"🌫️"},
    {word:"blank",emoji:"📄"},{word:"bleed",emoji:"🩸"},{word:"bless",emoji:"🙏"},
  ],
  gr: [
    {word:"green",emoji:"💚"},{word:"grab",emoji:"🤲"},{word:"grape",emoji:"🍇"},
    {word:"grass",emoji:"🌿"},{word:"grin",emoji:"😁"},{word:"greet",emoji:"👋"},
    {word:"grill",emoji:"🍖"},{word:"grip",emoji:"✊"},{word:"grow",emoji:"🌱"},
    {word:"grand",emoji:"🏰"},{word:"grave",emoji:"⚰️"},{word:"gray",emoji:"🩶"},
  ],
  tr: [
    {word:"treasure",emoji:"💰"},{word:"tree",emoji:"🌳"},{word:"track",emoji:"🛤️"},
    {word:"trail",emoji:"🥾"},{word:"train",emoji:"🚂"},{word:"trap",emoji:"🪤"},
    {word:"treat",emoji:"🍭"},{word:"trick",emoji:"🪄"},{word:"truck",emoji:"🚛"},
    {word:"true",emoji:"✅"},{word:"trunk",emoji:"🧳"},{word:"trust",emoji:"🤝"},
  ],
  fr: [
    {word:"frog",emoji:"🐸"},{word:"frame",emoji:"🖼️"},{word:"free",emoji:"🆓"},
    {word:"fresh",emoji:"🌿"},{word:"front",emoji:"🚪"},{word:"frost",emoji:"❄️"},
    {word:"fruit",emoji:"🍎"},{word:"frown",emoji:"😟"},{word:"frank",emoji:"😐"},
    {word:"frail",emoji:"🌸"},{word:"fray",emoji:"🧵"},{word:"freak",emoji:"😱"},
  ],
  dr: [
    {word:"drum",emoji:"🥁"},{word:"draw",emoji:"✏️"},{word:"dream",emoji:"💭"},
    {word:"dress",emoji:"👗"},{word:"drift",emoji:"🌊"},{word:"drink",emoji:"🥤"},
    {word:"drip",emoji:"💧"},{word:"drive",emoji:"🚗"},{word:"drop",emoji:"💧"},
    {word:"drown",emoji:"🌊"},{word:"drain",emoji:"🚿"},{word:"drape",emoji:"🎭"},
  ],
  sw: [
    {word:"swim",emoji:"🏊"},{word:"swan",emoji:"🦢"},{word:"swap",emoji:"🔄"},
    {word:"sweep",emoji:"🧹"},{word:"sweet",emoji:"🍬"},{word:"swift",emoji:"⚡"},
    {word:"swing",emoji:"🛝"},{word:"swipe",emoji:"👆"},{word:"swoop",emoji:"🦅"},
    {word:"swarm",emoji:"🐝"},{word:"sway",emoji:"🌊"},{word:"swat",emoji:"🪰"},
  ],
  sn: [
    {word:"snake",emoji:"🐍"},{word:"snap",emoji:"👌"},{word:"snack",emoji:"🍿"},
    {word:"snail",emoji:"🐌"},{word:"sneak",emoji:"🕵️"},{word:"snow",emoji:"❄️"},
    {word:"sniff",emoji:"👃"},{word:"snore",emoji:"😴"},{word:"snout",emoji:"🐽"},
    {word:"snug",emoji:"🤗"},{word:"snag",emoji:"🪝"},{word:"snare",emoji:"🕸️"},
  ],
};

// -- sea creatures ------------------------------------------------
const SEA_CREATURES = [
  { name: "Coral the Clownfish", emoji: "🐠", color: "#FF6B35" },
  { name: "Pearl the Dolphin",   emoji: "🐬", color: "#4ECDC4" },
  { name: "Finn the Shark",      emoji: "🦈", color: "#2B6CB0" },
  { name: "Sandy the Turtle",    emoji: "🐢", color: "#38A169" },
  { name: "Stella the Starfish", emoji: "⭐", color: "#D69E2E" },
];

const OCEAN_VILLAINS = [
  { name: "The Trash Monster",  emoji: "🗑️",  color: "#744210" },
  { name: "Captain Pollution",  emoji: "☠️",  color: "#2D3748" },
  { name: "The Net Tangler",    emoji: "🕸️",  color: "#553C9A" },
  { name: "Sludge Kraken",      emoji: "🦑",  color: "#1A202C" },
  { name: "Oil Slick Sally",    emoji: "🛢️",  color: "#2C5282" },
];

function getWords(sound: string, count = 8) {
  const key = sound?.toLowerCase().replace(/[^a-z]/g, "") || "r";
  const pool = WORD_BANKS[key] || WORD_BANKS.r;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

function BubbleBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 14, height: 14, borderRadius: "50%",
          background: i < value ? color : "rgba(255,255,255,0.15)",
          boxShadow: i < value ? `0 0 6px ${color}` : "none",
          transition: "all 0.3s",
          border: `1.5px solid ${i < value ? color : "rgba(255,255,255,0.1)"}`,
        }} />
      ))}
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

export default function OceanGame() {
  const assigned = useMemo(readAssigned, []);
  const [targetSound, setTargetSound] = useState(assigned.sound || "r");
  const [heroIndex, setHeroIndex] = useState(0);
  const [villainIndex, setVillainIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [cards, setCards] = useState<(WordCard & { emoji: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [villainHp, setVillainHp] = useState(8);
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [shake, setShake] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const totalWords = 8;

  // -- recording --
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const hero = SEA_CREATURES[heroIndex];
  const villain = OCEAN_VILLAINS[villainIndex];

  const spawnBubbles = () => {
    const newBubbles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    }));
    setBubbles(newBubbles);
    setTimeout(() => setBubbles([]), 1000);
  };

  const startGame = useCallback(() => {
    unlockAudio();
    const words = assigned.words.length
      ? assigned.words.map(w => ({ word: w, emoji: WORD_EMOJIS[w.toLowerCase()] || DEFAULT_WORD_EMOJI }))
      : getWords(targetSound, totalWords);
    setCards(words.map(w => ({ word: w.word, emoji: w.emoji, used: false, correct: null })));
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setVillainHp(words.length);
    setPhase("playing");
  }, [targetSound, assigned]);

  const markCorrect = useCallback(() => {
    if (phase !== "playing") return;
    sfx("success");
    const newStreak = streak + 1;
    const bonus = newStreak >= 3 ? 2 : 1;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setScore(s => s + bonus);
    setVillainHp(h => Math.max(h - 1, 0));
    setShowSplash(true);
    spawnBubbles();
    setTimeout(() => setShowSplash(false), 800);
    setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, used: true, correct: true } : c));
    setPhase("correct");
    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) setPhase("complete");
      else { setCurrentIndex(i => i + 1); setPhase("playing"); }
    }, 1000);
  }, [phase, streak, bestStreak, currentIndex, cards]);

  const markWrong = useCallback(() => {
    if (phase !== "playing") return;
    sfx("fail");
    setStreak(0);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, used: true, correct: false } : c));
    setPhase("wrong");
    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) setPhase("complete");
      else { setCurrentIndex(i => i + 1); setPhase("playing"); }
    }, 1000);
  }, [phase, currentIndex, cards]);

  useEffect(() => { const w = cards[currentIndex]?.word; if (phase === "playing" && w) speak(w); }, [currentIndex, phase, cards]);
  useEffect(() => { if (phase === "complete") sfx("win"); }, [phase]);

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
  const stars = accuracy >= gameLen ? 3 : accuracy >= Math.ceil(gameLen * 0.7) ? 2 : 1;

  // -- NO HOMEWORK LOADED -------------------------------------------
  // Must be opened from a child's assignment card so it plays the
  // assigned words (never random ones).
  if (!assigned.words.length) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: "linear-gradient(160deg,#0A3055,#2B6CB0)", color: "white", fontFamily: "'Nunito',system-ui,sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 60 }}>🌊</div>
        <h1 style={{ fontSize: 24, margin: 0 }}>No homework loaded</h1>
        <p style={{ maxWidth: 340, opacity: 0.85, lineHeight: 1.5 }}>Open your child’s practice card and tap a game there — it will play the exact words their therapist assigned.</p>
        <button onClick={() => { window.location.href = "/parent"; }} style={{ padding: "14px 28px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#2B6CB0,#4ECDC4)", color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>
          ← Back to my child’s card
        </button>
      </div>
    );
  }

  // -- INTRO --------------------------------------------------------
  if (phase === "intro") {
    return (
      <div style={pageStyle}>
        <style>{fonts + waveCss}</style>
        <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", background: "rgba(0,100,160,0.2)", borderRadius: "50% 50% 0 0 / 20px 20px 0 0", animation: "wave 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "20%", background: "rgba(0,150,200,0.15)", borderRadius: "50% 50% 0 0 / 20px 20px 0 0", animation: "wave 3s ease-in-out infinite reverse" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#63B3ED", marginBottom: 8 }}>
            🌊 Ocean Speech Adventure
          </div>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(32px, 8vw, 52px)", color: "white", margin: "0 0 6px", textShadow: "0 0 30px rgba(99,179,237,0.6)" }}>
            Deep Sea Quest
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 28 }}>
            Help your sea creature clean the ocean by saying words correctly!
          </p>

          {/* hero picker */}
          <div style={{ marginBottom: 22 }}>
            <div style={pickerLabel}>Choose your sea creature</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {SEA_CREATURES.map((h, i) => (
                <button key={i} onClick={() => setHeroIndex(i)} style={{
                  background: heroIndex === i ? `${h.color}33` : "rgba(255,255,255,0.06)",
                  border: heroIndex === i ? `2px solid ${h.color}` : "2px solid rgba(255,255,255,0.12)",
                  borderRadius: 16, padding: "10px 14px", cursor: "pointer", color: "white", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 26 }}>{h.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3 }}>{h.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* villain picker */}
          <div style={{ marginBottom: 22 }}>
            <div style={pickerLabel}>Choose the ocean villain</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {OCEAN_VILLAINS.map((v, i) => (
                <button key={i} onClick={() => setVillainIndex(i)} style={{
                  background: villainIndex === i ? `${v.color}55` : "rgba(255,255,255,0.06)",
                  border: villainIndex === i ? `2px solid ${v.color}` : "2px solid rgba(255,255,255,0.12)",
                  borderRadius: 14, padding: "10px 12px", cursor: "pointer", color: "white", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 22 }}>{v.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3 }}>{v.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* sound picker — hidden when playing a child's assigned words */}
          {assigned.words.length ? (
            <div style={{ marginBottom: 28, padding: "12px 18px", borderRadius: 14, background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.35)" }}>
              <div style={pickerLabel}>Your assignment</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{assigned.words.length} words · /{targetSound}/</div>
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              <div style={pickerLabel}>Target sound</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {Object.keys(WORD_BANKS).map(s => (
                  <button key={s} onClick={() => setTargetSound(s)} style={{
                    fontFamily: "'Fredoka One', cursive", fontSize: 16,
                    padding: "6px 12px", borderRadius: 10,
                    background: targetSound === s ? "#2B6CB0" : "rgba(255,255,255,0.08)",
                    border: targetSound === s ? "2px solid #63B3ED" : "2px solid rgba(255,255,255,0.12)",
                    color: "white", cursor: "pointer", transition: "all 0.15s",
                  }}>/{s}/</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={startGame} style={{
            fontFamily: "'Fredoka One', cursive", fontSize: 24,
            padding: "14px 44px", borderRadius: 20, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #2B6CB0, #4ECDC4)",
            color: "white", boxShadow: "0 8px 32px rgba(43,108,176,0.5)",
            transition: "transform 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            🌊 DIVE IN!
          </button>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 12 }}>G = Got it! &nbsp;|&nbsp; N = Not yet</p>
        </div>
      </div>
    );
  }

  // -- COMPLETE ------------------------------------------------------
  if (phase === "complete") {
    return (
      <div style={pageStyle}>
        <style>{fonts + waveCss}</style>
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 8, animation: "float 2s ease-in-out infinite" }}>🏆</div>
          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: "clamp(28px, 7vw, 46px)", color: "#63B3ED", margin: "0 0 8px" }}>
            Ocean Saved!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
            {hero.name} cleaned the ocean! Amazing work!
          </p>
          <div style={{ fontSize: 28, marginBottom: 20 }}>
            {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { icon: "✅", val: `${accuracy}/${gameLen}`, label: "Correct" },
              { icon: "⭐", val: score, label: "Score" },
              { icon: "🔥", val: `${bestStreak}x`, label: "Best Streak" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 8px" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: "white" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 14, marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Word review</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {cards.map((c, i) => (
                <span key={i} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                  background: c.correct ? "rgba(56,161,105,0.2)" : "rgba(229,62,62,0.2)",
                  color: c.correct ? "#68D391" : "#FC8181",
                  border: `1.5px solid ${c.correct ? "#38A169" : "#E53E3E"}`,
                }}>
                  {c.emoji} {c.correct ? "✅" : "❌"} {c.word}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={startGame} style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, padding: "11px 24px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #2B6CB0, #4ECDC4)", color: "white" }}>🔄 Play Again</button>
            <button onClick={() => setPhase("intro")} style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, padding: "11px 24px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.2)", background: "transparent", color: "white", cursor: "pointer" }}>⚙️ New Setup</button>
          </div>
        </div>
      </div>
    );
  }

  // -- PLAYING -------------------------------------------------------
  const progressPct = Math.round((currentIndex / gameLen) * 100);

  return (
    <div style={pageStyle}>
      <style>{fonts + waveCss}</style>

      {/* floating bubbles */}
      {bubbles.map(b => (
        <div key={b.id} style={{
          position: "fixed", left: `${b.x}%`, top: `${b.y}%`,
          fontSize: 20, animation: "floatUp 1s ease forwards", pointerEvents: "none", zIndex: 99,
        }}>🫧</div>
      ))}

      {/* wave bg */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "25%", background: "rgba(0,100,160,0.2)", borderRadius: "50% 50% 0 0 / 30px 30px 0 0", animation: "wave 5s ease-in-out infinite" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "18px 16px" }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setPhase("intro")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← Exit</button>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, color: "rgba(255,255,255,0.6)" }}>
            Sound: <span style={{ color: "#63B3ED", fontSize: 20 }}>/{targetSound}/</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "6px 14px" }}>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: "#F6E05E" }}>⭐ {score}</span>
          </div>
        </div>

        {/* PROGRESS */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Progress</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{currentIndex}/{gameLen}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 20, height: 8 }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #2B6CB0, #4ECDC4)", borderRadius: 20, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* BATTLE ARENA */}
        <div style={{
          background: "rgba(0,50,100,0.4)", border: "1px solid rgba(99,179,237,0.2)",
          borderRadius: 24, padding: "18px 14px", marginBottom: 14,
          display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
          backdropFilter: "blur(10px)",
        }}>
          {/* hero */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Your Hero</div>
            <div style={{ fontSize: 46, marginBottom: 5, animation: phase === "correct" ? "heroSplash 0.5s ease" : "float 3s ease-in-out infinite" }}>
              {hero.emoji}
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 12, color: "white", marginBottom: 8 }}>{hero.name}</div>
            {streak >= 3 && <div style={{ fontSize: 11, fontWeight: 800, color: "#F6E05E", marginBottom: 6 }}>🔥 {streak}x streak!</div>}
            <BubbleBar value={gameLen - villainHp} max={gameLen} color={hero.color} />
          </div>

          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>VS</div>

          {/* villain */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Villain</div>
            <div style={{
              fontSize: 46, marginBottom: 5,
              animation: shake ? "shakeAnim 0.4s ease" : "villainBob 2s ease-in-out infinite",
              filter: villainHp <= 2 ? "grayscale(0.6) opacity(0.7)" : "none",
            }}>
              {villain.emoji}
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 12, color: villain.color, marginBottom: 8 }}>{villain.name}</div>
            <BubbleBar value={villainHp} max={gameLen} color={villain.color} />
          </div>
        </div>

        {/* WORD CARD */}
        <div style={{
          background: phase === "correct"
            ? "linear-gradient(135deg, #1C4532, #38A169)"
            : phase === "wrong"
            ? "linear-gradient(135deg, #63171B, #E53E3E)"
            : "linear-gradient(135deg, #1A365D, #2B6CB0)",
          borderRadius: 28, padding: "24px 20px", textAlign: "center",
          marginBottom: 14, position: "relative", overflow: "hidden",
          boxShadow: phase === "correct" ? "0 8px 32px rgba(56,161,105,0.4)" : phase === "wrong" ? "0 8px 32px rgba(229,62,62,0.3)" : "0 8px 32px rgba(43,108,176,0.4)",
          transition: "all 0.3s ease", minHeight: 180,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {showSplash && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 56, animation: "burst 0.7s ease forwards" }}>💦</div>
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            {phase === "correct" ? "🌊 Splash! Amazing!" : phase === "wrong" ? "🚨 Keep swimming!" : `Say this word with /${targetSound}/`}
          </div>

          {currentCard && (
            <>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", animation: phase === "playing" ? "cardIn 0.3s ease" : undefined }}>
                <WordImage word={currentCard.word} size={120} />
              </div>
              <div style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "clamp(40px, 10vw, 62px)",
                color: "white", letterSpacing: 2, lineHeight: 1,
                textShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}>
                {currentCard.word}
              </div>
            </>
          )}

          {phase === "correct" && <div style={{ fontSize: 24, marginTop: 8 }}>🎉 🌊 🐚</div>}
          {phase === "wrong" && <div style={{ fontSize: 24, marginTop: 8 }}>🫧</div>}

          {phase === "playing" && currentCard && (
            <button onClick={() => speak(currentCard.word)} style={{ marginTop: 10, background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 12, padding: "8px 16px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>🔊 Hear it</button>
          )}
          {phase === "playing" && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontStyle: "italic", marginTop: 10 }}>
              💡 Did you hear the /{targetSound}/ sound clearly?
            </div>
          )}
        </div>

        {/* RECORD & PLAYBACK */}
        {phase === "playing" && currentCard && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12, fontWeight: 600 }}>
              🎤 Record the word together, then play it back before scoring
            </p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative", display: "inline-flex" }}>
                {isRecording && (
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(99,179,237,0.45)",
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
                    background: "linear-gradient(135deg, #1E3A8A, #3B82F6)",
                    color: "white", fontSize: 32, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(59,130,246,0.45)",
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
                    background: "linear-gradient(135deg, #0E7490, #22D3EE)",
                    color: "white", fontSize: 32, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(34,211,238,0.4)",
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
                    width: 5, background: "#63B3ED", borderRadius: 3,
                    animation: "waveBar 0.8s ease-in-out infinite",
                    animationDelay: `${i * 0.12}s`,
                  }} />
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 12, fontWeight: 600 }}>
              {isRecording
                ? "🔵 Recording… let go to stop"
                : recordingUrl
                ? "Tap 🔊 to listen back together"
                : "Press and hold 🎤 to record"}
            </p>

            {micError && (
              <div style={{
                marginTop: 12, padding: "10px 16px", borderRadius: 14, display: "inline-block",
                background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)",
                color: "#93C5FD", fontSize: 13, fontWeight: 600, maxWidth: 380,
              }}>
                🎤 {micError}
              </div>
            )}
          </div>
        )}

        {/* WORD DOTS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              width: i === currentIndex ? 22 : 10, height: 10, borderRadius: 5,
              background: c.correct === true ? "#38A169" : c.correct === false ? "#E53E3E" : i === currentIndex ? "#63B3ED" : "rgba(255,255,255,0.15)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* BUTTONS */}
        {phase === "playing" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={markCorrect} style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 20,
              padding: "16px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #276749, #38A169)",
              color: "white", boxShadow: "0 6px 20px rgba(56,161,105,0.4)",
              transition: "transform 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              🌊 Got it! <span style={{ fontSize: 12, opacity: 0.7 }}>(G)</span>
            </button>
            <button onClick={markWrong} style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 20,
              padding: "16px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #9B2C2C, #E53E3E)",
              color: "white", boxShadow: "0 6px 20px rgba(229,62,62,0.3)",
              transition: "transform 0.1s",
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              🫧 Not yet <span style={{ fontSize: 12, opacity: 0.7 }}>(N)</span>
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 12, fontWeight: 600 }}>
          SLP controls scoring · Kid says the word · You decide ✅ or 🫧
        </p>
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes heroSplash { 0% { transform: scale(1); } 40% { transform: scale(1.3) rotate(-10deg); } 100% { transform: scale(1) rotate(0); } }
        @keyframes villainBob { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes shakeAnim { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes burst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-60px); opacity: 0; } }
        @keyframes cardIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 70% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes waveBar { 0%,100% { height: 8px; } 50% { height: 26px; } }
      `}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0A1628 0%, #0D2744 40%, #0A3055 100%)",
  fontFamily: "'Nunito', sans-serif",
  color: "white",
  position: "relative",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const waveCss = `
  @keyframes wave { 0%,100% { transform: scaleX(1) translateY(0); } 50% { transform: scaleX(1.05) translateY(-8px); } }
`;

const pickerLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
};
