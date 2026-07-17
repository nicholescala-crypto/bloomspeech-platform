import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import HomePracticePage from "./pages/HomePracticePage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import HomeworkLinkPage from "./pages/HomeworkLinkPage";
import PlayPage from "./pages/PlayPage";
import RewardsShopPage from "./pages/RewardsShopPage";
import SuperheroGame from "./pages/SuperheroGame";
import OceanGame from "./pages/OceanGame";
import AdventureGame from "./pages/AdventureGame";
import SpaceGame from "./pages/SpaceGame";
import PizzaGame from "./pages/PizzaGame";
import TowerGame from "./pages/TowerGame";
import GardenGame from "./pages/GardenGame";
import { getSessionRole, type Role } from "./lib/auth";

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

export default function App() {
  const rawPath = window.location.pathname.toLowerCase();
  const path = rawPath.replace(/\/+$/, "") || "/";

  // Identity comes from the real Supabase session, resolved once on load.
  const [role, setRole] = useState<Role>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSessionRole().then(({ role }) => {
      if (cancelled) return;
      setRole(role);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The auth callback manages its own loading UI and needs no session yet.
  if (path === "/auth/callback") {
    return <AuthCallbackPage />;
  }

  // Public game/practice routes render without waiting on auth.
  const publicRoute = renderPublicRoute(path);
  if (publicRoute) return publicRoute;

  // Everything below is auth-gated — wait until the session is resolved.
  if (!ready) return null;

  if (path === "/" || path === "/login") {
    // Already signed in? Send them to their portal instead of the login form.
    if (role === "clinician") {
      window.location.replace("/clinician");
      return null;
    }
    if (role === "parent") {
      window.location.replace("/parent");
      return null;
    }
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

  if (path === "/home-practice") {
    if (role !== "parent") {
      window.location.replace("/login");
      return null;
    }
    return <HomePracticePage />;
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

  return <NotFoundPage />;
}

// Routes that carry no PHI and don't require a session.
function renderPublicRoute(path: string) {
  // Family homework link: /h/<access_code>. No login — the code is the key,
  // resolved server-side by the locked get_homework() function. De-identified,
  // so it renders without a session like the other public routes.
  if (path.startsWith("/h/")) {
    const code = path.slice(3).replace(/\/+$/, "");
    return <HomeworkLinkPage code={code} />;
  }
  if (path === "/superhero-game") return <SuperheroGame />;
  if (path === "/ocean-game") return <OceanGame />;
  if (path === "/play" || path === "/practice") return <PlayPage />;
  if (path === "/adventure-game" || path === "/adventure" || path === "/word-quest")
    return <AdventureGame />;
  if (path === "/space-game" || path === "/space" || path === "/star-words")
    return <SpaceGame />;
  if (path === "/pizza-game" || path === "/pizza" || path === "/bloom-pizza")
    return <PizzaGame />;
  if (path === "/tower-game" || path === "/tower" || path === "/word-tower")
    return <TowerGame />;
  if (path === "/garden-game" || path === "/garden" || path === "/bloom-garden")
    return <GardenGame />;
  if (path === "/rewards" || path === "/shop") return <RewardsShopPage />;
  return null;
}
