import LoginPage from "./pages/LoginPage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import PlayPage from "./pages/PlayPage";

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
  const path = window.location.pathname.toLowerCase();

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

  return <NotFoundPage />;
}