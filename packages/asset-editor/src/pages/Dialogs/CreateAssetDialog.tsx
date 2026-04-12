import React, { useState, useEffect, useMemo } from 'react';
import type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { isGameModeAssetType, deriveCategoryFromAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import { CreateDialogMode, CreateAssetError } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAllAssetTypesEvent } from '@ocentra/eventing-domain/events/assets/GetAllAssetTypesEvent';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { CreateAssetTemplateEvent } from '@ocentra/eventing-domain/events/assets/CreateAssetTemplateEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { RegisterIResourceEntryEvent } from '@ocentra/eventing-domain/events/assets/RegisterResourceEntryEvent';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { GetGameTemplateEvent } from '@ocentra/eventing-domain/events/assets/GetGameTemplateEvent';
import { MimeTypes } from '@ocentra/asset-domain/constants/assets';
import JSON5 from 'json5';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import { createGameModeBundle } from '@/adapters/assets/createGameModeBundle';
import { validateGameName, validateGameId, validateAssetName } from '@/lib/validation/createAssetValidation';
import type { ValidationState } from '@/lib/validation/createAssetValidation';
import { getAuthorableAssetTypes } from '@/lib/validation/authorableAssetTypes';
import './CreateAssetDialog.css';

interface FormValidation {
    gameName: ValidationState;
    gameId: ValidationState;
    assetName: ValidationState;
    assetType: ValidationState;
    gameModeType: ValidationState;
}

async function getGamesByAssetType(assetType: string): Promise<Array<{ gameId: string; name: string; displayName: string }>> {
    try {
        const getGameModeEntriesDeferred = new OperationDeferred<AssetResourceEntry<GameMode>[]>();
        await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(getGameModeEntriesDeferred));
        const result = await getGameModeEntriesDeferred.promise;

        if (!result.isSuccess || !result.value) {
            return [];
        }

        const filteredEntries = result.value.filter(entry => {
            const normalizedType = entry.assetType ? (entry.assetType.match(/\d+$/) ? entry.assetType.replace(/\d+$/, '') : entry.assetType) : null;
            return normalizedType === assetType || entry.assetType === assetType;
        });

        return filteredEntries
            .filter(entry => entry.gameId)
            .map(entry => ({
                gameId: entry.gameId!,
                name: entry.displayName || entry.gameId!,
                displayName: entry.displayName || entry.gameId!,
            }));
    } catch {
        return [];
    }
}

interface CreateAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAssetCreated?: (path: string) => void;
    defaultCategory?: AssetCategory;
    defaultPath?: string;
    defaultAssetType?: string;
    mode?: CreateDialogMode;
    gameIdFromContext?: string;
}

