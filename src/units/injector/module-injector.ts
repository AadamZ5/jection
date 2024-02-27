import { ProvidedIn } from "../injectable/injectable-options";
import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import {
    ClassProvider,
    ExistingProvider,
    Provider,
    ValueProvider,
    coerceProviderToProviderDefinition,
} from "../../types/provider";
import {
    getModuleMeta,
    resolveAllImportedProviders,
} from "../module/module-meta";
import { Injector } from "./injector";
import { ProviderLocation } from "./provider-resolution";
import { LocalProviderState, ProviderState } from "../../types/provider-state";
import { RootProviders } from "./root-providers";

export class ModuleInjector<T> extends Injector {
    private readonly moduleMeta = getModuleMeta(this.moduleType);

    protected providers = new Map<ProvideType, LocalProviderState>();

    constructor(
        private readonly parentInjector: Injector,
        private readonly moduleType: Klass<T>,
    ) {
        super(parentInjector);
        this._populateModuleProviders();
        this._processModuleImports();
    }

    resolveProviderLocation<T>(
        providerType: ProvideType<T>,
    ): ProviderLocation<T> {
        const providerState = this.providers.get(
            providerType,
        ) as ProviderState<T>;

        if (!providerState) {
            return this.parentInjector.resolveProviderLocation(providerType);
        } else {
            return {
                providerState,
                foundIn: this,
            };
        }
    }

    private _populateModuleProviders() {
        this.moduleMeta.providers.forEach((provider) => {
            this._addProvider(provider);
        });

        const thisInjectorProvider: ValueProvider<ModuleInjector<T>> = {
            provide: ModuleInjector,
            useValue: this,
        };

        const abstractInjectorProvider: ExistingProvider<Injector> = {
            provide: Injector,
            useExisting: ModuleInjector,
        };

        const moduleClassProvider: ClassProvider<T, T> = {
            provide: this.moduleType,
            useClass: this.moduleType,
        };

        this._addProvider(thisInjectorProvider);
        this._addProvider(abstractInjectorProvider);
        this._addProvider(moduleClassProvider);
    }

    private _addProvider(provider: Provider) {
        provider = coerceProviderToProviderDefinition(provider);
        const { providedIn, provide: provideType } = provider;
        // If the provider is specified to be provided in root or anywhere,
        // then add it to the root providers store. Otherwise, just add
        // it to this module.
        if (
            providedIn === ProvidedIn.ANYWHERE ||
            providedIn === ProvidedIn.ROOT
        ) {
            RootProviders.addProvider(provider);
        } else {
            if (!this.providers.has(provideType)) {
                this.providers.set(provideType, {
                    definition: provider,
                });
            }
        }
    }

    private _processModuleImports() {
        this.moduleMeta.imports?.forEach((importedModule) => {
            this._importModule(importedModule);
        });
    }

    private _importModule(moduleType: Klass) {
        const moduleMeta = getModuleMeta(moduleType);

        // First deeply resolve all imported module providers
        const importedProviders = resolveAllImportedProviders(moduleMeta);

        // Only the exports of this module that we're importing get added
        // to our provider store.
        const exportedProviders = new Set<Provider>();

        // For each provide type defined in the exports, try to resolve
        // it against all deeply resolved imports
        moduleMeta.exports?.forEach((exportType) => {
            // TODO Do we silent ignore exported members that aren't imported?
            const exportedProvider = importedProviders.get(exportType);
            if (!exportedProvider) {
                return;
            }
            exportedProviders.add(exportedProvider);
        });

        // Add the resolved exported providers.
        exportedProviders.forEach((provider) => {
            this._addProvider(provider);
        });

        // Add a provider for this imported module too.
        const importedModuleClassProvider: ClassProvider = {
            provide: moduleType,
            useClass: moduleType,
        };

        this._addProvider(importedModuleClassProvider);
    }

    get<T>(providerType: ProvideType<T>): T {
        const providerState = this.providers.get(providerType);

        if (providerState) {
            return this.resolve(providerState as ProviderState<T>);
        }

        const providerLocation = this.resolveProviderLocation(providerType);
        const { providedIn } = providerLocation.providerState.definition;

        /**
         * If this provider was declared to be anywhere, load it here.
         */
        if (providedIn === ProvidedIn.ANYWHERE) {
            return this.resolve(providerLocation.providerState);
        }

        return this.parentInjector.get(providerType);
    }
}
