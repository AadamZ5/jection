import { Injector } from "..";
import { DI_MODULE } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { ProvideType, providerTypeToString } from "../../types/provide-type";
import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    Provider,
    coerceProvideType,
    coerceProvidedIn,
    isClassProvider,
    isExistingProvider,
    isFactoryProvider,
    isKlassProvider,
    isValueProvider,
} from "../../types/provider";
import { ProvidedIn } from "../injectable/injectable-options";
import {
    getConstructorInjectHelpers,
    getPropertyInjectHelpers,
} from "../injector/inject-decorator";
import {
    deduplicateCtorAndPropDependencies,
    resolveCtorParamProvideType,
} from "../injector/injector-util";
import { ProviderDependencies } from "../injector/provider-resolution";
import {
    ModuleWithProviders,
    isModuleWithProviders,
} from "./module-with-providers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleImport<T = any> = Klass<T> | ModuleWithProviders<T>;

export function coerceModuleFromImport<T>(
    moduleImport: ModuleImport<T>,
): Klass<T> {
    if (isModuleWithProviders(moduleImport)) {
        return moduleImport.module;
    }
    return moduleImport;
}

export interface ModuleMeta {
    readonly providers: Provider[];
    /** Modules to import */
    readonly imports?: ModuleImport[];
    /** Classes or tokens or provide-types to export */
    readonly exports?: ProvideType[];
}

export interface ModuleDependencies<T = unknown> {
    module: Klass<T>;
    providers: Provider[];
    exportProvideTypes: ProvideType[];
    imports: ModuleDependencies;
}

export function isModuleMeta(obj: unknown): obj is ModuleMeta {
    return (obj as ModuleMeta).providers !== undefined;
}

export function isModule(maybeModule: Klass) {
    return !!Reflect.getMetadata(DI_MODULE, maybeModule);
}

export function moduleMetaFromImport(moduleImport: ModuleImport) {
    if (isModuleWithProviders(moduleImport)) {
        const moduleMeta = getModuleMeta(moduleImport.module);

        const coercedModuleMeta: ModuleMeta = {
            ...moduleMeta,
            providers: [...moduleImport.providers, ...moduleMeta.providers],
        };
        return coercedModuleMeta;
    } else {
        return { ...getModuleMeta(moduleImport as Klass) };
    }
}

export function getModuleMeta(moduleType: Klass) {
    const moduleMeta = Reflect.getMetadata(DI_MODULE, moduleType) as
        | ModuleMeta
        | undefined;
    if (!moduleMeta) {
        // TODO: Better error type
        throw new Error(`Module ${moduleType.name} has no metadata`);
    }
    return moduleMeta;
}

/**
 * A helper class that builds a tree of dependencies, and can
 * flatten them.
 *
 * Given a module that is being "used", this class will
 * scan all of it's imports and attempt to resolve all
 * necessary dependencies.
 */
export class ModuleImportHelper {
    private readonly moduleMeta = getModuleMeta(this.forModule);
    private readonly importedProvidersCtx = resolveAllImportedProviders(
        this.moduleMeta,
    );

    constructor(
        private readonly forModule: Klass,
        private readonly forInjector: Injector,
    ) {}

    public getImportedModules() {
        return this.importedProvidersCtx.importedModules;
    }

    public getProvidersToExpose() {
        return this.importedProvidersCtx.importedExportedProviders;
    }

