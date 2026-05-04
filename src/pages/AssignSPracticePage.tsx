import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

type PracticeAssignment = {
  student: string;
  initial: boolean;
  medial: boolean;
  final: boolean;
  wordsPerSession: string;
  frequency: string;
};

export default function AssignSPracticePage() {
  const navigate = useNavigate();

  const [student, setStudent] = useState("Liam");
  const [initial, setInitial] = useState(true);
  const [medial, setMedial] = useState(false);
  const [finalPosition, setFinalPosition] = useState(false);
  const [wordsPerSession, setWordsPerSession] = useState("5 words");
  const [frequency, setFrequency] = useState("1 session per day");

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "Arial, sans-serif",
    padding: "32px",
  };

  const cardStyle: CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    padding: "32px",
  };

  const headerStyle: CSSProperties = {
    marginTop: 0,
    color: "#111827",
    fontSize: "32px",
  };

  const sectionStyle: CSSProperties = {
    marginTop: "24px",
    padding: "20px",
    borderRadius: "16px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  };

  const checkboxRowStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "12px",
    color: "#374151",
  };

  const labelStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "16px",
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    padding: "12px",
    marginTop: "12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    background: "#ffffff",
  };

  const buttonRowStyle: CSSProperties = {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "28px",
  };

  const primaryButtonStyle: CSSProperties = {
    padding: "14px 20px",
    border: "none",
    borderRadius: "12px",
    background: "#16a34a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "16px",
  };

  const secondaryButtonStyle: CSSProperties = {
    ...primaryButtonStyle,
    background: "#2563eb",
  };

  const darkButtonStyle: CSSProperties = {
    ...primaryButtonStyle,
    background: "#111827",
  };

  function handleSave() {
    const assignment: PracticeAssignment = {
      student,
      initial,
      medial,
      final: finalPosition,
      wordsPerSession,
      frequency,
    };

    localStorage.setItem("sPracticeAssignment", JSON.stringify(assignment));
    alert("S practice assigned");
    navigate("/parent");
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={headerStyle}>Assign /s/ Practice</h1>
        <p style={{ color: "#6b7280", marginTop: "-8px" }}>
          Choose the student, target positions, and home practice settings.
        </p>

        <div style={sectionStyle}>
          <h2 style={{ marginTop: 0, color: "#111827" }}>Student</h2>
          <select
            style={selectStyle}
            value={student}
            onChange={(e) => setStudent(e.target.value)}
          >
            <option>Liam</option>
            <option>Ava</option>
            <option>Noah</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ marginTop: 0, color: "#111827" }}>Target Positions</h2>

          <div style={checkboxRowStyle}>
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={initial}
                onChange={(e) => setInitial(e.target.checked)}
              />
              Initial /s/
            </label>

            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={medial}
                onChange={(e) => setMedial(e.target.checked)}
              />
              Medial /s/
            </label>

            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={finalPosition}
                onChange={(e) => setFinalPosition(e.target.checked)}
              />
              Final /s/
            </label>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ marginTop: 0, color: "#111827" }}>Practice Settings</h2>

          <select
            style={selectStyle}
            value={wordsPerSession}
            onChange={(e) => setWordsPerSession(e.target.value)}
          >
            <option>5 words</option>
            <option>10 words</option>
            <option>15 words</option>
          </select>

          <select
            style={selectStyle}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option>1 session per day</option>
            <option>2 sessions per day</option>
            <option>3 sessions per week</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ marginTop: 0, color: "#111827" }}>Program Summary</h2>
          <p style={{ color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
            This will assign an /s/ sound home practice program to the selected
            student and make it available from the parent dashboard.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <button style={primaryButtonStyle} onClick={handleSave}>
            Save Assignment
          </button>

          <button
            style={secondaryButtonStyle}
            onClick={() => navigate("/play")}
          >
            Preview Game
          </button>

          <button
            style={darkButtonStyle}
            onClick={() => navigate("/clinician")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}