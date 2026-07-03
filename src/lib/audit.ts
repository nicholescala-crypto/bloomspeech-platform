import { supabase } from "./supabase";

/**
 * Record that the signed-in user viewed PHI. Best-effort: never blocks or
 * breaks the UI if logging fails. Identity (who) is stamped server-side from
 * the JWT inside the log_phi_view function, so the client can't spoof it.
 */
export async function logPhiView(
  table: string,
  opts: { rowId?: string; childName?: string; context?: string } = {}
): Promise<void> {
  try {
    await supabase.rpc("log_phi_view", {
      p_table: table,
      p_row_id: opts.rowId ?? null,
      p_child_name: opts.childName ?? null,
      p_context: opts.context ?? null,
    });
  } catch (err) {
    console.warn("PHI view logging failed (non-blocking):", err);
  }
}