    public getProvidersToSupplyButHide() {
        // Get all exported providers from modules that we've imported
        const exportProviders =
            this.importedProvidersCtx.importedExportedProviders;

        const dependencyMap = new Map<ProvideType, ProviderDependencies>();

        // For each exported provider we've imported, find out it's dependencies from
        // a flattened list of all imported dependencies.
        exportProviders.forEach((provider, provideType) => {
            const deps: ProviderDependencies = {
                provider,
                dependencies: this.getProviderDependencies(provider),
            };
            dependencyMap.set(provideType, deps);
        });

        const flattenedDependencies = new Map<ProvideType, Provider>();

        const flattenDeps = (providerDeps: ProviderDependencies) => {
            const depsOfDeps: ProviderDependencies[] = [];

            providerDeps.dependencies.forEach((dep) => {
                const provideType = coerceProvideType(dep.provider);
                if (!flattenedDependencies.has(provideType)) {
                    flattenedDependencies.set(provideType, dep.provider);
                }
                depsOfDeps.push(...dep.dependencies);
            });

            depsOfDeps.forEach((depOfDep) => {
                flattenDeps(depOfDep);
            });
        };

        dependencyMap.forEach((exportedProviderAndDeps) => {
            flattenDeps(exportedProviderAndDeps);
        });

        return flattenedDependencies;
    }

    private getProvider<T>(provideType: ProvideType<T>) {
        let existingProvider =
            this.importedProvidersCtx.importedProviders.get(provideType);

        if (!existingProvider) {
            existingProvider =
                this.forInjector.resolveProviderLocation(provideType)
                    .providerState.definition;
        }

        if (!existingProvider) {
            throw new Error(
                `Provider not found while resolving imports: ${providerTypeToString(provideType)}`,
            );
        }
        return existingProvider;
    }

    private getProviderDependencies<T>(
        provider: Provider<T>,
    ): ProviderDependencies<unknown>[] {
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

    private _resolveClassDependenciesShallow<T>(provider: ClassProvider<T>): {
        ctorDeps: Provider[];
        propDeps: Map<string | symbol, Provider>;
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
                    const provider = this.getProvider(provideType);
                    return [propKey as string | symbol, provider] as const;
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
            return this.getProvider(provideType);
        });

        // Return the resolved provider locations
        return {
            ctorDeps: constructorDeps,
            propDeps: propertyDeps,
        };
    }

    private _resolveClassDependencies<T>(
        provider: ClassProvider<T>,
    ): ProviderDependencies<unknown>[] {
        const { ctorDeps, propDeps } =
            this._resolveClassDependenciesShallow(provider);

        return deduplicateCtorAndPropDependencies(
            ctorDeps,
            propDeps.values(),
        ).map((resolvedProvider) => {
            return {
                provider: resolvedProvider,
                dependencies: this.getProviderDependencies(resolvedProvider),
            };
        });
    }

    private _resolveExistingDependencies<T>(
        provider: ExistingProvider<T>,
    ): ProviderDependencies<unknown> {
        const thisProviderResolved = this.getProvider(provider.useExisting);

        return {
            dependencies: this.getProviderDependencies(thisProviderResolved),
            provider: thisProviderResolved,
        };
    }

    private _resolveFactoryDependencies<T>(
        provider: FactoryProvider<T>,
    ): ProviderDependencies<unknown>[] {
        return (
            provider.factoryDeps?.map((provideType) => {
                const thisProviderResolved = this.getProvider(provideType);
                return {
                    dependencies:
                        this.getProviderDependencies(thisProviderResolved),
                    provider: thisProviderResolved,
                } satisfies ProviderDependencies<unknown>;
            }) ?? []
        );
    }
}

/**
 * Deeply gets all imported module providers.
 *
 * @param moduleMeta
 * @returns
 */
export function resolveAllImportedProviders(moduleMeta: ModuleMeta) {
    const importedExportedProviders = new Map<ProvideType, Provider>();
    const importedProviders = new Map<ProvideType, Provider>();
    const importedModules = new Set<ModuleImport>(moduleMeta.imports);
    const childImportedModules = new Set<Klass>();

    importedModules.forEach((importedModule) => {
        const importedModuleMeta = moduleMetaFromImport(importedModule);
        const {
            exports: childExports,
            providers: childProviders,
            importedModules: importsImportedModules,
        } = deeplyGetAllExportsAndGlobalProviders(importedModuleMeta);

        childExports.forEach((provider, provideType) => {
            if (!importedExportedProviders.has(provideType)) {
                importedExportedProviders.set(provideType, provider);
                importedProviders.set(provideType, provider);
            }
        });

        childProviders.forEach((provider, provideType) => {
            if (!importedProviders.has(provideType)) {
                importedProviders.set(provideType, provider);
            }
        });

        importsImportedModules.forEach((module) => {
            const moduleType = coerceModuleFromImport(module);
            if (!childImportedModules.has(moduleType)) {
                childImportedModules.add(moduleType);
            }
        });
    });

    childImportedModules.forEach((module) => {
        importedModules.add(module);
    });

    return { importedExportedProviders, importedProviders, importedModules };
}

