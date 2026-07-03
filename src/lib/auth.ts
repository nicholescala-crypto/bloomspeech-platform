import { supabase } from "./supabase";

export type Role = "parent" | "clinician" | "";

/**
 * The signed-in user's email, lowercased. Empty string if not signed in.
 * This is the ONLY trustworthy source of identity — it comes from a real
 * Supabase Auth session (a signed JWT), not from localStorage or the URL,
 * both of which a user can forge.
 */
export async function getSessionEmail(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.email?.trim().toLowerCase() ?? "";
}

/**
 * A user is a clinician only if their email is in the `clinicians` allowlist
 * table. RLS on that table lets a user look up only their own row, so this
 * can't be used to enumerate the list.
 */
export async function isClinician(email: string): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase
    .from("clinicians")
    .select("email")
    .ilike("email", email)
    .maybeSingle();
  if (error) {
    console.warn("Clinician lookup failed:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Resolve the current session's email and role in one call. */
export async function getSessionRole(): Promise<{ email: string; role: Role }> {
  const email = await getSessionEmail();
  if (!email) return { email: "", role: "" };
  const clinician = await isClinician(email);
  return { email, role: clinician ? "clinician" : "parent" };
}

/**
 * Send a passwordless magic-link sign-in email. The user clicks the link and
 * lands back on /auth/callback with a real session. Role is decided there,
 * server-side — the caller does not choose it.
 */
export async function sendMagicLink(email: string) {
  const clean = email.trim().toLowerCase();
  return supabase.auth.signInWithOtp({
    email: clean,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  // Clear the old forgeable localStorage login artifacts too.
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentParentEmail");
  localStorage.removeItem("currentClinicianEmail");
  await supabase.auth.signOut();
  window.location.replace("/login");
}
