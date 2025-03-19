import { JSONTree } from "types/json";

export interface IAccessorManager<AC=unknown> {
    accessor:AC;
    dependent : Set<string>;
    dependency : Set<string>;

    create():void;
    load():void;
    exists():boolean;
    move(newACM:IAccessorManager<AC>):void;
    copy(newACM:IAccessorManager<AC>):void;
    isCompatible(other:IAccessorManager):boolean;
    drop():void;
    commit():void;
    isDropped():boolean;
}

export interface IJSONAccessor {
    get jsonStructure():JSONTree|null;
    
    loadData():void;
    hasExistingData():boolean;

    set(items:Record<string, any>):string[];
    setOne(key:string, value:any):void;
    get(...keys:string[]):Record<string,any>;
    getOne(key:string):any;
    getAll():Record<string, any>;
    remove(keys:string[]):void;
    removeOne(key:string):void;
    
    commit():void;
    drop():void;
    get dropped():boolean;
}

export interface ITextAccessor {
    hasExistingData():boolean;
    
    write(contents:string):void;
    append(contents:string):void;
    read():string;
    
    commit():void;
    drop():void;
    get dropped():boolean;
}

export interface IBinaryAccessor {
    hasExistingData():boolean;

    write(buffer:Buffer):void;
    read():Buffer;
    writeBase64(data:string):void;
    readBase64():string;
    
    commit():void;
    drop():void;
    get dropped():boolean;
}