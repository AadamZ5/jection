import { ProvideType } from "../..";
import { Klass } from "../../types/class";
import { Provider } from "../../types/provider";

export interface ModuleOptions {
    providers?: Provider[];
    imports?: Klass[];
    exports?: ProvideType[];
}
