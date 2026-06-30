import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type ChildProfile = {
  id: string;
  child_name?: string;
  name?: string;
  childName?: string;
  parent_email?: string;
  parentEmail?: string;
  email?: string;
  clinician_email?: string;
  created_at?: string;
};

type PracticeAssignment = {
  id: string;
  child_id?: string;
  childId?: string;
  child_name?: string;
  childName?: string;
  parent_email?: string;
  clinician_email?: string;
  target_sound?: string;
  targetSound?: string;
  target_position?: string;
  targetPosition?: string;
  difficulty?: string;
  words?: string[];
  selectedWords?: string[];
  selected_words?: string[];
  clinician_note?: string;
  clinicianNote?: string;
  custom_word?: string;
  customWord?: string;
  created_at?: string;
  createdAt?: string;
};

async function getParentEmail(): Promise<string> {
  // 1. Check URL params first (for testing/sharing links)
  const params = new URLSearchParams(window.location.search);
  const urlEmail = params.get("email");
  if (urlEmail && urlEmail.includes("@")) {
    return urlEmail.trim().toLowerCase();
  }

  // 2. Read directly from the live Supabase auth session (most reliable)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.email) {
      return session.user.email.trim().toLowerCase();
    }
  } catch (err) {
    console.warn("Could not read Supabase session:", err);
  }

  // 3. Fall back to localStorage currentUser JSON
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email && String(parsed.email).includes("@")) {
        return String(parsed.email).trim().toLowerCase();
      }
    }
  } catch {
    // ignore parse errors
  }

  // 4. Last resort: bare email string in localStorage
  const storedParentEmail = localStorage.getItem("currentParentEmail");
  if (storedParentEmail && storedParentEmail.includes("@")) {
    return storedParentEmail.trim().toLowerCase();
  }

  return "";
}

// ─── Sound theme ────────────────────────────────────────────────────────────

type SoundTheme = {
  headerGradient: string;
  chipBg: string;
  chipText: string;
  playGradient: string;
  badgeBg: string;
  badgeText: string;
};

function getSoundTheme(sound: string): SoundTheme {
  const s = (sound || "").toLowerCase();
  if (s.includes("sh")) return {
    headerGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    chipBg: "#ede9fe", chipText: "#4c1d95",
    playGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    badgeBg: "#ddd6fe", badgeText: "#4c1d95",
  };
  if (s.includes("ch")) return {
    headerGradient: "linear-gradient(135deg, #d97706, #b45309)",
    chipBg: "#fef3c7", chipText: "#78350f",
    playGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    badgeBg: "#fde68a", badgeText: "#78350f",
  };
  if (s.includes("r")) return {
    headerGradient: "linear-gradient(135deg, #dc2626, #b91c1c)",
    chipBg: "#fee2e2", chipText: "#991b1b",
    playGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    badgeBg: "#fecaca", badgeText: "#7f1d1d",
  };
  if (s.includes("s")) return {
    headerGradient: "linear-gradient(135deg, #0d9488, #0f766e)",
    chipBg: "#ccfbf1", chipText: "#134e4a",
    playGradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    badgeBg: "#99f6e4", badgeText: "#134e4a",
  };
  if (s.includes("l")) return {
    headerGradient: "linear-gradient(135deg, #9333ea, #7e22ce)",
    chipBg: "#f3e8ff", chipText: "#581c87",
    playGradient: "linear-gradient(135deg, #a855f7, #9333ea)",
    badgeBg: "#e9d5ff", badgeText: "#4c1d95",
  };
  if (s.includes("k")) return {
    headerGradient: "linear-gradient(135deg, #ea580c, #c2410c)",
    chipBg: "#ffedd5", chipText: "#7c2d12",
    playGradient: "linear-gradient(135deg, #f97316, #ea580c)",
    badgeBg: "#fed7aa", badgeText: "#7c2d12",
  };
  return {
    headerGradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    chipBg: "#dbeafe", chipText: "#1e3a8a",
    playGradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
    badgeBg: "#bfdbfe", badgeText: "#1e40af",
  };
}

