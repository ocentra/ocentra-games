export declare const PageSectionType: {
    readonly About: "about";
    readonly Rules: "rules";
    readonly Strategy: "strategy";
    readonly Scoring: "scoring";
    readonly Text: "text";
    readonly Screenshots: "screenshots";
    readonly Custom: "custom";
};
export type PageSectionType = typeof PageSectionType[keyof typeof PageSectionType];
