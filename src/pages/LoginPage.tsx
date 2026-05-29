import { useState } from "react";

function clearStaleRoleData(activeRole: "parent" | "clinician") {
  if (activeRole === "parent") {
    localStorage.removeItem("currentClinicianEmail");
  } else {
    localStorage.removeItem("currentParentEmail");
  }
}

export default function LoginPage() {
  const [parentEmail, setParentEmail] = useState("");
  const [clinicianEmail, setClinicianEmail] = useState("");

  function handleParentLogin() {
    const cleanEmail = parentEmail.trim().toLowerCase();

    if (!cleanEmail) {
      alert("Please enter the parent email.");
      return;
    }

    clearStaleRoleData("parent");
    localStorage.setItem("currentParentEmail", cleanEmail);

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        role: "parent",
        email: cleanEmail,
      })
    );

    window.location.href = "/parent";
  }

  function handleClinicianLogin() {
    const cleanEmail = clinicianEmail.trim().toLowerCase();

    if (!cleanEmail) {
      alert("Please enter the clinician email.");
      return;
    }

    localStorage.setItem("currentClinicianEmail", cleanEmail);

    clearStaleRoleData("clinician");
    localStorage.setItem("currentClinicianEmail", cleanEmail);

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        role: "clinician",
        email: cleanEmail,
      })
    );

    window.location.href = "/clinician";
  }

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
          width: "100%",
          maxWidth: 950,
          background: "white",
          borderRadius: 28,
          padding: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: 10,
            color: "#163b3f",
            fontSize: 38,
            textAlign: "center",
          }}
        >
          Bloom Therapy Practice
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: 30,
            color: "#567",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Sign in to view or assign Bloom Therapy speech practice homework.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 22,
          }}
        >
          <section
            style={{
              background: "#f8fbfb",
              border: "1px solid #dbe7e6",
              borderRadius: 22,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#163b3f" }}>
              Parent Sign In
            </h2>

            <p style={{ color: "#567", fontSize: 16 }}>
              Use the same parent email that the clinician added to the child
              profile.
            </p>

            <input
              value={parentEmail}
              onChange={(event) => setParentEmail(event.target.value)}
              placeholder="Parent email"
              type="email"
              style={inputStyle}
            />

            <button onClick={handleParentLogin} style={greenButtonStyle}>
              Open Parent Portal
            </button>
          </section>

          <section
            style={{
              background: "#f8fbfb",
              border: "1px solid #dbe7e6",
              borderRadius: 22,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#163b3f" }}>
              Clinician Sign In
            </h2>

            <p style={{ color: "#567", fontSize: 16 }}>
              Sign in as the clinician to add children and assign homework.
            </p>

            <input
              value={clinicianEmail}
              onChange={(event) => setClinicianEmail(event.target.value)}
              placeholder="Clinician email"
              type="email"
              style={inputStyle}
            />

            <button onClick={handleClinicianLogin} style={tealButtonStyle}>
              Open Clinician Dashboard
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #cfe1df",
  fontSize: 16,
  outline: "none",
  background: "white",
  color: "#163b3f",
  marginBottom: 14,
};

const greenButtonStyle = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "#22c55e",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};

const tealButtonStyle = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "#2fb8ae",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};