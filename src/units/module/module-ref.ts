import { Klass } from "../../types/class";
import { Injector } from "../injector/injector";
import {
    ImportModuleInjector,
    ModuleInjector,
} from "../injector/module-injector";
import { coerceModuleFromImport } from "./module-meta";
import { ModuleWithProviders } from "./module-with-providers";

export class ModuleRef<T> {
    private readonly moduleType = coerceModuleFromImport(this.moduleDefinition);
    private readonly moduleInjector = new ModuleInjector<T>(
        this.parentInjector,
        this.moduleDefinition,
    );

    public get injector() {
        return this.moduleInjector;
    }

    public readonly instance: T = this.moduleInjector.get(this.moduleType);

    public readonly importedModuleInstances = this._setupImportInstances();

    constructor(
        private readonly parentInjector: Injector,
        private moduleDefinition: Klass<T> | ModuleWithProviders<T>,
    ) {}

    // TODO: Implement destroyable things! Use an interface.

    private _setupImportInstances() {
        const importModuleRefs = new Map<Klass, unknown>();
        this.moduleInjector.deeplyImportedModules.forEach((importModule) => {
            const moduleType = coerceModuleFromImport(importModule);
            importModuleRefs.set(moduleType, this.injector.get(moduleType));
        });
        return importModuleRefs;
    }
}

/**
 * @deprecated Currently unused
 */
export class ImportModuleRefResolutionContext {
    private readonly visitedModuleRefs = new Map<
        Klass,
        ImportModuleRef<unknown>
    >();
    private readonly visitingModules = new Set<Klass>();

    constructor(private readonly forRootModuleRef: ModuleRef<unknown>) {}

    public getImportModuleRef<T>(
        moduleType: Klass<T>,
        parentInjector: Injector,
    ) {
        if (this.visitingModules.has(moduleType)) {
            throw new Error(
                `Circular dependency detected on module ${String(moduleType)}.`,
            );
        }

        let moduleRef = this.visitedModuleRefs.get(moduleType);
        if (!moduleRef) {
            this.visitingModules.add(moduleType);
            moduleRef = new ImportModuleRef(this, parentInjector, moduleType);
            this.visitedModuleRefs.set(moduleType, moduleRef);
            this.visitingModules.delete(moduleType);
        }

        return moduleRef;
    }
}

/**
 * @deprecated Currently unused
 */
export class ImportModuleRef<T> {
    private readonly moduleInjector = new ImportModuleInjector<T>(
        this.parentInjector,
        this.moduleType,
    );

    public get injector() {
        return this.moduleInjector;
    }

    public readonly instance: T = this.moduleInjector.get(this.moduleType);

    constructor(
        private readonly resolutionContext: ImportModuleRefResolutionContext,
        private readonly parentInjector: Injector,
        private moduleType: Klass<T>,
    ) {}
}
