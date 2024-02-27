import { Klass } from "../../types/class";
import { Provider } from "../../types/provider";
import { RootInjector } from "../injector/root-injector";
import { RootProviders } from "../injector/root-providers";
import { ModuleRef } from "./module-ref";

export function bootstrapModule<T>(
    module: Klass<T>,
    additionalProviders: Provider[] = [],
) {
    RootProviders.addProvider(...additionalProviders);

    const rootInjector = RootInjector.getRootInjector();
    const moduleRef = new ModuleRef(rootInjector, module);
    return moduleRef;
}
