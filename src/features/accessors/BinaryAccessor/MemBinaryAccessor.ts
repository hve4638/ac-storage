import type { IBinaryAccessor } from './types';

class MemBinaryAccessor implements IBinaryAccessor {
    #dropped:boolean = false;
    #buffer:Buffer = Buffer.from('');
    
    hasExistingData() {
        return false;
    }
    async write(buffer:Buffer) {
        this.#buffer = buffer;
    }
    async read():Promise<Buffer> {
        return this.#buffer;
    }
    async writeBase64(data:string) {
        const buffer = Buffer.from(data, 'base64');
        await this.write(buffer);
    }
    async readBase64():Promise<string> {
        const buffer = await this.read();
        return buffer.toString('base64');
    }

    async commit() {}
    async drop() { this.#dropped = true; }
    get dropped() { return this.#dropped; }
}

export default MemBinaryAccessor;