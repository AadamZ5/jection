import { ProvideType, providerTypeToString } from "../../types/provide-type";
import {
    Provider,
    coerceProvideType,
    coerceProviderToProviderDefinition,
} from "../../types/provider";
import { ProvidedIn } from "../injectable/injectable-options";
import { Injector } from "./injector";
import { ProviderLocation } from "./provider-resolution";
import {
    ProviderState,
    RootProviderState,
    assertIsProvidedIn,
    upsertProvidedIn,
} from "../../types/provider-state";
import { RootProviders } from "./root-providers";

export class RootInjector extends Injector {
    private static globalRootInjector: RootInjector;

    protected providers = new Map<ProvideType, RootProviderState>();

    constructor(providers?: Provider[]) {
        // Root injector has no parent.
        super(undefined);

        if (providers) {
            this._populateProviders(providers);
        }
        const rootDefinedProviders = [...RootProviders.getProviders()];
        this._populateProviders(rootDefinedProviders);
        this._watchForNewProviders();
    }

    resolveProviderLocation<T>(
        providerType: ProvideType<T>,
    ): ProviderLocation<T> {
        const providerState = this.providers.get(
            providerType,
        ) as ProviderState<T>;

        if (!providerState) {
            throw new Error(
                `No provider found for ${providerTypeToString(providerType)}`,
            );
        }

        return {
            foundIn: this,
            providerState,
        };
    }

    /**
     * Populate this root injector with providers given.
     *
     * @param providers The providers to map into this injector.
     */
    private _populateProviders(providers: Provider[]) {
        providers.forEach((provider) => {
            this._addProvider(provider);
        });
    }

    /**
     * Watches the root providers for new providers being added.
     * This can happen when lazy chunks are loaded using `ModuleLoader`s.
     */
    private _watchForNewProviders() {
        return RootProviders.onProviderAdded((provider) => {
            this._addProvider(provider);
        });
    }

    private _addProvider(provider: Provider) {
        const provideType = coerceProvideType(provider);

        provider = coerceProviderToProviderDefinition(provider);
        upsertProvidedIn(provider, ProvidedIn.ROOT);

        // If the provider is in the root providers but does not
        // have a `providedIn` property, then what are we doing??
        assertIsProvidedIn(provider);

        this.providers.set(provideType, {
            definition: provider,
        });
    }

    get<T>(providerType: ProvideType<T>): T {
        const providerState = this.providers.get(providerType);

        if (!providerState) {
            throw new Error(
                `No provider found for ${providerTypeToString(providerType)}`,
            );
        }

        return this.resolve(providerState as ProviderState<T>);
    }

    /**
     * Gets the static instance of the root injector, or creates
     * one if it didn't exist yet.
     */
    public static getRootInjector(): RootInjector {
        if (!RootInjector.globalRootInjector) {
            this._setRootInjector();
        }

        return RootInjector.globalRootInjector;
    }

    private static _setRootInjector() {
        if (RootInjector.globalRootInjector) {
            throw new Error("RootInjector has already been initialized");
        }

        RootInjector.globalRootInjector = new RootInjector();
    }
}
