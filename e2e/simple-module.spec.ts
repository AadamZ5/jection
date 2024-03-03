import { Module, bootstrapModule } from "../src";

describe("Simple module", () => {
    it("should bootstrap a simple module with providers", () => {
        @Module({
            providers: [],
            exports: [],
            imports: [],
        })
        class MyModule {}

        const moduleRef = bootstrapModule(MyModule);

        expect(moduleRef).toBeDefined();
    });
});
