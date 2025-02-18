import TextAccessor from './TextAccessor';
import MemTextAccessor from './MemTextAccessor';
import { IAccessor, IAccessorManager, ITextAccessor } from '../types';

class TextAccessorManager implements IAccessorManager<ITextAccessor> {
    accessor : ITextAccessor;
    dependOn : IAccessorManager<ITextAccessor>[] = [];
    dependBy : WeakRef<IAccessorManager<ITextAccessor>>[] = [];
    
    static fromFile(actualPath:string) {
        return new TextAccessorManager(new TextAccessor(actualPath));
    }

    static fromMemory() {
        return new TextAccessorManager(new MemTextAccessor());
    }

    private constructor(accessor:ITextAccessor) {
        this.accessor = accessor;
    }

    move(acm:IAccessorManager<ITextAccessor>) {
        const newAC = this.copy(acm);
        this.drop();
        
        return newAC;
    }
    copy(acm:IAccessorManager<ITextAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }
        acm.accessor.write(this.accessor.read());
    }

    isCompatible(other:IAccessorManager<IAccessor>):other is TextAccessorManager {
        return other instanceof TextAccessorManager;
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

export default TextAccessorManager;