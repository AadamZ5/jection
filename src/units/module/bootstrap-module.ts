import { ProvidedIn } from "..";
import { Klass } from "../../types/class";
import { Provider } from "../../types/provider";
import { RootInjector } from "../injector/root-injector";
import { ProviderContext, RootProviders } from "../injector/root-providers";
import { ModuleRef } from "./module-ref";

export function bootstrapModule<T>(
    module: Klass<T>,
    additionalProviders: Provider[] = [],
) {
    RootProviders.addProvider(
        ...additionalProviders.map((provider) => {
            return {
                provider,
                type: ProvidedIn.ROOT,
            } satisfies ProviderContext;
        }),
    );

    const rootInjector = RootInjector.getRootInjector();
    const moduleRef = new ModuleRef(rootInjector, module);
    return moduleRef;
}
