import type { ComponentProps } from 'react';
import { LoginScreenShared } from '@/ui/features/auth/LoginScreen.shared';

type LoginScreenProps = ComponentProps<typeof LoginScreenShared>;

export function LoginScreenMobile(props: LoginScreenProps) {
  return (
    <div data-platform-feature="auth-mobile" data-platform-screen="login">
      <LoginScreenShared {...props} />
    </div>
  );
}
