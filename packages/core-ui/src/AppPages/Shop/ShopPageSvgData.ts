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
import {
  banner1v1ImageUrl,
  bannerAIBenchmarkingImageUrl,
  bannerEverythingOnChainImageUrl,
  bannerFairplayGuaranteedImageUrl,
  bannerGlobalLeaderboardImageUrl,
  bannerIntelligentAIImageUrl,
  bannerPlayAnywhereImageUrl,
  bannerPlayYourWayImageUrl,
  bannerProvablyFairImageUrl,
  bannerRewardingEconomyImageUrl,
  bannerSolanaPoweredImageUrl,
  bannerTrackYourProgressImageUrl,
  bannerTrueMultiplayerImageUrl,
  bannerWalletFreedomImageUrl,
} from '@ocentra/app-assets/banners';
import type { ShopProduct, ShopTab } from './ShopPageSvgTypes';

export type ShopTone = 'cyan' | 'gold' | 'violet' | 'green' | 'orange' | 'silver' | 'danger';
export type ShopIcon = 'coins' | 'crown' | 'chest' | 'cards' | 'trophy' | 'crate' | 'shield' | 'link' | 'lock' | 'cart';

export type ShopSideItem = {
  key: ShopTab;
  title: string;
  subtitle: string;
  icon: ShopIcon;
  tone: ShopTone;
  imageUrl: string;
};

export type ShopStaticItem = {
  title: string;
  subtitle: string;
  tone: ShopTone;
  icon: ShopIcon;
  badge?: string;
  imageUrl: string;
  price?: string;
  benefits?: string[];
};

export type ShopSection = {
  title: string;
  subtitle: string;
  footerTitle: string;
  footerItems: string[];
  categories?: ShopStaticItem[];
  featured?: ShopStaticItem[];
};

export type ShopVaultShowcaseGroup = {
  key: string;
  title: string;
  subtitle: string;
  tone: ShopTone;
  icon: ShopIcon;
  badge?: string;
  heroImageUrl: string;
  items: ShopStaticItem[];
};

export type ShopPreviewRow = {
  title: string;
  tab: ShopTab | 'Earn Free AC';
  subtitle: string;
  items: string[];
  accent: string;
  imageUrls: string[];
};

export type ShopQuest = {
  key: string;
  group: string;
  title: string;
  reward: string;
  cadence: string;
  tone: ShopTone;
  icon: ShopIcon;
  action: string;
  imageUrl: string;
  description: string;
  details: string[];
};

export type ShopRightTab = {
  id: 'account' | 'wallet' | 'pass' | 'events' | 'recent';
  title: string;
  accent: string;
};

const SHOP_PLAY_ACCESS_CORE_CARDS: ShopStaticItem[] = [
  {
    title: 'Private Tables',
    subtitle: 'Invite-only rooms with host control.',
    tone: 'cyan',
    icon: 'lock',
    badge: 'CORE',
    imageUrl: shopPagePrivateTableImageUrl,
    benefits: ['Create protected rooms.', 'Set room rules.', 'Invite selected players.'],
  },
  {
    title: 'Public Tables',
    subtitle: 'Open tables visible to active players.',
    tone: 'green',
    icon: 'cards',
    imageUrl: shopPagePublicTableImageUrl,
    benefits: ['Let players find open tables.', 'Support quick joins.', 'Keep active play discoverable.'],
  },
  {
    title: 'Guest Invites',
    subtitle: 'Shareable links for quick table entry.',
    tone: 'orange',
    icon: 'link',
    imageUrl: shopPageInviteFriendImageUrl,
    benefits: ['Bring guests into rooms.', 'Share a direct table link.', 'Keep entry state clear.'],
  },
  {
    title: 'Room Chat',
    subtitle: 'Table-side messages for room context.',
    tone: 'silver',
    icon: 'crate',
    imageUrl: shopPageRoomChatImageUrl,
    benefits: ['Keep messages tied to rooms.', 'Support table context.', 'Preserve player communication flow.'],
  },
  {
    title: 'Club Rooms',
    subtitle: 'Persistent spaces for trusted groups.',
    tone: 'gold',
    icon: 'crown',
    imageUrl: shopPagePlayersAccessImageUrl,
    benefits: ['Support recurring groups.', 'Prepare persistent room access.', 'Keep trusted tables grouped.'],
  },
];

