import BinaryAccessor from './BinaryAccessor';
import { IAccessorManager } from '../types';
import { type IBinaryAccessor } from './types';
import MemBinaryAccessor from './MemBinaryAccessor';

class BinaryAccessorManager implements IAccessorManager<IBinaryAccessor> {
    accessor : IBinaryAccessor;
    dependent = new Set<string>();
    dependency = new Set<string>();
    
    static fromFS(actualPath:string) {
        return new BinaryAccessorManager(new BinaryAccessor(actualPath));
    }

    static fromMemory() {
        return new BinaryAccessorManager(new MemBinaryAccessor());
    }

    private constructor(accessor:IBinaryAccessor) {
        this.accessor = accessor;
    }

    async create() {
        
    }
    async load() {
        
    }
    async exists() {
        return this.accessor.hasExistingData();
    }
    async move(acm:IAccessorManager<IBinaryAccessor>) {
        const newAC = await this.copy(acm);
        await acm.commit();
        await this.drop();
        
        
        return newAC;
    }
    async copy(ac:IAccessorManager<IBinaryAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }

        ac.accessor.write(await this.accessor.read());
    }

    isCompatible(other:IAccessorManager<unknown>):other is BinaryAccessorManager {
        return other instanceof BinaryAccessorManager;
    }
    
    async drop() {
        await this.accessor.drop();
    }
    async commit() {
        await this.accessor.commit();
    }
    isDropped() {
        return this.accessor.dropped;
    }
}

export default BinaryAccessorManager;