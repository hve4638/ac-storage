import type { JSONTree } from 'types/json';
import type { Accesses, NonUnionAccesses } from './types';

class StorageAccess {
    static Nothing():Accesses { return {accessType : 'nothing'} };
    static Text():Accesses { return {accessType : 'text'} };
    static Binary():Accesses { return {accessType : 'binary'} };
    static JSON(structure:JSONTree|null=null):Accesses {
        return { accessType : 'json', structure };
    };
    static Custom(id:string, ...args:unknown[]):Accesses {
        return { accessType : 'custom', args, id };

    }
    static Union(...accesses:Accesses[]) {
        return { accessType : 'union', accesses };
    }
}

export default StorageAccess;