const SHOP_PLAY_ACCESS_BANNER_CARDS: ShopStaticItem[] = [
  {
    title: '1v1 Tables',
    subtitle: 'Direct head-to-head table access for focused matches.',
    tone: 'cyan',
    icon: 'cards',
    badge: 'DUEL',
    imageUrl: banner1v1ImageUrl,
    benefits: ['Host direct matches.', 'Keep the room focused.', 'Works with private or public discovery.'],
  },
  {
    title: 'True Multiplayer',
    subtitle: 'Live rooms built around real players and table presence.',
    tone: 'green',
    icon: 'cards',
    badge: 'LIVE',
    imageUrl: bannerTrueMultiplayerImageUrl,
    benefits: ['Join active rooms.', 'See player presence.', 'Keep gameplay tied to the table.'],
  },
  {
    title: 'Play Your Way',
    subtitle: 'Choose the mode, entry style, and room rules that fit the table.',
    tone: 'violet',
    icon: 'crate',
    badge: 'MODES',
    imageUrl: bannerPlayYourWayImageUrl,
    benefits: ['Support different room modes.', 'Keep table setup flexible.', 'Match access to the game style.'],
  },
  {
    title: 'Play Anywhere',
    subtitle: 'Access tables across browser, desktop, and mobile surfaces.',
    tone: 'silver',
    icon: 'link',
    badge: 'CROSS',
    imageUrl: bannerPlayAnywhereImageUrl,
    benefits: ['Continue across devices.', 'Keep access portable.', 'Support web and app entry points.'],
  },
  {
    title: 'Intelligent AI',
    subtitle: 'Practice and benchmark against AI-assisted room experiences.',
    tone: 'orange',
    icon: 'shield',
    badge: 'AI',
    imageUrl: bannerIntelligentAIImageUrl,
    benefits: ['Train against AI tables.', 'Support assisted practice.', 'Prepare before competitive rooms.'],
  },
  {
    title: 'AI Benchmarking',
    subtitle: 'Compare AI runs, table behavior, and training progress.',
    tone: 'cyan',
    icon: 'trophy',
    badge: 'BENCH',
    imageUrl: bannerAIBenchmarkingImageUrl,
    benefits: ['Review AI table output.', 'Track benchmark sessions.', 'Compare play quality over time.'],
  },
  {
    title: 'Solana Powered',
    subtitle: 'Optional chain-backed proof surfaces for stronger room trust.',
    tone: 'violet',
    icon: 'shield',
    badge: 'CHAIN',
    imageUrl: bannerSolanaPoweredImageUrl,
    benefits: ['Attach proof when needed.', 'Support verified access.', 'Keep chain proof optional.'],
  },
  {
    title: 'Everything On Chain',
    subtitle: 'High-trust event and reward surfaces can expose chain state.',
    tone: 'gold',
    icon: 'link',
    badge: 'PROOF',
    imageUrl: bannerEverythingOnChainImageUrl,
    benefits: ['Show verifiable state.', 'Support event proofing.', 'Keep rewards auditable.'],
  },
  {
    title: 'Provably Fair',
    subtitle: 'Room access can surface fairness expectations before play.',
    tone: 'green',
    icon: 'shield',
    badge: 'FAIR',
    imageUrl: bannerProvablyFairImageUrl,
    benefits: ['Expose fair-play proof.', 'Set room expectations.', 'Support competitive confidence.'],
  },
  {
    title: 'Fairplay Guaranteed',
    subtitle: 'Competitive rooms stay clear about rules, entry, and trust.',
    tone: 'cyan',
    icon: 'lock',
    badge: 'SAFE',
    imageUrl: bannerFairplayGuaranteedImageUrl,
    benefits: ['Make table rules visible.', 'Reduce room ambiguity.', 'Protect competitive sessions.'],
  },
  {
    title: 'Rewarding Economy',
    subtitle: 'Play access can connect rooms to rewards, passes, and AC flows.',
    tone: 'gold',
    icon: 'coins',
    badge: 'AC',
    imageUrl: bannerRewardingEconomyImageUrl,
    benefits: ['Connect play to rewards.', 'Support pass-linked rooms.', 'Keep economy actions discoverable.'],
  },
  {
    title: 'Global Leaderboard',
    subtitle: 'Tables can connect to rankings, seasons, and public standings.',
    tone: 'orange',
    icon: 'trophy',
    badge: 'RANK',
    imageUrl: bannerGlobalLeaderboardImageUrl,
    benefits: ['Surface competitive rank.', 'Connect tables to standings.', 'Support seasonal play.'],
  },
  {
    title: 'Track Your Progress',
    subtitle: 'Keep table access tied to account progress and milestones.',
    tone: 'silver',
    icon: 'crown',
    badge: 'STATS',
    imageUrl: bannerTrackYourProgressImageUrl,
    benefits: ['Track account progress.', 'Show milestones.', 'Make room history useful.'],
  },
  {
    title: 'Wallet Freedom',
    subtitle: 'Wallet-linked access stays portable and clear across rooms.',
    tone: 'green',
    icon: 'lock',
    badge: 'WALLET',
    imageUrl: bannerWalletFreedomImageUrl,
    benefits: ['Support wallet-linked state.', 'Keep access portable.', 'Make ownership clear.'],
  },
];

export const SHOP_TABS: ShopTab[] = [
  'Treasury',
  'Elite',
  'Vault',
  'Play Access',
  'Events',
];

export const SHOP_HEADER_STATS = [
  { label: 'Owned', value: '128' },
  { label: 'Tables', value: '4 / 6' },
  { label: 'Tickets', value: '3' },
  { label: 'Events', value: '2' },
];

export const SHOP_SIDE_ITEMS: ShopSideItem[] = [
  { key: 'Treasury', title: 'TREASURY', subtitle: 'Buy Arena Credits', icon: 'coins', tone: 'cyan', imageUrl: shopPageTreasuryImageUrl },
  { key: 'Elite', title: 'ELITE', subtitle: 'Premium Passes', icon: 'crown', tone: 'gold', imageUrl: shopPageEliteCrownImageUrl },
  { key: 'Vault', title: 'VAULT', subtitle: 'Cosmetics & Inventory', icon: 'chest', tone: 'orange', imageUrl: shopPageVaultImageUrl },
  { key: 'Play Access', title: 'PLAY ACCESS', subtitle: 'Premium Gameplay', icon: 'cards', tone: 'silver', imageUrl: shopPagePlayersAccessImageUrl },
  { key: 'Events', title: 'EVENTS', subtitle: 'Tickets & Competitions', icon: 'trophy', tone: 'gold', imageUrl: shopPageEventBundleImageUrl },
];

