import Avatar1 from './images/avatars/1.png';
import Avatar2 from './images/avatars/2.png';
import Avatar3 from './images/avatars/3.png';
import Avatar4 from './images/avatars/4.png';
import Avatar5 from './images/avatars/5.png';
import Avatar6 from './images/avatars/6.png';
import Avatar7 from './images/avatars/7.png';
import Avatar8 from './images/avatars/8.png';
import Avatar9 from './images/avatars/9.png';
import Avatar10 from './images/avatars/10.png';
import Avatar11 from './images/avatars/11.png';
import Avatar12 from './images/avatars/12.png';
import Avatar13 from './images/avatars/13.png';
import Avatar14 from './images/avatars/14.png';
import Avatar15 from './images/avatars/15.png';
import Avatar16 from './images/avatars/16.png';
import Avatar17 from './images/avatars/17.png';
import Avatar18 from './images/avatars/18.png';

export const avatarImageById = {
  1: Avatar1,
  2: Avatar2,
  3: Avatar3,
  4: Avatar4,
  5: Avatar5,
  6: Avatar6,
  7: Avatar7,
  8: Avatar8,
  9: Avatar9,
  10: Avatar10,
  11: Avatar11,
  12: Avatar12,
  13: Avatar13,
  14: Avatar14,
  15: Avatar15,
  16: Avatar16,
  17: Avatar17,
  18: Avatar18,
} as const;

export const avatarImageUrls = Object.values(avatarImageById);

export const defaultAvatarImageUrl = avatarImageById[1];

export function getAvatarImageUrl(id: number): string | null {
  return avatarImageById[id as keyof typeof avatarImageById] ?? null;
}
