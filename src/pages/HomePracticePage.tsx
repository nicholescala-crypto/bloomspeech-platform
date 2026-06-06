import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

async function getParentEmail(): Promise<string> {
  const params = new URLSearchParams(window.location.search);
  const urlEmail = params.get("email");
  if (urlEmail && urlEmail.includes("@")) return urlEmail.trim().toLowerCase();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.email) return session.user.email.trim().toLowerCase();
  } catch {}

  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email?.includes("@"))
        return String(parsed.email).trim().toLowerCase();
    }
  } catch {}

  const stored = localStorage.getItem("currentParentEmail");
  if (stored?.includes("@")) return stored.trim().toLowerCase();
  return "";
}

type SoundTab = {
  label: string;
  accent: string;
  description: string;
  placement: string[];
  wordsByPosition: { position: string; words: string[] }[];
  parentTips: string[];
};

const SOUNDS: SoundTab[] = [
  {
    label: "/r/",
    accent: "#dbeafe",
    description:
      "The /r/ sound is one of the most complex sounds in English and one of the last to fully develop (typically mastered by age 6–7).",
    placement: [
      "Curl the tongue tip back toward the roof of the mouth (retroflex), OR bunch the middle of the tongue up toward the palate",
      "The tongue should NOT make contact with the roof of the mouth",
      "Round and slightly protrude the lips",
      "Voice is ON — feel vibration in the throat",
    ],
    wordsByPosition: [
      {
        position: "Initial (beginning)",
        words: ["rain", "rabbit", "red", "run", "rope", "ring"],
      },
      {
        position: "Medial (middle)",
        words: ["orange", "carrot", "berry", "parent", "purple"],
      },
      {
        position: "Final (end)",
        words: ["car", "star", "floor", "bear", "door", "four"],
      },
      {
        position: "Blends",
        words: ["green", "pray", "broom", "train", "frog", "bridge"],
      },
    ],
    parentTips: [
      "Start with 'arr' (pirate sound) before moving to full words",
      "/r/ is typically mastered between ages 5–7 — consistency matters more than perfection",
      "Avoid correcting every instance; model the correct sound naturally during conversation",
    ],
  },
  {
    label: "/s/",
    accent: "#dcfce7",
    description:
      "The /s/ sound is a common early target. Children often substitute 'th' (interdental lisp) or let the tongue slip between the teeth.",
    placement: [
      "Tongue tip points toward (but does NOT touch) the ridge just behind the upper front teeth",
      "Teeth are slightly together and lips are relaxed",
      "Air flows down the narrow center groove of the tongue",
      "Voice is OFF — no throat vibration (contrast with /z/ which is voiced)",
    ],
    wordsByPosition: [
      {
        position: "Initial",
        words: ["sun", "soap", "sock", "sail", "soup", "sing"],
      },
      {
        position: "Medial",
        words: ["missing", "pencil", "dinosaur", "listen", "blossom"],
      },
      {
        position: "Final",
        words: ["bus", "glass", "house", "mess", "dress", "chase"],
      },
      {
        position: "Blends",
        words: ["snow", "star", "smile", "spoon", "slide", "swim"],
      },
    ],
    parentTips: [
      "If the tongue pokes between teeth, try: 'keep your snake inside the cave'",
      "Mirror practice helps — let your child see and compare their mouth to yours",
      "Blends like /sp/, /st/, /sm/ are great next targets after single /s/ is solid",
    ],
  },
  {
    label: "/l/",
    accent: "#fef9c3",
    description:
      "The /l/ sound requires the tongue tip to lift and touch the roof of the mouth just behind the teeth. Children may substitute /w/ or /y/.",
    placement: [
      "Lift the tongue tip to touch the alveolar ridge (the bumpy ridge just behind the upper front teeth)",
      "Sides of the tongue stay down so air flows around them",
      "Lips are relaxed and open",
      "Voice is ON — feel vibration in the throat",
    ],
    wordsByPosition: [
      {
        position: "Initial",
        words: ["leaf", "lamp", "lake", "leg", "lion", "love"],
      },
      {
        position: "Medial",
        words: ["jelly", "color", "melon", "balloon", "pillow"],
      },
      {
        position: "Final",
        words: ["ball", "bell", "pool", "feel", "tall", "hill"],
      },
      {
        position: "Blends",
        words: ["blue", "play", "clock", "flag", "glass", "flower"],
      },
    ],
    parentTips: [
      "Teach 'tongue tip up' — use a mirror so the child can see their tongue lift",
      "Practice syllables 'la la la' before moving to full words",
      "Final /l/ (as in 'ball') is often easier than initial /l/ — start there if needed",
    ],
  },
  {
    label: "/ch/",
    accent: "#fce7f3",
    description:
      "The /ch/ sound is an affricate — a quick stop released into a fricative. Children may substitute /sh/ or /t/.",
    placement: [
      "Raise the tongue tip and blade to touch the ridge just behind the upper teeth (like making a /t/)",
      "Release quickly into a /sh/ sound — it's like a fast 'tsh'",
      "Lips round slightly and push forward",
      "Voice is OFF — voiceless sound",
    ],
    wordsByPosition: [
      {
        position: "Initial",
        words: ["cheese", "chin", "chair", "chicken", "cherries", "chain"],
      },
      {
        position: "Medial",
        words: ["teacher", "kitchen", "catching", "watching", "enchant"],
      },
      {
        position: "Final",
        words: ["beach", "peach", "match", "watch", "catch", "lunch"],
      },
    ],
    parentTips: [
      "Think of it as /t/ + /sh/ said very quickly together",
      "Practice 'choo choo train' — it's a natural /ch/ carrier phrase",
      "Minimal pair practice works well: 'ship/chip', 'share/chair', 'wash/watch'",
    ],
  },
  {
    label: "/sh/",
    accent: "#ede9fe",
    description:
      "The /sh/ sound is a fricative where the tongue is raised and air flows broadly. Children may substitute /s/ or /ch/.",
    placement: [
      "Raise the front and middle of the tongue toward the roof of the mouth (without touching)",
      "Round and slightly protrude the lips",
      "Teeth are close together",
      "Air flows broadly over the tongue surface — voice is OFF",
    ],
    wordsByPosition: [
      {
        position: "Initial",
        words: ["shoe", "ship", "shake", "show", "shirt", "sheep"],
      },
      {
        position: "Medial",
        words: ["cushion", "fishing", "wishing", "fashion", "mission"],
      },
      {
        position: "Final",
        words: ["fish", "dish", "rush", "wash", "crash", "push"],
      },
    ],
    parentTips: [
      "'Shh, be quiet' is a natural and motivating carrier for /sh/",
      "Try 'snow blowing' — lips rounded and pushed forward before producing the sound",
      "Contrast minimal pairs: 'sock/shock', 'sea/she', 'save/shave'",
    ],
  },
];

