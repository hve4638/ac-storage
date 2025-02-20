import type { AccessTree } from 'features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor, ICustomAccessor } from 'features/accessors';
import type { AccessType } from 'features/StorageAccess';
import { AccessorEvent } from 'types';


interface IACStorage {
    addListener(event:'release'|'access'|'release-dir'|'access-dir', listener:Function):void;

    register(tree:AccessTree):void;
    addAccessEvent<T extends string>(customId:(T extends AccessType ? never : T), event:AccessorEvent<ICustomAccessor>):void;
    
    getAccessor(identifier:string, accessType:string):unknown;
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;
    
    dropDir(identifier:string):void;
    drop(identifier:string):void;
    dropAll():void;
    commit():void;
}

export default IACStorage;