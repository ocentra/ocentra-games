import type { AssetBundle, AssetDefinition } from './types'

// Card suits and values for generating card asset definitions
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
// const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'] as const

/**
 * Generate asset definitions for all playing cards
 */
// function generateCardAssets(): AssetDefinition[] {
//   const cardAssets: AssetDefinition[] = []

//   // Individual card faces
//   for (const suit of SUITS) {
//     for (const value of VALUES) {
//       cardAssets.push({
//         id: `card_${value}_of_${suit}`,
//         path: `/src/assets/Cards/${value}_of_${suit}.png`,
//         type: 'texture',
//         size: 15000 // Estimated size in bytes
//       })
//     }
//   }

//   // Card backs
//   cardAssets.push(
//     {
//       id: 'card_back_default',
//       path: '/src/assets/Cards/BackCard.png',
//       type: 'texture',
//       size: 12000
//     },
//     {
//       id: 'card_back_edge',
//       path: '/src/assets/Cards/BackCardEdge.png',
//       type: 'texture',
//       size: 12000
//     },
//     {
//       id: 'card_back_edge_highlight',
//       path: '/src/assets/Cards/BackCardEdgeHighLight.png',
//       type: 'texture',
//       size: 12000
//     }
//   )

//   // Card templates
//   cardAssets.push(
//     {
//       id: 'card_plain',
//       path: '/src/assets/Cards/PlainCard.png',
//       type: 'texture',
//       size: 8000
//     },
//     {
//       id: 'card_plain_90',
//       path: '/src/assets/Cards/PlainCard90.png',
//       type: 'texture',
//       size: 8000
//     },
//     {
//       id: 'card_deck',
//       path: '/src/assets/Cards/DeckCard.png',
//       type: 'texture',
//       size: 10000
//     }
//   )

//   return cardAssets
// }

/**
 * Generate asset definitions for suit symbols
 */
function generateSuitAssets(): AssetDefinition[] {
  const suitAssets: AssetDefinition[] = []

  for (const suit of SUITS) {
    const suitName = suit.charAt(0).toUpperCase() + suit.slice(1, -1) // Remove 's' and capitalize
    
    suitAssets.push(
      // Basic suit symbols
      {
        id: `suit_${suit}_filled`,
        path: `/src/assets/BgCards/WithoutCircles/${suitName}Filled.png`,
        type: 'texture',
        size: 5000
      },
      {
        id: `suit_${suit}_hollow`,
        path: `/src/assets/BgCards/WithoutCircles/${suitName}Hollow.png`,
        type: 'texture',
        size: 5000
      },
      // Suit symbols with circles
      {
        id: `suit_${suit}_circles_filled`,
        path: `/src/assets/BgCards/with circles/${suitName}WithCirclesFilled.png`,
        type: 'texture',
        size: 6000
      },
      {
        id: `suit_${suit}_circles_hollow`,
        path: `/src/assets/BgCards/with circles/${suitName}WithCirclesHollow.png`,
        type: 'texture',
        size: 6000
      },
      // Card-specific suit symbols
      {
        id: `card_suit_${suit}_filled`,
        path: `/src/assets/BgCards/Fullcard/Card${suitName}Filled.png`,
        type: 'texture',
        size: 5000
      },
      {
        id: `card_suit_${suit}_hollow`,
        path: `/src/assets/BgCards/Fullcard/Card${suitName}Hollow.png`,
        type: 'texture',
        size: 5000
      }
    )
  }

  return suitAssets
}

/**
 * Critical assets that must be loaded before the game can start
 */
export const CRITICAL_ASSETS: AssetBundle = {
  id: 'critical',
  name: 'Critical Game Assets',
  priority: 'critical',
  assets: [
    // Card backs (needed for initial game state)
    {
      id: 'card_back_default',
      path: '/src/assets/Cards/BackCard.png',
      type: 'texture',
      size: 12000
    },
    // Basic suit symbols for UI
    {
      id: 'suit_spades_filled',
      path: '/src/assets/BgCards/WithoutCircles/SpadeFilled.png',
      type: 'texture',
      size: 5000
    },
    {
      id: 'suit_hearts_filled',
      path: '/src/assets/BgCards/WithoutCircles/HeartFilled.png',
      type: 'texture',
      size: 5000
    },
    {
      id: 'suit_diamonds_filled',
      path: '/src/assets/BgCards/WithoutCircles/DiamondFilled.png',
      type: 'texture',
      size: 5000
    },
    {
      id: 'suit_clubs_filled',
      path: '/src/assets/BgCards/WithoutCircles/ClubFilled.png',
      type: 'texture',
      size: 5000
    },
    // Background and table
    {
      id: 'background',
      path: '/src/assets/background.png',
      type: 'texture',
      size: 50000
    },
    {
      id: 'card_bg',
      path: '/src/assets/CardBg.png',
      type: 'texture',
      size: 20000
    },
    // Game elements
    {
      id: 'pot',
      path: '/src/assets/Pot.png',
      type: 'texture',
      size: 15000
    },
    {
      id: 'coins',
      path: '/src/assets/Cards/coins.png',
      type: 'texture',
      size: 10000
    }
  ]
}

