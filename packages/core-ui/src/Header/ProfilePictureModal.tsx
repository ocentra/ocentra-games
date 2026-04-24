import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { UserProfile } from '@/types/userProfile';
import type { AvatarInfo } from '@/types/avatarInfo';
import styles from './ProfilePictureModal.module.css';

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
  const [avatars, setAvatars] = useState<AvatarInfo[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      let cancelled = false;

      void Promise.resolve(getAvatars())
        .then((loaded) => {
          if (!cancelled) {
            setAvatars(loaded);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAvatars([]);
          }
        });

      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, getAvatars]);

  if (!isOpen) return null;

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleOverlayKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  const previewSrc =
    selectedAvatar ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`;

  return (
    <div
      className={styles.profileModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <button
        type="button"
        className={styles.profileModalBackdrop}
        onClick={handleClose}
        onKeyDown={handleOverlayKeyDown}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div className={styles.profileModal}>
        <div className={styles.profileModalHeader}>
          <h2 id="profile-modal-title" className={styles.profileModalTitle}>
            Choose Your Avatar
          </h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className={styles.profileModalContent}>
          <div className={styles.currentAvatarPreview}>
            <img src={previewSrc} alt="Selected Avatar" />
          </div>

          <div className={styles.avatarsSection}>
            {avatars === null && <div>Loading avatars...</div>}
            <div className={styles.avatarsGrid}>
              {avatars !== null && avatars.length === 0 && <div>No avatars available</div>}
              {avatars?.map((avatar) => (
                <button
                  type="button"
                  key={avatar.id}
                  className={styles.avatarOption}
                  data-selected={selectedAvatar === avatar.url ? 'true' : undefined}
                  data-current={user?.photoURL === avatar.url ? 'true' : undefined}
                  onClick={() => setSelectedAvatar(avatar.url)}
                  title={avatar.name}
                >
                  <img src={avatar.url} alt={avatar.name} />
                  {user?.photoURL === avatar.url && <div className={styles.currentBadge}>Current</div>}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <label className={styles.uploadButton}>
              <span className={styles.uploadIcon}>📁</span>
              <span>Upload Custom</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className={styles.fileInput}
                disabled={isUploading || isSaving}
              />
            </label>
            <button
              type="button"
              className={styles.setAvatarButton}
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
