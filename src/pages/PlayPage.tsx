import PhaserGame from "../PhaserGame";

function getWordsFromUrl(): string[] {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("words");
  if (!raw) return [];
  return raw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
}

function getTargetSoundFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("targetSound") || "";
}

export default function PlayPage() {
  const words = getWordsFromUrl();
  const targetSound = getTargetSoundFromUrl();

  if (words.length < 2) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7fbfb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            padding: 32,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            textAlign: "center",
            maxWidth: 600,
          }}
        >
          <h1 style={{ color: "#163b3f" }}>No assignment found</h1>
          <p style={{ color: "#567", fontSize: 18 }}>
            Go back to the parent dashboard and click Play Practice Game from a
            homework card.
          </p>
          <button
            onClick={() => { window.location.href = "/parent"; }}
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              border: "none",
              background: "#2fb8ae",
              color: "white",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Back to Parent Dashboard
          </button>
        </div>
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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header
          style={{
            background: "white",
            padding: 24,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, color: "#163b3f", fontSize: 32 }}>
            Speech Practice Game
          </h1>
          {targetSound && (
            <p style={{ color: "#567", fontSize: 18, margin: "8px 0 0" }}>
              Practicing: <strong>{targetSound}</strong>
            </p>
          )}
        </header>

        <PhaserGame words={words} />

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => { window.location.href = "/parent"; }}
            style={{
              padding: "14px 24px",
              borderRadius: 14,
              border: "none",
              background: "#2fb8ae",
              color: "white",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Back to Parent Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
