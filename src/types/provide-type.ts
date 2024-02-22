import { Abstract } from "./abstract";
import { Klass } from "./class";
import { InjectionToken } from "./token";

export type ProvideType<T = unknown> =
    | string
    | symbol
    | Klass<T>
    | Abstract<T>
    | InjectionToken<T>;

export function isProvideType<T = unknown>(
    providerType: unknown,
): providerType is ProvideType<T> {
    return (
        typeof providerType === "string" ||
        typeof providerType === "symbol" ||
        typeof providerType === "function" ||
        providerType instanceof InjectionToken
    );
}

export function providerTypeToString<T>(providerType: ProvideType<T>): string {
    if (typeof providerType === "string") {
        return providerType;
    } else if (typeof providerType === "symbol") {
        return providerType.toString();
    } else if (typeof providerType === "function") {
        return providerType.name;
    } else if (providerType instanceof InjectionToken) {
        return providerType.description;
    } else {
        return `[provider: ${JSON.stringify(providerType)}]`;
    }
}
