import { useState } from "react";
import { sendMagicLink } from "../lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSendLink() {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const { error } = await sendMagicLink(clean);

    if (error) {
      setStatus("error");
      setMessage(error.message || "Could not send the sign-in link.");
      return;
    }

    setStatus("sent");
    setMessage(
      "Check your email for a secure sign-in link. It expires shortly, so open it soon."
    );
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
          maxWidth: 460,
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
            fontSize: 34,
            textAlign: "center",
          }}
        >
          Bloom Therapy Practice
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: 26,
            color: "#567",
            fontSize: 17,
            textAlign: "center",
          }}
        >
          Enter your email and we'll send you a secure sign-in link. Parents and
          clinicians both sign in here.
        </p>

        {status === "sent" ? (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 16,
              padding: 20,
              color: "#065f46",
              fontSize: 16,
              textAlign: "center",
            }}
          >
            {message}
          </div>
        ) : (
          <>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSendLink();
              }}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              style={inputStyle}
            />

            <button
              onClick={handleSendLink}
              disabled={status === "sending"}
              style={{
                ...tealButtonStyle,
                opacity: status === "sending" ? 0.6 : 1,
                cursor: status === "sending" ? "default" : "pointer",
              }}
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>

            {status === "error" && (
              <p
                style={{
                  color: "#b91c1c",
                  fontSize: 15,
                  marginTop: 14,
                  marginBottom: 0,
                  textAlign: "center",
                }}
              >
                {message}
              </p>
            )}
          </>
        )}
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

const tealButtonStyle = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "#2fb8ae",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
};
