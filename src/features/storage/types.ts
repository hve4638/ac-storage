import type { AccessTree } from 'features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor, ICustomAccessor } from 'features/accessors';
import type { AccessType } from 'features/StorageAccess';
import { AccessorEvent } from 'types';


export interface IACStorage extends IACSubStorage {
    addListener(event:'release'|'access', listener:Function):void;

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
    // commit():void;
}

export interface IACSubStorage {
    subStorage (prefix:string):IACSubStorage;

    access(identifier:string, accessType:string):Promise<unknown>;
    accessAsJSON(identifier:string):Promise<IJSONAccessor>;
    accessAsText(identifier:string):Promise<ITextAccessor>;
    accessAsBinary(identifier:string):Promise<IBinaryAccessor>;
    copy(oldIdentifier:string, newIdentifier:string):Promise<void>;
    move(oldIdentifier:string, newIdentifier:string):Promise<void>;
    
    dropDir(identifier:string):Promise<void>;
    drop(identifier:string):Promise<void>;
    dropAll():Promise<void>;
    commit(identifier:string):Promise<void>;
    commitAll():Promise<void>;
}