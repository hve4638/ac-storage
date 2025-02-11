import * as fs from 'node:fs';
import type { IJSONAccessor } from '../types';
import { AccessorError } from '../errors';
import { JSONTree, JSONType } from 'types/json';
import TreeExplorer from '../../TreeExplorer';

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
        this.#ensureFieldExists(key);
        const dataType = this.#getDataType(value);
        const allowedType = this.#getFieldType(key);
        if (allowedType === JSONType.null) {
            throw new AccessorError(`Field '${key}' does not exist`);
        }
        if ((dataType & allowedType) === 0) {
            throw new AccessorError(`Field '${key}' is not allowed to be set`);
        }
        
        this.contents[key] = value;
    }
    set(data:[string, any][]) {
        this.#ensureNotDropped();
        // this.#ensureFieldExists(key);
        for (const [key, value] of data) {
            const dataType = this.#getDataType(value);
            const allowedType = this.#getFieldType(key);
            if (allowedType === JSONType.null) {
                throw new AccessorError(`Field '${key}' does not exist`);
            }
            if ((dataType & allowedType) === 0) {
                throw new AccessorError(`Field '${key}' is not allowed to be set`);
            }

            this.contents[key] = value;
        }
    }
    getOne(key:string) {
        this.#ensureNotDropped();
        this.#ensureFieldExists(key);
        
        return this.contents[key];
    }
    get(keys:string[]) {
        this.#ensureNotDropped();
        
        const result:Record<string,any> = {};
        for (const key of keys) {
            this.#ensureFieldExists(key);

            result[key] = this.contents[key];
        }
        
        return result;
    }
    getAll() {
        this.#ensureNotDropped();
        
        return JSON.parse(JSON.stringify(this.contents));
    }
    removeOne(key:string) {
        this.#ensureNotDropped();

        delete this.contents[key];
    }
    remove(keys:string[]) {
        this.#ensureNotDropped();

        for (const key of keys) {
            delete this.contents[key];
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
        const allowedType = this.getKeyType(key);
        const dataType = this.getDataType(value);
        if ((allowedType & dataType) === 0) {
            throw new AccessorError(`Field '${key}' is not allowed to be set`);
        }
        
    }
    private checkAndGetData(key:string) {
        this.#getTreeResult(key);
    }
    private checkAndRemoveData(key:string) {

    }

    private getKeyType(key:string) {
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
    private findContentsRef(target:string, lastRef:(ref:string, key:string)=>void) {
        const keys = target.split('.');

        let ref = this.contents;

        const size = keys.length-1;
        for (let i=0; i<size; i++) {
            const key 
            if (!(key in ref)) {
                ref[key] = {};
            }
            ref = ref[key];
        }


    }

    #ensureNotDropped() {
        if (this.dropped) {
            throw new AccessorError('This accessor has been dropped');
        }
    }
}

export default JSONAccessor;