export const SHOP_SECTIONS: Record<ShopTab, ShopSection> = {
  Treasury: {
    title: 'TREASURY',
    subtitle: 'Buy Arena Credits for tools, cosmetics, events, and premium play.',
    footerTitle: 'Use Arena Credits for:',
    footerItems: ['AI Analysis', 'Premium Tools', 'Cosmetics', 'Tournament Entry', 'Season Pass', 'Play Access'],
  },
  Elite: {
    title: 'ELITE',
    subtitle: 'More tools, more access, more rewards for serious competitive play.',
    footerTitle: 'Pass benefits:',
    footerItems: ['Monthly AC', 'Private rooms', 'Extra tables', 'AI analysis', 'Season drops', 'Premium themes'],
  },
  Vault: {
    title: 'VAULT',
    subtitle: 'Collect, equip, and preview cosmetics that personalize your table presence.',
    footerTitle: 'Vault states:',
    footerItems: ['Owned', 'Equipped', 'New', 'Limited', 'Seasonal', 'Claim-themed'],
    categories: [
      { title: 'Decks', subtitle: 'Featured deck styles and sale drops.', tone: 'gold', icon: 'cards', badge: 'SALE', imageUrl: shopPageDecksImageUrl },
      { title: 'Card Backs', subtitle: 'Animated card identities and signature backs.', tone: 'violet', icon: 'cards', badge: 'FEATURED', imageUrl: shopPageCardBackImageUrl },
      { title: 'Table Themes', subtitle: 'Room surfaces and competitive table moods.', tone: 'green', icon: 'crate', imageUrl: shopPageTableThemesImageUrl },
      { title: 'Profile Frames', subtitle: 'Ranked identity and founder frame slots.', tone: 'cyan', icon: 'shield', badge: 'NEW', imageUrl: shopPageProfileFrameImageUrl },
      { title: 'Avatars', subtitle: 'Player identity for table presence.', tone: 'orange', icon: 'crown', imageUrl: shopPageAvatarsImageUrl },
    ],
    featured: [
      { title: 'Deck Sale Drop', subtitle: 'Limited deck bundle for the Vault.', tone: 'gold', icon: 'cards', badge: 'SALE', price: '300 AC', imageUrl: shopPageDecksImageUrl },
      { title: 'Neon Card Back Set', subtitle: 'Premium animated card identity', tone: 'violet', icon: 'cards', badge: 'LIVE', price: '250 AC', imageUrl: shopPageCardBackImageUrl },
      { title: 'Royal Table Theme', subtitle: 'High-contrast competitive table style', tone: 'green', icon: 'crate', price: '500 AC', imageUrl: shopPageTableThemesImageUrl },
      { title: 'Founder Profile Frame', subtitle: 'Ranked identity and founder frame.', tone: 'cyan', icon: 'shield', badge: 'NEW', price: '750 AC', imageUrl: shopPageProfileFrameImageUrl },
      { title: 'Avatar Pack', subtitle: 'Identity bundle with table reactions.', tone: 'orange', icon: 'crown', price: '400 AC', imageUrl: shopPageAvatarsImageUrl },
    ],
  },
  'Play Access': {
    title: 'PLAY ACCESS',
    subtitle: 'Ways to host, discover, invite, verify, and talk inside Ocentra play spaces.',
    footerTitle: 'Access unlocks:',
    footerItems: ['Private tables', 'Public tables', 'Guest invites', 'Room chat', 'Club rooms', 'Chain proof'],
    categories: [...SHOP_PLAY_ACCESS_CORE_CARDS, ...SHOP_PLAY_ACCESS_BANNER_CARDS],
    featured: [...SHOP_PLAY_ACCESS_CORE_CARDS, ...SHOP_PLAY_ACCESS_BANNER_CARDS],
  },
  Events: {
    title: 'EVENTS',
    subtitle: 'Structured competitive products for tournaments, seasons, ladders, and qualifiers.',
    footerTitle: 'Event states:',
    footerItems: ['Open', 'Upcoming', 'Ticket owned', 'Season active', 'Locked', 'Details ready'],
    categories: [
      { title: 'Weekly Claim Cup', subtitle: 'Weekly bracket entry and standings.', tone: 'gold', icon: 'trophy', badge: 'OPEN', imageUrl: '' },
      { title: 'Season Pass', subtitle: 'Reward track and season identity.', tone: 'violet', icon: 'crown', imageUrl: '' },
      { title: 'Premium Queue', subtitle: 'Structured ranked access.', tone: 'cyan', icon: 'cards', badge: 'NEW', imageUrl: '' },
      { title: 'Qualifier Entry', subtitle: 'Path into high-stakes finals.', tone: 'orange', icon: 'shield', imageUrl: '' },
    ],
    featured: [
      { title: 'Event Ticket Pack', subtitle: 'Entry bundle for weekly events', tone: 'gold', icon: 'trophy', price: '250 AC', imageUrl: shopPageEventBundleImageUrl },
      { title: 'Season Reward Track', subtitle: 'Progression rewards and identity drops', tone: 'violet', icon: 'crown', price: '900 AC', imageUrl: shopPageSeasonPassImageUrl },
      { title: 'Qualifier Bundle', subtitle: 'Entry token plus preparation access', tone: 'orange', icon: 'shield', price: '1200 AC', imageUrl: shopPageQualifierEntryImageUrl },
      { title: 'Weekend Cup Entry', subtitle: 'Single event access with rewards', tone: 'cyan', icon: 'cards', price: '300 AC', imageUrl: shopPageWeeklyCupImageUrl },
    ],
  },
};

