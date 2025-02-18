import * as fs from 'fs';
import { IAccessor } from '../types';

class MemDirectoryAccessor implements IAccessor {

    constructor() {

    }

    commit() {
        // nothing to do
    }

    drop() {
        // nothing to do
    }

    get dropped() {
        return false;
    }
}

export default MemDirectoryAccessor;