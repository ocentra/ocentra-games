var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GameInfo_1;
import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { ContentBlockType } from '../../constants/content-block-type.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { CATEGORY } from '@ocentra/game-domain/game/categories';
const log = MainAppLogger.instance;
log.register(import.meta.url);
const LOG_GAMEINFO = false;
export function isContentSynthesisProvider(asset) {
    return (typeof asset === 'object' &&
        asset !== null &&
        'synthesizeUIContent' in asset &&
        typeof asset.synthesizeUIContent === 'function');
}
let GameInfo = class GameInfo extends ScriptableObject {
    static { GameInfo_1 = this; }
    static schemaVersion = 2;
    static requiresInspector = true;
    synthesisManifest;
    static createTemplate() {
        return {
            hero: {
                title: 'New Game',
                subtitle: 'Game subtitle',
            },
            sections: [],
            description: '',
            tags: [],
            comingSoon: false,
            minPlayers: null,
            maxPlayers: null,
            routePath: '',
            LLM: '',
            Player: '',
            tagline: '',
            tagline2: '',
            shortDescription: '',
            gameIconImage: null,
            gameCategory: CATEGORY.UNKNOWN,
            subcategory: null,
            playerMode: 'multiplayer',
            difficulty: 'Beginner',
            duration: '',
            origin: '',
            deck: '',
            alsoKnownAs: [],
            playersDisplay: '',
            historyContent: null,
            setupContent: null,
            variationsContent: null,
            aiContent: null,
            sourcesContent: null,
            quality: null,
            completeness: null,
        };
    }
    hero = {
        title: '',
    };
    sections = [];
    description = '';
    tags = [];
    comingSoon = false;
    minPlayers = null;
    maxPlayers = null;
    routePath = '';
    LLM = '';
    Player = '';
    tagline;
    tagline2;
    shortDescription;
    gameIconImage;
    gameCategory = CATEGORY.UNKNOWN;
    subcategory = null;
    playerMode = 'multiplayer';
    difficulty = 'Beginner';
    duration = '';
    origin = '';
    deck = '';
    alsoKnownAs = [];
    playersDisplay = '';
    historyContent = null;
    setupContent = null;
    variationsContent = null;
    aiContent = null;
    sourcesContent = null;
    quality = null;
    completeness = null;
    /**
     * @deprecated RESOLUTION NOW HAPPENS AT EDITOR-TIME. Use pre-baked content property instead.
     * This method remains for migration purposes only.
     */
    async resolveAssetRefs(_assetRefs, _gameMode) {
        void _assetRefs;
        void _gameMode;
        log.logWarn('GameInfo.resolveAssetRefs() is deprecated. Use editor-time synthesis instead.', getStackTrace(), {}, LOG_GAMEINFO);
        return [];
    }
    /**
     * Extract plain text from content blocks for AI prompts.
     */
    extractTextContent(blocks) {
        const textParts = [];
        for (const block of blocks) {
            switch (block.type) {
                case ContentBlockType.Text:
                case ContentBlockType.Paragraph:
                    textParts.push(block.text);
                    break;
                case ContentBlockType.Heading:
                    textParts.push(`## ${block.text}`);
                    break;
                case ContentBlockType.Highlight:
                    textParts.push(`**${block.text}**`);
                    break;
                case ContentBlockType.List: {
                    const listBlock = block;
                    for (const item of listBlock.items) {
                        textParts.push(`• ${item.text}`);
                        if (item.subItems) {
                            for (const sub of item.subItems) {
                                textParts.push(`  - ${sub}`);
                            }
                        }
                    }
                    break;
                }
                case ContentBlockType.Example: {
                    const example = block;
                    textParts.push(`Example: ${example.text}`);
                    break;
                }
                case ContentBlockType.RuleBlock: {
                    const ruleBlock = block;
                    if (ruleBlock.title)
                        textParts.push(ruleBlock.title);
                    textParts.push(this.extractTextContent(ruleBlock.content));
                    break;
                }
                case ContentBlockType.StrategyBlock: {
                    const strategyBlock = block;
                    if (strategyBlock.title)
                        textParts.push(strategyBlock.title);
                    if (strategyBlock.description)
                        textParts.push(strategyBlock.description);
                    if (strategyBlock.example)
                        textParts.push(`Example: ${strategyBlock.example.text}`);
                    break;
                }
                // ... handle other block types
            }
        }
        return textParts.join('\n');
    }
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[GameInfo] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'GameInfo',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                const log = MainAppLogger.instance;
                log.logWarn('[GameInfo] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'GameInfo',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-info`;
        const routePath = context.gameId.toLowerCase();
        const data = {
            hero: {
                title: context.displayName,
                subtitle: `Play ${context.displayName}.`,
            },
            sections: [],
            description: `Welcome to ${context.displayName}.`,
            tags: [routePath, 'card-game'],
            comingSoon: false,
            minPlayers: 2,
            maxPlayers: 4,
            routePath,
            LLM: `Description for ${context.displayName}.`,
            Player: `Description for ${context.displayName}.`,
        };
        return {
            assetId,
            fileName: `info.asset`,
            guid,
            data,
        };
    }
    static fromExplorerData(data) {
        const gi = new GameInfo_1();
        gi.hero = { title: data.name ?? '' };
        gi.gameCategory = data.gameCategory ?? CATEGORY.UNKNOWN;
        gi.subcategory = data.subcategory ?? null;
        gi.playerMode = data.playerMode ?? 'multiplayer';
        gi.difficulty = data.difficulty ?? 'Beginner';
        gi.duration = data.duration ?? '';
        gi.origin = data.origin ?? '';
        gi.deck = data.deck ?? '';
        gi.alsoKnownAs = data.alsoKnownAs ?? [];
        gi.playersDisplay = data.playersDisplay ?? '';
        gi.description = data.description ?? '';
        gi.tags = data.tags ?? [];
        gi.sections = data.sections ?? [];
        if (data.minPlayers != null)
            gi.minPlayers = data.minPlayers;
        if (data.maxPlayers != null)
            gi.maxPlayers = data.maxPlayers;
        if (data.historyContent != null)
            gi.historyContent = data.historyContent;
        else if (data.history != null && typeof data.history === 'object')
            gi.historyContent = data.history;
        if (data.setupContent != null)
            gi.setupContent = data.setupContent;
        else if (data.setup != null && typeof data.setup === 'object')
            gi.setupContent = data.setup;
        if (data.variationsContent != null)
            gi.variationsContent = data.variationsContent;
        else if (data.variations != null && typeof data.variations === 'object')
            gi.variationsContent = data.variations;
        if (data.aiContent != null)
            gi.aiContent = data.aiContent;
        else if (data.ai != null && typeof data.ai === 'object')
            gi.aiContent = data.ai;
        if (data.sourcesContent != null)
            gi.sourcesContent = data.sourcesContent;
        else if (data.sources != null && typeof data.sources === 'object')
            gi.sourcesContent = data.sources;
        if (data.quality != null)
            gi.quality = data.quality;
        if (data.completeness != null)
            gi.completeness = data.completeness;
        return gi;
    }
};
__decorate([
    serializable({ label: 'Synthesis Manifest' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "synthesisManifest", void 0);
__decorate([
    serializable({ label: 'Hero Section' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "hero", void 0);
__decorate([
    serializable({
        label: 'Sections',
        elementType: Object,
    }),
    __metadata("design:type", Array)
], GameInfo.prototype, "sections", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], GameInfo.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Tags', elementType: String }),
    __metadata("design:type", Array)
], GameInfo.prototype, "tags", void 0);
__decorate([
    serializable({ label: 'Coming Soon' }),
    __metadata("design:type", Boolean)
], GameInfo.prototype, "comingSoon", void 0);
__decorate([
    serializable({ label: 'Min Players' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "minPlayers", void 0);
__decorate([
    serializable({ label: 'Max Players' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "maxPlayers", void 0);
__decorate([
    serializable({ label: 'Route Path' }),
    __metadata("design:type", String)
], GameInfo.prototype, "routePath", void 0);
__decorate([
    serializable({ label: 'LLM Description' }),
    __metadata("design:type", String)
], GameInfo.prototype, "LLM", void 0);
__decorate([
    serializable({ label: 'Player Description' }),
    __metadata("design:type", String)
], GameInfo.prototype, "Player", void 0);
__decorate([
    serializable({ label: 'Tagline', group: 'Display' }),
    __metadata("design:type", String)
], GameInfo.prototype, "tagline", void 0);
__decorate([
    serializable({ label: 'Tagline 2', group: 'Display' }),
    __metadata("design:type", String)
], GameInfo.prototype, "tagline2", void 0);
__decorate([
    serializable({ label: 'Short Description', group: 'Display' }),
    __metadata("design:type", String)
], GameInfo.prototype, "shortDescription", void 0);
__decorate([
    serializable({ label: 'Game Icon Image', group: 'Display' }),
    __metadata("design:type", String)
], GameInfo.prototype, "gameIconImage", void 0);
__decorate([
    serializable({ label: 'Game Category', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "gameCategory", void 0);
__decorate([
    serializable({ label: 'Subcategory', group: 'Explorer' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "subcategory", void 0);
__decorate([
    serializable({ label: 'Player Mode', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "playerMode", void 0);
__decorate([
    serializable({ label: 'Difficulty', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "difficulty", void 0);
__decorate([
    serializable({ label: 'Duration', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "duration", void 0);
__decorate([
    serializable({ label: 'Origin', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "origin", void 0);
__decorate([
    serializable({ label: 'Deck', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "deck", void 0);
__decorate([
    serializable({ label: 'Also Known As', group: 'Explorer', elementType: String }),
    __metadata("design:type", Array)
], GameInfo.prototype, "alsoKnownAs", void 0);
__decorate([
    serializable({ label: 'Players Display', group: 'Explorer' }),
    __metadata("design:type", String)
], GameInfo.prototype, "playersDisplay", void 0);
__decorate([
    serializable({ label: 'History Content', group: 'Sections' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "historyContent", void 0);
__decorate([
    serializable({ label: 'Setup Content', group: 'Sections' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "setupContent", void 0);
__decorate([
    serializable({ label: 'Variations Content', group: 'Sections' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "variationsContent", void 0);
__decorate([
    serializable({ label: 'AI Content', group: 'Sections' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "aiContent", void 0);
__decorate([
    serializable({ label: 'Sources Content', group: 'Sections' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "sourcesContent", void 0);
__decorate([
    serializable({ label: 'Quality', group: 'Explorer' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "quality", void 0);
__decorate([
    serializable({ label: 'Completeness', group: 'Explorer' }),
    __metadata("design:type", Object)
], GameInfo.prototype, "completeness", void 0);
GameInfo = GameInfo_1 = __decorate([
    serializableClass({
        schemaVersion: 2,
        assetType: 'GameInfo',
        displayName: 'Game Info',
        icon: '📄',
        category: AssetTypeCategory.Content,
    })
], GameInfo);
export { GameInfo };
