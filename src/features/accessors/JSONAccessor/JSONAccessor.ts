import * as fs from 'node:fs';
import TreeExplorer from '../../../features/TreeExplorer';

import { JSONTree, JSONType } from 'types/json';
import type { IJSONAccessor } from '../types';
import { AccessorError } from '../errors';

class JSONAccessor implements IJSONAccessor {
    private filePath:string;
    private isDropped:boolean = false;

    private explorer:TreeExplorer|null = null;
    private contents:{[key:string]:any};
    
    constructor(filePath:string, tree:JSONTree|null=null) {
        this.filePath = filePath;
        this.contents = {};
        if (tree) {
            this.explorer = new TreeExplorer(tree, '.');
        }

        this.readFile();
    }
    
    protected readFile() {
        if (fs.existsSync(this.filePath)) {
            const contents = fs.readFileSync(this.filePath, 'utf8');
            try {
                this.contents = JSON.parse(contents);
            }
            catch {
                this.contents = {};
            }
        }
        else {
            this.contents = {};
        }
    }
    protected writeFile() {
        const jsonString = JSON.stringify(this.contents, null, 4);

        fs.writeFileSync(this.filePath, jsonString, 'utf8');
    }
    protected removeFile() {
        if (fs.existsSync(this.filePath)) {
            fs.rmSync(this.filePath, { force: true });
        }
    }

    setOne(key:string, value:any) {
        this.#ensureNotDropped();
        
        this.checkAndSetData(key, value);
    }
    set(data:[string, any][]) {
        this.#ensureNotDropped();
        // this.#ensureFieldExists(key);
        for (const [key, value] of data) {
            this.checkAndSetData(key, value);
        }
    }
    getOne(key:string) {
        this.#ensureNotDropped();
        
        return this.checkAndGetData(key);
    }
    get(keys:string[]) {
        this.#ensureNotDropped();
        
        const result:Record<string,any> = {};
        for (const key of keys) {
            const value = this.checkAndGetData(key);

            const resolved = this.resolveContentsPath(result, key, true)!;
            resolved.ref[resolved.key] = value;
        }
        
        return result;
    }
    getAll() {
        this.#ensureNotDropped();
        
        return JSON.parse(JSON.stringify(this.contents));
    }
    removeOne(key:string) {
        this.#ensureNotDropped();

        this.checkAndRemoveData(key);
    }
    remove(keys:string[]) {
        this.#ensureNotDropped();

        for (const key of keys) {
            this.checkAndRemoveData(key);
        }
    }
    
    commit() {
        this.#ensureNotDropped();

        this.writeFile();
    }
    drop() {
        if (this.dropped) return;

        this.removeFile();
        this.isDropped = true;
    }
    get dropped() {
        return this.isDropped;
    }

    private checkAndSetData(key:string, value:any) {
        const allowedType = this.checkAndGetKeyType(key);
        const dataType = this.getDataType(value);
        if ((allowedType & dataType) === 0) {
            throw new AccessorError(`Field '${key}' is not allowed to be set`);
        }
        
        const resolved = this.resolveContentsPath(this.contents, key, true);
        if (resolved) {
            resolved.ref[resolved.key] = value;
        }
    }
    private checkAndGetData(key:string) {
        this.checkAndGetKeyType(key);

        const resolved = this.resolveContentsPath(this.contents, key);
        if (resolved) {
            return resolved.ref[resolved.key];
        }
        else {
            return undefined;
        }
    }
    private checkAndRemoveData(key:string) {
        this.checkAndGetKeyType(key);
        
        const resolved = this.resolveContentsPath(this.contents, key);
        if (resolved) delete resolved.ref[resolved.key];
    }

    private checkAndGetKeyType(key:string) {
        if (this.explorer) {
            const result = this.explorer.get(key);
            if (result == null) {
                throw new AccessorError(`Field '${key}' does not exist`);
            }
            return result;
        }
        else {
            return JSONType.any;
        }
    }
    private getDataType(value:string):JSONType {
        switch(typeof value) {
            case 'string':
                return JSONType.string;
            case 'number':
                return JSONType.number;
            case 'boolean':
                return JSONType.boolean;
            case 'object':
                if (Array.isArray(value)) {
                    return JSONType.array;
                }
                else if (value === null) {
                    return JSONType.null;
                }
                else {
                    return JSONType.object;
                }
            default:
                return JSONType.null;
        }
    }
    private resolveContentsPath(contents:Record<string,any>, target:string, createIfMissing:boolean=false) {
        const keys = target.split('.');

        let ref:any = contents;

        const size = keys.length-1;
        for (let i=0; i<size; i++) {
            const key = keys[i];
            if (!(key in ref)) {
                if (!createIfMissing) return undefined;

                ref[key] = {};
            }
            ref = ref[key];
        }
        return {
            ref,
            key : keys[size],
        }
    }

    #ensureNotDropped() {
        if (this.dropped) {
            throw new AccessorError('This accessor has been dropped');
        }
    }
}

export default JSONAccessor;