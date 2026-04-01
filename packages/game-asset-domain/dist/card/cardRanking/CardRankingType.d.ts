export declare const CardRankingType: {
    readonly Default: "StandardCardRanking";
    readonly Standard: "StandardCardRanking";
    readonly Custom: "Custom";
};
export type CardRankingType = typeof CardRankingType[keyof typeof CardRankingType];
