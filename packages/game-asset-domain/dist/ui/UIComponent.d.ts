import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
export type ComponentType = 'Button' | 'Input' | 'Card' | 'Modal' | 'Dialog' | 'Tooltip' | 'Badge' | 'Custom';
export interface ComponentStyles {
    [property: string]: string;
}
export interface AnimationConfig {
    name: string;
    duration?: string;
    timingFunction?: string;
    delay?: string;
    iterationCount?: string;
    direction?: string;
    fillMode?: string;
}
export declare class UIComponent extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    component: ComponentType;
    styles: ComponentStyles;
    animations: Record<string, AnimationConfig>;
}
