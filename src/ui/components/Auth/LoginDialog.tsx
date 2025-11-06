import React, { useState, useEffect, useRef } from 'react';
import './LoginDialog.css';
import facebookLogo from '../../../assets/Auth/facebook.png';
import googleLogo from '../../../assets/Auth/google.png';
import guestLogo from '../../../assets/Auth/annon.png';
import { handleRedirectResult } from '../../../services/firebaseService';
import { logAuth } from '../../../utils/logger';

const prefix = '[LoginDialog]';

// Auth flow logging flags
const LOG_AUTH_UI = false;          // UI interactions
const LOG_AUTH_REDIRECT = false;    // Redirect handling
const LOG_AUTH_ERROR = false;       // Error logging

interface LoginDialogProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<boolean>;
  onFacebookLogin: () => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
  onGuestLogin: () => Promise<boolean>;
  onTabSwitch?: () => void; // Add callback for tab switching
}

const LoginDialog: React.FC<LoginDialogProps> = ({
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
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
  const avatarSelectorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Dynamically import all avatars
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const modules = import.meta.glob('../../../assets/Avatars/*.png', { eager: true, query: '?url', import: 'default' });
        const avatarList = Object.entries(modules).map(([path, url]) => {
          const fileName = path.split('/').pop() || '';
          const id = parseInt(fileName.split('.')[0]);
          return { id, url: url as string };
        }).sort((a, b) => a.id - b.id);
        
        setAvatarOptions(avatarList);
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[useEffect] ❌ Failed to load avatars:', error);
        // Fallback to some default avatars if loading fails
        setAvatarOptions([
          { id: 1, url: '' },
          { id: 2, url: '' },
          { id: 3, url: '' },
        ]);
      }
    };

    loadAvatars();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignIn) {
      logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] Sign in form submitted:', { username });
      onLogin(username, password).then(success => {
        if (!success) {
          // Handle login failure
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleSubmit] ❌ Login failed');
        } else {
          logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] ✅ Login callback returned success');
        }
      });
    } else {
      logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] Sign up form submitted:', { 
        alias, 
        username, 
        hasAvatar: !!avatar 
      });
      // For sign up, you might want to add validation for matching passwords
      if (password !== confirmPassword) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleSubmit] ❌ Password mismatch');
        return;
      }
      onSignUp({ alias, avatar, username, password }).then(success => {
        if (!success) {
          // Handle sign up failure
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleSubmit] ❌ Sign up failed');
        } else {
          logAuth(LOG_AUTH_UI, 'log', prefix, '[handleSubmit] ✅ Sign up callback returned success');
        }
      });
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
                <div 
                  className="avatar-preview"
                  onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                >
                  {avatar ? (
                    <img src={avatar} alt="Selected avatar" />
                  ) : (
                    <div className="avatar-placeholder">👤</div>
                  )}
                </div>
                
                {showAvatarSelector && (
                  <div className="avatar-selector" ref={avatarSelectorRef}>
                    <div className="avatar-grid">
                      {avatarOptions.map((avatarOption) => (
                        <div 
                          key={avatarOption.id}
                          className={`avatar-option ${avatar === avatarOption.url ? 'selected' : ''}`}
                          onClick={() => handleAvatarSelect(avatarOption.url)}
                        >
                          {avatarOption.url ? (
                            <img src={avatarOption.url} alt={`Avatar ${avatarOption.id}`} />
                          ) : (
                            <div className="avatar-placeholder">👤</div>
                          )}
                        </div>
                      ))}
                      <div 
                        className="avatar-option upload-option"
                        onClick={handleUploadClick}
                      >
                        <div className="upload-placeholder">+</div>
                        <div className="upload-text">Upload</div>
                      </div>
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
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </div>
          
          {!isSignIn && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="login-input"
              />
            </div>
          )}
          
          <button type="submit" className="sign-in-button">
            {isSignIn ? 'SIGN IN' : 'SIGN UP'}
          </button>
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