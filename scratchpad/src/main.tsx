import { StrictMode, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  OcentraLeaderboardControlsRoute,
  OcentraLeaderboardForeignObjectRoute,
  OcentraLeaderboardForeignObjectControlsRoute,
  OcentraLeaderboardSvgRoute,
  ScratchpadHomePage,
} from "./OcentraLeaderboardPage";
import { OcentraGameLeaderboardMock, OcentraGlobalLeaderboardMock } from "./OcentraGlobalLeaderboardMock";
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
    return <OcentraGlobalLeaderboardMock />;
  }

  if (pathname === "/game-leaderboard") {
    return <OcentraGameLeaderboardMock />;
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

const rootContainer = document.getElementById("root")! as HTMLElement & { __ocentraScratchpadRoot?: Root };
const root = rootContainer.__ocentraScratchpadRoot ?? createRoot(rootContainer);
rootContainer.__ocentraScratchpadRoot = root;

root.render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
