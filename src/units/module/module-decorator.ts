import { DI_MODULE } from "../../constants/reflect-keys";
import { TargetNotObject } from "../../errors/target-not-object";
import { ModuleMeta } from "./module-meta";
import { ModuleOptions } from "./module-options";

/**
 * Decorator that can optionally declare scoped dependencies.
 *
 * Should be declared on a class.
 *
 * Modules can inject services, other modules, whatever, into constructors
 * to allow for bootstrapping and kicking off logic.
 */
export function Module(options?: ModuleOptions) {
    return function (target: unknown) {
        if (!(target instanceof Object)) {
            throw new TargetNotObject(target);
        }

        const existingModuleDef = Reflect.getMetadata(DI_MODULE, target);

        if (existingModuleDef) {
            throw new Error(
                `Module was already defined for this class ${String(target)}`,
            );
        }

        const providers = options?.providers ?? [];

        if (options?.imports) {
            for (const importedModule of options.imports) {
                const importedModuleMeta = Reflect.getMetadata(
                    DI_MODULE,
                    importedModule,
                ) as ModuleMeta;

                if (!importedModuleMeta) {
                    throw new Error(
                        `Module ${String(
                            importedModule,
                        )} does not have a module definition`,
                    );
                }
            }
        }

        const moduleMeta: ModuleMeta = {
            providers: providers,
            imports: options?.imports,
            exports: options?.exports,
        };

        Reflect.defineMetadata(DI_MODULE, moduleMeta, target);
    };
}
