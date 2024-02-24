import { ProvideType } from "../../types/provide-type";
import { RootProviders } from "./root-providers";

export interface InjectHelper<T = unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any;
    propertyKey: string | symbol | undefined;
    index?: number;
    providerType: ProvideType<T>;
    _injectHelper: true;
}

export function Inject<T>(
    providerType: ProvideType<T>,
    // eslint-disable-next-line @typescript-eslint/ban-types
): Function {
    return function (
        target: unknown,
        propertyKey: string | symbol | undefined,
        index?: number,
    ) {
        RootProviders.addInjectionHelper({
            _injectHelper: true,
            propertyKey,
            target,
            index,
            providerType,
        });
    };
}
