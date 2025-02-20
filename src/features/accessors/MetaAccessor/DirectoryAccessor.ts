import * as fs from 'fs';
import { IDirectoryAccessor } from './types';

class DirectoryAccessor implements IDirectoryAccessor {
    #actualPath:string;

    constructor(actualPath:string) {
        this.#actualPath = actualPath;
    }

    create() {
        if (!fs.existsSync(this.#actualPath)) {
            fs.mkdirSync(this.#actualPath, { recursive: true });
        }
    }

    exists() {
        try {
            if (!fs.existsSync(this.#actualPath)) return false;

            const stat = fs.statSync(this.#actualPath);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }

    drop() {
        try {
            fs.rmSync(this.#actualPath, { recursive: true });
        }
        catch {

        }
    }
}

export default DirectoryAccessor;