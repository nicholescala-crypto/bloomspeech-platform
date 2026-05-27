import { useEffect, useState } from "react";

type PracticeAssignment = {
  id?: string;
  childId?: string;
  childName?: string;
  parentEmail?: string;
  targetSound?: string;
  targetPosition?: string;
  difficulty?: string;
  words?: string[];
  selectedWords?: string[];
  clinicianNote?: string;
  note?: string;
};

function safeJsonParse(value: string | null, fallback: any) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getActiveAssignment(): PracticeAssignment | null {
  const params = new URLSearchParams(window.location.search);
  const targetSound = params.get("targetSound");
  const words = params.get("words");

  if (targetSound || words) {
    return {
      id: params.get("assignmentId") || undefined,
      targetSound: targetSound || undefined,
      targetPosition: params.get("targetPosition") || undefined,
      words: words ? words.split(",").filter(Boolean) : [],
    };
  }

  const possibleKeys = [
    "bloom_active_assignment",
    "activeAssignment",
    "currentAssignment",
    "selectedAssignment",
  ];

  for (const key of possibleKeys) {
    const assignment = safeJsonParse(localStorage.getItem(key), null);

    if (assignment) {
      return assignment;
    }
  }

  return null;
}

export default function PlayPage() {
  const [assignment, setAssignment] = useState<PracticeAssignment | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);

  useEffect(() => {
    const savedAssignment = getActiveAssignment();
    setAssignment(savedAssignment);
  }, []);

  if (!assignment) {
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
            Go back to the parent dashboard and click Start Practice from a
            homework card.
          </p>

          <button
            onClick={() => {
              window.location.href = "/parent";
            }}
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

  const words = assignment.words || assignment.selectedWords || [];
  const currentWord = words[currentWordIndex] || "Practice";

  function nextWord() {
    if (words.length === 0) return;

    setPracticeCount(practiceCount + 1);

    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(0);
    }
  }

  function goBack() {
    window.location.href = "/parent";
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
            padding: 28,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, color: "#163b3f", fontSize: 36 }}>
            Speech Practice
          </h1>

          {assignment.childName && (
            <p style={{ color: "#567", fontSize: 18 }}>
              Practicing with <strong>{assignment.childName}</strong>
            </p>
          )}

          {assignment.targetSound && (
            <p style={{ color: "#567", fontSize: 18 }}>
              Target sound: <strong>{assignment.targetSound}</strong>
            </p>
          )}
        </header>

        <main
          style={{
            background: "white",
            padding: 40,
            borderRadius: 28,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#789",
              fontSize: 18,
              marginTop: 0,
            }}
          >
            Word {words.length > 0 ? currentWordIndex + 1 : 0} of{" "}
            {words.length}
          </p>

          <div
            style={{
              background: "#eef8f7",
              borderRadius: 28,
              padding: "60px 20px",
              marginBottom: 28,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#163b3f",
                fontSize: 64,
                textTransform: "capitalize",
              }}
            >
              {currentWord}
            </h2>
          </div>

          {assignment.clinicianNote && (
            <div
              style={{
                background: "#fff8e7",
                padding: 18,
                borderRadius: 16,
                marginBottom: 24,
                color: "#7a4a00",
                textAlign: "left",
              }}
            >
              <strong>Clinician note:</strong> {assignment.clinicianNote}
            </div>
          )}

          <button
            onClick={nextWord}
            style={{
              width: "100%",
              padding: "18px 22px",
              borderRadius: 18,
              border: "none",
              background: "#22c55e",
              color: "white",
              fontSize: 22,
              fontWeight: 900,
              cursor: "pointer",
              marginBottom: 14,
            }}
          >
            I Practiced This Word
          </button>

          <button
            onClick={goBack}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 16,
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

          <p style={{ color: "#789", marginTop: 18 }}>
            Practice count: <strong>{practiceCount}</strong>
          </p>
        </main>
      </div>
    </div>
  );
}