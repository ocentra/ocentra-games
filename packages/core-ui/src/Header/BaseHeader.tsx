import type { ReactNode } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { AvatarInfo } from '../types/avatarInfo';
import { ProfileMenu } from './ProfileMenu';
import styles from './BaseHeader.module.css';

export interface BaseHeaderProps {
  user: UserProfile | null;
  onLogout?: () => void;
  showProfile?: boolean;
  leftContent?: ReactNode;
  centerContent: ReactNode;
  rightContent?: ReactNode;
  rightExtraContent?: ReactNode;
  rightSuffixContent?: ReactNode;
  titleBarDragRegion?: boolean;
  compact?: boolean;
  getImageUrl?: (url: string) => string;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
  onAdminDashboardClick?: () => void;
}

export function BaseHeader({
  user,
  onLogout,
  showProfile = true,
  leftContent,
  centerContent,
  rightContent,
  rightExtraContent,
  rightSuffixContent,
  titleBarDragRegion = false,
  compact = false,
  getImageUrl = (url) => url,
  onUpdatePhoto,
  getAvatars = async () => [],
  onAdminDashboardClick,
}: BaseHeaderProps) {
  return (
    <header className={styles.baseHeader} data-compact={compact ? 'true' : undefined}>
      <div className={styles.baseHeaderContainer}>
        <div className={styles.baseHeaderLeft} {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>
          {leftContent}
        </div>
        <div className={styles.baseHeaderCenter} {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>
          <div className={styles.baseHeaderCenterContent}>{centerContent}</div>
        </div>
        <div className={styles.baseHeaderRight}>
          <div className={styles.baseHeaderRightDrag} {...(titleBarDragRegion ? { 'data-tauri-drag-region': '' } : {})}>
            {rightExtraContent}
            {rightContent ?? (
              <ProfileMenu
                user={user}
                showProfile={showProfile}
                onLogout={onLogout}
                getImageUrl={getImageUrl}
                onUpdatePhoto={onUpdatePhoto}
                getAvatars={getAvatars}
                onAdminDashboardClick={onAdminDashboardClick}
              />
            )}
          </div>
          {rightSuffixContent}
        </div>
      </div>
    </header>
  );
}
