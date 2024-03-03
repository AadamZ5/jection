import { ModuleImport, ProvideType } from "../..";
import { Provider } from "../../types/provider";

export interface ModuleOptions {
    providers?: Provider[];
    imports?: ModuleImport[];
    exports?: ProvideType[];
}
