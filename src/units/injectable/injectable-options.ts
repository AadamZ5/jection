import { Klass } from "../..";

export enum ProvidedIn {
    /**
     * This unit is provided in the root scope, and it only
     * has access to root provisions. Behaves as a singleton.
     */
    ROOT,
    /**
     * Like `ROOT`, this unit is provided in the root scope,
     * but it will resolve differently depending on where it is
     * injected. Behaves as a singleton.
     */
    ANYWHERE,
}

export function isProvidedIn(num: number): num is ProvidedIn {
    return num === ProvidedIn.ANYWHERE || num === ProvidedIn.ROOT;
}

export interface InjectableOptions {
    providedIn?: ProvidedIn | Klass;
}
