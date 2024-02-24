import { Injectable, ProvidedIn } from ".";
import { ClassProvider } from "../../types";
import { RootInjector } from "../injector";
import { RootProviders } from "../injector/root-providers";

describe("Injectable", () => {
    it("register the class as a provider", () => {
        const pretendThisIsTopLevel = () => {
            @Injectable()
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            class TestClass {}
        };

        expect(pretendThisIsTopLevel).not.toThrow();
    });

    it.skip("should not register a non-class as a provider", () => {
        const pretendThisIsTopLevel = () => {
            //Decorators are forbidden on non-class objects in TS
        };

        expect(pretendThisIsTopLevel).toThrow();
    });

    it("should inject a useClass even if it isn't marked", () => {
        @Injectable()
        abstract class SomeClass {}

        class SomeClassImpl extends SomeClass {}

        const classProvider = {
            provide: SomeClass,
            useClass: SomeClassImpl,
        } satisfies ClassProvider;

        RootProviders.addProvider({
            provider: classProvider,
            type: ProvidedIn.ROOT,
        });

        const injector = RootInjector.getRootInjector();

        const instance = injector.get(SomeClass);

        expect(instance).toBeInstanceOf(SomeClassImpl);
    });
});
