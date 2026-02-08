import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { writeFile } from '@/lib/fs';
import type { ITextAccessor } from './types';
import { AccessorError } from '../errors';

class TextAccessor implements ITextAccessor {
    #filePath:string;
    #dropped:boolean = false;

    constructor(filePath:string) {
        this.#filePath = filePath;
    }
    
    async hasExistingData() {
        return (
            existsSync(this.#filePath)
            && (await fs.stat(this.#filePath)).isFile()
        )
    }
    async write(text:string) {
        this.#ensureNotDropped();
        await writeFile(this.#filePath, text);
    }
    async append(text:string) {
        this.#ensureNotDropped();
        await fs.appendFile(this.#filePath, text);
    }
    async read():Promise<string> {
        this.#ensureNotDropped();

        if (existsSync(this.#filePath)) {
            return (await fs.readFile(this.#filePath)).toString();
        }
        else {
            return '';
        }
    }

    async save() {
        this.#ensureNotDropped();

        if (!existsSync(this.#filePath)) {
            await writeFile(this.#filePath, '');
        }
    }

    async drop() {
        if (this.dropped) return;
        
        await fs.rm(this.#filePath, { force: true });
        this.#dropped = true;
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
