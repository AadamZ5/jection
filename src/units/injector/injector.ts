import { Klass } from "../../types/class";
import { MODULE_LOADER_INJECTOR } from "../../constants/module-loader-symbols";
import { DI_MODULE_LOADER } from "../../constants/reflect-keys";
import { ProvideType, isProvideType } from "../../types/provide-type";
import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    Provider,
    ValueProvider,
    coerceProvideType,
    isClassProvider,
    isExistingProvider,
    isFactoryProvider,
    isKlassProvider,
    isValueProvider,
} from "../../types/provider";
import { ModuleLoaderBase } from "../module/module-loader";
import { ProviderLocation, ProviderResolution } from "./provider-resolution";
import { ProviderState } from "./provider-state";
import { RootProviders } from "./root-providers";

export abstract class Injector {
    constructor(public readonly parent: Injector | undefined) {}

    /**
     * All registered providers in this injector.
     *
     * TODO: Support `multi` providers!
     */
    protected providers = new Map<ProvideType, ProviderState>();

    /**
     * Attempts to resolve an instance from a provider type.
     *
     * @throws if the provider can not be found in the injection
     * hierarchy
     */
    abstract get<T>(providerType: ProvideType<T>): T;

    /**
     * Search parents for a provider, and return the
     * definition, location, and scope (if applicable) of
     * that provider.
     *
     * @param providerType The identifying type of the provider
     * @throws if the provider is not found in the injection hierarchy
     */
    abstract resolveProviderLocation<T>(
        providerType: ProvideType<T>,
    ): ProviderLocation<T>;

    /**
     * Resolves the requested provider at this injector's level, creating an instance
     * on the given state object if one has not been created yet.
     *
     * @param providerState The state to get or create an instance from
     * @returns an instance of the thing
     */
    protected resolve<T>(providerState: ProviderState<T>): T {
        if (!providerState.instance) {
            providerState.instance = this.createInstance(
                providerState.definition,
            );

            this.doDiPostProcessing(
                coerceProvideType(providerState.definition),
                providerState.instance,
            );
        }

        return providerState.instance;
    }

    /**
     * Some things (only `ModuleLoaders`) have things that need applied to them
     * directly after instantiation.
     *
     * @param providerType
     * @param instance
     * @returns
     */
    private doDiPostProcessing<T>(
        providerType: ProvideType<T>,
        instance: T,
    ): T {
        if (isKlassProvider(providerType)) {
            const isModuleLoader = Reflect.getMetadata(
                DI_MODULE_LOADER,
                providerType,
            );
            if (isModuleLoader) {
                // TODO: Should this happen after all parent injection searches at the
                // TODO: lowest child level, or here at the highest parent level?
                (instance as ModuleLoaderBase<T>)[MODULE_LOADER_INJECTOR] =
                    this;
            }
        }

        return instance;
    }

    /**
     * Given a provider, will create a value from the definition. If
     * any dependencies are needed, will attempt to resolve those dependencies.
     *
     * @param provider
     * @returns
     */
    private createInstance<T>(provider: Provider<T>): T {
        if (isValueProvider(provider)) {
            return this._createValueStrategy(provider);
        } else if (isClassProvider(provider)) {
            return this._createClassStrategy(provider);
        } else if (isExistingProvider(provider)) {
            return this._createExistingStrategy(provider);
        } else if (isFactoryProvider(provider)) {
            return this._createFactoryStrategy(provider);
        } else if (isKlassProvider(provider)) {
            return this._createClassStrategy({
                provide: provider,
                useClass: provider,
            });
        } else {
            throw new Error(
                `Unknown provider type: ${JSON.stringify(provider)}`,
            );
        }
    }

    private _createValueStrategy<T>(provider: ValueProvider<T>): T {
        return provider.useValue;
    }

    private _createClassStrategy<T>(provider: ClassProvider<T>): T {
        const { useClass } = provider;

        const dependencies = this._resolveClassDependenciesShallow(provider);

        // Try to resolve each dependency
        const instances = dependencies.map((dep) => {
            return this.get(coerceProvideType(dep.providerState.definition));
        });

        return new useClass(...instances) as T;
    }

