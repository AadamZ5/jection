import { Provider } from "../../types/provider";
import { Injectable } from "../injectable/injectable";
import { bootstrapModule } from "./bootstrap-module";
import { Module } from "./module-decorator";
import { Loader, ModuleLoader, loadModuleWithLoader } from "./module-loader";

describe("Module loader", () => {
    const TEST_PROVIDER = {
        provide: "TEST_VALUE",
        useValue: "test value",
    } satisfies Provider;

    @Module()
    class LazyModuleDependencyModule {
        constructor() {}
    }

    @Module({
        imports: [LazyModuleDependencyModule],
    })
    class LazyModule {}

    @Loader()
    class MyLoader implements ModuleLoader<LazyModule> {
        get() {
            return LazyModule;
        }
    }

    @Injectable()
    class TestService {
        constructor(public readonly loader: MyLoader) {}
    }

    @Module({
        providers: [TestService, MyLoader, TEST_PROVIDER],
    })
    class TestModule {}

    it("Should be able to be injected", () => {
        const testModuleRef = bootstrapModule(TestModule);

        const testService = testModuleRef.injector.get(TestService);
        expect(testService).toBeInstanceOf(TestService);
        expect(testService.loader).toBeInstanceOf(MyLoader);
    });

    it("Should be able to load a module", async () => {
        const testModuleRef = bootstrapModule(TestModule);

        const loader = testModuleRef.injector.get(MyLoader);
        const lazyModuleRef = await loadModuleWithLoader(loader);

        expect(lazyModuleRef.instance).toBeInstanceOf(LazyModule);

        // Test that the lazily loaded module can access the providers
        // from the module that loaded it.
        expect(lazyModuleRef.injector.get(TEST_PROVIDER.provide)).toBe(
            TEST_PROVIDER.useValue,
        );
    });
});
