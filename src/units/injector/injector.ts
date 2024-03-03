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
import { ProviderLocation } from "./provider-resolution";
import { ProviderState } from "../../types/provider-state";
import { resolveCtorParamProvideType } from "./injector-util";
import {
    getConstructorInjectHelpers,
    getPropertyInjectHelpers,
} from "./inject-decorator";
import { PreparedModuleLoader } from "../module/module-loader";

export abstract class Injector {
    constructor(public readonly parent: Injector | undefined) {}

    /**
     * All registered providers in this injector.
     *
     * TODO: Support `multi` providers!
     */
    protected abstract readonly providers: Map<ProvideType, ProviderState>;

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
        let instance = providerState.instance;

        if (instance === undefined) {
            instance = this.createInstance(providerState.definition);

            providerState.instance = instance;

            // If we're a factory provider with caching disabled,
            // don't save the instance.
            if (
                isFactoryProvider(providerState.definition) &&
                providerState.definition.cacheResult === false
            ) {
                delete providerState.instance;
            }

            this.doDiPostProcessing(
                coerceProvideType(providerState.definition),
                instance,
            );
        }

        return instance!;
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
                providerType as object,
            );
            if (isModuleLoader) {
                // TODO: Should this happen after all parent injection searches at the
                // TODO: lowest child level, or here at the highest parent level?
                (instance as PreparedModuleLoader<Klass>)[
                    MODULE_LOADER_INJECTOR
                ] = this;
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
    private createInstance<T>(provider: Provider<T>) {
        if (isValueProvider<T>(provider)) {
            return this._createValueStrategy(provider);
        } else if (isClassProvider<T>(provider)) {
            return this._createClassStrategy(provider);
        } else if (isExistingProvider<T>(provider)) {
            return this._createExistingStrategy(provider);
        } else if (isFactoryProvider<T>(provider)) {
            return this._createFactoryStrategy(provider);
        } else if (isKlassProvider<T>(provider)) {
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

    private _createClassStrategy<T>(provider: ClassProvider<T>) {
        const { useClass } = provider;

        const { ctorDeps, propDeps } =
            this._resolveClassDependenciesShallow(provider);

        // Try to resolve each dependency
        const ctorValues = ctorDeps.map((dep) => {
            return this.get(coerceProvideType(dep.providerState.definition));
        });

        const propValues = [...propDeps.entries()].map(([propertyKey, dep]) => {
            return [
                propertyKey,
                this.get(coerceProvideType(dep.providerState.definition)),
            ] as const;
        });

        const instance = new useClass(...ctorValues) as T;
        propValues.forEach(([propKey, propValue]) => {
            instance[propKey as keyof T] = propValue as T[keyof T];
        });
        return instance;
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

    private _resolveClassDependenciesShallow<T>(provider: ClassProvider<T>): {
        ctorDeps: ProviderLocation[];
        propDeps: Map<string | symbol, ProviderLocation>;
    } {
        const { useClass } = provider;

        const parameters: (string | symbol | Klass)[] =
            Reflect.getMetadata("design:paramtypes", useClass) ?? [];

        const ctorHelpers = getConstructorInjectHelpers(useClass);
        const propHelpers = getPropertyInjectHelpers(useClass);

        // First we resolve property injections
        const propertyDeps = new Map(
            [...(propHelpers?.entries() ?? [])].map(
                ([propKey, provideType]) => {
                    return [
                        propKey as string | symbol,
                        this.resolveProviderLocation(
                            provideType as ProvideType<unknown>,
                        ),
                    ] as const;
                },
            ),
        );

        // Then resolve constructor injections
        const constructorDeps = parameters.map((param, index) => {
            const provideType = resolveCtorParamProvideType(
                ctorHelpers,
                param,
                index,
            );
            return this.resolveProviderLocation(provideType);
        });

        // Return the resolved provider locations
        return {
            ctorDeps: constructorDeps,
            propDeps: propertyDeps,
        };
    }
}
