import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { getSessionEmail, signOut } from "../lib/auth.ts";
import { logPhiView } from "../lib/audit.ts";
import {
  loadLocalNames,
  setLocalName,
  removeLocalName,
  exportLocalNames,
  importLocalNames,
  type LocalChild,
} from "../lib/localNames.ts";
import { generateSentences } from "../games/data/sentenceBank.ts";
import { WORD_EMOJIS, DEFAULT_WORD_EMOJI } from "../games/data/wordEmojis";
import { wordsForSound } from "../games/data/wordBank";
type ChildProfile = {
  id: string;
  access_code?: string;
  // Legacy identifier columns — present only until the Stage 2 scrub. The cloud
  // stops storing these; names now live on-device via localNames.
  child_name?: string;
  parent_email?: string;
  clinician_email?: string;
  created_at?: string;
};

type PracticeAssignment = {
  id: string;
  child_id: string;
  child_name?: string;
  parent_email?: string;
  clinician_email?: string;
  target_sound?: string;
  target_position?: string;
  difficulty?: string;
  words: string[];
  clinician_note?: string;
  created_at?: string;
};

// Multisyllabic word banks, grouped by syllable count so 3/4/5-syllable can
// each be picked as its own target.
const MULTISYLLABIC_BY_COUNT: Record<string, string[]> = {
  "3-syllable": [
    "elephant", "umbrella", "butterfly", "kangaroo", "strawberry",
    "banana", "tomato", "potato", "hamburger", "dinosaur",
    "tornado", "volcano", "pineapple", "gorilla", "microphone",
    "octopus", "violin", "ladybug", "crocodile", "telephone",
    "computer", "camera", "calendar", "cucumber", "newspaper",
    "basketball", "buffalo", "envelope", "lemonade", "tricycle",
    "grasshopper", "flamingo", "porcupine", "jellyfish", "unicorn",
    "astronaut", "ambulance", "submarine", "parachute", "telescope",
    "microscope", "saxophone", "volleyball", "trampoline", "library",
    "hospital", "restaurant", "pyramid", "waterfall", "hurricane",
  ],
  "4-syllable": [
    "caterpillar", "watermelon", "alligator", "helicopter", "calculator",
    "motorcycle", "television", "avocado", "macaroni", "rhinoceros",
    "binoculars", "aquarium", "ballerina", "supermarket", "salamander",
    "thermometer", "cauliflower", "dictionary", "kindergarten", "elevator",
    "escalator", "pepperoni", "guacamole", "ravioli", "cappuccino",
    "asparagus", "orangutan", "tarantula", "anaconda", "kookaburra",
    "terrarium", "gymnasium", "barometer", "speedometer", "accordion",
    "harmonica", "ukulele", "generator", "radiator", "quesadilla",
    "enchilada", "photographer", "librarian", "comedian", "electrician",
    "incubator", "aviator", "gladiator", "custodian", "astronomer",
  ],
  "5+ syllable": [
    "hippopotamus", "refrigerator", "cafeteria", "auditorium", "planetarium",
    "vocabulary", "elementary", "university", "electricity", "imagination",
    "personality", "opportunity", "curiosity", "unbelievable", "organization",
    "examination", "veterinary", "generosity", "creativity", "possibility",
    "observatory", "laboratory", "conservatory", "encyclopedia", "anniversary",
    "documentary", "investigation", "responsibility", "invisibility", "veterinarian",
    "pediatrician", "mathematician", "archaeology", "meteorology", "cardiology",
    "dermatology", "civilization", "determination", "communication", "multiplication",
    "pronunciation", "genealogy", "immunology", "physiology", "sociology",
    "biodiversity", "extraordinary", "obstetrician", "statistician", "administration",
  ],
};

const SYLLABLE_TARGETS = Object.keys(MULTISYLLABIC_BY_COUNT);

// All multisyllabic words (used when difficulty = "Hard").
const MULTISYLLABIC_WORDS = SYLLABLE_TARGETS.flatMap((k) => MULTISYLLABIC_BY_COUNT[k]);

const SOUND_OPTIONS = [
  "r", "s", "l", "ch", "sh", "th", "k", "g", "f", "v",
  "st", "sp", "bl", "gr", "tr", "pr", "fr", "dr", "sw", "sn",
];

