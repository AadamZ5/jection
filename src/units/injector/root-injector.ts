import { ProvideType, providerTypeToString } from "../../types/provide-type";
import { Provider, coerceProvideType } from "../../types/provider";
import { Injector } from "./injector";
import { ProviderState } from "./provider-state";
import { RootProviders } from "./root-providers";

export class RootInjector extends Injector {
    private static globalRootInjector: RootInjector;

    constructor(providers: Provider[]) {
        super();

        this._populateProviders([
            ...providers,
            ...RootProviders.getProviders(),
        ]);
        this._watchForNewProviders();
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

        RootInjector.globalRootInjector = new RootInjector([]);
    }
}
