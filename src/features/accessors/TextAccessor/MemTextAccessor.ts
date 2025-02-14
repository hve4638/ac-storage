
import type { ITextAccessor } from '../types';

class MemTextAccessor implements ITextAccessor {
    #dropped:boolean = false;
    #contents:string = '';

    write(text:string) {
        this.#contents = text;
    }
    append(text:string) {
        this.#contents += text;
    }
    read():string {
        return this.#contents;
    }

    commit() {}
    get dropped() { return this.#dropped; }
    drop() { this.#dropped = true; }
}

export default MemTextAccessor;