import { Injector } from "./injector";
import { ProviderState } from "../../types/provider-state";
import { Provider } from "../..";

export interface ProviderLocation<T = unknown> {
    providerState: ProviderState<T>;
    foundIn: Injector;
}

export interface ProviderResolution<T = unknown> extends ProviderLocation<T> {
    dependencies: ProviderLocation<unknown>[];
}

export interface ProviderDependencies<T = unknown> {
    provider: Provider<T>;
    dependencies: ProviderDependencies[];
}
