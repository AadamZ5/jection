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
    ModuleImport,
    ModuleImportHelper,
    coerceModuleFromImport,
    moduleMetaFromImport,
} from "../module/module-meta";
import { Injector } from "./injector";
import { ProviderLocation } from "./provider-resolution";
import { LocalProviderState, ProviderState } from "../../types/provider-state";
import { RootProviders } from "./root-providers";
import { ModuleWithProviders } from "../module/module-with-providers";

export class ModuleInjector<T> extends Injector {
    /** The module type this injector is representing */
    private readonly moduleType = coerceModuleFromImport(this.moduleDefinition);
    /** The module metadata */
    protected readonly moduleMeta = moduleMetaFromImport(this.moduleDefinition);
    /** Module import helper for computing all necessary providers from imports */
    private readonly moduleImportHelper = new ModuleImportHelper(
        this.moduleType as Klass,
        this,
    );

    /**
     * Providers that are directly stated on a Module are declared here,
     * or providers that are consumed from imported module exports.
     */
    protected readonly providers = new Map<ProvideType, LocalProviderState>();

    /** All the provider types this injector's module type exports */
    public readonly moduleExportProviderTypes = new Set<ProvideType>(
        this.moduleMeta.exports,
    ) as ReadonlySet<ProvideType>;

    /**
     * Returns a set of all modules that have been imported to this module,
     * recursively following the imports.
     */
    public get deeplyImportedModules() {
        return this.moduleImportHelper.getImportedModules() as ReadonlySet<ModuleImport>;
    }

    /**
     * Because imported module exports can rely on providers internal
     * to those modules (not exported from) we have to store them here
     * for resolution too. This is a work-around, and does not properly
     * contain providers to a module scope. This means that non-exported
     * providers can be injected simply because they are a dependency of
     * an exported provider. Yucky, but, hey man, this is good enough for
     * now.
     *
     * TODO: Better module provider resolution! Properly hide un-exported
     * TODO: providers from being injected, but allow them to be used as
     * TODO: dependencies of exported providers!
     */
    private readonly importUnExportedProviders = new Map<
        ProvideType,
        LocalProviderState
    >();

    constructor(
        private readonly parentInjector: Injector,
        public readonly moduleDefinition: Klass<T> | ModuleWithProviders<T>,
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

        if (providerState) {
            return {
                providerState,
                foundIn: this,
            };
        }

        return this.parentInjector.resolveProviderLocation(providerType);
    }

    /**
     * Registers all local provider definitions from the module into this injector.
     */
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

    /**
     * Helper for adding a provider to this injector
     */
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

    /**
     * Adds a hidden provider to this injector. Functionally this
     * is no different than an un-hidden provider, but conceptually it's
     * different.
     */
    private _addHiddenProvider(provider: Provider) {
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
            if (!this.importUnExportedProviders.has(provideType)) {
                this.importUnExportedProviders.set(provideType, {
                    definition: provider,
                });
            }
        }
    }

    /**
     * Using a module helper, add all the computed providers to this
     * injector. Import module exports are added, and any satisfied
     * dependencies to those exports.
     */
    private _processModuleImports() {
        const exposeProviders = this.moduleImportHelper.getProvidersToExpose();
        exposeProviders.forEach((provider) => {
            this._addProvider(provider);
        });

        const moduleProviders = this.moduleImportHelper.getImportedModules();
        moduleProviders.forEach((moduleImport) => {
            const moduleType = coerceModuleFromImport(moduleImport);
            this._addProvider(moduleType);
        });

        const supplyProviders =
            this.moduleImportHelper.getProvidersToSupplyButHide();
        supplyProviders.forEach((provider) => {
            this._addHiddenProvider(provider);
        });
    }

    get<T>(providerType: ProvideType<T>): T {
        const providerState = this.providers.get(providerType);

        if (providerState) {
            return this.resolve(providerState as ProviderState<T>);
        }

        const hiddenUnExportedProviderState =
            this.importUnExportedProviders.get(providerType);
        if (hiddenUnExportedProviderState) {
            return this.resolve(
                hiddenUnExportedProviderState as ProviderState<T>,
            );
        }

        const providerLocation = this.resolveProviderLocation(providerType);
        const { providedIn } = providerLocation.providerState.definition;

        /**
         * If this provider was declared to be anywhere, load it here.
         */
        if (providedIn === ProvidedIn.ANYWHERE) {
            return this.resolve(providerLocation.providerState);
        }

        return this.parentInjector.get<T>(providerType);
    }
}

/**
 * @deprecated Currently unused
 */
export class ImportModuleInjector<T> extends ModuleInjector<T> {
    constructor(parentInjector: Injector, moduleType: Klass<T>) {
        super(parentInjector, moduleType);
    }

    // getAsImportModule<T>(provideType: ProvideType<T>): T | undefined {
    //     // As an import module, if we don't have this provider exported,
    //     // then we should not provide it.
    //     if (!this.moduleExportProviderTypes.has(provideType)) {
    //         return undefined;
    //     }

    //     const providerState = this.providers.get(provideType);

    //     if (providerState) {
    //         return this.resolve(providerState as ProviderState<T>);
    //     }

    //     return this._tryResolveProviderFromImports(provideType);
    // }
}
