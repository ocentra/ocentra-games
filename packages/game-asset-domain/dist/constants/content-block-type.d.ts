export declare const ContentBlockType: {
    readonly Text: "text";
    readonly Paragraph: "paragraph";
    readonly Heading: "heading";
    readonly List: "list";
    readonly RuleBlock: "rule-block";
    readonly StrategyBlock: "strategy-block";
    readonly Example: "example";
    readonly Formula: "formula";
    readonly SetupGrid: "setup-grid";
    readonly Highlight: "highlight";
    readonly CardValues: "card-values";
    readonly Calculation: "calculation";
    readonly PropertyTable: "property-table";
    readonly RankingList: "ranking-list";
    readonly PatternPreview: "pattern-preview";
    readonly Callout: "callout";
};
export type ContentBlockType = typeof ContentBlockType[keyof typeof ContentBlockType];
