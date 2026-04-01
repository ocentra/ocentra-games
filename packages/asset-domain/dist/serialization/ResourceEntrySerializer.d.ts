import { ResourceEntry } from '../resourceEntry/ResourceEntry';
export declare class ResourceEntrySerializer {
    static serialize(entry: ResourceEntry): Record<string, unknown>;
    static deserialize(data: Record<string, unknown>): ResourceEntry;
    static deserializeArray(data: unknown[]): ResourceEntry[];
}
