import { Klass } from "../../types/class";
import { Provider } from "../../types/provider";

export interface ModuleWithProviders<T> {
    module: Klass<T>;
    providers: Provider[];
}

export function isModuleWithProviders<T = unknown>(
    obj: unknown,
): obj is ModuleWithProviders<T> {
    return (
        !!obj &&
        (obj as ModuleWithProviders<T>).module instanceof Function &&
        (obj as ModuleWithProviders<T>).providers instanceof Array
    );
}
