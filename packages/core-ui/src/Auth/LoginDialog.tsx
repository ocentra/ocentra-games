import React, { useEffect, useRef, useState } from 'react';
import {
  authAnnonImageUrl,
  authFacebookImageUrl,
  authGoogleImageUrl,
} from '@ocentra/app-assets/auth';
import { avatarImageById } from '@ocentra/app-assets/avatars';
import {
  CyberAuthSurface,
  type AuthPageSvgControls,
} from './CyberAuthSurface';
import './LoginDialog.css';

const AuthImages = {
  Social: { facebook: authFacebookImageUrl, google: authGoogleImageUrl, guest: authAnnonImageUrl },
} as const;

const AUTH_MODE_STORAGE_KEY = 'ocentra.auth.mode';

const AvatarImages = avatarImageById;

export interface LoginDialogActionResult {
  success: boolean;
  error?: string;
}

export interface LoginDialogSignUpPayload {
  alias: string;
  avatar: string;
  username: string;
  password: string;
}

export interface LoginDialogSecondaryAction {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export interface LoginDialogStatusMessage {
  kind: 'error' | 'success' | 'info';
  text: string;
}

export type LoginDialogContextTone = 'default' | 'warning';

export interface LoginDialogProps {
  onLogin: (username: string, password: string) => Promise<LoginDialogActionResult>;
  onSignUp?: (userData: LoginDialogSignUpPayload) => Promise<LoginDialogActionResult>;
  onFacebookLogin?: () => Promise<LoginDialogActionResult>;
  onGoogleLogin?: () => Promise<LoginDialogActionResult>;
  onGuestLogin?: () => Promise<LoginDialogActionResult>;
  onWalletLogin?: () => Promise<LoginDialogActionResult>;
  onSendPasswordReset?: (email: string) => Promise<LoginDialogActionResult>;
  onTabSwitch?: () => void;
  adminRequired?: boolean;
  adminMessage?: string;
  brandTitle?: string;
  appVersion?: string;
  statusMessage?: LoginDialogStatusMessage | null;
  secondaryActions?: LoginDialogSecondaryAction[];
  contextEyebrow?: string;
  contextTitle?: string;
  contextDescription?: string;
  contextTone?: LoginDialogContextTone;
  disableCredentials?: boolean;
  disableGoogleLogin?: boolean;
  disableGuestLogin?: boolean;
  initialMode?: 'signin' | 'signup';
  onClose?: () => void | Promise<void>;
  closeAriaLabel?: string;
  layoutControls?: Partial<AuthPageSvgControls> | null;
}

function resolveInitialAuthMode(initialMode?: 'signin' | 'signup') {
  if (initialMode) {
    return initialMode;
  }

  if (typeof window === 'undefined') {
    return 'signin';
  }

  const requestedMode = window.sessionStorage.getItem(AUTH_MODE_STORAGE_KEY);
  if (requestedMode === 'signup') {
    window.sessionStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    return 'signup';
  }

  return 'signin';
}

export function LoginDialog({
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
  onSendPasswordReset,
  onTabSwitch,
  adminRequired = false,
  adminMessage = 'You need to be an administrator to access this page. Please sign in with an admin account.',
  brandTitle = 'Ocentra Games',
  statusMessage = null,
  secondaryActions = [],
  contextEyebrow,
  contextTitle,
  contextDescription,
  contextTone = 'default',
  disableCredentials = false,
  disableGoogleLogin = false,
  disableGuestLogin = false,
  initialMode,
  onClose,
  closeAriaLabel = 'Close authentication dialog',
  layoutControls = null,
}: LoginDialogProps) {
  const signUpEnabled = typeof onSignUp === 'function';
  const socialOptions = [
    { key: 'facebook', handler: onFacebookLogin, icon: AuthImages.Social.facebook, alt: 'Facebook', error: 'Facebook login failed. Please try again.' },
    { key: 'google', handler: onGoogleLogin, icon: AuthImages.Social.google, alt: 'Google', error: 'Google login failed. Please try again.', disabled: disableGoogleLogin },
    { key: 'guest', handler: onGuestLogin, icon: AuthImages.Social.guest, alt: 'Guest', error: 'Guest login failed. Please try again.', hidden: disableGuestLogin },
  ].filter((option) => !option.hidden && typeof option.handler === 'function');
  const [isSignIn, setIsSignIn] = useState(() => resolveInitialAuthMode(initialMode) === 'signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarOptions] = useState<{ id: number; url: string }[]>(() =>
    Object.entries(AvatarImages)
      .map(([key, url]) => ({
        id: parseInt(key, 10),
        url: url as string,
      }))
      .filter((entry) => entry.id >= 1 && entry.id <= 18)
      .sort((a, b) => a.id - b.id),
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const avatarSelectorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.login-cyber-avatar-button')) {
        return;
      }
      if (avatarSelectorRef.current && target && !avatarSelectorRef.current.contains(target)) {
        setShowAvatarSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'contain';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, []);

  useEffect(() => {
    if (!signUpEnabled || typeof window === 'undefined') {
      return;
    }

    const preloadedAvatars = avatarOptions.map((option) => {
      const image = new window.Image();
      image.decoding = 'async';
      image.src = option.url;
      return image;
    });

    void preloadedAvatars;
  }, [avatarOptions, signUpEnabled]);

  const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (value: string): string | undefined => {
    if (value.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return undefined;
  };

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSocialAuthResult = async (
    action: () => Promise<LoginDialogActionResult>,
    fallbackError: string,
  ) => {
    clearMessages();
    setIsLoading(true);
    try {
      const result = await action();
      if (!result.success) {
        setErrorMessage(result.error || fallbackError);
      }
    } catch {
      setErrorMessage(fallbackError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (showForgotPassword) {
      await handleForgotPassword();
      return;
    }
    clearMessages();
    setValidationErrors({});
    setIsLoading(true);

    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    if (!username) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(username)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (!isSignIn && signUpEnabled) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    if (!isSignIn && signUpEnabled && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      if (isSignIn || !signUpEnabled) {
        const result = await onLogin(username, password);
        if (!result.success) {
          setErrorMessage(result.error || 'Login failed. Please check your credentials.');
        }
      } else if (onSignUp) {
        const result = await onSignUp({ alias, avatar, username, password });
        if (!result.success) {
          setErrorMessage(result.error || 'Sign up failed. Please try again.');
        }
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  async function handleForgotPassword() {
    if (!onSendPasswordReset) {
      return;
    }
    setValidationErrors({});
    if (!username) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmail(username)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    clearMessages();
    setIsLoading(true);

    try {
      const result = await onSendPasswordReset(username);
      if (result.success) {
        setSuccessMessage('Password reset email sent! Please check your inbox.');
        setShowForgotPassword(false);
      } else {
        setErrorMessage(result.error || 'Failed to send password reset email.');
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAvatarSelect = (avatarUrl: string) => {
    setAvatar(avatarUrl);
    setShowAvatarSelector(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.match('image.*')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }
        context.drawImage(image, 0, 0, 128, 128);
        setAvatar(canvas.toDataURL('image/png'));
        setShowAvatarSelector(false);
      };
      image.src = String(loadEvent.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  };

  const activeMessage: LoginDialogStatusMessage | null =
    errorMessage || successMessage
      ? { kind: errorMessage ? 'error' : 'success', text: errorMessage || successMessage }
      : statusMessage;
  const introEyebrow = contextEyebrow ?? (adminRequired ? 'Restricted feature' : disableGuestLogin ? 'Player account' : 'Player access');
  const introTitle = contextTitle ?? (adminRequired ? 'Administrator access required' : 'Sign in to continue');
  const introDescription = contextDescription
    ?? (adminRequired
      ? adminMessage
      : disableGuestLogin
        ? 'Use a full account to continue.'
        : 'Use a full account or continue as guest when this feature allows it.');
  const introTone = adminRequired ? 'warning' : contextTone;
  const cyberSocialOptions = socialOptions.map((option) => ({
    key: option.key,
    icon: option.icon,
    alt: option.alt,
    disabled: isLoading || option.disabled,
    onClick: () => {
      if (option.handler) {
        void handleSocialAuthResult(option.handler, option.error);
      }
    },
  }));
  const cyberSecondaryActions = secondaryActions.map((action) => ({
    label: action.label,
    disabled: action.disabled || isLoading,
    onClick: () => {
      void action.onClick();
    },
  }));
  const handleModeChange = (mode: 'signin' | 'signup') => {
    const nextIsSignIn = mode === 'signin';
    if (nextIsSignIn !== isSignIn && onTabSwitch) {
      onTabSwitch();
    }
    setIsSignIn(nextIsSignIn);
    setShowForgotPassword(false);
    setValidationErrors({});
    clearMessages();
  };
  const handleEmailChange = (value: string) => {
    setUsername(value);
    if (validationErrors.email) {
      setValidationErrors({ ...validationErrors, email: undefined });
    }
  };
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (validationErrors.password) {
      setValidationErrors({ ...validationErrors, password: undefined });
    }
  };
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (validationErrors.confirmPassword) {
      setValidationErrors({ ...validationErrors, confirmPassword: undefined });
    }
  };

  return (
    <div className="login-dialog-overlay login-dialog-overlay--cyber">
      <form className={`login-cyber-form login-cyber-form--${introTone}`} onSubmit={handleSubmit}>
        <CyberAuthSurface
          layoutControls={layoutControls}
          mode={isSignIn ? 'signin' : 'signup'}
          signUpEnabled={signUpEnabled}
          canSendPasswordReset={Boolean(onSendPasswordReset && !disableCredentials)}
          brandTitle={brandTitle}
          eyebrow={introEyebrow}
          title={introTitle}
          description={introDescription}
          warning={introTone === 'warning'}
          alias={alias}
          email={username}
          password={password}
          confirmPassword={confirmPassword}
          avatar={avatar}
          avatarOptions={avatarOptions}
          showAvatarSelector={showAvatarSelector}
          showForgotPassword={showForgotPassword}
          notice={activeMessage}
          validationErrors={validationErrors}
          isLoading={isLoading}
          disableCredentials={disableCredentials}
          socialOptions={cyberSocialOptions}
          secondaryActions={cyberSecondaryActions}
          closeAriaLabel={closeAriaLabel}
          onModeChange={handleModeChange}
          onAliasChange={setAlias}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onToggleAvatarSelector={() => setShowAvatarSelector((value) => !value)}
          onAvatarSelect={handleAvatarSelect}
          onAvatarUploadClick={handleUploadClick}
          onFileChange={handleFileChange}
          onForgotPassword={() => {
            setShowForgotPassword(true);
            clearMessages();
            setValidationErrors({});
          }}
          onBackToSignIn={() => {
            setShowForgotPassword(false);
            clearMessages();
          }}
          onClose={onClose ? () => {
            void onClose();
          } : undefined}
          avatarSelectorRef={avatarSelectorRef}
          fileInputRef={fileInputRef}
        />
      </form>
    </div>
  );
}
