import type { ComponentProps } from 'react';
import { LoginScreenWeb } from '@/ui/features/auth/LoginScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

type LoginScreenProps = ComponentProps<typeof LoginScreenWeb>;

export const LoginScreen = createPlatformScreen<LoginScreenProps>(
  LoginScreenWeb,
  () => import('@/ui/features/auth/LoginScreen.desktop').then((m) => ({ default: m.LoginScreenDesktop })),
  () => import('@/ui/features/auth/LoginScreen.mobile').then((m) => ({ default: m.LoginScreenMobile }))
);
