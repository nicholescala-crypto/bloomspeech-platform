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

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getCurrentParentEmail() {
  const params = new URLSearchParams(window.location.search);
  const directEmail = params.get("email");

  if (directEmail && directEmail.includes("@")) {
    return directEmail.trim().toLowerCase();
  }

  const savedParentEmail = localStorage.getItem("currentParentEmail");
  if (savedParentEmail && savedParentEmail.includes("@")) {
    return savedParentEmail.trim().toLowerCase();
  }

  const currentUser = safeJsonParse<{ email?: string; role?: string }>(
    localStorage.getItem("currentUser"),
    {}
  );

  if (currentUser && currentUser.email && currentUser.role === "parent") {
    return String(currentUser.email).trim().toLowerCase();
  }

  return "";
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadParentData() {
      setLoading(true);

      const email = getCurrentParentEmail();
      setParentEmail(email);

      if (!email) {
        setChildren([]);
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("*")
        .eq("parent_email", email)
        .order("created_at", { ascending: false });

      console.log("Parent email searched:", email);
      console.log("Children returned:", childrenData);
      console.log("Children error:", childrenError);

      const loadedChildren = childrenData || [];
      setChildren(loadedChildren);

      const childIds = loadedChildren.map((child) => child.id);

      let loadedAssignments: PracticeAssignment[] = [];

      if (childIds.length > 0) {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*")
          .in("child_id", childIds)
          .order("created_at", { ascending: false });

        console.log("Child IDs searched:", childIds);
        console.log("Assignments returned by child_id:", assignmentData);
        console.log("Assignments error:", assignmentError);

        loadedAssignments = assignmentData || [];
      } else {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("*")
          .eq("parent_email", email)
          .order("created_at", { ascending: false });

        console.log("Fallback parent email searched:", email);
        console.log("Assignments returned by parent_email:", assignmentData);
        console.log("Assignments error:", assignmentError);

        loadedAssignments = assignmentData || [];

        if (loadedAssignments.length > 0) {
          const fallbackChildren: ChildProfile[] = loadedAssignments.map(
            (assignment) => ({
              id: assignment.child_id || assignment.id,
              child_name:
                assignment.child_name ||
                assignment.childName ||
                "Linked child",
              parent_email: assignment.parent_email || email,
              clinician_email: assignment.clinician_email,
              created_at: assignment.created_at || assignment.createdAt,
            })
          );

          const uniqueChildren = fallbackChildren.filter(
            (child, index, array) =>
              array.findIndex((item) => item.id === child.id) === index
          );

          setChildren(uniqueChildren);
        }
      }

      setAssignments(loadedAssignments);
      setLoading(false);
    }

    loadParentData();
  }, []);

  const parentChildren = useMemo(() => {
    if (!parentEmail) return [];

    return children.filter((child) => {
      const childEmail = String(
        child.parent_email || child.parentEmail || child.email || ""
      )
        .trim()
        .toLowerCase();

      return childEmail === parentEmail;
    });
  }, [children, parentEmail]);

  const parentChildIds = useMemo(() => {
    return parentChildren.map((child) => child.id);
  }, [parentChildren]);

  const parentAssignments = useMemo(() => {
    if (assignments.length === 0) return [];

    return assignments.filter((assignment) => {
      const assignmentChildId = String(
        assignment.child_id || assignment.childId || ""
      );

      const assignmentParentEmail = String(assignment.parent_email || "")
        .trim()
        .toLowerCase();

      return (
        parentChildIds.includes(assignmentChildId) ||
        assignmentParentEmail === parentEmail
      );
    });
  }, [assignments, parentChildIds, parentEmail]);

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
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background: "white",
            padding: 32,
            borderRadius: 24,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: 12,
              fontSize: 34,
              color: "#163b3f",
            }}
          >
            Parent Portal
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 18,
              color: "#4f6378",
            }}
          >
            View your child's speech homework.
          </p>

          {parentEmail && (
            <p
              style={{
                marginTop: 18,
                marginBottom: 0,
                color: "#708196",
                fontWeight: 600,
              }}
            >
              Signed in as: {parentEmail}
            </p>
          )}
        </section>

        {loading && (
          <section
            style={{
              background: "white",
              padding: 28,
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Loading homework...</h2>
          </section>
        )}

        {!loading && !parentEmail && (
          <section
            style={{
              background: "#fff4e5",
              border: "1px solid #ffd7a3",
              padding: 28,
              borderRadius: 24,
              color: "#7a4a00",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Parent email not found</h2>
            <p>
              Go back to the login page and sign in with the same parent email
              that was added in the clinician dashboard.
            </p>

            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                marginTop: 12,
                border: "none",
                background: "#163b3f",
                color: "white",
                padding: "12px 18px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Back to Login
            </button>
          </section>
        )}

        {!loading && parentEmail && parentChildren.length === 0 && (
          <section
            style={{
              background: "white",
              padding: 28,
              borderRadius: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                color: "#163b3f",
                marginTop: 0,
              }}
            >
              No child linked yet
            </h2>

            <p
              style={{
                color: "#4f6378",
                fontSize: 16,
              }}
            >
              A clinician needs to add a child profile using this parent email:
            </p>

            <div
              style={{
                background: "#eefafa",
                padding: "14px 16px",
                borderRadius: 12,
                fontWeight: 700,
                color: "#163b3f",
              }}
            >
              {parentEmail}
            </div>
          </section>
        )}

        {!loading && parentChildren.length > 0 && (
          <>
            <section
              style={{
                background: "white",
                padding: 28,
                borderRadius: 24,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: "#163b3f",
                }}
              >
                Linked Child
              </h2>

              {parentChildren.map((child) => (
                <div
                  key={child.id}
                  style={{
                    background: "#eefafa",
                    padding: 16,
                    borderRadius: 14,
                    marginTop: 12,
                    fontWeight: 700,
                  }}
                >
                  {child.child_name ||
                    child.name ||
                    child.childName ||
                    "Unnamed child"}
                </div>
              ))}
            </section>

            <section
              style={{
                background: "white",
                padding: 28,
                borderRadius: 24,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: "#163b3f",
                }}
              >
                Speech Homework
              </h2>

              {parentAssignments.length === 0 && (
                <p
                  style={{
                    color: "#4f6378",
                    fontSize: 16,
                  }}
                >
                  No assignments have been posted yet.
                </p>
              )}

              {parentAssignments.map((assignment) => {
                const words =
                  assignment.words ||
                  assignment.selectedWords ||
                  assignment.selected_words ||
                  [];

                return (
                  <div
                    key={assignment.id}
                    style={{
                      border: "1px solid #e3eeee",
                      borderRadius: 18,
                      padding: 20,
                      marginTop: 16,
                      background: "#fbffff",
                    }}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: 10,
                        color: "#163b3f",
                      }}
                    >
                      {assignment.child_name ||
                        assignment.childName ||
                        "Practice"}
                    </h3>

                    <p>
                      <strong>Sound:</strong>{" "}
                      {assignment.target_sound ||
                        assignment.targetSound ||
                        "Not specified"}
                    </p>

                    <p>
                      <strong>Position:</strong>{" "}
                      {assignment.target_position ||
                        assignment.targetPosition ||
                        "Not specified"}
                    </p>

                    <p>
                      <strong>Difficulty:</strong>{" "}
                      {assignment.difficulty || "Not specified"}
                    </p>

                    {(assignment.custom_word || assignment.customWord) && (
                      <p>
                        <strong>Custom word:</strong>{" "}
                        {assignment.custom_word || assignment.customWord}
                      </p>
                    )}

                    {words.length > 0 && (
                      <div>
                        <strong>Words:</strong>
                        <ul>
                          {words.map((word) => (
                            <li key={word}>{word}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(assignment.clinician_note ||
                      assignment.clinicianNote) && (
                      <p>
                        <strong>Clinician note:</strong>{" "}
                        {assignment.clinician_note ||
                          assignment.clinicianNote}
                      </p>
                    )}

                    <button
                      onClick={() => {
                        const targetSound =
                          assignment.target_sound ||
                          assignment.targetSound ||
                          "k";

                        const targetPosition =
                          assignment.target_position ||
                          assignment.targetPosition ||
                          "Initial";

                        const assignmentWords =
                          assignment.words ||
                          assignment.selectedWords ||
                          assignment.selected_words ||
                          [];

                        const params = new URLSearchParams({
                          assignmentId: assignment.id,
                          targetSound,
                          targetPosition,
                          words: assignmentWords.join(","),
                        });

                        window.location.href = `/play?${params.toString()}`;
                      }}
                      style={{
                        marginTop: 16,
                        border: "none",
                        background: "#163b3f",
                        color: "white",
                        padding: "12px 18px",
                        borderRadius: 14,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Play Practice Game
                    </button>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}