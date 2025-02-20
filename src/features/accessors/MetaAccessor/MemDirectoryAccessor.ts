import * as fs from 'fs';
import { IDirectoryAccessor } from './types';

class MemDirectoryAccessor implements IDirectoryAccessor {

    constructor() {

    }

    create() {}
    exists(): boolean {
        return true;    
    }
    copy(other:MemDirectoryAccessor) {}
    move(other:MemDirectoryAccessor) {}
    drop() {}
}

export default MemDirectoryAccessor;