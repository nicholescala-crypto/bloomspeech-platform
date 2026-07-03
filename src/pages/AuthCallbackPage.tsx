import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSessionRole } from "../lib/auth";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // supabase-js parses the session out of the redirect URL on load
      // (detectSessionInUrl). Poll briefly in case that hasn't completed yet.
      let session = null;
      for (let attempt = 0; attempt < 10 && !session; attempt++) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (!session) await new Promise((r) => setTimeout(r, 300));
      }

      if (cancelled) return;

      if (!session) {
        setMessage(
          "That sign-in link is invalid or expired. Redirecting you to sign in again…"
        );
        setTimeout(() => window.location.replace("/login"), 2500);
        return;
      }

      const { role } = await getSessionRole();
      if (cancelled) return;
      window.location.replace(role === "clinician" ? "/clinician" : "/parent");
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        color: "#163b3f",
        fontSize: 18,
        padding: 32,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}
