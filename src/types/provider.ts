import { Klass } from "./class";
import { ProvideType } from "./provide-type";

export interface SomeProvider<T = unknown> {
    provide: ProvideType<T>;
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
    useFactory: F;
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

export type Provider<T = unknown> =
    | ValueProvider<T>
    | ClassProvider<T>
    | ExistingProvider<T>
    | FactoryProvider<T>
    | Klass<T>;

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

export function coerceProvideType<T>(provider: Provider<T>): ProvideType<T> {
    if (isKlassProvider(provider)) {
        return provider;
    } else {
        return provider.provide;
    }
}
