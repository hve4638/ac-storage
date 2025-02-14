export interface IAccessorManager<AC extends IAccessor> {
    accessor:AC;

    move(newACM:IAccessorManager<AC>):void;
    copy(newACM:IAccessorManager<AC>):void;
    dependOn : IAccessorManager<AC>[];
    dependBy : WeakRef<IAccessorManager<AC>>[];

    drop():void;
    commit():void;
    isDropped():boolean;
}

export interface IAccessor {
    commit():void;
    drop():void;
    get dropped():boolean;
}

export interface IJSONAccessor extends IAccessor {
    set(items:Record<string, any>):string[];
    setOne(key:string, value:any):void;
    get(keys:string[]):any;
    getOne(key:string):any;
    getAll():Record<string, any>;
    remove(keys:string[]):void;
    removeOne(key:string):void;
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