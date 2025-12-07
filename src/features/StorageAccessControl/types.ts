import { IAccessorManager } from 'features/accessors';
import { Accesses } from '@/features/StorageAccess'
import { type Leaf } from 'tree-navigate';

export type AccessTree = {
    [key:string] :AccessTree|Leaf<Accesses>|undefined;
    '*'? : AccessTree|Leaf<Accesses>,
    '**/*'? : Leaf<Accesses>,
    ''? : never,
    ':'? : never,
}

export type StorageAccessControlEvent = {
    onAccess:(identifier:string, accessType:Accesses)=>Promise<IAccessorManager<unknown>>,
    // onAccessDir:(identifier:string, tree:AccessTree)=>void,
    onDestroy:(identifier:string)=>Promise<void>,
    // onDestroyDir:(identifier:string)=>void,
    onChainDependency:(idDependBy:string, idDependTo:string)=>void,
}