function difficultyStars(difficulty?: string): string {
  const d = (difficulty || "").toLowerCase();
  if (d === "easy") return "★☆☆";
  if (d === "medium") return "★★☆";
  if (d === "hard") return "★★★";
  return "";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Inject Nunito from Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    async function loadParentData() {
      setLoading(true);

      const email = await getParentEmail();

      console.log("=== PARENT DASHBOARD LOAD START ===");
      console.log("Resolved email:", email);
      console.log("localStorage keys:", Object.keys(localStorage));
      console.log("currentUser raw:", localStorage.getItem("currentUser"));
      console.log(
        "currentParentEmail raw:",
        localStorage.getItem("currentParentEmail")
      );

      setParentEmail(email);

      if (!email) {
        console.warn("No parent email found — cannot load children");
        setChildren([]);
        setAssignments([]);
        setLoading(false);
        return;
      }

      try {
        console.log("Querying children with email:", email);
        const { data: childrenData, error: childrenError } = await supabase
          .from("children")
          .select("*")
          .ilike("parent_email", email)
          .order("created_at", { ascending: false });

        console.log("Children query result:", {
          data: childrenData,
          error: childrenError,
          count: childrenData?.length,
        });

        if (childrenError) {
          console.error("Could not load children:", childrenError);
          setChildren([]);
          setAssignments([]);
          setLoading(false);
          return;
        }

        const loadedChildren = childrenData || [];
        setChildren(loadedChildren);

        const childIds = loadedChildren.map((child) => child.id);
        console.log("Child IDs for assignment query:", childIds);

        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*")
          .in("child_id", childIds)
          .order("created_at", { ascending: false });

        if (assignmentError) {
          console.error("Could not load assignments:", assignmentError);
          setAssignments([]);
          setLoading(false);
          return;
        }

        const { data: assignmentByParentEmail, error: parentEmailError } =
          await supabase
            .from("assignments")
            .select("*")
            .ilike("parent_email", email)
            .order("created_at", { ascending: false });

        if (parentEmailError) {
          console.error(
            "Could not load assignments by parent_email:",
            parentEmailError
          );
          setAssignments(assignmentData || []);
          setLoading(false);
          return;
        }

        console.log("Assignments query result:", {
          data: assignmentData,
          count: assignmentData?.length,
        });
        console.log("Assignments by parent_email result:", {
          data: assignmentByParentEmail,
          count: assignmentByParentEmail?.length,
        });

        const assignmentMap = new Map<string, PracticeAssignment>();

        (assignmentData || []).forEach((assignment) => {
          if (assignment.id) {
            assignmentMap.set(assignment.id, assignment);
          }
        });

        (assignmentByParentEmail || []).forEach((assignment) => {
          if (assignment.id) {
            assignmentMap.set(assignment.id, assignment);
          }
        });

        setAssignments(Array.from(assignmentMap.values()));
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in loadParentData:", err);
        setChildren([]);
        setAssignments([]);
        setLoading(false);
      }
    }

    loadParentData();
  }, []);

  const parentChildren = useMemo(() => children, [children]);
  const parentAssignments = useMemo(() => assignments, [assignments]);

  const childName =
    parentChildren[0]?.child_name ||
    parentChildren[0]?.name ||
    parentChildren[0]?.childName ||
    "";

  const totalWords = parentAssignments.reduce((sum, a) => {
    const w = a.words || a.selectedWords || a.selected_words || [];
    return sum + w.length;
  }, 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0faf8",
        fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#163b3f",
      }}
    >
      {/* ── Hero header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #134e40 0%, #1a7a5e 55%, #22c991 100%)",
          padding: "44px 24px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 240, height: 240, borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
        }} />
        <div style={{
          position: "absolute", bottom: -30, left: -30,
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
        }} />

        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <p style={{
            color: "rgba(255,255,255,0.7)",
            margin: "0 0 8px",
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}>
            Speech Homework
          </p>

          <h1 style={{
            color: "white",
            margin: "0 0 6px",
            fontSize: childName ? 42 : 34,
            fontWeight: 900,
            lineHeight: 1.1,
          }}>
            {childName ? `Hi, ${childName}! 👋` : "Parent Portal"}
          </h1>

          {parentEmail && (
            <p style={{
              color: "rgba(255,255,255,0.65)",
              margin: "0 0 22px",
              fontSize: 14,
              fontWeight: 600,
            }}>
              {parentEmail}
            </p>
          )}

          {/* Stat pills */}
          {!loading && parentEmail && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={statPill}>
                {parentAssignments.length} assignment{parentAssignments.length !== 1 ? "s" : ""}
              </span>
              {totalWords > 0 && (
                <span style={statPill}>{totalWords} words to practice</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar (overlaps hero) ── */}
      <div style={{ maxWidth: 720, margin: "-28px auto 0", padding: "0 24px", position: "relative", zIndex: 10 }}>
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "14px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <button
            onClick={() => { window.location.href = "/home-practice"; }}
            style={actionBtn("#163b3f", "white")}
          >
            Practice Guide
          </button>
          <button
            onClick={() => { window.location.href = "/rewards"; }}
            style={actionBtn("#f0fdf9", "#163b3f", "1px solid #a7f3d0")}
          >
            View Rewards
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("currentUser");
              localStorage.removeItem("currentParentEmail");
              window.location.href = "/login";
            }}
            style={{ ...actionBtn("transparent", "#94a3b8"), marginLeft: "auto" }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* Loading */}
        {loading && (
          <div style={card}>
            <p style={{ margin: 0, fontSize: 17, color: "#4f6378", fontWeight: 700 }}>
              Loading homework...
            </p>
          </div>
        )}

        {/* No email */}
        {!loading && !parentEmail && (
          <div style={{ ...card, background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <h2 style={{ marginTop: 0, color: "#92400e", fontWeight: 900 }}>
              Parent email not found
            </h2>
            <p style={{ color: "#b45309", margin: "0 0 16px" }}>
              Go back to the login page and sign in with the same parent email
              that was added in the clinician dashboard.
            </p>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={actionBtn("#163b3f", "white")}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* No assignments yet */}
        {!loading && parentEmail &&
          parentChildren.length === 0 &&
          parentAssignments.length === 0 && (
          <div style={card}>
            <h2 style={{ marginTop: 0, fontWeight: 900, color: "#163b3f" }}>
              No homework yet
            </h2>
            <p style={{ color: "#4f6378", margin: "0 0 16px" }}>
              Your clinician hasn't posted any assignments yet. Check back soon!
            </p>
            <div style={{
              background: "#f0faf8",
              borderRadius: 12,
              padding: "12px 16px",
              fontWeight: 700,
              color: "#0f766e",
              fontSize: 14,
            }}>
              Signed in as: {parentEmail}
            </div>
          </div>
        )}

        {/* Assignment cards */}
        {!loading && parentAssignments.map((assignment) => {
          const words =
            assignment.words ||
            assignment.selectedWords ||
            assignment.selected_words ||
            [];

          const isSentence = words.some((w) => w.includes(" "));
          const sound = assignment.target_sound || assignment.targetSound || "";
          const position = assignment.target_position || assignment.targetPosition || "";
          const difficulty = assignment.difficulty || "";
          const note = assignment.clinician_note || assignment.clinicianNote || "";
          const theme = getSoundTheme(sound);
          const stars = difficultyStars(difficulty);

          // Every game launches with THIS child's assigned sound + words.
          const gameQuery = new URLSearchParams({
            sound: String(sound || "k"),
            pos: String(position || "Initial"),
            words: words.join(","),
          }).toString();
          const games = [
            { label: "🗺️ Word Quest", route: "/adventure-game", bg: "linear-gradient(135deg,#27c06b,#1ea65a)" },
            { label: "🚀 Star Mission", route: "/space-game", bg: "linear-gradient(135deg,#3b82d6,#7c3aed)" },
            { label: "🦸 Superhero", route: "/superhero-game", bg: "linear-gradient(135deg,#2563EB,#7C3AED)" },
            { label: "🌊 Ocean", route: "/ocean-game", bg: "linear-gradient(135deg,#2B6CB0,#4ECDC4)" },
          ];

          return (
            <div key={assignment.id} style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 20 }}>
              {/* Colored header */}
              <div style={{
                background: theme.headerGradient,
                padding: "18px 22px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{
                    background: "rgba(255,255,255,0.22)",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 20,
                    padding: "4px 14px",
                    borderRadius: 40,
                    letterSpacing: "0.02em",
                  }}>
                    {sound || "Sound"}
                  </span>

                  <span style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 20,
                  }}>
                    {isSentence ? "Sentence Practice" : "Word Practice"}
                  </span>

                  {position && (
                    <span style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "4px 12px",
                      borderRadius: 20,
                    }}>
                      {position}
                    </span>
                  )}
                </div>

                {stars && (
                  <div style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 16,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <span style={{ letterSpacing: 2 }}>{stars}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{difficulty}</span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: "18px 22px 22px" }}>

                {/* Word chips */}
                {words.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 13, color: "#708196", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {isSentence ? "Sentences" : "Practice words"}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {words.map((word) => (
                        <span
                          key={word}
                          style={{
                            background: theme.chipBg,
                            color: theme.chipText,
                            fontWeight: 700,
                            fontSize: isSentence ? 13 : 14,
                            padding: isSentence ? "6px 12px" : "5px 13px",
                            borderRadius: 20,
                            lineHeight: 1.4,
                          }}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinician note */}
                {note && (
                  <div style={{
                    background: "#f8fbfb",
                    border: "1px solid #e2eff0",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
                    <p style={{ margin: 0, fontSize: 14, color: "#4f6378", fontStyle: "italic", lineHeight: 1.5 }}>
                      {note}
                    </p>
                  </div>
                )}

                {/* Play button — full width */}
                <button
                  onClick={() => {
                    const targetSound = assignment.target_sound || assignment.targetSound || "k";
                    const targetPosition = assignment.target_position || assignment.targetPosition || "Initial";
                    const assignmentWords =
                      assignment.words ||
                      assignment.selectedWords ||
                      assignment.selected_words ||
                      [];
                    const mode = assignmentWords.some((w) => w.includes(" ")) ? "sentence" : "word";
                    const params = new URLSearchParams({
                      assignmentId: assignment.id,
                      targetSound,
                      targetPosition,
                      words: assignmentWords.join(","),
                      mode,
                    });
                    window.location.href = `/play?${params.toString()}`;
                  }}
                  style={{
                    width: "100%",
                    padding: "15px 20px",
                    border: "none",
                    borderRadius: 14,
                    background: theme.playGradient,
                    color: "white",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                  }}
                >
                  ▶ Play Practice Game
                </button>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c8aa0", margin: "14px 0 6px" }}>
                  …or play these same words as a game:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {games.map((g) => (
                    <button
                      key={g.route}
                      onClick={() => { window.location.href = `${g.route}?${gameQuery}`; }}
                      style={{
                        padding: "12px 8px",
                        border: "none",
                        borderRadius: 14,
                        background: g.bg,
                        color: "white",
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared style helpers ────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  marginBottom: 20,
};

const statPill: React.CSSProperties = {
  background: "rgba(255,255,255,0.2)",
  color: "white",
  padding: "6px 16px",
  borderRadius: 40,
  fontSize: 14,
  fontWeight: 700,
};

function actionBtn(
  bg: string,
  color: string,
  border?: string
): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 12,
    border: border ?? "none",
    background: bg,
    color,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  };
}