export const SHOP_VAULT_SHOWCASE_GROUPS: ShopVaultShowcaseGroup[] = [
  {
    key: 'decks',
    title: 'Decks',
    subtitle: 'Digital table decks and printable deck bundles.',
    tone: 'gold',
    icon: 'cards',
    badge: 'SALE',
    heroImageUrl: shopPageDecksImageUrl,
    items: [
      { title: 'Claim Deck', subtitle: 'Full deck art preview with digital and printable entitlement.', tone: 'gold', icon: 'cards', badge: 'DIGITAL', price: 'Digital + Printable', imageUrl: shopPageDecksImageUrl, benefits: ['Preview the deck art before checkout.', 'Unlock digital table use.', 'Printable files can be attached when the deck asset is published.'] },
      { title: 'Classic Card Deck', subtitle: 'Standard card deck drop for broad card-game support.', tone: 'cyan', icon: 'cards', badge: 'CORE', price: 'Digital + Printable', imageUrl: shopPageDecksImageUrl, benefits: ['Catalog-backed deck slot.', 'Reusable across card-game layouts.', 'Printable bundle ready once source deck art is attached.'] },
      { title: 'Tournament Deck', subtitle: 'Competitive deck presentation for events and ranked rooms.', tone: 'violet', icon: 'trophy', badge: 'EVENT', price: 'Digital + Printable', imageUrl: shopPageDecksImageUrl, benefits: ['Event-facing deck identity.', 'Digital room entitlement.', 'Printable event table bundle placeholder.'] },
      { title: 'Founder Deck Drop', subtitle: 'Founder-styled deck treatment for limited vault sales.', tone: 'orange', icon: 'shield', badge: 'LIMITED', price: 'Digital + Printable', imageUrl: shopPageDecksImageUrl, benefits: ['Limited visual treatment.', 'Founder vault showcase slot.', 'Full deck viewer can attach to the published deck asset.'] },
      { title: 'Custom Deck Slot', subtitle: 'Reserved space for the next asset-backed deck release.', tone: 'silver', icon: 'crate', badge: 'NEXT', price: 'Coming Soon', imageUrl: shopPageDecksImageUrl, benefits: ['Keep the marketplace layout ready.', 'Attach source deck art when available.', 'Preview stays clear until the product is live.'] },
    ],
  },
  {
    key: 'card-backs',
    title: 'Card Backs',
    subtitle: 'Signature backs and animated identities.',
    tone: 'violet',
    icon: 'cards',
    badge: 'SOON',
    heroImageUrl: shopPageCardBackImageUrl,
    items: [
      { title: 'Ocentra Card Back', subtitle: 'Default branded card back for table play.', tone: 'violet', icon: 'cards', badge: 'DEFAULT', price: 'Free', imageUrl: shopPageCardBackImageUrl, benefits: ['Free account identity option.', 'Works as the current default back.', 'More card backs can drop into this grid.'] },
      { title: 'Neon Back Drop', subtitle: 'Animated card back sale slot.', tone: 'cyan', icon: 'cards', badge: 'SOON', price: 'Coming Soon', imageUrl: shopPageCardBackImageUrl, benefits: ['Coming soon marketplace slot.', 'Prepared for animated art.', 'Can use the same large preview detail surface.'] },
      { title: 'Founder Back', subtitle: 'Limited founder identity slot.', tone: 'gold', icon: 'shield', badge: 'LIMITED', price: 'Coming Soon', imageUrl: shopPageCardBackImageUrl, benefits: ['Reserved founder collectible slot.', 'No placeholder copy in the preview card.', 'Asset can be swapped without layout churn.'] },
      { title: 'Season Back', subtitle: 'Seasonal reward card back slot.', tone: 'green', icon: 'trophy', badge: 'REWARD', price: 'Coming Soon', imageUrl: shopPageCardBackImageUrl, benefits: ['Season reward compatible.', 'Claimable state can replace price later.', 'Keeps the card-back grid structured.'] },
    ],
  },
  {
    key: 'table-themes',
    title: 'Table Themes',
    subtitle: 'Room surfaces and table moods.',
    tone: 'green',
    icon: 'crate',
    badge: 'DEFAULT',
    heroImageUrl: shopPageTableThemesImageUrl,
    items: [
      { title: 'Default Table', subtitle: 'Current Ocentra table theme.', tone: 'green', icon: 'crate', badge: 'ACTIVE', price: 'Free', imageUrl: shopPageTableThemesImageUrl, benefits: ['Included for all players.', 'Acts as the current table theme baseline.', 'Future theme art can slot into this grid.'] },
      { title: 'Tournament Table', subtitle: 'Competitive table theme sale slot.', tone: 'cyan', icon: 'trophy', badge: 'SOON', price: 'Coming Soon', imageUrl: shopPageTableThemesImageUrl, benefits: ['Event-oriented table mood.', 'Prepared for tournament room styling.', 'No product wiring until the theme exists.'] },
      { title: 'Club Table', subtitle: 'Persistent group room theme slot.', tone: 'gold', icon: 'crown', badge: 'SOON', price: 'Coming Soon', imageUrl: shopPageTableThemesImageUrl, benefits: ['Designed for club rooms.', 'Can become a group entitlement.', 'Uses the same detail surface when live.'] },
      { title: 'Night Table', subtitle: 'High-contrast table mood placeholder.', tone: 'violet', icon: 'shield', badge: 'SOON', price: 'Coming Soon', imageUrl: shopPageTableThemesImageUrl, benefits: ['Reserved for a darker table style.', 'Keeps the theme catalog visually ready.', 'Swap in final art when exported.'] },
    ],
  },
  {
    key: 'frames',
    title: 'Profile Frames',
    subtitle: 'Ranked identity and account borders.',
    tone: 'cyan',
    icon: 'shield',
    badge: 'NEW',
    heroImageUrl: shopPageProfileFrameImageUrl,
    items: shopPageProfileFrameImageUrls.map((imageUrl, index) => ({
      title: `Profile Frame ${index + 1}`,
      subtitle: 'Free profile identity frame.',
      tone: ['cyan', 'gold', 'violet', 'orange', 'green'][index] as ShopTone,
      icon: 'shield',
      badge: 'FREE',
      price: 'Free',
      imageUrl,
      benefits: ['Free account identity frame.', 'Selectable profile presence item.', 'Can be wired to equipped state later.'],
    })),
  },
  {
    key: 'avatars',
    title: 'Avatars',
    subtitle: 'Free identity options for player presence.',
    tone: 'orange',
    icon: 'crown',
    badge: 'FREE',
    heroImageUrl: shopPageAvatarsImageUrl,
    items: [
      { title: 'Starter Avatar', subtitle: 'Free player identity option.', tone: 'orange', icon: 'crown', badge: 'FREE', price: 'Free', imageUrl: shopPageAvatarsImageUrl, benefits: ['Free identity item.', 'No checkout required.', 'Can be equipped from inventory later.'] },
      { title: 'Champion Avatar', subtitle: 'Competitive identity option.', tone: 'violet', icon: 'trophy', badge: 'FREE', price: 'Free', imageUrl: shopPageAvatarsImageUrl, benefits: ['Free showcase item for now.', 'Can become pass-linked later.', 'Uses the avatar PNG without extra box art.'] },
      { title: 'Event Avatar', subtitle: 'Event-facing identity option.', tone: 'cyan', icon: 'shield', badge: 'FREE', price: 'Free', imageUrl: shopPageAvatarsImageUrl, benefits: ['Free event identity slot.', 'Prepared for future event avatars.', 'No purchase state needed yet.'] },
      { title: 'Founder Avatar', subtitle: 'Reserved founder avatar slot.', tone: 'gold', icon: 'crown', badge: 'FREE', price: 'Free', imageUrl: shopPageAvatarsImageUrl, benefits: ['Free placeholder until final founder avatar art exists.', 'Can become account-bound later.', 'Keeps avatar grid visible.'] },
    ],
  },
];

