import { DI_MODULE } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import { Provider, coerceProvideType } from "../../types/provider";

export interface ModuleMeta {
    providers: Provider[];
    /** Modules to import */
    imports?: Klass[];
    /** Classes or tokens or provide-types to export */
    exports?: ProvideType[];
}

export function isModuleMeta(obj: unknown): obj is ModuleMeta {
    return (obj as ModuleMeta).providers !== undefined;
}

export function isModule(maybeModule: Klass) {
    return !!Reflect.getMetadata(DI_MODULE, maybeModule);
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
 * Deeply gets all imported module providers.
 *
 * @param moduleMeta
 * @returns
 */
export function resolveAllImportedProviders(moduleMeta: ModuleMeta) {
    // TODO: Check for circular imports!

    //const resolvingTypes = new Set<Klass>();

    const resolvedProviders = new Map<ProvideType, Provider>();

    const addProviders = (providers: Provider[]) => {
        providers.forEach((provider) => {
            const provideType = coerceProvideType(provider);
            if (!resolvedProviders.has(provideType)) {
                resolvedProviders.set(provideType, provider);
            }
        });
    };

    const checkImports = (moduleMeta: ModuleMeta) => {
        const importsToCheck: Klass[] = [];

        moduleMeta.imports?.forEach((importModule) => {
            // if (resolvingTypes.has(importModule)) {
            //     throw new Error(
            //         `Circular import while resolving module ${importModule.name}`,
            //     );
            // }

            // resolvingTypes.add(importModule);
            const importModuleMeta = getModuleMeta(importModule);
            addProviders(importModuleMeta.providers);
            if (importModuleMeta.imports) {
                importsToCheck.push(...importModuleMeta.imports);
            }
        });

        importsToCheck.forEach((childImportModule) => {
            const childImportModuleMeta = getModuleMeta(childImportModule);
            checkImports(childImportModuleMeta);
        });
    };

    addProviders(moduleMeta.providers);
    checkImports(moduleMeta);

    return resolvedProviders;
}
