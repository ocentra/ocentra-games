import React, { useState, useEffect, useRef } from 'react';
import './LoginDialog.css';
import {
  authAnnonImageUrl,
  authFacebookImageUrl,
  authGoogleImageUrl,
  authPhantomImageUrl,
  authMetaMaskImageUrl,
  authCoinbaseImageUrl,
} from '@ocentra/app-assets/auth';
import { avatarImageById } from '@ocentra/app-assets/avatars';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';

const AuthImages = {
  Social: { facebook: authFacebookImageUrl, google: authGoogleImageUrl, guest: authAnnonImageUrl },
  Wallets: { phantom: authPhantomImageUrl, metamask: authMetaMaskImageUrl, coinbase: authCoinbaseImageUrl },
} as const;
const AvatarImages = avatarImageById;
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { APP_VERSION } from '@/constants/version';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_AUTH_UI = false;
const LOG_AUTH_REDIRECT = false;
const LOG_AUTH_ERROR = false;

interface LoginDialogProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  onFacebookLogin: () => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: () => Promise<{ success: boolean; error?: string }>;
  onWalletLogin: () => Promise<{ success: boolean; error?: string }>;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  onTabSwitch?: () => void;
  adminRequired?: boolean;
  adminMessage?: string;
}

const LoginDialog: React.FC<LoginDialogProps> = ({
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
  onSendPasswordReset,
  onTabSwitch,
  adminRequired = false,
  adminMessage = 'You need to be an administrator to access this page. Please sign in with an admin account.'
}) => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<{id: number, url: string}[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const avatarSelectorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation helper
  const validatePassword = (password: string): string | undefined => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return undefined;
  };

  useEffect(() => {
    const checkRedirect = async () => {
      logInfo('Checking for redirect result on mount...', undefined, LOG_AUTH_REDIRECT);
      const { handleRedirectResult } = await import('@/adapters/firebase/service');
      const result = await handleRedirectResult();
      if (result.success) {
        logInfo('Login successful after redirect:', { 
          uid: result.user?.uid, 
          displayName: result.user?.displayName 
        }, LOG_AUTH_REDIRECT);
      } else {
        if (result.error && result.error !== 'No redirect result') {
          logError('Login failed after redirect:', result.error, LOG_AUTH_ERROR);
        } else {
          logInfo('No redirect result (normal if not returning from OAuth)', undefined, LOG_AUTH_REDIRECT);
        }
      }
    };

    checkRedirect();
  }, []);

  // Close avatar selector when clicking outside
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

  useEffect(() => {
    setIsLoadingAvatars(true);
    const avatarList = Object.entries(AvatarImages)
      .map(([key, url]) => ({
        id: parseInt(key, 10),
        url: url as string,
      }))
      .filter(avatar => avatar.id >= 1 && avatar.id <= 18)
      .sort((a, b) => a.id - b.id);
    logInfo('Loaded avatars:', avatarList.length, LOG_AUTH_UI);
    setAvatarOptions(avatarList);
    setIsLoadingAvatars(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setValidationErrors({});
    setIsLoading(true);

    // Client-side validation
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};

    // Validate email format
    if (!username) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(username)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Validate password
    if (!password) {
      errors.password = 'Password is required.';
    } else if (!isSignIn) {
      // For sign up, validate password strength
      const passwordError = validatePassword(password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    // Validate confirm password for sign up
    if (!isSignIn && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // If validation errors exist, show them and stop
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    if (isSignIn) {
      logInfo('Sign in form submitted:', { username }, LOG_AUTH_UI);
      try {
        const result = await onLogin(username, password);
        if (!result.success) {
          setErrorMessage(result.error || 'Login failed. Please check your credentials.');
        } else {
          logInfo('Login callback returned success', undefined, LOG_AUTH_UI);
        }
      } catch (error) {
        setErrorMessage('An error occurred. Please try again.');
        logError('Login exception:', error, LOG_AUTH_ERROR);
      } finally {
        setIsLoading(false);
      }
    } else {
      logInfo('Sign up form submitted:', { 
        alias, 
        username, 
        hasAvatar: !!avatar 
      }, LOG_AUTH_UI);
      try {
        const result = await onSignUp({ alias, avatar, username, password });
        if (!result.success) {
          setErrorMessage(result.error || 'Sign up failed. Please try again.');
        } else {
          logInfo('Sign up callback returned success', undefined, LOG_AUTH_UI);
        }
      } catch (error) {
        setErrorMessage('An error occurred. Please try again.');
        logError('Sign up exception:', error, LOG_AUTH_ERROR);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    setValidationErrors({});
    
    // Validate email format
    if (!username) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    
    if (!isValidEmail(username)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await onSendPasswordReset(username);
      if (result.success) {
        setSuccessMessage('Password reset email sent! Please check your inbox.');
        setShowForgotPassword(false);
      } else {
        setErrorMessage(result.error || 'Failed to send password reset email.');
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
      logError('Exception:', error, LOG_AUTH_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuthResult = async (
    action: () => Promise<{ success: boolean; error?: string }>,
    fallbackError: string
  ) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const result = await action();
      if (!result.success) {
        setErrorMessage(result.error || fallbackError);
      }
    } catch (error) {
      setErrorMessage(fallbackError);
      logError('Social auth action failed:', error, LOG_AUTH_ERROR);
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
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        logError('Please select an image file', undefined, LOG_AUTH_ERROR);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(img, 0, 0, 128, 128);
              
              const resizedImageData = canvas.toDataURL('image/png');
              setAvatar(resizedImageData);
              setShowAvatarSelector(false);
            }
          } catch (error) {
            logError('Error resizing image:', error, LOG_AUTH_ERROR);
          }
        };
        
        img.onerror = () => {
          logError('Error loading image', undefined, LOG_AUTH_ERROR);
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        logError('Error reading file', undefined, LOG_AUTH_ERROR);
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="login-dialog-overlay">
      {/* Logo and Branding - Outside dialog */}
      <div className="login-logo-section">
                  <img src={mlogoImageUrl} alt="Ocentra Logo" className="login-logo" />
        <h2 className="login-brand-text">Ocentra AI</h2>
        </div>

      <div className="login-dialog">
        {adminRequired && (
          <div className="admin-required-message">
            <div className="admin-required-icon">🔒</div>
            <p className="admin-required-text">{adminMessage}</p>
          </div>
        )}
        <div className="login-header">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${isSignIn ? 'active' : ''}`}
              onClick={() => {
                if (!isSignIn && onTabSwitch) {
                  logInfo('Switching to Sign In tab', undefined, LOG_AUTH_UI);
                  onTabSwitch(); // Trigger rotation when switching to Sign In
                }
                setIsSignIn(true);
              }}
            >
              SIGN IN
            </button>
            <button 
              className={`tab-button ${!isSignIn ? 'active' : ''}`}
              onClick={() => {
                if (isSignIn && onTabSwitch) {
                  logInfo('Switching to Sign Up tab', undefined, LOG_AUTH_UI);
                  onTabSwitch(); // Trigger rotation when switching to Sign Up
                }
                setIsSignIn(false);
              }}
            >
              SIGN UP
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {!isSignIn && (
            <>
              <div className="avatar-container">
                <button
                  type="button"
                  className="avatar-preview"
                  onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                  aria-label="Select avatar"
                  {...(showAvatarSelector ? { 'aria-expanded': true } : { 'aria-expanded': false })}
                >
                  {avatar ? (
                    <img src={avatar} alt="Selected avatar" />
                  ) : (
                    <div className="avatar-placeholder">👤</div>
                  )}
                </button>
                
                {showAvatarSelector && (
                  <div className="avatar-selector" ref={avatarSelectorRef}>
                    {isLoadingAvatars && (
                      <div className="avatar-loading">Loading avatars...</div>
                    )}
                    {!isLoadingAvatars && avatarOptions.length === 0 && (
                      <div className="avatar-error">No avatars available</div>
                    )}
                    <div className="avatar-grid">
                      {avatarOptions.map((avatarOption) => (
                        <button
                          type="button"
                          key={avatarOption.id}
                          className={`avatar-option ${avatar === avatarOption.url ? 'selected' : ''}`}
                          onClick={() => handleAvatarSelect(avatarOption.url)}
                          aria-label={`Select avatar ${avatarOption.id}`}
                        >
                          <img src={avatarOption.url} alt={`Avatar ${avatarOption.id}`} />
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
                    <label htmlFor="avatar-upload" className="sr-only">Upload avatar</label>
                    <input
                      type="file"
                      id="avatar-upload"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="sr-only"
                    />
                  </div>
                )}
              </div>
              
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="login-input"
                />
              </div>
            </>
          )}
          
          <div className="input-group">
            <input
              type="email"
              placeholder={isSignIn ? "Email" : "Email (Username)"}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined });
                }
              }}
              className={`login-input ${validationErrors.email ? 'error' : ''}`}
              disabled={showForgotPassword}
            />
            {validationErrors.email && (
              <div className="validation-error">
                {validationErrors.email}
              </div>
            )}
          </div>
          
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined });
                }
              }}
              className={`login-input ${validationErrors.password ? 'error' : ''}`}
              disabled={showForgotPassword}
            />
            {validationErrors.password && (
              <div className="validation-error">
                {validationErrors.password}
              </div>
            )}
            {isSignIn && !showForgotPassword && (
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => {
                  setShowForgotPassword(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                  setValidationErrors({});
                }}
              >
                Forgot Password?
              </button>
            )}
          </div>
          
          {isSignIn && showForgotPassword && (
            <div className="forgot-password-section">
              <p>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <button
                type="button"
                className="sign-in-button"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button
                type="button"
                className="back-to-signin-button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}
          
          {(errorMessage || successMessage) && (
            <div className={`message-display ${errorMessage ? 'error' : 'success'}`}>
              {errorMessage || successMessage}
            </div>
          )}
          
          {!isSignIn && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors({ ...validationErrors, confirmPassword: undefined });
                  }
                }}
                className={`login-input ${validationErrors.confirmPassword ? 'error' : ''}`}
              />
              {validationErrors.confirmPassword && (
                <div className="validation-error">
                  {validationErrors.confirmPassword}
                </div>
              )}
            </div>
          )}
          
          {!showForgotPassword && (
            <button type="submit" className="sign-in-button" disabled={isLoading}>
              {isLoading ? 'Loading...' : (isSignIn ? 'SIGN IN' : 'SIGN UP')}
            </button>
          )}
        </form>
        
        {isSignIn && (
          <>
            <div className="divider">
              <span>or Log in with</span>
            </div>
            
            <div className="social-login">
              <div className="social-buttons-container">
                <button 
                  type="button" 
                  className="social-button"
                  onClick={() => {
                    logInfo('Facebook login button clicked', undefined, LOG_AUTH_UI);
                    void handleSocialAuthResult(onFacebookLogin, 'Facebook login failed. Please try again.');
                  }}
                  disabled={isLoading}
                >
                  <img src={AuthImages.Social.facebook} alt="Facebook" className="social-icon" />
                </button>
                
                <button 
                  type="button" 
                  className="social-button"
                  onClick={() => {
                    logInfo('Google login button clicked', undefined, LOG_AUTH_UI);
                    void handleSocialAuthResult(onGoogleLogin, 'Google login failed. Please try again.');
                  }}
                  disabled={isLoading}
                >
                  <img src={AuthImages.Social.google} alt="Google" className="social-icon" />
                </button>
                
                <button 
                  type="button" 
                  className="social-button"
                  onClick={() => {
                    logInfo('Guest login button clicked', undefined, LOG_AUTH_UI);
                    void handleSocialAuthResult(onGuestLogin, 'Guest login failed. Please try again.');
                  }}
                  disabled={isLoading}
                >
                  <img src={AuthImages.Social.guest} alt="Guest" className="social-icon" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer - Outside dialog */}
      <div className="login-footer-wrapper">
        <GameFooter appVersion={APP_VERSION} />
      </div>
    </div>
  );
};

export default LoginDialog;
