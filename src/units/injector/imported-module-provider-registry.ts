import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import {
    ClassProvider,
    coerceProvideType,
    coerceProvidedIn,
    coerceProviderToProviderDefinition,
} from "../../types/provider";
import { LocalProviderState } from "../../types/provider-state";
import { ProvidedIn } from "../injectable/injectable-options";
import { coerceModuleFromImport, getModuleMeta } from "../module/module-meta";
import { Injector } from "./injector";
import { RootProviders } from "./root-providers";

/**
 * @deprecated Not currently used
 */
export class ImportModuleProviderRegistry {
    private readonly moduleMeta = getModuleMeta(this.importModuleType);
    private readonly importRegistries = this._getImportRegistries();
    private readonly exportTypes = new Set(this.moduleMeta.exports);

    public readonly moduleInstance = this.fromInjector.get(
        this.importModuleType,
    );

    private readonly providers = new Map<ProvideType, LocalProviderState>();

    constructor(
        private readonly importModuleType: Klass,
        private readonly fromInjector: Injector,
    ) {
        this._setupLocalProviders();
    }

    public getProviderState(
        provideType: ProvideType,
    ): LocalProviderState | undefined {
        const providerStateHere = this.providers.get(provideType);
        if (providerStateHere) {
            return providerStateHere;
        }

        for (const [, registry] of this.importRegistries) {
            const importedProviderState =
                registry.getProviderState(provideType);
            if (importedProviderState) {
                return importedProviderState;
            }
        }

        return undefined;
    }

    private _getImportRegistries() {
        const importRegistries = new Map<Klass, ImportModuleProviderRegistry>();
        this.moduleMeta.imports?.forEach((importModule) => {
            const importModuleType = coerceModuleFromImport(importModule);
            importRegistries.set(
                importModuleType,
                new ImportModuleProviderRegistry(
                    importModuleType,
                    this.fromInjector,
                ),
            );
        });
        return importRegistries;
    }

    private _setupLocalProviders() {
        this.moduleMeta.providers.forEach((provider) => {
            const provideType = coerceProvideType(provider);
            const providedIn = coerceProvidedIn(provider);
            if (
                providedIn === ProvidedIn.ANYWHERE ||
                providedIn === ProvidedIn.ROOT
            ) {
                RootProviders.addProvider(provider);
            } else {
                const definition = coerceProviderToProviderDefinition(provider);
                this.providers.set(provideType, { definition });
            }
        });

        const thisModuleProvider: ClassProvider = {
            provide: this.importModuleType,
            useClass: this.importModuleType,
        };

        this.providers.set(thisModuleProvider.provide, {
            definition: thisModuleProvider,
        });
    }
}
