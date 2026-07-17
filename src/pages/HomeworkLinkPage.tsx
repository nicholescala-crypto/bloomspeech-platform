import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSoundTheme, difficultyStars } from "../lib/homeworkTheme";

// ── De-identified parent homework page ──────────────────────────────────────
// Reached via a family's private bookmark link: /h/<access_code>. There is NO
// login and NO session. The code in the URL is the only credential; it is sent
// to the locked get_homework() database function, which returns ONLY that
// family's de-identified clinical homework (target sound, words, note) — never
// any name or email (the cloud no longer stores those). Because nothing here is
// PHI, this page does no audit logging.

type HomeworkRow = {
  id: string;
  target_sound: string | null;
  target_position: string | null;
  difficulty: string | null;
  words: string[] | null;
  clinician_note: string | null;
  created_at: string | null;
};

export default function HomeworkLinkPage({ code }: { code: string }) {
  const [rows, setRows] = useState<HomeworkRow[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");

  // Nunito font, matching the parent portal look.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!code || code.length < 8) { setState("error"); return; }
      const { data, error } = await supabase.rpc("get_homework", { p_code: code });
      if (cancelled) return;
      if (error) {
        console.error("get_homework failed:", error.message);
        setState("error");
        return;
      }
      const list = (data as HomeworkRow[]) || [];
      setRows(list);
      setState(list.length ? "ok" : "empty");
    }
    load();
    return () => { cancelled = true; };
  }, [code]);

  const totalWords = rows.reduce((sum, a) => sum + (a.words?.length || 0), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0faf8",
      fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
      color: "#163b3f",
    }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #134e40 0%, #1a7a5e 55%, #22c991 100%)",
        padding: "44px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 8px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Speech Homework
          </p>
          <h1 style={{ color: "white", margin: "0 0 6px", fontSize: 38, fontWeight: 900, lineHeight: 1.1 }}>
            Let's practice! 👋
          </h1>
          {state === "ok" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <span style={statPill}>{rows.length} assignment{rows.length !== 1 ? "s" : ""}</span>
              {totalWords > 0 && <span style={statPill}>{totalWords} words to practice</span>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 64px" }}>
        {state === "loading" && (
          <div style={card}><p style={{ margin: 0, fontSize: 17, color: "#4f6378", fontWeight: 700 }}>Loading homework…</p></div>
        )}

        {state === "error" && (
          <div style={{ ...card, background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <h2 style={{ marginTop: 0, color: "#92400e", fontWeight: 900 }}>This link isn't working</h2>
            <p style={{ color: "#b45309", margin: 0 }}>
              Double-check you opened the full link from your clinician. If it still
              doesn't work, ask your clinician to send you a fresh link.
            </p>
          </div>
        )}

        {state === "empty" && (
          <div style={card}>
            <h2 style={{ marginTop: 0, fontWeight: 900, color: "#163b3f" }}>No homework yet</h2>
            <p style={{ color: "#4f6378", margin: 0 }}>
              Your clinician hasn't posted any assignments yet. Check back soon!
            </p>
          </div>
        )}

        {state === "ok" && rows.map((assignment) => {
          const words = assignment.words || [];
          const isSentence = words.some((w) => w.includes(" "));
          const sound = assignment.target_sound || "";
          const position = assignment.target_position || "";
          const difficulty = assignment.difficulty || "";
          const note = assignment.clinician_note || "";
          const theme = getSoundTheme(sound);
          const stars = difficultyStars(difficulty);

          const gameQuery = new URLSearchParams({
            sound: String(sound || "k"),
            pos: String(position || "Initial"),
            words: words.join(","),
          }).toString();
          const games = [
            { label: "🗺️ Word Quest", route: "/adventure-game", bg: "linear-gradient(135deg,#27c06b,#1ea65a)" },
            { label: "🚀 Star Mission", route: "/space-game", bg: "linear-gradient(135deg,#3b82d6,#7c3aed)" },
            { label: "🍕 Bloom Pizza", route: "/pizza-game", bg: "linear-gradient(135deg,#e8723c,#c8521f)" },
            { label: "🏗️ Word Tower", route: "/tower-game", bg: "linear-gradient(135deg,#3f96b0,#2b6f86)" },
            { label: "🌻 Bloom Garden", route: "/garden-game", bg: "linear-gradient(135deg,#5bbf5b,#3f9d4a)" },
            { label: "🦸 Superhero", route: "/superhero-game", bg: "linear-gradient(135deg,#2563EB,#7C3AED)" },
            { label: "🌊 Ocean", route: "/ocean-game", bg: "linear-gradient(135deg,#2B6CB0,#4ECDC4)" },
          ];

          return (
            <div key={assignment.id} style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ background: theme.headerGradient, padding: "18px 22px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(255,255,255,0.22)", color: "white", fontWeight: 900, fontSize: 20, padding: "4px 14px", borderRadius: 40 }}>
                    {sound || "Sound"}
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>
                    {isSentence ? "Sentence Practice" : "Word Practice"}
                  </span>
                  {position && (
                    <span style={{ background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>
                      {position}
                    </span>
                  )}
                </div>
                {stars && (
                  <div style={{ marginTop: 10, color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ letterSpacing: 2 }}>{stars}</span>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{difficulty}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: "18px 22px 22px" }}>
                {words.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 13, color: "#708196", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {isSentence ? "Sentences" : "Practice words"}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {words.map((word) => (
                        <span key={word} style={{ background: theme.chipBg, color: theme.chipText, fontWeight: 700, fontSize: isSentence ? 13 : 14, padding: isSentence ? "6px 12px" : "5px 13px", borderRadius: 20, lineHeight: 1.4 }}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {note && (
                  <div style={{ background: "#f8fbfb", border: "1px solid #e2eff0", borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
                    <p style={{ margin: 0, fontSize: 14, color: "#4f6378", fontStyle: "italic", lineHeight: 1.5 }}>{note}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    const mode = words.some((w) => w.includes(" ")) ? "sentence" : "word";
                    const params = new URLSearchParams({
                      assignmentId: assignment.id,
                      targetSound: sound || "k",
                      targetPosition: position || "Initial",
                      words: words.join(","),
                      mode,
                    });
                    window.location.href = `/play?${params.toString()}`;
                  }}
                  style={{ width: "100%", padding: "15px 20px", border: "none", borderRadius: 14, background: theme.playGradient, color: "white", fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 900, cursor: "pointer", letterSpacing: "0.02em", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
                >
                  ▶ Play Practice Game
                </button>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c8aa0", margin: "14px 0 6px" }}>
                  …or play these same words as a game:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {games.map((g) => (
                    <button key={g.route} onClick={() => { window.location.href = `${g.route}?${gameQuery}`; }}
                      style={{ padding: "12px 8px", border: "none", borderRadius: 14, background: g.bg, color: "white", fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.16)" }}>
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
