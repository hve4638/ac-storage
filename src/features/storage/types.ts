import type { AccessTree } from 'features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor, ICustomAccessor } from 'features/accessors';
import type { AccessType } from 'features/StorageAccess';
import { AccessorEvent } from 'types';


export interface IACStorage extends IACSubStorage {
    addListener(event:'destroy'|'access', listener:Function):void;

    register(tree:AccessTree):void;
    addAccessEvent<T extends string, AC>(customId:(T extends AccessType ? never : T), event:AccessorEvent<AC>):void;

    // subStorage (prefix:string):IACSubStorage;
    
    // access(identifier:string, accessType:string):Promise<unknown>;
    // accessAsJSON(identifier:string):Promise<IJSONAccessor>;
    // accessAsText(identifier:string):Promise<ITextAccessor>;
    // accessAsBinary(identifier:string):Promise<IBinaryAccessor>;
    // copy(oldIdentifier:string, newIdentifier:string):Promise<void>;
    // move(oldIdentifier:string, newIdentifier:string):Promise<void>;
    
    // dropDir(identifier:string):Promise<void>;
    // drop(identifier:string):Promise<void>;
    dropAll():Promise<void>;
    releaseAll():Promise<void>;
    // commit():void;
}

export interface IACSubStorage {
    subStorage (prefix:string):IACSubStorage;

    access(identifier:string, accessType:string):Promise<unknown>;
    accessAsJSON(identifier:string):Promise<IJSONAccessor>;
    accessAsText(identifier:string):Promise<ITextAccessor>;
    accessAsBinary(identifier:string):Promise<IBinaryAccessor>;

    create(identifier:string, accessType:string):Promise<unknown>;
    createAsJSON(identifier:string):Promise<IJSONAccessor>;
    createAsText(identifier:string):Promise<ITextAccessor>;
    createAsBinary(identifier:string):Promise<IBinaryAccessor>;

    open(identifier:string, accessType:string):Promise<unknown>;
    openAsJSON(identifier:string):Promise<IJSONAccessor>;
    openAsText(identifier:string):Promise<ITextAccessor>;
    openAsBinary(identifier:string):Promise<IBinaryAccessor>;

    copy(oldIdentifier:string, newIdentifier:string):Promise<void>;
    move(oldIdentifier:string, newIdentifier:string):Promise<void>;
    
    dropDir(identifier:string):Promise<void>;
    drop(identifier:string):Promise<void>;
    dropAll():Promise<void>;
    release(identifier:string):Promise<void>;
    releaseDir(identifier:string):Promise<void>;
    releaseAll():Promise<void>;
    commit(identifier:string):Promise<void>;
    commitAll():Promise<void>;
}