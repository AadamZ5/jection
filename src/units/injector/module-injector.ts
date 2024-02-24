import { ProvidedIn } from "..";
import { DI_MODULE } from "../../constants/reflect-keys";
import { Klass } from "../../types/class";
import { ProvideType } from "../../types/provide-type";
import {
    ClassProvider,
    ExistingProvider,
    ValueProvider,
    coerceProvideType,
} from "../../types/provider";
import { ModuleMeta } from "../module/module-meta";
import { Injector } from "./injector";
import { ProviderLocation } from "./provider-resolution";
import { ProviderState } from "./provider-state";

export class ModuleInjector<T> extends Injector {
    private readonly moduleMeta = this._getModuleMeta();

    constructor(
        private readonly parentInjector: Injector,
        private readonly moduleType: Klass<T>,
    ) {
        super(parentInjector);
        this._populateModuleProviders();
    }

    resolveProviderLocation<T>(
        providerType: ProvideType<T>,
    ): ProviderLocation<T> {
        const providerState = this.providers.get(
            providerType,
        ) as ProviderState<T>;

        if (!providerState) {
            return this.parentInjector.resolveProviderLocation(providerType);
        } else {
            return {
                providerState,
                foundIn: this,
            };
        }
    }

    private _populateModuleProviders() {
        this.moduleMeta.providers.forEach((provider) => {
            const provideType = coerceProvideType(provider);

            this.providers.set(provideType, {
                definition: provider,
            });
        });

        const thisInjectorProvider: ValueProvider<ModuleInjector<T>> = {
            provide: ModuleInjector,
            useValue: this,
        };

        const abstractInjectorProvider: ExistingProvider<Injector> = {
            provide: Injector,
            useExisting: ModuleInjector,
        };

        const moduleClassProvider: ClassProvider<T, T> = {
            provide: this.moduleType,
            useClass: this.moduleType,
        };

        this.providers.set(abstractInjectorProvider.provide, {
            definition: abstractInjectorProvider,
        });

        this.providers.set(thisInjectorProvider.provide, {
            definition: thisInjectorProvider,
        });

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

        const providerLocation = this.resolveProviderLocation(providerType);

        /**
         * If this provider was declared to be anywhere, load it here.
         */
        if (providerLocation.provideType === ProvidedIn.ANYWHERE) {
            return this.resolve(providerLocation.providerState);
        }

        return this.parentInjector.get(providerType);
    }
}
