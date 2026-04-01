import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SynthesizeGameInfoEvent, RequestAssetContentEvent } from '@ocentra/game-asset-domain/events/synthesis';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { isContentSynthesisProvider, type SynthesisContext, type SynthesisManifest } from '@ocentra/game-asset-domain/types/synthesis';
import { CardGameMode } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { getGameModeEntries } from '@/adapters/assets/GameCatalogService';
import type { ContentBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';

const log = MainAppLogger.instance;

const LOG_SYNTHESIS_MANAGER = false;

type SynthesisPageLike = {
    title: string;
    content: ContentBlock[];
    linkedAssets?: string[];
    assetRefs?: Array<{ assetType: string }>;
};

type SynthesisSectionLike = {
    pages?: SynthesisPageLike[];
};

type GameInfoLike = ScriptableObject & {
    sections: SynthesisSectionLike[];
    synthesisManifest?: SynthesisManifest;
};

/**
 * Orchestrates the content synthesis process.
 * Listens for SynthesizeGameInfoEvent and coordinates asset-driven content generation.
 */
export class SynthesisManager {
    private static _instance: SynthesisManager;
    static executionOrder = -80; // After ImageLoadingService

    static {
        ServiceRegistry.register(
            this as { executionOrder?: number },
            'SynthesisManager',
            async () => this.instance
        );
    }

    private constructor() {
        this.registerListeners();
        log.logInfo('SynthesisManager initialized', getStackTrace(), undefined, LOG_SYNTHESIS_MANAGER);
    }

    static get instance(): SynthesisManager {
        if (!this._instance) {
            this._instance = new SynthesisManager();
        }
        return this._instance;
    }

    private registerListeners(): void {
        EventBus.instance.subscribe(SynthesizeGameInfoEvent, (event: SynthesizeGameInfoEvent) => {
            this.handleSynthesizeGameInfo(event);
        });

        EventBus.instance.subscribe(RequestAssetContentEvent, (event: RequestAssetContentEvent) => {
            this.handleRequestAssetContent(event);
        });
    }

    private async handleSynthesizeGameInfo(event: SynthesizeGameInfoEvent): Promise<void> {
        const { gameInfoGuid, deferred } = event;

        try {
            log.logInfo(`Starting synthesis for GameInfo: ${gameInfoGuid} `, getStackTrace());

            const gameInfoSource = await ScriptableObject.loadByGuid(
                ScriptableObject as unknown as new () => GameInfoLike,
                AssetGUID.from(gameInfoGuid)
            ) as GameInfoLike | null;
            if (!gameInfoSource) {
                deferred.resolve(OperationResult.failure(`Failed to load GameInfo asset: ${gameInfoGuid} `));
                return;
            }

            // Prepare a common context
            const ctx = await this.buildSynthesisContext(gameInfoSource);
            const dependencies: Array<{ guid: string; checksum: string }> = [];

            const results = new Map<number, ContentBlock[]>();

            // Iterate through sections and pages to find items needing synthesis
            let modified = false;
            for (let i = 0; i < gameInfoSource.sections.length; i++) {
                const section = gameInfoSource.sections[i];
                if (!section.pages) continue;

                for (let j = 0; j < section.pages.length; j++) {
                    const page = section.pages[j];

                    // Use linkedAssets if available, otherwise fallback to assetRefs (migration)
                    const guids = page.linkedAssets || (page.assetRefs?.map(r => r.assetType as string)) || [];

                    if (guids.length > 0) {
                        log.logInfo(`Synthesizing page: ${page.title} `, getStackTrace());

                        const aggregatedBlocks: ContentBlock[] = [];

                        for (const guid of guids) {
                            if (!dependencies.some(d => d.guid === guid)) {
                                dependencies.push({ guid, checksum: '' });
                            }

                            const assetDeferred = new OperationDeferred<ContentBlock[]>();
                            await EventBus.instance.publishAsync(new RequestAssetContentEvent(guid, ctx, assetDeferred));
                            const assetResult = await assetDeferred.promise;

                            if (assetResult.isSuccess && assetResult.value) {
                                aggregatedBlocks.push(...assetResult.value);
                            } else {
                                log.logWarn(`Failed to synthesize asset ${guid} for page ${page.title}: ${assetResult.errorMessage} `, getStackTrace());
                            }
                        }

                        // Update the page with pre-baked content and linked assets
                        page.content = aggregatedBlocks;
                        page.linkedAssets = guids;

                        results.set(j, aggregatedBlocks);
                        modified = true;
                    }
                }
            }

            if (modified) {
                // SynthesisManifest update
                const synthesisManifest: SynthesisManifest = {
                    lastSynthesizedAt: new Date().toISOString(),
                    dependencies: dependencies
                };
                gameInfoSource.synthesisManifest = synthesisManifest;

                // Save the updated asset back to disk
                await gameInfoSource.saveChanges();
                log.logInfo(`Saved updated GameInfo: ${gameInfoGuid} `, getStackTrace());
            }

            deferred.resolve(OperationResult.success(results));
            log.logInfo(`Synthesis completed for GameInfo: ${gameInfoGuid} `, getStackTrace());

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown synthesis error';
            log.logError(`Synthesis failed: ${msg} `, getStackTrace(), error as string);
            deferred.resolve(OperationResult.failure(msg));
        }
    }

    private async buildSynthesisContext(gameInfo: Pick<GameInfoLike, 'guid'>): Promise<SynthesisContext> {

        // Default context
        const ctx: SynthesisContext = {
            gameId: 'core',
            locale: 'en',
            loadAsset: async <T>(guid: string) => {
                const ctor = ScriptableObject as unknown as new () => ScriptableObject;
                return (await ScriptableObject.loadByGuid(ctor, AssetGUID.from(guid))) as T | null;
            }
        };

        try {
            // Find the CardGameMode that uses this GameInfo
            const entriesResult = await getGameModeEntries();

            if (entriesResult.length > 0) {
                for (const entry of entriesResult) {
                    const gameMode = await ScriptableObject.loadByGuid(
                        CardGameMode as unknown as new () => ScriptableObject,
                        AssetGUID.from(entry.guid)
                    ) as CardGameMode | null;
                    if (gameMode && gameMode instanceof CardGameMode) {
                        await gameMode.loadNestedAssets();
                        if (gameMode.gameInfoAsset?.guid === gameInfo.guid.toString()) {
                            ctx.gameId = gameMode.gameId;
                            ctx.cardRanking = await gameMode.getCardRanking() || undefined;
                            ctx.useTrump = gameMode.useTrump;
                            ctx.handSize = gameMode.initialNumberOfCards;
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            log.logWarn(`Failed to build full synthesis context: ${error instanceof Error ? error.message : 'Unknown error'}`, getStackTrace());
        }

        return ctx;
    }

    private async handleRequestAssetContent(event: RequestAssetContentEvent): Promise<void> {
        const { assetGuid, context, deferred } = event;

        try {
            // Use any to bypass abstract class check for finding base assets
            const asset = await ScriptableObject.loadByGuid(ScriptableObject as unknown as new () => ScriptableObject, AssetGUID.from(assetGuid));

            if (isContentSynthesisProvider(asset)) {
                const blocks = asset.synthesizeUIContent(context);
                deferred.resolve(OperationResult.success(blocks));
            } else {
                deferred.resolve(OperationResult.failure(`Asset ${assetGuid} does not support synthesis`));
            }
        } catch (error) {
            deferred.resolve(OperationResult.failure(error instanceof Error ? error.message : 'Unknown error'));
        }
    }
}
