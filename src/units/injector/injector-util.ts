import { Klass } from "../../types/class";
import { ProvideType, isProvideType } from "../../types/provide-type";
import { Provider, coerceProvideType } from "../../types/provider";
import { ConstructorInjectHelper } from "./inject-decorator";

export function resolveCtorParamProvideType<T>(
    ctorHelpers: ConstructorInjectHelper[],
    parameter: string | symbol | Klass,
    paramIndex: number,
): ProvideType<T> {
    const ctorHelper = ctorHelpers[paramIndex];
    if (ctorHelper) {
        return ctorHelper.providerType as ProvideType<T>;
    }

    if (!isProvideType<T>(parameter)) {
        throw new TypeError(
            `Unknown class dependency type ${JSON.stringify(parameter)}`,
        );
    }

    return parameter;
}

export function deduplicateCtorAndPropDependencies(
    ctorDeps: Iterable<Provider>,
    propDeps: Iterable<Provider>,
): Provider[] {
    const provideTypes = new Set<ProvideType>();

    const deduped: Provider[] = [];

    for (const dep of ctorDeps) {
        const coercedProvideType = coerceProvideType(dep);
        if (!provideTypes.has(coercedProvideType)) {
            provideTypes.add(coercedProvideType);
            deduped.push(dep);
        }
    }

    for (const dep of propDeps) {
        const coercedProvideType = coerceProvideType(dep);
        if (!provideTypes.has(coercedProvideType)) {
            provideTypes.add(coercedProvideType);
            deduped.push(dep);
        }
    }

    return deduped;
}
