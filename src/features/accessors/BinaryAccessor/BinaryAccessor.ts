import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import type { IBinaryAccessor } from './types';
import { AccessorError } from '../errors';

class BinaryAccessor implements IBinaryAccessor {
    #filePath:string;
    #dropped:boolean = false;

    constructor(filePath:string) {
        this.#filePath = filePath;
    }
    
    hasExistingData() {
        return existsSync(this.#filePath);
    }
    async write(buffer:Buffer) {
        this.#ensureNotDropped();
        
        await fs.writeFile(this.#filePath, buffer);
    }
    async read():Promise<Buffer> {
        this.#ensureNotDropped();
        
        if (existsSync(this.#filePath)) {
            return await fs.readFile(this.#filePath);
        }
        else {
            return Buffer.from('');
        }
    }
    async writeBase64(data:string) {
        this.#ensureNotDropped();

        const buffer = Buffer.from(data, 'base64');
        this.write(buffer);
    }
    async readBase64():Promise<string> {
        this.#ensureNotDropped();

        const buffer = await this.read();
        return buffer.toString('base64');
    }
    async drop() {
        this.#ensureNotDropped();

        if (existsSync(this.#filePath)) {
            fs.rm(this.#filePath, { force: true });
        }
    }
    async commit() {
        this.#ensureNotDropped();
        // nothing to do
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

export default BinaryAccessor;