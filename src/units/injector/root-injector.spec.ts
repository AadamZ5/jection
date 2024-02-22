const rootProvidersMock = {
    rootProviders: new Set(),
    rootProviderCallbacks: new Set<(provider: Provider) => void>(),

    reset: () => {
        rootProvidersMock.rootProviders.clear();
        rootProvidersMock.rootProviderCallbacks.clear();
    },

    RootProviders: {
        getProviders: () => rootProvidersMock.rootProviders,
        addProvider: (provider: Provider) => {
            rootProvidersMock.rootProviders.add(provider);
            rootProvidersMock.rootProviderCallbacks.forEach((callback) => {
                callback(provider);
            });
        },
        onProviderAdded: (callback: (provider: Provider) => void) => {
            rootProvidersMock.rootProviderCallbacks.add(callback);
            return () => {
                rootProvidersMock.rootProviderCallbacks.delete(callback);
            };
        },
    },
};

jest.mock("./root-providers", () => {
    return rootProvidersMock;
});

import { describe } from "node:test";
import { RootInjector } from "./root-injector";
import { Provider } from "../../types/provider";
import { RootProviders } from "./root-providers";

describe("Root injector", () => {
    beforeEach(() => {
        rootProvidersMock.reset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RootInjector as any).globalRootInjector = undefined;
    });

    it("should return same instance from static call", () => {
        const injector1 = RootInjector.getRootInjector();
        const injector2 = RootInjector.getRootInjector();
        expect(injector1).toBe(injector2);
    });

    it("should resolve a provider", () => {
        const simpleProvider: Provider = {
            provide: "test",
            useValue: "test value",
        };

        RootProviders.addProvider(simpleProvider);

        const injector = RootInjector.getRootInjector();

        expect(injector.get("test")).toBe("test value");
    });

    it("should throw error when no provider found", () => {
        const injector = RootInjector.getRootInjector();
        expect(() => injector.get("test")).toThrow();
    });
});
