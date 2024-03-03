import { ProvidedIn } from "../units/injectable/injectable-options";
import { providerTypeToString } from "./provide-type";
import {
    Provider,
    ProviderDefinition,
    coerceProvideType,
    isSomeProvider,
} from "./provider";

export interface ProviderState<T = unknown> {
    definition: ProviderDefinition<T>;
    instance?: T;
}

export type NonProvidedInProvider<T extends Provider> = T extends {
    providedIn: unknown;
}
    ? Omit<T, "providedIn">
    : T;

export interface LocalProviderState<T = unknown> extends ProviderState<T> {
    definition: NonProvidedInProvider<ProviderDefinition<T>>;
}

export type ProviderWithProvidedIn<T extends ProviderDefinition> = T extends {
    providedIn?: unknown;
}
    ? T & { providedIn: NonNullable<T["providedIn"]> }
    : never;

export function assertIsProvidedIn<T extends ProviderDefinition>(
    provider: T,
): asserts provider is ProviderWithProvidedIn<T> {
    if (!isSomeProvider(provider) || provider.providedIn === undefined) {
        throw new Error(
            `Provider ${providerTypeToString(coerceProvideType(provider))} has no providedIn property`,
        );
    }
}

export function upsertProvidedIn<T extends ProviderDefinition>(
    provider: T,
    provideIn: ProvidedIn,
): asserts provider is ProviderWithProvidedIn<T> {
    provider.providedIn = provider.providedIn ?? provideIn;
}

export interface RootProviderState<T = unknown> extends ProviderState<T> {
    definition: ProviderWithProvidedIn<ProviderDefinition<T>>;
}
