import * as fs from 'node:fs';
import type { IJSONAccessor } from './types';
import { AccessorError } from './errors';

class JSONAccessor implements IJSONAccessor {
    #filePath:string;
    #dropped:boolean = false;
    #contents:{[key:string]:any};
    constructor(filePath:string) {
        this.#filePath = filePath;
        this.#contents = {};

        this.#readFile();
    }
    
    #readFile() {
        if (fs.existsSync(this.#filePath)) {
            const contents = fs.readFileSync(this.#filePath, 'utf8');
            try {
                this.#contents = JSON.parse(contents);
            }
            catch {
                this.#contents = {};
            }
        }
        else {
            this.#contents = {};
        }
    }
    #writeFile() {
        const jsonString = JSON.stringify(this.#contents, null, 4);

        fs.writeFileSync(this.#filePath, jsonString, 'utf8');
    }
    set(key:string, value:any) {
        this.#ensureNotDropped();
        
        this.#contents[key] = value;
    }
    get(key:string) {
        this.#ensureNotDropped();
        
        return this.#contents[key];
    }
    getAll() {
        this.#ensureNotDropped();

        // 깊은 복사
        return JSON.parse(JSON.stringify(this.#contents));
    }
    remove(key:string) {
        this.#ensureNotDropped();

        delete this.#contents[key];
    }
    
    commit() {
        this.#ensureNotDropped();

        this.#writeFile();
    }
    drop() {
        if (this.dropped) return;

        this.#dropped = true;

        if (fs.existsSync(this.#filePath)) {
            fs.rmSync(this.#filePath, { force: true });
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

export default JSONAccessor;