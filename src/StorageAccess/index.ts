import type { JSONTree } from '../types/json';
import type { StorageAccessType, NonUnionStorageAccessType } from '../types/storage-access';

class StorageAccess {
    static Nothing():StorageAccessType { return {accessType : 'nothing'} };
    static Text():StorageAccessType { return {accessType : 'text'} };
    static Binary():StorageAccessType { return {accessType : 'binary'} };
    static JSON(structure:JSONTree|null=null):StorageAccessType {
        return { accessType : 'json', structure };
    };
    static Custom(id:string, ...args:unknown[]):StorageAccessType {
        return { accessType : 'custom', args, id };

    }
    static Union(...accesses:NonUnionStorageAccessType[]) {
        return { accessType : 'union', accesses };
    }
}

export default StorageAccess;