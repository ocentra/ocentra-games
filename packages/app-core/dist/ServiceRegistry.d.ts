export interface ServiceRegistration {
    name: string;
    executionOrder: number;
    getOrCreateInstance: () => Promise<unknown>;
}
export declare class ServiceRegistry {
    private static registrations;
    static register(serviceClass: {
        executionOrder?: number;
    }, name: string, getOrCreateInstance: () => Promise<unknown>): void;
    static getRegistrations(): readonly ServiceRegistration[];
    static initializeAll(): Promise<void>;
}
