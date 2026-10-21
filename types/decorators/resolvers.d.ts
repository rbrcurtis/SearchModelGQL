import type { GqlOpOptions } from '../auth';
export declare function Resolver(): ClassDecorator;
export declare function GqlList(model: Function, options?: GqlOpOptions): PropertyDecorator;
export declare function GqlGet(model: Function, options?: GqlOpOptions): PropertyDecorator;
export declare function GqlCreate(model: Function, options?: GqlOpOptions): PropertyDecorator;
export declare function GqlUpdate(model: Function, options?: GqlOpOptions): PropertyDecorator;
export declare function GqlDelete(model: Function, options?: GqlOpOptions): PropertyDecorator;
export declare function GqlQuery(returnType: () => unknown, options?: GqlOpOptions): MethodDecorator;
export declare function GqlMutation(returnType: () => unknown, options?: GqlOpOptions): MethodDecorator;
export interface GqlArgOptions {
    nullable?: boolean;
    defaultValue?: unknown;
    description?: string;
}
export declare function Arg(name: string, type: () => unknown, options?: GqlArgOptions): ParameterDecorator;
export declare function Ctx(): ParameterDecorator;
