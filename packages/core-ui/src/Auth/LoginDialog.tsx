import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  authAnnonImageUrl,
  authFacebookImageUrl,
  authGoogleImageUrl,
} from '@ocentra/app-assets/auth';
import { avatarImageById } from '@ocentra/app-assets/avatars';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';
import {
  cardGameWOCClubFilledImageUrl,
  cardGameWOCClubHollowImageUrl,
  cardGameWOCDiamondFilledImageUrl,
  cardGameWOCDiamondHollowImageUrl,
  cardGameWOCHeartFilledImageUrl,
  cardGameWOCHeartHollowImageUrl,
  cardGameWOCSpadeFilledImageUrl,
  cardGameWOCSpadeHollowImageUrl,
} from '@ocentra/app-assets/cardgame';
import { GameFooter } from '../Footer/GameFooter';
import './LoginDialog.css';

const AuthImages = {
  Social: { facebook: authFacebookImageUrl, google: authGoogleImageUrl, guest: authAnnonImageUrl },
} as const;

const AvatarImages = avatarImageById;

const AuthBackgroundCards = [
  cardGameWOCSpadeFilledImageUrl,
  cardGameWOCSpadeHollowImageUrl,
  cardGameWOCHeartFilledImageUrl,
  cardGameWOCHeartHollowImageUrl,
  cardGameWOCDiamondFilledImageUrl,
  cardGameWOCDiamondHollowImageUrl,
  cardGameWOCClubFilledImageUrl,
  cardGameWOCClubHollowImageUrl,
] as const;

