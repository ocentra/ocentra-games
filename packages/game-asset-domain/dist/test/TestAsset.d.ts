import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { CardRanking } from '../card/cardRanking/CardRanking';
export declare class TestAsset extends ScriptableObject {
    name: string;
    testData?: string;
    count: number;
    cardRankingAsset: AssetResourceEntry<CardRanking>;
}
