import type { IJSONAccessor } from './types';

class MemJSONAccessor implements IJSONAccessor {
    #dropped:boolean = false;
    #contents:{[key:string]:any};
    constructor() {
        this.#contents = {};
    }

    set(key:string, value:any) {
        this.#contents[key] = value;
    }
    get(key:string) {
        return this.#contents[key];
    }
    getAll() {
        // 깊은 복사
        return JSON.parse(JSON.stringify(this.#contents));
    }
    remove(key:string) {
        delete this.#contents[key];
    }

    commit() {}
    get dropped() { return this.#dropped; }
    drop() {}
}

export default MemJSONAccessor;