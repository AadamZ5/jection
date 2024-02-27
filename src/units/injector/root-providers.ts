import { ProvidedIn } from "../injectable/injectable-options";
import { ProvideType } from "../../types/provide-type";
import {
    Provider,
    ProviderDefinition,
    coerceProviderToProviderDefinition,
} from "../../types/provider";
import { upsertProvidedIn } from "../../types/provider-state";
/**
 * Internal library mechanism for keeping track of the root
 * providers. This should not be exposed to library consumers.
 */
export class RootProviders {
    private static providers = new Map<ProvideType, ProviderDefinition>();
    private static addedCallbacks = new Set<
        (provider: ProviderDefinition) => void
    >();

    /**
     * Lazy chunks can cause more providers to be added at runtime, watch for
     * them here.
     *
     * @param callback Callback for each provider added.
     * @returns A teardown function that when called will stop watching for
     * new providers.
     */
    public static onProviderAdded(callback: (provider: Provider) => void) {
        RootProviders.addedCallbacks.add(callback);
        return () => {
            RootProviders.addedCallbacks.delete(callback);
        };
    }

    /**
     * As lazy chunks get loaded, they will need to add root providers.
     * That will happen here.
     */
    public static addProvider(...providers: Provider[]) {
        providers.forEach((provider) => {
            provider = coerceProviderToProviderDefinition(provider);

            if (RootProviders.providers.has(provider.provide)) {
                return;
            }

            upsertProvidedIn(provider, ProvidedIn.ROOT);
            RootProviders.providers.set(provider.provide, provider);
            RootProviders._notifyAdded(provider);
        });
    }

    /**
     * Gets all current root providers
     */
    public static getProviders(): ReadonlySet<ProviderDefinition> {
        return new Set(RootProviders.providers.values());
    }

    /**
     * Notifies all listeners that a provider has been added.
     *
     * @param provider The provider that was added.
     */
    private static _notifyAdded(provider: ProviderDefinition) {
        RootProviders.addedCallbacks.forEach((callback) => {
            callback(provider);
        });
    }
}
