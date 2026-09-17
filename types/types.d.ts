import type { SortDirectionValue } from './values';
export interface PaginationArgs {
    page?: number;
    limit?: number;
}
export interface SortArgs {
    field: string;
    direction: SortDirectionValue;
}
export interface ListResult<T> {
    hits: T[];
    total: number;
    page: number;
}
export type ListQuery<T> = (args?: {
    search?: string;
    pagination?: PaginationArgs;
    sort?: SortArgs;
}) => Promise<ListResult<T>>;
export type GetQuery<T> = (args: {
    id: string;
}) => Promise<T | null>;
export type CreateMutation<T> = (args: {
    input: Record<string, unknown>;
}) => Promise<T>;
export type UpdateMutation<T> = (args: {
    id: string;
    input: Record<string, unknown>;
}) => Promise<T>;
export type DeleteMutation<T> = (args: {
    id: string;
}) => Promise<boolean>;
