import BinaryAccessor from './BinaryAccessor';
import { IAccessor, IAccessorManager, IBinaryAccessor } from '../types';
import MemBinaryAccessor from './MemBinaryAccessor';

class BinaryAccessorManager implements IAccessorManager<IBinaryAccessor> {
    accessor : IBinaryAccessor;
    dependOn = {};
    dependBy = {};
    
    static fromFile(actualPath:string) {
        return new BinaryAccessorManager(new BinaryAccessor(actualPath));
    }

    static fromMemory() {
        return new BinaryAccessorManager(new MemBinaryAccessor());
    }

    private constructor(accessor:IBinaryAccessor) {
        this.accessor = accessor;
    }

    move(ac:IAccessorManager<IBinaryAccessor>) {
        const newAC = this.copy(ac);
        this.drop();
        
        return newAC;
    }
    copy(ac:IAccessorManager<IBinaryAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }

        ac.accessor.write(this.accessor.read());
    }

    isCompatible(other:IAccessorManager<IAccessor>):other is BinaryAccessorManager {
        return other instanceof BinaryAccessorManager;
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

export default BinaryAccessorManager;