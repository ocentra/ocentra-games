import {
  shopPage100AcImageUrl,
  shopPage1200AcImageUrl,
  shopPage3500AcImageUrl,
  shopPage500AcImageUrl,
  shopPageArenaPassImageUrl,
  shopPageAvatarsImageUrl,
  shopPageCardBackImageUrl,
  shopPageChampionPassImageUrl,
  shopPageCustomAcImageUrl,
  shopPageDecksImageUrl,
  shopPageEarnFreeAcImageUrl,
  shopPageEliteCrownImageUrl,
  shopPageEventBundleImageUrl,
  shopPageFacebookImageUrl,
  shopPageFeedbackImageUrl,
  shopPageFoundersLifetimeImageUrl,
  shopPageInviteFriendImageUrl,
  shopPageLinkedInImageUrl,
  shopPagePlayersAccessImageUrl,
  shopPagePrivateTableImageUrl,
  shopPageProfileFrameImageUrl,
  shopPageProfileFrameImageUrls,
  shopPagePublicTableImageUrl,
  shopPageQualifierEntryImageUrl,
  shopPageRoomChatImageUrl,
  shopPageSeasonPassImageUrl,
  shopPageShoppingCartImageUrl,
  shopPageTableThemesImageUrl,
  shopPageTreasuryImageUrl,
  shopPageVaultImageUrl,
  shopPageWeeklyCupImageUrl,
  shopPageWin3MatchesImageUrl,
  shopPageXLogoImageUrl,
} from '@ocentra/app-assets/shop-page';

const SHOP_PAGE_IMAGE_URL_BY_FILE_NAME: Record<string, string> = {
  '100AC.png': shopPage100AcImageUrl,
  '1200Ac.png': shopPage1200AcImageUrl,
  '3500AC.png': shopPage3500AcImageUrl,
  '500AC.png': shopPage500AcImageUrl,
  'ArenaPass.png': shopPageArenaPassImageUrl,
  'Avatars.png': shopPageAvatarsImageUrl,
  'cardback.png': shopPageCardBackImageUrl,
  'ChamPionPass.png': shopPageChampionPassImageUrl,
  'CustomAC.png': shopPageCustomAcImageUrl,
  'Decks.png': shopPageDecksImageUrl,
  'EarnFreeAC.png': shopPageEarnFreeAcImageUrl,
  'EliteCrown.png': shopPageEliteCrownImageUrl,
  'EventBundle.png': shopPageEventBundleImageUrl,
  'facebook.png': shopPageFacebookImageUrl,
  'feedback.png': shopPageFeedbackImageUrl,
  'FoundersLifetime.png': shopPageFoundersLifetimeImageUrl,
  'Invitefriend.png': shopPageInviteFriendImageUrl,
  'linked in.png': shopPageLinkedInImageUrl,
  'PlayersAccess.png': shopPagePlayersAccessImageUrl,
  'PrivateTable.png': shopPagePrivateTableImageUrl,
  'Profileframe.png': shopPageProfileFrameImageUrl,
  'ProfileFrame00.png': shopPageProfileFrameImageUrls[0],
  'ProfileFrame01.png': shopPageProfileFrameImageUrls[1],
  'ProfileFrame02.png': shopPageProfileFrameImageUrls[2],
  'ProfileFrame03.png': shopPageProfileFrameImageUrls[3],
  'ProfileFrame04.png': shopPageProfileFrameImageUrls[4],
  'PublicTable.png': shopPagePublicTableImageUrl,
  'QualifierEntry.png': shopPageQualifierEntryImageUrl,
  'RoomChat.png': shopPageRoomChatImageUrl,
  'Seasonpass.png': shopPageSeasonPassImageUrl,
  'Shopping cart.png': shopPageShoppingCartImageUrl,
  'TableThemes.png': shopPageTableThemesImageUrl,
  'Treasury.png': shopPageTreasuryImageUrl,
  'Vault.png': shopPageVaultImageUrl,
  'WeeklyCup.png': shopPageWeeklyCupImageUrl,
  'win3matches.png': shopPageWin3MatchesImageUrl,
  'Xlogo.png': shopPageXLogoImageUrl,
};

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveShopPageImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) return trimmed;
  const pathOnly = decodePath(trimmed.split(/[?#]/, 1)[0] ?? trimmed).replace(/\\/g, '/');
  const shopPageIndex = pathOnly.lastIndexOf('/ShopPage/');
  const fileName = shopPageIndex >= 0
    ? pathOnly.slice(shopPageIndex + '/ShopPage/'.length)
    : pathOnly.split('/').pop() ?? pathOnly;
  return SHOP_PAGE_IMAGE_URL_BY_FILE_NAME[fileName] ?? trimmed;
}
