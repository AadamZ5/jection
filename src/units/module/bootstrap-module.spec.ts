import {
    DecoratedService,
    TestModule,
} from "../injector/injection-boilerplate.test";
import { bootstrapModule } from "./bootstrap-module";

describe("Bootstrap module", () => {
    it("should bootstrap a module", () => {
        const moduleRef = bootstrapModule(TestModule);
        expect(moduleRef).toBeDefined();
        expect(moduleRef.instance).toBeInstanceOf(TestModule);
        expect(moduleRef.instance.decoratedService).toBeInstanceOf(
            DecoratedService,
        );
    });
});