export const SHOP_STATIC_CREDIT_PACKS: ShopStaticItem[] = [
  { title: '100 AC', subtitle: 'Starter refill for tools and small items', tone: 'cyan', icon: 'coins', price: '$0.99 USD', imageUrl: shopPage100AcImageUrl },
  { title: '500 AC', subtitle: 'Popular pack for active players', tone: 'green', icon: 'coins', badge: 'Popular', price: '$4.99 USD', imageUrl: shopPage500AcImageUrl },
  { title: '1500 AC', subtitle: 'Best value for events and vault drops', tone: 'violet', icon: 'chest', badge: 'Best Value', price: '$9.99 USD', imageUrl: shopPage1200AcImageUrl },
  { title: '3000 AC', subtitle: 'Season top-up for competitive play', tone: 'orange', icon: 'crate', badge: 'Most Value', price: '$24.99 USD', imageUrl: shopPage3500AcImageUrl },
  { title: 'Custom AC', subtitle: 'Choose any Arena Credit top-up amount', tone: 'silver', icon: 'coins', badge: 'Custom', price: 'Top Up', imageUrl: shopPageCustomAcImageUrl },
];

export const SHOP_STATIC_PASSES: ShopStaticItem[] = [
  {
    title: 'Arena Pass',
    subtitle: 'Everything you need to compete.',
    tone: 'cyan',
    icon: 'crown',
    badge: 'Popular',
    price: '$4.99 /month',
    imageUrl: shopPageArenaPassImageUrl,
    benefits: ['500 AC monthly', 'Premium table themes', 'Private rooms (2)', 'Extra active tables (+2)', 'Saved async games (10)', 'Basic AI analysis', 'Seasonal drops'],
  },
  {
    title: 'Champion Pass',
    subtitle: 'Built for serious competitors.',
    tone: 'violet',
    icon: 'trophy',
    badge: 'Best Value',
    price: '$9.99 /month',
    imageUrl: shopPageChampionPassImageUrl,
    benefits: ['1,500 AC monthly', 'Premium table themes', 'Private rooms', 'Extra active tables (+4)', 'Saved async games (25)', 'Advanced AI analysis', 'Priority matchmaking', 'Monthly event ticket'],
  },
  {
    title: 'Founder Lifetime',
    subtitle: 'One-time. Forever legendary.',
    tone: 'gold',
    icon: 'shield',
    badge: 'Limited',
    price: '$199.99',
    imageUrl: shopPageFoundersLifetimeImageUrl,
    benefits: ['5,000 AC one-time', 'All premium themes', 'Private rooms unlimited', 'Extra active tables unlimited', 'Saved async games unlimited', 'Advanced AI analysis', 'Priority matchmaking', 'Founder badge and frame'],
  },
];

