import { AccessorEvent } from 'types';
import { IAccessorManager } from '../types';
import { AccessorManagerError } from 'errors';
import { ICustomAccessor } from './types';

type CustomAccessorArgs<AC> = {
    customId:string;
    event:AccessorEvent<AC>;
    actualPath:string;
    customArgs:any[];
}

class CustomAccessorManager<AC> implements IAccessorManager<AC> {
    #customId:string;
    #customArgs:any[];
    #accessor : AC|null;
    #actualPath : string;
    dependent = new Set<string>();
    dependency = new Set<string>();

    #event:Omit<AccessorEvent<AC>, 'init'>;
    
    static from<AC>(ac:AC, args:CustomAccessorArgs<AC>) {
        return new CustomAccessorManager<AC>(ac, args);
    }

    private constructor(ac:AC, args:CustomAccessorArgs<AC>) {
        const { customId, event, actualPath, customArgs } = args;
        this.#accessor = ac;
        this.#customId = customId;
        this.#customArgs = customArgs;
        this.#actualPath = actualPath;
        this.#event = event;
    }

    get accessor() {
        if (!this.#accessor) {
            throw new AccessorManagerError('Accessor is dropped');
        }

        return this.#accessor;
    }

    create() {
        this.#event.create(this.accessor, this.#actualPath, ...this.#customArgs);
    }

    load() {
        this.#event.load(this.accessor, this.#actualPath, ...this.#customArgs);
    }
    exists() {
        return this.#event.exists(this.accessor, this.#actualPath, ...this.#customArgs);
    }

    move(ac:IAccessorManager<AC>) {
        if (this.#event.move) {
            this.#event.move(this.accessor, ac.accessor);
        }
        else if (this.#event.copy) {
            this.#event.copy(this.accessor, ac.accessor);
        }
        else {
            throw new AccessorManagerError('This accessor does not support move operation.');
        }

        this.drop();
    }
    copy(ac:IAccessorManager<AC>) {
        if (this.#event.copy) {
            this.#event.copy(this.accessor, ac.accessor);
        }
        else {
            throw new AccessorManagerError('This accessor does not support copy operation.');
        }
    }

    isCompatible(other: IAccessorManager<unknown>): boolean {
        if (!(other instanceof CustomAccessorManager)) {
            return false;
        }
        else if (this.#customId !== other.#customId) {
            return false;
        }
        else if (!this.#event.isCompatible) {
            return true;
        }
        else {
            return this.#event.isCompatible(this.accessor, other.accessor);
        }
    }
    
    drop() {
        this.#event.destroy(this.accessor, this.#actualPath, ...this.#customArgs);

        this.#accessor = null;
    }
    commit() {
        this.#event.save(this.accessor, this.#actualPath, ...this.#customArgs);
    }
    isDropped() {
        return this.#accessor == null;
    }
}

export default CustomAccessorManager;