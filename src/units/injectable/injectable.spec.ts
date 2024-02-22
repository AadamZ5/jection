import { Injectable } from ".";

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
});