export const SHOP_MARKETPLACE_CART_IMAGE_URL = shopPageShoppingCartImageUrl;
export const SHOP_EARN_FREE_AC_IMAGE_URL = shopPageEarnFreeAcImageUrl;

export const SHOP_PREVIEWS: ShopPreviewRow[] = [
  { title: 'TREASURY PREVIEW', tab: 'Treasury', subtitle: 'Arena Credits and balance packs', items: ['100 AC', '500 AC', '1500 AC', '3000 AC', 'Custom'], accent: '#54e2ff', imageUrls: SHOP_STATIC_CREDIT_PACKS.map(item => item.imageUrl) },
  { title: 'ELITE PREVIEW', tab: 'Elite', subtitle: 'Passes and premium access', items: ['Arena Pass', 'Champion Pass', 'Founder Lifetime', 'Pass Benefits'], accent: '#ffd36a', imageUrls: SHOP_STATIC_PASSES.map(item => item.imageUrl).concat(shopPageEliteCrownImageUrl).slice(0, 4) },
  { title: 'VAULT PREVIEW', tab: 'Vault', subtitle: 'Cosmetics and inventory', items: ['Decks', 'Card Backs', 'Table Themes', 'Profile Frames', 'Avatars'], accent: '#8b5cff', imageUrls: SHOP_SECTIONS.Vault.categories?.map(item => item.imageUrl).slice(0, 5) ?? [] },
  { title: 'PLAY ACCESS PREVIEW', tab: 'Play Access', subtitle: 'Ways to host and join', items: SHOP_PLAY_ACCESS_BANNER_CARDS.map(item => item.title).slice(0, 6), accent: '#20e39d', imageUrls: SHOP_SECTIONS['Play Access'].categories?.map(item => item.imageUrl).slice(0, 6) ?? [] },
  { title: 'EVENTS PREVIEW', tab: 'Events', subtitle: 'Tickets and competitions', items: ['Weekly Cup', 'Season Pass', 'Qualifier Entry', 'Event Bundle'], accent: '#de4fe8', imageUrls: SHOP_SECTIONS.Events.featured?.map(item => item.imageUrl).slice(0, 4) ?? [] },
  {
    title: 'EARN FREE AC PREVIEW',
    tab: 'Earn Free AC',
    subtitle: 'Daily rewards and bonus spins',
    items: ['Daily Reward', 'Facebook Share', 'LinkedIn Post', 'X / Twitter', 'Invite Friend', 'Finish 3 Matches', 'Useful Feedback'],
    accent: '#20e39d',
    imageUrls: [shopPageEarnFreeAcImageUrl, shopPageFacebookImageUrl, shopPageLinkedInImageUrl, shopPageXLogoImageUrl, shopPageInviteFriendImageUrl, shopPageWin3MatchesImageUrl, shopPageFeedbackImageUrl],
  },
];

export const SHOP_QUESTS: ShopQuest[] = [
  { key: 'daily_spin', group: 'Daily', title: 'Daily Reward Spin', reward: 'Free Spin', cadence: 'Daily', tone: 'gold', icon: 'trophy', action: 'Spin', imageUrl: shopPageEarnFreeAcImageUrl, description: 'Open the daily wheel and spin for a capped AC reward.', details: ['One free spin resets daily.', 'Wheel rewards AC only.', 'Reward syncs into wallet after claim.'] },
  { key: 'share_facebook', group: 'Share', title: 'Share on Facebook', reward: '+1 Spin', cadence: 'Weekly', tone: 'cyan', icon: 'link', action: 'Share', imageUrl: shopPageFacebookImageUrl, description: 'Share a game page, lobby invite, or event post to unlock a bonus spin.', details: ['Share an approved Ocentra link.', 'Verify with proof or platform APIs.', 'Verified share unlocks one spin.'] },
  { key: 'share_linkedin', group: 'Share', title: 'Share on LinkedIn', reward: '+1 Spin', cadence: 'Weekly', tone: 'green', icon: 'link', action: 'Post', imageUrl: shopPageLinkedInImageUrl, description: 'Post an achievement, invite, or developer update to earn a spin.', details: ['Share a public game or profile link.', 'Submit proof or verify automatically later.', 'Claim one spin after verification.'] },
  { key: 'share_x', group: 'Share', title: 'Share on X / Twitter', reward: '+1 Spin', cadence: 'Weekly', tone: 'silver', icon: 'link', action: 'Tweet', imageUrl: shopPageXLogoImageUrl, description: 'Post a game invite, table result, or marketplace feature to earn a spin.', details: ['Post an approved Ocentra link.', 'Proof can be screenshot, link paste, or API verification.', 'Spin reward is capped and non-cash.'] },
  { key: 'invite_friend', group: 'Community', title: 'Invite A Friend', reward: '+250 AC + Spin', cadence: 'Verified', tone: 'orange', icon: 'link', action: 'Invite', imageUrl: shopPageInviteFriendImageUrl, description: 'Earn a verified-join reward when a real friend becomes active.', details: ['Send an invite link.', 'Friend verifies and completes a game.', 'Fixed AC and bonus spin sync after verification.'] },
  { key: 'play_match', group: 'Play', title: 'Finish 3 Matches', reward: '+1 Spin', cadence: 'Daily', tone: 'violet', icon: 'cards', action: 'Play', imageUrl: shopPageWin3MatchesImageUrl, description: 'Reward healthy completed play sessions, not wins or wagering.', details: ['Complete three valid matches.', 'Abandoned games do not count.', 'Unlock a bonus spin after completion.'] },
  { key: 'feedback', group: 'Help', title: 'Give Useful Feedback', reward: '+1 Spin', cadence: 'Weekly', tone: 'cyan', icon: 'crate', action: 'Feedback', imageUrl: shopPageFeedbackImageUrl, description: 'Useful reports and UX notes can unlock a weekly reward spin.', details: ['Submit actionable bug or UX feedback.', 'Moderation marks it useful.', 'Useful feedback grants one spin.'] },
];

