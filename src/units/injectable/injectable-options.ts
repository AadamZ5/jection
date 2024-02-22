export enum ProvidedIn {
    ROOT,
    MODULE,
}

export interface InjectableOptions {
    providedIn?: ProvidedIn;
}
