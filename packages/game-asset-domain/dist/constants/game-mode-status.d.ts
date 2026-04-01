export declare const GameModeStatus: {
    readonly Available: "Available";
    readonly ComingSoon: "ComingSoon";
    readonly Maintenance: "Maintenance";
    readonly Deprecated: "Deprecated";
};
export type GameModeStatus = typeof GameModeStatus[keyof typeof GameModeStatus];
