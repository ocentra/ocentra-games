import { Texture, ClampToEdgeWrapping, LinearFilter } from 'three'
import type { Wrapping, MagnificationTextureFilter, MinificationTextureFilter } from 'three'
import { AssetLoader } from './assetLoader'

export interface TextureConfig {
  wrapS?: Wrapping
  wrapT?: Wrapping
  magFilter?: MagnificationTextureFilter
  minFilter?: MinificationTextureFilter
  flipY?: boolean
  generateMipmaps?: boolean
}

export interface CardTextureSet {
  front: Texture
  back: Texture
}

export class TextureManager {
  private assetLoader: AssetLoader
  private textureCache: Map<string, Texture> = new Map()
  private cardTextures: Map<string, CardTextureSet> = new Map()

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader
  }

  /**
   * Get or load a texture by asset ID
   */
  async getTexture(assetId: string, config?: TextureConfig): Promise<Texture> {
    const cacheKey = `${assetId}_${JSON.stringify(config || {})}`
    
    // Check cache first
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!
    }

    // Load texture from asset loader
    const texture = await this.assetLoader.loadAsset({
      id: assetId,
      path: this.getAssetPath(assetId),
      type: 'texture'
    })

    if (texture instanceof Texture) {
      this.applyTextureConfig(texture, config)
      this.textureCache.set(cacheKey, texture)
      return texture
    }

    throw new Error(`Failed to load texture: ${assetId}`)
  }

  /**
   * Get card textures (front and back) for a specific card
   */
  async getCardTextures(suit: string, value: string, backType: 'default' | 'edge' | 'edge_highlight' = 'default'): Promise<CardTextureSet> {
    const cardKey = `${suit}_${value}_${backType}`
    
    if (this.cardTextures.has(cardKey)) {
      return this.cardTextures.get(cardKey)!
    }

    const frontAssetId = `card_${value}_of_${suit}`
    const backAssetId = `card_back_${backType}`

    const [frontTexture, backTexture] = await Promise.all([
      this.getTexture(frontAssetId, this.getCardTextureConfig()),
      this.getTexture(backAssetId, this.getCardTextureConfig())
    ])

    const cardTextureSet: CardTextureSet = {
      front: frontTexture,
      back: backTexture
    }

    this.cardTextures.set(cardKey, cardTextureSet)
    return cardTextureSet
  }

  /**
   * Get suit symbol texture
   */
  async getSuitTexture(suit: string, variant: 'filled' | 'hollow' | 'circles_filled' | 'circles_hollow' = 'filled'): Promise<Texture> {
    const assetId = `suit_${suit}_${variant}`
    return this.getTexture(assetId, this.getSuitTextureConfig())
  }

  /**
   * Preload all card textures for a specific suit
   */
  async preloadSuitTextures(suit: string): Promise<void> {
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']
    
    await Promise.all(
      values.map(value => this.getCardTextures(suit, value))
    )
  }

  /**
   * Preload textures for high-value cards (face cards and aces)
   */
  async preloadHighValueCards(): Promise<void> {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades']
    const highValues = ['ace', 'king', 'queen', 'jack']
    
    await Promise.all(
      suits.flatMap(suit =>
        highValues.map(value => this.getCardTextures(suit, value))
      )
    )
  }

  /**
   * Get background and UI textures
   */
  async getUITextures(): Promise<{
    background: Texture
    cardBg: Texture
    pot: Texture
    coins: Texture
  }> {
    const [background, cardBg, pot, coins] = await Promise.all([
      this.getTexture('background'),
      this.getTexture('card_bg'),
      this.getTexture('pot'),
      this.getTexture('coins')
    ])

    return { background, cardBg, pot, coins }
  }

  /**
   * Create a texture atlas for better performance (future enhancement)
   */
  async createCardAtlas(): Promise<Texture> {
    // This would combine multiple card textures into a single atlas
    // for better GPU performance - implementation would be more complex
    throw new Error('Card atlas creation not yet implemented')
  }

  /**
   * Dispose of unused textures to free memory
   */
  disposeTexture(assetId: string): void {
    const texture = this.textureCache.get(assetId)
    if (texture) {
      texture.dispose()
      this.textureCache.delete(assetId)
    }
  }

  /**
   * Dispose of all cached textures
   */
  disposeAll(): void {
    this.textureCache.forEach(texture => texture.dispose())
    this.textureCache.clear()
    this.cardTextures.clear()
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): {
    textureCount: number
    cardTextureCount: number
    estimatedMemoryMB: number
  } {
    const textureCount = this.textureCache.size
    const cardTextureCount = this.cardTextures.size
    
    // Rough estimation: assume 512x512 RGBA texture = ~1MB
    const estimatedMemoryMB = (textureCount + cardTextureCount * 2) * 1

    return {
      textureCount,
      cardTextureCount,
      estimatedMemoryMB
    }
  }

  private applyTextureConfig(texture: Texture, config?: TextureConfig): void {
    if (!config) return

    if (config.wrapS !== undefined) texture.wrapS = config.wrapS
    if (config.wrapT !== undefined) texture.wrapT = config.wrapT
    if (config.magFilter !== undefined) texture.magFilter = config.magFilter
    if (config.minFilter !== undefined) texture.minFilter = config.minFilter
    if (config.flipY !== undefined) texture.flipY = config.flipY
    if (config.generateMipmaps !== undefined) texture.generateMipmaps = config.generateMipmaps

    texture.needsUpdate = true
  }

  private getCardTextureConfig(): TextureConfig {
    return {
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      flipY: false,
      generateMipmaps: true
    }
  }

  private getSuitTextureConfig(): TextureConfig {
    return {
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      flipY: false,
      generateMipmaps: false
    }
  }

  private getAssetPath(assetId: string): string {
    // Map asset IDs to their file paths
    // This is a simplified mapping - in a real implementation,
    // this would be more sophisticated
    
    if (assetId.startsWith('card_')) {
      if (assetId.includes('_of_')) {
        // Individual card
        const parts = assetId.replace('card_', '').split('_of_')
        return `/src/assets/Cards/${parts[0]}_of_${parts[1]}.png`
      } else if (assetId.startsWith('card_back_')) {
        // Card back
        const backType = assetId.replace('card_back_', '')
        switch (backType) {
          case 'default': return '/src/assets/Cards/BackCard.png'
          case 'edge': return '/src/assets/Cards/BackCardEdge.png'
          case 'edge_highlight': return '/src/assets/Cards/BackCardEdgeHighLight.png'
          default: return '/src/assets/Cards/BackCard.png'
        }
      } else if (assetId.startsWith('card_suit_')) {
        // Card suit symbols
        const parts = assetId.replace('card_suit_', '').split('_')
        const suit = parts[0]
        const variant = parts[1]
        const suitName = suit.charAt(0).toUpperCase() + suit.slice(1, -1)
        return `/src/assets/Card${suitName}${variant === 'filled' ? 'Filled' : 'Hollow'}.png`
      }
    } else if (assetId.startsWith('suit_')) {
      // Suit symbols
      const parts = assetId.replace('suit_', '').split('_')
      const suit = parts[0]
      const variant = parts.slice(1).join('_')
      const suitName = suit.charAt(0).toUpperCase() + suit.slice(1, -1)
      
      switch (variant) {
        case 'filled': return `/src/assets/${suitName}Filled.png`
        case 'hollow': return `/src/assets/${suitName}Hollow.png`
        case 'circles_filled': return `/src/assets/${suitName}WithCirclesFilled.png`
        case 'circles_hollow': return `/src/assets/${suitName}WithCirclesHollow.png`
        default: return `/src/assets/${suitName}Filled.png`
      }
    } else {
      // Other assets
      switch (assetId) {
        case 'background': return '/src/assets/background.png'
        case 'card_bg': return '/src/assets/CardBg.png'
        case 'pot': return '/src/assets/Pot.png'
        case 'coins': return '/src/assets/Cards/coins.png'
        case 'card_games': return '/src/assets/CardGames.png'
        case 'annon': return '/src/assets/annon.png'
        case 'poker_table': return '/src/assets/Poker Table.fbx'
        default: throw new Error(`Unknown asset ID: ${assetId}`)
      }
    }

    throw new Error(`Could not resolve path for asset ID: ${assetId}`)
  }
}