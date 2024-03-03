import {
    DI_CTOR_INJECT_HELPERS,
    DI_PROP_INJECT_HELPERS,
} from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";

export function Inject<T>(
    providerType: ProvideType<T>,
    // eslint-disable-next-line @typescript-eslint/ban-types
): Function {
    return function (
        // eslint-disable-next-line @typescript-eslint/ban-types
        classDefOrPrototype: Klass | Object,
        propertyKey: string | symbol | undefined,
        index?: number,
    ) {
        // If the `index` is defined, then we're in a parameter decorator.
        if (typeof index === "number") {
            return _decorateParameter(
                classDefOrPrototype as Klass,
                propertyKey,
                index,
                providerType,
            );
        } else if (propertyKey) {
            return _decorateProperty(
                classDefOrPrototype,
                propertyKey,
                providerType,
            );
        } else {
            throw new Error(
                "Invalid usage of @Inject. It must be used on a non-static parameter or property.",
            );
        }
    } satisfies ParameterDecorator & PropertyDecorator;
}

export interface ConstructorInjectHelper<T = unknown> {
    ctorParamIndex: number;
    providerType: ProvideType<T>;
}

function _decorateParameter(
    classDefinition: Klass,
    _propertyKey: string | symbol | undefined,
    index: number,
    providerType: ProvideType,
) {
    const existingCtorInjectHelpers: ConstructorInjectHelper[] =
        Reflect.getMetadata(DI_CTOR_INJECT_HELPERS, classDefinition) ?? [];

    existingCtorInjectHelpers[index] = {
        ctorParamIndex: index,
        providerType: providerType as ProvideType<unknown>,
    };

    Reflect.defineMetadata(
        DI_CTOR_INJECT_HELPERS,
        existingCtorInjectHelpers,
        classDefinition,
    );
}

export function getConstructorInjectHelpers(
    target: Klass,
): ConstructorInjectHelper[] {
    return Reflect.getMetadata(DI_CTOR_INJECT_HELPERS, target) ?? [];
}

export type PropertyInjectHelpers = Map<string | symbol, ProvideType>;

function _decorateProperty(
    // eslint-disable-next-line @typescript-eslint/ban-types
    prototype: Object,
    propertyKey: string | symbol,
    providerType: ProvideType,
) {
    // When property decorators are used, the prototype is given to the
    // decorator where as in parameter decorators, the class definition
    // is given. Just make note.

    const existingPropInjectHelpers: PropertyInjectHelpers =
        Reflect.getMetadata(DI_PROP_INJECT_HELPERS, prototype) ?? new Map();

    existingPropInjectHelpers.set(propertyKey, providerType);

    Reflect.defineMetadata(
        DI_PROP_INJECT_HELPERS,
        existingPropInjectHelpers,
        prototype,
    );
}

export function getPropertyInjectHelpers(
    classDefinition: Klass,
): PropertyInjectHelpers | undefined {
    // The metadata was set on the prototype, so
    // use the prototype in the query.

    const proto = classDefinition.prototype;

    return Reflect.getMetadata(DI_PROP_INJECT_HELPERS, proto);
}
