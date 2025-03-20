import type { JSONTree } from 'types/json';
import type { Accesses, NonUnionAccesses, UnionAccess } from './types';

class StorageAccess {
    static Nothing():Accesses { return {accessType : 'nothing'} };
    static Text():Accesses { return {accessType : 'text'} };
    static Binary():Accesses { return {accessType : 'binary'} };
    static JSON(structure?:JSONTree):Accesses {
        return { accessType : 'json', structure };
    };
    static Custom(id:string, ...args:any[]):Accesses {
        return { accessType : 'custom', args, id };

    }
    static Union(...accesses:Accesses[]):UnionAccess {
        return { accessType : 'union', accesses };
    }
}

export default StorageAccess;