export const CreateAssetDialog: React.FC<CreateAssetDialogProps> = ({
    isOpen,
    onClose,
    onAssetCreated,
    defaultCategory,
    defaultPath = '',
    defaultAssetType,
    mode,
    gameIdFromContext: _gameIdFromContext,
}) => {
    const [selectedType, setSelectedType] = useState<string>(defaultAssetType || '');
    const [assetName, setAssetName] = useState('');
    const [customPath, setCustomPath] = useState(defaultPath);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'All'>(
        defaultCategory || 'All'
    );
    const [copyFromGame, setCopyFromGame] = useState<string>('');
    const [availableGames, setAvailableGames] = useState<Array<{ gameId: string; name: string; displayName: string }>>([]);
    const [isLoadingGames, setIsLoadingGames] = useState(false);
    const [copyFromTemplate, setCopyFromTemplate] = useState<Record<string, unknown> | null>(null);
    const [allTypes, setAllTypes] = useState<AssetTypeInfo[]>([]);

    const isGameMode = useMemo(() => {
        return selectedType ? isGameModeAssetType(selectedType) : false;
    }, [selectedType]);

    const gameModeCategory = useMemo(() => {
        if (!selectedType || !isGameMode) {
            return null;
        }
        return deriveCategoryFromAssetType(selectedType);
    }, [selectedType, isGameMode]);

    const categories: Array<AssetCategory | 'All'> = ['All', AssetTypeCategory.Game, AssetTypeCategory.Content, AssetTypeCategory.UI, AssetTypeCategory.AI];

    useEffect(() => {
        const loadTypes = async () => {
            const getAllAssetTypesDeferred = new OperationDeferred<AssetTypeInfo[]>();
            await EventBus.instance.publishAsync(new GetAllAssetTypesEvent(getAllAssetTypesDeferred));
            const result = await getAllAssetTypesDeferred.promise;
            if (result.isSuccess && result.value) {
                setAllTypes(result.value);
            }
        };
        loadTypes();
    }, []);

    const filteredTypes = useMemo(() => {
        return getAuthorableAssetTypes(allTypes, selectedCategory);
    }, [allTypes, selectedCategory]);

    useEffect(() => {
        const loadGames = async () => {
            if (isOpen && isGameMode && selectedType) {
                setIsLoadingGames(true);
                try {
                    const games = await getGamesByAssetType(selectedType);
                    setAvailableGames(games);
                } catch {
                    setAvailableGames([]);
                } finally {
                    setIsLoadingGames(false);
                }
            } else {
                setAvailableGames([]);
            }
        };
        loadGames();
    }, [isOpen, isGameMode, selectedType]);

    useEffect(() => {
        if (isOpen && isGameMode && copyFromGame && gameModeCategory) {
            (async () => {
                const templateDeferred = new OperationDeferred<Record<string, unknown>>();
                await EventBus.instance.publishAsync(new GetGameTemplateEvent(copyFromGame, gameModeCategory, templateDeferred));
                const templateResult = await templateDeferred.promise;
                if (templateResult.isSuccess && templateResult.value) {
                    setCopyFromTemplate(templateResult.value);
                } else {
                    setCopyFromTemplate(null);
                }
            })();
        } else {
            setCopyFromTemplate(null);
        }
    }, [isOpen, isGameMode, copyFromGame, gameModeCategory]);

    useEffect(() => {
        if (isOpen) {
            const defaultType = defaultAssetType ?? (mode === CreateDialogMode.FullGameSet
                ? (allTypes.find(t => t.assetType === 'CardGameMode')?.assetType ?? '')
                : '');
            setSelectedType(defaultType);
            setAssetName('');
            setCustomPath(defaultPath);
            setError(null);
            setSelectedCategory(defaultCategory || 'All');
            setCopyFromGame('');
            setCopyFromTemplate(null);
        }
    }, [isOpen, defaultPath, defaultCategory, defaultAssetType, mode, allTypes]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleCreate = async () => {
        const currentValidation: FormValidation = {
            gameName: { isValid: true },
            gameId: { isValid: true },
            assetName: { isValid: true },
            assetType: { isValid: true },
            gameModeType: { isValid: true },
        };

        if (isGameMode) {
            currentValidation.gameName = validateGameName(assetName);
            const gameId = assetName.toLowerCase().replace(/\s+/g, '_');
            currentValidation.gameId = validateGameId(gameId);
            currentValidation.gameModeType = selectedType
                ? { isValid: true }
                : { isValid: false, errorMessage: CreateAssetError.AssetTypeRequired };
        } else {
            currentValidation.assetName = validateAssetName(assetName);
            currentValidation.assetType = selectedType
                ? { isValid: true }
                : { isValid: false, errorMessage: CreateAssetError.AssetTypeRequired };
        }

        const isValid = Object.values(currentValidation).every(v => v.isValid);
        if (!isValid) {
            const firstError = Object.values(currentValidation).find(v => !v.isValid);
            setError(firstError?.errorMessage || CreateAssetError.AssetTypeRequired);
            return;
        }

        if (!selectedType || !assetName) {
            setError(CreateAssetError.AssetTypeRequired);
            return;
        }

        setIsCreating(true);
        setError(null);

        const registerAssetEntry = async (assetEntry: AssetEntry): Promise<void> => {
            const { AssetResourceEntryFactory } = await import('@ocentra/asset-domain/resourceEntry/AssetResourceEntryFactory');
            const entry = AssetResourceEntryFactory.fromAssetEntry(assetEntry);
            const registerDeferred = new OperationDeferred<boolean>();
            await EventBus.instance.publishAsync(new RegisterIResourceEntryEvent(entry, registerDeferred));
            await registerDeferred.promise;
        };

        const isFullGameSet = mode === CreateDialogMode.FullGameSet && isGameMode;

        if (isFullGameSet) {
            try {
                const gameId = assetName.trim().toLowerCase().replace(/\s+/g, '_');
                const category = gameModeCategory ?? 'CardGames';
                const bundle = await createGameModeBundle({
                    gameId,
                    displayName: assetName.trim(),
                    category,
                    copyFromTemplate: copyFromTemplate ?? undefined,
                });

                for (const file of bundle.files) {
                    const uploadDeferred = new OperationDeferred<AssetEntry>();
                    await EventBus.instance.publishAsync(new UploadAssetEvent(
                        file.guid,
                        file.content,
                        file.metadata,
                        uploadDeferred
                    ));

                    const uploadResult = await uploadDeferred.promise;
                    if (!uploadResult.isSuccess || !uploadResult.value) {
                        throw new Error(uploadResult.errorMessage || `Failed to create ${file.path}`);
                    }

                    await registerAssetEntry(uploadResult.value);
                }

                const saveDeferred = new OperationDeferred<boolean>();
                await EventBus.instance.publishAsync(new SaveAssetRegistryEvent(saveDeferred));
                await saveDeferred.promise;

                onAssetCreated?.(bundle.mainAssetGuid);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsCreating(false);
            }
            return;
        }

        try {
            const generateGuidDeferred = new OperationDeferred<string>();
            await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(generateGuidDeferred));
            const guidResult = await generateGuidDeferred.promise;

            if (!guidResult.isSuccess || !guidResult.value) {
                throw new Error('Failed to generate GUID for new asset');
            }
            const guid = guidResult.value;

            let assetData: Record<string, unknown>;

            if (isGameMode) {
                const createTemplateDeferred = new OperationDeferred<Record<string, unknown> | null>();
                await EventBus.instance.publishAsync(new CreateAssetTemplateEvent(selectedType, createTemplateDeferred));
                const templateResult = await createTemplateDeferred.promise;

                if (!templateResult.isSuccess || !templateResult.value) {
                    throw new Error('Failed to create template for game mode');
                }

                assetData = templateResult.value;
                const gameId = assetName.toLowerCase().replace(/\s+/g, '_');

                if (!assetData.system || typeof assetData.system !== 'object') {
                    assetData.system = {};
                }
                const system = assetData.system as Record<string, unknown>;
                system.assetType = selectedType;
                system.displayName = assetName;
                system.gameId = gameId;
                system.category = gameModeCategory ?? AssetTypeCategory.Game;
                system.gameModeCategory = gameModeCategory ?? 'CardGames';
                (assetData as Record<string, unknown>).gameId = gameId;
                if (copyFromTemplate) {
                    Object.assign(assetData, copyFromTemplate);
                }
            } else {
                const createTemplateDeferred = new OperationDeferred<Record<string, unknown> | null>();
                await EventBus.instance.publishAsync(new CreateAssetTemplateEvent(selectedType, createTemplateDeferred));
                const templateResult = await createTemplateDeferred.promise;

                if (!templateResult.isSuccess || !templateResult.value) {
                    throw new Error(`Failed to create template for ${selectedType}`);
                }

                assetData = templateResult.value;
                if (!assetData.system || typeof assetData.system !== 'object') {
                    assetData.system = {};
                }
                (assetData.system as Record<string, unknown>).displayName = assetName;
            }

            if (!assetData.system || typeof assetData.system !== 'object') {
                assetData.system = {};
            }
            const systemBlock = assetData.system as Record<string, unknown>;
            systemBlock.guid = guid;

            let treePath = '';
            if (isGameMode && selectedCategory === 'Game' && gameModeCategory) {
                const gameId = assetName.toLowerCase().replace(/\s+/g, '_');
                treePath = `Resources/GameMode/${gameModeCategory}/${gameId}/${gameId}.asset`;
            } else {
                const cleanPath = customPath.startsWith('/') ? customPath.substring(1).replace(/^\/+/, '') : customPath;
                treePath = (cleanPath.endsWith('/') ? cleanPath.slice(0, -1).replace(/\/+$/, '') : cleanPath);
                treePath = `${treePath ? treePath + '/' : ''}${assetName}.asset`;
            }
            systemBlock.treePath = treePath;

            const content = JSON5.stringify(assetData, null, 2);

            const system = (assetData.system as Record<string, unknown>) || {};
            const normalizedAssetType = selectedType;
            const displayName = (system.displayName as string) || assetName;
            const category = (system.category as AssetCategory) || AssetTypeCategory.Content;
            const fileSize = content.length;

            const uploadDeferred = new OperationDeferred<AssetEntry>();
            await EventBus.instance.publishAsync(new UploadAssetEvent(
                guid,
                content,
                {
                    assetType: normalizedAssetType,
                    displayName,
                    category,
                    mimeType: MimeTypes.Json,
                    fileSize,
                },
                uploadDeferred
            ));

            const uploadResult = await uploadDeferred.promise;
            if (!uploadResult.isSuccess || !uploadResult.value) {
                throw new Error(uploadResult.errorMessage || 'Failed to upload asset');
            }

            const assetEntry = uploadResult.value;
            await registerAssetEntry(assetEntry);

            const saveDeferred = new OperationDeferred<boolean>();
            await EventBus.instance.publishAsync(new SaveAssetRegistryEvent(saveDeferred));
            await saveDeferred.promise;

            onAssetCreated?.(assetEntry.guid);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="create-asset-dialog-overlay"
            onClick={handleOverlayClick}
            role="presentation"
            aria-label="Dialog backdrop - click to close"
        >
            <div
                className="create-asset-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-asset-dialog-title"
            >
                <div className="create-asset-dialog__header">
                    <h2 id="create-asset-dialog-title">Create New Asset</h2>
                    <button
                        className="create-asset-dialog__close"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                <div className="create-asset-dialog__content">
                    <div className="create-asset-dialog__field">
                        <label htmlFor="category-select">Category</label>
                        <select
                            id="category-select"
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value as AssetCategory | 'All');
                                setSelectedType('');
                            }}
                            className="create-asset-dialog__select"
                            disabled={!!defaultCategory}
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="create-asset-dialog__field">
                        <label htmlFor="type-select">Asset Type *</label>
                        <select
                            id="type-select"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="create-asset-dialog__select"
                            required
                            disabled={!!defaultAssetType}
                        >
                            <option value="">-- Select Asset Type --</option>
                            {filteredTypes.map((type) => (
                                <option key={type.assetType} value={type.assetType}>
                                    {type.icon} {type.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="create-asset-dialog__field">
                        <label htmlFor="asset-name">Asset Name *</label>
                        <input
                            id="asset-name"
                            type="text"
                            value={assetName}
                            onChange={(e) => setAssetName(e.target.value)}
                            placeholder="my_asset"
                            className="create-asset-dialog__input"
                            required
                        />
                        <small className="create-asset-dialog__hint">
                            Name without extension (e.g., "welcome_page")
                        </small>
                    </div>

                    {!isGameMode && (
                        <div className="create-asset-dialog__field">
                            <label htmlFor="custom-path">Path</label>
                            <input
                                id="custom-path"
                                type="text"
                                value={customPath}
                                onChange={(e) => setCustomPath(e.target.value)}
                                placeholder="Resources/Pages/"
                                className="create-asset-dialog__input"
                            />
                            <small className="create-asset-dialog__hint">
                                Relative to packages/asset-editor/ (e.g., "Resources/Pages/")
                            </small>
                        </div>
                    )}

                    {isGameMode && (
                        <>
                            {gameModeCategory && (
                                <div className="create-asset-dialog__field">
                                    <div className="create-asset-dialog__label">Game Category</div>
                                    <div className="create-asset-dialog__readonly">
                                        {gameModeCategory.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <small className="create-asset-dialog__hint">
                                        Automatically derived from asset type
                                    </small>
                                </div>
                            )}

                            {availableGames.length > 0 && (
                                <div className="create-asset-dialog__field">
                                    <label htmlFor="copy-from-game">Copy from (Optional)</label>
                                    <select
                                        id="copy-from-game"
                                        value={copyFromGame}
                                        onChange={(e) => setCopyFromGame(e.target.value)}
                                        className="create-asset-dialog__select"
                                    >
                                        <option value="">-- None (Create New) --</option>
                                        {availableGames.map(game => (
                                            <option key={game.gameId} value={game.gameId}>
                                                {game.displayName || game.name || game.gameId}
                                            </option>
                                        ))}
                                    </select>
                                    <small className="create-asset-dialog__hint">
                                        Copy values from an existing game in the same category. All assets will still have unique GUIDs.
                                    </small>
                                </div>
                            )}

                            {isLoadingGames && (
                                <div className="create-asset-dialog__hint">
                                    Loading available games...
                                </div>
                            )}
                        </>
                    )}

                    {!isGameMode && selectedType && assetName && (
                        <div className="create-asset-dialog__preview">
                            <strong>Full Path:</strong>
                            <code>
                                packages/asset-editor/
                                {customPath && `${(customPath.startsWith('/') ? customPath.substring(1).replace(/^\/+/, '') : customPath).endsWith('/') ? customPath.replace(/\/+$/, '') : customPath}/`}
                                {assetName}.asset
                            </code>
                        </div>
                    )}

                    {isGameMode && assetName && (() => {
                        const gameId = assetName.toLowerCase().replace(/\s+/g, '_');
                        return (
                            <div className="create-asset-dialog__preview">
                                <strong>Will create:</strong>
                                <div className="create-asset-dialog__tree">
                                    <div className="create-asset-dialog__tree-item">
                                        <span className="create-asset-dialog__tree-folder">📁 Resources/</span>
                                        <div className="create-asset-dialog__tree-item">
                                            <span className="create-asset-dialog__tree-folder">📁 GameMode/</span>
                                            <div className="create-asset-dialog__tree-item">
                                                <span className="create-asset-dialog__tree-folder">📁 {gameModeCategory}/</span>
                                                <div className="create-asset-dialog__tree-item">
                                                    <span className="create-asset-dialog__tree-folder">📁 {gameId}/</span>
                                                    <div className="create-asset-dialog__tree-item">
                                                        <span className="create-asset-dialog__tree-file">📄 {gameId}.asset</span>
                                                    </div>
                                                    <div className="create-asset-dialog__tree-item">
                                                        <span className="create-asset-dialog__tree-file">📄 {gameId}Rules.asset</span>
                                                    </div>
                                                    <div className="create-asset-dialog__tree-item">
                                                        <span className="create-asset-dialog__tree-file">📄 {gameId}Strategy.asset</span>
                                                    </div>
                                                    {gameModeCategory === deriveCategoryFromAssetType('CardGameMode') && (
                                                        <div className="create-asset-dialog__tree-item">
                                                            <span className="create-asset-dialog__tree-file">📄 {gameId}Rankings.asset</span>
                                                        </div>
                                                    )}
                                                    <div className="create-asset-dialog__tree-item">
                                                        <span className="create-asset-dialog__tree-file">📄 {gameId}Layout.asset</span>
                                                    </div>
                                                    <div className="create-asset-dialog__tree-item">
                                                        <span className="create-asset-dialog__tree-file">📄 {gameId}Info.asset</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {error && <div className="create-asset-dialog__error">{error}</div>}
                </div>

                <div className="create-asset-dialog__footer">
                    <button
                        className="create-asset-dialog__button create-asset-dialog__button--secondary"
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        className="create-asset-dialog__button create-asset-dialog__button--primary"
                        onClick={handleCreate}
                        disabled={!selectedType || !assetName || isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Asset'}
                    </button>
                </div>
            </div>
        </div>
    );
};
