import type { ComponentProps } from 'react';
import { LoginScreenShared } from '@/ui/features/auth/LoginScreen.shared';

type LoginScreenProps = ComponentProps<typeof LoginScreenShared>;

export function LoginScreenDesktop(props: LoginScreenProps) {
  return <LoginScreenShared {...props} />;
}