export const SHOP_RIGHT_TABS: ShopRightTab[] = [
  { id: 'account', title: 'ACCOUNT PREVIEW', accent: '#54e2ff' },
  { id: 'wallet', title: 'WALLET & BALANCE', accent: '#ffd36a' },
  { id: 'pass', title: 'ACTIVE PASS', accent: '#bd76ff' },
  { id: 'events', title: 'UPCOMING EVENTS', accent: '#de4fe8' },
  { id: 'recent', title: 'RECENT PURCHASES', accent: '#20e39d' },
];

export const SHOP_RIGHT_ROWS = {
  wallet: [
    ['Arena Credits', 'AC'],
    ['Tournament Tickets', '3'],
    ['Season Points', '1,250 SP'],
    ['Owned Items', '128'],
    ['Active Tables', '4 / 6'],
  ],
  events: [
    ['Weekly Claim Cup', 'Sat, 8:00 PM', 'Join'],
    ['Season Ladder Reset', 'Sun, 12:00 AM', 'Details'],
    ['Qualifier Entry', 'Coming Soon', 'View'],
  ],
  recent: [
    ['Champion Pass', '-1,499 AC'],
    ['1500 AC Pack', '+1,500 AC'],
    ['Weekly Claim Cup', '-250 AC'],
    ['Neon Card Back', '-400 AC'],
  ],
} as const;

export const SHOP_UI_COPY = {
  header: {
    title: 'Marketplace',
    subtitle: 'Grow your collection. Upgrade your play. Compete at the top.',
    badges: [
      { title: 'Secure', sub: 'Checkout', icon: 'shield', tone: 'green' },
      { title: 'Account', sub: 'Linked', icon: 'link', tone: 'green' },
      { title: 'Wallet', sub: 'Safe', icon: 'lock', tone: 'violet' },
    ],
    balanceTitle: 'Arena Credits',
    balanceUnit: 'AC',
    balanceSub: 'Marketplace balance',
  },
  passCard: {
    compactSummary: 'Pass summary. Click for full benefits.',
    summary: 'Everything you need to compete.',
    compactBenefits: ['Monthly AC allowance', 'Premium table themes'],
    benefits: ['Monthly AC allowance', 'Premium table themes', 'Private rooms', 'Extra active tables', 'AI analysis', 'Seasonal drops'],
    lifetimeButton: 'Go Lifetime',
    selectButton: 'Select Plan',
  },
  earnPanel: {
    title: 'EARN FREE AC',
    description: 'Complete quests, events, and daily challenges to earn Arena Credits.',
    buttonLabel: 'View Quests',
  },
  earnRewards: {
    title: 'EARN FREE AC',
    subtitle: 'Daily spin, social sharing, friend invites, play milestones, and community quests that grant safe AC rewards.',
    backLabel: 'Back To Shop',
    closeLabel: 'Close',
    detailLabel: 'Details',
    shareTitlePrefix: 'Prepare',
    inviteTitle: 'Invite & Verify Friend',
    completeTitlePrefix: 'Complete',
    shareHelper: 'Write a friendly message, choose where/who to share with, then verify the post to unlock your spin.',
    inviteHelper: 'Send a friend invite link. Reward unlocks after verified account plus first completed game.',
    defaultHelper: 'Complete the action, verify it, then claim the spin or reward.',
    shareFields: ['Message', 'Audience / destination', 'Proof / verification'],
    inviteFields: ['Invite link', 'Friend email or contact', 'Verification status'],
    defaultFields: ['Action checklist', 'Progress', 'Claim status'],
    shareChips: ['Facebook friends', 'LinkedIn network', 'Public post', 'Private group'],
    inviteChips: ['Copy invite', 'Email', 'Messenger', 'WhatsApp'],
    defaultChips: ['Step 1', 'Step 2', 'Step 3', 'Ready'],
    shareMessage: 'I am playing Ocentra Games. Join my table, try Claim, and help me unlock today\'s reward spin.',
    inviteLink: 'ocentra.games/invite/ocentra-player',
    defaultChecklist: 'Complete the required steps, then return here to verify.',
    shareProof: 'Paste post link or upload screenshot. Later this can use platform OAuth / share APIs.',
    inviteStatus: 'Waiting for verified join and first completed game.',
    defaultStatus: 'Verification pending until action is completed.',
    openShare: 'Open Share',
    copyInvite: 'Copy Invite',
    start: 'Start',
    checkVerify: 'Check Verify',
    verifySpin: 'Verify & Spin',
  },
  rightPanel: {
    walletTitle: 'WALLET & BALANCE',
    passTitle: 'ACTIVE PASS',
    eventsTitle: 'UPCOMING EVENTS',
    recentTitle: 'RECENT PURCHASES',
    accountTitle: 'ACCOUNT PREVIEW',
    passName: 'Champion Pass',
    managePass: 'Manage Pass',
    viewProfile: 'View Profile',
    profileName: 'ocentra',
    profileElo: 'ELO 1200',
  },
  footer: [
    { title: 'Secure Checkout', sub: '256-bit SSL Encryption', icon: 'shield', tone: 'green' },
    { title: 'Account Linked', sub: 'Purchases bound to your account', icon: 'link', tone: 'green' },
    { title: 'Wallet Safe', sub: 'Your Arena Credits are protected', icon: 'lock', tone: 'green' },
    { title: 'Fair Play', sub: 'Legit. Transparent. Competitive.', icon: 'shield', tone: 'cyan' },
  ],
} as const;

