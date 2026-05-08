import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import React, { Suspense } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import { isRouteEnabled, ROUTE_FEATURES, RouteFeature, RoutePath } from '@/config/platformFeatures';
import { WalletProviderGate } from '@/adapters/solana/wallet/WalletProviderGate';
import { PlatformInspectorRoute } from '@/ui/platform/PlatformInspectorRoute';
import MainApp from '@/components/MainApp';
import { MainPlatformShell } from '@/ui/shell/MainPlatformShell';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';
import { PublicRouteKey, PublicRoutePath } from '@ocentra/endpoint-domain/constants/public-routes';

const GameScreenPage = React.lazy(() =>
  import('@/ui/pages/games/CardGamePlay/GameScreenPage').then((m) => ({ default: m.GameScreenPage }))
);
const CardGameTemplateScreen = React.lazy(() =>
  import('@/ui/components/GameScreen/CardGameScreen/CardGamePreviewHarness').then((m) => ({ default: m.CardGamePreviewHarness }))
);

function GamePlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId) return null;
  return (
    <Suspense fallback={<ScreenLoadingFallback label="Loading game" variant="page" />}>
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
            <Suspense fallback={<ScreenLoadingFallback label="Loading AI Playground" variant="page" />}>
              <AIPlaygroundPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.AIModelListEditor, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.AIModelListEditor].path}
          element={
            <Suspense fallback={<ScreenLoadingFallback label="Loading AI Model List Editor" variant="page" />}>
              <AIModelListEditorPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.Logs, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.Logs].path}
          element={
            <Suspense fallback={<ScreenLoadingFallback label="Loading Logs Viewer" variant="page" />}>
              <LogsPage />
            </Suspense>
          }
        />
      )}
      {isRouteEnabled(RouteFeature.Admin, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.Admin].path}
          element={
            <Suspense fallback={<ScreenLoadingFallback label="Loading Admin Dashboard" variant="page" />}>
              <AdminUsersPage />
            </Suspense>
          }
        />
      )}
      <Route path={PublicRoutePath[PublicRouteKey.AdminTools]} element={<Navigate to={ROUTE_FEATURES[RouteFeature.Admin].path} replace />} />
      <Route path={PublicRoutePath[PublicRouteKey.EditorAlias]} element={<Navigate to={ROUTE_FEATURES[RouteFeature.Admin].path} replace />} />
      {isRouteEnabled(RouteFeature.Admin, platform, isDev) && (
        <Route
          path={PublicRoutePath[PublicRouteKey.AdminUsers]}
          element={
            <Suspense fallback={<ScreenLoadingFallback label="Loading Admin Users" variant="page" />}>
              <AdminUsersPage />
            </Suspense>
          }
        />
      )}
      {isDev && (
        <>
          <Route
            path={PublicRoutePath[PublicRouteKey.CardGameTemplate]}
            element={
              <Suspense fallback={<ScreenLoadingFallback label="Loading card game template" variant="page" />}>
                <CardGameTemplateScreen />
              </Suspense>
            }
          />
        </>
      )}
      {isRouteEnabled(RouteFeature.DevPanel, platform, isDev) && (
        <Route
          path={ROUTE_FEATURES[RouteFeature.DevPanel].path}
          element={
            <Suspense fallback={<ScreenLoadingFallback label="Loading Dev Panel" variant="page" />}>
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
