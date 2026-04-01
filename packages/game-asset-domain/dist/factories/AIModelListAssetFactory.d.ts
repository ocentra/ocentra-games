import { AIModelList, type AIModelEntry } from '../ai/aiModelList/AIModelList';
export declare class AIModelListFactory {
    private static instance;
    private cache;
    private constructor();
    static getInstance(): AIModelListFactory;
    createModelList(name: string, models: AIModelEntry[]): AIModelList;
    private createDefaultFallbackModelList;
    loadModelList(assetId?: string): Promise<AIModelList | null>;
    getEnabledModels(): Promise<AIModelEntry[]>;
    clearCache(): void;
}
