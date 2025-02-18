import { IAccessor, IAccessorManager, IBinaryAccessor } from '../types';
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

    create() {
        this.accessor.create();
    }
    load() {
        
    }
    exists(): boolean {
        return this.accessor.exists();
    }
    move(ac:IAccessorManager<DirectoryAccessor>) {
        const newAC = this.copy(ac);
        this.drop();
        
        return newAC;
    }
    copy(ac:IAccessorManager<DirectoryAccessor>) {

    }

    isCompatible(other:IAccessorManager<IAccessor>):other is DirectoryAccessorManager {
        return other instanceof DirectoryAccessorManager;
    }
    
    drop() {
        this.accessor.drop();
    }
    commit() {
        
    }
    isDropped() {
        return this.accessor.exists();
    }
}

export default DirectoryAccessorManager;