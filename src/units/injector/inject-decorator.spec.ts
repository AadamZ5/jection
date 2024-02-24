import { InjectionToken } from "../../types/token";
import { Injectable } from "../../units/injectable/injectable";
import { ProvidedIn } from "../injectable";
import {
    Inject,
    getConstructorInjectHelpers,
    getPropertyInjectHelpers,
} from "./inject-decorator";
import { RootInjector } from "./root-injector";
import { RootProviders } from "./root-providers";

const TOKEN_VALUE = "Something";

describe("Inject Decorator", () => {
    const TOKEN = new InjectionToken<string>("TOKEN");
    RootProviders.addProvider({
        provider: {
            provide: TOKEN,
            useValue: TOKEN_VALUE,
        },
        type: ProvidedIn.ANYWHERE,
    });

    it("should work as a constructor parameter decorator", () => {
        @Injectable({ providedIn: ProvidedIn.ANYWHERE })
        class TestClass {
            constructor(@Inject(TOKEN) public readonly token: string) {}
        }

        expect(TestClass).toBeDefined();

        expect(getConstructorInjectHelpers(TestClass)).toBeDefined();
        expect(getConstructorInjectHelpers(TestClass)[0]).toBeDefined();
        expect(getConstructorInjectHelpers(TestClass)[0]?.providerType).toBe(
            TOKEN,
        );

        const testClass = RootInjector.getRootInjector().get(TestClass);
        expect(testClass).toBeInstanceOf(TestClass);
        expect(testClass.token).toBeDefined();
        expect(testClass.token).toBe(TOKEN_VALUE);
    });

    it("should work as a property decorator", () => {
        @Injectable({ providedIn: ProvidedIn.ANYWHERE })
        class TestClass {
            @Inject(TOKEN)
            public token!: string;

            constructor() {}
        }

        expect(TestClass).toBeDefined();

        expect(getPropertyInjectHelpers(TestClass)).toBeDefined();
        expect(getPropertyInjectHelpers(TestClass)?.get("token")).toBeDefined();
        expect(getPropertyInjectHelpers(TestClass)?.get("token")).toBe(TOKEN);

        const testClass = RootInjector.getRootInjector().get(TestClass);
        expect(testClass).toBeInstanceOf(TestClass);
        expect(testClass.token).toBeDefined();
        expect(testClass.token).toBe(TOKEN_VALUE);
    });

    it("should work as a symbol property decorator", () => {
        const aSymbol = Symbol("aSymbol");

        @Injectable({ providedIn: ProvidedIn.ANYWHERE })
        class TestClass {
            @Inject(TOKEN)
            public [aSymbol]!: string;

            constructor() {}
        }

        expect(TestClass).toBeDefined();

        expect(getPropertyInjectHelpers(TestClass)).toBeDefined();
        expect(getPropertyInjectHelpers(TestClass)?.get(aSymbol)).toBeDefined();
        expect(getPropertyInjectHelpers(TestClass)?.get(aSymbol)).toBe(TOKEN);

        const testClass = RootInjector.getRootInjector().get(TestClass);
        expect(testClass).toBeInstanceOf(TestClass);
        expect(testClass[aSymbol]).toBeDefined();
        expect(testClass[aSymbol]).toBe(TOKEN_VALUE);
    });
});
