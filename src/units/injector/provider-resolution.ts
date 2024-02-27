import { Injector } from "./injector";
import { ProviderState } from "../../types/provider-state";

export interface ProviderLocation<T = unknown> {
    providerState: ProviderState<T>;
    foundIn: Injector;
}

export interface ProviderResolution<T = unknown> extends ProviderLocation<T> {
    dependencies: ProviderLocation<unknown>[];
}
