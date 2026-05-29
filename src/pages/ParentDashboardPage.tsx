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

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(true);

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

        const { data: assignmentByParentEmail, error: parentEmailError } = await supabase
          .from("assignments")
          .select("*")
          .ilike("parent_email", email)
          .order("created_at", { ascending: false });

        if (parentEmailError) {
          console.error("Could not load assignments by parent_email:", parentEmailError);
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

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => { window.location.href = "/rewards"; }}
              style={{
                padding: "9px 18px",
                borderRadius: 12,
                border: "none",
                background: "#163b3f",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View Rewards
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("currentUser");
                localStorage.removeItem("currentParentEmail");
                window.location.href = "/login";
              }}
              style={{
                padding: "9px 18px",
                borderRadius: 12,
                border: "1px solid #dbe7e6",
                background: "white",
                color: "#567",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
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

        {!loading && parentEmail && parentChildren.length === 0 && parentAssignments.length === 0 && (
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
              A clinician needs to add a child profile using this parent email.
            </p>

            <p
              style={{
                color: "#a1bede",
                fontSize: 15,
                marginTop: 14,
                marginBottom: 6,
              }}
            >
              Normalized lookup email used for matching:
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

        {(!loading && (parentChildren.length > 0 || parentAssignments.length > 0)) && (
          <>
            {parentChildren.length > 0 && (
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
            )}

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
                      Practice{" "}
                      {assignment.target_sound || assignment.targetSound || ""}
                    </h3>

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