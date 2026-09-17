export declare function Resolver(): ClassDecorator;
export declare function GqlList(model: Function): PropertyDecorator;
export declare function GqlGet(model: Function): PropertyDecorator;
export declare function GqlCreate(model: Function): PropertyDecorator;
export declare function GqlUpdate(model: Function): PropertyDecorator;
export declare function GqlDelete(model: Function): PropertyDecorator;
export declare function GqlQuery(returnType: () => unknown): MethodDecorator;
export declare function GqlMutation(returnType: () => unknown): MethodDecorator;
export interface GqlArgOptions {
    nullable?: boolean;
    defaultValue?: unknown;
    description?: string;
}
export declare function Arg(name: string, type: () => unknown, options?: GqlArgOptions): ParameterDecorator;
export declare function Ctx(): ParameterDecorator;
