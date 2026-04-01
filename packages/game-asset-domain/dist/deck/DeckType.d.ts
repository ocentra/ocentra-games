export declare const DeckType: {
    readonly Normal: "NormalDeck";
    readonly Standard52: "Standard52";
    readonly Standard52PlusJokers: "Standard52PlusJokers";
    readonly Extended54: "Extended54";
    readonly Custom: "Custom";
};
export type DeckType = typeof DeckType[keyof typeof DeckType];
