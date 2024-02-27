import { MODULE_LOADER_INJECTOR } from "../../constants/module-loader-symbols";
import { DI_MODULE_LOADER } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { Injectable } from "../injectable/injectable";
import { ProvidedIn } from "../injectable/injectable-options";
import { Injector } from "../injector/injector";
import { ModuleRef } from "./module-ref";

export interface LoaderOptions {
    providedIn?: ProvidedIn;
}

export function Loader<T extends Klass>(options?: LoaderOptions) {
    const injectableDecorator = Injectable({ providedIn: options?.providedIn });

    return (target: T) => {
        injectableDecorator(target);
        // We will mark this as a module-loader. We may want to
        // automatically supply an injector to the loader.
        Reflect.defineMetadata(DI_MODULE_LOADER, true, target);
    };
}

export abstract class ModuleLoaderBase<T> {
    private [MODULE_LOADER_INJECTOR]!: Injector;

    // TODO: Allow passing providers for the loaded module?? How
    // TODO: will configuration take place??
    protected abstract load(): Promise<Klass<T>> | Klass<T>;

    public async get(): Promise<ModuleRef<T>> {
        const module = await this.load();
        const injector = this[MODULE_LOADER_INJECTOR];
        return new ModuleRef(injector, module);
    }
}
