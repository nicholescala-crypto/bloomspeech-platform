import { useEffect, useMemo, useState } from "react";

type ChildProfile = {
  id: string;
  name: string;
  parentName?: string;
  parentEmail?: string;
  email?: string;
};

type PracticeAssignment = {
  id: string;
  childId?: string;
  child_id?: string;
  childName?: string;
  targetSound?: string;
  targetPosition?: string;
  difficulty?: string;
  words?: string[];
  selectedWords?: string[];
  clinicianNote?: string;
  note?: string;
};

const CHILDREN_STORAGE_KEY = "bloom_children";
const ASSIGNMENT_STORAGE_KEY = "bloom_assignments";

function safeJsonParse(value: string | null, fallback: any) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getCurrentParentEmail() {
  const directEmail = localStorage.getItem("currentParentEmail");

  if (directEmail && directEmail.includes("@")) {
    return directEmail.trim().toLowerCase();
  }

  const currentUser = safeJsonParse(localStorage.getItem("currentUser"), null);

  if (currentUser && currentUser.email) {
    return String(currentUser.email).trim().toLowerCase();
  }

  return "";
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [parentEmail, setParentEmail] = useState("");

  useEffect(() => {
    const savedChildren = safeJsonParse(
      localStorage.getItem(CHILDREN_STORAGE_KEY),
      []
    );

    const savedAssignments = safeJsonParse(
      localStorage.getItem(ASSIGNMENT_STORAGE_KEY),
      []
    );

    setChildren(savedChildren);
    setAssignments(savedAssignments);
    setParentEmail(getCurrentParentEmail());
  }, []);

  const parentChildren = useMemo(() => {
    if (!parentEmail) return [];

    return children.filter((child) => {
      const childEmail = String(child.parentEmail || child.email || "")
        .trim()
        .toLowerCase();

      return childEmail === parentEmail;
    });
  }, [children, parentEmail]);

  const visibleAssignments = useMemo(() => {
    const childIds = parentChildren.map((child) => child.id);
    const childNames = parentChildren.map((child) =>
      child.name.trim().toLowerCase()
    );

    return assignments.filter((assignment) => {
      const assignmentChildId = assignment.childId || assignment.child_id;

      if (assignmentChildId && childIds.includes(assignmentChildId)) {
        return true;
      }

      const assignmentChildName = String(assignment.childName || "")
        .trim()
        .toLowerCase();

      return childNames.includes(assignmentChildName);
    });
  }, [assignments, parentChildren]);

  function goToLogin() {
    window.location.href = "/";
  }

  function startPractice(assignment: PracticeAssignment) {
  localStorage.setItem("bloom_active_assignment", JSON.stringify(assignment));
  localStorage.setItem("activeAssignment", JSON.stringify(assignment));
  window.location.href = "/play";
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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            background: "white",
            padding: 28,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, color: "#163b3f", fontSize: 34 }}>
            Parent Portal
          </h1>

          <p style={{ color: "#567", fontSize: 18 }}>
            View your child&apos;s speech homework.
          </p>

          {parentEmail ? (
            <p style={{ color: "#789" }}>
              Signed in as: <strong>{parentEmail}</strong>
            </p>
          ) : (
            <button
              onClick={goToLogin}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                background: "#2fb8ae",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          )}
        </div>

        {!parentEmail && (
          <div
            style={{
              background: "#fff4e5",
              border: "1px solid #ffd7a3",
              padding: 22,
              borderRadius: 18,
              color: "#7a4a00",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Parent email not found</h2>
            <p>
              Go back to the login page and sign in with the same parent email
              that was added in the clinician dashboard.
            </p>
          </div>
        )}

        {parentEmail && parentChildren.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ color: "#163b3f", marginTop: 0 }}>
              No child linked yet
            </h2>

            <p style={{ color: "#567", fontSize: 17 }}>
              A clinician needs to add a child profile using this parent email:
            </p>

            <div
              style={{
                background: "#eef8f7",
                padding: 14,
                borderRadius: 12,
                color: "#163b3f",
                fontWeight: 700,
              }}
            >
              {parentEmail}
            </div>
          </div>
        )}

        {parentChildren.length > 0 && (
          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              marginBottom: 24,
            }}
          >
            <h2 style={{ color: "#163b3f", marginTop: 0 }}>My Child</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {parentChildren.map((child) => (
                <span
                  key={child.id}
                  style={{
                    background: "#eef8f7",
                    padding: "10px 14px",
                    borderRadius: 999,
                    color: "#163b3f",
                    fontWeight: 700,
                  }}
                >
                  {child.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {parentChildren.length > 0 && visibleAssignments.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 28,
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ color: "#163b3f", marginTop: 0 }}>
              No homework assigned yet
            </h2>

            <p style={{ color: "#567", fontSize: 17 }}>
              When the clinician assigns homework to your child, it will appear
              here.
            </p>
          </div>
        )}

        {visibleAssignments.length > 0 && (
          <div>
            <h2 style={{ color: "#163b3f" }}>Homework Assignments</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 18,
              }}
            >
              {visibleAssignments.map((assignment) => {
                const words = assignment.words || assignment.selectedWords || [];

                return (
                  <div
                    key={assignment.id}
                    style={{
                      background: "white",
                      padding: 24,
                      borderRadius: 22,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <h3 style={{ color: "#163b3f", marginTop: 0 }}>
                      {assignment.targetSound
                        ? `Practice ${assignment.targetSound}`
                        : "Speech Practice"}
                    </h3>

                    {assignment.childName && (
                      <p style={{ color: "#567" }}>
                        <strong>Child:</strong> {assignment.childName}
                      </p>
                    )}

                    {assignment.targetPosition && (
                      <p style={{ color: "#567" }}>
                        <strong>Position:</strong>{" "}
                        {assignment.targetPosition}
                      </p>
                    )}

                    {assignment.difficulty && (
                      <p style={{ color: "#567" }}>
                        <strong>Difficulty:</strong> {assignment.difficulty}
                      </p>
                    )}

                    <p style={{ color: "#567" }}>
                      <strong>Words:</strong>{" "}
                      {words.length > 0 ? words.join(", ") : "No words listed"}
                    </p>

                    <p style={{ color: "#567" }}>
                      <strong>Note:</strong>{" "}
                      {assignment.clinicianNote || assignment.note || "No note"}
                    </p>

                    <button
                      onClick={() => startPractice(assignment)}
                      style={{
                        width: "100%",
                        padding: "14px 18px",
                        borderRadius: 14,
                        border: "none",
                        background: "#22c55e",
                        color: "white",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Start Practice
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}