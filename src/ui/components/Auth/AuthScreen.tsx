import { useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { buildHomePath, parseAppRoute, resolvePathFromScreenToken, type AppRouteState } from '@/ui/navigation/appRoutes';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';

const LoginScreen = lazy(() => import('@/ui/features/auth/LoginScreen').then((m) => ({ default: m.LoginScreen })));
const HomeScreen = lazy(() => import('@/ui/features/home/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const CardGamesExplorerScreen = lazy(() => import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen').then((m) => ({ default: m.CardGamesExplorerScreen })));
const SelectedGameScreen = lazy(() => import('@/ui/features/selectedGame/SelectedGameScreen').then((m) => ({ default: m.SelectedGameScreen })));
const SettingsScreen = lazy(() => import('@/ui/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const ShopScreen = lazy(() => import('@/ui/features/shop/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const MatchmakingScreen = lazy(() => import('@/ui/features/matchmaking/MatchmakingScreen').then((m) => ({ default: m.MatchmakingScreen })));
const LobbyScreen = lazy(() => import('@/ui/features/lobby/LobbyScreen').then((m) => ({ default: m.LobbyScreen })));
const SocialScreen = lazy(() => import('@/ui/features/social/SocialScreen').then((m) => ({ default: m.SocialScreen })));
const CompetitionScreen = lazy(() => import('@/ui/features/competition/CompetitionScreen').then((m) => ({ default: m.CompetitionScreen })));
const PlayerHubScreen = lazy(() => import('@/ui/features/playerHub/PlayerHubScreen').then((m) => ({ default: m.PlayerHubScreen })));

const RouteFallback = () => <ScreenLoadingFallback label="Loading Ocentra Games" variant="page" />;

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

type RouteAccess = 'public' | 'account';

interface RouteAccessMessage {
  eyebrow: string;
  title: string;
  description: string;
}

function getRouteAccess(route: AppRouteState): RouteAccess {
  if (route.kind === 'social' || route.kind === 'playerHub' || route.kind === 'matches' || route.kind === 'matchDetail') {
    return 'account';
  }

  return 'public';
}

function getAccountRouteMessage(route: AppRouteState, isGuestUser: boolean): RouteAccessMessage {
  if (route.kind === 'social') {
    return {
      eyebrow: 'Community features',
      title: isGuestUser ? 'Upgrade your guest session for social features' : 'Social features need a real account',
      description: 'Friends, messages, parties, and notifications belong to a persistent player identity, so this area is limited to full accounts.',
    };
  }

  if (route.kind === 'playerHub') {
    return {
      eyebrow: 'Player Hub',
      title: isGuestUser ? 'Upgrade your guest session for your player hub' : 'Your player hub needs a real account',
      description: 'Inventory, profile progress, and account-owned items live in your real player profile, so this area is not available to guests.',
    };
  }

  if (route.kind === 'matches' || route.kind === 'matchDetail') {
    return {
      eyebrow: 'Matches',
      title: isGuestUser ? 'Upgrade your guest session for match records' : 'Match records need a real account',
      description: 'Match history, table receipts, and result records belong to a persistent player identity.',
    };
  }

  return {
    eyebrow: 'Account required',
    title: isGuestUser ? 'Upgrade your guest session' : 'Sign in with a real account',
    description: 'This part of the platform needs a real player account to continue.',
  };
}

function canPreviewSocialWorld(route: AppRouteState, search: string): boolean {
  return import.meta.env.DEV && route.kind === 'social' && new URLSearchParams(search).get('preview') === 'world';
}

interface AuthScreenProps {
  user: UserProfile | null;
  hasAccount: boolean;
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
  user,
  hasAccount,
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
    };

    EventBus.instance.subscribe(ShowScreenEvent, handleShowScreen);

    return () => {
      EventBus.instance.unsubscribe(ShowScreenEvent, handleShowScreen);
    };
  }, [navigate]);

  const renderHome = (currentUser: UserProfile | null) => (
    <Suspense fallback={<RouteFallback />}>
      <HomeScreen
        user={currentUser}
        onLogout={onLogout}
        onLogoutClick={onLogoutClick}
      />
    </Suspense>
  );

  const renderRoute = (currentUser: UserProfile | null) => {
    if (route.kind === 'template') {
      return null;
    }

    if (route.kind === 'notFound') {
      return renderHome(currentUser);
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
            user={currentUser}
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
            user={currentUser}
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
            user={currentUser}
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
            user={currentUser}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }

    if (
      route.kind === 'competition' ||
      route.kind === 'events' ||
      route.kind === 'eventDetail' ||
      route.kind === 'tournaments' ||
      route.kind === 'tournamentDetail' ||
      route.kind === 'leaderboard' ||
      route.kind === 'gameLeaderboard' ||
      route.kind === 'aiBenchmarkLeaderboard' ||
      route.kind === 'matches' ||
      route.kind === 'matchDetail'
    ) {
      return (
        <Suspense fallback={<RouteFallback />}>
          <CompetitionScreen
            user={currentUser}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
            pageMode={route.kind}
            gameId={route.kind === 'gameLeaderboard' ? route.gameId : undefined}
            eventId={route.kind === 'eventDetail' ? route.eventId : undefined}
            tournamentId={route.kind === 'tournamentDetail' ? route.tournamentId : undefined}
            matchId={route.kind === 'matchDetail' ? route.matchId : undefined}
          />
        </Suspense>
      );
    }

    if (route.kind === 'playerHub') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <PlayerHubScreen
            user={currentUser}
            onLogout={onLogout}
            onLogoutClick={onLogoutClick}
          />
        </Suspense>
      );
    }

    if (route.kind === 'home') {
      return renderHome(currentUser);
    }

    if (route.kind === 'gameCatalog') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <CardGamesExplorerScreen catalogScope={route.scope} />
        </Suspense>
      );
    }

    if (route.kind === 'category') {
      return (
        <Suspense fallback={<RouteFallback />}>
          <CardGamesExplorerScreen catalogScope="card-games" initialCategorySlug={route.categoryId} />
        </Suspense>
      );
    }

    if (route.kind === 'rules' && !route.gameId.includes(':')) {
      return (
        <Suspense fallback={<RouteFallback />}>
          <CardGamesExplorerScreen
            catalogScope="card-games"
            initialGameSlug={route.gameId}
            initialDetailSection={route.kind === 'rules' ? 'rules' : 'overview'}
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
      return renderHome(currentUser);
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <SelectedGameScreen
          gameId={gameId}
          user={currentUser}
          onLogout={onLogout}
          onLogoutClick={onLogoutClick}
        />
      </Suspense>
    );
  };

  if (getRouteAccess(route) === 'account' && !hasAccount && !canPreviewSocialWorld(route, location.search)) {
    const accessMessage = getAccountRouteMessage(route, user?.isGuest === true);

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
          disableGuestLogin
          initialMode="signin"
          contextEyebrow={accessMessage.eyebrow}
          contextTitle={accessMessage.title}
          contextDescription={accessMessage.description}
          onClose={() => navigate(buildHomePath())}
        />
      </Suspense>
    );
  }

  return renderRoute(user);
}
