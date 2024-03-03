import {
    Inject,
    Loader,
    Module,
    ModuleLoader,
    ValueProvider,
    bootstrapModule,
    loadModuleWithLoader,
} from "../src";

export function awaitableCallback<T = void>() {
    let callback: (value: T) => void;
    const promise = new Promise<T>((res) => {
        callback = res;
    });
    return { callback: callback!, promise };
}

describe("Multi stage lazy import", () => {
    it("should handle 2 levels of lazy loading", async () => {
        const topLevelProvider: ValueProvider = {
            provide: "TOP_LEVEL",
            useValue: "Value from italy",
        };

        const lazyLevelProvider: ValueProvider = {
            provide: "LAZY_LEVEL",
            useValue: "Value from france",
        };

        const veryLazyModuleConstructed = awaitableCallback();
        const veryLazyModuleCtorSpy = jest.spyOn(
            veryLazyModuleConstructed,
            "callback",
        );
        @Module()
        class VeryLazyModule {
            constructor(
                // Assure we have access to parent injectors with provider from parent
                @Inject(topLevelProvider.provide)
                private readonly topLevelValue: string,
                @Inject(lazyLevelProvider.provide)
                private readonly lazyLevelValue: string,
            ) {
                veryLazyModuleConstructed.callback();
                expect(this.topLevelValue).toBe(topLevelProvider.useValue);
                expect(this.lazyLevelValue).toBe(lazyLevelProvider.useValue);
            }
        }

        @Loader()
        class VeryLazyModuleLoader implements ModuleLoader<VeryLazyModule> {
            get() {
                return VeryLazyModule;
            }
        }

        const lazyModuleConstructed = awaitableCallback();
        const lazyModuleCtorSpy = jest.spyOn(lazyModuleConstructed, "callback");
        @Module({ providers: [VeryLazyModuleLoader, lazyLevelProvider] })
        class LazyModule {
            constructor(
                @Inject(topLevelProvider.provide)
                private readonly topLevelValue: string,
                private readonly veryLazyModuleLoader: VeryLazyModuleLoader,
            ) {
                lazyModuleConstructed.callback();
                expect(this.topLevelValue).toBe(topLevelProvider.useValue);
                loadModuleWithLoader(this.veryLazyModuleLoader);
            }
        }

        @Loader()
        class LazyModuleLoader implements ModuleLoader<LazyModule> {
            get() {
                return LazyModule;
            }
        }

        const myModuleConstructed = awaitableCallback();
        const myModuleCtorSpy = jest.spyOn(myModuleConstructed, "callback");
        @Module({
            providers: [LazyModuleLoader, topLevelProvider],
        })
        class MyModule {
            constructor(private readonly lazyModuleLoader: LazyModuleLoader) {
                myModuleConstructed.callback();
                loadModuleWithLoader(this.lazyModuleLoader);
            }
        }

        const moduleRef = bootstrapModule(MyModule);

        expect(moduleRef).toBeDefined();

        await Promise.all([
            myModuleConstructed.promise,
            lazyModuleConstructed.promise,
            veryLazyModuleConstructed.promise,
        ]);

        expect(myModuleCtorSpy).toHaveBeenCalledTimes(1);
        expect(lazyModuleCtorSpy).toHaveBeenCalledTimes(1);
        expect(veryLazyModuleCtorSpy).toHaveBeenCalledTimes(1);
    });
});
