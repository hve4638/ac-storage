import { JSONTree } from '@hve/json-accessor';
import type { Accesses, NonUnionAccesses, UnionAccess } from './types';
import { leaf, type Leaf } from 'tree-navigate';

class StorageAccess {
    static Nothing():Leaf<Accesses> { return leaf({accessType : 'nothing' }) };
    static Text():Leaf<Accesses> { return leaf({accessType : 'text'}) };
    static Binary():Leaf<Accesses> { return leaf({accessType : 'binary' }) };
    static JSON(structure?:JSONTree):Leaf<Accesses> {
        return leaf({ accessType : 'json', structure });
    };
    static Custom(id:string, ...args:any[]):Leaf<Accesses> {
        return leaf({ accessType : 'custom', args, id });
    }
    static Union(...accesses:Leaf<Accesses>[]):Leaf<UnionAccess> {
        return leaf({ accessType : 'union', accesses : accesses.map(leaf=>leaf.value) });
    }
}

export default StorageAccess;