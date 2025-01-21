export interface IAccessor {
    commit():void;
    drop():void;
    get dropped():boolean;
}

export interface IJSONAccessor extends IAccessor {
    set(key:string, value:any):void;
    get(key:string):any;
    getAll():{[key:string]:any};
    remove(key:string):void;
}

export interface ITextAccessor extends IAccessor {
    write(contents:string):void;
    append(contents:string):void;
    read():string;
}

export interface IBinaryAccessor extends IAccessor {
    write(buffer:Buffer):void;
    read():Buffer;
    writeBase64(data:string):void;
    readBase64():string;
}