import deepEqual from 'fast-deep-equal';

import { IAccessorManager } from '../types';
import DirectoryAccessor from './DirectoryAccessor';
import MemDirectoryAccessor from './MemDirectoryAccessor';
import { IDirectoryAccessor } from './types';

class DirectoryAccessorManager implements IAccessorManager<IDirectoryAccessor> {
    accessor : IDirectoryAccessor;
    dependent = new Set<string>();
    dependency = new Set<string>();
    tree : any = {};
    
    static fromFS(actualPath:string, tree:any) {
        return new DirectoryAccessorManager(new DirectoryAccessor(actualPath), tree);
    }

    static fromMemory(tree:any) {
        return new DirectoryAccessorManager(new MemDirectoryAccessor(), tree);
    }

    private constructor(ac:IDirectoryAccessor, tree:any={}) {
        this.accessor = ac;
        this.tree = tree;
    }

    async create() {
        this.accessor.create();
    }
    async load() {
        
    }
    async exists() {
        return this.accessor.exists();
    }
    async move(acm:IAccessorManager<DirectoryAccessor>) {
        const newAC = this.copy(acm);
        await acm.commit();
        await this.drop();
        
        return newAC;
    }
    async copy(ac:IAccessorManager<DirectoryAccessor>) {
        this.accessor.copy(ac.accessor);
    }

    isCompatible(other:IAccessorManager<unknown>):other is DirectoryAccessorManager {
        if (!(other instanceof DirectoryAccessorManager)) return false;
        
        return deepEqual(this.tree, other.tree);
    }
    
    async drop() {
        this.accessor.drop();
    }
    async commit() {
        
    }
    isDropped() {
        return !this.accessor.exists();
    }
}

export default DirectoryAccessorManager;