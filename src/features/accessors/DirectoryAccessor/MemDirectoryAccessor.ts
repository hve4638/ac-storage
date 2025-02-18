import * as fs from 'fs';
import { IAccessor } from '../types';
import { IDirectoryAccessor } from './types';

class MemDirectoryAccessor implements IDirectoryAccessor {

    constructor() {

    }

    create() {}
    exists(): boolean {
        return true;    
    }
    drop() {}
}

export default MemDirectoryAccessor;