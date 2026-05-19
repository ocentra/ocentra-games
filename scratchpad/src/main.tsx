import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  OcentraLeaderboardControlsRoute,
  OcentraLeaderboardForeignObjectRoute,
  OcentraLeaderboardForeignObjectControlsRoute,
  OcentraLeaderboardPage,
  OcentraLeaderboardSvgRoute,
  ScratchpadHomePage,
} from "./OcentraLeaderboardPage";
import "./styles.css";

function AppRouter() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPath: string) => {
    if (nextPath === window.location.pathname) {
      return;
    }

    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  };

  if (pathname === "/leaderboard") {
    return <OcentraLeaderboardPage onNavigate={navigate} />;
  }

  if (pathname === "/svg") {
    return <OcentraLeaderboardSvgRoute />;
  }

  if (pathname === "/controls") {
    return <OcentraLeaderboardControlsRoute />;
  }

  if (pathname === "/foreign") {
    return <OcentraLeaderboardForeignObjectRoute />;
  }

  if (pathname === "/foreign-controls") {
    return <OcentraLeaderboardForeignObjectControlsRoute />;
  }

  if (pathname === "/") {
    return <ScratchpadHomePage onNavigate={navigate} />;
  }

  return <ScratchpadHomePage onNavigate={navigate} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
