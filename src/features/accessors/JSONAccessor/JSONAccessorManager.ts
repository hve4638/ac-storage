import JSONAccessor from './JSONAccessor';
import MemJSONAccessor from './MemJSONAccessor';
import { IAccessorManager, IJSONAccessor } from '../types';

class JSONAccessorManager implements IAccessorManager<IJSONAccessor> {
    accessor : IJSONAccessor;
    dependOn : IAccessorManager<IJSONAccessor>[] = [];
    dependBy : WeakRef<IAccessorManager<IJSONAccessor>>[] = [];
    
    static fromFile(actualPath:string) {
        return new JSONAccessorManager(new JSONAccessor(actualPath));
    }

    static fromMemory() {
        return new JSONAccessorManager(new MemJSONAccessor());
    }

    private constructor(accessor:IJSONAccessor) {
        this.accessor = accessor;
    }

    move(acm:IAccessorManager<IJSONAccessor>) {
        const newAC = this.copy(acm);
        this.drop();
        
        return newAC;
    }
    copy(acm:IAccessorManager<IJSONAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }
        
        acm.accessor.set(this.accessor.getAll());
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

export default JSONAccessorManager;