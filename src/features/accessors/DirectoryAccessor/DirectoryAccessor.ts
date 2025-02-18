import * as fs from 'fs';
import { IAccessor } from '../types';

class DirectoryAccessor implements IAccessor {
    actualPath:string;

    constructor(actualPath:string) {
        this.actualPath = actualPath;
        
        if (!fs.existsSync(actualPath)) {
            fs.mkdirSync(actualPath, { recursive: true });
        }
    }

    commit() {
        // nothing to do
    }

    drop() {
        try {
            fs.rmdirSync(this.actualPath, { recursive: true });
        }
        catch {

        }
    }

    get dropped() {
        return !fs.existsSync(this.actualPath);
    }
}

export default DirectoryAccessor;