const CUEING_STEPS = [
  {
    level: 1,
    label: "Full Model",
    description:
      "Say the entire word clearly and ask your child to copy you.",
    example: '"Say it with me: sunshine."',
    tip: "Use a natural, clear voice — not exaggerated or slow. Your child should be able to see your face.",
  },
  {
    level: 2,
    label: "Slow & Stretch",
    description:
      "Slightly lengthen the target sound in the word so it stands out.",
    example: '"S-s-sunshine."',
    tip: "Don't distort the sound — just emphasize it enough to highlight it for the ear.",
  },
  {
    level: 3,
    label: "Gesture Cue",
    description:
      "Use a hand signal or touch your own mouth to show where the tongue goes.",
    example:
      "Tap your upper gum ridge with your fingertip to cue tongue placement for /l/ or /s/.",
    tip: "Pairing a gesture with a verbal cue gives double input — visual and auditory together.",
  },
  {
    level: 4,
    label: "Verbal Reminder",
    description:
      "Give a brief spoken hint about placement or movement before your child tries.",
    example: '"Remember — tongue tip UP!"',
    tip: "Keep it short. A long explanation during production breaks their focus.",
  },
  {
    level: 5,
    label: "Wait & Praise",
    description:
      "Give 5 seconds of wait time, then celebrate whatever attempt they make.",
    example: '"I\'ll wait... Great try! I heard your /s/."',
    tip: "Correct errors with a model, never with 'wrong' or 'no'. Effort praise keeps motivation high.",
  },
];

