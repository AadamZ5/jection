import { Klass } from "../../types/class";
import { ProvideType, isProvideType } from "../../types/provide-type";
import { coerceProvideType } from "../../types/provider";
import { ConstructorInjectHelper } from "./inject-decorator";
import { ProviderLocation } from "./provider-resolution";

export function resolveCtorParamProvideType<T>(
    ctorHelpers: ConstructorInjectHelper[],
    parameter: string | symbol | Klass,
    paramIndex: number,
): ProvideType<T> {
    const ctorHelper = ctorHelpers[paramIndex];
    if (ctorHelper) {
        return ctorHelper.providerType;
    }

    if (!isProvideType(parameter)) {
        throw new TypeError(
            `Unknown class dependency type ${JSON.stringify(parameter)}`,
        );
    }

    return parameter;
}

export function deduplicateCtorAndPropDependencies(
    ctorDeps: Iterable<ProviderLocation>,
    propDeps: Iterable<ProviderLocation>,
): ProviderLocation[] {
    const provideTypes = new Set<ProvideType>();

    const deduped: ProviderLocation[] = [];

    for (const dep of ctorDeps) {
        const coercedProvideType = coerceProvideType(
            dep.providerState.definition,
        );
        if (!provideTypes.has(coercedProvideType)) {
            provideTypes.add(coercedProvideType);
            deduped.push(dep);
        }
    }

    for (const dep of propDeps) {
        const coercedProvideType = coerceProvideType(
            dep.providerState.definition,
        );
        if (!provideTypes.has(coercedProvideType)) {
            provideTypes.add(coercedProvideType);
            deduped.push(dep);
        }
    }

    return deduped;
}
