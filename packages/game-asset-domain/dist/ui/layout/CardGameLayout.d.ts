import 'reflect-metadata';
import { Layout } from '../../ui/layout/Layout';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
import type { TableShapeSettings, SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
export interface LayoutPreset {
    table: TableShapeSettings;
    seats: SeatLayout[];
}
export declare class CardGameLayout extends Layout {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    defaultPlayerCount: number;
    presets: Record<string, LayoutPreset>;
    gameplay: Record<string, unknown>;
    extensions: Record<string, unknown>;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
