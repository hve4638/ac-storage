import {
    type IJSONAccessor,
    type JSONTree,
    JSONAccessor,
    MemJSONAccessor,
} from '@hve/json-accessor';
import { IAccessorManager } from '../types';

class JSONAccessorManager implements IAccessorManager<IJSONAccessor> {
    accessor : IJSONAccessor;
    dependent = new Set<string>();
    dependency = new Set<string>();
    
    static fromFS(actualPath:string, tree?:JSONTree) {
        return new JSONAccessorManager(new JSONAccessor(actualPath, tree));
    }

    static fromMemory(tree?:JSONTree) {
        return new JSONAccessorManager(new MemJSONAccessor(tree));
    }

    private constructor(accessor:IJSONAccessor) {
        this.accessor = accessor;
    }

    async create() {
        
    }
    async load() {
        await this.accessor.load();
    }
    async exists() {
        return await this.accessor.hasExistingData();
    }
    async move(acm:IAccessorManager<IJSONAccessor>) {
        const newAC = await this.copy(acm);
        await Promise.all([
            acm.commit(),
            this.drop()
        ]);
        
        return newAC;
    }
    async copy(acm:IAccessorManager<IJSONAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }
        
        acm.accessor.set(this.accessor.getAll());
    }

    isCompatible(other: IAccessorManager<unknown>): other is JSONAccessorManager {
        if (!(other instanceof JSONAccessorManager)) {
            return false;
        }
        
        return this.#isEqualJsonTree(this.accessor.tree, other.accessor.tree);
    }

    #isEqualJsonTree(a:JSONTree|null, b:JSONTree|null):boolean {
        if (a == null && b == null) {
            return true;
        }
        else if (a == null || b == null) {
            return false;
        }
        else if (typeof a !== typeof b) {
            return false;
        }
        else if (typeof a === 'object') {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) {
                return false;
            }
            for (const key of aKeys) {
                const aValue = a[key];
                const bValue = b[key];

                if (typeof aValue !== typeof bValue) {
                    return false;
                }
                else if (typeof aValue === 'number') {
                    return aValue === bValue;
                }
                else if (!this.#isEqualJsonTree(aValue as JSONTree, bValue as JSONTree)) {
                    return false;
                }
            }
            return true;
        }
        return a == b;
    }
    
    async drop() {
        await this.accessor.drop();
    }
    async commit() {
        await this.accessor.save();
    }
    isDropped() {
        return this.accessor.dropped;
    }
}

export default JSONAccessorManager;