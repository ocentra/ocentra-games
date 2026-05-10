import AiVsHumanImage from './images/LobbyPlaceholders/AIvsHuman.png';
import AiCoachImage from './images/LobbyPlaceholders/AI_Coach.png';
import AiShowdownImage from './images/LobbyPlaceholders/AI_Showdown.png';
import CasualImage from './images/LobbyPlaceholders/Casual.png';
import HighStakeImage from './images/LobbyPlaceholders/High_Stake.png';
import MasterImage from './images/LobbyPlaceholders/Master.png';
import RankedImage from './images/LobbyPlaceholders/Ranked.png';

export const lobbyPlaceholderImageByKey = {
  master: MasterImage,
  aiShowdown: AiShowdownImage,
  aiVsHuman: AiVsHumanImage,
  aiCoach: AiCoachImage,
  highStake: HighStakeImage,
  ranked: RankedImage,
  casual: CasualImage,
} as const;

export type LobbyPlaceholderImageKey = keyof typeof lobbyPlaceholderImageByKey;

export const lobbyPlaceholderImageUrls = Object.values(lobbyPlaceholderImageByKey);

export function getLobbyPlaceholderImageUrl(key: LobbyPlaceholderImageKey): string {
  return lobbyPlaceholderImageByKey[key];
}
