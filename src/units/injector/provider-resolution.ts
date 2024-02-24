import { Injector } from ".";
import { ProvidedIn } from "..";
import { ProviderState } from "./provider-state";

export interface ProviderLocation<T = unknown> {
    providerState: ProviderState<T>;
    foundIn: Injector;
    provideType?: ProvidedIn;
}

export interface ProviderResolution<T = unknown> extends ProviderLocation<T> {
    dependencies: ProviderLocation<unknown>[];
}
