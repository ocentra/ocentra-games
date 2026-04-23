import { useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { parseAppRoute, resolvePathFromScreenToken } from '@/ui/navigation/appRoutes';

const LoginScreen = lazy(() => import('@/ui/features/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
const HomeScreen = lazy(() => import('@/ui/features/home/HomeScreen').then(m => ({ default: m.HomeScreen })));
const SelectedGameScreen = lazy(() => import('@/ui/features/selectedGame/SelectedGameScreen').then(m => ({ default: m.SelectedGameScreen })));
const SettingsScreen = lazy(() => import('@/ui/features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const ShopScreen = lazy(() => import('@/ui/features/shop/ShopScreen').then(m => ({ default: m.ShopScreen })));
const MatchmakingScreen = lazy(() => import('@/ui/features/matchmaking/MatchmakingScreen').then(m => ({ default: m.MatchmakingScreen })));
const LobbyScreen = lazy(() => import('@/ui/features/lobby/LobbyScreen').then(m => ({ default: m.LobbyScreen })));
const SocialScreen = lazy(() => import('@/ui/features/social/SocialScreen').then(m => ({ default: m.SocialScreen })));
const CompetitionScreen = lazy(() => import('@/ui/features/competition/CompetitionScreen').then(m => ({ default: m.CompetitionScreen })));
const PlayerHubScreen = lazy(() => import('@/ui/features/playerHub/PlayerHubScreen').then(m => ({ default: m.PlayerHubScreen })));

const RouteFallback = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle, rgb(0, 110, 104) 0%, rgb(0, 50, 100) 70%, rgb(0, 5, 15) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
    }}
  >
    <img src="/favicon.svg" alt="" width={128} height={128} style={{ opacity: 0.95 }} />
  </div>
);

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_SCREEN_EVENTS = true;

interface AuthScreenProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  showLoginDialog: boolean;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  onFacebookLogin: () => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: () => Promise<{ success: boolean; error?: string }>;
  onWalletLogin: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  onLogoutClick?: () => void;
  onTabSwitch?: () => void;
}

export function AuthScreen({
  isAuthenticated,
  user,
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
  onWalletLogin,
  onLogout,
  onSendPasswordReset,
  onLogoutClick,
  onTabSwitch,
}: AuthScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPathRef = useRef(location.pathname);
  const route = useMemo(() => parseAppRoute(location.pathname), [location.pathname]);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const handleShowScreen = (event: ShowScreenEvent) => {
      logInfo(`ShowScreenEvent received: ${event.screen}`, { screen: event.screen }, LOG_SCREEN_EVENTS);
      const nextPath = resolvePathFromScreenToken(event.screen, currentPathRef.current);

      logInfo(`Navigating to: ${nextPath}`, { from: currentPathRef.current, to: nextPath }, LOG_SCREEN_EVENTS);
      if (nextPath !== currentPathRef.current) {
        navigate(nextPath);
      }
    }

    EventBus.instance.subscribe(ShowScreenEvent, handleShowScreen)

    return () => {
      EventBus.instance.unsubscribe(ShowScreenEvent, handleShowScreen);
    }
  }, [navigate])

  if (isAuthenticated && user) {
    if (route.kind === 'template') {
      return null;
    }
    if (route.kind === 'settings') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <SettingsScreen />
        </Suspense>
      );
    }
    if (route.kind === 'matchmaking') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <MatchmakingScreen
            user={user}
            gameId={route.gameId}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'lobby') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <LobbyScreen
            user={user}
            gameId={route.gameId}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'shop') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <ShopScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'social') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <SocialScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'competition') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <CompetitionScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'playerHub') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <PlayerHubScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }
    if (route.kind === 'home') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <HomeScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }

    const gameId = route.kind === 'game'
      ? route.gameId
      : route.kind === 'legacy'
        ? route.token
        : '';

    if (!gameId) {
      return (
        <Suspense fallback={<RouteFallback />}>
          <HomeScreen
            user={user}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <SelectedGameScreen
          gameId={gameId}
          user={user}
          onLogout={onLogout}
          onLogoutClick={onLogoutClick}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <LoginScreen
        onLogin={onLogin}
        onSignUp={onSignUp}
        onFacebookLogin={onFacebookLogin}
        onGoogleLogin={onGoogleLogin}
        onGuestLogin={onGuestLogin}
        onWalletLogin={onWalletLogin}
        onSendPasswordReset={onSendPasswordReset}
        onTabSwitch={onTabSwitch}
      />
    </Suspense>
  );
}
