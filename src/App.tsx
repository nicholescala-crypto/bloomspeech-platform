import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import HomePracticePage from "./pages/HomePracticePage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import PlayPage from "./pages/PlayPage";
import RewardsShopPage from "./pages/RewardsShopPage";
import SuperheroGame from "./pages/SuperheroGame";
import OceanGame from "./pages/OceanGame";
import AdventureGame from "./pages/AdventureGame";
import SpaceGame from "./pages/SpaceGame";
import PizzaGame from "./pages/PizzaGame";
import TowerGame from "./pages/TowerGame";
import GardenGame from "./pages/GardenGame";

type UserRole = "parent" | "clinician" | "";

function getCurrentUserRole(): UserRole {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    if (parsed?.role === "parent" || parsed?.role === "clinician") {
      return parsed.role;
    }
  } catch {
    // ignore malformed values
  }

  return "";
}

function NotFoundPage() {
  return (
    <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1>Page not found</h1>
      <p>Try one of these:</p>

      <div style={{ display: "grid", gap: 12, maxWidth: 300 }}>
        <a href="/">Login</a>
        <a href="/parent">Parent Portal</a>
        <a href="/clinician">Clinician Portal</a>
        <a href="/play">Practice Game</a>
      </div>
    </div>
  );
}

const PARENT_PROTECTED_PATHS = [
  "/parent",
  "/parent-dashboard",
  "/parent-portal",
  "/home-practice",
];

export default function App() {
  const rawPath = window.location.pathname.toLowerCase();
  const path = rawPath.replace(/\/+$/, "") || "/";
  const initialRole = getCurrentUserRole();

  // When role appears empty on a parent-protected path, wait 300ms and re-check
  // before redirecting — localStorage may not be populated yet after a cross-domain
  // redirect (bloom-speech-homework.vercel.app <-> app.bloomtherapymt.com).
  const isParentPath = PARENT_PROTECTED_PATHS.includes(path);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [ready, setReady] = useState(initialRole !== "" || !isParentPath);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      setRole(getCurrentUserRole());
      setReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!ready) return null;

  if (path === "/" || path === "/login") {
    return <LoginPage />;
  }

  if (
    path === "/parent" ||
    path === "/parent-dashboard" ||
    path === "/parent-portal"
  ) {
    if (role !== "parent") {
      window.location.replace("/login");
      return null;
    }
    return <ParentDashboardPage />;
  }

  if (
    path === "/clinician" ||
    path === "/clinician-dashboard" ||
    path === "/clinician-portal" ||
    path === "/clinical" ||
    path === "/clinic"
  ) {
    if (role !== "clinician") {
      window.location.replace("/login");
      return null;
    }
    return <ClinicianDashboardPage />;
  }

  if (path === "/home-practice") {
    if (role !== "parent") {
      window.location.replace("/login");
      return null;
    }
    return <HomePracticePage />;
  }

  if (path === "/superhero-game") {
    return <SuperheroGame />;
  }

  if (path === "/ocean-game") {
    return <OceanGame />;
  }

  if (path === "/play" || path === "/practice") {
    return <PlayPage />;
  }

  if (path === "/adventure-game" || path === "/adventure" || path === "/word-quest") {
    return <AdventureGame />;
  }

  if (path === "/space-game" || path === "/space" || path === "/star-words") {
    return <SpaceGame />;
  }

  if (path === "/pizza-game" || path === "/pizza" || path === "/bloom-pizza") {
    return <PizzaGame />;
  }

  if (path === "/tower-game" || path === "/tower" || path === "/word-tower") {
    return <TowerGame />;
  }

  if (path === "/garden-game" || path === "/garden" || path === "/bloom-garden") {
    return <GardenGame />;
  }

  if (path === "/rewards" || path === "/shop") {
    return <RewardsShopPage />;
  }

  return <NotFoundPage />;
}
