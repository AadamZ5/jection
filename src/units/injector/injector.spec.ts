import {
    DecoratedService,
    KLASS_PROVIDER,
    TEST_CLASS_PROVIDER,
    TEST_EXISTING_PROVIDER,
    TEST_FACTORY_PROVIDER,
    TEST_VALUE_PROVIDER,
    TestModule,
} from "./injection-boilerplate.test";
import { ModuleInjector } from "./module-injector";
import { RootInjector } from "./root-injector";
import { RootProviders } from "./root-providers";

RootProviders.addProvider(TEST_VALUE_PROVIDER);
RootProviders.addProvider(TEST_CLASS_PROVIDER);
RootProviders.addProvider(TEST_EXISTING_PROVIDER);
RootProviders.addProvider(TEST_FACTORY_PROVIDER);
RootProviders.addProvider(KLASS_PROVIDER);
RootProviders.addProvider(DecoratedService);

const rootInjector = RootInjector.getRootInjector();
const moduleInjector = new ModuleInjector(
    RootInjector.getRootInjector(),
    TestModule,
);

for (const injector of [rootInjector, moduleInjector]) {
    describe("Injector", () => {
        it("should resolve a value provider", () => {
            expect(injector.get(TEST_VALUE_PROVIDER.provide)).toBe(
                TEST_VALUE_PROVIDER.useValue,
            );
        });

        it("should resolve a class provider", () => {
            const instance = injector.get(TEST_CLASS_PROVIDER.provide);
            expect(instance).toBeInstanceOf(TEST_CLASS_PROVIDER.useClass);
        });

        it("should resolve an existing provider", () => {
            const instance = injector.get(TEST_EXISTING_PROVIDER.provide);
            const existing = injector.get(TEST_EXISTING_PROVIDER.useExisting);
            expect(instance).toBeInstanceOf(existing.constructor);
        });

        it("should resolve a factory provider", () => {
            const returnedValue = TEST_FACTORY_PROVIDER.useFactory();
            const mockFactory = jest
                .spyOn(TEST_FACTORY_PROVIDER, "useFactory")
                .mockReturnValue(returnedValue);

            const instance = injector.get(TEST_FACTORY_PROVIDER.provide);
            expect(instance).toEqual(returnedValue);

            mockFactory.mockClear();
        });

        it("should resolve a klass provider", () => {
            const instance = injector.get(KLASS_PROVIDER);
            expect(instance).toBeInstanceOf(KLASS_PROVIDER);
        });

        it("should resolve short-hand injectable classes", () => {
            const someService = injector.get(DecoratedService);
            expect(someService).toBeInstanceOf(DecoratedService);
        });

        it("should throw error when no provider found", () => {
            expect(() => injector.get("unknown")).toThrow();
        });
    });
}
