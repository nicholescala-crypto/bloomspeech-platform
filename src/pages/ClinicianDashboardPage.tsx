import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.ts";
type ChildProfile = {
  id: string;
  child_name: string;
  parent_email: string;
  clinician_email?: string;
  created_at?: string;
};

type PracticeAssignment = {
  id: string;
  child_id: string;
  child_name: string;
  parent_email: string;
  clinician_email?: string;
  target_sound?: string;
  target_position?: string;
  difficulty?: string;
  words: string[];
  clinician_note?: string;
  created_at?: string;
};

const DEFAULT_WORDS = [
  "cat",
  "key",
  "cake",
  "cow",
  "cookie",
  "kite",
  "king",
  "coat",
  "cup",
  "car",
  "dog",
  "go",
  "gum",
  "gate",
  "goat",
  "girl",
  "gift",
  "bug",
  "frog",
  "pig",
  "sun",
  "soap",
  "sock",
  "sand",
  "seal",
  "sit",
  "see",
  "bus",
  "mouse",
  "house",
  "shoe",
  "ship",
  "fish",
  "wish",
  "shell",
  "sheep",
  "chair",
  "cheese",
  "chicken",
  "teacher",
  "watch",
  "thumb",
  "think",
  "bath",
  "tooth",
  "feather",
  "weather",
  "red",
  "rabbit",
  "rain",
  "ring",
  "carrot",
  "tiger",
  "leaf",
  "lion",
  "lemon",
  "ball",
  "bell",
];

function getClinicianEmail() {
  const savedEmail = localStorage.getItem("currentClinicianEmail");

  if (savedEmail && savedEmail.includes("@")) {
    return savedEmail.trim().toLowerCase();
  }

  const currentUser = localStorage.getItem("currentUser");

  if (currentUser) {
    try {
      const parsed = JSON.parse(currentUser);
      if (parsed?.email) {
        return String(parsed.email).trim().toLowerCase();
      }
    } catch {
      return "";
    }
  }

  return "";
}

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

  const clinicianEmail = getClinicianEmail();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: childrenData, error: childrenError } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });

    if (childrenError) {
      alert("Could not load children: " + childrenError.message);
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (assignmentError) {
      alert("Could not load assignments: " + assignmentError.message);
    }

    setChildren(childrenData || []);
    setAssignments(assignmentData || []);
    setLoading(false);
  }

  const selectedChild = useMemo(() => {
    return children.find((child) => child.id === selectedChildId);
  }, [children, selectedChildId]);

  async function addChild() {
    const cleanChildName = childName.trim();
    const cleanParentEmail = parentEmail.trim().toLowerCase();

    if (!cleanChildName) {
      alert("Please enter the child name.");
      return;
    }

    if (!cleanParentEmail) {
      alert("Please enter the parent email.");
      return;
    }

    const { error } = await supabase.from("children").insert({
      child_name: cleanChildName,
      parent_email: cleanParentEmail,
      clinician_email: clinicianEmail,
    });

    if (error) {
      alert("Could not add child: " + error.message);
      return;
    }

    setChildName("");
    setParentEmail("");
    await loadData();

    alert("Child added.");
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

    if (selectedWords.length === 0) {
      alert("Please choose at least one word.");
      return;
    }

    const { error } = await supabase.from("assignments").insert({
      child_id: selectedChild.id,
      child_name: selectedChild.child_name,
      parent_email: selectedChild.parent_email,
      clinician_email: clinicianEmail,
      target_sound: targetSound,
      target_position: targetPosition,
      difficulty,
      words: selectedWords,
      clinician_note: clinicianNote,
    });

    if (error) {
      alert("Could not save assignment: " + error.message);
      return;
    }

    setSelectedWords([]);
    setClinicianNote("");
    await loadData();

    alert("Assignment saved for " + selectedChild.child_name);
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

    await loadData();
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

    await loadData();
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
            Add children, link parent emails, and assign speech homework.
          </p>

          {clinicianEmail && (
            <p style={{ color: "#789" }}>
              Signed in as: <strong>{clinicianEmail}</strong>
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
              placeholder="Parent email"
              type="email"
              style={inputStyle}
            />

            <button onClick={addChild} style={greenButtonStyle}>
              Add Child
            </button>
          </div>
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
                      {child.child_name} — {child.parent_email}
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

              <h3 style={{ color: "#163b3f" }}>Choose Words</h3>

              <div style={wordGridStyle}>
                {DEFAULT_WORDS.map((word) => {
                  const isSelected = selectedWords.includes(word);

                  return (
                    <button
                      key={word}
                      onClick={() => toggleWord(word)}
                      style={{
                        padding: "9px 13px",
                        borderRadius: 999,
                        border: isSelected
                          ? "2px solid #22c55e"
                          : "1px solid #dbe7e6",
                        background: isSelected ? "#dcfce7" : "#f8fbfb",
                        color: "#163b3f",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
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
          <h2 style={{ marginTop: 0, color: "#163b3f" }}>Children</h2>

          {children.length === 0 ? (
            <p style={{ color: "#567" }}>No children added yet.</p>
          ) : (
            <div style={cardGridStyle}>
              {children.map((child) => (
                <div key={child.id} style={smallCardStyle}>
                  <h3 style={{ color: "#163b3f", marginTop: 0 }}>
                    {child.child_name}
                  </h3>

                  <p style={{ color: "#567" }}>
                    <strong>Parent email:</strong> {child.parent_email}
                  </p>

                  <button
                    onClick={() => deleteChild(child.id)}
                    style={deleteButtonStyle}
                  >
                    Delete Child
                  </button>
                </div>
              ))}
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
                    {assignment.child_name}
                  </h3>

                  <p style={{ color: "#567" }}>
                    <strong>Parent email:</strong> {assignment.parent_email}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Sound:</strong> {assignment.target_sound}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Position:</strong> {assignment.target_position}
                  </p>

                  <p style={{ color: "#567" }}>
                    <strong>Words:</strong> {assignment.words.join(", ")}
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
  display: "flex",
  flexWrap: "wrap" as const,
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