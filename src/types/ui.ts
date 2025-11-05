export const GameScreen = {
  WELCOME: 'welcome',
  MAIN_MENU: 'main_menu',
  GAME_MODE_SELECT: 'game_mode_select',
  LOBBY: 'lobby',
  GAME: 'game',
  SETTINGS: 'settings',
  TUTORIAL: 'tutorial',
  CARD_INTERACTION_DEMO: 'card_interaction_demo',
} as const

export type GameScreen = (typeof GameScreen)[keyof typeof GameScreen]