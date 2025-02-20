import { IAccessorManager, IBinaryAccessor } from '../types';

class RootAccessorManager implements IAccessorManager<unknown> {
    accessor : unknown = {} as unknown;
    dependent = new Set<string>();
    dependency = new Set<string>();
    tree : any = {};
    
    static fromFS() {
        return new RootAccessorManager();
    }

    private constructor() {

    }

    create() {
        
    }
    load() {
        
    }
    exists(): boolean {
        return false;
    }
    move(ac:IAccessorManager<never>) {

    }
    copy(ac:IAccessorManager<never>) {

    }

    isCompatible(other:IAccessorManager<unknown>) {
        return false;
    }
    
    drop() {
        
    }
    commit() {
        
    }
    isDropped() {
        return false;
    }
}

export default RootAccessorManager;