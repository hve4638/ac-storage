
import { type ITextAccessor } from './types';

class MemTextAccessor implements ITextAccessor {
    #dropped:boolean = false;
    #contents:string = '';

    async hasExistingData() {
        return false;
    }
    async write(text:string) {
        this.#contents = text;
    }
    async append(text:string) {
        this.#contents += text;
    }
    async read() {
        return this.#contents;
    }

    async save() {}
    get dropped() { return this.#dropped; }
    async drop() { this.#dropped = true; }
}

export default MemTextAccessor;