const AuthBackgroundLayout = [
  { left: '4%', top: '18%', size: '2rem', opacity: 0.18, rotation: -8 },
  { left: '8%', top: '45%', size: '4.2rem', opacity: 0.14, rotation: 10 },
  { left: '11%', top: '76%', size: '3rem', opacity: 0.12, rotation: -12 },
  { left: '20%', top: '29%', size: '1.7rem', opacity: 0.1, rotation: 5 },
  { left: '27%', top: '61%', size: '3.5rem', opacity: 0.16, rotation: -6 },
  { left: '38%', top: '12%', size: '1.9rem', opacity: 0.1, rotation: 0 },
  { left: '47%', top: '38%', size: '1.8rem', opacity: 0.1, rotation: -7 },
  { left: '58%', top: '18%', size: '2rem', opacity: 0.1, rotation: 7 },
  { left: '61%', top: '63%', size: '4.9rem', opacity: 0.12, rotation: -4 },
  { left: '71%', top: '27%', size: '2.7rem', opacity: 0.14, rotation: -10 },
  { left: '79%', top: '76%', size: '2.1rem', opacity: 0.12, rotation: 3 },
  { left: '87%', top: '20%', size: '4.8rem', opacity: 0.11, rotation: 6 },
  { left: '92%', top: '56%', size: '3.1rem', opacity: 0.16, rotation: -7 },
  { left: '95%', top: '82%', size: '5rem', opacity: 0.14, rotation: 2 },
] as const;

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
  disableCredentials?: boolean;
  disableGoogleLogin?: boolean;
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
  brandTitle = 'Ocentra AI',
  appVersion = '0.1.0',
  statusMessage = null,
  secondaryActions = [],
  disableCredentials = false,
  disableGoogleLogin = false,
}: LoginDialogProps) {
  const backgroundCards = useMemo(
    () =>
      AuthBackgroundLayout.map((entry, index) => ({
        ...entry,
        src: AuthBackgroundCards[index % AuthBackgroundCards.length],
        delay: `${(index % 5) * -1.6}s`,
      })),
    [],
  );
  const signUpEnabled = typeof onSignUp === 'function';
  const socialOptions = [
    { key: 'facebook', handler: onFacebookLogin, icon: AuthImages.Social.facebook, alt: 'Facebook', error: 'Facebook login failed. Please try again.' },
    { key: 'google', handler: onGoogleLogin, icon: AuthImages.Social.google, alt: 'Google', error: 'Google login failed. Please try again.', disabled: disableGoogleLogin },
    { key: 'guest', handler: onGuestLogin, icon: AuthImages.Social.guest, alt: 'Guest', error: 'Guest login failed. Please try again.' },
  ].filter((option) => typeof option.handler === 'function');
  const [isSignIn, setIsSignIn] = useState(true);
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
      if (avatarSelectorRef.current && !avatarSelectorRef.current.contains(event.target as Node)) {
        setShowAvatarSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleForgotPassword = async () => {
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
  };

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

  const activeMessage =
    errorMessage || successMessage
      ? { kind: errorMessage ? 'error' : 'success', text: errorMessage || successMessage }
      : statusMessage;

  return (
    <div className="login-dialog-overlay">
      <div className="login-dialog-background" aria-hidden="true">
        <div className="login-dialog-background__glow login-dialog-background__glow--left" />
        <div className="login-dialog-background__glow login-dialog-background__glow--right" />
        {backgroundCards.map((card, index) => (
          <img
            key={`${card.left}-${card.top}-${index}`}
            className="login-dialog-background__card"
            src={card.src}
            alt=""
            style={{
              left: card.left,
              top: card.top,
              width: card.size,
              height: card.size,
              opacity: card.opacity,
              transform: `rotate(${card.rotation}deg)`,
              animationDelay: card.delay,
            }}
          />
        ))}
      </div>
      <div className="login-logo-section">
        <img src={mlogoImageUrl} alt="Ocentra Logo" className="login-logo" />
        <h2 className="login-brand-text">{brandTitle}</h2>
      </div>

      <div className="login-dialog">
        {adminRequired ? (
          <div className="admin-required-message">
            <div className="admin-required-icon">Locked</div>
            <p className="admin-required-text">{adminMessage}</p>
          </div>
        ) : null}

        <div className="login-header">
          <div className="tab-buttons">
            <button
              type="button"
              className={`tab-button ${isSignIn ? 'active' : ''}`}
              onClick={() => {
                if (!isSignIn && onTabSwitch) {
                  onTabSwitch();
                }
                setIsSignIn(true);
                clearMessages();
              }}
            >
              SIGN IN
            </button>
            {signUpEnabled ? (
              <button
                type="button"
                className={`tab-button ${!isSignIn ? 'active' : ''}`}
                onClick={() => {
                  if (isSignIn && onTabSwitch) {
                    onTabSwitch();
                  }
                  setIsSignIn(false);
                  clearMessages();
                }}
              >
                SIGN UP
              </button>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isSignIn && signUpEnabled ? (
            <>
              <div className="avatar-container">
                <button
                  type="button"
                  className="avatar-preview"
                  onClick={() => setShowAvatarSelector((value) => !value)}
                  aria-label="Select avatar"
                  aria-expanded={showAvatarSelector}
                >
                  {avatar ? (
                    <img src={avatar} alt="Selected avatar" />
                  ) : (
                    <div className="avatar-placeholder">User</div>
                  )}
                </button>

                {showAvatarSelector ? (
                  <div className="avatar-selector" ref={avatarSelectorRef}>
                    {avatarOptions.length === 0 ? <div>No avatars available</div> : null}
                    <div className="avatar-grid">
                      {avatarOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={`avatar-option ${avatar === option.url ? 'selected' : ''}`}
                          onClick={() => handleAvatarSelect(option.url)}
                          aria-label={`Select avatar ${option.id}`}
                        >
                          <img src={option.url} alt={`Avatar ${option.id}`} />
                        </button>
                      ))}
                      <button
                        type="button"
                        className="avatar-option upload-option"
                        onClick={handleUploadClick}
                        aria-label="Upload custom avatar"
                      >
                        <div className="upload-placeholder">+</div>
                        <div className="upload-text">Upload</div>
                      </button>
                    </div>
                    <label htmlFor="avatar-upload" hidden>
                      Upload avatar
                    </label>
                    <input
                      type="file"
                      id="avatar-upload"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </div>
                ) : null}
              </div>

              <div className="input-group">
                <input
                  type="text"
                  placeholder="Alias"
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  className="login-input"
                />
              </div>
            </>
          ) : null}

          <div className="input-group">
            <input
              type="email"
              placeholder={isSignIn ? 'Email' : 'Email (Username)'}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined });
                }
              }}
              className={`login-input ${validationErrors.email ? 'error' : ''}`}
              disabled={showForgotPassword || disableCredentials}
            />
            {validationErrors.email ? <div className="validation-error">{validationErrors.email}</div> : null}
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined });
                }
              }}
              className={`login-input ${validationErrors.password ? 'error' : ''}`}
              disabled={showForgotPassword || disableCredentials}
            />
            {validationErrors.password ? <div className="validation-error">{validationErrors.password}</div> : null}
            {isSignIn && !showForgotPassword && onSendPasswordReset && !disableCredentials ? (
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => {
                  setShowForgotPassword(true);
                  clearMessages();
                  setValidationErrors({});
                }}
              >
                Forgot Password?
              </button>
            ) : null}
          </div>

          {isSignIn && showForgotPassword ? (
            <div className="forgot-password-section">
              <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
              <button type="button" className="sign-in-button" onClick={handleForgotPassword} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button
                type="button"
                className="back-to-signin-button"
                onClick={() => {
                  setShowForgotPassword(false);
                  clearMessages();
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : null}

          {activeMessage ? <div className={`message-display ${activeMessage.kind}`}>{activeMessage.text}</div> : null}

          {!isSignIn && signUpEnabled ? (
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors({ ...validationErrors, confirmPassword: undefined });
                  }
                }}
                className={`login-input ${validationErrors.confirmPassword ? 'error' : ''}`}
              />
              {validationErrors.confirmPassword ? (
                <div className="validation-error">{validationErrors.confirmPassword}</div>
              ) : null}
            </div>
          ) : null}

          {!showForgotPassword ? (
            <button type="submit" className="sign-in-button" disabled={isLoading || disableCredentials}>
              {isLoading ? 'Loading...' : isSignIn || !signUpEnabled ? 'SIGN IN' : 'SIGN UP'}
            </button>
          ) : null}
        </form>

        {isSignIn && socialOptions.length > 0 ? (
          <>
            <div className="divider">
              <span>or Log in with</span>
            </div>

            <div className="social-login">
              <div className="social-buttons-container">
                {socialOptions.map((option) => (
                  <button
                    type="button"
                    key={option.key}
                    className="social-button"
                    onClick={() => {
                      if (option.handler) {
                        void handleSocialAuthResult(option.handler, option.error);
                      }
                    }}
                    disabled={isLoading || option.disabled}
                  >
                    <img src={option.icon} alt={option.alt} className="social-icon" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {secondaryActions.length > 0 ? (
          <div className="login-secondary-actions">
            {secondaryActions.map((action) => (
              <button
                type="button"
                key={action.label}
                className="login-secondary-button"
                onClick={() => {
                  void action.onClick();
                }}
                disabled={action.disabled || isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="login-footer-wrapper">
        <GameFooter appVersion={appVersion} />
      </div>
    </div>
  );
}
