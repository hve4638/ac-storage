import type { IBinaryAccessor } from './types';

class MemBinaryAccessor implements IBinaryAccessor {
    #dropped:boolean = false;
    #buffer:Buffer = Buffer.from('');
    
    write(buffer:Buffer) {
        this.#buffer = buffer;
    }
    read():Buffer {
        return this.#buffer;
    }
    writeBase64(data:string) {
        const buffer = Buffer.from(data, 'base64');
        this.write(buffer);
    }
    readBase64():string {
        const buffer = this.read();
        return buffer.toString('base64');
    }

    commit() {}
    get dropped() { return this.#dropped; }
    drop() {}
}

export default MemBinaryAccessor;