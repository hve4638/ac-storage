import TextAccessor from './TextAccessor';
import MemTextAccessor from './MemTextAccessor';
import { IAccessorManager, ITextAccessor } from '../types';

class TextAccessorManager implements IAccessorManager<ITextAccessor> {
    accessor : ITextAccessor;
    dependent = new Set<string>();
    dependency = new Set<string>();
    
    static fromFS(actualPath:string) {
        return new TextAccessorManager(new TextAccessor(actualPath));
    }

    static fromMemory() {
        return new TextAccessorManager(new MemTextAccessor());
    }

    private constructor(accessor:ITextAccessor) {
        this.accessor = accessor;
    }

    create() {
        // nothing to do
    }
    load() {

    }
    exists() {
        return this.accessor.hasExistingData();
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

    isCompatible(other:IAccessorManager<unknown>):other is TextAccessorManager {
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