import * as fs from 'node:fs';
import TreeExplorer from '../../../features/TreeExplorer';

import { JSONTree, JSONType } from 'types/json';
import type { IJSONAccessor } from '../types';
import { AccessorError } from '../errors';

type KeyValueInput = [string, any][] | Record<string, any>;

class JSONAccessor implements IJSONAccessor {
    protected filePath:string;
    protected explorer:TreeExplorer|null = null;
    protected contents:Record<string, any>;
    #tree:JSONTree|null = null;
    #isDropped:boolean = false;
    
    constructor(filePath:string, tree:JSONTree|null=null) {
        this.filePath = filePath;
        this.contents = {};
        if (tree) {
            this.#tree = tree;
            this.explorer = TreeExplorer.from(tree, '.');
        }
    }

    loadData() {
        this.readFile();
    }
    
    hasExistingData() {
        return this.existsFile();
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
        try {
            fs.rmSync(this.filePath, { force: true });
        } catch (error) {
            console.warn(`Failed to remove file ${this.filePath}:`, error);
        }
    }
    protected existsFile() {
        if (!fs.existsSync(this.filePath)) return false;

        return fs.statSync(this.filePath).isFile();
    }

    get jsonStructure() {
        return this.#tree;
    }

    setOne(key:string, value:any):void {
        this.#ensureNotDropped();
        
        this.checkAndSetData(key, value);
    }
    set(data: KeyValueInput):string[] {
        this.#ensureNotDropped();

        let setterList:[string, any][] = [];
        if (Array.isArray(data)) {
            setterList = data;
        }
        else {
            setterList = this.flattenObject(data);
        }

        let names:string[] = [];
        for (const [key, value] of setterList) {
            names.push(key);
            this.checkAndSetData(key, value);
        }
        return names;
    }
    getOne(key:string):any {
        this.#ensureNotDropped();
        
        return this.checkAndGetData(key);
    }
    get(...keys:string[]):Record<string,any> {
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
        this.#isDropped = true;
    }
    get dropped() {
        return this.#isDropped;
    }

    private flattenObject(obj: Record<string, any>, prefix = ''): [string, any][] {
        return Object.entries(obj).flatMap(([key, value]) => {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            const jsonType = this.explorer?.get(newKey);
            if (this.explorer && jsonType == null) {
                throw new AccessorError(`Field '${key}' is not allowed to be set`);
            }
            else if (jsonType === JSONType.object || jsonType === JSONType.array) {
                return [[newKey, value]];
            }
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return this.flattenObject(value, newKey);
            }
            else {
                return [[newKey, value]];
            }
        });
    }

    private checkAndSetData(key:string, value:any) {
        const allowedType = this.checkAndGetKeyType(key);
        const dataType = this.getDataType(value);

        // 현재 구현에서 null은 어느 타입으로든 인정됨
        if (dataType !== JSONType.null && (allowedType & dataType) === 0) {
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
        if (value === null) return JSONType.null;
        if (Array.isArray(value)) return JSONType.array;
    
        switch(typeof value) {
            case 'string':
                return JSONType.string;
            case 'number':
                return JSONType.number;
            case 'boolean':
                return JSONType.boolean;
            case 'object':
                return JSONType.object;
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