import { ProvidedIn } from "../injectable/injectable-options";
import { Injector } from "./injector";
import { ProviderState } from "./provider-state";

export interface ProviderLocation<T = unknown> {
    providerState: ProviderState<T>;
    foundIn: Injector;
    providedIn?: ProvidedIn;
}

export interface ProviderResolution<T = unknown> extends ProviderLocation<T> {
    dependencies: ProviderLocation<unknown>[];
}
