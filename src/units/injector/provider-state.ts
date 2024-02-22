import { Provider } from "../../types/provider";

export interface ProviderState<T = unknown> {
    definition: Provider<T>;
    instance?: T;
}
