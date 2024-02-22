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
import { ModuleLoader } from "../module/module-loader";
import { ProviderState } from "./provider-state";

export abstract class Injector {
    providers = new Map<ProvideType, ProviderState>();

    abstract get<T>(providerType: ProvideType<T>): T;

    /**
     * Resolves the requested provider, creating an instance if one
     * has not been created yet.
     *
     * @param providerState
     * @returns
     */
    protected resolve<T>(providerState: ProviderState<T>): T {
        if (!providerState.instance) {
            providerState.instance = this.createInstance(
                providerState.definition,
            );
        }

        this.doDiPostProcessing(
            coerceProvideType(providerState.definition),
            providerState.instance,
        );

        return providerState.instance;
    }

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
                (instance as ModuleLoader<T>)[MODULE_LOADER_INJECTOR] = this;
            }
        }

        return instance;
    }

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

        const parameters: unknown[] =
            Reflect.getMetadata("design:paramtypes", useClass) ?? [];

        const dependencies = parameters.map((param) => {
            if (!isProvideType(param)) {
                throw new TypeError(
                    `Unknown class dependency type ${JSON.stringify(param)}`,
                );
            }
            return this.get(param);
        });

        return new useClass(...dependencies) as T;
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

    private _assertProvideType<T>(
        providerType: unknown,
    ): asserts providerType is ProvideType<T> {
        if (!isProvideType(providerType)) {
            throw new TypeError(
                `Unknown provider type: ${JSON.stringify(providerType)}`,
            );
        }
    }
}
