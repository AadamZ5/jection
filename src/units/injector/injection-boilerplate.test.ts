import {
    ClassProvider,
    ExistingProvider,
    FactoryProvider,
    ValueProvider,
} from "../../types";
import { Injectable } from "../injectable";
import { Module } from "../module";

export class TestClass {}

export class UndecoratedTestService {}

export class AnotherUndecoratedService {}

@Injectable()
export class DecoratedService {}

@Injectable()
export class ModuleScopeService {}

export const TEST_VALUE_PROVIDER = {
    provide: "test",
    useValue: "test value",
} satisfies ValueProvider;

export const TEST_CLASS_PROVIDER = {
    provide: TestClass,
    useClass: TestClass,
} satisfies ClassProvider;

export const TEST_EXISTING_PROVIDER = {
    provide: UndecoratedTestService,
    useExisting: TestClass,
} satisfies ExistingProvider;

export const TEST_FACTORY_PROVIDER = {
    provide: "factory",
    useFactory: () => new UndecoratedTestService(),
} satisfies FactoryProvider;

export const KLASS_PROVIDER = AnotherUndecoratedService;

export const PROVIDERS = [
    TEST_VALUE_PROVIDER,
    TEST_CLASS_PROVIDER,
    TEST_EXISTING_PROVIDER,
    TEST_FACTORY_PROVIDER,
    KLASS_PROVIDER,
    DecoratedService,
];

@Module({
    providers: [...PROVIDERS, ModuleScopeService],
})
export class TestModule {
    constructor(public readonly decoratedService: DecoratedService) {}
}

describe.skip("Abstract injector boilerplate", () => {});
