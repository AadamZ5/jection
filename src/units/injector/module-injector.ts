import { DI_MODULE } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import { ClassProvider, coerceProvideType } from "../../types/provider";
import { ModuleMeta } from "../module/module-meta";
import { Injector } from "./injector";
import { ProviderState } from "./provider-state";

export class ModuleInjector<T> extends Injector {
    private readonly moduleMeta = this._getModuleMeta();

    constructor(
        private readonly parentInjector: Injector,
        private readonly moduleType: Klass<T>,
    ) {
        super();
        this._populateModuleProviders();
    }

    private _populateModuleProviders() {
        this.moduleMeta.providers.forEach((provider) => {
            const provideType = coerceProvideType(provider);

            this.providers.set(provideType, {
                definition: provider,
            });
        });

        const moduleClassProvider: ClassProvider<T, T> = {
            provide: this.moduleType,
            useClass: this.moduleType,
        };

        this.providers.set(this.moduleType, {
            definition: moduleClassProvider,
        });
    }

    private _getModuleMeta() {
        const moduleMeta = Reflect.getMetadata(DI_MODULE, this.moduleType) as
            | ModuleMeta
            | undefined;
        if (!moduleMeta) {
            // TODO: Better error type
            throw new Error(`Module ${this.moduleType.name} has no metadata`);
        }
        return moduleMeta;
    }

    get<T>(providerType: ProvideType<T>): T {
        const providerState = this.providers.get(providerType);

        if (providerState) {
            return this.resolve(providerState as ProviderState<T>);
        }

        return this.parentInjector.get(providerType);
    }
}
