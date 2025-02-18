import * as fs from 'node:fs';
import type { IAccessor, ITextAccessor } from '../types';
import { AccessorError } from '../errors';

class TextAccessor implements ITextAccessor {
    #filePath:string;
    #dropped:boolean = false;

    constructor(filePath:string) {
        this.#filePath = filePath;
    }
    
    hasExistingData() {
        return fs.existsSync(this.#filePath);
    }
    write(text:string) {
        this.#ensureNotDropped();
        fs.writeFileSync(this.#filePath, text);
    }
    append(text:string) {
        this.#ensureNotDropped();
        fs.appendFileSync(this.#filePath, text);
    }
    read():string {
        this.#ensureNotDropped();

        if (fs.existsSync(this.#filePath)) {
            return fs.readFileSync(this.#filePath).toString();
        }
        else {
            return '';
        }
    }
    drop() {
        if (this.dropped) return;
        
        fs.rmSync(this.#filePath, { force: true });
        this.#dropped = true;
    }
    commit() {
        this.#ensureNotDropped();
        
        if (!fs.existsSync(this.#filePath)) {
            fs.writeFileSync(this.#filePath, '');
        }
    }
    
    get dropped() {
        return this.#dropped;
    }
    #ensureNotDropped() {
        if (this.dropped) {
            throw new AccessorError('This accessor has been dropped');
        }
    }
}

export default TextAccessor;