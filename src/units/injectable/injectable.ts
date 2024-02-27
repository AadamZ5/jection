import { TargetNotObject } from "../../errors/target-not-object";
import { ClassProvider, isKlassProvider } from "../../types/provider";
import { RootProviders } from "../injector/root-providers";
import { InjectableOptions, ProvidedIn } from "./injectable-options";

export function Injectable(options?: InjectableOptions) {
    return (target: unknown) => {
        if (!(target instanceof Object)) {
            throw new TargetNotObject(target);
        }

        if (!isKlassProvider(target)) {
            // TODO: Better error! Combine this with previous object check!
            throw new Error("Injectable must be a class");
        }

        if (
            options?.providedIn === ProvidedIn.ROOT ||
            options?.providedIn === ProvidedIn.ANYWHERE
        ) {
            const rootProvider: ClassProvider = {
                provide: target,
                useClass: target,
                providedIn: options.providedIn,
            };

            RootProviders.addProvider(rootProvider);
        }
    };
}
