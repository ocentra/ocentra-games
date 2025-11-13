import React, { useState, useEffect, useRef } from 'react';
import './LoginDialog.css';
import facebookLogo from '@assets/Auth/facebook.png';
import googleLogo from '@assets/Auth/google.png';
import guestLogo from '@assets/Auth/annon.png';
import { handleRedirectResult } from '@services';
import { logAuth } from '@lib/logging';

const prefix = '[LoginDialog]';

// Auth flow logging flags
const LOG_AUTH_UI = false;          // UI interactions
const LOG_AUTH_REDIRECT = false;    // Redirect handling
const LOG_AUTH_ERROR = false;       // Error logging

interface LoginDialogProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  onFacebookLogin: () => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: () => Promise<{ success: boolean; error?: string }>;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  onTabSwitch?: () => void; // Add callback for tab switching
}

const LoginDialog: React.FC<LoginDialogProps> = ({
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
  onSendPasswordReset,
  onTabSwitch // Destructure the new prop
}) => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<{id: number, url: string}[]>([]);
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
      logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[useEffect] Checking for redirect result on mount...');
      const result = await handleRedirectResult();
      if (result.success) {
        logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[useEffect] ✅ Login successful after redirect:', { 
          uid: result.user?.uid, 
          displayName: result.user?.displayName 
        });
      } else {
        if (result.error && result.error !== 'No redirect result') {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[useEffect] ❌ Login failed after redirect:', result.error);
        } else {
          logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[useEffect] No redirect result (normal if not returning from OAuth)');
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

  // Load avatars from shared constant (eagerly loaded, so instant)
  useEffect(() => {
    import('@constants/avatars').then(({ AVATARS }) => {
      const avatarList = AVATARS.map(avatar => ({
        id: avatar.id,
        url: avatar.path
      }));
      setAvatarOptions(avatarList);
    }).catch(error => {
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[useEffect] ❌ Failed to load avatars:', error);
    });
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
      logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] Sign in form submitted:', { username });
      try {
        const result = await onLogin(username, password);
        if (!result.success) {
          setErrorMessage(result.error || 'Login failed. Please check your credentials.');
        } else {
          logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] ✅ Login callback returned success');
        }
      } catch (error) {
        setErrorMessage('An error occurred. Please try again.');
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleSubmit] ❌ Login exception:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] Sign up form submitted:', { 
        alias, 
        username, 
        hasAvatar: !!avatar 
      });
      try {
        const result = await onSignUp({ alias, avatar, username, password });
        if (!result.success) {
          setErrorMessage(result.error || 'Sign up failed. Please try again.');
        } else {
          logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] ✅ Sign up callback returned success');
        }
      } catch (error) {
        setErrorMessage('An error occurred. Please try again.');
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleSubmit] ❌ Sign up exception:', error);
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
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleForgotPassword] ❌ Exception:', error);
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
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleFileSelect] ❌ Please select an image file');
        return;
      }

      // Resize the image to 256x256
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Create a canvas to resize the image
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Draw the image resized to 256x256
              ctx.drawImage(img, 0, 0, 256, 256);
              
              // Get the data URL of the resized image
              const resizedImageData = canvas.toDataURL('image/png');
              setAvatar(resizedImageData);
              setShowAvatarSelector(false);
            }
          } catch (error) {
            logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleFileSelect] ❌ Error resizing image:', error);
          }
        };
        
        img.onerror = () => {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleFileSelect] ❌ Error loading image');
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleFileSelect] ❌ Error reading file');
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="login-dialog-overlay">
      <div className="login-dialog">
        <div className="login-header">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${isSignIn ? 'active' : ''}`}
              onClick={() => {
                if (!isSignIn && onTabSwitch) {
                  logAuth(LOG_AUTH_UI, 'log', prefix, '[onClick] Switching to Sign In tab');
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
                  logAuth(LOG_AUTH_UI, 'log', prefix, '[onClick] Switching to Sign Up tab');
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
                  aria-expanded={showAvatarSelector}
                >
                  {avatar ? (
                    <img src={avatar} alt="Selected avatar" />
                  ) : (
                    <div className="avatar-placeholder">👤</div>
                  )}
                </button>
                
                {showAvatarSelector && (
                  <div className="avatar-selector" ref={avatarSelectorRef}>
                    <div className="avatar-grid">
                      {avatarOptions.map((avatarOption) => (
                        <button
                          type="button"
                          key={avatarOption.id}
                          className={`avatar-option ${avatar === avatarOption.url ? 'selected' : ''}`}
                          onClick={() => handleAvatarSelect(avatarOption.url)}
                          aria-label={`Select avatar ${avatarOption.id}`}
                        >
                          {avatarOption.url ? (
                            <img src={avatarOption.url} alt={`Avatar ${avatarOption.id}`} />
                          ) : (
                            <div className="avatar-placeholder">👤</div>
                          )}
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
                      style={{ display: 'none' }}
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
              <div style={{ color: '#c33', fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
              <div style={{ color: '#c33', fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  textAlign: 'right',
                  width: '100%',
                  textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            )}
          </div>
          
          {isSignIn && showForgotPassword && (
            <div className="forgot-password-section" style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <button
                type="button"
                className="sign-in-button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                style={{ marginBottom: '0.5rem' }}
              >
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  width: '100%',
                  textDecoration: 'underline'
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}
          
          {(errorMessage || successMessage) && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '4px',
                marginTop: '1rem',
                fontSize: '0.875rem',
                backgroundColor: errorMessage ? '#fee' : '#efe',
                color: errorMessage ? '#c33' : '#3c3',
                textAlign: 'center'
              }}
            >
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
                <div style={{ color: '#c33', fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
                    logAuth(LOG_AUTH_UI, 'log', prefix, '[onClick] Facebook login button clicked');
                    onFacebookLogin();
                  }}
                >
                  <img src={facebookLogo} alt="Facebook" className="social-icon" />
                </button>
                
                <button 
                  type="button" 
                  className="social-button"
                  onClick={() => {
                    logAuth(LOG_AUTH_UI, 'log', prefix, '[onClick] Google login button clicked');
                    onGoogleLogin();
                  }}
                >
                  <img src={googleLogo} alt="Google" className="social-icon" />
                </button>
                
                <button 
                  type="button" 
                  className="social-button"
                  onClick={() => {
                    logAuth(LOG_AUTH_UI, 'log', prefix, '[onClick] Guest login button clicked');
                    onGuestLogin();
                  }}
                >
                  <img src={guestLogo} alt="Guest" className="social-icon" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginDialog;