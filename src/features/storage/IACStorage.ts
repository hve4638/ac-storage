import type { IAccessor, IAccessorManager, } from 'features/accessors';
import type { AccessTree } from 'features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor } from 'features/accessors';
import type { AccessType } from 'features/StorageAccess';
import { AccessorEvent } from 'types';


interface IACStorage {
    register(tree:AccessTree):void;
    addAccessEvent<T extends string>(customId:(T extends AccessType ? never : T), event:AccessorEvent<IAccessor>):void;
    
    getAccessor(identifier:string, accessType:string):IAccessor;
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;
    
    dropDir(identifier:string):void;
    dropAccessor(identifier:string):void;
    dropAllAccessor():void;
    commit():void;
}

export default IACStorage;