import { RootInjector } from ".";
import { ValueProvider } from "../../types";
import { ProvidedIn } from "../injectable";
import {
    DecoratedService,
    TEST_VALUE_PROVIDER,
    TestModule,
} from "./injection-boilerplate.test";
import { ModuleInjector } from "./module-injector";
import { RootProviders } from "./root-providers";

describe("Module injector", () => {
    let moduleInjector!: ModuleInjector<TestModule>;

    beforeEach(() => {
        moduleInjector = new ModuleInjector(
            RootInjector.getRootInjector(),
            TestModule,
        );
    });

    it("should resolve a provider", () => {
        expect(moduleInjector.get(TEST_VALUE_PROVIDER.provide)).toBe(
            TEST_VALUE_PROVIDER.useValue,
        );
    });

    it("should resolve short-hand injectable classes provided in the module", () => {
        const someService = moduleInjector.get(DecoratedService);
        expect(someService).toBeInstanceOf(DecoratedService);
    });

    it("should resolve a provider from the root", () => {
        const uniqueProvider: ValueProvider = {
            provide: "unique",
            useValue: "unique value",
        };

        RootProviders.addProvider({
            provider: uniqueProvider,
            type: ProvidedIn.ROOT,
        });

        expect(moduleInjector.get(uniqueProvider.provide)).toBe(
            uniqueProvider.useValue,
        );
    });

    it("should throw error when no provider found", () => {
        expect(() => moduleInjector.get("unknown")).toThrow();
    });
});
