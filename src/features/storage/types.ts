import type { AccessTree } from 'features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor, ICustomAccessor } from 'features/accessors';
import type { AccessType } from 'features/StorageAccess';
import { AccessorEvent } from 'types';


export interface IACStorage {
    addListener(event:'release'|'access', listener:Function):void;

    register(tree:AccessTree):void;
    addAccessEvent<T extends string>(customId:(T extends AccessType ? never : T), event:AccessorEvent<ICustomAccessor>):void;
    subStorage (prefix:string):IACSubStorage;
    
    getAccessor(identifier:string, accessType:string):unknown;
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;
    
    copyAccessor(oldIdentifier:string, newIdentifier:string):void;
    moveAccessor(oldIdentifier:string, newIdentifier:string):void;
    
    dropDir(identifier:string):void;
    drop(identifier:string):void;
    dropAll():void;
    commit():void;
}

export interface IACSubStorage {
    subStorage (prefix:string):IACSubStorage;

    getAccessor(identifier:string, accessType:string):unknown;
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;

    copyAccessor(oldIdentifier:string, newIdentifier:string):void;
    moveAccessor(oldIdentifier:string, newIdentifier:string):void;
    
    dropDir(identifier:string):void;
    drop(identifier:string):void;
    dropAll():void;
    commit(identifier:string):void;
    commitAll():void;
}