const GENERALIZATION_ACTIVITIES = [
  {
    title: "Sound Scavenger Hunt",
    description:
      "Walk through the house and find 10 objects that contain the target sound. Take photos or draw them.",
    tag: "All sounds",
  },
  {
    title: "I Spy",
    description:
      'Play "I Spy with my little eye, something that starts with /s/." Take turns — your child spots objects, then you do.',
    tag: "Best for initial position",
  },
  {
    title: "Story Time Spotlight",
    description:
      "While reading together, listen for the target sound in the book. Tap the table or ring a bell each time you hear it.",
    tag: "All sounds",
  },
  {
    title: "Mealtime Practice",
    description:
      'At each meal, find 3 foods or dinner words with the target sound. "Rice has /r/!" No pressure — keep it playful.',
    tag: "All sounds",
  },
  {
    title: "Car Game",
    description:
      "On car trips, name one word with the target sound for every street sign or landmark you pass.",
    tag: "All sounds",
  },
  {
    title: "Evening Check-In",
    description:
      "Each evening, ask your child to describe one thing from their day using a word with the target sound. Model gently if needed.",
    tag: "Best after words are solid",
  },
];

type PracticeLog = {
  id: string;
  date: string;
  sounds: string[];
  minutes: number;
  rating: 1 | 2 | 3;
  notes: string;
};

const STORAGE_KEY = "bloomspeech_practice_log";

function loadLog(): PracticeLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PracticeLog[];
  } catch {}
  return [];
}

