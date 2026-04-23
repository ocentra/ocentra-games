/**
 * Shared CSS classes for layout and simulation.
 * Use these constants instead of raw strings to avoid layout regressions.
 */
export const LayoutClasses = {
  // The main game container
  GAME_SCREEN: 'game-screen',
  
  // Applied when the game is rendered inside a simulation/editor box
  EMBEDDED: 'game-screen--embedded',
  
  // The outer shell that contains header, stage, and footer
  SHELL: 'game-screen__shell',
  
  // The main interactive game stage
  STAGE: 'game-screen__stage',
  
  // Layer items (header, footer, etc.)
  LAYER_ITEM: 'game-screen__layer-item',
  
  // Specific markers for the embedded simulation logic to target
  LAYER_ITEM_EMBEDDED: 'game-screen__layer-item--embedded',
  
  // Chrome elements (UI that sits on top of the game)
  CHROME: 'game-screen__layer-item--chrome',
  
  // Hidden state for layers
  HIDDEN: 'game-screen__layer-item--hidden',
  
  // Footer state for the main screen
  WITH_FOOTER: 'game-screen--with-footer',
  
  // Specific page types for the Asset Editor Standalone pages
  EDITOR_PREVIEW: 'standalone-panel-page--card-game-preview',
} as const;
