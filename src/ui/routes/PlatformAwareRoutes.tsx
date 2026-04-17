import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import React, { Suspense } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import { isRouteEnabled, ROUTE_FEATURES, RouteFeature, RoutePath } from '@/config/platformFeatures';
import { WalletProviderGate } from '@/adapters/solana/wallet/WalletProviderGate';
import { PlatformInspectorRoute } from '@/ui/platform/PlatformInspectorRoute';
import MainApp from '@/components/MainApp';
import { MainPlatformShell } from '@/ui/shell/MainPlatformShell';

const GameScreenPage = React.lazy(() =>
  import('@/ui/pages/games/CardGamePlay/GameScreenPage').then((m) => ({ default: m.GameScreenPage }))
);
const LegacyGameScreen = React.lazy(() =>
  import('@/ui/components/GameScreen/CardGameScreen/GameScreen').then((m) => ({ default: m.default }))
);

function GamePlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId) return null;
  return (
    <Suspense fallback={<div>Loading game...</div>}>
      <GameScreenPage gameModeId={gameId} />
    </Suspense>
  );
}

const LogsPage = React.lazy(() =>
  import('@/ui/features/logs/LogsScreen').then((m) => ({ default: m.LogsScreen }))
);
const AIPlaygroundPage = React.lazy(() =>
  import('@/ui/features/aiPlayground/AIPlaygroundScreen').then((m) => ({ default: m.AIPlaygroundScreen }))
);
const AIModelListEditorPage = React.lazy(() =>
  import('@/ui/features/aiModelListEditor/AIModelListEditorScreen').then((m) => ({ default: m.AIModelListEditorScreen }))
);
const AdminUsersPage = React.lazy(() =>
  import('@/ui/features/adminUsers/AdminUsersScreen').then((m) => ({ default: m.AdminUsersScreen }))
);
const CardGamesExplorerPage = React.lazy(() =>
  import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen').then((m) => ({ default: m.CardGamesExplorerScreen }))
);
const DevPanelPage = React.lazy(() =>
  import('@/ui/features/devPanel/DevPanelScreen').then((m) => ({ default: m.DevPanelScreen }))
);
function App() {
  return (
    <MainPlatformShell>
      <MainApp />
    </MainPlatformShell>
  );
}

export function PlatformAwareRoutes() {
  const { shell } = usePlatformUI();
  const platform = shell;
  const isDev = import.meta.env.DEV;

  return (
    <Routes>
      {isRouteEnabled(RouteFeature.AIPlayground, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.AIPlayground].path}
          element={
            <Suspense fallback={<div>Loading AI Playground...</div>}>
              <AIPlaygroundPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.AIModelListEditor, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.AIModelListEditor].path}
          element={
            <Suspense fallback={<div>Loading AI Model List Editor...</div>}>
              <AIModelListEditorPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.Logs, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.Logs].path}
          element={
            <Suspense fallback={<div>Loading Logs Viewer...</div>}>
              <LogsPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.Admin, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.Admin].path}
          element={
            <Suspense fallback={<div>Loading Admin Dashboard...</div>}>
              <AdminUsersPage />
            </Suspense>
          }
        />
      )}
      <Route path="/admin/tools" element={<Navigate to={ROUTE_FEATURES[RouteFeature.Admin].path} replace />} />
      <Route path="/Editor" element={<Navigate to={ROUTE_FEATURES[RouteFeature.Admin].path} replace />} />
      {isRouteEnabled(RouteFeature.Admin, platform, isDev) && (
        <Route
          path="/admin/users"
          element={
            <Suspense fallback={<div>Loading Admin Users...</div>}>
              <AdminUsersPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.CardGamesExplorer, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.CardGamesExplorer].path}
          element={
            <Suspense fallback={<div>Loading Card Games Explorer...</div>}>
              <CardGamesExplorerPage />
            </Suspense>
          }
        />
      )}
      {isDev && (
        <>
          <Route
            path="/games/cardgame/template"
            element={
              <WalletProviderGate>
                <Suspense fallback={<div>Loading card game template...</div>}>
                  <LegacyGameScreen />
                </Suspense>
              </WalletProviderGate>
            }
          />
        </>
      )}
      {isRouteEnabled(RouteFeature.DevPanel, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.DevPanel].path}
          element={
            <Suspense fallback={<div>Loading Dev Panel...</div>}>
              <DevPanelPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.GamePlay, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.GamePlay].path}
          element={
            <WalletProviderGate>
              <GamePlayPage />
            </WalletProviderGate>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.PlatformInspector, platform, isDev) && (
        <Route path={ROUTE_FEATURES[RouteFeature.PlatformInspector].path} element={<PlatformInspectorRoute />} />
      )}
      <Route path={RoutePath.CatchAll} element={<App />} />
    </Routes>
  );
}