const DEFAULT_WORDS = [
  "apple", "bacon", "baking", "ball", "baseball", "bath", "bear", "begging",
  "bench", "bicycle", "bike", "birthday", "book", "brush", "bug", "bus",
  "cake", "calm", "can", "car", "carrot", "castle", "cat", "cereal",
  "champ", "chase", "cheese", "cherry", "chew", "chicken", "child", "chime",
  "chin", "chomp", "coffee", "cookie", "cool", "cow", "cup", "dinosaur",
  "dish", "dog", "dollar", "dolphin", "door", "dragon", "dress", "eagle",
  "earth", "fan", "fashion", "fawn", "feather", "fight", "fin", "fish",
  "fishing", "fizzy", "flower", "fog", "fossil", "fox", "frog", "gallon",
  "game", "garage", "gate", "gather", "gaze", "giraffe", "girl", "go",
  "goat", "golf", "guess", "guitar", "gum", "guy", "hawk", "hike",
  "horse", "hug", "ice", "icecream", "jelly", "jug", "keep", "key",
  "kick", "kid", "king", "kiss", "kitchen", "kite", "knife", "lady",
  "lake", "lamb", "lamp", "like", "lime", "lion", "lock", "loud",
  "lunch", "lunchbox", "mail", "make", "mash", "melon", "mess", "messy",
  "mouse", "mouth", "muffin", "mushroom", "music", "ocean", "orange", "owl",
  "parade", "parrot", "path", "peaches", "pig", "pillow", "pilot", "pirate",
  "pocket", "porch", "potion", "pug", "rabbit", "racing", "rain", "raincoat",
  "rake", "reaching", "red", "rice", "robot", "rocket", "roof", "room",
  "rope", "rose", "rug", "rule", "sad", "sail", "salad", "sand",
  "saw", "sell", "shadow", "shark", "she", "sheep", "shell", "shiny",
  "ship", "shirt", "shoe", "show", "shower", "sing", "six", "soap",
  "soccer", "sock", "soup", "star", "suit", "sun", "teacher", "thigh",
  "think", "thirteen", "thread", "three", "throne", "thumb", "thunder", "ticket",
  "tiger", "tissue", "tooth", "toothbrush", "trash", "tugboat", "turtle", "waffle",
  "wagon", "watching", "weather", "wish", "witch", "wolf", "yellow", "yes",
  // consonant blends
  "stop", "step", "stick", "stone", "storm",
  "spin", "spot", "space", "speak", "speed", "spoon",
  "blue", "black", "blank", "blast", "block", "bloom",
  "green", "grab", "grape", "grass", "grill", "grin",
  "tree", "track", "trade", "trail", "train", "truck",
  "press", "print", "prize", "proud", "prank", "prep",
  "frame", "free", "fresh", "front", "fruit",
  "drum", "draw", "dream", "drink", "drop",
  "swim", "swan", "sweep", "sweet", "swing", "sway",
  "snake", "snap", "snack", "snail", "sneak", "snow",
];