export const SHOP_INFO_DETAILS = {
  arenaCredits: {
    title: 'WHAT IS ARENA CREDITS?',
    subtitle: 'Arena Credits are the shared marketplace balance used across Ocentra games, tools, cosmetics, access rights, and events.',
    cta: 'Back To Shop',
    bullets: [
      'Buy AC in Treasury using normal checkout.',
      'Spend AC on AI analysis, replay review, cosmetics, access upgrades, and event entries.',
      'AC is not a wager, cash-out token, or gambling currency.',
      'Purchases should grant visible entitlements immediately after checkout sync.',
    ],
  },
  eliteBenefits: {
    title: 'COMPARE ELITE PASSES',
    subtitle: 'Compare pass tiers side-by-side: allowance, tools, rooms, replay access, tickets, and identity perks.',
    cta: 'Back To Plans',
    tiers: [
      { key: 'free', title: 'Free', price: '$0', tone: 'silver' },
      { key: 'arena', title: 'Arena Pass', price: '$4.99/mo', tone: 'cyan' },
      { key: 'champion', title: 'Champion', price: '$9.99/mo', tone: 'violet' },
      { key: 'founder', title: 'Founder', price: '$199', tone: 'gold' },
    ],
    rows: [
      { label: 'Monthly AC', values: ['-', '500', '1,500', '2,500'] },
      { label: 'AI reviews', values: ['Limited', '25/mo', '100/mo', 'Lifetime boost'] },
      { label: 'Private rooms', values: ['-', '2', '8', 'Unlimited'] },
      { label: 'Active tables', values: ['2', '6', '12', '20'] },
      { label: 'Replay archive', values: ['7 days', '30 days', '1 year', 'Lifetime'] },
      { label: 'Event tickets', values: ['-', '1/mo', '4/mo', 'Founder drops'] },
      { label: 'Cosmetics', values: ['Basic', 'Monthly', 'Premium', 'Exclusive'] },
    ],
  },
} as const;

export function productPriceLabel(product: ShopProduct | null | undefined): string {
  if (!product) return '-';
  if (product.priceLabel) return product.priceLabel;
  if (typeof product.acPrice === 'number') return `${product.acPrice.toLocaleString()} AC`;
  if (typeof product.unitPriceCents === 'number') return `$${(product.unitPriceCents / 100).toFixed(2)}`;
  return 'Included';
}

export function isShopProductPurchasable(product: ShopProduct | null | undefined): product is ShopProduct {
  return Boolean(product?.active && (product.availability ?? 'live') === 'live');
}

export function shopProductActionLabel(product: ShopProduct | null | undefined): string {
  if (!product) return 'Unavailable';
  const availability = product.availability ?? 'live';
  if (availability === 'coming_soon') return 'Coming Soon';
  if (availability === 'preview') return 'Preview';
  if (product.productType === 'AC_CREDITS') return 'Buy Now';
  if (product.productType === 'SUBSCRIPTION') return 'Select Plan';
  if (product.productType === 'TOURNAMENT_ENTRY') return 'Enter';
  return 'Unlock';
}

export function shopTabForProduct(product: ShopProduct): ShopTab {
  if (product.shopTab) return product.shopTab;
  if (product.productType === 'AC_CREDITS') return 'Treasury';
  if (product.productType === 'SUBSCRIPTION') return 'Elite';
  if (product.productType === 'MARKETPLACE') return 'Vault';
  return 'Events';
}

export function productsForShopTab(products: ShopProduct[], tab: ShopTab): ShopProduct[] {
  return products.filter(product => shopTabForProduct(product) === tab);
}
