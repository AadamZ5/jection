import { ProvideType, providerTypeToString } from "../../types/provide-type";
import { Provider, coerceProvideType } from "../../types/provider";
import { ProvidedIn } from "../injectable/injectable-options";
import { Injector } from "./injector";
import { ProviderLocation } from "./provider-resolution";
import { ProviderState } from "./provider-state";
import { RootProviders } from "./root-providers";

export class RootInjector extends Injector {
    private static globalRootInjector: RootInjector;

    /**
     * Anywhere providers can get resolved at some other injector. They
     * can be instantiated "anywhere" meaning at any place in the injection
     * hierarchy. `ModuleInjector`s use this to determine if they should
     * resolve at them or pass up the resolution to a parent.
     */
    private anywhereProviders = new Set<Provider>();

    constructor(providers: Provider[]) {
        // Root injector has no parent.
        super(undefined);

        const rootDefinedProviders = [...RootProviders.getProviders()].map(
            (ctx) => {
                if (ctx.type === ProvidedIn.ANYWHERE) {
                    this.anywhereProviders.add(ctx.provider);
                }

                return ctx.provider;
            },
        );

        this._populateProviders([...providers, ...rootDefinedProviders]);
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

        // If the provider is registered here and is in `anywhereProviders` then it is
        // provide type `ANYWHERE`. If it's not in that set, then it's defined here in
        // root, thus it is `ProvidedIn.ROOT`
        const provideType = this.anywhereProviders.has(providerState.definition)
            ? ProvidedIn.ANYWHERE
            : ProvidedIn.ROOT;

        return {
            foundIn: this,
            providerState,
            providedIn: provideType,
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
        return RootProviders.onProviderAdded((ctx) => {
            if (ctx.type === ProvidedIn.ANYWHERE) {
                this.anywhereProviders.add(ctx.provider);
            }
            this._addProvider(ctx.provider);
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

        RootInjector.globalRootInjector = new RootInjector([]);
    }
}
