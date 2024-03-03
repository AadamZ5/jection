import { MODULE_LOADER_INJECTOR } from "../../constants/module-loader-symbols";
import { DI_MODULE_LOADER } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { Injectable } from "../injectable/injectable";
import { ProvidedIn } from "../injectable/injectable-options";
import { Injector } from "../injector/injector";
import { ModuleImport } from "./module-meta";
import { ModuleRef } from "./module-ref";

export interface LoaderOptions {
    providedIn?: ProvidedIn;
}

/**
 * Marks a class as an injectable module loader.
 *
 * Classes marked as a loader should implement the `ModuleLoader` interface.
 */
export function Loader<T extends Klass>(options?: LoaderOptions) {
    const injectableDecorator = Injectable({ providedIn: options?.providedIn });

    return (target: T) => {
        injectableDecorator(target);
        // We will mark this as a module-loader. We may want to
        // automatically supply an injector to the loader.
        Reflect.defineMetadata(DI_MODULE_LOADER, true, target as object);
    };
}

/**
 * Module loader interface for things decorated to be a module loader.
 */
export interface ModuleLoader<T> {
    get(): ModuleImport<T> | Promise<ModuleImport<T>>;
}

/**
 * Prepared module loaders are those module loaders that have peen
 * through post-processing by an injector, meaning that symbols have been
 * placed on the object to facilitate in easier injection ergonomics.
 *
 * This should not be used normally.
 */
export interface PreparedModuleLoader<T> extends ModuleLoader<T> {
    [MODULE_LOADER_INJECTOR]: Injector;
}

export function isModuleLoader<T extends Klass>(
    obj: unknown,
): obj is ModuleLoader<T> {
    return !!obj && (obj as ModuleLoader<T>).get instanceof Function;
}

export function isPreparedModuleLoader<T extends Klass = Klass>(
    loader: ModuleLoader<T>,
): loader is PreparedModuleLoader<T> {
    return MODULE_LOADER_INJECTOR in loader;
}

/**
 * Given a module loader, will create a new module ref attached to the
 * injector that injected the module loader. The module is instantiated
 * and a reference is returned.
 *
 * @param loader The module loader to use to load the module
 * @returns A module reference
 */
export async function loadModuleWithLoader<T>(loader: ModuleLoader<T>) {
    if (!isModuleLoader(loader)) {
        throw new Error(
            "Loader does not correctly implement the ModuleLoader interface!",
        );
    }

    if (!isPreparedModuleLoader(loader)) {
        throw new Error("Loader is not prepared! Did you decorate it?");
    }

    const moduleType = await loader.get();
    const moduleRef = new ModuleRef<T>(
        loader[MODULE_LOADER_INJECTOR],
        moduleType,
    );

    return moduleRef;
}
