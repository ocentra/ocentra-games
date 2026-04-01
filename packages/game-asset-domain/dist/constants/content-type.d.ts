export declare const ContentType: {
    readonly Gameplay: "gameplay";
    readonly Patterns: "patterns";
    readonly Formulas: "formulas";
    readonly Calculations: "calculations";
    readonly Values: "values";
};
export type ContentType = typeof ContentType[keyof typeof ContentType];
