import type { IAccessor } from '../../features/accessors';
import type { AccessTree } from '../../features/StorageAccessControl';
import type { IBinaryAccessor, IJSONAccessor, ITextAccessor } from '../../features/accessors/types';
import type { AccessType } from '../../features/StorageAccess';

type AccessorEvent = {
    create: (actualPath:string, ...args:any[])=>IAccessor;
}

interface IStorage {
    register(tree:AccessTree):void;
    addAccessEvent(customId:string, event:AccessorEvent):void;
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;
    getAccessor(identifier:string, accessType:AccessType):IAccessor;
    dropDir(identifier:string):void;
    dropAccessor(identifier:string):void;
    dropAllAccessor():void;
    commit():void;
}

export default IStorage;