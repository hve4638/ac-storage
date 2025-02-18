import { AccessorEvent } from 'types';
import { IAccessor, IAccessorManager } from '../types';
import { AccessorManagerError } from 'errors';
import { ICustomAccessor } from './types';

class CustomAccessorManager<AC extends ICustomAccessor> implements IAccessorManager<AC> {
    #customId:string;
    accessor : AC;
    dependent = new Set<string>();
    dependency = new Set<string>();

    #event:Omit<AccessorEvent<AC>, 'create'>;
    
    static from<AC extends ICustomAccessor>(ac:AC, customId:string, event:AccessorEvent<AC>) {
        return new CustomAccessorManager<AC>(ac, customId, event);
    }

    private constructor(ac:AC, customId:string, event:AccessorEvent<AC>) {
        this.accessor = ac;
        this.#customId = customId;
        this.#event = event;
    }

    create() {
        if (this.accessor.createData) this.accessor.createData();
    }
    load() {
        if (this.accessor.loadData) this.accessor.loadData();
    }
    exists() {
        if (this.accessor.hasExistingData) {
            return this.accessor.hasExistingData();
        }
        else {
            return false;
        }
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

    isCompatible(other: IAccessorManager<IAccessor>): boolean {
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
        this.accessor.drop();
    }
    commit() {
        this.accessor.commit();
    }
    isDropped() {
        return this.accessor.isDropped();
    }
}

export default CustomAccessorManager;