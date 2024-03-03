import { ProvidedIn, bootstrapModule } from "..";
import { FactoryProvider, ValueProvider } from "../../types";
import {
    DecoratedService,
    TEST_CLASS_PROVIDER,
    TEST_FACTORY_PROVIDER,
    TEST_VALUE_PROVIDER,
} from "../injector/injection-boilerplate.test";
import { Module } from "./module-decorator";
import {
    deeplyGetAllExportsAndGlobalProviders,
    getModuleMeta,
} from "./module-meta";

describe("Module meta", () => {
    it("should throw error when no metadata found", () => {
        expect(() => {
            class TestModule {}

            getModuleMeta(TestModule);
        }).toThrow();
    });

    it("should correctly resolve exported providers", () => {
        const globalProvider: ValueProvider = {
            provide: "global_banana",
            useValue: "global banana",
            providedIn: ProvidedIn.ROOT,
        };

        const localProvider: ValueProvider = {
            provide: "banana",
            useValue: "local banana",
        };

        const factoryWithDepOnLocal: FactoryProvider = {
            provide: "factory_with_dep_on_local",
            useFactory: (banana: string) => banana,
            factoryDeps: [localProvider.provide],
        };

        const libLibCtorExec = jest.fn();
        @Module({
            providers: [
                TEST_CLASS_PROVIDER,
                TEST_FACTORY_PROVIDER,
                globalProvider,
                localProvider,
                factoryWithDepOnLocal,
            ],
            exports: [
                TEST_CLASS_PROVIDER.provide,
                // Note here: this factory is exported but
                // depends on a non-exported provider in this
                // module. When this factory is used in a
                // consuming module, it should still be
                // able to access local providers from it's
                // own module.
                factoryWithDepOnLocal.provide,
            ],
        })
        class LibLibModule {
            constructor() {
                libLibCtorExec();
            }
        }

        const libCtorExec = jest.fn();
        @Module({
            imports: [LibLibModule],
            providers: [TEST_VALUE_PROVIDER, DecoratedService],
            exports: [
                TEST_VALUE_PROVIDER.provide,
                TEST_CLASS_PROVIDER.provide,
                factoryWithDepOnLocal.provide,
            ],
        })
        class LibModule {
            constructor() {
                libCtorExec();
            }
        }

        const { exports: libLibExports, importedModules: libLibImports } =
            deeplyGetAllExportsAndGlobalProviders(getModuleMeta(LibLibModule));

        expect(libLibExports.get(TEST_CLASS_PROVIDER.provide)).toBe(
            TEST_CLASS_PROVIDER,
        );
        expect(
            libLibExports.get(TEST_FACTORY_PROVIDER.provide),
        ).toBeUndefined();
        expect(libLibExports.get(globalProvider.provide)).toBe(globalProvider);
        expect(
            libLibExports.get(factoryWithDepOnLocal.provide),
        ).not.toBeUndefined();

        expect(libLibImports.size).toBe(0);

        const { exports: libExports, importedModules: libImports } =
            deeplyGetAllExportsAndGlobalProviders(getModuleMeta(LibModule));

        expect(libExports.get(TEST_VALUE_PROVIDER.provide)).toBe(
            TEST_VALUE_PROVIDER,
        );
        expect(libExports.get(DecoratedService)).toBeUndefined();
        expect(libExports.get(globalProvider.provide)).toBe(globalProvider);
        expect(libExports.get(TEST_CLASS_PROVIDER.provide)).toBe(
            TEST_CLASS_PROVIDER,
        );
        expect(libExports.get(TEST_FACTORY_PROVIDER.provide)).toBeUndefined();
        expect(
            libExports.get(factoryWithDepOnLocal.provide),
        ).not.toBeUndefined();

        expect(libImports.size).toBe(1);
        expect(libImports.has(LibLibModule)).toBe(true);

        // When we create a module ref for the `LibModule`, it should
        // resolve all imported providers (via import module exports) and
        // also instantiate an instance of all imported modules.
        const moduleRef = bootstrapModule(LibModule);

        // Check constructors are deeply executed for
        // all imported modules.
        expect(libCtorExec).toHaveBeenCalledTimes(1);
        expect(libLibCtorExec).toHaveBeenCalledTimes(1);

        // Check to make sure an imported provider that depends on
        // a non-exported provider is still able to construct.

        // TODO: This is really functionality of the module injector,
        // TODO: move it to that test file.
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const factoryValue = moduleRef.injector.get(
                factoryWithDepOnLocal.provide,
            );
        }).not.toThrow();
    });

    it("should call module constructors", () => {
        const libLibLibCtorExec = jest.fn();
        @Module()
        class LibLibLibModule {
            constructor() {
                libLibLibCtorExec();
            }
        }

        const libLibCtorExec = jest.fn();
        @Module({
            imports: [LibLibLibModule],
        })
        class LibLibModule {
            constructor() {
                libLibCtorExec();
            }
        }

        const libCtorExec = jest.fn();
        @Module({
            imports: [
                LibLibModule,
                // Notice this module is imported twice,
                // once here and once in LibLibModule.
                // It should only be instantiated once!
                LibLibLibModule,
            ],
        })
        class LibModule {
            constructor() {
                libCtorExec();
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const libModuleRef = bootstrapModule(LibModule);

        expect(libLibLibCtorExec).toHaveBeenCalledTimes(1);
        expect(libLibCtorExec).toHaveBeenCalledTimes(1);
        expect(libCtorExec).toHaveBeenCalledTimes(1);
    });
});
