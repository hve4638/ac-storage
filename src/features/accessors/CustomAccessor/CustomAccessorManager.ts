import { AccessorEvent } from 'types';
import { IAccessor, IAccessorManager } from '../types';
import { AccessorManagerError } from 'errors';

class CustomAccessorManager<AC extends IAccessor> implements IAccessorManager<AC> {
    #customId:string;
    accessor : AC;
    dependOn = {};
    dependBy = {};

    #event:AccessorEvent<AC>;
    
    static from<AC extends IAccessor>(ac:AC, customId, event:AccessorEvent<AC>) {
        return new CustomAccessorManager<AC>(ac, customId, event);
    }

    private constructor(ac:AC, customId:string, event:AccessorEvent<AC>) {
        this.accessor = ac;
        this.#customId = customId;
        this.#event = event;
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
        return this.accessor.dropped;
    }
}

export default CustomAccessorManager;