import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { AvatarInfo } from '../types/avatarInfo';
import './ProfilePictureModal.css';

export interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdatePhoto: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars: () => Promise<AvatarInfo[]>;
}

export function ProfilePictureModal({
  isOpen,
  onClose,
  user,
  onUpdatePhoto,
  getAvatars,
}: ProfilePictureModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatars, setAvatars] = useState<AvatarInfo[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);


  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsLoadingAvatars(true);
    }
  }

  useEffect(() => {
    if (isOpen) {
      getAvatars()
        .then((loaded) => {
          setAvatars(loaded);
          setIsLoadingAvatars(false);
        })
        .catch(() => {
          setAvatars([]);
          setIsLoadingAvatars(false);
        });
    }
  }, [isOpen, getAvatars]);


  if (!isOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 128, 128);
          setSelectedAvatar(canvas.toDataURL('image/png'));
        }
        setIsUploading(false);
      };
      img.onerror = () => setIsUploading(false);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setIsUploading(false);
    reader.readAsDataURL(file);
  };

  const convertImageToBase64 = (imagePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imagePath;
    });
  };

  const handleSetAvatar = async () => {
    if (!selectedAvatar || !user) return;
    setIsSaving(true);
    try {
      let avatarURL = selectedAvatar;
      if (selectedAvatar.startsWith('/src/assets/')) {
        avatarURL = await convertImageToBase64(selectedAvatar);
      }
      await onUpdatePhoto({ photoURL: avatarURL });
      setSelectedAvatar(null);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedAvatar(null);
    onClose();
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  const previewSrc =
    selectedAvatar ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`;

  return (
    <div
      className="profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <button
        type="button"
        className="profile-modal-backdrop"
        onClick={handleClose}
        onKeyDown={handleOverlayKeyDown}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2 id="profile-modal-title">Choose Your Avatar</h2>
          <button className="close-btn" onClick={handleClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="profile-modal-content">
          <div className="current-avatar-preview">
            <img src={previewSrc} alt="Selected Avatar" />
          </div>

          <div className="avatars-section">
            {isLoadingAvatars && <div>Loading avatars...</div>}
            <div className="avatars-grid">
              {avatars.length === 0 && !isLoadingAvatars && <div>No avatars available</div>}
              {avatars.map((avatar) => (
                <button
                  type="button"
                  key={avatar.id}
                  className={`avatar-option ${selectedAvatar === avatar.url ? 'selected' : ''} ${user?.photoURL === avatar.url ? 'current' : ''}`}
                  onClick={() => setSelectedAvatar(avatar.url)}
                  title={avatar.name}
                >
                  <img src={avatar.url} alt={avatar.name} />
                  {user?.photoURL === avatar.url && <div className="current-badge">Current</div>}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <label className="upload-btn">
              <span className="upload-icon">📁</span>
              <span>Upload Custom</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="file-input"
                disabled={isUploading || isSaving}
              />
            </label>
            <button
              className="set-avatar-btn"
              onClick={handleSetAvatar}
              disabled={!selectedAvatar || isSaving}
            >
              {isSaving ? 'Saving...' : 'Set Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
