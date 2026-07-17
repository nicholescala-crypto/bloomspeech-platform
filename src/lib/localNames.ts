// Local-only, on-THIS-device store that maps a child's cloud id + access code to
// the identifying info that must NEVER reach the cloud: the child's name and the
// parent's contact. This is the re-identification key — it lives only in the
// clinician's browser (localStorage), with export/import so she keeps an
// authoritative encrypted copy on her Mac (kept OFF iCloud).
//
// The cloud database only ever stores the random access_code + clinical content.

export type LocalChild = {
  // Optional because a child synced from the cloud (e.g. before the name key is
  // imported on this device) has a code but no local name yet.
  nickname?: string;  // child's name — clinician's eyes only, never uploaded
  contact?: string;   // parent email/phone — so she knows who to send the link to
  code?: string;      // the child's access_code, cached for showing the link
};

const KEY = "bloom-local-children-v1";

export function loadLocalNames(): Record<string, LocalChild> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, LocalChild>;
  } catch {
    return {};
  }
}

export function setLocalName(childId: string, entry: Partial<LocalChild>): void {
  const all = loadLocalNames();
  all[childId] = { ...all[childId], ...entry };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function removeLocalName(childId: string): void {
  const all = loadLocalNames();
  delete all[childId];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function exportLocalNames(): string {
  return JSON.stringify(loadLocalNames(), null, 2);
}

export function importLocalNames(json: string): void {
  const parsed = JSON.parse(json) as Record<string, LocalChild>;
  if (typeof parsed !== "object" || parsed === null) throw new Error("bad file");
  localStorage.setItem(KEY, JSON.stringify(parsed));
}
