import { IAccessor, BinaryAccessor, JSONAccessor, TextAccessor } from './accessor';
import StorageAccessControl, { AccessTree, StorageAccess } from './access-control';
import { IBinaryAccessor, IJSONAccessor, ITextAccessor } from './accessor/types';

type AccessorEvent = {
    create: (actualPath:string)=>IAccessor;
}

interface IStorage {
    register(tree:AccessTree);
    addAccessorEvent(event:AccessorEvent);
    getJSONAccessor(identifier:string):IJSONAccessor;
    getTextAccessor(identifier:string):ITextAccessor;
    getBinaryAccessor(identifier:string):IBinaryAccessor;
    getAccessor(identifier:string, accessType:number):IAccessor;
    dropDir(identifier:string);
    dropAccessor(identifier:string);
    dropAllAccessor();
    commit();
}

export default IStorage;