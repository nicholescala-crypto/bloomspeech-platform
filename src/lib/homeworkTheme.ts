// Shared visual helpers for rendering a homework assignment card.
// Extracted so the de-identified link page and the (legacy) parent dashboard
// can share one source of truth without either importing the other.

export type SoundTheme = {
  headerGradient: string;
  chipBg: string;
  chipText: string;
  playGradient: string;
  badgeBg: string;
  badgeText: string;
};

export function getSoundTheme(sound: string): SoundTheme {
  const s = (sound || "").toLowerCase();
  if (s.includes("sh")) return {
    headerGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    chipBg: "#ede9fe", chipText: "#4c1d95",
    playGradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    badgeBg: "#ddd6fe", badgeText: "#4c1d95",
  };
  if (s.includes("ch")) return {
    headerGradient: "linear-gradient(135deg, #d97706, #b45309)",
    chipBg: "#fef3c7", chipText: "#78350f",
    playGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    badgeBg: "#fde68a", badgeText: "#78350f",
  };
  if (s.includes("r")) return {
    headerGradient: "linear-gradient(135deg, #dc2626, #b91c1c)",
    chipBg: "#fee2e2", chipText: "#991b1b",
    playGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    badgeBg: "#fecaca", badgeText: "#7f1d1d",
  };
  if (s.includes("s")) return {
    headerGradient: "linear-gradient(135deg, #0d9488, #0f766e)",
    chipBg: "#ccfbf1", chipText: "#134e4a",
    playGradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    badgeBg: "#99f6e4", badgeText: "#134e4a",
  };
  if (s.includes("l")) return {
    headerGradient: "linear-gradient(135deg, #9333ea, #7e22ce)",
    chipBg: "#f3e8ff", chipText: "#581c87",
    playGradient: "linear-gradient(135deg, #a855f7, #9333ea)",
    badgeBg: "#e9d5ff", badgeText: "#4c1d95",
  };
  if (s.includes("k")) return {
    headerGradient: "linear-gradient(135deg, #ea580c, #c2410c)",
    chipBg: "#ffedd5", chipText: "#7c2d12",
    playGradient: "linear-gradient(135deg, #f97316, #ea580c)",
    badgeBg: "#fed7aa", badgeText: "#7c2d12",
  };
  return {
    headerGradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    chipBg: "#dbeafe", chipText: "#1e3a8a",
    playGradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
    badgeBg: "#bfdbfe", badgeText: "#1e40af",
  };
}

export function difficultyStars(difficulty?: string): string {
  const d = (difficulty || "").toLowerCase();
  if (d === "easy") return "★☆☆";
  if (d === "medium") return "★★☆";
  if (d === "hard") return "★★★";
  return "";
}
