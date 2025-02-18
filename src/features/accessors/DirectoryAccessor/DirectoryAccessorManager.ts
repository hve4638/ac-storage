import { IAccessor, IAccessorManager, IBinaryAccessor } from '../types';
import DirectoryAccessor from './DirectoryAccessor';
import MemDirectoryAccessor from './MemDirectoryAccessor';

class DirectoryAccessorManager implements IAccessorManager<IAccessor> {
    accessor : IAccessor;
    dependOn = {};
    dependBy = {};
    tree : any = {};
    
    static fromFS(actualPath:string, tree:any) {
        return new DirectoryAccessorManager(new DirectoryAccessor(actualPath), tree);
    }

    static fromMemory(tree:any) {
        return new DirectoryAccessorManager(new MemDirectoryAccessor(), tree);
    }

    private constructor(ac:IAccessor, tree:any={}) {
        this.accessor = ac;
        this.tree = tree;
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
        this.accessor.commit();
    }
    isDropped() {
        return this.accessor.dropped;
    }
}

export default DirectoryAccessorManager;