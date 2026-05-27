import LoginPage from "./pages/LoginPage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import PlayPage from "./pages/PlayPage";
import RewardsShopPage from "./pages/RewardsShopPage";

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

function redirectToRolePage(path: string, role: UserRole) {
  if (role === "parent") {
    const clinicianPaths = [
      "/clinician",
      "/clinician-dashboard",
      "/clinician-portal",
      "/clinical",
      "/clinic",
    ];

    if (clinicianPaths.includes(path) || path === "/" || path === "/login") {
      window.location.replace("/parent");
      return true;
    }
  }

  if (role === "clinician") {
    const parentPaths = ["/parent", "/parent-dashboard", "/parent-portal"];

    if (parentPaths.includes(path) || path === "/" || path === "/login") {
      window.location.replace("/clinician");
      return true;
    }
  }

  return false;
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

export default function App() {
  const rawPath = window.location.pathname.toLowerCase();
  const path = rawPath.replace(/\/+$/, "") || "/";
  const role = getCurrentUserRole();

  if (role && redirectToRolePage(path, role)) {
    return null;
  }

  if (path === "/" || path === "/login") {
    return <LoginPage />;
  }

  if (
    path === "/parent" ||
    path === "/parent-dashboard" ||
    path === "/parent-portal"
  ) {
    return <ParentDashboardPage />;
  }

  if (
    path === "/clinician" ||
    path === "/clinician-dashboard" ||
    path === "/clinician-portal" ||
    path === "/clinical" ||
    path === "/clinic"
  ) {
    return <ClinicianDashboardPage />;
  }

  if (path === "/play" || path === "/practice") {
    return <PlayPage />;
  }

  if (path === "/rewards" || path === "/shop") {
    return <RewardsShopPage />;
  }

  return <NotFoundPage />;
}