export default function ClinicianDashboardPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [childName, setChildName] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [selectedChildId, setSelectedChildId] = useState("");
  const [targetSound, setTargetSound] = useState("/k/");
  const [targetPosition, setTargetPosition] = useState("Initial");
  const [difficulty, setDifficulty] = useState("Easy");
  const [clinicianNote, setClinicianNote] = useState("");
  const [customWord, setCustomWord] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [practiceMode, setPracticeMode] = useState<"word" | "phrase" | "sentence">("word");
  const [missingImageWords, setMissingImageWords] = useState<Set<string>>(new Set());
  const [sentenceText, setSentenceText] = useState("");

  const [clinicianEmail, setClinicianEmail] = useState("");

  // On-device name map (child id -> nickname/contact/code). Never uploaded.
  const [localNames, setLocalNames] = useState<Record<string, LocalChild>>({});

  // Show a child's name from the on-device map. Falls back to any legacy cloud
  // name (pre-scrub) and finally to a short code label.
  function nameFor(childId: string, code?: string): string {
    const local = localNames[childId]?.nickname;
    if (local) return local;
    return code ? `Family ${code.slice(0, 6)}…` : "(unnamed)";
  }

  function linkFor(code?: string): string {
    return code ? `${window.location.origin}/h/${code}` : "";
  }

  async function copyLink(code?: string) {
    const link = linkFor(code);
    if (!link) { alert("This family has no link yet."); return; }
    try { await navigator.clipboard.writeText(link); alert("Link copied:\n\n" + link); }
    catch { window.prompt("Copy this family's link:", link); }
  }

  async function regenerateLink(childId: string) {
    if (!window.confirm("Make a NEW link for this family? Their old link will stop working.")) return;
    const { data, error } = await supabase.rpc("regenerate_access_code", { p_child_id: childId });
    if (error) { alert("Could not make a new link: " + error.message); return; }
    setLocalName(childId, { code: String(data) });
    setLocalNames(loadLocalNames());
    await loadData(clinicianEmail);
    alert("New link (send this to the family):\n\n" + linkFor(String(data)));
  }

  // Back up the on-device name key to a file the clinician saves on her Mac.
  function downloadNameKey() {
    const blob = new Blob([exportLocalNames()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bloom-family-name-key.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importNameKey(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importLocalNames(String(reader.result));
        setLocalNames(loadLocalNames());
        alert("Name key loaded onto this device.");
      } catch {
        alert("That file didn't look like a valid name key.");
      }
    };
    reader.readAsText(file);
  }

  // Words shown in the picker: auto-filtered to the selected sound + position.
  const gridWords = useMemo(() => {
    if (MULTISYLLABIC_BY_COUNT[targetSound]) return MULTISYLLABIC_BY_COUNT[targetSound];
    if (difficulty === "Hard") return MULTISYLLABIC_WORDS;
    const pos = targetPosition === "Mixed" ? undefined : targetPosition;
    const filtered = wordsForSound(targetSound, pos);
    return filtered.length ? filtered : DEFAULT_WORDS;
  }, [difficulty, targetSound, targetPosition]);

  // Append a suggested sentence to the sentence box (one per line, no dupes).
  function addSentence(sentence: string) {
    setSentenceText((prev) => {
      const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.includes(sentence)) return prev;
      return (prev.trim() ? prev.trim() + "\n" : "") + sentence;
    });
  }

  useEffect(() => {
    (async () => {
      const email = await getSessionEmail();
      setClinicianEmail(email);
      await loadData(email);
    })();
  }, []);

  async function loadData(email: string) {
    setLoading(true);

    if (!email) {
      setChildren([]);
      setAssignments([]);
      setLoading(false);
      return;
    }

    // Filter to THIS clinician's caseload. RLS enforces the same rule
    // server-side, so this is defense in depth plus correct scoping.
    const { data: childrenData, error: childrenError } = await supabase
      .from("children")
      .select("*")
      .ilike("clinician_email", email)
      .order("created_at", { ascending: false });

    if (childrenError) {
      alert("Could not load children: " + childrenError.message);
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .select("*")
      .ilike("clinician_email", email)
      .order("created_at", { ascending: false });

    if (assignmentError) {
      alert("Could not load assignments: " + assignmentError.message);
    }

    setChildren(childrenData || []);
    setAssignments(assignmentData || []);

    // Cache each child's access_code on-device, and — ONE-TIME MIGRATION — pull
    // any name/email still in the cloud onto this device so it survives the
    // Stage 2 scrub. Gap-fill only: never overwrites a name already set locally,
    // and after the scrub (cloud names null) this does nothing.
    (childrenData || []).forEach((child) => {
      const existing = loadLocalNames()[child.id];
      const patch: Partial<LocalChild> = {};
      if (child.access_code) patch.code = child.access_code;
      if (!existing?.nickname && child.child_name) patch.nickname = child.child_name;
      if (!existing?.contact && child.parent_email) patch.contact = child.parent_email;
      if (Object.keys(patch).length) setLocalName(child.id, patch);
    });
    setLocalNames(loadLocalNames());
    setLoading(false);

    // Audit: record that this clinician accessed their caseload (PHI).
    if ((childrenData?.length ?? 0) > 0) {
      logPhiView("children", {
        context: `clinician viewed caseload (${childrenData!.length} patients)`,
      });
    }
  }

  const selectedChild = useMemo(() => {
    return children.find((child) => child.id === selectedChildId);
  }, [children, selectedChildId]);

  async function addChild() {
    const cleanChildName = childName.trim();
    const cleanContact = parentEmail.trim();

    if (!cleanChildName) {
      alert("Please enter the child name.");
      return;
    }

    // The cloud row carries NO name or email — only the clinician tag. The DB
    // generates the access_code automatically; we read it back for the link.
    const { data, error } = await supabase
      .from("children")
      .insert({ clinician_email: clinicianEmail })
      .select("id, access_code")
      .single();

    if (error || !data) {
      alert("Could not add child: " + (error?.message || "no row returned"));
      return;
    }

    // Name + contact stay ON THIS DEVICE only.
    setLocalName(data.id, {
      nickname: cleanChildName,
      contact: cleanContact || undefined,
      code: data.access_code,
    });
    setLocalNames(loadLocalNames());

    setChildName("");
    setParentEmail("");
    await loadData(clinicianEmail);

    alert(
      `Added ${cleanChildName}.\n\n` +
        `Their private homework link (send this to the family):\n\n` +
        linkFor(data.access_code) +
        `\n\nReminder: back up your name list (button in the Children section) so you don't lose who's who.`
    );
  }

  function toggleWord(word: string) {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((item) => item !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
  }

  function addCustomWord() {
    const cleanWord = customWord.trim();

    if (!cleanWord) return;

    if (!selectedWords.includes(cleanWord)) {
      setSelectedWords([...selectedWords, cleanWord]);
    }

    setCustomWord("");
  }

  async function saveAssignment() {
    if (!selectedChild) {
      alert("Please choose a child first.");
      return;
    }

    const wordsToSave =
      practiceMode === "word"
        ? selectedWords
        : sentenceText.split("\n").map((s) => s.trim()).filter(Boolean);

    if (wordsToSave.length === 0) {
      alert(
        practiceMode === "word"
          ? "Please choose at least one word."
          : `Please enter at least one ${practiceMode}.`
      );
      return;
    }

    // No name/email on the assignment — it links to the child by child_id only.
    const { error } = await supabase.from("assignments").insert({
      child_id: selectedChild.id,
      clinician_email: clinicianEmail,
      target_sound: targetSound,
      target_position: targetPosition,
      difficulty,
      words: wordsToSave,
      clinician_note: clinicianNote,
    });

    if (error) {
      alert("Could not save assignment: " + error.message);
      return;
    }

    setSelectedWords([]);
    setClinicianNote("");
    await loadData(clinicianEmail);

    alert("Assignment saved for " + nameFor(selectedChild.id, selectedChild.access_code));
  }

  async function deleteChild(childId: string) {
    const confirmed = window.confirm(
      "Delete this child and their assignments?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("children")
      .delete()
      .eq("id", childId);

    if (error) {
      alert("Could not delete child: " + error.message);
      return;
    }

    if (selectedChildId === childId) {
      setSelectedChildId("");
    }

    removeLocalName(childId);
    setLocalNames(loadLocalNames());
    await loadData(clinicianEmail);
  }

  async function deleteAssignment(assignmentId: string) {
    const confirmed = window.confirm("Delete this assignment?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      alert("Could not delete assignment: " + error.message);
      return;
    }

    await loadData(clinicianEmail);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h1>Loading clinician dashboard...</h1>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7fbfb",
        padding: 32,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={cardStyle}>
          <h1 style={{ margin: 0, color: "#163b3f", fontSize: 34 }}>
            Clinician Dashboard
          </h1>

          <p style={{ color: "#567", fontSize: 18 }}>
            Add children and assign speech homework. Names stay on this device —
            the cloud only stores each family's private link.
          </p>

          {clinicianEmail && (
            <p style={{ color: "#789" }}>
              Signed in as: <strong>{clinicianEmail}</strong>
              <button
                onClick={signOut}
                style={{
                  marginLeft: 14,
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "1px solid #cfe1df",
                  background: "white",
                  color: "#163b3f",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </p>
          )}
        </header>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#163b3f" }}>Add Child</h2>

          <div style={gridStyle}>
            <input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Child name"
              style={inputStyle}
            />

            <input
              value={parentEmail}
              onChange={(event) => setParentEmail(event.target.value)}
              placeholder="Parent contact (optional, stays on this device)"
              style={inputStyle}
            />

            <button onClick={addChild} style={greenButtonStyle}>
              Add Child
            </button>
          </div>
          <p style={{ color: "#789", fontSize: 13, margin: "4px 2px 0" }}>
            🔒 The child's name and parent contact are saved only in this browser,
            never uploaded. You'll get a private link to send the family.
          </p>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#163b3f" }}>
            Create Homework Assignment
          </h2>

          {children.length === 0 ? (
            <p style={{ color: "#567", fontSize: 17 }}>
              Add a child first before creating homework.
            </p>
          ) : (
            <>
              <div style={gridStyle}>
                <select
                  value={selectedChildId}
                  onChange={(event) => setSelectedChildId(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Choose child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {nameFor(child.id, child.access_code)}
                    </option>
                  ))}
                </select>

                <input
                  value={targetSound}
                  onChange={(event) => setTargetSound(event.target.value)}
                  placeholder="Target sound"
                  style={inputStyle}
                />

                <select
                  value={targetPosition}
                  onChange={(event) => setTargetPosition(event.target.value)}
                  style={inputStyle}
                >
                  <option>Initial</option>
                  <option>Medial</option>
                  <option>Final</option>
                  <option>Mixed</option>
                </select>

                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  style={inputStyle}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#567", marginBottom: 8 }}>
                  Quick pick a sound (matches Superhero Game)
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SOUND_OPTIONS.map((sound) => {
                    const label = `/${sound}/`;
                    const isSelected = targetSound === label;
                    return (
                      <button
                        key={sound}
                        onClick={() => setTargetSound(label)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 12,
                          border: isSelected ? "2px solid #2fb8ae" : "1px solid #dbe7e6",
                          background: isSelected ? "#dcfce7" : "#f8fbfb",
                          color: "#163b3f",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#567", marginBottom: 8 }}>
                  Quick pick multisyllabic (20 words each)
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SYLLABLE_TARGETS.map((target) => {
                    const isSelected = targetSound === target;
                    return (
                      <button
                        key={target}
                        onClick={() => setTargetSound(target)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 12,
                          border: isSelected ? "2px solid #7c3aed" : "1px solid #e5d9f7",
                          background: isSelected ? "#ede9fe" : "#faf8ff",
                          color: "#4c1d95",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        {target}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <button
                  onClick={() => setPracticeMode("word")}
                  style={{
                    ...tealButtonStyle,
                    background: practiceMode === "word" ? "#163b3f" : "#e2e8f0",
                    color: practiceMode === "word" ? "white" : "#163b3f",
                  }}
                >
                  Word Practice
                </button>
                <button
                  onClick={() => setPracticeMode("phrase")}
                  style={{
                    ...tealButtonStyle,
                    background: practiceMode === "phrase" ? "#163b3f" : "#e2e8f0",
                    color: practiceMode === "phrase" ? "white" : "#163b3f",
                  }}
                >
                  Phrase Practice
                </button>
                <button
                  onClick={() => setPracticeMode("sentence")}
                  style={{
                    ...tealButtonStyle,
                    background: practiceMode === "sentence" ? "#163b3f" : "#e2e8f0",
                    color: practiceMode === "sentence" ? "white" : "#163b3f",
                  }}
                >
                  Sentence Practice
                </button>
              </div>

              {practiceMode === "word" ? (
                <>
                  <h3 style={{ color: "#163b3f" }}>
                    Choose Words
                    {SYLLABLE_TARGETS.includes(targetSound) ? (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#7c3aed", marginLeft: 10 }}>
                        {gridWords.length} {targetSound} words
                      </span>
                    ) : difficulty === "Hard" ? (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#7c3aed", marginLeft: 10 }}>
                        Multisyllabic words
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#2fb8ae", marginLeft: 10 }}>
                        {gridWords.length} {targetSound} {targetPosition !== "Mixed" ? targetPosition.toLowerCase() : ""} words
                      </span>
                    )}
                  </h3>
                  <div style={wordGridStyle}>
                    {gridWords.map((word) => {
                      const isSelected = selectedWords.includes(word);
                      return (
                        <button
                          key={word}
                          onClick={() => toggleWord(word)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            padding: "8px 8px 6px",
                            borderRadius: 14,
                            border: isSelected
                              ? "2px solid #22c55e"
                              : "1px solid #dbe7e6",
                            background: isSelected ? "#dcfce7" : "#f8fbfb",
                            color: "#163b3f",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            width: 90,
                          }}
                        >
                          {missingImageWords.has(word) ? (
                            <span style={{ fontSize: 40, lineHeight: "60px", height: 60 }}>
                              {WORD_EMOJIS[word.toLowerCase()] || DEFAULT_WORD_EMOJI}
                            </span>
                          ) : (
                            <img
                              src={`/Images/${word}.png`}
                              alt={word}
                              style={{ width: 60, height: 60, objectFit: "contain" }}
                              onError={() => {
                                setMissingImageWords((prev) => new Set(prev).add(word));
                              }}
                            />
                          )}
                          {word}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                    <input
                      value={customWord}
                      onChange={(event) => setCustomWord(event.target.value)}
                      placeholder="Add custom word"
                      style={inputStyle}
                    />
                    <button onClick={addCustomWord} style={tealButtonStyle}>
                      Add Word
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ color: "#163b3f" }}>
                    {practiceMode === "phrase" ? "Build Phrases" : "Type Sentences"}
                  </h3>
                  <p style={{ color: "#567", marginTop: 0, marginBottom: 10, fontSize: 15 }}>
                    One {practiceMode} per line. The child will say each one aloud during practice.
                  </p>
                  <textarea
                    value={sentenceText}
                    onChange={(e) => setSentenceText(e.target.value)}
                    placeholder={
                      practiceMode === "phrase"
                        ? "the big rabbit\nmy red ball\nhot soup"
                        : "The cat sat on the mat.\nShe sells seashells by the seashore.\nThe big dog ran fast."
                    }
                    style={{ ...textareaStyle, minHeight: 160, marginBottom: 14 }}
                  />

                  {gridWords.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <h4 style={{ color: "#163b3f", margin: "0 0 4px" }}>
                        {practiceMode === "phrase" ? "Suggested phrases" : "Suggested sentences"}
                        <span style={{ fontWeight: 500, color: "#7c3aed", fontSize: 13, marginLeft: 8 }}>
                          {targetSound}
                          {targetPosition !== "Mixed" ? " " + targetPosition.toLowerCase() : ""}
                        </span>
                      </h4>
                      <p style={{ color: "#567", margin: "0 0 10px", fontSize: 13 }}>
                        {practiceMode === "phrase"
                          ? "Click a phrase to add it above. You can edit anything after adding."
                          : "Click a sentence to add it above. Green = easy (K–2), teal = harder (grades 3–5). You can edit anything after adding."}
                      </p>
                      <div
                        style={{
                          maxHeight: 260,
                          overflowY: "auto",
                          border: "1px solid #dbe7e6",
                          borderRadius: 12,
                          padding: 10,
                          background: "#f8fbfb",
                        }}
                      >
                        {gridWords.map((word) => {
                          const { phrase, easy, hard } = generateSentences(word);
                          return (
                            <div
                              key={word}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                                padding: "7px 0",
                                borderBottom: "1px solid #eef4f3",
                              }}
                            >
                              <span style={{ fontWeight: 800, color: "#163b3f", minWidth: 78 }}>
                                {word}
                              </span>
                              {practiceMode === "phrase" ? (
                                <button
                                  type="button"
                                  onClick={() => addSentence(phrase)}
                                  style={suggestChipStyle("#7c3aed", "#ede9fe")}
                                >
                                  + {phrase}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => addSentence(easy)}
                                    style={suggestChipStyle("#22c55e", "#dcfce7")}
                                  >
                                    + {easy}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSentence(hard)}
                                    style={suggestChipStyle("#2fb8ae", "#d7f5f2")}
                                  >
                                    + {hard}
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <textarea
                value={clinicianNote}
                onChange={(event) => setClinicianNote(event.target.value)}
                placeholder="Clinician note for parent"
                style={textareaStyle}
              />

              <button onClick={saveAssignment} style={greenButtonStyle}>
                Save Assignment
              </button>
            </>
          )}
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: "#163b3f" }}>Children</h2>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={downloadNameKey} style={tealButtonStyle}>
                ⬇ Back up name list
              </button>
              <label style={{ ...tealButtonStyle, background: "#e2e8f0", color: "#163b3f", display: "inline-block" }}>
                ⬆ Restore
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importNameKey(f); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
          <p style={{ color: "#789", fontSize: 13, margin: "0 0 14px" }}>
            🔒 Names below come from this device only. <strong>Back up the name list</strong> and
            keep it somewhere safe on your Mac (not iCloud) — it's the only record of who each link belongs to.
          </p>

          {children.length === 0 ? (
            <p style={{ color: "#567" }}>No children added yet.</p>
          ) : (
            <div style={cardGridStyle}>
              {children.map((child) => {
                const local = localNames[child.id];
                const code = child.access_code || local?.code;
                return (
                  <div key={child.id} style={smallCardStyle}>
                    <h3 style={{ color: "#163b3f", marginTop: 0 }}>
                      {nameFor(child.id, code)}
                    </h3>

                    {local?.contact && (
                      <p style={{ color: "#567", fontSize: 13 }}>
                        <strong>Contact:</strong> {local.contact}
                      </p>
                    )}

                    <p style={{ color: "#567", fontSize: 12, wordBreak: "break-all", background: "#eef4f3", padding: "8px 10px", borderRadius: 10 }}>
                      {linkFor(code) || "No link yet — reload after running the DB setup."}
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => copyLink(code)} style={{ ...tealButtonStyle, padding: "8px 12px", fontSize: 13 }}>
                        Copy link
                      </button>
                      <button onClick={() => regenerateLink(child.id)} style={{ ...tealButtonStyle, padding: "8px 12px", fontSize: 13, background: "#e2e8f0", color: "#163b3f" }}>
                        New link
                      </button>
                    </div>

                    <button
                      onClick={() => deleteChild(child.id)}
                      style={deleteButtonStyle}
                    >
                      Delete Child
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0, color: "#163b3f" }}>
            Saved Assignments
          </h2>

          {assignments.length === 0 ? (
            <p style={{ color: "#567" }}>No assignments saved yet.</p>
          ) : (
            <div style={cardGridStyle}>
              {assignments.map((assignment) => (
                <div key={assignment.id} style={smallCardStyle}>
                  <h3 style={{ color: "#163b3f", marginTop: 0 }}>
                    {nameFor(assignment.child_id)}
                  </h3>

                  <p style={{ color: "#567" }}>
                    <strong>Sound:</strong> {assignment.target_sound}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Position:</strong> {assignment.target_position}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Mode:</strong>{" "}
                    {assignment.words.some((w) => w.includes(" "))
                      ? "Sentence Practice"
                      : "Word Practice"}
                  </p>
                  <p style={{ color: "#567" }}>
                    <strong>Content:</strong>{" "}
                    {assignment.words.slice(0, 3).join(", ")}
                    {assignment.words.length > 3 ? "…" : ""}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Note:</strong>{" "}
                    {assignment.clinician_note || "No note"}
                  </p>

                  <button
                    onClick={() => deleteAssignment(assignment.id)}
                    style={deleteButtonStyle}
                  >
                    Delete Assignment
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: 26,
  borderRadius: 22,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  marginBottom: 24,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const wordGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
  gap: 8,
  marginBottom: 18,
};

const smallCardStyle = {
  background: "#f8fbfb",
  padding: 18,
  borderRadius: 18,
  border: "1px solid #dbe7e6",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid #cfe1df",
  fontSize: 16,
  outline: "none",
  background: "white",
  color: "#163b3f",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #cfe1df",
  fontSize: 16,
  minHeight: 90,
  marginBottom: 16,
};

const greenButtonStyle = {
  padding: "13px 18px",
  borderRadius: 14,
  border: "none",
  background: "#22c55e",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};

function suggestChipStyle(border: string, bg: string) {
  return {
    border: `1px solid ${border}`,
    background: bg,
    color: "#163b3f",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
  };
}

const tealButtonStyle = {
  padding: "13px 18px",
  borderRadius: 14,
  border: "none",
  background: "#2fb8ae",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const deleteButtonStyle = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#ef4444",
  color: "white",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};