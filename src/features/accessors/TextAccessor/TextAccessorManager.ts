import TextAccessor from './TextAccessor';
import MemTextAccessor from './MemTextAccessor';
import { IAccessorManager } from '../types';
import { ITextAccessor } from './types';

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

    async create() {
        // nothing to do
    }
    async load() {

    }
    exists() {
        return this.accessor.hasExistingData();
    }

    async move(acm:IAccessorManager<ITextAccessor>) {
        const newAC = this.copy(acm);
        await acm.commit();
        await this.drop();
        
        return newAC;
    }
    async copy(acm:IAccessorManager<ITextAccessor>) {
        if (this.isDropped()) {
            throw new Error(`This accessor is already dropped.`);
        }
        acm.accessor.write(await this.accessor.read());
    }

    isCompatible(other:IAccessorManager<unknown>):other is TextAccessorManager {
        return other instanceof TextAccessorManager;
    }
    
    async drop() {
        await this.accessor.drop();
    }
    async commit() {
        await this.accessor.save();
    }
    isDropped() {
        return this.accessor.dropped;
    }
}

export default TextAccessorManager;