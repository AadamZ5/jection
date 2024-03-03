import { ProvidedIn } from "../units/injectable/injectable-options";
import { Klass } from "./class";
import { ProvideType } from "./provide-type";

export type IdentifiedProvider<T = unknown> = {
    provide: ProvideType<T>;
};

export interface SomeProviderBody {
    /** Optional declaration about where this provider should be resolved at */
    providedIn?: ProvidedIn;

    /**
     * Optional flag to indicate that multiple instances of this provider
     * can be registered.
     *
     * TODO: This is not yet implemented.
     */
    multi?: boolean;
}

export type SomeProvider<T = unknown> = SomeProviderBody &
    IdentifiedProvider<T>;

export function isSomeProvider<T = unknown>(
    provider: unknown,
): provider is SomeProvider<T> {
    return (
        typeof provider === "object" &&
        provider !== null &&
        !!(provider as SomeProvider<T>).provide
    );
}

export interface ValueProviderBody<T = unknown> extends SomeProviderBody {
    /** The value that this provider will provide to dependents */
    useValue: T;
}

export type ValueProvider<T = unknown> = ValueProviderBody<T> &
    IdentifiedProvider<T>;

export function isValueProvider<T = unknown>(
    provider: unknown,
): provider is ValueProvider<T> {
    const useValueKey: keyof Pick<ValueProvider, "useValue"> = "useValue";
    return (
        isSomeProvider<T>(provider) &&
        useValueKey in (provider as ValueProvider<T>)
    );
    // We can't really check the truthy-ness of `useValue` property because
    // they may be supplying a falsey value. We can only check if they
    // actually provided the property using the "in" operator.
}

export interface ClassProviderBody<C = unknown> extends SomeProviderBody {
    /**
     * The class that will be auto-wired and provided to dependents.
     *
     * If this class has dependencies, they will be attempted to be
     * resolved and injected into the class. The class does not need
     * to be marked as `@Injectable` for dependencies to be injected
     * when using this provider.
     */
    useClass: Klass<C>;
}

export type ClassProvider<T = unknown, C = unknown> = ClassProviderBody<C> &
    IdentifiedProvider<T>;

export function isClassProvider<T = unknown, C = unknown>(
    provider: unknown,
): provider is ClassProvider<T, C> {
    return (
        isSomeProvider(provider) && !!(provider as ClassProvider<T>).useClass
    );
}

export interface ExistingProviderBody<T = unknown> extends SomeProviderBody {
    /**
     * The existing provider identifier to resolve and use when this
     * provider is requested.
     */
    useExisting: ProvideType<T>;
}

export type ExistingProvider<T = unknown> = ExistingProviderBody<T> &
    IdentifiedProvider<T>;

export function isExistingProvider<T = unknown>(
    provider: unknown,
): provider is ExistingProvider<T> {
    return (
        isSomeProvider(provider) &&
        !!(provider as ExistingProvider<T>).useExisting
    );
}

export interface FactoryProviderBody<
    T = unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (...args: any[]) => T = (...args: any[]) => T,
> extends SomeProviderBody {
    /**
     * The factory function that will be called to create the value
     * that this provider will provide to dependents.
     *
     * The result will be cached and returned on future requests for
     * this provider in the same injector.
     */
    useFactory: F;
    /**
     * Optional dependencies to pass to the factory function.
     */
    factoryDeps?: Parameters<F> | unknown[];
    /**
     * If the factory result should be cached. Default
     * is `true`.
     */
    cacheResult?: boolean;
}

export type FactoryProvider<
    T = unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (...args: any[]) => T = (...args: any[]) => T,
> = FactoryProviderBody<T, F> & IdentifiedProvider<T>;

export function isFactoryProvider<T = unknown>(
    provider: unknown,
): provider is FactoryProvider<T> {
    return (
        isSomeProvider(provider) &&
        !!(provider as FactoryProvider<T>).useFactory
    );
}

export function isKlassProvider<T>(provider: unknown): provider is Klass<T> {
    return (
        typeof provider === "function" &&
        provider.prototype &&
        provider.constructor &&
        Reflect.getMetadata("design:type", provider) !== "Function"
    );
}

export type ProviderBody<T = unknown> =
    | ValueProviderBody<T>
    | ClassProviderBody<T>
    | ExistingProviderBody<T>
    | FactoryProviderBody<T>;

export type ProviderDefinition<T = unknown> =
    | ValueProvider<T>
    | ClassProvider<T>
    | ExistingProvider<T>
    | FactoryProvider<T>;

/**
 * A provider.
 *
 * This can be one of the provider interface variations,
 * or simply a class type.
 *
 * When a class type is used, it is short-hand for a `ClassProvider`
 * with both the `useClass` and `provide` properties set to the
 * class type.
 */
export type Provider<T = unknown> = ProviderDefinition<T> | Klass<T>;

export function isProvider<T = unknown>(
    provider: unknown,
): provider is Provider<T> {
    return (
        isValueProvider(provider) ||
        isClassProvider(provider) ||
        isExistingProvider(provider) ||
        isFactoryProvider(provider) ||
        isKlassProvider(provider)
    );
}

/**
 * Given a `Provider` type, return the `ProvideType` of the provider.
 */
export function coerceProvideType<T>(provider: Provider<T>): ProvideType<T> {
    if (isKlassProvider(provider)) {
        return provider;
    } else {
        return (provider as SomeProvider<T>).provide;
    }
}

export function coerceProvidedIn<T extends Provider>(
    provider: T,
): ProvidedIn | undefined {
    return isSomeProvider(provider) ? provider.providedIn : undefined;
}

export function coerceProviderToProviderDefinition<T>(
    provider: Provider<T>,
): ProviderDefinition<T> {
    if (isKlassProvider<T>(provider)) {
        return {
            provide: provider,
            useClass: provider,
        };
    } else {
        return provider as ProviderDefinition<T>;
    }
}
