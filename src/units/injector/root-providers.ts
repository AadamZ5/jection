import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import { Provider, coerceProvideType } from "../../types/provider";
import { ProvidedIn } from "../injectable/injectable-options";
import { InjectHelper } from "./inject-decorator";

export interface ProviderContext<T = unknown> {
    provider: Provider<T>;
    type: ProvidedIn;
}

/**
 * Internal library mechanism for keeping track of the root
 * providers. This should not be exposed to library consumers.
 */
export class RootProviders {
    private static injectHelpers = new Set<InjectHelper>();
    private static providers = new Map<ProvideType, ProviderContext>();
    private static addedCallbacks = new Set<
        (provider: ProviderContext) => void
    >();

    /**
     * Lazy chunks can cause more providers to be added at runtime, watch for
     * them here.
     *
     * @param callback Callback for each provider added.
     * @returns A teardown function that when called will stop watching for
     * new providers.
     */
    public static onProviderAdded(
        callback: (provider: ProviderContext) => void,
    ) {
        RootProviders.addedCallbacks.add(callback);
        return () => {
            RootProviders.addedCallbacks.delete(callback);
        };
    }

    /**
     * As lazy chunks get loaded, they will need to add root providers.
     * That will happen here.
     */
    public static addProvider(...providerCtxs: ProviderContext[]) {
        providerCtxs.forEach((providerCtx) => {
            const provideType = coerceProvideType(providerCtx.provider);

            if (RootProviders.providers.has(provideType)) {
                return;
            }

            RootProviders.providers.set(provideType, providerCtx);
            RootProviders._notifyAdded(providerCtx);
        });
    }

    public static addInjectionHelper(helper: InjectHelper) {
        this.injectHelpers.add(helper);
    }

    public static resolveConstructorParamToProviderType(
        target: Klass,
        parameter: string | symbol | ProvideType,
        index?: number,
    ) {
        const helper = [...RootProviders.injectHelpers].find((helper) => {
            return (
                helper.target === target && helper.index === index
                //&& helper.propertyKey === parameter
            );
        });

        if (helper) {
            return helper.providerType;
        }

        return parameter;
    }

    /**
     * Gets all current root providers
     */
    public static getProviders(): ReadonlySet<ProviderContext> {
        return new Set(RootProviders.providers.values());
    }

    /**
     * Notifies all listeners that a provider has been added.
     *
     * @param provider The provider that was added.
     */
    private static _notifyAdded(provider: ProviderContext) {
        RootProviders.addedCallbacks.forEach((callback) => {
            callback(provider);
        });
    }
}
