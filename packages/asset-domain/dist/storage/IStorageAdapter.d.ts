export interface IStorageAdapter {
    getByGuid(guid: string): Promise<Response | null>;
}