export function deeplyGetAllExportsAndGlobalProviders(moduleMeta: ModuleMeta) {
    // Exports are gated at each module. If module A exports 5 providers, and module B imports A,
    // module B will have access to those 5 providers. If module B exports 3 of the 5 providers,
    // and module C imports B, module C will have access to those 3 providers, but not the 2 omitted
    // from A.

    // Also, if a module has providers that are provided in root or anywhere, those providers are
    // exported.
    // TODO: Is that good or bad?

    // HOWEVER, if an imported provider depends on a non-exported module-local provider, then
    // we need to satisfy that too. So we keep track of all the imported module providers
    // here as well, so that the consuming logic can figure out what it wants to do with
    // that info.

    const thisModuleProviders = new Map<ProvideType, Provider>();
    const thisModuleExports = new Map<ProvideType, Provider>();
    const thisModuleImports = new Set<ModuleImport>(moduleMeta.imports);
    const thisModuleExportTypes = new Set<ProvideType>(moduleMeta.exports);

    // First go over this module's providers and determine if
    // they are exported or not.
    moduleMeta.providers.forEach((provider) => {
        const provideType = coerceProvideType(provider);

        thisModuleProviders.set(provideType, provider);

        const providedIn = coerceProvidedIn(provider);

        const isProvidedGlobal =
            providedIn === ProvidedIn.ROOT ||
            providedIn === ProvidedIn.ANYWHERE;

        const shouldExport =
            thisModuleExportTypes.has(provideType) || isProvidedGlobal;

        if (shouldExport) {
            thisModuleExports.set(provideType, provider);
        }
    });

    // Flat maps of all this module's import provider + export data.
    const childModuleProviders = new Map<ProvideType, Provider>();
    const childModuleExports = new Map<ProvideType, Provider>();
    const childModuleImports = new Set<ModuleImport>();

    moduleMeta.imports?.forEach((importedModule) => {
        const importedModuleMeta = moduleMetaFromImport(importedModule);
        const {
            exports: childExports,
            providers: childProviders,
            importedModules: childImports,
        } = deeplyGetAllExportsAndGlobalProviders(importedModuleMeta);

        childImports.forEach((importedModule) => {
            childModuleImports.add(importedModule);
        });

        childProviders.forEach((provider, provideType) => {
            if (!childModuleProviders.has(provideType)) {
                childModuleProviders.set(provideType, provider);
            }
        });

        childExports.forEach((provider, provideType) => {
            if (!childModuleExports.has(provideType)) {
                childModuleExports.set(provideType, provider);
            }
        });
    });

    // Flatten the import provider + export data
    childModuleExports.forEach((provider, provideType) => {
        const providedIn = coerceProvidedIn(provider);

        const isProvidedGlobal =
            providedIn === ProvidedIn.ROOT ||
            providedIn === ProvidedIn.ANYWHERE;

        const shouldExport =
            thisModuleExportTypes.has(provideType) || isProvidedGlobal;

        if (!thisModuleExports.has(provideType) && shouldExport) {
            thisModuleExports.set(provideType, provider);
        }
    });

    childModuleImports.forEach((moduleType) => {
        thisModuleImports.add(moduleType);
    });

    return {
        exports: thisModuleExports,
        providers: thisModuleProviders,
        importedModules: thisModuleImports,
    };
}
