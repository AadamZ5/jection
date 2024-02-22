import { Klass } from "../../types/class";
import { Injector } from "../injector/injector";
import { ModuleInjector } from "../injector/module-injector";

export class ModuleRef<T> {
    private readonly moduleInjector = new ModuleInjector<T>(
        this.parentInjector,
        this.moduleType,
    );

    public readonly instance: T = this.moduleInjector.get(this.moduleType);

    constructor(
        private readonly parentInjector: Injector,
        private moduleType: Klass<T>,
    ) {}

    // TODO: Implement destroyable things! Use an interface.
}
