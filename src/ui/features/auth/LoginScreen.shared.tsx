import type { ComponentProps } from 'react';
import LoginDialog from '@/ui/components/Auth/LoginDialog';

type LoginScreenSharedProps = ComponentProps<typeof LoginDialog>;

export function LoginScreenShared(props: LoginScreenSharedProps) {
  return <LoginDialog {...props} />;
}
