var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
class MechanicsPlayerConfig {
    playerMode = 'multiplayer';
    minPlayers = 2;
    maxPlayers = 4;
    optimalPlayers = null;
    dealerRotates = true;
}
__decorate([
    serializable({ label: 'Player Mode' }),
    __metadata("design:type", String)
], MechanicsPlayerConfig.prototype, "playerMode", void 0);
__decorate([
    serializable({ label: 'Min Players' }),
    __metadata("design:type", Number)
], MechanicsPlayerConfig.prototype, "minPlayers", void 0);
__decorate([
    serializable({ label: 'Max Players' }),
    __metadata("design:type", Number)
], MechanicsPlayerConfig.prototype, "maxPlayers", void 0);
__decorate([
    serializable({ label: 'Optimal Players' }),
    __metadata("design:type", Object)
], MechanicsPlayerConfig.prototype, "optimalPlayers", void 0);
__decorate([
    serializable({ label: 'Dealer Rotates' }),
    __metadata("design:type", Boolean)
], MechanicsPlayerConfig.prototype, "dealerRotates", void 0);
class MechanicsPhaseConditional {
    condition = '';
    nextPhase = null;
}
__decorate([
    serializable({ label: 'Condition Expression' }),
    __metadata("design:type", String)
], MechanicsPhaseConditional.prototype, "condition", void 0);
__decorate([
    serializable({ label: 'Next Phase ID' }),
    __metadata("design:type", Object)
], MechanicsPhaseConditional.prototype, "nextPhase", void 0);
class MechanicsPhase {
    id = '';
    label = '';
    actor = 'current_player';
    legalActions = [];
    nextPhase = null;
    isMandatory = true;
    loopIndex = null;
    totalLoops = null;
    conditionalNext = [];
    cardVisibilityChanges = {};
    notes = '';
}
__decorate([
    serializable({ label: 'Phase ID' }),
    __metadata("design:type", String)
], MechanicsPhase.prototype, "id", void 0);
__decorate([
    serializable({ label: 'Label' }),
    __metadata("design:type", String)
], MechanicsPhase.prototype, "label", void 0);
__decorate([
    serializable({ label: 'Actor' }),
    __metadata("design:type", String)
], MechanicsPhase.prototype, "actor", void 0);
__decorate([
    serializable({ label: 'Legal Actions' }),
    __metadata("design:type", Array)
], MechanicsPhase.prototype, "legalActions", void 0);
__decorate([
    serializable({ label: 'Next Phase ID' }),
    __metadata("design:type", Object)
], MechanicsPhase.prototype, "nextPhase", void 0);
__decorate([
    serializable({ label: 'Mandatory Phase' }),
    __metadata("design:type", Boolean)
], MechanicsPhase.prototype, "isMandatory", void 0);
__decorate([
    serializable({ label: 'Loop Index' }),
    __metadata("design:type", Object)
], MechanicsPhase.prototype, "loopIndex", void 0);
__decorate([
    serializable({ label: 'Total Loops' }),
    __metadata("design:type", Object)
], MechanicsPhase.prototype, "totalLoops", void 0);
__decorate([
    serializable({ label: 'Conditional Next Phases', elementType: MechanicsPhaseConditional }),
    __metadata("design:type", Array)
], MechanicsPhase.prototype, "conditionalNext", void 0);
__decorate([
    serializable({ label: 'Card Visibility Changes' }),
    __metadata("design:type", Object)
], MechanicsPhase.prototype, "cardVisibilityChanges", void 0);
__decorate([
    serializable({ label: 'Notes' }),
    __metadata("design:type", String)
], MechanicsPhase.prototype, "notes", void 0);
class MechanicsCustomAction {
    id = '';
    supported = true;
    description = '';
    cost = '0';
    constraints = '';
    effectType = 'custom';
    effectHints = {};
    isTerminating = false;
}
__decorate([
    serializable({ label: 'Action ID' }),
    __metadata("design:type", String)
], MechanicsCustomAction.prototype, "id", void 0);
__decorate([
    serializable({ label: 'Supported' }),
    __metadata("design:type", Boolean)
], MechanicsCustomAction.prototype, "supported", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], MechanicsCustomAction.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Cost' }),
    __metadata("design:type", Object)
], MechanicsCustomAction.prototype, "cost", void 0);
__decorate([
    serializable({ label: 'Constraints' }),
    __metadata("design:type", String)
], MechanicsCustomAction.prototype, "constraints", void 0);
__decorate([
    serializable({ label: 'Effect Type' }),
    __metadata("design:type", String)
], MechanicsCustomAction.prototype, "effectType", void 0);
__decorate([
    serializable({ label: 'Effect Hints' }),
    __metadata("design:type", Object)
], MechanicsCustomAction.prototype, "effectHints", void 0);
__decorate([
    serializable({ label: 'Terminates Round' }),
    __metadata("design:type", Boolean)
], MechanicsCustomAction.prototype, "isTerminating", void 0);
class MechanicsZone {
    id = '';
    type = 'stack';
    owner = 'table';
    visibility = 'hidden';
    capacity = null;
}
__decorate([
    serializable({ label: 'Zone ID' }),
    __metadata("design:type", String)
], MechanicsZone.prototype, "id", void 0);
__decorate([
    serializable({ label: 'Type' }),
    __metadata("design:type", String)
], MechanicsZone.prototype, "type", void 0);
__decorate([
    serializable({ label: 'Owner' }),
    __metadata("design:type", String)
], MechanicsZone.prototype, "owner", void 0);
__decorate([
    serializable({ label: 'Visibility' }),
    __metadata("design:type", String)
], MechanicsZone.prototype, "visibility", void 0);
__decorate([
    serializable({ label: 'Capacity' }),
    __metadata("design:type", Object)
], MechanicsZone.prototype, "capacity", void 0);
class MechanicsAction {
    supported = true;
    description = '';
    constraints = '';
    effectType = 'custom';
    cost = '0';
    effectHints = {};
    isTerminating = false;
    reason;
}
__decorate([
    serializable({ label: 'Supported' }),
    __metadata("design:type", Boolean)
], MechanicsAction.prototype, "supported", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], MechanicsAction.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Constraints' }),
    __metadata("design:type", String)
], MechanicsAction.prototype, "constraints", void 0);
__decorate([
    serializable({ label: 'Effect Type' }),
    __metadata("design:type", String)
], MechanicsAction.prototype, "effectType", void 0);
__decorate([
    serializable({ label: 'Cost' }),
    __metadata("design:type", Object)
], MechanicsAction.prototype, "cost", void 0);
__decorate([
    serializable({ label: 'Effect Hints' }),
    __metadata("design:type", Object)
], MechanicsAction.prototype, "effectHints", void 0);
__decorate([
    serializable({ label: 'Terminates Turn' }),
    __metadata("design:type", Boolean)
], MechanicsAction.prototype, "isTerminating", void 0);
__decorate([
    serializable({ label: 'Unsupported Reason' }),
    __metadata("design:type", String)
], MechanicsAction.prototype, "reason", void 0);
class MechanicsTurnPolicy {
    direction = 'clockwise';
    startsWith = 'left_of_dealer';
    timerSeconds = null;
}
__decorate([
    serializable({ label: 'Direction' }),
    __metadata("design:type", String)
], MechanicsTurnPolicy.prototype, "direction", void 0);
__decorate([
    serializable({ label: 'Starts With' }),
    __metadata("design:type", String)
], MechanicsTurnPolicy.prototype, "startsWith", void 0);
__decorate([
    serializable({ label: 'Timer Seconds' }),
    __metadata("design:type", Object)
], MechanicsTurnPolicy.prototype, "timerSeconds", void 0);
class MechanicsEndCondition {
    id = '';
    description = '';
    appliesToPhase = null;
}
__decorate([
    serializable({ label: 'ID' }),
    __metadata("design:type", String)
], MechanicsEndCondition.prototype, "id", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], MechanicsEndCondition.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Applies To Phase' }),
    __metadata("design:type", Object)
], MechanicsEndCondition.prototype, "appliesToPhase", void 0);
class MechanicsImplementationHints {
    rngUsed = [];
    authoritativeServer = false;
    customLogicNeeded = [];
}
__decorate([
    serializable({ label: 'RNG Used' }),
    __metadata("design:type", Array)
], MechanicsImplementationHints.prototype, "rngUsed", void 0);
__decorate([
    serializable({ label: 'Authoritative Server' }),
    __metadata("design:type", Boolean)
], MechanicsImplementationHints.prototype, "authoritativeServer", void 0);
__decorate([
    serializable({ label: 'Custom Logic Needed' }),
    __metadata("design:type", Array)
], MechanicsImplementationHints.prototype, "customLogicNeeded", void 0);
let CardGameMechanics = class CardGameMechanics extends ScriptableObject {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            familyKernel: 'custom',
            kernelVersion: '1.0',
            playerConfig: {
                playerMode: 'multiplayer',
                minPlayers: 2,
                maxPlayers: 4,
                optimalPlayers: null,
                dealerRotates: true,
            },
            phases: [
                {
                    id: 'play',
                    label: 'Play',
                    actor: 'current_player',
                    legalActions: ['play_card'],
                    nextPhase: null,
                    isMandatory: true,
                    loopIndex: null,
                    totalLoops: null,
                    conditionalNext: [],
                    cardVisibilityChanges: {},
                    notes: '',
                },
            ],
            actions: {
                play_card: {
                    supported: true,
                    description: 'Play a card.',
                    constraints: 'See game rules.',
                    effectType: 'play',
                    cost: '0',
                    effectHints: {},
                    isTerminating: false,
                },
            },
            customActions: [],
            zones: [],
            turnPolicy: {
                direction: 'clockwise',
                startsWith: 'left_of_dealer',
                timerSeconds: null,
            },
            endConditions: [],
            cardVisibility: {},
            drawConfig: null,
            discardConfig: null,
            deckType: '',
            suitSet: '',
            rankSet: '',
            initialHandSize: 0,
            trumpConfig: null,
            meldConfig: null,
            trickConfig: null,
            declarationMechanism: null,
            handRanks: null,
            buyCosts: null,
            marketConfig: null,
            specialCards: null,
            shedding: null,
            fishingConfig: null,
            patienceConfig: null,
            bankingConfig: null,
            roundConfig: null,
            constants: {},
            finalHandSize: 0,
            deckCount: 1,
            implementationHints: {
                rngUsed: [],
                authoritativeServer: false,
                customLogicNeeded: [],
            },
            progression: [],
            roles: [],
            determinismNotes: '',
        };
    }
    familyKernel = '';
    kernelVersion = '1.0';
    playerConfig = new MechanicsPlayerConfig();
    phases = [];
    actions = {};
    customActions = [];
    zones = [];
    turnPolicy = new MechanicsTurnPolicy();
    endConditions = [];
    cardVisibility = {};
    drawConfig = null;
    discardConfig = null;
    deckType = '';
    suitSet = '';
    rankSet = '';
    initialHandSize = 0;
    trumpConfig = null;
    meldConfig = null;
    trickConfig = null;
    declarationMechanism = null;
    handRanks = null;
    buyCosts = null;
    marketConfig = null;
    specialCards = null;
    shedding = null;
    fishingConfig = null;
    patienceConfig = null;
    bankingConfig = null;
    roundConfig = null;
    constants = {};
    finalHandSize = 0;
    deckCount = 1;
    implementationHints = new MechanicsImplementationHints();
    progression = [];
    roles = [];
    determinismNotes = '';
    static async create(context, dataOverrides = {}) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            MainAppLogger.instance.logWarn('[CardGameMechanics] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardGameMechanics',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                MainAppLogger.instance.logWarn('[CardGameMechanics] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardGameMechanics',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        return {
            assetId: `${context.gameId}-mechanics`,
            fileName: `${context.gameId}Mechanics.asset`,
            guid,
            data: {
                ...this.createTemplate(),
                ...dataOverrides,
            },
        };
    }
};
__decorate([
    serializable({ label: 'Family Kernel' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "familyKernel", void 0);
__decorate([
    serializable({ label: 'Kernel Version' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "kernelVersion", void 0);
__decorate([
    serializable({ label: 'Player Config', elementType: MechanicsPlayerConfig }),
    __metadata("design:type", MechanicsPlayerConfig)
], CardGameMechanics.prototype, "playerConfig", void 0);
__decorate([
    serializable({ label: 'Phases', elementType: MechanicsPhase }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "phases", void 0);
__decorate([
    serializable({ label: 'Actions' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "actions", void 0);
__decorate([
    serializable({ label: 'Custom Actions', elementType: MechanicsCustomAction }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "customActions", void 0);
__decorate([
    serializable({ label: 'Zones', elementType: MechanicsZone }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "zones", void 0);
__decorate([
    serializable({ label: 'Turn Policy' }),
    __metadata("design:type", MechanicsTurnPolicy)
], CardGameMechanics.prototype, "turnPolicy", void 0);
__decorate([
    serializable({ label: 'End Conditions', elementType: MechanicsEndCondition }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "endConditions", void 0);
__decorate([
    serializable({ label: 'Card Visibility' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "cardVisibility", void 0);
__decorate([
    serializable({ label: 'Draw Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "drawConfig", void 0);
__decorate([
    serializable({ label: 'Discard Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "discardConfig", void 0);
__decorate([
    serializable({ label: 'Deck Type' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "deckType", void 0);
__decorate([
    serializable({ label: 'Suit Set' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "suitSet", void 0);
__decorate([
    serializable({ label: 'Rank Set' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "rankSet", void 0);
__decorate([
    serializable({ label: 'Initial Hand Size' }),
    __metadata("design:type", Number)
], CardGameMechanics.prototype, "initialHandSize", void 0);
__decorate([
    serializable({ label: 'Trump Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "trumpConfig", void 0);
__decorate([
    serializable({ label: 'Meld Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "meldConfig", void 0);
__decorate([
    serializable({ label: 'Trick Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "trickConfig", void 0);
__decorate([
    serializable({ label: 'Declaration Mechanism' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "declarationMechanism", void 0);
__decorate([
    serializable({ label: 'Hand Ranks' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "handRanks", void 0);
__decorate([
    serializable({ label: 'Buy Costs' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "buyCosts", void 0);
__decorate([
    serializable({ label: 'Market Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "marketConfig", void 0);
__decorate([
    serializable({ label: 'Special Cards' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "specialCards", void 0);
__decorate([
    serializable({ label: 'Shedding' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "shedding", void 0);
__decorate([
    serializable({ label: 'Fishing Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "fishingConfig", void 0);
__decorate([
    serializable({ label: 'Patience Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "patienceConfig", void 0);
__decorate([
    serializable({ label: 'Banking Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "bankingConfig", void 0);
__decorate([
    serializable({ label: 'Round Config' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "roundConfig", void 0);
__decorate([
    serializable({ label: 'Constants' }),
    __metadata("design:type", Object)
], CardGameMechanics.prototype, "constants", void 0);
__decorate([
    serializable({ label: 'Final Hand Size' }),
    __metadata("design:type", Number)
], CardGameMechanics.prototype, "finalHandSize", void 0);
__decorate([
    serializable({ label: 'Deck Count' }),
    __metadata("design:type", Number)
], CardGameMechanics.prototype, "deckCount", void 0);
__decorate([
    serializable({ label: 'Implementation Hints' }),
    __metadata("design:type", MechanicsImplementationHints)
], CardGameMechanics.prototype, "implementationHints", void 0);
__decorate([
    serializable({ label: 'Progression' }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "progression", void 0);
__decorate([
    serializable({ label: 'Roles' }),
    __metadata("design:type", Array)
], CardGameMechanics.prototype, "roles", void 0);
__decorate([
    serializable({ label: 'Determinism Notes' }),
    __metadata("design:type", String)
], CardGameMechanics.prototype, "determinismNotes", void 0);
CardGameMechanics = __decorate([
    serializableClass({
        assetType: 'CardGameMechanics',
        displayName: 'Card Game Mechanics',
        category: AssetTypeCategory.Game,
    })
], CardGameMechanics);
export { CardGameMechanics };
