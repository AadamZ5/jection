import { Klass } from "../../types/class";
import { coerceModuleFromImport, moduleMetaFromImport } from "./module-meta";

export interface ModuleNode<T = unknown> {
    moduleType: Klass<T>;
    /**
     * Dependencies this module needs. This is outgoing arrows.
     */
    edges: Map<Klass, ModuleNode>;
    dependents: Set<ModuleNode>;
}

export interface ModuleDependency {
    dependent: Klass;
    onDependency: Klass;
}

/**
 * 1. Build the graph
 * 2. Sort the graph
 *
 * @deprecated Currently unused.
 */
export class ModuleResolutionContext {
    private readonly rootModuleNode: ModuleNode;
    private readonly visiting = new Set<Klass>();
    private readonly visited = new Map<Klass, ModuleNode>();
    private readonly edges: ModuleDependency[] = [];
    public readonly sortedModules = this._sortModules();

    constructor(private readonly rootModuleType: Klass) {
        this.rootModuleNode = this._buildModuleDependencyGraph(
            this.rootModuleType,
        );
    }

    private _buildModuleDependencyGraph(moduleType: Klass) {
        if (this.visiting.has(moduleType)) {
            throw new Error(
                `Circular dependency detected on module ${moduleType.name}.`,
            );
        }

        const moduleNode = this._getOrCreateModuleNode(moduleType);
        this.visiting.add(moduleType);
        const moduleMeta = moduleMetaFromImport(moduleType);
        for (const importModule of new Set(moduleMeta.imports)) {
            const importModuleType = coerceModuleFromImport(importModule);
            this.edges.push({
                dependent: moduleType,
                onDependency: importModuleType,
            });
            const importModuleNode =
                this._getOrCreateModuleNode(importModuleType);
            importModuleNode.dependents.add(moduleNode);
            moduleNode.edges.set(importModuleType, importModuleNode);
        }
        this.visiting.delete(moduleType);
        return moduleNode;
    }

    private _getOrCreateModuleNode(moduleType: Klass): ModuleNode {
        let moduleNode = this.visited.get(moduleType);
        if (!moduleNode) {
            moduleNode = {
                moduleType,
                edges: new Map(),
                dependents: new Set(),
            };
            this.visited.set(moduleType, moduleNode);
        }
        return moduleNode;
    }

    private _sortModules() {
        const sortedByFewestDependencies = [
            ...this._assertNoModuleNodeTwice(),
        ].sort((a, b) => {
            return a.edges.size - b.edges.size;
        });
        return sortedByFewestDependencies;
    }

    private _assertNoModuleNodeTwice() {
        const moduleNodes = new Set<ModuleNode>();
        for (const moduleNode of this.visited.values()) {
            if (moduleNodes.has(moduleNode)) {
                throw new Error(`Module ${moduleNode} is listed twice.`);
            }
            moduleNodes.add(moduleNode);
        }
        return moduleNodes;
    }

    public getModuleNode(moduleType: Klass) {
        return this.visited.get(moduleType);
    }
}