function saveLog(log: PracticeLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

const RATING_LABEL: Record<1 | 2 | 3, string> = {
  1: "Tough day",
  2: "Pretty good",
  3: "Great session!",
};
const RATING_EMOJI: Record<1 | 2 | 3, string> = { 1: "😅", 2: "😊", 3: "🌟" };

export default function HomePracticePage() {
  const [parentEmail, setParentEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSound, setActiveSound] = useState(0);
  const [log, setLog] = useState<PracticeLog[]>(loadLog);

  const [formSounds, setFormSounds] = useState<string[]>([]);
  const [formMinutes, setFormMinutes] = useState(10);
  const [formRating, setFormRating] = useState<1 | 2 | 3>(2);
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    getParentEmail().then((email) => {
      setParentEmail(email);
      setAuthLoading(false);
      if (!email) {
        window.location.replace("/login");
      }
    });
  }, []);

  function toggleFormSound(label: string) {
    setFormSounds((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  }

  function submitSession() {
    if (formSounds.length === 0) return;
    const entry: PracticeLog = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      sounds: formSounds,
      minutes: formMinutes,
      rating: formRating,
      notes: formNotes.trim(),
    };
    const updated = [entry, ...log].slice(0, 30);
    setLog(updated);
    saveLog(updated);
    setFormSounds([]);
    setFormMinutes(10);
    setFormRating(2);
    setFormNotes("");
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 3000);
  }

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f6fbfb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#4f6378", fontSize: 18 }}>Loading...</p>
      </div>
    );
  }

  const sound = SOUNDS[activeSound];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6fbfb",
        padding: "48px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#163b3f",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <section
          style={{
            background: "white",
            padding: 32,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => {
              window.location.href = "/parent";
            }}
            style={{
              marginBottom: 16,
              border: "none",
              background: "none",
              color: "#708196",
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
              fontWeight: 600,
            }}
          >
            ← Back to Parent Portal
          </button>
          <h1
            style={{ marginTop: 0, marginBottom: 10, fontSize: 32, color: "#163b3f" }}
          >
            Home Practice Guide
          </h1>
          <p style={{ margin: 0, fontSize: 17, color: "#4f6378" }}>
            Tips, techniques, and tools to support your child's speech practice
            at home.
          </p>
          {parentEmail && (
            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                color: "#708196",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Signed in as: {parentEmail}
            </p>
          )}
        </section>

        {/* Sound Tabs */}
        <section
          style={{
            background: "white",
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "24px 28px 0" }}>
            <h2 style={{ margin: "0 0 16px", color: "#163b3f" }}>
              Sound Guides
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SOUNDS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setActiveSound(i)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 40,
                    border:
                      activeSound === i
                        ? "2px solid #163b3f"
                        : "2px solid #dbe7e6",
                    background: activeSound === i ? "#163b3f" : "white",
                    color: activeSound === i ? "white" : "#163b3f",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 28, background: sound.accent, marginTop: 20 }}>
            <p
              style={{
                marginTop: 0,
                marginBottom: 18,
                color: "#163b3f",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              {sound.description}
            </p>

            <h3
              style={{
                marginTop: 0,
                marginBottom: 10,
                color: "#163b3f",
                fontSize: 16,
              }}
            >
              How to make the sound
            </h3>
            <ol
              style={{
                marginTop: 0,
                paddingLeft: 22,
                color: "#163b3f",
                marginBottom: 20,
              }}
            >
              {sound.placement.map((step, i) => (
                <li key={i} style={{ marginBottom: 6, fontSize: 15, lineHeight: 1.5 }}>
                  {step}
                </li>
              ))}
            </ol>

            <h3
              style={{
                marginTop: 0,
                marginBottom: 12,
                color: "#163b3f",
                fontSize: 16,
              }}
            >
              Practice words
            </h3>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                marginBottom: 20,
              }}
            >
              {sound.wordsByPosition.map((group) => (
                <div
                  key={group.position}
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#4f6378",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {group.position}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "#163b3f",
                      lineHeight: 1.8,
                    }}
                  >
                    {group.words.join(", ")}
                  </p>
                </div>
              ))}
            </div>

            <h3
              style={{
                marginTop: 0,
                marginBottom: 10,
                color: "#163b3f",
                fontSize: 16,
              }}
            >
              Parent tips
            </h3>
            <ul style={{ marginTop: 0, paddingLeft: 22, color: "#163b3f" }}>
              {sound.parentTips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 6, fontSize: 15, lineHeight: 1.5 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cueing Hierarchy */}
        <section
          style={{
            background: "white",
            padding: 28,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 6, color: "#163b3f" }}>
            Cueing Hierarchy
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: 20,
              color: "#4f6378",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            When your child struggles, use cues in order from least to most
            support. The goal is to fade cues over time so your child produces
            the sound independently.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CUEING_STEPS.map((step) => (
              <div
                key={step.level}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  background: "#f8fbfb",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    minWidth: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#163b3f",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {step.level}
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 3px",
                      fontWeight: 700,
                      color: "#163b3f",
                      fontSize: 15,
                    }}
                  >
                    {step.label}
                  </p>
                  <p
                    style={{
                      margin: "0 0 4px",
                      color: "#4f6378",
                      fontSize: 14,
                    }}
                  >
                    {step.description}
                  </p>
                  <p
                    style={{
                      margin: "0 0 4px",
                      color: "#163b3f",
                      fontStyle: "italic",
                      fontSize: 14,
                    }}
                  >
                    {step.example}
                  </p>
                  <p style={{ margin: 0, color: "#708196", fontSize: 13 }}>
                    {step.tip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Generalization Activities */}
        <section
          style={{
            background: "white",
            padding: 28,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 6, color: "#163b3f" }}>
            Generalization Activities
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: 20,
              color: "#4f6378",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            Practice doesn't have to mean drills. These everyday activities help
            your child use their sounds naturally in real life.
          </p>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {GENERALIZATION_ACTIVITIES.map((activity) => (
              <div
                key={activity.title}
                style={{
                  border: "1px solid #e3eeee",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontWeight: 700,
                    color: "#163b3f",
                    fontSize: 15,
                  }}
                >
                  {activity.title}
                </p>
                <p
                  style={{
                    margin: "0 0 10px",
                    color: "#4f6378",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {activity.description}
                </p>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#708196",
                    background: "#eefafa",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  {activity.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Practice Tracker */}
        <section
          style={{
            background: "white",
            padding: 28,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 6, color: "#163b3f" }}>
            Practice Tracker
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: 24,
              color: "#4f6378",
              fontSize: 15,
            }}
          >
            Log each session to track consistency over time. Sessions are saved
            on this device.
          </p>

          {/* Log form */}
          <div
            style={{
              background: "#f0fafa",
              borderRadius: 16,
              padding: 20,
              marginBottom: 28,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 16,
                color: "#163b3f",
                fontSize: 16,
              }}
            >
              Log Today's Session
            </h3>

            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 600,
                color: "#163b3f",
                fontSize: 14,
              }}
            >
              Sounds practiced
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              {SOUNDS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => toggleFormSound(s.label)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: formSounds.includes(s.label)
                      ? "2px solid #163b3f"
                      : "2px solid #c8dede",
                    background: formSounds.includes(s.label)
                      ? "#163b3f"
                      : "white",
                    color: formSounds.includes(s.label) ? "white" : "#163b3f",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 600,
                color: "#163b3f",
                fontSize: 14,
              }}
            >
              Minutes practiced:{" "}
              <span style={{ fontWeight: 700 }}>{formMinutes}</span>
            </p>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={formMinutes}
              onChange={(e) => setFormMinutes(Number(e.target.value))}
              style={{
                width: "100%",
                marginBottom: 18,
                accentColor: "#163b3f",
              }}
            />

            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 600,
                color: "#163b3f",
                fontSize: 14,
              }}
            >
              How did it go?
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {([1, 2, 3] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFormRating(r)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 12,
                    border:
                      formRating === r
                        ? "2px solid #163b3f"
                        : "2px solid #c8dede",
                    background: formRating === r ? "#163b3f" : "white",
                    color: formRating === r ? "white" : "#163b3f",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {RATING_EMOJI[r]} {RATING_LABEL[r]}
                </button>
              ))}
            </div>

            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 600,
                color: "#163b3f",
                fontSize: 14,
              }}
            >
              Notes (optional)
            </p>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Anything to remember about today's session..."
              rows={2}
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #c8dede",
                padding: "10px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 18,
              }}
            />

            <button
              onClick={submitSession}
              disabled={formSounds.length === 0}
              style={{
                padding: "11px 22px",
                borderRadius: 12,
                border: "none",
                background:
                  formSounds.length === 0 ? "#c8dede" : "#163b3f",
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor:
                  formSounds.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {formSubmitted ? "Session logged!" : "Log Session"}
            </button>
          </div>

          {/* History */}
          {log.length > 0 ? (
            <div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 14,
                  color: "#163b3f",
                  fontSize: 16,
                }}
              >
                Recent Sessions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {log.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "#f8fbfb",
                      borderRadius: 12,
                      padding: "12px 16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#163b3f",
                        fontSize: 14,
                        minWidth: 100,
                      }}
                    >
                      {entry.date}
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {entry.sounds.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: "#eefafa",
                            color: "#163b3f",
                            fontWeight: 600,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: "#4f6378", fontSize: 14 }}>
                      {entry.minutes} min
                    </span>
                    <span style={{ fontSize: 18 }}>
                      {RATING_EMOJI[entry.rating]}
                    </span>
                    {entry.notes && (
                      <span
                        style={{
                          color: "#708196",
                          fontSize: 13,
                          fontStyle: "italic",
                        }}
                      >
                        {entry.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p
              style={{
                color: "#a1bede",
                fontStyle: "italic",
                margin: 0,
                fontSize: 15,
              }}
            >
              No sessions logged yet. Log your first session above!
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
