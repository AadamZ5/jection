import { Provider } from "../../types/provider";

export interface ModuleMeta {
    providers: Provider[];
}

export function isModuleMeta(obj: unknown): obj is ModuleMeta {
    return (obj as ModuleMeta).providers !== undefined;
}
