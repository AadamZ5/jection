import { ProvidedIn } from "../units/injectable/injectable-options";
import { Klass } from "./class";
import { ProvideType } from "./provide-type";

export interface SomeProvider<T = unknown> {
    /** The identifier of the provider. Usually a type of some sort. */
    provide: ProvideType<T>;

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

export function isSomeProvider<T = unknown>(
    provider: unknown,
): provider is SomeProvider<T> {
    return (
        typeof provider === "object" &&
        provider !== null &&
        !!(provider as SomeProvider<T>).provide
    );
}

export interface ValueProvider<T = unknown> extends SomeProvider<T> {
    /** The value that this provider will provide to dependents */
    useValue: T;
}

export function isValueProvider<T = unknown>(
    provider: unknown,
): provider is ValueProvider<T> {
    return (
        isSomeProvider(provider) && !!(provider as ValueProvider<T>).useValue
    );
}

export interface ClassProvider<T = unknown, C = unknown>
    extends SomeProvider<T> {
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

export function isClassProvider<T = unknown>(
    provider: unknown,
): provider is ClassProvider<T> {
    return (
        isSomeProvider(provider) && !!(provider as ClassProvider<T>).useClass
    );
}

export interface ExistingProvider<T = unknown> extends SomeProvider<T> {
    /**
     * The existing provider identifier to resolve and use when this
     * provider is requested.
     */
    useExisting: ProvideType<T>;
}

export function isExistingProvider<T = unknown>(
    provider: unknown,
): provider is ExistingProvider<T> {
    return (
        isSomeProvider(provider) &&
        !!(provider as ExistingProvider<T>).useExisting
    );
}

export interface FactoryProvider<
    T = unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (...args: any[]) => T = (...args: any[]) => T,
> extends SomeProvider<T> {
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
}

export function isFactoryProvider<T = unknown>(
    provider: unknown,
): provider is FactoryProvider<T> {
    return (
        isSomeProvider(provider) &&
        !!(provider as FactoryProvider<T>).useFactory
    );
}

export function isKlassProvider<T = unknown>(
    provider: unknown,
): provider is Klass<T> {
    return (
        typeof provider === "function" &&
        provider.prototype &&
        provider.constructor &&
        Reflect.getMetadata("design:type", provider) !== "Function"
    );
}

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
        return provider.provide;
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
    if (isKlassProvider(provider)) {
        return {
            provide: provider,
            useClass: provider,
        };
    } else {
        return provider;
    }
}