/**
 * High priority assets loaded after critical assets
 */
export const HIGH_PRIORITY_ASSETS: AssetBundle = {
  id: 'high_priority',
  name: 'High Priority Assets',
  priority: 'high',
  assets: [
    // Commonly used cards (Aces, Kings, Queens, Jacks)
    ...['ace', 'king', 'queen', 'jack'].flatMap(value =>
      SUITS.map(suit => ({
        id: `card_${value}_of_${suit}`,
        path: `/src/assets/Cards/${value}_of_${suit}.png`,
        type: 'texture' as const,
        size: 15000
      }))
    ),
    // All suit symbols for UI
    ...generateSuitAssets()
  ]
}

/**
 * Medium priority assets (remaining number cards)
 */
export const MEDIUM_PRIORITY_ASSETS: AssetBundle = {
  id: 'medium_priority',
  name: 'Medium Priority Assets',
  priority: 'medium',
  assets: [
    // Number cards (2-10)
    ...['2', '3', '4', '5', '6', '7', '8', '9', '10'].flatMap(value =>
      SUITS.map(suit => ({
        id: `card_${value}_of_${suit}`,
        path: `/src/assets/Cards/${value}_of_${suit}.png`,
        type: 'texture' as const,
        size: 15000
      }))
    ),
    // Additional card backs
    {
      id: 'card_back_edge',
      path: '/src/assets/Cards/BackCardEdge.png',
      type: 'texture',
      size: 12000
    },
    {
      id: 'card_back_edge_highlight',
      path: '/src/assets/Cards/BackCardEdgeHighLight.png',
      type: 'texture',
      size: 12000
    }
  ]
}

/**
 * Low priority assets (cosmetic and optional content)
 */
export const LOW_PRIORITY_ASSETS: AssetBundle = {
  id: 'low_priority',
  name: 'Low Priority Assets',
  priority: 'low',
  assets: [
    // Card templates for customization
    {
      id: 'card_plain',
      path: '/src/assets/Cards/PlainCard.png',
      type: 'texture',
      size: 8000
    },
    {
      id: 'card_plain_90',
      path: '/src/assets/Cards/PlainCard90.png',
      type: 'texture',
      size: 8000
    },
    {
      id: 'card_deck',
      path: '/src/assets/Cards/DeckCard.png',
      type: 'texture',
      size: 10000
    },
    // Additional UI elements
    {
      id: 'card_games',
      path: '/src/assets/CardGames.png',
      type: 'texture',
      size: 25000
    },
    {
      id: 'annon',
      path: '/src/assets/annon.png',
      type: 'texture',
      size: 20000
    }
  ]
}

/**
 * 3D model assets (loaded separately due to different loading mechanism)
 */
export const MODEL_ASSETS: AssetBundle = {
  id: 'models',
  name: '3D Models',
  priority: 'high',
  assets: [
    {
      id: 'poker_table',
      path: '/src/assets/Poker Table.fbx',
      type: 'model',
      size: 500000 // Estimated size for 3D model
    }
  ]
}

/**
 * All asset bundles in loading order
 */
export const ALL_ASSET_BUNDLES: AssetBundle[] = [
  CRITICAL_ASSETS,
  HIGH_PRIORITY_ASSETS,
  MEDIUM_PRIORITY_ASSETS,
  LOW_PRIORITY_ASSETS,
  MODEL_ASSETS
]

/**
 * Get asset bundle by ID
 */
export function getAssetBundle(id: string): AssetBundle | undefined {
  return ALL_ASSET_BUNDLES.find(bundle => bundle.id === id)
}

/**
 * Get all assets of a specific type
 */
export function getAssetsByType(type: AssetDefinition['type']): AssetDefinition[] {
  return ALL_ASSET_BUNDLES.flatMap(bundle => 
    bundle.assets.filter(asset => asset.type === type)
  )
}

/**
 * Get card asset ID by suit and value
 */
export function getCardAssetId(suit: string, value: string): string {
  return `card_${value}_of_${suit}`
}

/**
 * Get suit symbol asset ID
 */
export function getSuitAssetId(suit: string, variant: 'filled' | 'hollow' | 'circles_filled' | 'circles_hollow' = 'filled'): string {
  return `suit_${suit}_${variant}`
}

/**
 * Calculate total size of all assets
 */
export function getTotalAssetSize(): number {
  return ALL_ASSET_BUNDLES.reduce((total, bundle) => 
    total + bundle.assets.reduce((bundleTotal, asset) => 
      bundleTotal + (asset.size || 0), 0
    ), 0
  )
}