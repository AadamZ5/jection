import { PROVIDERS } from "../units/injector/injection-boilerplate.test";
import { isProvideType } from "./provide-type";
import { coerceProvideType } from "./provider";

describe("Provide type util", () => {
    it("shuold return true if the object is a provider", () => {
        PROVIDERS.map((p) => coerceProvideType(p)).forEach((p) => {
            expect(isProvideType(p)).toBe(true);
        });
    });
});
