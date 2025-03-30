import { IAccessorManager } from '../types';

class RootAccessorManager implements IAccessorManager<unknown> {
    accessor : unknown = {} as unknown;
    dependent = new Set<string>();
    dependency = new Set<string>();
    tree : any = {};
    
    static fromFS() {
        return new RootAccessorManager();
    }

    private constructor() {}

    async create() {}
    async load() {}
    async exists() { return false; }
    async move(ac:IAccessorManager<never>) {}
    async copy(ac:IAccessorManager<never>) {}

    isCompatible(other:IAccessorManager<unknown>) { return false; }
    async drop() {}
    async commit() {}
    isDropped() { return false; }
}

export default RootAccessorManager;