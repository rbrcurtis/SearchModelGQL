export interface SearchOptionsLike {
    limit?: number;
    sort?: string;
    page?: number;
}
export interface SearchModelInstance {
    id: string;
    update(data: Record<string, unknown>): SearchModelInstance;
    save(options?: {
        wait?: boolean;
    }): Promise<SearchModelInstance>;
    delete(): Promise<void>;
}
export interface SearchModelClass<T extends SearchModelInstance = SearchModelInstance> {
    readonly indexName: string;
    new (data?: Record<string, unknown>): T;
    create(props: Record<string, unknown>, options?: {
        wait?: boolean;
    }): Promise<T>;
    find(terms: string[], options?: SearchOptionsLike): Promise<T[]>;
    findWithTotal(terms: string[], options?: SearchOptionsLike): Promise<{
        hits: T[];
        total: number;
    }>;
    getById(id: string): Promise<T | null>;
}
export interface SearchFieldMetadata {
    propertyKey: string;
    type: 'date' | 'dateOnly' | 'string' | 'number' | 'stringArray' | 'object' | 'objectArray' | 'boolean' | 'keyword' | 'stringMap' | 'geoPoint' | 'vector';
    options?: {
        required?: boolean;
        default?: () => unknown;
        properties?: Record<string, SearchFieldMetadata>;
    };
}