    private _createExistingStrategy<T>(provider: ExistingProvider<T>): T {
        return this.get(provider.useExisting);
    }

    private _createFactoryStrategy<T>(provider: FactoryProvider<T>): T {
        const { useFactory, factoryDeps } = provider;
        const deps = (factoryDeps || []).map((dep) => {
            if (isProvideType(dep)) {
                return this.get(dep);
            } else {
                return dep;
            }
        });
        return useFactory(...deps);
    }

    /**
     * Given a provider, get nested provider resolution objects
     * that give information about what and where this
     * provider's dependencies are.
     *
     * @param provider The provider to form a dependency tree for
     * @returns A dependency tree `ProviderResolution`
     */
    private getProviderDependencyTree<T>(provider: Provider<T>) {
        const location = this.resolveProviderLocation(
            coerceProvideType(provider),
        );
        const dependencies = this._getProviderDependencies(provider);

        return {
            dependencies,
            foundIn: location.foundIn,
            providerState: location.providerState,
        } satisfies ProviderResolution;
    }

    private _getProviderDependencies<T>(
        provider: Provider<T>,
    ): ProviderResolution<unknown>[] {
        if (isValueProvider(provider)) {
            return [];
        } else if (isClassProvider(provider)) {
            return this._resolveClassDependencies(provider);
        } else if (isExistingProvider(provider)) {
            return [this._resolveExistingDependencies(provider)];
        } else if (isFactoryProvider(provider)) {
            return this._resolveFactoryDependencies(provider);
        } else if (isKlassProvider(provider)) {
            return this._resolveClassDependencies({
                provide: provider,
                useClass: provider,
            });
        } else {
            throw new Error(
                `Unknown provider type: ${JSON.stringify(provider)}`,
            );
        }
    }

    private _resolveClassDependenciesShallow<T>(
        provider: ClassProvider<T>,
    ): ProviderLocation<unknown>[] {
        const { useClass } = provider;

        const parameters: (string | symbol | Klass)[] =
            Reflect.getMetadata("design:paramtypes", useClass) ?? [];

        return parameters.map((param, index) => {
            const provideType =
                RootProviders.resolveConstructorParamToProviderType(
                    useClass,
                    param,
                    index,
                );

            if (!isProvideType(provideType)) {
                throw new TypeError(
                    `Unknown class dependency type ${JSON.stringify(param)}`,
                );
            }

            const providerLocation = this.resolveProviderLocation(provideType);

            return providerLocation;
        });
    }

    private _resolveClassDependencies<T>(
        provider: ClassProvider<T>,
    ): ProviderResolution<unknown>[] {
        return this._resolveClassDependenciesShallow(provider).map(
            (resolvedProvider) => {
                return this.getProviderDependencyTree(
                    resolvedProvider.providerState.definition,
                );
            },
        );
    }

    private _resolveExistingDependencies<T>(
        provider: ExistingProvider<T>,
    ): ProviderResolution<unknown> {
        const thisProviderResolved = this.resolveProviderLocation(
            provider.useExisting,
        );

        return {
            dependencies: this._getProviderDependencies(
                thisProviderResolved.providerState.definition,
            ),
            foundIn: thisProviderResolved.foundIn,
            providerState: thisProviderResolved.providerState,
        };
    }

    private _resolveFactoryDependencies<T>(
        provider: FactoryProvider<T>,
    ): ProviderResolution<unknown>[] {
        return (
            provider.factoryDeps?.map((provideType) => {
                const thisProviderResolved =
                    this.resolveProviderLocation(provideType);
                return {
                    dependencies: this._getProviderDependencies(
                        thisProviderResolved.providerState.definition,
                    ),
                    ...thisProviderResolved,
                } satisfies ProviderResolution<unknown>;
            }) ?? []
        );
    }
}
